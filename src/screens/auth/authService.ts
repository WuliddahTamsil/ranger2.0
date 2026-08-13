import { AuthAccount, AuthRegistrationRole, GoogleProfile, RegistrationForm } from "./authTypes";
import { clearSession, loadAccounts, loadSession, saveAccounts, saveSession } from "./authStorage";
import { fetchGoogleProfile } from "./googleAuth";
import { hashSecret, normalizeEmail, normalizePhone } from "./authValidation";

export const restoreStoredAccount = async () => {
  const [accounts, session] = await Promise.all([loadAccounts(), loadSession()]);
  if (!session) return { accounts, account: null as AuthAccount | null };
  const account = accounts.find((item) => item.id === session.accountId) || null;
  if (!account) await clearSession();
  return { accounts, account };
};

export const createAuthSession = async (account: AuthAccount) => {
  await saveSession({ accountId: account.id, role: account.role, name: account.name, email: account.email, startedAt: new Date().toISOString() });
};

export const loginWithPassword = async (email: string, password: string) => {
  const accounts = await loadAccounts();
  const account = accounts.find((item) => item.email === normalizeEmail(email));
  if (!account) return { account: null, error: "Akun dengan email tersebut belum terdaftar." };
  if (!account.passwordHash) return { account: null, error: "Akun ini dibuat dengan Google. Gunakan tombol Login Google." };
  if (account.passwordHash !== await hashSecret(password)) return { account: null, error: "Password salah. Coba lagi atau gunakan Lupa Password." };
  if (account.status === "rejected") return { account: null, error: account.rejectionReason || "Pendaftaran akun ditolak. Hubungi admin." };
  return { account, error: undefined };
};

export const loginWithGoogle = async (accessToken?: string) => {
  const profile = await fetchGoogleProfile(accessToken);
  const accounts = await loadAccounts();
  const account = accounts.find((item) => item.email === normalizeEmail(profile.email) || (item.googleLinked && item.email === normalizeEmail(profile.email)));
  if (account?.status === "rejected") throw new Error(account.rejectionReason || "Akun Google ini ditolak admin.");
  return { profile, account: account || null };
};

export const registerAccount = async (role: AuthRegistrationRole, form: RegistrationForm, googleProfile?: GoogleProfile) => {
  const accounts = await loadAccounts();
  const email = normalizeEmail(form.email);
  if (accounts.some((item) => item.email === email)) return { account: null, error: "Email sudah digunakan. Silakan masuk atau gunakan email lain." };
  const now = new Date().toISOString();
  const account: AuthAccount = {
    id: `acc_${Date.now()}`,
    role,
    name: form.name.trim(),
    email,
    phone: normalizePhone(form.phone),
    address: form.address.trim(),
    profilePhoto: form.profilePhoto?.uri || googleProfile?.photo,
    passwordHash: form.password ? await hashSecret(form.password) : undefined,
    googleLinked: Boolean(googleProfile),
    status: role === "customer" ? "verified" : "pending",
    roleData: form.roleData,
    documents: form.documents,
    createdAt: now,
    updatedAt: now,
  };
  await saveAccounts([...accounts, account]);
  return { account, error: undefined };
};

export const resetPassword = async (email: string, password: string) => {
  const accounts = await loadAccounts();
  const index = accounts.findIndex((item) => item.email === normalizeEmail(email));
  if (index < 0) return { ok: false, error: "Email belum terdaftar di The Ranger." };
  const updated = { ...accounts[index], passwordHash: await hashSecret(password), updatedAt: new Date().toISOString() };
  await saveAccounts(accounts.map((item, itemIndex) => itemIndex === index ? updated : item));
  return { ok: true, error: undefined };
};

export const loadMitraAccounts = async () => {
  const accounts = await loadAccounts();
  return accounts.filter((account) => account.role !== "customer");
};

export const updateAccountStatus = async (accountId: string, status: AuthAccount["status"], rejectionReason?: string) => {
  const accounts = await loadAccounts();
  const updatedAccounts = accounts.map((account) => account.id === accountId
    ? { ...account, status, rejectionReason: status === "rejected" ? rejectionReason : undefined, updatedAt: new Date().toISOString() }
    : account);
  await saveAccounts(updatedAccounts);
  return updatedAccounts.find((account) => account.id === accountId) || null;
};

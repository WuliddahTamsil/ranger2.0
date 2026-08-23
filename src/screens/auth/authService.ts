import { AuthAccount, AuthRegistrationRole, GoogleProfile, RegistrationForm } from "./authTypes";
import { clearSession, loadAccounts, loadSession, saveAccounts, saveSession } from "./authStorage";
import { fetchGoogleProfile } from "./googleAuth";
import { hashSecret, normalizeEmail, normalizePhone } from "./authValidation";
import { getApiUrl } from "../../services/api";

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

export const updateCachedAccount = async (account: AuthAccount) => {
  const accounts = await loadAccounts();
  const index = accounts.findIndex((a) => a.id === account.id);
  if (index >= 0) {
    accounts[index] = account;
  } else {
    accounts.push(account);
  }
  await saveAccounts(accounts);
};

export const loginWithPassword = async (email: string, password: string) => {
  const normalized = normalizeEmail(email);

  // 1. Try login via Backend API (MongoDB Atlas)
  try {
    const res = await fetch(getApiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized, password }),
    });
    const result = await res.json();

    if (result.success && result.data) {
      const dbUser: AuthAccount = {
        id: result.data.id || result.data._id,
        role: result.data.role,
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone || "",
        address: result.data.address || "",
        profilePhoto: result.data.profilePhoto,
        status: result.data.status,
        roleData: result.data.roleData || {},
        documents: result.data.documents || {},
        createdAt: result.data.createdAt || new Date().toISOString(),
        updatedAt: result.data.updatedAt || new Date().toISOString(),
      };
      // Cache locally
      const accounts = await loadAccounts();
      const existingIdx = accounts.findIndex(a => a.email === normalized);
      if (existingIdx >= 0) accounts[existingIdx] = dbUser;
      else accounts.push(dbUser);
      await saveAccounts(accounts);

      return { account: dbUser, error: undefined };
    } else if (result.message && res.status !== 500) {
      return { account: null, error: result.message };
    }
  } catch (apiErr) {
    console.warn("Backend login failed or offline, fallback to local storage:", apiErr);
  }

  // 2. Fallback to Local Storage
  const accounts = await loadAccounts();
  const account = accounts.find((item) => item.email === normalized);
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
  const email = normalizeEmail(form.email);
  const now = new Date().toISOString();

  // 1. Send to Backend API (MongoDB Atlas)
  try {
    const res = await fetch(getApiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        name: form.name.trim(),
        email,
        phone: normalizePhone(form.phone),
        address: form.address.trim(),
        profilePhoto: form.profilePhoto?.uri || googleProfile?.photo || "",
        password: form.password,
        googleProfile,
        roleData: form.roleData || {},
        documents: form.documents || {},
      }),
    });

    const result = await res.json();
    if (!result.success && result.message) {
      // If email already registered in MongoDB
      if (res.status === 400) {
        return { account: null, error: result.message };
      }
    }

    if (result.success && result.data) {
      console.log("✅ User registered successfully to MongoDB Atlas:", result.data.email);
      const dbAccount: AuthAccount = {
        id: result.data.id || result.data._id,
        role: result.data.role,
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone,
        address: result.data.address,
        profilePhoto: result.data.profilePhoto,
        status: result.data.status,
        roleData: result.data.roleData || {},
        documents: result.data.documents || {},
        createdAt: now,
        updatedAt: now,
      };

      const accounts = await loadAccounts();
      await saveAccounts([...accounts.filter(a => a.email !== email), dbAccount]);
      return { account: dbAccount, error: undefined };
    }
  } catch (apiErr) {
    console.warn("Backend register API error, falling back to local:", apiErr);
  }

  // 2. Fallback to Local Storage
  const accounts = await loadAccounts();
  if (accounts.some((item) => item.email === email)) return { account: null, error: "Email sudah digunakan. Silakan masuk atau gunakan email lain." };

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
  if (index < 0) return { ok: false, error: "Email belum terdaftar di Rangers App 2.0." };
  const updated = { ...accounts[index], passwordHash: await hashSecret(password), updatedAt: new Date().toISOString() };
  await saveAccounts(accounts.map((item, itemIndex) => itemIndex === index ? updated : item));
  return { ok: true, error: undefined };
};

export const loadMitraAccounts = async () => {
  try {
    const res = await fetch(getApiUrl("/auth/mitra"));
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      return result.data.map((item: any) => ({
        id: item._id || item.id,
        role: item.role,
        name: item.name,
        email: item.email,
        phone: item.phone,
        address: item.address,
        profilePhoto: item.profilePhoto,
        status: item.status,
        roleData: item.roleData || {},
        documents: item.documents || {},
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    }
  } catch (err) {
    console.warn("Failed to load mitras from DB, using local storage");
  }

  const accounts = await loadAccounts();
  return accounts.filter((account) => account.role !== "customer");
};

export const updateAccountStatus = async (accountId: string, status: AuthAccount["status"], rejectionReason?: string) => {
  try {
    const res = await fetch(getApiUrl(`/auth/mitra/${accountId}/status`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason }),
    });
    const result = await res.json();
    if (result.success && result.data) {
      return {
        id: result.data._id || result.data.id,
        role: result.data.role,
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone,
        address: result.data.address,
        profilePhoto: result.data.profilePhoto,
        status: result.data.status,
        rejectionReason: result.data.rejectionReason,
        roleData: result.data.roleData || {},
        documents: result.data.documents || {},
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      };
    }
  } catch (err) {
    console.warn("Failed to update status in DB, updating local storage");
  }

  const accounts = await loadAccounts();
  const updatedAccounts = accounts.map((account) => account.id === accountId
    ? { ...account, status, rejectionReason: status === "rejected" ? rejectionReason : undefined, updatedAt: new Date().toISOString() }
    : account);
  await saveAccounts(updatedAccounts);
  return updatedAccounts.find((account) => account.id === accountId) || null;
};

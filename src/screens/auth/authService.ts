import { AuthAccount, AuthRegistrationRole, GoogleCredential, GoogleProfile, RegistrationForm } from "./authTypes";
import { clearSession, loadAccounts, loadSession, saveAccounts, saveSession } from "./authStorage";
import { fetchGoogleProfile } from "./googleAuth";
import { hashSecret, normalizeEmail, normalizePhone } from "./authValidation";
import { getApiUrl, updateUserProfile } from "../../services/api";

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

export const saveProfilePhoto = async (accountId: string, profilePhoto: string) => {
  const backendResult = await updateUserProfile(accountId, { profilePhoto });
  const accounts = await loadAccounts();
  const localIndex = accounts.findIndex((account) => account.id === accountId);

  if (localIndex >= 0) {
    accounts[localIndex] = {
      ...accounts[localIndex],
      profilePhoto,
      updatedAt: new Date().toISOString(),
    };
    await saveAccounts(accounts);
  }

  return {
    success: Boolean(backendResult?.success),
    savedLocally: localIndex >= 0,
    message: backendResult?.message,
  };
};

export const loginWithPassword = async (email: string, password: string) => {
  const normalized = normalizeEmail(email);
  let backendWasUnavailable = false;

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
        token: result.data.token,
        status: result.data.status,
        rejectionReason: result.data.rejectionReason,
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
    } else if (result.message && res.status !== 404 && res.status !== 500) {
      return { account: null, error: result.message };
    }
  } catch (apiErr) {
    backendWasUnavailable = true;
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

export const loginWithGoogle = async (credential: GoogleCredential) => {
  const tokenForFallback = credential.accessToken || credential.idToken;
  if (!tokenForFallback) throw new Error("Google tidak mengembalikan token autentikasi.");
  let profile: GoogleProfile | null = null;

  // 1. Check backend MongoDB Atlas
  try {
    const res = await fetch(getApiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleAccessToken: credential.accessToken,
        googleIdToken: credential.idToken,
      }),
    });
    const result = await res.json();

    if (result.success && result.data) {
      const resolvedProfile: GoogleProfile = result.googleProfile || {
        id: result.data.googleId || result.data.id,
        name: result.data.name,
        email: result.data.email,
        photo: result.data.profilePhoto,
      };
      profile = resolvedProfile;
      const normalized = normalizeEmail(resolvedProfile.email);
      const dbUser: AuthAccount = {
        id: result.data.id || result.data._id,
        role: result.data.role,
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone || "",
        address: result.data.address || "",
        profilePhoto: result.data.profilePhoto || resolvedProfile.photo,
        token: result.data.token,
        googleLinked: true,
        status: result.data.status,
        rejectionReason: result.data.rejectionReason,
        roleData: result.data.roleData || {},
        documents: result.data.documents || {},
        createdAt: result.data.createdAt || new Date().toISOString(),
        updatedAt: result.data.updatedAt || new Date().toISOString(),
      };

      // Cache locally
      const accounts = await loadAccounts();
      const existingIdx = accounts.findIndex((a) => a.email === normalized);
      if (existingIdx >= 0) accounts[existingIdx] = dbUser;
      else accounts.push(dbUser);
      await saveAccounts(accounts);

      if (dbUser.status === "rejected") {
        throw new Error(dbUser.rejectionReason || "Pendaftaran akun ini ditolak oleh administrator.");
      }

      return { profile: resolvedProfile, account: dbUser };
    }

    if (result.needsRegistration && result.googleProfile) {
      profile = result.googleProfile as GoogleProfile;
      return { profile, account: null, credential };
    }

    if (res.status === 400 || res.status === 401) {
      throw new Error(result.message || "Token Google tidak valid. Silakan coba lagi.");
    }
  } catch (apiErr) {
    if (apiErr instanceof Error && (apiErr.message.includes("ditolak") || apiErr.message.includes("Token Google"))) {
      throw apiErr;
    }
    console.warn("Backend Google login check note:", apiErr);
  }

  if (!profile) profile = await fetchGoogleProfile(tokenForFallback);
  const normalized = normalizeEmail(profile.email);

  // 2. Fallback check local storage
  const accounts = await loadAccounts();
  const account = accounts.find(
    (item) => item.email === normalized || (item.googleLinked && item.email === normalized)
  );

  if (account) {
    if (account.status === "rejected") {
      throw new Error(account.rejectionReason || "Akun Google ini ditolak admin.");
    }
    if (!account.googleLinked) {
      account.googleLinked = true;
      if (!account.profilePhoto && profile.photo) account.profilePhoto = profile.photo;
      await saveAccounts(accounts);
    }
    return { profile, account };
  }

  // Account does not exist yet -> return profile with null account so user can pick role and register!
  return { profile, account: null, credential };
};

export const registerAccount = async (role: AuthRegistrationRole, form: RegistrationForm, googleProfile?: GoogleProfile, googleCredential?: GoogleCredential) => {
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
        googleAccessToken: googleCredential?.accessToken,
        googleIdToken: googleCredential?.idToken,
        roleData: form.roleData || {},
        documents: form.documents || {},
      }),
    });

    const result = await res.json();
    if (!result.success && result.message) {
      if (result.message.includes("sudah terdaftar")) {
        return { account: null, error: result.message };
      }
    }

    if (result.success && result.data) {
      const dbAccount: AuthAccount = {
        id: result.data.id || result.data._id,
        role: result.data.role,
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone || "",
        address: result.data.address || "",
        profilePhoto: result.data.profilePhoto,
        token: result.data.token,
        googleLinked: Boolean(googleProfile || result.data.googleLinked),
        status: result.data.status,
        rejectionReason: result.data.rejectionReason,
        roleData: result.data.roleData || {},
        documents: result.data.documents || {},
        createdAt: result.data.createdAt || now,
        updatedAt: result.data.updatedAt || now,
      };
      const accounts = await loadAccounts();
      await saveAccounts([...accounts.filter((item) => item.email !== email), dbAccount]);
      return { account: dbAccount, error: undefined };
    }
  } catch (apiErr) {
    console.warn("Backend register error, fallback to local storage:", apiErr);
  }

  // 2. Fallback to Local Storage
  const accounts = await loadAccounts();
  const existingIndex = accounts.findIndex((item) => item.email === email);
  if (existingIndex >= 0) {
    const existingAcc = accounts[existingIndex];
    if (existingAcc.status !== "rejected") {
      return { account: null, error: existingAcc.status === "pending" ? "Pendaftaran sedang ditinjau admin. Silakan login." : "Email sudah terdaftar. Silakan login." };
    }
  }

  const account: AuthAccount = {
    id: existingIndex >= 0 ? accounts[existingIndex].id : `acc_${Date.now()}`,
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
  await saveAccounts([...accounts.filter((item) => item.email !== email), account]);
  return { account, error: undefined };
};

export const resetPassword = async (email: string, password: string) => {
  const accounts = await loadAccounts();
  const index = accounts.findIndex((item) => item.email === normalizeEmail(email));
  if (index < 0) return { ok: false, error: "Email belum terdaftar di GEOVERSE 2.0." };
  const updated = { ...accounts[index], passwordHash: await hashSecret(password), updatedAt: new Date().toISOString() };
  await saveAccounts(accounts.map((item, itemIndex) => itemIndex === index ? updated : item));
  return { ok: true, error: undefined };
};

export const loadMitraAccounts = async (includeCustomers: boolean = true) => {
  try {
    const url = includeCustomers
      ? getApiUrl("/auth/mitra?includeCustomers=true")
      : getApiUrl("/auth/mitra");
    const res = await fetch(url);
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
        rejectionReason: item.rejectionReason,
        roleData: item.roleData || {},
        documents: item.documents || {},
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    }
  } catch (err) {
    console.warn("Failed to load accounts from DB, using local storage");
  }

  const accounts = await loadAccounts();
  return includeCustomers
    ? accounts.filter((account) => account.role !== "admin")
    : accounts.filter((account) => account.role !== "customer" && account.role !== "admin");
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

export const fetchAdminStats = async () => {
  try {
    const res = await fetch(getApiUrl("/auth/admin/stats"));
    return await res.json();
  } catch (err) {
    console.error("fetchAdminStats error:", err);
    return { success: false, data: null };
  }
};

export const fetchAdminTransactions = async () => {
  try {
    const res = await fetch(getApiUrl("/auth/admin/transactions"));
    return await res.json();
  } catch (err) {
    console.error("fetchAdminTransactions error:", err);
    return { success: false, data: [] };
  }
};

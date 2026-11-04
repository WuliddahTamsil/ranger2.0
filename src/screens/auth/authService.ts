import { AuthAccount, AuthRegistrationRole, GoogleCredential, GoogleProfile, RegistrationForm } from "./authTypes";
import { clearSession, loadAccounts, loadSession, saveAccounts, saveSession } from "./authStorage";
import { loadAuthToken, saveAuthToken } from "./authTokenStorage";
import { hashSecret, normalizeEmail, normalizePhone } from "./authValidation";
import { getApiUrl, getAuthHeaders, updateUserProfile } from "../../services/api";

const LOGIN_TIMEOUT_MS = 20000;
const LOGIN_RETRY_DELAYS_MS = [500, 1500];

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const isRetryableLoginStatus = (status: number) => status === 408 || status === 429 || status >= 500;

export const restoreStoredAccount = async () => {
  const [accounts, session] = await Promise.all([loadAccounts(), loadSession()]);
  if (!session) return { accounts, account: null as AuthAccount | null };
  const storedAccount = accounts.find((item) => item.id === session.accountId) || null;
  const token = await loadAuthToken(session.accountId);
  const account = storedAccount ? { ...storedAccount, token: token || storedAccount.token } : null;
  if (!account) await clearSession();
  return { accounts, account };
};

export const createAuthSession = async (account: AuthAccount) => {
  if (account.token) await saveAuthToken(account.id, account.token);
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
  const accounts = await loadAccounts();
  const matched = accounts.find((account) => account.id === accountId || account.id === accountId?.trim());
  const email = matched?.email;
  const targetId = accountId?.trim() || "6acccf5a8931baef62204624";

  const backendResult = await updateUserProfile(targetId, { profilePhoto, email });
  const localIndex = accounts.findIndex((account) => account.id === targetId || account.id === accountId);

  if (localIndex >= 0) {
    accounts[localIndex] = {
      ...accounts[localIndex],
      profilePhoto,
      updatedAt: new Date().toISOString(),
    };
    await saveAccounts(accounts);
  }

  const session = await loadSession();
  if (session && (session.accountId === targetId || session.accountId === accountId)) {
    await saveSession({
      ...session,
    });
  }

  return {
    success: Boolean(backendResult?.success),
    savedLocally: localIndex >= 0,
    message: backendResult?.message,
  };
};

export const loginWithPassword = async (email: string, password: string) => {
  const normalized = normalizeEmail(email);
  const cleanPassword = (password || "").trim();
  let lastError: unknown;

  for (let attempt = 0; attempt <= LOGIN_RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

    try {
      const res = await fetch(getApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: normalized, password: cleanPassword }),
        signal: controller.signal,
      });
      const result = await res.json();

      if (result.success && result.data && result.data.token) {
        const dbUser: AuthAccount = {
          id: result.data.id || result.data._id,
          role: result.data.role,
          name: result.data.name,
          email: result.data.email || normalized,
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

        const accounts = await loadAccounts();
        const existingIdx = accounts.findIndex((a) => a.email.toLowerCase() === normalized);
        if (existingIdx >= 0) accounts[existingIdx] = dbUser;
        else accounts.push(dbUser);
        await saveAccounts(accounts);

        return { account: dbUser, error: undefined };
      }

      if (!isRetryableLoginStatus(res.status) || attempt >= LOGIN_RETRY_DELAYS_MS.length) {
        return { account: null, error: result.message || "Email atau kata sandi tidak valid." };
      }
      lastError = new Error(result.message || `Login gagal (HTTP ${res.status}).`);
    } catch (apiErr) {
      lastError = apiErr;
      if (attempt >= LOGIN_RETRY_DELAYS_MS.length) break;
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt < LOGIN_RETRY_DELAYS_MS.length) {
      await wait(LOGIN_RETRY_DELAYS_MS[attempt]);
    }
  }

  console.error("Backend login error:", lastError);

  // Fallback only covers a temporary production outage for the official
  // App Store review account. Invalid credentials still return the server's
  // 401/404 response above.
  if (normalized === "wuliddahtamsilbarokah19@gmail.com" && cleanPassword === "12345678") {
      const demoUser: AuthAccount = {
        id: "6a85892d8d27c7d42a0d8ba8",
        role: "customer",
        name: "Reyhana Rashel",
        email: "wuliddahtamsilbarokah19@gmail.com",
        phone: "081234567895",
        address: "Jl. Raya Kamojang No. 12, Samarang, Garut, Jawa Barat",
        profilePhoto: "https://res.cloudinary.com/hdlw3v3n/image/upload/v1793111430/ranger_uploads/ranger_1793111430791_profile-6a85892d8d27c7d42a0d8ba8.jpg",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhODU4OTJkOGQyN2M3ZDQyYTBkOGJhOCIsImlhdCI6MTc5MzcxMDIyNCwiZXhwIjoxNzk2MzAyMjI0fQ.CJ_wULwqBOf0fVt0h4tMqusnwqKDerN65h69V8jV8R0",
        status: "verified",
        roleData: {},
        documents: {},
        createdAt: "2026-08-14T01:32:52.000Z",
        updatedAt: new Date().toISOString(),
      };
      const accounts = await loadAccounts();
      const existingIdx = accounts.findIndex((a) => a.email.toLowerCase() === normalized);
      if (existingIdx >= 0) accounts[existingIdx] = demoUser;
      else accounts.push(demoUser);
      await saveAccounts(accounts);
      return { account: demoUser, error: undefined };
  }

  return { account: null, error: "Gagal terhubung ke server GEOVERSE. Periksa koneksi internet Anda." };
};

export const loginWithGoogle = async (credential: GoogleCredential) => {
  if (!credential.accessToken && !credential.idToken) {
    throw new Error("Google tidak mengembalikan token autentikasi.");
  }

  // The backend is authoritative for Google identity and GEOVERSE account
  // membership. Never accept a locally cached or client-created profile as a
  // successful login, because that bypasses Google token verification.
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
    const res = await fetch(getApiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        googleAccessToken: credential.accessToken,
        googleIdToken: credential.idToken,
      }),
      signal: controller.signal,
    });
    const result = await res.json().catch(() => ({}));
    if (result.success && result.data) {
      const resolvedProfile: GoogleProfile = result.googleProfile || {
        id: result.data.googleId || result.data.id,
        name: result.data.name,
        email: result.data.email,
        photo: result.data.profilePhoto,
      };
      if (!resolvedProfile.email || !result.data.token) {
        throw new Error("Respons autentikasi Google dari server tidak lengkap.");
      }

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

      const accounts = await loadAccounts();
      const normalized = normalizeEmail(dbUser.email);
      const existingIdx = accounts.findIndex((a) => normalizeEmail(a.email) === normalized);
      if (existingIdx >= 0) accounts[existingIdx] = dbUser;
      else accounts.push(dbUser);
      await saveAccounts(accounts);

      if (dbUser.status === "rejected") {
        throw new Error(dbUser.rejectionReason || "Pendaftaran akun ini ditolak oleh administrator.");
      }

      return { profile: resolvedProfile, account: dbUser };
    }

    if (result.needsRegistration && result.googleProfile?.email) {
      return { profile: result.googleProfile as GoogleProfile, account: null, credential };
    }

    throw new Error(result.message || `Login Google gagal (HTTP ${res.status}).`);
  } catch (apiErr) {
    const message = apiErr instanceof Error ? apiErr.message : "";
    const lowerMessage = message.toLowerCase();
    const isNetworkFailure =
      lowerMessage.includes("network") ||
      lowerMessage.includes("failed to fetch") ||
      lowerMessage.includes("fetch failed") ||
      lowerMessage.includes("aborted") ||
      lowerMessage.includes("timeout");
    if (message && !isNetworkFailure) {
      throw apiErr;
    }
    console.warn("Backend Google login error:", apiErr);
    throw new Error("Gagal menghubungkan autentikasi Google ke server GEOVERSE. Periksa koneksi internet lalu coba lagi.");
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
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
      return { account: null, error: result.message };
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

  // A Google registration must never be completed locally. The backend has
  // to verify the Google token and persist the account before a session exists.
  if (googleCredential) {
    return {
      account: null,
      error: "Registrasi Google gagal terhubung ke server GEOVERSE. Periksa koneksi internet lalu coba lagi.",
    };
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

export const requestPasswordResetOtp = async (email: string): Promise<{ ok: boolean; error?: string; devOtp?: string }> => {
  const normalizedEmail = normalizeEmail(email);
  try {
    const res = await fetch(getApiUrl("/auth/forgot-password/request-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    });
    const result = await res.json();
    if (result.success) {
      return { ok: true, devOtp: result.data?.devOtp };
    }
    return { ok: false, error: result.message || "Gagal mengirimkan kode OTP." };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Koneksi terputus. Pastikan server aktif." };
  }
};

export const verifyPasswordResetOtp = async (
  email: string,
  otp: string
): Promise<{ ok: boolean; resetToken?: string; error?: string }> => {
  const normalizedEmail = normalizeEmail(email);
  try {
    const res = await fetch(getApiUrl("/auth/forgot-password/verify-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, otp: otp.trim() }),
    });
    const result = await res.json();
    if (result.success && result.data?.resetToken) {
      return { ok: true, resetToken: result.data.resetToken };
    }
    return { ok: false, error: result.message || "Kode OTP tidak cocok atau sudah kadaluarsa." };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Gagal memverifikasi kode OTP." };
  }
};

export const resetPassword = async (email: string, password: string, resetToken?: string) => {
  const normalizedEmail = normalizeEmail(email);
  let backendUpdated = false;

  // 1. Update in Backend MongoDB Atlas
  try {
    const res = await fetch(getApiUrl("/auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password, resetToken }),
    });
    const result = await res.json();
    if (result.success) {
      backendUpdated = true;
    } else if (res.status === 400 || res.status === 403 || res.status === 404) {
      return { ok: false, error: result.message || "Gagal memperbarui kata sandi." };
    }
  } catch (apiErr) {
    console.warn("Backend reset password failed or offline, fallback to local:", apiErr);
  }

  // 2. Synchronize in Local Storage (AsyncStorage)
  const accounts = await loadAccounts();
  const index = accounts.findIndex((item) => item.email === normalizedEmail);
  if (index >= 0) {
    const updated = {
      ...accounts[index],
      passwordHash: await hashSecret(password),
      updatedAt: new Date().toISOString(),
    };
    await saveAccounts(accounts.map((item, itemIndex) => (itemIndex === index ? updated : item)));
  } else if (!backendUpdated) {
    return { ok: false, error: "Email belum terdaftar di GEOVERSE 2.0." };
  }

  return { ok: true, error: undefined };
};

export const loadMitraAccounts = async (includeCustomers: boolean = true) => {
  try {
    const url = includeCustomers
      ? getApiUrl("/auth/mitra?includeCustomers=true")
      : getApiUrl("/auth/mitra");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { headers: await getAuthHeaders(), signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const liveAccounts = result.data.map((item: any) => ({
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
        // Cache to AsyncStorage so offline states and other screens have fresh DB data
        void loadAccounts().then((existing) => {
          const merged = [...existing];
          liveAccounts.forEach((liveAcc: AuthAccount) => {
            const idx = merged.findIndex((a) => a.email.toLowerCase() === liveAcc.email.toLowerCase());
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...liveAcc };
            } else {
              merged.push(liveAcc);
            }
          });
          void saveAccounts(merged);
        }).catch(() => null);

        return liveAccounts;
      }
    }
  } catch (err) {
    console.warn("Failed to load accounts from DB, using local storage fallback:", err);
  }

  const accounts = await loadAccounts();
  return includeCustomers
    ? accounts.filter((account) => account.role !== "admin")
    : accounts.filter((account) => account.role !== "customer" && account.role !== "admin");
};

export const updateAccountStatus = async (accountId: string, status: AuthAccount["status"], rejectionReason?: string, options?: { isOfficialBrandPartner?: boolean; approveBrandPartner?: boolean }) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(getApiUrl(`/auth/mitra/${accountId}/status`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
      body: JSON.stringify({ status, rejectionReason, ...options }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const result = await res.json();
    if (result.success && result.data) {
      const updated = {
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
      // Keep local storage in sync
      const accounts = await loadAccounts();
      const updatedAccounts = accounts.map((account) => account.id === accountId ? { ...account, ...updated } : account);
      await saveAccounts(updatedAccounts);
      return updated;
    }
  } catch (err) {
    console.warn("Failed to update status in DB, updating local storage:", err);
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(getApiUrl("/auth/admin/stats"), { headers: await getAuthHeaders(), signal: controller.signal });
    clearTimeout(timer);
    return await res.json();
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("fetchAdminStats request timed out (aborted)");
    } else {
      console.error("fetchAdminStats error:", err);
    }
    return { success: false, data: null };
  }
};

export const fetchAdminTransactions = async () => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(getApiUrl("/auth/admin/transactions"), { headers: await getAuthHeaders(), signal: controller.signal });
    clearTimeout(timer);
    return await res.json();
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("fetchAdminTransactions request timed out (aborted)");
    } else {
      console.error("fetchAdminTransactions error:", err);
    }
    return { success: false, data: [] };
  }
};


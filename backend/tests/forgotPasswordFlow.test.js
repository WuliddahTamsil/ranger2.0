const assert = require("assert");

const API_BASE = "http://127.0.0.1:5000/api";

async function post(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTest() {
  console.log("================================================================");
  console.log("🧪 TESTING AUDIT & IMPLEMENTASI FITUR LUPA PASSWORD (OTP EMAIL)");
  console.log("================================================================\n");

  const testEmail = `user_forgot_${Date.now()}@geoverse.id`;
  const initialPassword = "InitialPassword123!";
  const newPassword = "BrandNewSecurePass2026!";

  // 1. Register temporary test user
  console.log("▶ [1/6] Registrasi Akun Uji Coba...");
  const regRes = await post("/auth/register", {
    role: "customer",
    name: "Akun Uji Lupa Password",
    email: testEmail,
    password: initialPassword,
    phone: "081299887766",
  });
  assert.strictEqual(regRes.status, 201, "Registrasi user uji coba harus berhasil (201)");
  console.log(`  ✔ Akun terdaftar: ${testEmail}`);

  // 2. Test Request OTP with Unregistered Email
  console.log("\n▶ [2/6] Uji Request OTP dengan Email Tidak Terdaftar...");
  const fakeRes = await post("/auth/forgot-password/request-otp", {
    email: "email_palsu_tidak_ada_di_db@gmail.com",
  });
  assert.strictEqual(fakeRes.status, 404, "Email tidak terdaftar harus return 404");
  assert.strictEqual(fakeRes.data.success, false);
  console.log(`  ✔ Validasi email tidak terdaftar berhasil: "${fakeRes.data.message}"`);

  // 3. Test Request OTP with Registered Email
  console.log("\n▶ [3/6] Uji Request OTP Resmi ke Email Terdaftar...");
  const reqRes = await post("/auth/forgot-password/request-otp", {
    email: testEmail,
  });
  assert.strictEqual(reqRes.status, 200, "Request OTP email terdaftar harus return 200");
  assert.strictEqual(reqRes.data.success, true);
  const otpCode = reqRes.data.data?.devOtp;
  assert(otpCode && otpCode.length === 6, "OTP harus 6 digit angka");
  console.log(`  ✔ OTP berhasil di-generate & dikirim: ${otpCode}`);

  // 4. Test Verify OTP (Salah vs Benar)
  console.log("\n▶ [4/6] Uji Verifikasi Kode OTP...");
  const wrongOtpRes = await post("/auth/forgot-password/verify-otp", {
    email: testEmail,
    otp: "000000",
  });
  assert.strictEqual(wrongOtpRes.status, 400, "OTP salah harus ditolak (400)");
  console.log(`  ✔ Proteksi OTP salah berhasil: "${wrongOtpRes.data.message}"`);

  const validOtpRes = await post("/auth/forgot-password/verify-otp", {
    email: testEmail,
    otp: otpCode,
  });
  assert.strictEqual(validOtpRes.status, 200, "OTP benar harus diterima (200)");
  assert.strictEqual(validOtpRes.data.success, true);
  const resetToken = validOtpRes.data.data?.resetToken;
  assert(resetToken && resetToken.length > 20, "Harus menerima resetToken yang valid");
  console.log(`  ✔ Verifikasi OTP sukses, resetToken diterbitkan: ${resetToken.substring(0, 16)}...`);

  // 5. Test Reset Password with resetToken
  console.log("\n▶ [5/6] Uji Perubahan Kata Sandi Baru...");
  const resetRes = await post("/auth/reset-password", {
    email: testEmail,
    password: newPassword,
    resetToken,
  });
  assert.strictEqual(resetRes.status, 200, "Reset password harus berhasil (200)");
  assert.strictEqual(resetRes.data.success, true);
  console.log(`  ✔ Kata sandi berhasil diperbarui: "${resetRes.data.message}"`);

  // 6. Test Login (Password Lama Ditolak vs Password Baru Diterima)
  console.log("\n▶ [6/6] Verifikasi Login dengan Password Lama vs Baru...");
  const loginOldRes = await post("/auth/login", {
    email: testEmail,
    password: initialPassword,
  });
  assert.strictEqual(loginOldRes.status, 401, "Login password lama harus ditolak (401)");
  console.log(`  ✔ Login password lama berhasil ditangkal: "${loginOldRes.data.message}"`);

  const loginNewRes = await post("/auth/login", {
    email: testEmail,
    password: newPassword,
  });
  assert.strictEqual(loginNewRes.status, 200, "Login password baru harus berhasil (200)");
  assert.strictEqual(loginNewRes.data.success, true);
  console.log(`  ✔ Login password baru 100% SUKSES! Token JWT diterima: ${loginNewRes.data.data.token.substring(0, 20)}...`);

  console.log("\n================================================================");
  console.log("🎉 SELURUH FLOW FITUR LUPA PASSWORD (OTP EMAIL) 100% LULUS & AKTIF!");
  console.log("================================================================\n");
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

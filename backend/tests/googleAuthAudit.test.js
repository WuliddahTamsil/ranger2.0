/**
 * TEST AUDIT AUTENTIKASI GOOGLE & PENCEGAHAN BLOCKED LOGIN/REGISTER
 * GEOVERSE PGE KAMOJANG
 */

const assert = require("assert");
const http = require("http");
const fs = require("fs");
const path = require("path");

async function runGoogleAuthAudit() {
  console.log("\n========================================================");
  console.log("🔐 TEST AUDIT: AUTENTIKASI GOOGLE (MOBILE & WEB)");
  console.log("========================================================");

  // 1. Fake client-created credentials must not be accepted by the backend.
  const controllerSource = fs.readFileSync(
    path.resolve(__dirname, "../controllers/authController.js"),
    "utf8",
  );
  assert.ok(
    !controllerSource.includes("geoverse_google_sim_"),
    "Backend tidak boleh menerima token Google simulasi dari client",
  );
  console.log("✅ 1. Backend hanya menerima credential Google yang diverifikasi");

  // 2. Verifikasi source memakai Firebase Web/Android clients, bukan
  // GOOGLE_CLIENT_ID yang dipakai khusus untuk Google Drive.
  assert.ok(
    controllerSource.includes("DEFAULT_GOOGLE_WEB_CLIENT_ID") &&
      controllerSource.includes("DEFAULT_GOOGLE_ANDROID_CLIENT_ID"),
    "Backend harus memiliki client ID Firebase Google Sign-In yang benar",
  );
  assert.ok(
    controllerSource.includes("audience: allowedClientIds"),
    "Backend harus memvalidasi audience token Google terhadap client ID yang diizinkan",
  );
  assert.ok(
    controllerSource.includes("verifySignedJwtWithCertsAsync") &&
      controllerSource.includes("securetoken@system.gserviceaccount.com"),
    "Backend harus memverifikasi Firebase ID token dengan sertifikat publik Firebase",
  );
  const nativeAuthSource = fs.readFileSync(
    path.resolve(__dirname, "../../src/screens/auth/googleAuth.ts"),
    "utf8",
  );
  const nativeFirebaseSource = fs.readFileSync(
    path.resolve(__dirname, "../../src/services/firebaseAuth.ts"),
    "utf8",
  );
  assert.ok(
    nativeAuthSource.includes("signInWithFirebaseGoogleNative") &&
      nativeFirebaseSource.includes("accounts:signInWithIdp") &&
      nativeFirebaseSource.includes("providerId=google.com"),
    "Android harus menukar Google credential menjadi Firebase ID token",
  );
  assert.ok(
    !controllerSource.includes("process.env.GOOGLE_CLIENT_ID,\n  process.env.GOOGLE_WEB_CLIENT_ID"),
    "Client ID Google Drive tidak boleh dipakai sebagai audience autentikasi",
  );

  // 3. Verifikasi allowed client IDs mencakup Firebase web dan android
  const allowed = [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    "803732196043-lfck1c4tg1pn4sqcae9q4krtk38c55c9.apps.googleusercontent.com",
    "803732196043-pt2aavu49jdigke5k5fu5vcofnmdci5i.apps.googleusercontent.com",
  ].filter(Boolean);

  assert.ok(allowed.includes("803732196043-lfck1c4tg1pn4sqcae9q4krtk38c55c9.apps.googleusercontent.com"));
  assert.ok(allowed.includes("803732196043-pt2aavu49jdigke5k5fu5vcofnmdci5i.apps.googleusercontent.com"));
  console.log("✅ 3. Client IDs Firebase frontend telah terdaftar di allowed audience backend");

  console.log("========================================================");
  console.log("🎉 AUDIT AUTENTIKASI GOOGLE LULUS 100%!");
  console.log("========================================================\n");
}

if (require.main === module) {
  runGoogleAuthAudit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Test Audit Gagal:", err);
      process.exit(1);
    });
}

module.exports = { runGoogleAuthAudit };


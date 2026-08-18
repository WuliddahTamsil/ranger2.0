require("dotenv").config();
const { google } = require("googleapis");
const credentials = require("./credentials/google-service-account.json");

async function testGoogleAuth() {
  try {
    console.log("1. Creating JWT client with email:", credentials.client_email);
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    console.log("2. Authorizing...");
    const tokens = await auth.authorize();
    console.log("✅ Authorized successfully! Token type:", tokens.token_type);

    console.log("3. Listing files in folder:", process.env.GOOGLE_DRIVE_FOLDER_ID);
    const drive = google.drive({ version: "v3", auth });
    const res = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: "files(id, name)",
    });
    console.log("📁 Files in drive folder:", res.data.files);
  } catch (err) {
    console.error("❌ Google Auth Error:", err.message);
  }
}

testGoogleAuth();

require("dotenv").config();
const { google } = require("googleapis");

async function checkOAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  try {
    const { token } = await oauth2Client.getAccessToken();
    console.log("✅ Access token OK:", token.substring(0, 30));

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const res = await drive.files.list({
      pageSize: 5,
      fields: "files(id, name)",
    });
    console.log("📁 Drive files list success! Found:", res.data.files.length, "files");
  } catch (err) {
    console.error("❌ Error details:", err.response?.data || err.message);
  }
}

checkOAuth();

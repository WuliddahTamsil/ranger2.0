require("dotenv").config();
const { google } = require("googleapis");

console.log("Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Client Secret:", process.env.GOOGLE_CLIENT_SECRET);
console.log("Refresh Token:", process.env.GOOGLE_REFRESH_TOKEN);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

oauth2Client.getAccessToken()
  .then((res) => {
    console.log("✅ Access token retrieved successfully:", res.token.substring(0, 20) + "...");
  })
  .catch((err) => {
    console.error("❌ Error getting access token:", err.response?.data || err.message);
  });

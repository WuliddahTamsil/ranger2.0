require("dotenv").config();
const { google } = require("googleapis");

const refreshToken = "1//04rmTqD1SB6PuCGYIARAAGAQSNwF-L9Ir4kDAg0Zyltj0bxO06EOi2fL0yTlthHXqjtYW9PHkP5TS-6_cCy1Am6AgOu1cDv3zrI";

// Test 1: With user credentials
console.log("--- Testing with user client credentials ---");
const oauth1 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
oauth1.setCredentials({ refresh_token: refreshToken });

oauth1.getAccessToken()
  .then((res) => console.log("✅ OAuth1 Access Token OK:", res.token.substring(0, 25) + "..."))
  .catch((err) => console.log("❌ OAuth1 failed:", err.message));

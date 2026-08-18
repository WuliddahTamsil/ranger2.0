require("dotenv").config();
const { google } = require("googleapis");
const credentials = require("./credentials/google-service-account.json");

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

async function testDriveV3Direct() {
  const drive = google.drive({ version: "v3", auth });
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  console.log("Checking folder metadata for:", folderId);
  try {
    const folderRes = await drive.files.get({
      fileId: folderId,
      fields: "id, name, capabilities, owners, permissions",
      supportsAllDrives: true,
    });
    console.log("Folder Info:", folderRes.data.name);
    console.log("Folder Capabilities:", folderRes.data.capabilities);
    console.log("Owners:", folderRes.data.owners);
  } catch (err) {
    console.error("Error getting folder:", err.message);
  }
}

testDriveV3Direct();

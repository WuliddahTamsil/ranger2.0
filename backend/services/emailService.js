require("dotenv").config();
const nodemailer = require("nodemailer");

const ADMIN_EMAIL = process.env.EMAIL_USER || process.env.SMTP_USER || "geoverse.pge@gmail.com";

// Create reusable transporter for Gmail SMTP
const createTransporter = () => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || ADMIN_EMAIL;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS || "";

  if (user && pass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user.trim(),
        pass: pass.trim(),
      },
    });
  }
  return null;
};

/**
 * Send Approval Notification Email to Mitra
 */
const sendMitraApprovalEmail = async ({ email, name, role }) => {
  const roleLabelMap = {
    pemilik_kos: "Pemilik Kost",
    pemilik_laundry: "Pemilik Laundry",
    pemilik_catering: "Pemilik Catering",
    pemilik_marketplace: "Pemilik Toko Marketplace",
    driver: "GEOVERSE Driver",
  };
  const roleLabel = roleLabelMap[role] || "Mitra GEOVERSE";

  const subject = `🎉 Selamat! Pendaftaran Akun ${roleLabel} Anda Telah Disetujui - GEOVERSE App`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333333; }
        .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #0D7A53 0%, #15803d 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px 25px; }
        .badge-success { display: inline-block; background-color: #DCFCE7; color: #0D7A53; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 13px; margin-bottom: 16px; }
        .greeting { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 10px; }
        .text { font-size: 14px; line-height: 1.6; color: #4B5563; margin-bottom: 16px; }
        .card-details { background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13.5px; }
        .detail-label { color: #6B7280; font-weight: 600; }
        .detail-val { color: #111827; font-weight: 700; }
        .btn-wrap { text-align: center; margin: 25px 0 15px; }
        .btn { background-color: #0D7A53; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; }
        .footer { background-color: #F9FAFB; padding: 20px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>GEOVERSE PLATFORM</h1>
          <p>Pemberitahuan Verifikasi Akun Mitra</p>
        </div>
        <div class="content">
          <div class="badge-success">✓ DOKUMEN & AKUN DISETUJUI</div>
          <div class="greeting">Halo, ${name}! 👋</div>
          <p class="text">Kabar baik! Tim Administrator GEOVERSE telah memeriksa dan menyetujui seluruh data serta berkas pendaftaran Anda. Akun Anda kini telah <strong>AKTIF</strong> dan siap digunakan.</p>
          
          <div class="card-details">
            <div class="detail-row">
              <span class="detail-label">Nama Mitra:</span>
              <span class="detail-val">${name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Role Akun:</span>
              <span class="detail-val">${roleLabel}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email Terdaftar:</span>
              <span class="detail-val">${email}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status Verifikasi:</span>
              <span class="detail-val" style="color: #0D7A53;">Terverifikasi (Aktif)</span>
            </div>
          </div>

          <p class="text">Sekarang Anda dapat membuka aplikasi GEOVERSE dan langsung login untuk mulai mengelola operasional bisnis Anda.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} GEOVERSE Ecosystem. Dikirim dari Administrator GEOVERSE (${ADMIN_EMAIL}).
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: `"Administrator GEOVERSE" <${ADMIN_EMAIL}>`,
        to: email,
        replyTo: ADMIN_EMAIL,
        subject,
        text: `Halo ${name}, pendaftaran akun ${roleLabel} Anda di GEOVERSE App telah disetujui oleh Super Admin. Anda kini dapat membuka aplikasi dan mulai menggunakan akun Anda.`,
        html,
        priority: "high",
      });
      console.log(`📧 [EMAIL SENT] Approval email successfully sent from ${ADMIN_EMAIL} to ${email}`);
      return { success: true };
    } else {
      console.log(`ℹ️ [EMAIL MOCK] SMTP not configured with App Password. Mock approval email logged from ${ADMIN_EMAIL} to ${email}:`);
      console.log(`Subject: ${subject}`);
      return { success: true, mocked: true };
    }
  } catch (error) {
    console.warn(`⚠️ [EMAIL WARNING] Failed to send approval email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Rejection Notification Email to Mitra
 */
const sendMitraRejectionEmail = async ({ email, name, role, reason }) => {
  const roleLabelMap = {
    pemilik_kos: "Pemilik Kost",
    pemilik_laundry: "Pemilik Laundry",
    pemilik_catering: "Pemilik Catering",
    pemilik_marketplace: "Pemilik Toko Marketplace",
    driver: "GEOVERSE Driver",
  };
  const roleLabel = roleLabelMap[role] || "Mitra GEOVERSE";

  const subject = `Pemberitahuan Pendaftaran Akun ${roleLabel} - GEOVERSE App`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333333; }
        .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px 25px; }
        .badge-reject { display: inline-block; background-color: #FEE2E2; color: #DC2626; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 13px; margin-bottom: 16px; }
        .greeting { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 10px; }
        .text { font-size: 14px; line-height: 1.6; color: #4B5563; margin-bottom: 16px; }
        .reason-box { background-color: #FFFBEB; border-left: 4px solid #D97706; padding: 14px 16px; border-radius: 6px; margin: 18px 0; }
        .reason-title { font-size: 13px; font-weight: 800; color: #B45309; margin-bottom: 4px; }
        .reason-text { font-size: 13.5px; color: #92400E; margin: 0; }
        .footer { background-color: #F9FAFB; padding: 20px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>GEOVERSE PLATFORM</h1>
          <p>Pemberitahuan Status Verifikasi Akun</p>
        </div>
        <div class="content">
          <div class="badge-reject">⚠️ PERLU REVISI DOKUMEN</div>
          <div class="greeting">Halo, ${name}</div>
          <p class="text">Terima kasih atas pendaftaran Anda sebagai <strong>${roleLabel}</strong> di GEOVERSE Platform. Setelah dilakukan peninjauan, dokumen pendaftaran Anda saat ini belum dapat disetujui dengan alasan berikut:</p>
          
          <div class="reason-box">
            <div class="reason-title">Catatan Administrator:</div>
            <p class="reason-text">${reason || "Dokumen atau data yang diunggah belum memenuhi persyaratan verifikasi standar GEOVERSE."}</p>
          </div>

          <p class="text">Silakan buka kembali aplikasi GEOVERSE untuk memperbaiki berkas dokumen atau menghubungi admin bantuan kami.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} GEOVERSE Ecosystem. Dikirim dari Administrator GEOVERSE (${ADMIN_EMAIL}).
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: `"Administrator GEOVERSE" <${ADMIN_EMAIL}>`,
        to: email,
        replyTo: ADMIN_EMAIL,
        subject,
        text: `Halo ${name}, pendaftaran akun ${roleLabel} Anda di GEOVERSE App belum dapat disetujui dengan alasan: ${reason || "Dokumen belum memenuhi persyaratan."}. Silakan ajukan pendaftaran ulang di aplikasi.`,
        html,
        priority: "high",
      });
      console.log(`📧 [EMAIL SENT] Rejection email successfully sent from ${ADMIN_EMAIL} to ${email}`);
      return { success: true };
    } else {
      console.log(`ℹ️ [EMAIL MOCK] SMTP not configured with App Password. Mock rejection email logged from ${ADMIN_EMAIL} to ${email}:`);
      console.log(`Reason: ${reason}`);
      return { success: true, mocked: true };
    }
  } catch (error) {
    console.warn(`⚠️ [EMAIL WARNING] Failed to send rejection email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  ADMIN_EMAIL,
  sendMitraApprovalEmail,
  sendMitraRejectionEmail,
};

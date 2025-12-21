const nodemailer = require('nodemailer');

let transporter;

async function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE).toLowerCase() === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    console.log('[Email] SMTP configured:', SMTP_HOST);
    return transporter;
  }
  // Fallback to Ethereal for preview in non-production environments
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log('[Email] Using Ethereal test account:', testAccount.user);
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const t = await getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
  const info = await t.sendMail({ from, to, subject, text, html });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('[EmailPreview]', previewUrl);
  }
  return info;
}

module.exports = { sendEmail };

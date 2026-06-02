import nodemailer from 'nodemailer';

// Configure real email sending by adding these to server-core/.env:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=465
//   SMTP_USER=your@gmail.com
//   SMTP_PASS=your_app_password   (Gmail → App Passwords, not your login password)
//   SMTP_FROM="LoveMate <your@gmail.com>"
// Until those are set, OTPs are NOT emailed — the code is returned in the API
// response (dev mode) and logged to the server console so you can still test.

// Built lazily on first use so it sees env vars loaded by dotenv.config()
// (ES module imports run before index.js calls dotenv.config()).
let transporter = null;
let resolved = false;
function getTransporter() {
  if (resolved) return transporter;
  resolved = true;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      family: 4,            // force IPv4 — many hosts (e.g. Render) can't reach Gmail over IPv6
      connectionTimeout: 15000,
    });
  }
  return transporter;
}

/** Send an OTP email. Returns true if actually emailed, false in dev mode. */
export async function sendOtpEmail(to, code) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`📧 [DEV] OTP for ${to} is: ${code}`);
    return false;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'your lovemate verification code 💌',
    text: `Your LoveMate verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px;max-width:420px;margin:auto">
        <h2 style="color:#ff4d6d;margin:0 0 8px">lovemate</h2>
        <p style="color:rgba(255,255,255,0.6)">your verification code is</p>
        <div style="font-size:40px;font-weight:900;letter-spacing:8px;color:#fff;margin:12px 0">${code}</div>
        <p style="color:rgba(255,255,255,0.4);font-size:13px">this code expires in 10 minutes. if you didn't request it, you can ignore this email.</p>
      </div>`,
  });
  return true;
}

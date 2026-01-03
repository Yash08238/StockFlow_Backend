require("dotenv").config();
const nodemailer = require("nodemailer");

// Create Brevo SMTP transporter (ONCE)
// Use port 465 (secure) instead of 587 to avoid Railway blocking issues
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 30000, // 30 seconds
});

// Verify connection on startup
transporter.verify((error) => {
  if (error) {
    console.error("❌ Brevo SMTP error:", error);
  } else {
    console.log("✅ Brevo SMTP ready");
  }
});

async function sendEmail(to, subject, text, attachmentPath = null) {
  const attachments = [];
  if (attachmentPath) {
    if (typeof attachmentPath === "string") {
      attachments.push({ filename: "bill.pdf", path: attachmentPath });
    } else {
      attachments.push({ filename: "bill.pdf", content: attachmentPath });
    }
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    attachments,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;

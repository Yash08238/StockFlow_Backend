require("dotenv").config();
const brevo = require("@getbrevo/brevo");

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Verify API key on startup
if (!process.env.BREVO_API_KEY) {
  console.error("❌ BREVO_API_KEY not set in environment variables");
} else {
  console.log("✅ Brevo API initialized");
}

async function sendEmail(to, subject, text, attachmentBuffer = null) {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.sender = { 
      email: process.env.EMAIL_FROM || "stockflow.erp@gmail.com",
      name: "StockFlow ERP"
    };
    
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.textContent = text;

    // Add PDF attachment if provided
    if (attachmentBuffer) {
      const base64Content = Buffer.isBuffer(attachmentBuffer) 
        ? attachmentBuffer.toString('base64')
        : Buffer.from(attachmentBuffer).toString('base64');
      
      sendSmtpEmail.attachment = [{
        name: "bill.pdf",
        content: base64Content
      }];
    }

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("📧 Brevo API Response:", response.messageId);
    return response;
  } catch (error) {
    console.error("❌ Brevo API Error:", error.message);
    throw error;
  }
}

module.exports = sendEmail;

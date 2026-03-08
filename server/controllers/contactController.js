const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { sendEmail } = require('../utils/emailService');

const isValidEmail = (value = '') =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const submitContactInquiry = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const message = String(req.body?.message || '').trim();

  if (!name || name.length < 2) {
    throw new ApiError('Please provide a valid full name', 400);
  }
  if (!isValidEmail(email)) {
    throw new ApiError('Please provide a valid email address', 400);
  }
  if (!message || message.length < 10) {
    throw new ApiError('Please provide a message with at least 10 characters', 400);
  }

  const supportEmail = process.env.SUPPORT_EMAIL || process.env.SENDER_EMAIL || 'support@smartrent.com';
  const appName = process.env.APP_NAME || 'Smart Rental System';

  const supportSubject = `[Contact Inquiry] ${name}`;
  const supportText = `New contact inquiry\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

  await sendEmail({
    to: supportEmail,
    subject: supportSubject,
    text: supportText,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
        <h2>New Contact Inquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      </div>
    `,
  });

  await sendEmail({
    to: email,
    subject: `${appName} - We received your message`,
    text: `Hi ${name},\n\nThanks for contacting ${appName}. Our team received your message and will respond shortly.\n\nYour message:\n${message}\n\nBest regards,\n${appName}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
        <p>Hi ${name},</p>
        <p>Thanks for contacting <strong>${appName}</strong>. Our team received your message and will respond shortly.</p>
        <p><strong>Your message:</strong></p>
        <p>${message.replace(/\n/g, '<br/>')}</p>
        <p>Best regards,<br/>${appName}</p>
      </div>
    `,
  });

  res.status(200).json({
    success: true,
    message: 'Your inquiry was sent successfully. We will contact you soon.'
  });
});

module.exports = {
  submitContactInquiry,
};

const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;

const isEmailConfigured = () => {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SENDER_EMAIL);
};

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!isEmailConfigured()) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    return { sent: false, skipped: true, reason: 'missing-recipient' };
  }

  const mailer = getTransporter();
  if (!mailer) {
    logger.warn(`Email skipped (SMTP not configured). Subject: ${subject}`);
    return { sent: false, skipped: true, reason: 'smtp-not-configured' };
  }

  try {
    const info = await mailer.sendMail({
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      text,
      html
    });

    return {
      sent: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error(`Email send failed to ${to}: ${error.message}`);
    return { sent: false, error: error.message };
  }
};

module.exports = {
  isEmailConfigured,
  sendEmail
};

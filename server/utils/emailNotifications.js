const { sendEmail } = require('./emailService');

const APP_NAME = 'Smart Rental System';
const APP_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SUPPORT_EMAIL = process.env.SENDER_EMAIL || 'support@smartrental.local';

const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatCurrency = (amount, currency = 'ETB') => {
  const numericAmount = Number(amount || 0);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(numericAmount);
  } catch (_) {
    return `${numericAmount.toFixed(2)} ${currency}`;
  }
};

const buildTemplate = ({ preheader, title, intro, sections = [], ctaLabel, ctaUrl, tone = 'info' }) => {
  const toneColors = {
    info: '#0F766E',
    success: '#166534',
    warning: '#9A3412',
    danger: '#B91C1C'
  };

  const accent = toneColors[tone] || toneColors.info;
  const safePreheader = escapeHtml(preheader || '');
  const safeTitle = escapeHtml(title || APP_NAME);
  const safeIntro = escapeHtml(intro || '');
  const details = sections
    .map(({ label, value }) => {
      const safeLabel = escapeHtml(label || 'Detail');
      const safeValue = escapeHtml(value || 'N/A');
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:170px;color:#475569;font-size:14px;">${safeLabel}</td>
          <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:14px;font-weight:600;">${safeValue}</td>
        </tr>
      `;
    })
    .join('');

  const ctaBlock = ctaLabel && ctaUrl
    ? `
      <tr>
        <td align="center" style="padding:26px 0 8px 0;">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${accent};color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;font-size:14px;">${escapeHtml(ctaLabel)}</a>
        </td>
      </tr>
    `
    : '';

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#0F172A;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:22px 24px;background:#0F172A;color:#FFFFFF;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">${APP_NAME}</div>
                <div style="font-size:22px;font-weight:700;line-height:1.35;margin-top:8px;">${safeTitle}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 24px 10px 24px;color:#1E293B;font-size:15px;line-height:1.65;">${safeIntro}</td>
            </tr>
            ${details ? `
            <tr>
              <td style="padding:2px 24px 0 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  ${details}
                </table>
              </td>
            </tr>` : ''}
            ${ctaBlock}
            <tr>
              <td style="padding:20px 24px;background:#F8FAFC;border-top:1px solid #E2E8F0;color:#475569;font-size:12px;line-height:1.6;">
                This is an automated message from ${APP_NAME}. If you need help, contact ${escapeHtml(SUPPORT_EMAIL)}.<br/>
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
};

const sendWelcomeEmail = async ({ email, name, role }) => {
  const safeName = name || 'there';
  const safeRole = role || 'tenant';
  const subject = 'Welcome to Smart Rental System';
  const text = `Hi ${safeName}, your ${safeRole} account is ready. Start exploring properties and bookings.`;
  const html = buildTemplate({
    preheader: 'Your account has been created successfully.',
    title: 'Welcome to Smart Rental System',
    intro: `Hi ${safeName}, your ${safeRole} account has been created successfully.`,
    sections: [
      { label: 'Account type', value: safeRole },
      { label: 'Status', value: 'Active' }
    ],
    ctaLabel: 'Go to Dashboard',
    ctaUrl: `${APP_URL}/dashboard`,
    tone: 'success'
  });

  return sendEmail({ to: email, subject, text, html });
};

const sendBookingCreatedEmails = async ({
  tenantName,
  tenantEmail,
  ownerName,
  ownerEmail,
  houseTitle,
  startDate,
  endDate,
  totalAmount,
  currency = 'ETB'
}) => {
  const amountLabel = formatCurrency(totalAmount, currency);
  const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;

  await sendEmail({
    to: ownerEmail,
    subject: `New booking request for ${houseTitle}`,
    text: `${tenantName} requested ${houseTitle}. Stay: ${dateRange}. Total: ${amountLabel}.`,
    html: buildTemplate({
      preheader: 'A new booking request needs your review.',
      title: 'New Booking Request',
      intro: `Hello ${ownerName || 'Owner'}, ${tenantName} submitted a booking request for ${houseTitle}.`,
      sections: [
        { label: 'Property', value: houseTitle },
        { label: 'Guest', value: tenantName },
        { label: 'Stay dates', value: dateRange },
        { label: 'Total amount', value: amountLabel }
      ],
      ctaLabel: 'Review Booking',
      ctaUrl: `${APP_URL}/owner/bookings`,
      tone: 'info'
    })
  });

  return sendEmail({
    to: tenantEmail,
    subject: `Booking request submitted: ${houseTitle}`,
    text: `Your booking request for ${houseTitle} has been submitted. Stay: ${dateRange}.`,
    html: buildTemplate({
      preheader: 'Your booking request has been sent to the owner.',
      title: 'Booking Request Submitted',
      intro: `Hello ${tenantName}, your request for ${houseTitle} has been sent to the property owner.`,
      sections: [
        { label: 'Property', value: houseTitle },
        { label: 'Stay dates', value: dateRange },
        { label: 'Estimated total', value: amountLabel },
        { label: 'Current status', value: 'Pending owner response' }
      ],
      ctaLabel: 'Track Booking',
      ctaUrl: `${APP_URL}/bookings`,
      tone: 'info'
    })
  });
};

const sendBookingStatusEmail = async ({
  tenantName,
  tenantEmail,
  houseTitle,
  status,
  message,
  startDate,
  endDate
}) => {
  const normalizedStatus = String(status || '').toUpperCase();
  const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  const statusTone = status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';

  return sendEmail({
    to: tenantEmail,
    subject: `Booking ${normalizedStatus}: ${houseTitle}`,
    text: `Your booking for ${houseTitle} is now ${status}.`,
    html: buildTemplate({
      preheader: `Your booking status changed to ${normalizedStatus}.`,
      title: `Booking ${normalizedStatus}`,
      intro: `Hello ${tenantName}, your booking for ${houseTitle} is now ${status}.`,
      sections: [
        { label: 'Property', value: houseTitle },
        { label: 'Stay dates', value: dateRange },
        { label: 'New status', value: normalizedStatus },
        { label: 'Owner note', value: message || 'No additional notes provided' }
      ],
      ctaLabel: 'View Booking',
      ctaUrl: `${APP_URL}/bookings`,
      tone: statusTone
    })
  });
};

const sendPaymentSuccessEmails = async ({
  tenantName,
  tenantEmail,
  ownerName,
  ownerEmail,
  houseTitle,
  amount,
  currency = 'ETB',
  method,
  transactionId,
  invoiceNumber
}) => {
  const amountLabel = formatCurrency(amount, currency);
  const paymentMethod = method || 'N/A';
  const txId = transactionId || 'N/A';
  const invoice = invoiceNumber || 'N/A';

  await sendEmail({
    to: tenantEmail,
    subject: `Payment successful: ${houseTitle}`,
    text: `Your payment of ${amountLabel} for ${houseTitle} was successful. Transaction: ${txId}.`,
    html: buildTemplate({
      preheader: 'Your payment has been completed successfully.',
      title: 'Payment Successful',
      intro: `Hello ${tenantName}, we received your payment for ${houseTitle}.`,
      sections: [
        { label: 'Property', value: houseTitle },
        { label: 'Amount', value: amountLabel },
        { label: 'Payment method', value: paymentMethod },
        { label: 'Transaction ID', value: txId },
        { label: 'Invoice number', value: invoice }
      ],
      ctaLabel: 'View Payments',
      ctaUrl: `${APP_URL}/payments`,
      tone: 'success'
    })
  });

  return sendEmail({
    to: ownerEmail,
    subject: `You received a payment for ${houseTitle}`,
    text: `A payment of ${amountLabel} was completed for ${houseTitle}. Transaction: ${txId}.`,
    html: buildTemplate({
      preheader: 'A new payment has been received.',
      title: 'Payment Received',
      intro: `Hello ${ownerName || 'Owner'}, a new payment has been received for ${houseTitle}.`,
      sections: [
        { label: 'Property', value: houseTitle },
        { label: 'Amount received', value: amountLabel },
        { label: 'Payment method', value: paymentMethod },
        { label: 'Transaction ID', value: txId }
      ],
      ctaLabel: 'Open Owner Dashboard',
      ctaUrl: `${APP_URL}/owner/bookings`,
      tone: 'success'
    })
  });
};

const sendPaymentFailedEmail = async ({
  tenantName,
  tenantEmail,
  houseTitle,
  amount,
  currency = 'ETB',
  reason
}) => {
  const amountLabel = formatCurrency(amount, currency);

  return sendEmail({
    to: tenantEmail,
    subject: `Payment failed: ${houseTitle}`,
    text: `Your payment of ${amountLabel} for ${houseTitle} failed. Reason: ${reason || 'Unknown error'}.`,
    html: buildTemplate({
      preheader: 'A payment attempt was unsuccessful.',
      title: 'Payment Failed',
      intro: `Hello ${tenantName}, your payment for ${houseTitle} could not be completed.`,
      sections: [
        { label: 'Property', value: houseTitle },
        { label: 'Amount', value: amountLabel },
        { label: 'Reason', value: reason || 'Unknown error' }
      ],
      ctaLabel: 'Try Payment Again',
      ctaUrl: `${APP_URL}/payments`,
      tone: 'danger'
    })
  });
};

const sendRefundProcessedEmail = async ({
  tenantName,
  tenantEmail,
  houseTitle,
  amount,
  currency = 'ETB',
  reason
}) => {
  const amountLabel = formatCurrency(amount, currency);

  return sendEmail({
    to: tenantEmail,
    subject: `Refund processed: ${houseTitle}`,
    text: `A refund of ${amountLabel} was processed for ${houseTitle}.`,
    html: buildTemplate({
      preheader: 'Your refund has been processed successfully.',
      title: 'Refund Processed',
      intro: `Hello ${tenantName}, your refund for ${houseTitle} has been processed.`,
      sections: [
        { label: 'Property', value: houseTitle },
        { label: 'Refund amount', value: amountLabel },
        { label: 'Reason', value: reason || 'Not specified' }
      ],
      ctaLabel: 'View Payment History',
      ctaUrl: `${APP_URL}/payments`,
      tone: 'info'
    })
  });
};

module.exports = {
  sendWelcomeEmail,
  sendBookingCreatedEmails,
  sendBookingStatusEmail,
  sendPaymentSuccessEmails,
  sendPaymentFailedEmail,
  sendRefundProcessedEmail
};

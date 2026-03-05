const { sendEmail } = require('./emailService');

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
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

const sendWelcomeEmail = async ({ email, name, role }) => {
  const subject = 'Welcome to Smart Rental System';
  const text = `Hi ${name}, your ${role} account is ready.`;
  const html = `
    <h2>Welcome, ${name}!</h2>
    <p>Your ${role} account has been created successfully.</p>
    <p>You can now start using Smart Rental System.</p>
  `;

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
    text: `${tenantName} requested ${houseTitle} (${dateRange}). Total: ${amountLabel}`,
    html: `
      <h2>New Booking Request</h2>
      <p>Hello ${ownerName || 'Owner'},</p>
      <p><strong>${tenantName}</strong> requested your property <strong>${houseTitle}</strong>.</p>
      <p>Stay: ${dateRange}</p>
      <p>Total amount: ${amountLabel}</p>
    `
  });

  return sendEmail({
    to: tenantEmail,
    subject: `Booking request submitted: ${houseTitle}`,
    text: `Your booking request for ${houseTitle} (${dateRange}) has been submitted.`,
    html: `
      <h2>Booking Request Submitted</h2>
      <p>Hello ${tenantName},</p>
      <p>Your request for <strong>${houseTitle}</strong> has been sent to the owner.</p>
      <p>Stay: ${dateRange}</p>
      <p>Total amount: ${amountLabel}</p>
    `
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
  const ownerMessage = message ? `<p>Owner note: ${message}</p>` : '';

  return sendEmail({
    to: tenantEmail,
    subject: `Booking ${normalizedStatus}: ${houseTitle}`,
    text: `Your booking for ${houseTitle} is now ${status}.`,
    html: `
      <h2>Booking ${normalizedStatus}</h2>
      <p>Hello ${tenantName},</p>
      <p>Your booking for <strong>${houseTitle}</strong> is now <strong>${status}</strong>.</p>
      <p>Stay: ${dateRange}</p>
      ${ownerMessage}
    `
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

  await sendEmail({
    to: tenantEmail,
    subject: `Payment successful: ${houseTitle}`,
    text: `Your payment of ${amountLabel} for ${houseTitle} was successful.`,
    html: `
      <h2>Payment Successful</h2>
      <p>Hello ${tenantName},</p>
      <p>We received your payment for <strong>${houseTitle}</strong>.</p>
      <p>Amount: ${amountLabel}</p>
      <p>Method: ${method || 'N/A'}</p>
      <p>Transaction ID: ${transactionId || 'N/A'}</p>
      <p>Invoice: ${invoiceNumber || 'N/A'}</p>
    `
  });

  return sendEmail({
    to: ownerEmail,
    subject: `You received a payment for ${houseTitle}`,
    text: `A payment of ${amountLabel} was completed for ${houseTitle}.`,
    html: `
      <h2>Payment Received</h2>
      <p>Hello ${ownerName || 'Owner'},</p>
      <p>You received a payment for <strong>${houseTitle}</strong>.</p>
      <p>Amount: ${amountLabel}</p>
      <p>Method: ${method || 'N/A'}</p>
      <p>Transaction ID: ${transactionId || 'N/A'}</p>
    `
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
    text: `Your payment of ${amountLabel} for ${houseTitle} failed. Reason: ${reason || 'Unknown error'}`,
    html: `
      <h2>Payment Failed</h2>
      <p>Hello ${tenantName},</p>
      <p>Your payment for <strong>${houseTitle}</strong> could not be completed.</p>
      <p>Amount: ${amountLabel}</p>
      <p>Reason: ${reason || 'Unknown error'}</p>
    `
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
    html: `
      <h2>Refund Processed</h2>
      <p>Hello ${tenantName},</p>
      <p>Your refund for <strong>${houseTitle}</strong> has been processed.</p>
      <p>Refund amount: ${amountLabel}</p>
      <p>Reason: ${reason || 'Not specified'}</p>
    `
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

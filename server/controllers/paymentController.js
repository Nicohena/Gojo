/**
 * Payment Controller
 * 
 * Handles payment operations with multiple gateway support:
 * - Stripe (International payments)
 * - Chapa (Ethiopian payments - telebirr, E-Birr, YaYa Wallet, mobile money)
 * 
 * Features:
 * - Initiate payments via Chapa or Stripe
 * - Process webhooks from both gateways
 * - Update payment status
 * - Get payment history
 * - Verify payments server-side
 */

const Payment = require('../models/Payment');
const BookingRequest = require('../models/BookingRequest');
const House = require('../models/House');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { verifyPaymentWithChapa } = require('../middlewares/chapaMiddleware');
const { PAYMENT_STATUS, logPaymentEvent, calculateServiceFee } = require('../utils/paymentUtils');
const {
  sendRefundProcessedEmail
} = require('../utils/emailNotifications');
const notificationService = require('../utils/notificationService');
const fs = require('fs');

// Helper for file logging
const fileLog = (msg) => {
  try {
    fs.appendFileSync('/tmp/payment_debug.log', `${new Date().toISOString()} - ${msg}\n`);
  } catch (err) {}
};

// Conditional Stripe import (may not be needed if using Chapa only)
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// Axios for Chapa API calls
const axios = require('axios');

// Chapa API configuration
const CHAPA_BASE_URL = process.env.CHAPA_BASE_URL || 'https://api.chapa.co';
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;

const isAdminRole = (role) => role === 'admin';
const isAlreadyProcessedPayment = (status) => status === PAYMENT_STATUS.SUCCEEDED;
const getBookingPaymentStatusAfterRefund = (refundAmount, paymentAmount) =>
  Number(refundAmount) >= Number(paymentAmount) ? 'refunded' : 'paid';

const sendPaymentSuccessNotifications = async (payment) => {
  const [tenant, owner, house] = await Promise.all([
    User.findById(payment.userId).select('name email'),
    User.findById(payment.ownerId).select('name email'),
    House.findById(payment.houseId).select('title')
  ]);

  if (!tenant?.email || !owner?.email) {
    return;
  }

  await sendPaymentSuccessEmails({
    tenantName: tenant.name,
    tenantEmail: tenant.email,
    ownerName: owner.name,
    ownerEmail: owner.email,
    houseTitle: house?.title || 'your property',
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    transactionId: payment.transactionId,
    invoiceNumber: payment.invoiceNumber
  });

  // Create in-app notification for tenant
  notificationService.createNotification(payment.userId, null, { // req.io is not available here, but we can pass null or handle it
    type: 'system',
    title: 'Payment Successful',
    message: `Your payment for "${house?.title || 'your booking'}" has been processed successfully.`,
    metadata: { house: payment.houseId, booking: payment.bookingId, payment: payment._id }
  }).catch(() => {});

  // Create in-app notification for owner
  notificationService.createNotification(payment.ownerId, null, {
    type: 'system',
    title: 'Payment Received',
    message: `You have received a payment for "${house?.title || 'your property'}".`,
    metadata: { house: payment.houseId, booking: payment.bookingId, payment: payment._id }
  }).catch(() => {});
};

const sendPaymentFailureNotification = async (payment, reason) => {
  const [tenant, house] = await Promise.all([
    User.findById(payment.userId).select('name email'),
    House.findById(payment.houseId).select('title')
  ]);

  if (!tenant?.email) {
    return;
  }

  await sendPaymentFailedEmail({
    tenantName: tenant.name,
    tenantEmail: tenant.email,
    houseTitle: house?.title || 'your booking',
    amount: payment.amount,
    currency: payment.currency,
    reason
  });

  // Create in-app notification for tenant
  notificationService.createNotification(payment.userId, null, {
    type: 'system',
    title: 'Payment Failed',
    message: `Your payment for "${house?.title || 'your booking'}" has failed. Reason: ${reason || 'Unknown error'}`,
    metadata: { house: payment.houseId, booking: payment.bookingId, payment: payment._id }
  }).catch(() => {});
};

/**
 * Generate unique transaction reference for Chapa
 */
const generateTxRef = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TX-${timestamp}-${random}`.toUpperCase();
};

/**
 * @desc    Initiate a payment for booking (Chapa - Ethiopian payments)
 * @route   POST /api/payments/initiate
 * @access  Private
 */
const initiatePayment = asyncHandler(async (req, res) => {
  const { bookingId, paymentMethod = 'chapa', returnUrl, callbackUrl } = req.body;
  const normalizedMethod = String(paymentMethod || 'chapa').toLowerCase();

  if (!bookingId) {
    throw new ApiError('Please provide bookingId', 400);
  }

  if (!['chapa', 'stripe'].includes(normalizedMethod)) {
    throw new ApiError('Invalid payment method. Supported methods: chapa, stripe', 400);
  }

  // Get booking details
  const booking = await BookingRequest.findById(bookingId)
    .populate('houseId', 'title price images')
    .populate('tenantId', 'name email phone')
    .populate('ownerId', 'name email phone');

  if (!booking) {
    fileLog(`[Payment Error] Booking not found: ${bookingId}`);
    throw new ApiError('Booking not found', 404);
  }

  fileLog(`[Payment Info] Booking: ${booking._id}, Status: ${booking.status}, Tenant: ${booking.tenantId}`);

  // Verify booking belongs to user and is approved
  const tenantId = booking.tenantId._id ? booking.tenantId._id.toString() : booking.tenantId.toString();
  const userId = req.user._id.toString();

  if (tenantId !== userId) {
    fileLog(`[Payment Error] Auth mismatch: ${tenantId} !== ${userId}`);
    throw new ApiError('Not authorized to pay for this booking', 403);
  }

  if (booking.status !== 'approved') {
    fileLog(`[Payment Error] Status mismatch: ${booking.status} !== approved`);
    throw new ApiError(`Booking must be approved (current: ${booking.status}) before payment`, 400);
  }

  if (booking.paymentStatus === 'paid') {
    console.log(`[Payment Debug] Already paid: ${booking.paymentStatus}`);
    throw new ApiError('Booking has already been paid', 400);
  }

  // Prevent duplicate payments when a payment has already been initiated.
  if (booking.paymentId) {
    const existingPayment = await Payment.findById(booking.paymentId).select('status');
    if (existingPayment) {
      if (existingPayment.status === PAYMENT_STATUS.SUCCEEDED) {
        throw new ApiError('Booking has already been paid', 400);
      }

      if (
        existingPayment.status === PAYMENT_STATUS.PENDING ||
        existingPayment.status === PAYMENT_STATUS.PROCESSING
      ) {
        throw new ApiError(
          'A payment is already in progress for this booking. Please complete it before trying again.',
          400
        );
      }
    }
  }

  // Calculate amounts
  const rentAmount = booking.totalAmount || 0;
  if (rentAmount <= 0) {
    console.log(`[Payment Debug] Invalid rent amount: ${rentAmount}`);
    throw new ApiError('Invalid booking amount. Please contact support.', 400);
  }
  const serviceFee = calculateServiceFee(rentAmount);
  const totalAmount = rentAmount + serviceFee;

  console.log(`[Payment] Initiating ${normalizedMethod} payment for booking ${bookingId}. Total: ${totalAmount}`);

  if (normalizedMethod === 'chapa') {
    return await initiateChapaPayment({
      req, res, booking, totalAmount, rentAmount, serviceFee, returnUrl, callbackUrl
    });
  }

  if (!stripe) {
    throw new ApiError('Stripe payment gateway not configured', 500);
  }

  return await initiateStripePayment({
    req, res, booking, totalAmount, rentAmount, serviceFee, returnUrl
  });
});

/**
 * Initiate Chapa payment (Ethiopian Payment Gateway)
 * Supports: telebirr, CBE Birr, E-Birr, M-PESA, Awash Birr, YaYa Wallet, bank cards
 */
const initiateChapaPayment = async ({
  req, res, booking, totalAmount, rentAmount, serviceFee, returnUrl, callbackUrl
}) => {
  if (!CHAPA_SECRET_KEY) {
    throw new ApiError('Chapa payment gateway not configured', 500);
  }

  // Generate unique transaction reference
  const txRef = generateTxRef();

  // Default callback URL if not provided
  const defaultCallbackUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/payments/chapa/webhook`;
  const defaultReturnUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/success`;

  // Prepare Chapa payment request
  const chapaPayload = {
    amount: totalAmount.toString(),
    currency: 'ETB',
    email: req.user.email,
    first_name: req.user.name.split(' ')[0] || req.user.name,
    last_name: req.user.name.split(' ').slice(1).join(' ') || 'User',
    tx_ref: txRef,
    callback_url: callbackUrl || defaultCallbackUrl,
    return_url: returnUrl || defaultReturnUrl
    // Removing `customization` and `meta` completely. 
    // Chapa's internal Vue widget crashes with `checkInGroup` error when parsing them.
  };

  // Only include phone if it looks like a valid Ethiopian number
  if (req.user.phone) {
    const phone = req.user.phone.replace(/\s|-/g, '');
    if (/^(\+251|0)[97]\d{8}$/.test(phone)) {
      chapaPayload.phone_number = phone;
    } else {
      fileLog(`[Payment Info] Omitting invalid phone for Chapa: ${phone}`);
    }
  }

  fileLog(`[Payment Info] Chapa Payload: ${JSON.stringify(chapaPayload)}`);

  try {
    // Initialize Chapa payment
    const response = await axios.post(
      `${CHAPA_BASE_URL}/v1/transaction/initialize`,
      chapaPayload,
      {
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    fileLog(`[Payment Info] Chapa Response: ${JSON.stringify(response.data)}`);

    if (response.data.status !== 'success') {
      throw new ApiError(response.data.message || 'Failed to initialize Chapa payment', 500);
    }

    // Resolve ownerId (may be populated or plain ObjectId)
    const ownerId = booking.ownerId._id || booking.ownerId;

    fileLog(`[Payment Info] Creating payment record. ownerId=${ownerId}, houseId=${booking.houseId._id}, bookingId=${booking._id}`);

    // Create payment record
    let payment;
    try {
      payment = await Payment.createPaymentRecord({
        userId: req.user._id,
        houseId: booking.houseId._id,
        bookingId: booking._id,
        ownerId,
        amount: totalAmount,
        currency: 'ETB',
        method: 'chapa',
        breakdown: {
          rent: rentAmount,
          total: totalAmount,
          serviceFee,
          deposit: 0,
          taxes: 0
        },
        metadata: {
          description: `Payment for ${booking.houseId.title}`,
          customerEmail: req.user.email,
          customerPhone: req.user.phone,
          customerName: req.user.name,
          callbackUrl: callbackUrl || defaultCallbackUrl,
          returnUrl: returnUrl || defaultReturnUrl
        }
      });
      fileLog(`[Payment Info] Payment record created: ${payment._id}`);
    } catch (dbErr) {
      fileLog(`[Payment Error] DB Error creating payment: ${dbErr.message}`);
      throw new ApiError('Failed to save payment record: ' + dbErr.message, 500);
    }

    // Store Chapa transaction details
    payment.chapa = {
      txRef,
      checkoutUrl: response.data.data.checkout_url,
      verified: false
    };
    payment.status = PAYMENT_STATUS.PROCESSING;
    await payment.save();

    // Update booking with payment ID
    booking.paymentId = payment._id;
    await booking.save();

    // Log initiation
    await logPaymentEvent({
      action: 'PAYMENT_INITIATED',
      paymentId: payment._id,
      userId: req.user._id,
      amount: totalAmount,
      method: 'chapa',
      details: { txRef, bookingId: booking._id }
    });

    res.status(200).json({
      success: true,
      message: 'Chapa payment initiated',
      data: {
        paymentId: payment._id,
        checkoutUrl: response.data.data.checkout_url,
        txRef,
        amount: totalAmount,
        currency: 'ETB',
        breakdown: payment.breakdown
      }
    });

  } catch (error) {
    const chapaErrData = error.response?.data;
    fileLog(`[Payment Error] Chapa Error: ${JSON.stringify(chapaErrData || error.message)}`);
    console.error('[Chapa] Initiation error:', JSON.stringify(chapaErrData || error.message, null, 2));
    
    // Extract meaningful error message from possible object structures
    let message = 'Failed to initiate Chapa payment';
    if (chapaErrData?.message) {
      if (typeof chapaErrData.message === 'string') {
        message = chapaErrData.message;
      } else if (typeof chapaErrData.message === 'object') {
        // Handle nested error objects from Chapa (e.g. { message: { 'customization.title': ['...'] } })
        const values = Object.values(chapaErrData.message);
        message = Array.isArray(values[0]) ? values[0][0] : JSON.stringify(chapaErrData.message);
      }
    } else if (chapaErrData?.errorDetails) {
      message = typeof chapaErrData.errorDetails === 'string' 
        ? chapaErrData.errorDetails 
        : JSON.stringify(chapaErrData.errorDetails);
    }
    
    throw new ApiError(message, error.response?.status || 500);
  }
};

/**
 * Initiate Stripe payment (International)
 */
const initiateStripePayment = async ({
  req, res, booking, totalAmount, rentAmount, serviceFee, returnUrl
}) => {
  if (!stripe) {
    throw new ApiError('Stripe payment gateway not configured', 500);
  }

  try {
    // Create payment record
    const payment = await Payment.createPaymentRecord({
      userId: req.user._id,
      houseId: booking.houseId._id,
      bookingId: booking._id,
      ownerId: booking.ownerId._id || booking.ownerId,
      amount: totalAmount,
      currency: 'USD',
      method: 'stripe',
      breakdown: {
        rent: rentAmount,
        total: totalAmount,
        serviceFee,
        deposit: 0,
        taxes: 0
      },
      metadata: {
        description: `Rental payment for ${booking.houseId.title}`
      }
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const successParams = `status=success&provider=stripe&paymentId=${payment._id}&session_id={CHECKOUT_SESSION_ID}`;
    const successUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}${successParams}`
      : `${clientUrl}/payment/success?${successParams}`;
    const cancelUrl = `${clientUrl}/payment/success?status=failed&provider=stripe&paymentId=${payment._id}`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: req.user.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(totalAmount * 100),
            product_data: {
              name: `Rental payment: ${booking.houseId.title}`,
              description: `Booking ${booking._id}`
            }
          }
        }
      ],
      metadata: {
        paymentId: payment._id.toString(),
        bookingId: booking._id.toString(),
        userId: req.user._id.toString()
      },
      payment_intent_data: {
        metadata: {
          paymentId: payment._id.toString(),
          bookingId: booking._id.toString(),
          userId: req.user._id.toString(),
          houseId: booking.houseId._id.toString()
        }
      }
    });

    payment.stripe = {
      checkoutSessionId: checkoutSession.id,
      paymentIntentId: null,
      clientSecret: null
    };
    payment.status = PAYMENT_STATUS.PROCESSING;
    await payment.save();

    booking.paymentId = payment._id;
    await booking.save();

    // Log initiation
    await logPaymentEvent({
      action: 'PAYMENT_INITIATED',
      paymentId: payment._id,
      userId: req.user._id,
      amount: totalAmount,
      currency: 'USD',
      method: 'stripe',
      details: { checkoutSessionId: checkoutSession.id, bookingId: booking._id }
    });

    res.status(200).json({
      success: true,
      message: 'Stripe payment initiated',
      data: {
        paymentId: payment._id,
        checkoutUrl: checkoutSession.url,
        checkoutSessionId: checkoutSession.id,
        amount: totalAmount,
        currency: 'USD',
        breakdown: payment.breakdown
      }
    });

  } catch (stripeError) {
    console.error('[Stripe] Error:', stripeError);
    throw new ApiError('Failed to create Stripe payment intent', 500);
  }
};

const verifyStripePaymentState = async ({ payment, sessionId, source = 'stripe_verification' }) => {
  if (!stripe) {
    throw new ApiError('Stripe payment gateway not configured', 500);
  }

  const checkoutSessionId = sessionId || payment.stripe?.checkoutSessionId;
  let checkoutSession = null;
  let paymentIntent = null;
  let paymentIntentId = payment.stripe?.paymentIntentId || null;

  if (checkoutSessionId) {
    checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['payment_intent']
    });

    if (checkoutSession?.payment_intent) {
      paymentIntentId =
        typeof checkoutSession.payment_intent === 'string'
          ? checkoutSession.payment_intent
          : checkoutSession.payment_intent.id;
      paymentIntent =
        typeof checkoutSession.payment_intent === 'string'
          ? null
          : checkoutSession.payment_intent;
    }
  }

  if (!paymentIntent && paymentIntentId) {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  }

  const checkoutPaid =
    checkoutSession &&
    (checkoutSession.payment_status === 'paid' || checkoutSession.status === 'complete');
  const intentPaid = paymentIntent?.status === 'succeeded';
  const verified = Boolean(checkoutPaid || intentPaid);

  if (verified && payment.status !== PAYMENT_STATUS.SUCCEEDED) {
    payment.status = PAYMENT_STATUS.SUCCEEDED;
    payment.paidAt = payment.paidAt || new Date();

    payment.stripe = {
      ...(payment.stripe || {}),
      checkoutSessionId: checkoutSession?.id || payment.stripe?.checkoutSessionId || null,
      paymentIntentId: paymentIntentId || payment.stripe?.paymentIntentId || null,
      chargeId: paymentIntent?.latest_charge || payment.stripe?.chargeId || null
    };

    payment.transactionId =
      payment.transactionId ||
      paymentIntent?.latest_charge ||
      paymentIntentId ||
      checkoutSession?.id ||
      null;

    await payment.save();

    await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

    await logPaymentEvent({
      action: 'PAYMENT_PROCESSED',
      paymentId: payment._id,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      method: 'stripe',
      details: { source, checkoutSessionId: checkoutSession?.id, paymentIntentId }
    });

    sendPaymentSuccessNotifications(payment).catch(() => {});
  }

  return {
    verified,
    checkoutSessionId: checkoutSession?.id || checkoutSessionId || payment.stripe?.checkoutSessionId,
    paymentIntentId: paymentIntentId || payment.stripe?.paymentIntentId,
    paymentStatus: verified ? PAYMENT_STATUS.SUCCEEDED : payment.status
  };
};

/**
 * @desc    Handle Chapa webhook events
 * @route   POST /api/payments/chapa/webhook
 * @access  Public (Chapa)
 */
const handleChapaWebhook = asyncHandler(async (req, res) => {
  const { tx_ref, reference, payment_type } = req.body;

  console.log(`[Chapa Webhook] Received: tx_ref=${tx_ref}, reference=${reference}`);

  if (!tx_ref) {
    return res.status(400).json({ success: false, message: 'Missing tx_ref' });
  }

  // Find payment by transaction reference
  const payment = await Payment.findByChapaRef(tx_ref);

  if (!payment) {
    console.error(`[Chapa Webhook] Payment not found for tx_ref: ${tx_ref}`);
    return res.status(404).json({ success: false, message: 'Payment record not found' });
  }

  // Idempotency guard: never re-process already-succeeded payments.
  if (isAlreadyProcessedPayment(payment.status)) {
    return res.status(200).json({
      success: true,
      message: 'Payment already processed',
      data: { paymentId: payment._id, status: payment.status }
    });
  }

  // Verification helper to avoid duplicate logic
  const verifyAndProcess = async () => {
    const verification = await verifyPaymentWithChapa(tx_ref);

    if (!verification.success || !verification.verified) {
      console.error(`[Chapa Webhook] Verification failed for ${tx_ref}:`, verification.error);

      payment.status = PAYMENT_STATUS.FAILED;
      payment.chapa.chapaResponse = verification.data || { error: verification.error };
      await payment.save();

      await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'failed' });

      await logPaymentEvent({
        action: 'PAYMENT_FAILED',
        paymentId: payment._id,
        userId: payment.userId,
        amount: payment.amount,
        method: 'chapa',
        details: { txRef: tx_ref, error: verification.error },
        severity: 'high'
      });

      sendPaymentFailureNotification(payment, verification.error).catch(() => {});

      return { success: false, message: 'Verification failed' };
    }

    // Success
    payment.status = PAYMENT_STATUS.SUCCEEDED;
    payment.paidAt = new Date();
    payment.transactionId = reference || verification.data?.reference;
    payment.chapa = {
      ...payment.chapa,
      verified: true,
      paymentMethod: payment_type || verification.data?.payment_type,
      chapaResponse: verification.data
    };
    await payment.save();

    await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

    await logPaymentEvent({
      action: 'PAYMENT_PROCESSED',
      paymentId: payment._id,
      userId: payment.userId,
      amount: payment.amount,
      method: 'chapa',
      details: { txRef: tx_ref, paymentType: payment.chapa.paymentMethod }
    });

    sendPaymentSuccessNotifications(payment).catch(() => {});

    return { success: true };
  };

  const result = await verifyAndProcess();

  // Notify via Socket.io
  const io = req.app.get('io');
  if (io) {
    const eventName = result.success ? 'payment:success' : 'payment:failed';
    io.to(`user_${payment.userId}`).emit(eventName, {
      paymentId: payment._id,
      amount: payment.amount,
      message: result.success ? 'Payment verified successfully!' : 'Payment verification failed'
    });

    if (result.success) {
      io.to(`user_${payment.ownerId}`).emit('payment:received', {
        paymentId: payment._id,
        amount: payment.amount,
        tenantId: payment.userId,
        message: 'You have received a new rental payment!'
      });
    }
  }

  res.status(200).json(result);
});

/**
 * @desc    Get payment status for a booking
 * @route   GET /api/payments/:id/status
 * @access  Private
 */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findById(id)
    .populate('bookingId', 'startDate endDate status')
    .populate('houseId', 'title');

  if (!payment) {
    throw new ApiError('Payment not found', 404);
  }

  // Check authorization
  if (
    payment.userId.toString() !== req.user._id.toString() &&
    payment.ownerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError('Not authorized to view this payment status', 403);
  }

  // If payment is processing via Chapa, verify current status
  if (payment.method === 'chapa' && payment.status === PAYMENT_STATUS.PROCESSING && payment.chapa?.txRef) {
    const verification = await verifyPaymentWithChapa(payment.chapa.txRef);
    
    if (verification.verified) {
      payment.status = PAYMENT_STATUS.SUCCEEDED;
      payment.paidAt = new Date();
      payment.chapa.verified = true;
      payment.chapa.chapaResponse = verification.data;
      await payment.save();

      await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

      await logPaymentEvent({
        action: 'PAYMENT_PROCESSED',
        paymentId: payment._id,
        userId: payment.userId,
        amount: payment.amount,
        method: 'chapa',
        details: { txRef: payment.chapa.txRef, source: 'polling' }
      });

      sendPaymentSuccessNotifications(payment).catch(() => {});
    }
  } else if (payment.method === 'stripe' && payment.status === PAYMENT_STATUS.PROCESSING) {
    try {
      await verifyStripePaymentState({
        payment,
        source: 'polling'
      });
    } catch (err) {
      console.error('[Stripe] Polling verification failed:', err.message);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      paymentId: payment._id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      paymentMethod: payment.chapa?.paymentMethod,
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      bookingStatus: payment.bookingId?.status
    }
  });
});

/**
 * @desc    Verify Chapa payment by txRef (used after return_url redirect)
 * @route   POST /api/payments/chapa/verify
 * @access  Private
 */
const verifyChapaPayment = asyncHandler(async (req, res) => {
  const { txRef, paymentId } = req.body;

  if (!txRef && !paymentId) {
    throw new ApiError('Please provide txRef or paymentId', 400);
  }

  const payment = paymentId
    ? await Payment.findById(paymentId)
    : await Payment.findByChapaRef(txRef);

  if (!payment) {
    throw new ApiError('Payment record not found', 404);
  }

  if (
    payment.userId.toString() !== req.user._id.toString() &&
    payment.ownerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError('Not authorized to verify this payment', 403);
  }

  if (payment.method !== 'chapa') {
    throw new ApiError('This endpoint only supports Chapa payments', 400);
  }

  if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
    return res.status(200).json({
      success: true,
      message: 'Payment already verified',
      data: {
        paymentId: payment._id,
        status: payment.status,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt
      }
    });
  }

  const refToVerify = txRef || payment.chapa?.txRef;
  if (!refToVerify) {
    throw new ApiError('Chapa transaction reference not found for this payment', 400);
  }

  const verification = await verifyPaymentWithChapa(refToVerify);

  if (verification.verified) {
    payment.status = PAYMENT_STATUS.SUCCEEDED;
    payment.paidAt = payment.paidAt || new Date();
    payment.transactionId = payment.transactionId || verification.data?.reference;
    payment.chapa = {
      ...payment.chapa,
      verified: true,
      paymentMethod: verification.data?.payment_type || payment.chapa?.paymentMethod,
      chapaResponse: verification.data
    };
    await payment.save();

    await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

    await logPaymentEvent({
      action: 'PAYMENT_PROCESSED',
      paymentId: payment._id,
      userId: payment.userId,
      amount: payment.amount,
      method: 'chapa',
      details: { txRef: refToVerify, source: 'return_url_verification' }
    });

    sendPaymentSuccessNotifications(payment).catch(() => {});
  }

  return res.status(200).json({
    success: true,
    message: verification.verified ? 'Payment verified successfully' : 'Payment is still processing',
    data: {
      paymentId: payment._id,
      status: verification.verified ? PAYMENT_STATUS.SUCCEEDED : payment.status,
      transactionId: payment.transactionId,
      paidAt: payment.paidAt
    }
  });
});

/**
 * @desc    Verify Stripe payment after redirect by sessionId/paymentId
 * @route   POST /api/payments/stripe/verify
 * @access  Private
 */
const verifyStripePayment = asyncHandler(async (req, res) => {
  const { sessionId, paymentId } = req.body;

  if (!sessionId && !paymentId) {
    throw new ApiError('Please provide sessionId or paymentId', 400);
  }

  const payment = paymentId
    ? await Payment.findById(paymentId)
    : await Payment.findOne({ 'stripe.checkoutSessionId': sessionId });

  if (!payment) {
    throw new ApiError('Payment record not found', 404);
  }

  if (
    payment.userId.toString() !== req.user._id.toString() &&
    payment.ownerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError('Not authorized to verify this payment', 403);
  }

  if (payment.method !== 'stripe') {
    throw new ApiError('This endpoint only supports Stripe payments', 400);
  }

  const verification = await verifyStripePaymentState({
    payment,
    sessionId,
    source: 'return_url_verification'
  });

  return res.status(200).json({
    success: true,
    message: verification.verified ? 'Payment verified successfully' : 'Payment is still processing',
    data: {
      paymentId: payment._id,
      status: verification.paymentStatus,
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      checkoutSessionId: verification.checkoutSessionId,
      paymentIntentId: verification.paymentIntentId
    }
  });
});

/**
 * @desc    Update payment status (manual/admin)
 * @route   PATCH /api/payments/:id/status
 * @access  Private (admin/system)
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, transactionId } = req.body;

  if (!isAdminRole(req.user.role)) {
    throw new ApiError('Admin access required to update payment status', 403);
  }

  if (!status) {
    throw new ApiError('Please provide a status', 400);
  }

  const payment = await Payment.findById(id);

  if (!payment) {
    throw new ApiError('Payment not found', 404);
  }

  // Validate status transition
  const validTransitions = {
    [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED],
    [PAYMENT_STATUS.PROCESSING]: [PAYMENT_STATUS.SUCCEEDED, PAYMENT_STATUS.FAILED],
    [PAYMENT_STATUS.SUCCEEDED]: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED],
    [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING],
    [PAYMENT_STATUS.REFUNDED]: [],
    [PAYMENT_STATUS.PARTIALLY_REFUNDED]: [],
    [PAYMENT_STATUS.CANCELLED]: []
  };

  if (!validTransitions[payment.status]?.includes(status)) {
    throw new ApiError(`Invalid status transition from ${payment.status} to ${status}`, 400);
  }

  const oldStatus = payment.status;
  payment.status = status;
  
  if (transactionId) {
    payment.transactionId = transactionId;
  }

  if (status === PAYMENT_STATUS.SUCCEEDED) {
    payment.paidAt = new Date();
    await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

    await logPaymentEvent({
      action: 'PAYMENT_PROCESSED',
      paymentId: payment._id,
      userId: req.user?._id || payment.userId,
      amount: payment.amount,
      method: payment.method,
      details: { source: 'manual_update', oldStatus }
    });

    sendPaymentSuccessNotifications(payment).catch(() => {});
  }

  if (status === PAYMENT_STATUS.FAILED) {
    await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'failed' });

    await logPaymentEvent({
      action: 'PAYMENT_FAILED',
      paymentId: payment._id,
      userId: req.user?._id || payment.userId,
      amount: payment.amount,
      method: payment.method,
      details: { source: 'manual_update', oldStatus },
      severity: 'high'
    });

    sendPaymentFailureNotification(payment, 'Status manually updated to failed').catch(() => {});
  }

  await payment.save();

  // Notify user
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${payment.userId}`).emit('payment:update', {
      paymentId: payment._id,
      status,
      amount: payment.amount
    });
  }

  res.status(200).json({
    success: true,
    message: `Payment status updated to ${status}`,
    data: { payment }
  });
});

/**
 * @desc    Handle Stripe webhook (kept for international payments)
 * @route   POST /api/payments/stripe/webhook
 * @access  Public (Stripe)
 */
const handleStripeWebhook = asyncHandler(async (req, res) => {
  if (!stripe) {
    return res.status(400).json({ success: false, message: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const io = req.app.get('io');

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;
      const payment = paymentId
        ? await Payment.findById(paymentId)
        : await Payment.findOne({ 'stripe.checkoutSessionId': session.id });

      if (payment) {
        if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
          break;
        }

        payment.status = PAYMENT_STATUS.SUCCEEDED;
        payment.paidAt = new Date();
        payment.transactionId = session.payment_intent || session.id;
        payment.stripe.checkoutSessionId = session.id;
        if (session.payment_intent) {
          payment.stripe.paymentIntentId = session.payment_intent;
        }
        await payment.save();

        await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

        await logPaymentEvent({
          action: 'PAYMENT_PROCESSED',
          paymentId: payment._id,
          userId: payment.userId,
          amount: payment.amount,
          currency: 'USD',
          method: 'stripe',
          details: { checkoutSessionId: session.id }
        });

        sendPaymentSuccessNotifications(payment).catch(() => {});

        if (io) {
          io.to(`user_${payment.userId}`).emit('payment:success', {
            paymentId: payment._id,
            amount: payment.amount,
            message: 'Stripe payment successful!'
          });
          io.to(`user_${payment.ownerId}`).emit('payment:received', {
            paymentId: payment._id,
            amount: payment.amount,
            tenantId: payment.userId,
            message: 'Stripe payment received!'
          });
        }
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const paymentId = paymentIntent.metadata?.paymentId;
      const payment = paymentId
        ? await Payment.findById(paymentId)
        : await Payment.findOne({ 'stripe.paymentIntentId': paymentIntent.id });

      if (payment) {
        if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
          break;
        }

        payment.status = PAYMENT_STATUS.SUCCEEDED;
        payment.paidAt = new Date();
        payment.transactionId = paymentIntent.latest_charge;
        payment.stripe.chargeId = paymentIntent.latest_charge;
        payment.stripe.paymentIntentId = paymentIntent.id;
        await payment.save();

        await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

        await logPaymentEvent({
          action: 'PAYMENT_PROCESSED',
          paymentId: payment._id,
          userId: payment.userId,
          amount: payment.amount,
          currency: 'USD',
          method: 'stripe',
          details: { paymentIntentId: paymentIntent.id }
        });

        sendPaymentSuccessNotifications(payment).catch(() => {});

        if (io) {
          io.to(`user_${payment.userId}`).emit('payment:success', {
            paymentId: payment._id,
            amount: payment.amount,
            message: 'International payment successful!'
          });
          io.to(`user_${payment.ownerId}`).emit('payment:received', {
            paymentId: payment._id,
            amount: payment.amount,
            tenantId: payment.userId,
            message: 'International payment received!'
          });
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const failedIntent = event.data.object;
      const paymentId = failedIntent.metadata?.paymentId;
      const payment = paymentId
        ? await Payment.findById(paymentId)
        : await Payment.findOne({ 'stripe.paymentIntentId': failedIntent.id });

      if (payment) {
        if (payment.status === PAYMENT_STATUS.FAILED) {
          break;
        }

        payment.status = PAYMENT_STATUS.FAILED;
        await payment.save();

        await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'failed' });

        await logPaymentEvent({
          action: 'PAYMENT_FAILED',
          paymentId: payment._id,
          userId: payment.userId,
          amount: payment.amount,
          currency: 'USD',
          method: 'stripe',
          details: { error: failedIntent.last_payment_error?.message },
          severity: 'high'
        });

        sendPaymentFailureNotification(payment, failedIntent.last_payment_error?.message).catch(() => {});

        if (io) {
          io.to(`user_${payment.userId}`).emit('payment:failed', {
            paymentId: payment._id,
            message: 'Stripe payment failed'
          });
        }
      }
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});

/**
 * @desc    Process refund
 * @route   POST /api/payments/:id/refund
 * @access  Private (admin only)
 */
const processRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  const payment = await Payment.findById(id);

  if (!payment) {
    throw new ApiError('Payment not found', 404);
  }

  if (payment.status !== PAYMENT_STATUS.SUCCEEDED) {
    throw new ApiError('Can only refund successful payments', 400);
  }

  const refundAmount = amount || payment.amount;

  if (Number(refundAmount) <= 0) {
    throw new ApiError('Refund amount must be greater than 0', 400);
  }

  if (refundAmount > payment.amount) {
    throw new ApiError('Refund amount cannot exceed payment amount', 400);
  }

  let refundId = null;

  // Process refund based on payment method
  if (payment.method === 'stripe' && stripe) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe.paymentIntentId,
        amount: Math.round(refundAmount * 100)
      });
      refundId = refund.id;
    } catch (stripeError) {
      console.error('[Stripe] Refund error:', stripeError);
      throw new ApiError('Failed to process Stripe refund', 500);
    }
  } else if (payment.method === 'chapa') {
    // Note: Chapa refunds are currently manual via dashboard
    refundId = `REFUND-MANUAL-${Date.now()}`;
    console.log(`[Chapa] Manual refund requested for ${payment._id}. Reference: ${refundId}`);
  }

  // Update payment record
  await payment.processRefund(refundAmount, reason, refundId);

  // Update booking payment status. Partial refunds still count as paid bookings.
  const bookingPaymentStatus = getBookingPaymentStatusAfterRefund(refundAmount, payment.amount);
  await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: bookingPaymentStatus });

  // Log refund
  await logPaymentEvent({
    action: 'PAYMENT_REFUNDED',
    paymentId: payment._id,
    userId: req.user._id,
    amount: refundAmount,
    method: payment.method,
    details: { reason, refundId, originalAmount: payment.amount },
    severity: 'high'
  });

  // Notify user via Socket.io
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${payment.userId}`).emit('refund:processed', {
      paymentId: payment._id,
      refundAmount,
      reason,
      message: 'Your refund has been processed.'
    });
  }

  const [tenant, house] = await Promise.all([
    User.findById(payment.userId).select('name email'),
    House.findById(payment.houseId).select('title')
  ]);

  if (tenant?.email) {
    sendRefundProcessedEmail({
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      houseTitle: house?.title || 'your booking',
      amount: refundAmount,
      currency: payment.currency,
      reason
    }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: 'Refund processed and recorded successfully',
    data: { payment }
  });
});

/**
 * @desc    Get payment history for user
 * @route   GET /api/payments
 * @access  Private
 */
const getPaymentHistory = asyncHandler(async (req, res) => {
  const { status, method, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  
  // Scoping: tenants see their own, owners see payments for their houses, admins see all
  if (req.user.role === 'admin') {
    // No filter refinement
  } else if (req.user.role === 'owner') {
    filter.ownerId = req.user._id;
  } else {
    filter.userId = req.user._id;
  }

  if (status) filter.status = status;
  if (method) filter.method = method;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('houseId', 'title images location')
      .populate('bookingId', 'startDate endDate status')
      .populate('userId', 'name email')
      .populate('ownerId', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: {
      payments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

/**
 * @desc    Get single payment details
 * @route   GET /api/payments/:id
 * @access  Private
 */
const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('houseId', 'title images location')
    .populate('bookingId', 'startDate endDate status')
    .populate('ownerId', 'name email')
    .populate('userId', 'name email phone');

  if (!payment) {
    throw new ApiError('Payment not found', 404);
  }

  // Authorization check
  const isTenant = payment.userId._id.toString() === req.user._id.toString();
  const isOwner = payment.ownerId._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isTenant && !isOwner && !isAdmin) {
    throw new ApiError('Not authorized to access this payment record', 403);
  }

  res.status(200).json({
    success: true,
    data: { payment }
  });
});

module.exports = {
  initiatePayment,
  handleChapaWebhook,
  handleStripeWebhook,
  getPaymentStatus,
  verifyChapaPayment,
  verifyStripePayment,
  updatePaymentStatus,
  processRefund,
  getPaymentHistory,
  getPaymentById,
  isAdminRole,
  isAlreadyProcessedPayment,
  getBookingPaymentStatusAfterRefund
};

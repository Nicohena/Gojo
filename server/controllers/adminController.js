/**
 * Admin Controller
 * 
 * Handles administrative operations:
 * - Listing verification
 * - User management
 * - Analytics and reports
 * - Audit logs
 */

const House = require('../models/House');
const User = require('../models/User');
const BookingRequest = require('../models/BookingRequest');
const Payment = require('../models/Payment');
const AdminLog = require('../models/AdminLog');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { getAnalytics } = require('../utils/analytics');

const escapeRegExp = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Get pending (unverified) listings
 * @route   GET /api/admin/listings/pending
 * @access  Private (admin only)
 */
const getPendingListings = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status = 'pending',
    reportedOnly = 'false',
    search = '',
    city = '',
    state = '',
    propertyType = '',
    minPrice,
    maxPrice,
    available
  } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const statusFilters = {
    pending: {
      'verified.status': false,
      $or: [
        { 'verified.decision': 'pending' },
        { 'verified.decision': { $exists: false } } // Backward compatibility
      ]
    },
    rejected: {
      'verified.status': false,
      'verified.decision': 'rejected'
    },
    approved: {
      'verified.status': true,
      'verified.decision': 'approved'
    }
  };

  const filter = status === 'all'
    ? {}
    : (statusFilters[status] || statusFilters.pending);

  const ownerSearchIds = [];
  if (status === 'rejected' && reportedOnly === 'true') {
    filter['verified.ownerReport.status'] = 'submitted';
  }

  const trimmedSearch = String(search || '').trim();
  if (trimmedSearch) {
    const safeSearch = escapeRegExp(trimmedSearch);
    const owners = await User.find({
      $or: [
        { name: new RegExp(safeSearch, 'i') },
        { email: new RegExp(safeSearch, 'i') }
      ]
    }).select('_id').limit(50);

    owners.forEach((owner) => ownerSearchIds.push(owner._id));

    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { title: new RegExp(safeSearch, 'i') },
          { 'location.city': new RegExp(safeSearch, 'i') },
          { 'location.state': new RegExp(safeSearch, 'i') },
          { 'location.address': new RegExp(safeSearch, 'i') },
          ...(ownerSearchIds.length ? [{ ownerId: { $in: ownerSearchIds } }] : [])
        ]
      }
    ];
  }

  const trimmedCity = String(city || '').trim();
  if (trimmedCity) {
    const safeCity = escapeRegExp(trimmedCity);
    filter.$and = [
      ...(filter.$and || []),
      { 'location.city': new RegExp(safeCity, 'i') }
    ];
  }

  const trimmedState = String(state || '').trim();
  if (trimmedState) {
    const safeState = escapeRegExp(trimmedState);
    filter.$and = [
      ...(filter.$and || []),
      { 'location.state': new RegExp(safeState, 'i') }
    ];
  }

  if (propertyType) {
    filter.propertyType = propertyType;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const parsedMin = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined;
    const parsedMax = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined;

    if (parsedMin !== undefined && Number.isNaN(parsedMin)) {
      throw new ApiError('minPrice must be a valid number', 400);
    }
    if (parsedMax !== undefined && Number.isNaN(parsedMax)) {
      throw new ApiError('maxPrice must be a valid number', 400);
    }

    filter.price = {};
    if (parsedMin !== undefined) {
      filter.price.$gte = parsedMin;
    }
    if (parsedMax !== undefined) {
      filter.price.$lte = parsedMax;
    }
    if (Object.keys(filter.price).length === 0) {
      delete filter.price;
    }
  }

  if (available !== undefined && available !== '') {
    filter.available = String(available) === 'true';
  }

  const [listings, total] = await Promise.all([
    House.find(filter)
      .populate('ownerId', 'name email phone verified role avatar rating createdAt lastLogin banned')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    House.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: {
      listings,
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
 * @desc    Verify or reject a listing (VERIFIED BADGE FEATURE)
 * @route   PATCH /api/admin/listings/:id/verify
 * @access  Private (admin only)
 */
const verifyListing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approved, reason } = req.body;

  if (typeof approved !== 'boolean') {
    throw new ApiError('approved must be a boolean value', 400);
  }

  const house = await House.findById(id).populate('ownerId', 'name email');

  if (!house) {
    throw new ApiError('Listing not found', 404);
  }

  // Update verification status
  if (approved) {
    house.verified = {
      decision: 'approved',
      status: true,
      reviewedAt: new Date(),
      rejectionReason: null,
      verifiedAt: new Date(),
      verifiedBy: req.user._id,
      ownerReport: {
        message: house.verified?.ownerReport?.message || null,
        reportedAt: house.verified?.ownerReport?.reportedAt || null,
        reviewedAt: house.verified?.ownerReport?.message ? new Date() : null,
        status: house.verified?.ownerReport?.message ? 'reviewed' : 'none'
      }
    };
  } else {
    house.verified = {
      decision: 'rejected',
      status: false,
      reviewedAt: new Date(),
      rejectionReason: reason || 'Rejected by admin',
      verifiedAt: null,
      verifiedBy: null,
      ownerReport: {
        message: house.verified?.ownerReport?.message || null,
        reportedAt: house.verified?.ownerReport?.reportedAt || null,
        reviewedAt: house.verified?.ownerReport?.message ? new Date() : null,
        status: house.verified?.ownerReport?.message ? 'reviewed' : 'none'
      }
    };
  }

  await house.save();

  // Log admin action (AUDIT LOG)
  await AdminLog.logAction({
    action: approved ? 'HOUSE_VERIFIED' : 'HOUSE_REJECTED',
    targetId: house._id,
    targetType: 'House',
    performedBy: req.user._id,
    details: {
      reason: reason || (approved ? 'Approved' : 'Rejected'),
      previousState: { verified: !approved },
      newState: { verified: approved }
    },
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    },
    severity: 'medium'
  });

  // Notify owner (SOCKET.IO INTEGRATION)
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${house.ownerId._id}`).emit('listingVerification', {
      houseId: house._id,
      title: house.title,
      approved,
      reason
    });
  }

  res.status(200).json({
    success: true,
    message: `Listing ${approved ? 'verified' : 'rejected'} successfully`,
    data: { house }
  });
});

/**
 * @desc    Moderate listing operational state (admin action)
 * @route   PATCH /api/admin/listings/:id/moderate
 * @access  Private (admin only)
 */
const moderateListing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;
  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

  const allowedActions = [
    'approve',
    'reject',
    'pause',
    'activate',
    'send_to_review',
    'delete'
  ];

  if (!allowedActions.includes(action)) {
    throw new ApiError(`Invalid action. Allowed actions: ${allowedActions.join(', ')}`, 400);
  }

  const house = await House.findById(id).populate('ownerId', 'name email');
  if (!house) {
    throw new ApiError('Listing not found', 404);
  }

  let responseMessage = 'Listing updated successfully';
  let actionForLog = 'HOUSE_UPDATED';
  let details = { actionType: action };

  if (action === 'approve') {
    if (house.verified?.decision === 'approved' && house.verified?.status === true) {
      throw new ApiError('Listing is already approved', 400);
    }
    house.verified = {
      decision: 'approved',
      status: true,
      reviewedAt: new Date(),
      rejectionReason: null,
      verifiedAt: new Date(),
      verifiedBy: req.user._id,
      ownerReport: {
        message: house.verified?.ownerReport?.message || null,
        reportedAt: house.verified?.ownerReport?.reportedAt || null,
        reviewedAt: house.verified?.ownerReport?.message ? new Date() : null,
        status: house.verified?.ownerReport?.message ? 'reviewed' : 'none'
      }
    };
    responseMessage = 'Listing approved successfully';
    actionForLog = 'HOUSE_VERIFIED';
    details = { reason: trimmedReason || 'Approved', actionType: action };
  } else if (action === 'reject') {
    if (house.verified?.decision === 'rejected' && house.verified?.status === false) {
      throw new ApiError('Listing is already rejected', 400);
    }
    if (!trimmedReason) {
      throw new ApiError('Rejection reason is required', 400);
    }
    house.verified = {
      decision: 'rejected',
      status: false,
      reviewedAt: new Date(),
      rejectionReason: trimmedReason,
      verifiedAt: null,
      verifiedBy: null,
      ownerReport: {
        message: house.verified?.ownerReport?.message || null,
        reportedAt: house.verified?.ownerReport?.reportedAt || null,
        reviewedAt: house.verified?.ownerReport?.message ? new Date() : null,
        status: house.verified?.ownerReport?.message ? 'reviewed' : 'none'
      }
    };
    responseMessage = 'Listing rejected successfully';
    actionForLog = 'HOUSE_REJECTED';
    details = { reason: trimmedReason, actionType: action };
  } else if (action === 'pause') {
    if (!house.available) {
      throw new ApiError('Listing is already paused', 400);
    }
    house.available = false;
    responseMessage = 'Listing paused successfully';
    details = { reason: trimmedReason || 'Paused by admin', actionType: action };
  } else if (action === 'activate') {
    if (house.available) {
      throw new ApiError('Listing is already active', 400);
    }
    house.available = true;
    responseMessage = 'Listing activated successfully';
    details = { reason: trimmedReason || 'Activated by admin', actionType: action };
  } else if (action === 'send_to_review') {
    if (house.verified?.decision === 'pending') {
      throw new ApiError('Listing is already in pending review', 400);
    }
    house.verified = {
      decision: 'pending',
      status: false,
      reviewedAt: null,
      rejectionReason: null,
      verifiedAt: null,
      verifiedBy: null,
      ownerReport: {
        message: house.verified?.ownerReport?.message || null,
        reportedAt: house.verified?.ownerReport?.reportedAt || null,
        reviewedAt: new Date(),
        status: house.verified?.ownerReport?.message ? 'reviewed' : 'none'
      }
    };
    responseMessage = 'Listing moved to pending review successfully';
    details = { reason: trimmedReason || 'Sent back to review queue', actionType: action };
  } else if (action === 'delete') {
    if (!trimmedReason) {
      throw new ApiError('Delete reason is required', 400);
    }
    const hasActiveBookings = await BookingRequest.exists({
      houseId: house._id,
      status: { $in: ['pending', 'approved'] }
    });
    if (hasActiveBookings) {
      throw new ApiError('Cannot delete listing with active or pending bookings', 400);
    }

    await House.findByIdAndDelete(id);
    responseMessage = 'Listing deleted successfully';
    actionForLog = 'HOUSE_DELETED';
    details = { reason: trimmedReason, actionType: action };
  }

  if (action !== 'delete') {
    await house.save();
  }

  await AdminLog.logAction({
    action: actionForLog,
    targetId: house._id,
    targetType: 'House',
    performedBy: req.user._id,
    details,
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    },
    severity: ['delete', 'reject'].includes(action) ? 'high' : 'medium'
  });

  const io = req.app.get('io');
  if (io && house.ownerId?._id) {
    io.to(`user_${house.ownerId._id}`).emit('listingModeration', {
      houseId: house._id,
      title: house.title,
      action,
      reason: trimmedReason
    });
    if (action === 'approve' || action === 'reject') {
      io.to(`user_${house.ownerId._id}`).emit('listingVerification', {
        houseId: house._id,
        title: house.title,
        approved: action === 'approve',
        reason: trimmedReason
      });
    }
  }

  res.status(200).json({
    success: true,
    message: responseMessage,
    data: { house: action === 'delete' ? null : house }
  });
});

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (admin only)
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, verified, isVerifiedOwner, search, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};

  if (role) {
    filter.role = role;
  }

  if (verified !== undefined) {
    filter.verified = verified === 'true';
  }

  // Owner verification is a separate status and only applies to owner accounts.
  if (isVerifiedOwner !== undefined) {
    if (!role) {
      filter.role = 'owner';
    }
    if ((role || filter.role) === 'owner') {
      filter.isVerifiedOwner = isVerifiedOwner === 'true';
    }
  }

  if (search) {
    const safeSearch = escapeRegExp(search);
    filter.$or = [
      { name: new RegExp(safeSearch, 'i') },
      { email: new RegExp(safeSearch, 'i') },
      { phone: new RegExp(safeSearch, 'i') }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: {
      users,
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
 * @desc    Update user (admin action)
 * @route   PATCH /api/admin/users/:id
 * @access  Private (admin only)
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, verified, isVerifiedOwner, banned, banReason } = req.body;

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Store previous state for audit log
  const previousState = {
    role: user.role,
    verified: user.verified,
    isVerifiedOwner: Boolean(user.isVerifiedOwner),
    banned: user.banned?.isBanned || false
  };

  // Update fields
  if (role && req.user._id.toString() === user._id.toString() && role !== 'admin') {
    throw new ApiError('Admins cannot remove their own admin role', 400);
  }
  if (role) user.role = role;
  if (verified !== undefined) user.verified = verified;
  if (isVerifiedOwner !== undefined) {
    if (user.role !== 'owner' && Boolean(isVerifiedOwner) === true) {
      throw new ApiError('Only users with owner role can be marked as verified owners', 400);
    }
    user.isVerifiedOwner = Boolean(isVerifiedOwner);
  }
  if (typeof banned === 'boolean') {
    if (req.user._id.toString() === user._id.toString() && banned) {
      throw new ApiError('Admins cannot ban themselves', 400);
    }

    user.banned = {
      isBanned: banned,
      reason: banned ? (banReason || 'Suspended by admin') : '',
      bannedAt: banned ? new Date() : null,
      bannedBy: banned ? req.user._id : null
    };
  }

  await user.save();

  // Log admin action
  await AdminLog.logAction({
    action: typeof banned === 'boolean'
      ? (banned ? 'USER_SUSPENDED' : 'USER_UPDATED')
      : (role ? 'USER_ROLE_CHANGED' : 'USER_UPDATED'),
    targetId: user._id,
    targetType: 'User',
    performedBy: req.user._id,
    details: {
      previousState,
      newState: {
        role: user.role,
        verified: user.verified,
        isVerifiedOwner: Boolean(user.isVerifiedOwner),
        banned: user.banned?.isBanned || false,
        banReason: user.banned?.reason || ''
      },
      reason: typeof banned === 'boolean'
        ? (banned ? (banReason || 'Suspended by admin') : 'Account reinstated')
        : undefined
    },
    severity: (role || typeof banned === 'boolean') ? 'high' : 'medium'
  });

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user: user.getPublicProfile() }
  });
});

/**
 * @desc    Get admin analytics dashboard (ANALYTICS FEATURE)
 * @route   GET /api/admin/analytics
 * @access  Private (admin only)
 */
const getAdminAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;

  // Calculate date range
  let startDate;
  const endDate = new Date();

  switch (period) {
    case '7d':
      startDate = new Date(endDate - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(endDate - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(endDate - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(endDate - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(endDate - 30 * 24 * 60 * 60 * 1000);
  }

  // Get analytics data
  const analytics = await getAnalytics(startDate, endDate);

  // Get additional counts
  const [
    totalUsers,
    totalHouses,
    totalBookings,
    pendingVerifications,
    recentPayments,
    paymentStatusBreakdown,
    topOwners
  ] = await Promise.all([
    User.countDocuments(),
    House.countDocuments(),
    BookingRequest.countDocuments(),
    House.countDocuments({
      'verified.status': false,
      $or: [
        { 'verified.decision': 'pending' },
        { 'verified.decision': { $exists: false } }
      ]
    }),
    Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          paidAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]),
    Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    House.aggregate([
      {
        $group: {
          _id: '$ownerId',
          listings: { $sum: 1 },
          approvedListings: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$verified.decision', 'approved'] },
                    { $eq: ['$verified.status', true] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalViews: { $sum: '$viewCount' }
        }
      },
      { $sort: { listings: -1, totalViews: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'owner'
        }
      },
      { $unwind: '$owner' },
      {
        $project: {
          ownerId: { $toString: '$_id' },
          _id: 0,
          name: '$owner.name',
          email: '$owner.email',
          verified: '$owner.verified',
          isVerifiedOwner: '$owner.isVerifiedOwner',
          banned: '$owner.banned',
          listings: 1,
          approvedListings: 1,
          totalViews: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$listings', 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ['$approvedListings', '$listings'] }, 100] },
                  0
                ]
              },
              0
            ]
          }
        }
      }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalHouses,
        totalBookings,
        pendingVerifications,
        revenue: recentPayments[0]?.totalRevenue || 0,
        transactions: recentPayments[0]?.count || 0,
        paymentStatusBreakdown: Object.fromEntries(
          paymentStatusBreakdown.map((item) => [item._id || 'unknown', item.count])
        )
      },
      topOwners,
      analytics,
      period
    }
  });
});

/**
 * @desc    Get admin audit logs
 * @route   GET /api/admin/logs
 * @access  Private (admin only)
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { action, targetType, severity, startDate, endDate, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};

  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;
  if (severity) filter.severity = severity;
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && Number.isNaN(start.getTime())) {
      throw new ApiError('startDate must be a valid date', 400);
    }
    if (end && Number.isNaN(end.getTime())) {
      throw new ApiError('endDate must be a valid date', 400);
    }

    filter.createdAt = {};
    if (start) {
      filter.createdAt.$gte = start;
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const [logs, total] = await Promise.all([
    AdminLog.find(filter)
      .populate('performedBy', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    AdminLog.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: {
      logs,
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
 * @desc    Get system statistics
 * @route   GET /api/admin/stats
 * @access  Private (admin only)
 */
const getSystemStats = asyncHandler(async (req, res) => {
  const [
    usersByRole,
    bookingsByStatus,
    housesByType,
    recentActivity,
    paymentsByStatus,
    paymentsByMethod
  ] = await Promise.all([
    // Users by role
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    // Bookings by status
    BookingRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    // Houses by property type
    House.aggregate([
      { $group: { _id: '$propertyType', count: { $sum: 1 } } }
    ]),
    // Recent activity (last 24 hours)
    AdminLog.find({ 
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    })
      .sort('-createdAt')
      .limit(10)
      .populate('performedBy', 'name'),
    Payment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Payment.aggregate([
      { $group: { _id: '$method', count: { $sum: 1 } } }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      usersByRole: Object.fromEntries(
        usersByRole.map(r => [r._id, r.count])
      ),
      bookingsByStatus: Object.fromEntries(
        bookingsByStatus.map(b => [b._id, b.count])
      ),
      housesByType: Object.fromEntries(
        housesByType.map(h => [h._id || 'unspecified', h.count])
      ),
      paymentsByStatus: Object.fromEntries(
        paymentsByStatus.map(p => [p._id || 'unknown', p.count])
      ),
      paymentsByMethod: Object.fromEntries(
        paymentsByMethod.map(p => [p._id || 'unknown', p.count])
      ),
      recentActivity
    }
  });
});

/**
 * @desc    Get user by ID (admin)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new ApiError('User not found', 404);

  const [listingsCount, bookingsAsTenant, bookingsAsOwner, successfulPayments] = await Promise.all([
    House.countDocuments({ ownerId: user._id }),
    BookingRequest.countDocuments({ tenantId: user._id }),
    BookingRequest.countDocuments({ ownerId: user._id }),
    Payment.aggregate([
      {
        $match: {
          ownerId: user._id,
          status: 'succeeded'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      user,
      activity: {
        listingsCount,
        bookingsAsTenant,
        bookingsAsOwner,
        successfulTransactions: successfulPayments[0]?.count || 0,
        revenueGenerated: successfulPayments[0]?.totalRevenue || 0
      }
    }
  });
});

/**
 * @desc    Delete user (admin)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError('User not found', 404);
  if (user.role === 'admin') {
    throw new ApiError('Admin accounts cannot be deleted', 400);
  }

  const [hasListings, hasBookings] = await Promise.all([
    House.exists({ ownerId: user._id }),
    BookingRequest.exists({
      $or: [{ tenantId: user._id }, { ownerId: user._id }],
      status: { $in: ['pending', 'approved'] }
    })
  ]);

  if (hasListings || hasBookings) {
    throw new ApiError('Cannot delete user with active listings or bookings. Suspend account instead.', 400);
  }

  await User.findByIdAndDelete(req.params.id);

  await AdminLog.logAction({
    action: 'USER_DELETED',
    targetId: user._id,
    targetType: 'User',
    performedBy: req.user._id,
    details: {
      previousState: { role: user.role, email: user.email, verified: user.verified },
      reason: 'Admin deleted account'
    },
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    },
    severity: 'high'
  });

  res.status(200).json({ success: true, message: 'User deleted successfully' });
});

module.exports = {
  getPendingListings,
  verifyListing,
  moderateListing,
  getUsers,
  updateUser,
  getAdminAnalytics,
  getAuditLogs,
  getSystemStats,
  getUserById,
  deleteUser
};

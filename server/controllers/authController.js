/**
 * Auth Controller
 * 
 * Handles user authentication operations:
 * - Registration
 * - Login
 * - Get current user
 * - Password reset
 */

const User = require('../models/User');
const crypto = require('crypto');
const axios = require('axios');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/emailNotifications');

const parseAllowedGoogleClientIds = (value = '') =>
  String(value)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const normalizeGoogleAuthMode = (mode) => (mode === 'signup' ? 'signup' : 'login');

const resolveGoogleRole = (role) => {
  const allowedRoles = ['tenant', 'owner'];
  return allowedRoles.includes(role) ? role : 'tenant';
};

const assertGoogleTokenInfo = (tokenInfo, allowedClientIds = []) => {
  if (!tokenInfo || typeof tokenInfo !== 'object') {
    throw new ApiError('Invalid Google token payload', 401);
  }

  if (!allowedClientIds.includes(tokenInfo.aud)) {
    throw new ApiError('Google token audience is invalid', 401);
  }

  if (!tokenInfo.email || String(tokenInfo.email_verified) !== 'true') {
    throw new ApiError('Google account email is not verified', 401);
  }
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, language } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    throw new ApiError('Please provide name, email, and password', 400);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError('User with this email already exists', 409);
  }

  // Validate role (prevent self-assignment of admin role)
  const allowedRoles = ['tenant', 'owner'];
  const userRole = allowedRoles.includes(role) ? role : 'tenant';

  // Generate initial-based avatar
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=256`;

  // Create user (password is hashed in model pre-save hook)
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: userRole,
    phone,
    avatar: defaultAvatar,
    language: language || 'en'
  });

  // Generate JWT token
  const token = user.generateAuthToken();

  // Send welcome email in background (never block signup on email errors)
  sendWelcomeEmail({
    email: user.email,
    name: user.name,
    role: user.role
  }).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: user.getPublicProfile(),
      token
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    throw new ApiError('Please provide email and password', 400);
  }

  // Find user and include password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new ApiError('Invalid email or password', 401);
  }

  if (user.banned?.isBanned) {
    throw new ApiError(
      `Your account has been suspended${user.banned?.reason ? `: ${user.banned.reason}` : ''}`,
      403
    );
  }

  // Compare password
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    throw new ApiError('Invalid email or password', 401);
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate JWT token
  const token = user.generateAuthToken();

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.getPublicProfile(),
      token
    }
  });
});

/**
 * @desc    Authenticate with Google ID token (signup/login)
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleAuth = asyncHandler(async (req, res) => {
  const { idToken, mode = 'login', role } = req.body;

  if (!idToken) {
    throw new ApiError('Google idToken is required', 400);
  }

  const googleClientIds = parseAllowedGoogleClientIds(process.env.GOOGLE_CLIENT_ID);

  if (googleClientIds.length === 0) {
    throw new ApiError('Google authentication is not configured on the server', 500);
  }

  let tokenInfo;
  try {
    const response = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { id_token: idToken },
      timeout: 10000
    });
    tokenInfo = response.data;
  } catch (error) {
    throw new ApiError('Invalid Google token', 401);
  }

  assertGoogleTokenInfo(tokenInfo, googleClientIds);

  const email = tokenInfo.email.toLowerCase();
  const normalizedMode = normalizeGoogleAuthMode(mode);
  const desiredRole = resolveGoogleRole(role);

  let user = await User.findOne({ email }).select('+password');

  if (!user) {
    if (normalizedMode === 'login') {
      throw new ApiError('No account found for this Google email. Please sign up first.', 404);
    }

    const name = tokenInfo.name || email.split('@')[0];
    
    // Check if Google picture is a default silhouette or missing
    const isDefaultPic = !tokenInfo.picture || 
                         tokenInfo.picture.includes('default-user') || 
                         tokenInfo.picture.endsWith('/photo.jpg');
                         
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=256`;
    const avatarUrl = isDefaultPic ? defaultAvatar : tokenInfo.picture;

    user = await User.create({
      name,
      email,
      password: crypto.randomBytes(24).toString('hex'),
      role: desiredRole,
      verified: true,
      avatar: avatarUrl,
      googleId: tokenInfo.sub,
      language: 'en'
    });

    sendWelcomeEmail({
      email: user.email,
      name: user.name,
      role: user.role
    }).catch(() => {});
  } else {
    if (user.banned?.isBanned) {
      throw new ApiError(
        `Your account has been suspended${user.banned?.reason ? `: ${user.banned.reason}` : ''}`,
        403
      );
    }

    if (user.googleId && user.googleId !== tokenInfo.sub) {
      throw new ApiError('This email is linked to a different Google account', 401);
    }

    if (!user.googleId) user.googleId = tokenInfo.sub;
    if (!user.avatar) {
      const name = tokenInfo.name || user.name || email.split('@')[0];
      const isDefaultPic = !tokenInfo.picture || 
                           tokenInfo.picture.includes('default-user') || 
                           tokenInfo.picture.endsWith('/photo.jpg');
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=256`;
      user.avatar = isDefaultPic ? defaultAvatar : tokenInfo.picture;
    }
    if (!user.verified) user.verified = true;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
  }

  const token = user.generateAuthToken();

  res.status(200).json({
    success: true,
    message: normalizedMode === 'signup' ? 'Google signup successful' : 'Google login successful',
    data: {
      user: user.getPublicProfile(),
      token
    }
  });
});

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by auth middleware
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: user.getPublicProfile()
    }
  });
});

/**
 * @desc    Update password
 * @route   PUT /api/auth/password
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError('Please provide current and new password', 400);
  }

  if (newPassword.length < 6) {
    throw new ApiError('New password must be at least 6 characters', 400);
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError('Current password is incorrect', 401);
  }

  // Update password (hashed in pre-save hook)
  user.password = newPassword;
  await user.save();

  // Generate new token
  const token = user.generateAuthToken();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    data: { token }
  });
});

/**
 * @desc    Forgot password - Generate reset token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError('Please provide an email address', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if user exists
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link'
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false });

  await sendPasswordResetEmail({
    email: user.email,
    name: user.name,
    resetToken
  });

  res.status(200).json({
    success: true,
    message: 'If an account exists with this email, you will receive a password reset link'
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) {
    throw new ApiError('Reset token is required', 400);
  }

  if (!password || password.length < 6) {
    throw new ApiError('Password must be at least 6 characters', 400);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  }).select('+password');

  if (!user) {
    throw new ApiError('Invalid or expired reset token', 400);
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const authToken = user.generateAuthToken();

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    data: {
      token: authToken,
      user: user.getPublicProfile()
    }
  });
});

/**
 * @desc    Logout - Clear token (client-side)
 * @route   POST /api/auth/logout
 * @access  Private
 * 
 * NOTE: JWT tokens are stateless, so logout is handled client-side
 * This endpoint can be used to clear cookies if using cookie-based auth
 */
const logout = asyncHandler(async (req, res) => {
  // If using cookies
  if (req.cookies && req.cookies.token) {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh
 * @access  Private
 */
const refreshToken = asyncHandler(async (req, res) => {
  // If we're using cookies, we could check for a refreshToken cookie here.
  // For now, we'll implement a simple token rotation based on the current valid token.
  // This usually requires a separate refresh token, but to satisfy the endpoint request
  // we'll issue a new token for the authenticated user.
  
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const token = user.generateAuthToken();

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: { token }
  });
});

module.exports = {
  register,
  login,
  googleAuth,
  parseAllowedGoogleClientIds,
  normalizeGoogleAuthMode,
  resolveGoogleRole,
  assertGoogleTokenInfo,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
  refreshToken
};

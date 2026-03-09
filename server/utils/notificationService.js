const User = require('../models/User');
const logger = require('./logger');

/**
 * Notification Service
 * 
 * Handles in-app notifications and real-time socket emissions.
 */
const notificationService = {
  /**
   * Create a notification for a specific user
   * 
   * @param {string} userId - ID of the user to notify
   * @param {Object} io - Socket.io instance
   * @param {Object} notificationData - { type, title, message, metadata }
   */
  createNotification: async (userId, io, { type, title, message, metadata = {} }) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`Notification failed: User ${userId} not found`);
        return null;
      }

      const notification = {
        type: type || 'system',
        title,
        message,
        metadata,
        read: false,
        createdAt: new Date()
      };

      // Add to user's notifications (unshift to keep newest first)
      user.notifications.unshift(notification);

      // Keep only most recent 50 notifications
      if (user.notifications.length > 50) {
        user.notifications = user.notifications.slice(0, 50);
      }

      await user.save();

      // Emit real-time notification via Socket.io
      if (io) {
        io.to(`user_${userId}`).emit('notification', {
          ...notification,
          _id: user.notifications[0]._id // Get the generated ID
        });
      }

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      return null;
    }
  },

  /**
   * Notify all administrators
   * 
   * @param {Object} io - Socket.io instance
   * @param {Object} notificationData - { type, title, message, metadata }
   */
  notifyAdmins: async (io, { type, title, message, metadata = {} }) => {
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      
      const notificationPromises = admins.map(admin => 
        notificationService.createNotification(admin._id, io, {
          type: type || 'system',
          title,
          message,
          metadata
        })
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      logger.error('Error notifying admins:', error);
    }
  }
};

module.exports = notificationService;

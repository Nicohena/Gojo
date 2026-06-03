/**
 * Database Configuration
 * Handles MongoDB connection using Mongoose
 */

const mongoose = require("mongoose");

/**
 * Connect to MongoDB database
 * Uses connection string from environment variables
 * Implements connection event handlers for monitoring
 */
const connectDB = async ({ maxRetries = 10, initialDelayMs = 2000 } = {}) => {
  const opts = {
    // Timeouts tuned for flaky networks / Atlas
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    // Prefer IPv4 in some environments
    family: 4,
    // Keep pool modest for smaller machines
    maxPoolSize: 10,
    // Retry writes where supported
    retryWrites: true,
  };

  let attempt = 0;
  let delay = initialDelayMs;

  // Connection event handlers
  mongoose.connection.on('connected', () => {
    console.log(`✅ MongoDB connected to ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB connection error: ${err && err.message ? err.message : err}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Waiting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    } catch (err) {
      console.error('Error closing MongoDB connection during shutdown:', err && err.message ? err.message : err);
      process.exit(1);
    }
  });

  // Try connecting with exponential backoff up to maxRetries
  while (attempt < maxRetries) {
    try {
      attempt += 1;
      console.log(`🔌 Attempting MongoDB connection (attempt ${attempt}/${maxRetries})...`);
      const conn = await mongoose.connect(process.env.MONGO_URI, opts);
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB Connection Error (attempt ${attempt}): ${error && error.message ? error.message : error}`);
      if (attempt >= maxRetries) {
        console.error('❌ Max MongoDB connection attempts reached. Giving up.');
        throw error;
      }
      // wait for delay before retrying
      await new Promise((res) => setTimeout(res, delay));
      delay = Math.min(delay * 2, 60000); // cap backoff at 60s
    }
  }
};

module.exports = connectDB;

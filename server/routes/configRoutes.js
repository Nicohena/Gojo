/**
 * Configuration Routes
 * 
 * Public endpoints for app-wide configuration:
 * - GET /api/config - Get app configuration (currency rates, thresholds, etc.)
 */

const express = require('express');
const router = express.Router();

/**
 * @desc    Get app configuration
 * @route   GET /api/config
 * @access  Public
 * @returns {Object} App configuration including currency rates, price thresholds, etc.
 */
router.get('/', (req, res) => {
  const config = {
    success: true,
    data: {
      currency: {
        default: 'ETB',
        usdRate: 0.0174, // ETB to USD conversion rate
        symbols: {
          ETB: '₦',
          USD: '$'
        }
      },
      pricing: {
        fairPriceThreshold: 3000, // Properties under this price are marked as "fair"
        minPrice: 500,
        maxPrice: 100000
      },
      rewards: {
        nextTierThreshold: 15000,
        tiers: {
          bronze: { min: 0, max: 4999, benefits: 'Basic member' },
          silver: { min: 5000, max: 9999, benefits: 'Priority support' },
          gold: { min: 10000, max: 14999, benefits: 'Early access to new features' },
          platinum: { min: 15000, max: Infinity, benefits: 'Premium support & exclusive deals' }
        },
        pointsPerAction: {
          booking: 50,
          review: 25,
          referral: 100,
          payment: 10 // 10 points per 1000 ETB spent
        }
      },
      pagination: {
        defaultLimit: 20,
        maxLimit: 100
      }
    }
  };

  res.status(200).json(config);
});

module.exports = router;

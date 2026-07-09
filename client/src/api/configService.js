import apiClient from './client';

const configService = {
  getConfig: async () => {
    try {
      const response = await apiClient.get('/config');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch config:', error);
      // Return defaults if API fails
      return {
        currency: {
          default: 'ETB',
          usdRate: 0.0174,
          symbols: { ETB: '₦', USD: '$' }
        },
        pricing: {
          fairPriceThreshold: 3000,
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
            payment: 10
          }
        }
      };
    }
  }
};

export default configService;

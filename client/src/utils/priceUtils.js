/**
 * Price Calculation Utilities
 */

export const SERVICE_FEE_RATE = 0.05;

export const calculateServiceFee = (baseAmount = 0) => {
  const amount = Number(baseAmount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount * SERVICE_FEE_RATE);
};

/**
 * Gets the number of days in a given month/year
 * @param {Date} date 
 * @returns {number}
 */
export const getDaysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

/**
 * Calculates total price based on starting month's daily rate
 * @param {number} basePrice - Monthly price
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @returns {Object} { subtotal, serviceFee, total, diffDays, serviceFeeRate }
 */
export const calculateTotalPrice = (basePrice, startDate, endDate) => {
  if (!basePrice || !startDate || !endDate) {
    return { subtotal: 0, serviceFee: 0, total: 0, diffDays: 0, serviceFeeRate: SERVICE_FEE_RATE };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return { subtotal: 0, serviceFee: 0, total: 0, diffDays: 0, serviceFeeRate: SERVICE_FEE_RATE };
  }

  const diffMs = end - start;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  // Use days in starting month for daily rate (consistency with backend)
  const daysInMonth = getDaysInMonth(start);
  const dailyRate = basePrice / daysInMonth;
  const subtotal = Math.round(dailyRate * diffDays);
  const serviceFee = calculateServiceFee(subtotal);
  
  return {
    subtotal,
    serviceFee,
    total: subtotal + serviceFee,
    diffDays,
    serviceFeeRate: SERVICE_FEE_RATE
  };
};

/**
 * Validates if a date range meets the minimum lease requirements
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @param {number} minLeaseMonths 
 * @returns {boolean}
 */
export const validateMinLease = (startDate, endDate, minLeaseMonths) => {
  if (!minLeaseMonths) return true;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const diffMs = end - start;
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44); // Average month length
  
  return diffMonths >= minLeaseMonths;
};

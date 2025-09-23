// Currency formatter
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Number formatter
export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-IN').format(num);
};

// Percentage formatter
export const formatPercentage = (percentage) => {
  return `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
};

// Date formatter
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

// Compact number formatter (for large numbers)
export const formatCompactNumber = (num) => {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
};
// Function to format date for display
export const formatDate = (dateString, locale, options) => {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(locale, options);
    } catch (e) {
        return dateString; // Return original if invalid
    }
};

// Function to format currency (example)
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
    try {
        return amount.toLocaleString(locale, { style: 'currency', currency: currency });
    } catch (e) {
        return `${amount}$`; // Fallback
    }
};
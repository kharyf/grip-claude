/**
 * Utility to parse raw OCR text from a receipt and extract key information.
 */

export const parseReceiptText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    let merchant = null;
    let amount = null;
    let date = null;

    // 1. Try to find the merchant (usually the first non-empty line)
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && trimmed.length > 2 && !/\d/.test(trimmed)) {
            merchant = trimmed;
            break;
        }
    }

    // 2. Try to find the total amount
    // Look for patterns like "TOTAL", "AMOUNT", "DUE", etc.
    const allNumericAmounts = text.match(/\d+[\.,]\d{2}/g) || [];
    const parsedAmounts = allNumericAmounts.map(a => parseFloat(a.replace(',', '.')));

    const totalKeywords = ['total', 'amount due', 'amount', 'due', 'sum', 'balance'];
    let potentialTotals = [];

    for (const line of lines) {
        if (totalKeywords.some(kw => line.toLowerCase().includes(kw))) {
            const match = line.match(/(\d+[\.,]\d{2})/);
            if (match) {
                potentialTotals.push(parseFloat(match[1].replace(',', '.')));
            }
        }
    }

    if (potentialTotals.length > 0) {
        // If we found lines with "total" keywords, the maximum of those is usually the real total
        amount = Math.max(...potentialTotals).toFixed(2);
    } else if (parsedAmounts.length > 0) {
        // Fallback: Use the largest number found anywhere
        amount = Math.max(...parsedAmounts).toFixed(2);
    }

    // 3. Try to find the date
    // Look for formats like MM/DD/YYYY, DD/MM/YYYY, etc.
    const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
        date = dateMatch[1];
    } else {
        date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // 4. Suggest category based on merchant
    const categoryMap = {
        'Whole Foods': 'Groceries',
        'Target': 'Groceries',
        'Starbucks': 'Dining Out',
        'Shell': 'Transportation',
        'Amazon': 'Groceries',
        'Walmart': 'Groceries',
        'Uber': 'Transportation',
        'McDonald': 'Dining Out'
    };

    let category = 'Groceries'; // Default
    if (merchant) {
        for (const [key, val] of Object.entries(categoryMap)) {
            if (merchant.toLowerCase().includes(key.toLowerCase())) {
                category = val;
                break;
            }
        }
    }

    return {
        merchant: merchant || 'Unknown Merchant',
        amount: amount || '0.00',
        date: date,
        category: category
    };
};

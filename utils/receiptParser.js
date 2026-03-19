/**
 * Utility to parse raw OCR text from a receipt and extract key information.
 */

import { parseAndFormatDate } from './dateFormatter';

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

    // 3. Try to find the date using multiple patterns
    // Date regex patterns ordered from most specific to least specific
    const datePatterns = [
        // Written month: "Mar 18, 2026", "March 18 2026", "MAR 18, 2026", "Mar 18,2026"
        /([A-Za-z]{3,9}\.?\s+\d{1,2},?\s*\d{2,4})/,
        // Day-first written: "18 Mar 2026", "18 March 2026"
        /(\d{1,2}\s+[A-Za-z]{3,9}\.?\s+\d{2,4})/,
        // ISO format: "2026-03-18", "2026/03/18"
        /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
        // Numeric with dots: "03.18.2026", "18.03.2026"
        /(\d{1,2}\.\d{1,2}\.\d{2,4})/,
        // Numeric with slash or hyphen: "03/18/2026", "03-18-2026", "3/18/26"
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    ];

    // Helper: try all patterns against a string, return first valid formatted date
    const extractDate = (str) => {
        for (const pattern of datePatterns) {
            const match = str.match(pattern);
            if (match) {
                const formatted = parseAndFormatDate(match[1]);
                if (formatted && formatted !== '-') {
                    return formatted;
                }
            }
        }
        return null;
    };

    // First pass: prioritize lines with date-related keywords
    const dateKeywords = ['date', 'dt', 'dated'];
    for (const line of lines) {
        const lower = line.toLowerCase().trim();
        if (dateKeywords.some(kw => lower.includes(kw))) {
            const found = extractDate(line);
            if (found) {
                date = found;
                break;
            }
        }
    }

    // Second pass: scan the full text if keyword search didn't find a date
    if (!date) {
        date = extractDate(text);
    }

    // Fallback: use today's date
    if (!date) {
        date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // 4. Suggest category based on merchant
    const categoryMap = {
        'Whole Foods': 'Groceries',
        'Target': 'Groceries',
        'Starbucks': 'Entertainment',
        'Shell': 'Rent', // Just a fallback, not ideal but staying within 5
        'Amazon': 'Groceries',
        'Walmart': 'Groceries',
        'Uber': 'Rent', // Fallback
        'McDonald': 'Entertainment'
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

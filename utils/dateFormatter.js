/**
 * Shared utility to parse various date formats and reformat to "Mmm DD, YYYY".
 * Accepts formats like: "Dec 25", "12/25/2024", "12-25-2024", "2024-12-25", "December 25, 2024", etc.
 * Returns '-' for empty input, null for unparseable input.
 */
export const parseAndFormatDate = (dateInput) => {
  if (!dateInput || !dateInput.trim()) {
    return '-';
  }

  const input = dateInput.trim();
  let parsedDate = null;

  // Format: "Dec 25", "Dec 25,", "December 25", "Dec 25, 2024", "Jan 25, 26"
  const monthDayMatch = input.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{2,4})?$/);
  if (monthDayMatch) {
    const monthStr = monthDayMatch[1];
    const day = parseInt(monthDayMatch[2]);
    let year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : new Date().getFullYear();
    if (year < 100) {
      year += 2000; // Convert 2-digit year to 4-digit
    }

    const monthMap = {
      'jan': 0, 'january': 0,
      'feb': 1, 'february': 1,
      'mar': 2, 'march': 2,
      'apr': 3, 'april': 3,
      'may': 4,
      'jun': 5, 'june': 5,
      'jul': 6, 'july': 6,
      'aug': 7, 'august': 7,
      'sep': 8, 'sept': 8, 'september': 8,
      'oct': 9, 'october': 9,
      'nov': 10, 'november': 10,
      'dec': 11, 'december': 11
    };

    const month = monthMap[monthStr.toLowerCase()];
    if (month !== undefined && day >= 1 && day <= 31) {
      parsedDate = new Date(year, month, day);
    }
  }

  // Format: "12/25", "12/25/2024", "12-25", "12-25-2024"
  const numericMatch = input.match(/^(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{2,4}))?$/);
  if (!parsedDate && numericMatch) {
    const month = parseInt(numericMatch[1]) - 1;
    const day = parseInt(numericMatch[2]);
    let year = new Date().getFullYear();

    if (numericMatch[4]) {
      year = parseInt(numericMatch[4]);
      if (year < 100) {
        year += 2000;
      }
    }

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      parsedDate = new Date(year, month, day);
    }
  }

  // Format: "12.25.2024", "03.18.2026" (dot-separated numeric)
  const dotMatch = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!parsedDate && dotMatch) {
    const month = parseInt(dotMatch[1]) - 1;
    const day = parseInt(dotMatch[2]);
    let year = parseInt(dotMatch[3]);
    if (year < 100) {
      year += 2000;
    }

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      parsedDate = new Date(year, month, day);
    }
  }

  // Format: "18 Mar 2026", "18 March 2026" (day-first written month)
  const dayFirstMatch = input.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{2,4})$/);
  if (!parsedDate && dayFirstMatch) {
    const day = parseInt(dayFirstMatch[1]);
    const monthStr = dayFirstMatch[2];
    let year = parseInt(dayFirstMatch[3]);
    if (year < 100) {
      year += 2000;
    }

    const monthMap = {
      'jan': 0, 'january': 0,
      'feb': 1, 'february': 1,
      'mar': 2, 'march': 2,
      'apr': 3, 'april': 3,
      'may': 4,
      'jun': 5, 'june': 5,
      'jul': 6, 'july': 6,
      'aug': 7, 'august': 7,
      'sep': 8, 'sept': 8, 'september': 8,
      'oct': 9, 'october': 9,
      'nov': 10, 'november': 10,
      'dec': 11, 'december': 11
    };

    const month = monthMap[monthStr.toLowerCase()];
    if (month !== undefined && day >= 1 && day <= 31) {
      parsedDate = new Date(year, month, day);
    }
  }

  // Format: "2024-12-25" (ISO format)
  const isoMatch = input.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (!parsedDate && isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      parsedDate = new Date(year, month, day);
    }
  }

  // Try native Date parsing as last resort
  if (!parsedDate) {
    parsedDate = new Date(input);
  }

  // Validate and format
  if (parsedDate && !isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return null;
};

// utils/parseClientDate.js
function parseClientDate(input) {
  if (!input) return new Date();
  if (input instanceof Date) return input;

  if (typeof input === 'string') {
    // "YYYY-MM-DD" → lokalna północ
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, d] = input.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    // "YYYY-MM-DDTHH:mm" (z <input type="datetime-local">) → lokalny czas
    return new Date(input);
  }

  return new Date(input);
}

module.exports = { parseClientDate };

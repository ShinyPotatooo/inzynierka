const crypto = require('crypto');
const bcrypt = require('bcrypt');

const DEFAULT_TTL_MIN = parseInt(process.env.TWOFA_CODE_TTL_MINUTES || '5', 10);

/** Generuje 6-cyfrowy kod jako string (np. "482193") */
function generateNumericCode() {
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

/** Zwraca { code, hash, expiresAt } */
async function createHashedCode(ttlMinutes = DEFAULT_TTL_MIN) {
  const code = generateNumericCode();
  const saltRounds = 10;
  const hash = await bcrypt.hash(code, saltRounds);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  return { code, hash, expiresAt };
}

/** Sprawdza czy kod pasuje do hasha i czy nie wygasł */
async function verifyCode(inputCode, storedHash, expiresAt) {
  if (!storedHash || !expiresAt) return false;
  if (new Date() > new Date(expiresAt)) return false;
  return bcrypt.compare(inputCode, storedHash);
}

module.exports = {
  createHashedCode,
  verifyCode,
};
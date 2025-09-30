const bcrypt = require('bcrypt');

function generateNumericOtp(length = 6) {
  const num = Math.floor(Math.random() * Math.pow(10, length));
  return num.toString().padStart(length, '0'); // zachowuje wiodące zera
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function verifyOtp(otp, hash) {
  if (!otp || !hash) return false;
  return bcrypt.compare(otp, hash);
}

function maskEmail(email) {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const maskedName = name.length <= 2 ? name[0] + '*' : name[0] + '*'.repeat(name.length - 2) + name.slice(-1);
  return `${maskedName}@${domain}`;
}

module.exports = { generateNumericOtp, hashOtp, verifyOtp, maskEmail };

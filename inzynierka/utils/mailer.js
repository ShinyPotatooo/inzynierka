// inzynierka/utils/mailer.js
const nodemailer = require('nodemailer');

let transporter;
let ready = false;

async function makeTransporter() {
  if (ready) return transporter;

  const hasRealSMTP =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (hasRealSMTP) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true', // 465 -> true
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.verify(); // sprawdza połączenie
    ready = true;
    console.log('[mailer] Using REAL SMTP:', process.env.SMTP_HOST);
    return transporter;
  }

  // DEV fallback: Ethereal (test inbox)
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  ready = true;
  console.log('[mailer] Using Ethereal test SMTP. Inbox:', testAccount.user);
  return transporter;
}

async function sendMail(opts) {
  const t = await makeTransporter();
  const info = await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com',
    ...opts,
  });

  // Gdy Ethereal: wypisz podgląd wiadomości
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    console.log('[mailer] Preview URL:', preview);
  }
  return info;
}

module.exports = { sendMail };

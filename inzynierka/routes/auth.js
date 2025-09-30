// Plik: inzynierka/routes/auth.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const transporter = require('../utils/mailer');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { createHashedCode, verifyCode } = require('../utils/twofactor');

/**
 * POST /api/auth/login
 * Logowanie po identifier (email LUB username) + password
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Identifier (email lub nazwa) i hasło są wymagane'
      });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: identifier },
          { email: identifier.toLowerCase() }
        ]
      },
      attributes: [
        'id',
        'username',
        'email',
        'firstName',
        'lastName',
        'role',
        'password',
        'isActive',
        // ⬇️ pola wymagane do 2FA
        'twoFactorEnabled',
        'twoFactorEmail',
        'twoFactorCodeHash',
        'twoFactorExpiresAt',
        'twoFactorAttemptCount'
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, error: 'Account is deactivated' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    await user.update({ lastLoginAt: new Date() });

    // ===== KROK 2FA =====
    if (user.twoFactorEnabled) {
      const targetEmail =
        (user.twoFactorEmail && user.twoFactorEmail.trim()) ||
        (user.email && user.email.trim()) ||
        'shinypotato@o2.pl'; // fallback na Twój mail (zgodnie z prośbą)

      const { code, hash, expiresAt } = await createHashedCode(
        parseInt(process.env.TWOFA_CODE_TTL_MINUTES || '5', 10)
      );

      user.twoFactorCodeHash = hash;
      user.twoFactorExpiresAt = expiresAt;
      user.twoFactorAttemptCount = 0;
      await user.save();

      await transporter.sendMail({
        to: targetEmail,
        subject: 'Twój kod 2FA do logowania',
        text: `Kod weryfikacyjny: ${code}\nKod wygaśnie o ${expiresAt.toLocaleString()}.`,
        html: `<p>Kod weryfikacyjny: <b>${code}</b></p><p>Ważny do: <b>${expiresAt.toLocaleString()}</b></p>`,
      });

      return res.json({
        success: true,
        data: {
          pending2FA: true,
          userId: user.id,
          message: 'Na maila wysłano kod 2FA.'
        }
      });
    }
    // ===== KONIEC 2FA =====

    const { password: _pw, ...userData } = user.toJSON();

    // 🔑  JWT (brak 2FA)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.json({
      success: true,
      data: {
        user: userData,
        token
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role = 'worker' } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const existing = await User.findOne({
      where: { [Op.or]: [{ username }, { email }] }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashed,
      firstName,
      lastName,
      role,
      isActive: true
    });

    const { password: _pw, ...userData } = user.toJSON();
    return res.status(201).json({
      success: true,
      data: { user: userData, message: 'User registered successfully' }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user data
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // User jest już dołączony do req przez authenticateToken
    const user = req.user;

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token for authenticated user
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Generate new token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.json({
      success: true,
      data: {
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/verify-2fa
 * Body: { userId, code }
 * Zwraca JWT po poprawnym kodzie 2FA
 */
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ success: false, error: 'Brak userId lub code' });
    }

    const user = await User.findByPk(userId, {
      attributes: [
        'id','username','email','firstName','lastName','role','isActive',
        'twoFactorEnabled','twoFactorCodeHash','twoFactorExpiresAt','twoFactorAttemptCount'
      ]
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Nieprawidłowy użytkownik' });
    }
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ success: false, error: '2FA wyłączone dla użytkownika' });
    }

    const maxAttempts = parseInt(process.env.TWOFA_MAX_ATTEMPTS || '5', 10);
    if (user.twoFactorAttemptCount >= maxAttempts) {
      return res.status(429).json({ success: false, error: 'Przekroczono liczbę prób' });
    }

    const ok = await verifyCode(code, user.twoFactorCodeHash, user.twoFactorExpiresAt);
    user.twoFactorAttemptCount += 1;

    if (!ok) {
      await user.save();
      return res.status(401).json({ success: false, error: 'Nieprawidłowy lub wygasły kod' });
    }

    // Sukces – wyczyść stan 2FA
    user.twoFactorCodeHash = null;
    user.twoFactorExpiresAt = null;
    user.twoFactorAttemptCount = 0;
    await user.save();

    const token = jwt.sign(
      { id: user.id, role: user.role }, // spójny payload z /login
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const { password: _pw, ...userData } = user.toJSON();
    return res.json({
      success: true,
      data: {
        user: userData,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });
  } catch (err) {
    console.error('verify-2fa error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/resend-2fa
 * Body: { userId }
 * Wysyła nowy kod 2FA (np. gdy użytkownik nie otrzymał poprzedniego)
 */
router.post('/resend-2fa', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Brak userId' });
    }

    const user = await User.findByPk(userId, {
      attributes: [
        'id','username','email','role','isActive',
        'twoFactorEnabled','twoFactorEmail'
      ]
    });
    if (!user || !user.isActive || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, error: 'Nieprawidłowy stan użytkownika' });
    }

    const targetEmail =
      (user.twoFactorEmail && user.twoFactorEmail.trim()) ||
      (user.email && user.email.trim()) ||
      'shinypotato@o2.pl'; // fallback na Twój mail

    const { code, hash, expiresAt } = await createHashedCode(
      parseInt(process.env.TWOFA_CODE_TTL_MINUTES || '5', 10)
    );

    user.twoFactorCodeHash = hash;
    user.twoFactorExpiresAt = expiresAt;
    user.twoFactorAttemptCount = 0;
    await user.save();

    await transporter.sendMail({
      to: targetEmail,
      subject: 'Twój nowy kod 2FA',
      text: `Kod: ${code}\nWażny do: ${expiresAt.toLocaleString()}`,
      html: `<p>Kod: <b>${code}</b></p><p>Ważny do: <b>${expiresAt.toLocaleString()}</b></p>`,
    });

    return res.json({ success: true, data: { message: 'Wysłano nowy kod 2FA.' } });
  } catch (err) {
    console.error('resend-2fa error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const crypto = require('crypto');
const transporter = require('../utils/mailer');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');



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
        'isActive'
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

        const { password: _pw, ...userData } = user.toJSON();

    // 🔑  JWT
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
    // User is already attached to req by authenticateToken middleware
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

module.exports = router;

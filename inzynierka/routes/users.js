const express = require('express');
const router = express.Router();
const { User, ActivityLog } = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

/**
 * GET /api/users/options
 * Lekkie podpowiedzi do wyszukiwania użytkowników (imię/nazwisko/login/email)
 * Zwraca: { success: true, data: { options: [{ id, label }] } }
 */
router.get('/options', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);

    // Nie obciążaj bazy przy zbyt krótkim zapytaniu
    if (query.length < 2) {
      return res.json({ success: true, data: { options: [] } });
    }

    const where = {
      [Op.or]: [
        { username: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } },
        { firstName: { [Op.iLike]: `%${query}%` } },
        { lastName: { [Op.iLike]: `%${query}%` } },
      ],
    };

    const users = await User.findAll({
      where,
      attributes: ['id', 'username', 'email', 'firstName', 'lastName'],
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
      limit,
    });

    const options = users.map(u => {
      const fn = u.firstName || '';
      const ln = u.lastName || '';
      const base = `${(fn + ' ' + ln).trim() || u.username}`;
      return { id: u.id, label: `${base} (${u.username})` };
    });

    return res.json({ success: true, data: { options } });
  } catch (err) {
    console.error('Users options error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const where = {};
    if (role) where.role = role;

    const result = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(result.count / Number(limit)),
          totalItems: result.count,
          itemsPerPage: Number(limit)
        }
      }
    });
  } catch (err) {
    console.error('Get users error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: ActivityLog, as: 'activityLogs', limit: 10, order: [['createdAt', 'DESC']] }]
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, data: { user } });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role = 'worker' } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const existing = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed, firstName, lastName, role });

    const { password: _pw, ...userData } = user.toJSON();
    return res.status(201).json({ success: true, data: { user: userData, message: 'User created successfully' } });
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/users/:id  (z pełną logiką zmiany hasła jak u Ciebie)
router.put('/:id', async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const {
      username, email, firstName, lastName, role, password,
      requesterId, currentPassword, currentAdminPassword
    } = req.body;

    const user = await User.findByPk(targetId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (username || email) {
      const existing = await User.findOne({
        where: {
          [Op.and]: [
            { [Op.or]: [username ? { username } : null, email ? { email } : null].filter(Boolean) },
            { id: { [Op.ne]: targetId } }
          ]
        }
      });
      if (existing) return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    const update = {};
    if (username) update.username = username;
    if (email) update.email = email;
    if (firstName) update.firstName = firstName;
    if (lastName) update.lastName = lastName;
    if (role) update.role = role;

    if (typeof password === 'string') {
      if (password.trim().length < 8) {
        return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
      }
      if (!requesterId) {
        return res.status(400).json({ success: false, error: 'requesterId is required to change password' });
      }

      const requester = await User.findByPk(Number(requesterId));
      if (!requester) return res.status(403).json({ success: false, error: 'Requester not found' });

      const selfChange = requester.id === user.id;
      if (selfChange) {
        let authorized = false;
        if (currentPassword) {
          const ok = await bcrypt.compare(currentPassword, user.password);
          if (ok) authorized = true;
        }
        if (!authorized && requester.role === 'admin' && currentAdminPassword) {
          const okAdmin = await bcrypt.compare(currentAdminPassword, requester.password);
          if (okAdmin) authorized = true;
        }
        if (!authorized) {
          return res.status(401).json({ success: false, error: 'Invalid current password' });
        }
      } else {
        if (requester.role !== 'admin') {
          return res.status(403).json({ success: false, error: 'Only admins can change other users passwords' });
        }
        if (!currentAdminPassword) {
          return res.status(400).json({ success: false, error: 'currentAdminPassword is required to set password for another user' });
        }
        const okAdmin = await bcrypt.compare(currentAdminPassword, requester.password);
        if (!okAdmin) {
          return res.status(401).json({ success: false, error: 'Invalid admin password' });
        }
      }

      update.password = await bcrypt.hash(password, 10);
    }

    await user.update(update);
    const { password: _pw, ...userData } = user.toJSON();
    return res.json({ success: true, data: { user: userData, message: 'User updated successfully' } });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { requesterId, currentAdminPassword } = req.body || {};
    const userToDelete = await User.findByPk(req.params.id);

    if (!userToDelete) return res.status(404).json({ success: false, error: 'User not found' });

    if (userToDelete.role === 'admin') {
      if (!requesterId || !currentAdminPassword) {
        return res.status(400).json({
          success: false,
          error: 'Deleting an admin requires requesterId and currentAdminPassword'
        });
      }
      const requester = await User.findByPk(requesterId);
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Only admins can delete admins' });
      }
      const ok = await bcrypt.compare(currentAdminPassword, requester.password);
      if (!ok) return res.status(401).json({ success: false, error: 'Invalid admin password' });

      const adminsCount = await User.count({ where: { role: 'admin' } });
      if (adminsCount <= 1) {
        return res.status(409).json({ success: false, error: 'Cannot delete the last admin user' });
      }
    }

    await userToDelete.destroy();
    return res.json({ success: true, data: { message: 'User deleted successfully' } });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;


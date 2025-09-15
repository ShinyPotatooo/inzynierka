const express = require('express');
const router = express.Router();
const { User, ActivityLog, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { authenticateToken, requireRole } = require('../middleware/auth');

/* ---------------- Helpers ---------------- */

const requireAdminAuth = async ({ requesterId, currentAdminPassword }) => {
  if (!requesterId || !currentAdminPassword) {
    const err = new Error('Deleting a user requires requesterId and currentAdminPassword');
    err.status = 400;
    throw err;
  }
  const requester = await User.findByPk(Number(requesterId));
  if (!requester || requester.role !== 'admin') {
    const err = new Error('Only admins can delete users');
    err.status = 403;
    throw err;
  }
  const ok = await bcrypt.compare(currentAdminPassword, requester.password);
  if (!ok) {
    const err = new Error('Invalid admin password');
    err.status = 401;
    throw err;
  }
  return requester;
};

const makeDeletedUsername = (base, id) => {
  const suffix = `__del_${id}_${Date.now()}`;
  const val = `${String(base || 'user').slice(0, 50 - suffix.length)}${suffix}`;
  return val;
};

const makeDeletedEmail = (id) => {
  const val = `deleted+${id}.${Date.now()}@example.invalid`;
  return val.length > 100 ? val.slice(0, 100) : val;
};

/* ------------ Schema capabilities (cache) ------------ */
let usersTableInfoPromise = null;        // promise z describeTable
let hasIsActiveColumn = null;            // boolean albo null (nieustalone)

async function ensureUsersTableInfo() {
  if (!usersTableInfoPromise) {
    usersTableInfoPromise = sequelize
      .getQueryInterface()
      .describeTable('users')
      .then((info) => {
        hasIsActiveColumn = Object.prototype.hasOwnProperty.call(info, 'isActive');
        return info;
      })
      .catch(() => {
        hasIsActiveColumn = false;
        return null;
      });
  }
  await usersTableInfoPromise;
  return hasIsActiveColumn;
}

/* ---------------- OPTIONS ---------------- */
/**
 * GET /api/users/options?query=...&limit=20
 */
router.get('/options', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);

    if (query.length < 2) {
      return res.json({ success: true, data: { options: [] } });
    }

    const where = {
      isActive: true,
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
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
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

/* ---------------- LIST ---------------- */
// GET /api/users
router.get('/', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const ALLOWED_ROLES = new Set(['admin', 'manager', 'worker']);

    // ── Sanityzacja parametrów
    const page = (() => {
      const v = parseInt(req.query.page ?? '1', 10);
      return Number.isFinite(v) && v > 0 ? v : 1;
    })();

    const limit = (() => {
      const v = parseInt(req.query.limit ?? '50', 10);
      if (!Number.isFinite(v)) return 50;
      return Math.min(200, Math.max(1, v));
    })();

    const includeInactive = String(req.query.includeInactive ?? 'false').toLowerCase() === 'true';
    const roleRaw = typeof req.query.role === 'string' ? req.query.role.trim() : '';

    const where = {};
    if (ALLOWED_ROLES.has(roleRaw)) where.role = roleRaw;

    // Dodaj filtr isActive tylko, jeśli kolumna istnieje w DB
    const canUseIsActive = await ensureUsersTableInfo();
    if (!includeInactive && canUseIsActive) {
      where.isActive = true;
    }

    const offset = (page - 1) * limit;

    // Osobno count i list, prosto i pewnie
    const [rows, count] = await Promise.all([
      User.findAll({
        where,
        attributes: { exclude: ['password'] },
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      }),
      User.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
        },
      },
    });
  } catch (err) {
    console.error('Get users error:', err);
    // W dev zwróć szczegóły, żeby łatwo namierzyć problem
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err?.message,
    });
  }
});

/* ---------------- GET ONE ---------------- */
// GET /api/users/:id
router.get('/:id', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
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

/* ---------------- CREATE ---------------- */
// POST /api/users
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
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

/* ---------------- UPDATE ---------------- */
// PUT /api/users/:id
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
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

/* ---------------- DELETE (soft) ---------------- */
// DELETE /api/users/:id
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const { requesterId, currentAdminPassword } = req.body || {};

    await requireAdminAuth({ requesterId, currentAdminPassword });

    const userToDelete = await User.findByPk(targetId);
    if (!userToDelete) return res.status(404).json({ success: false, error: 'User not found' });

    if (userToDelete.role === 'admin') {
      const adminsCount = await User.count({ where: { role: 'admin', isActive: true } });
      if (adminsCount <= 1) {
        return res.status(409).json({ success: false, error: 'Cannot delete the last admin user' });
      }
    }

    const nextUsername = makeDeletedUsername(userToDelete.username, userToDelete.id);
    const nextEmail = makeDeletedEmail(userToDelete.id);

    await userToDelete.update({
      isActive: false,
      username: nextUsername,
      email: nextEmail,
    });

    return res.json({ success: true, data: { message: 'User deleted (deactivated) successfully' } });
  } catch (err) {
    console.error('Delete user error:', err);
    const status = err.status || 500;
    return res.status(status).json({ success: false, error: err.message || 'Internal server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { User, ActivityLog } = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

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

// PUT /api/users/:id
// - aktualizacja danych
// - USTAWIANIE HASŁA: zabezpieczenia
//   * jeśli zmieniasz SOBIE hasło: wymagane currentPassword (stare hasło) LUB (jeśli jesteś adminem) currentAdminPassword
//   * jeśli zmieniasz CUDZE hasło: musisz być adminem + currentAdminPassword
router.put('/:id', async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const {
      username, email, firstName, lastName, role, password,
      requesterId,          // id użytkownika wykonującego żądanie (do czasu JWT)
      currentPassword,      // stare hasło przy zmianie "samemu sobie"
      currentAdminPassword  // hasło admina przy zmianie komuś lub sobie (alternatywnie)
    } = req.body;

    const user = await User.findByPk(targetId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Walidacja unikalności username/email dla aktualizacji profilu
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

    // Przygotuj update
    const update = {};
    if (username) update.username = username;
    if (email) update.email = email;
    if (firstName) update.firstName = firstName;
    if (lastName) update.lastName = lastName;
    if (role) update.role = role;

    // ======= LOGIKA ZMIANY HASŁA =======
    if (typeof password === 'string') {
      if (password.trim().length < 8) {
        return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
      }

      if (!requesterId) {
        return res.status(400).json({ success: false, error: 'requesterId is required to change password' });
      }

      const requester = await User.findByPk(Number(requesterId));
      if (!requester) {
        return res.status(403).json({ success: false, error: 'Requester not found' });
      }

      const selfChange = requester.id === user.id;

      if (selfChange) {
        // Zmiana hasła "samemu sobie":
        // akceptujemy dwa warianty:
        // 1) podane currentPassword i poprawne,
        // 2) jeśli requester to admin i poda currentAdminPassword poprawne.
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
        // Zmiana hasła komuś innemu:
        // wymagaj uprawnień admina i poprawnego hasła admina
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

      // Hash nowego hasła
      update.password = await bcrypt.hash(password, 10);
    }
    // ======= KONIEC LOGIKI HASŁA =======

    await user.update(update);
    const { password: _pw, ...userData } = user.toJSON();
    return res.json({ success: true, data: { user: userData, message: 'User updated successfully' } });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/users/:id — ochrona adminów (hasło + ostatni admin)
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


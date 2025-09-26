const express = require('express');
const router = express.Router();
const { sequelize, Notification, Product, User, NotificationState } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

/* --------------------------------- */
/* Helpers                           */
/* --------------------------------- */

const audienceSql = (alias = 'n') => `
(
  :isAdmin = TRUE
  OR ${alias}."userId" = :userId
  OR ${alias}."targetRole" IS NULL
  OR ${alias}."targetRole" = 'all'
  OR ${alias}."targetRole" = :role
)
`;

const noCache = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
};

/* --------------------------------- */
/* 🔔 Unread counter                  */
/* --------------------------------- */
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : null;
    const role = String(req.query.role || 'all');
    const isAdmin = (role === 'admin');
    noCache(res);

    const [[row]] = await sequelize.query(
      `
      SELECT COUNT(*)::int AS count
      FROM notifications n
      WHERE
        ${audienceSql('n')}
        AND NOT EXISTS (
          SELECT 1
          FROM notification_states s
          WHERE s."notificationId" = n."id"
            AND s."userId" = :userId
            AND s."isRead" = TRUE
        )
      `,
      { replacements: { userId, role, isAdmin } }
    );

    res.json({ success: true, data: { count: row.count } });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* --------------------------------- */
/* 📄 List (z filtrami, per-user read) */
/* --------------------------------- */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const role = String(req.query.role || 'all');
    const isAdmin = (role === 'admin');
    const userId = req.query.userId ? Number(req.query.userId) : null;
    const isReadParam = typeof req.query.isRead === 'string' ? req.query.isRead : null;
    const type = req.query.type || null;
    const priority = req.query.priority || null;

    noCache(res);

    const whereParts = [audienceSql('n')];
    const repl = { role, userId, isAdmin };

    if (type)     { whereParts.push(`n."type" = :type`);         repl.type = type; }
    if (priority) { whereParts.push(`n."priority" = :priority`); repl.priority = priority; }

    if (userId) {
      if (isReadParam === 'true') {
        whereParts.push(`
          EXISTS (SELECT 1 FROM notification_states s
                  WHERE s."notificationId" = n."id" AND s."userId" = :userId AND s."isRead" = TRUE)
        `);
      } else if (isReadParam === 'false') {
        whereParts.push(`
          NOT EXISTS (SELECT 1 FROM notification_states s
                      WHERE s."notificationId" = n."id" AND s."userId" = :userId AND s."isRead" = TRUE)
        `);
      }
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const [[countRow]] = await sequelize.query(
      `SELECT COUNT(*)::int AS count FROM notifications n ${whereSql};`,
      { replacements: repl }
    );
    const totalItems = countRow.count;

    const [idRows] = await sequelize.query(
      `
      SELECT n.id
      FROM notifications n
      ${whereSql}
      ORDER BY n."createdAt" DESC
      LIMIT :limit OFFSET :offset
      `,
      { replacements: { ...repl, limit, offset } }
    );
    const ids = idRows.map(r => r.id);

    let notifications = [];
    if (ids.length) {
      notifications = await Notification.findAll({
        where: { id: ids },
        include: [
          { model: Product, as: 'product', attributes: ['id', 'sku', 'name'] },
          { model: User,    as: 'user',    attributes: ['id', 'username', 'firstName', 'lastName'] },
          ...(userId ? [{
            model: NotificationState,
            as: 'states',
            where: { userId, isRead: true },
            required: false,
            attributes: ['id', 'userId', 'isRead', 'readAt'],
          }] : []),
        ],
        order: [['createdAt', 'DESC']],
      });
    }

    const rows = notifications.map((n) => {
      const j = n.toJSON();
      const isReadForUser = Array.isArray(j.states) && j.states.length > 0;
      delete j.states;
      j.isReadForUser = isReadForUser;
      return j;
    });

    res.json({
      success: true,
      data: {
        notifications: rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems,
          itemsPerPage: limit,
        },
      },
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* --------------------------------- */
/* 🧹 Mark-all read (per-user)       */
/* --------------------------------- */
router.post('/mark-all-read', async (req, res) => {
  try {
    const userId = Number(req.body.userId || req.query.userId);
    const role = String(req.body.role || req.query.role || 'all');
    const isAdmin = (role === 'admin');
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const [rows] = await sequelize.query(
      `
      SELECT n.id
      FROM notifications n
      WHERE
        ${audienceSql('n')}
        AND NOT EXISTS (
          SELECT 1 FROM notification_states s
          WHERE s."notificationId" = n."id"
            AND s."userId" = :userId
            AND s."isRead" = TRUE
        )
      `,
      { replacements: { userId, role, isAdmin } }
    );

    if (rows.length) {
      const payload = rows.map(r => ({
        notificationId: r.id,
        userId,
        isRead: true,
        readAt: new Date(),
      }));
      await NotificationState.bulkCreate(payload, { updateOnDuplicate: ['isRead', 'readAt'] });
    }

    res.json({ success: true, data: { marked: rows.length } });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* --------------------------------- */
/* ✅ Mark single read/unread         */
/* --------------------------------- */
router.patch('/:id/read', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.body.userId || req.query.userId);
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    await NotificationState.upsert({
      notificationId: id,
      userId,
      isRead: true,
      readAt: new Date(),
    });

    res.json({ success: true, data: { id, userId, isReadForUser: true } });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.patch('/:id/unread', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.body.userId || req.query.userId);
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    await NotificationState.destroy({ where: { notificationId: id, userId } });
    res.json({ success: true, data: { id, userId, isReadForUser: false } });
  } catch (err) {
    console.error('Mark unread error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* --------------------------------- */
/* 🔎 Details (with per-user state)   */
/* --------------------------------- */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const role = String(req.query.role || 'all');
    const isAdmin = (role === 'admin');
    const userId = req.query.userId ? Number(req.query.userId) : null;
    const markRead = String(req.query.markRead || '') === '1';

    noCache(res);

    const [[existsRow]] = await sequelize.query(
      `SELECT 1 FROM notifications n WHERE n.id = :id AND ${audienceSql('n')} LIMIT 1`,
      { replacements: { id, role, userId, isAdmin } }
    );
    if (!existsRow) {
      return res.status(404).json({ success: false, error: 'Powiadomienie nie istnieje lub brak dostępu' });
    }

    const notif = await Notification.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name'] },
        { model: User,    as: 'user',    attributes: ['id', 'username', 'firstName', 'lastName'] },
        ...(userId ? [{
          model: NotificationState,
          as: 'states',
          where: { userId },
          required: false,
          attributes: ['isRead', 'readAt'],
        }] : []),
      ],
    });
    if (!notif) return res.status(404).json({ success: false, error: 'Nie znaleziono' });

    const j = notif.toJSON();
    const st = Array.isArray(j.states) && j.states[0] ? j.states[0] : null;
    let isReadForUser = !!(st && st.isRead);

    if (userId && markRead && !isReadForUser) {
      await NotificationState.upsert({
        notificationId: id,
        userId,
        isRead: true,
        readAt: new Date(),
      });
      isReadForUser = true;
    }

    delete j.states;
    j.isReadForUser = isReadForUser;

    res.json({ success: true, data: { notification: j } });
  } catch (err) {
    console.error('Get notification details error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* --------------------------------- */
/* ✉️  NOWE: wiadomość admin/manager */
/* --------------------------------- */
// POST /api/notifications/admin-message
// body: { title, message, priority='medium', audience:'all'|'manager'|'worker'|'user', recipientId? }
router.post(
  '/admin-message',
  authenticateToken,
  requireRole('admin', 'manager'),
  async (req, res) => {
    try {
      const author = req.user;
      const { title, message, priority = 'medium', audience = 'all', recipientId } = req.body;

      if (!title || !message) {
        return res.status(400).json({ success: false, error: 'Tytuł i treść są wymagane' });
      }
      if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ success: false, error: 'Nieprawidłowy priority' });
      }
      if (!['all', 'manager', 'worker', 'user'].includes(audience)) {
        return res.status(400).json({ success: false, error: 'Nieprawidłowy audience' });
      }

      const type = author.role === 'admin' ? 'admin_message' : 'manager_message';

      const payload = {
        type,
        title,
        message,
        priority,
        productId: null,
        targetRole: null,
        userId: null,
        metadata: { createdBy: author.id, createdByRole: author.role },
      };

      if (audience === 'user') {
        const uid = Number(recipientId);
        if (!uid) return res.status(400).json({ success: false, error: 'recipientId jest wymagane' });
        const u = await User.findByPk(uid);
        if (!u) return res.status(400).json({ success: false, error: 'Nie znaleziono użytkownika' });
        payload.userId = uid;
      } else if (audience === 'all') {
        payload.targetRole = 'all';
      } else if (audience === 'manager') {
        payload.targetRole = 'manager';
      } else if (audience === 'worker') {
        payload.targetRole = 'worker';
      }

      const notif = await Notification.create(payload);
      return res.status(201).json({ success: true, data: { notification: notif } });
    } catch (err) {
      console.error('Create admin/manager message error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

module.exports = router;

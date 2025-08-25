// routes/notifications.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Notification, Product, User } = require('../models');

// GET /api/notifications - lista (z filtrami/paginacją)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      priority,
      isRead,
      targetRole,
      startDate,
      endDate
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause = {};

    if (type) whereClause.type = type;
    if (priority) whereClause.priority = priority;
    if (typeof isRead !== 'undefined') whereClause.isRead = String(isRead) === 'true';
    if (targetRole) whereClause.targetRole = targetRole;

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate)   whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'username', 'firstName', 'lastName'] },
      ],
    });

    res.json({
      success: true,
      data: {
        notifications: notifications.rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(notifications.count / Number(limit)),
          totalItems: notifications.count,
          itemsPerPage: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/notifications/unread/count - licznik nieprzeczytanych (no-cache)
router.get('/unread/count', async (req, res) => {
  try {
    const { targetRole } = req.query;

    // ✨ anty-cache – żadnych 304 po drodze
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });

    const whereClause = { isRead: false };
    if (targetRole) whereClause.targetRole = targetRole;

    const count = await Notification.count({ where: whereClause });
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/notifications/:id
router.get('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id, {
      include: [
        { model: Product, as: 'product' },
        { model: User, as: 'user', attributes: ['id', 'username', 'firstName', 'lastName'] },
      ],
    });
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });
    res.json({ success: true, data: { notification } });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/notifications
router.post('/', async (req, res) => {
  try {
    const {
      type, title, message,
      productId, userId,
      targetRole = 'all',
      priority = 'medium',
      scheduledAt,
      metadata
    } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ success: false, error: 'Type, title, and message are required' });
    }

    if (productId) {
      const product = await Product.findByPk(productId);
      if (!product) return res.status(400).json({ success: false, error: 'Product not found' });
    }
    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) return res.status(400).json({ success: false, error: 'User not found' });
    }

    const notification = await Notification.create({
      type, title, message, productId, userId, targetRole, priority,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      metadata: metadata ? JSON.parse(metadata) : null,
      isRead: false,
      isSent: false,
    });

    res.status(201).json({ success: true, data: { notification, message: 'Notification created successfully' } });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/notifications/:id
router.put('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });

    const updateData = { ...req.body };
    if (updateData.scheduledAt) updateData.scheduledAt = new Date(updateData.scheduledAt);
    if (updateData.metadata)    updateData.metadata    = JSON.parse(updateData.metadata);

    await notification.update(updateData);
    res.json({ success: true, data: { notification, message: 'Notification updated successfully' } });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });

    await notification.update({ isRead: true, readAt: new Date() });
    res.json({ success: true, data: { notification, message: 'Notification marked as read' } });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  try {
    const { targetRole } = req.query;
    const whereClause = { isRead: false };
    if (targetRole) whereClause.targetRole = targetRole;

    const [affected] = await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: whereClause }
    );

    res.json({ success: true, data: { message: `${affected} notifications marked as read` } });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });

    await notification.destroy();
    res.json({ success: true, data: { message: 'Notification deleted successfully' } });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;

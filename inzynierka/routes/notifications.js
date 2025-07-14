const express = require('express');
const router = express.Router();
const { Notification, Product, User } = require('../models');

// GET /api/notifications - Get all notifications
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
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (type) whereClause.type = type;
    if (priority) whereClause.priority = priority;
    if (isRead !== undefined) whereClause.isRead = isRead === 'true';
    if (targetRole) whereClause.targetRole = targetRole;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[require('sequelize').Op.lte] = new Date(endDate);
    }

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'sku', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        notifications: notifications.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(notifications.count / limit),
          totalItems: notifications.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/notifications/:id - Get notification by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: { notification }
    });

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/notifications - Create new notification
router.post('/', async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      productId,
      userId,
      targetRole = 'all',
      priority = 'medium',
      scheduledAt,
      metadata
    } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Type, title, and message are required'
      });
    }

    // Validate product if provided
    if (productId) {
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          error: 'Product not found'
        });
      }
    }

    // Validate user if provided
    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    // Create notification
    const notification = await Notification.create({
      type,
      title,
      message,
      productId,
      userId,
      targetRole,
      priority,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      metadata: metadata ? JSON.parse(metadata) : null,
      isRead: false,
      isSent: false
    });

    res.status(201).json({
      success: true,
      data: {
        notification,
        message: 'Notification created successfully'
      }
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/notifications/:id - Update notification
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Convert date fields
    if (updateData.scheduledAt) updateData.scheduledAt = new Date(updateData.scheduledAt);
    if (updateData.metadata) updateData.metadata = JSON.parse(updateData.metadata);

    await notification.update(updateData);

    res.json({
      success: true,
      data: {
        notification,
        message: 'Notification updated successfully'
      }
    });

  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.update({
      isRead: true,
      readAt: new Date()
    });

    res.json({
      success: true,
      data: {
        notification,
        message: 'Notification marked as read'
      }
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', async (req, res) => {
  try {
    const { targetRole } = req.query;
    const whereClause = { isRead: false };
    
    if (targetRole) whereClause.targetRole = targetRole;

    const result = await Notification.update(
      {
        isRead: true,
        readAt: new Date()
      },
      {
        where: whereClause
      }
    );

    res.json({
      success: true,
      data: {
        message: `${result[0]} notifications marked as read`
      }
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      data: {
        message: 'Notification deleted successfully'
      }
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/notifications/unread/count - Get unread notifications count
router.get('/unread/count', async (req, res) => {
  try {
    const { targetRole } = req.query;
    const whereClause = { isRead: false };
    
    if (targetRole) whereClause.targetRole = targetRole;

    const count = await Notification.count({ where: whereClause });

    res.json({
      success: true,
      data: {
        unreadCount: count
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 
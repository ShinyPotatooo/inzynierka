// routes/categories.js
const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const { Category } = require('../models');

// GET /api/categories/options?query=la&limit=20
router.get('/options', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);

    if (query.length < 1) {
      return res.json({ success: true, data: { options: [] } });
    }

    const where = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { nameLower: { [Op.like]: `%${query.toLowerCase()}%` } }
      ]
    };

    const list = await Category.findAll({
      where,
      order: [['name', 'ASC']],
      limit
    });

    const options = list.map(c => ({ id: c.id, label: c.name }));
    return res.json({ success: true, data: { options } });
  } catch (err) {
    console.error('Categories options error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/categories/ensure  { name }
router.post('/ensure', async (req, res) => {
  try {
    const raw = String(req.body?.name || '').trim();
    if (!raw) return res.status(400).json({ success: false, error: 'Name is required' });

    const lower = raw.toLowerCase();
    let cat = await Category.findOne({ where: { nameLower: lower } });
    if (!cat) {
      cat = await Category.create({ name: raw });
    }
    return res.json({ success: true, data: { category: { id: cat.id, name: cat.name } } });
  } catch (err) {
    console.error('Categories ensure error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/categories?page=1&limit=50&search=...
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim().toLowerCase();

    const where = search
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { nameLower: { [Op.like]: `%${search}%` } }
          ]
        }
      : {};

    const { rows, count } = await Category.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset
    });

    return res.json({
      success: true,
      data: {
        categories: rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (err) {
    console.error('Categories list error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/categories/:id { name }
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const raw = String(req.body?.name || '').trim();
    if (!raw) return res.status(400).json({ success: false, error: 'Name is required' });

    const cat = await Category.findByPk(id);
    if (!cat) return res.status(404).json({ success: false, error: 'Not found' });

    cat.name = raw; // hook ustawi nameLower
    await cat.save();

    return res.json({ success: true, data: { category: cat } });
  } catch (err) {
    console.error('Categories update error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cat = await Category.findByPk(id);
    if (!cat) return res.status(404).json({ success: false, error: 'Not found' });

    await cat.destroy();
    return res.json({ success: true, data: { message: 'Deleted' } });
  } catch (err) {
    console.error('Categories delete error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;

// routes/dictionaries.js
const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const { sequelize, Category, Location, Product, InventoryItem } = require('../models');

const likeExactCI = (col, value) =>
  sequelize.where(sequelize.fn('LOWER', sequelize.col(col)), value.toLowerCase());

const likeContainsCI = (col, value) =>
  sequelize.where(sequelize.fn('LOWER', sequelize.col(col)), { [Op.like]: `%${value.toLowerCase()}%` });

/* ------------- helpers ------------- */
async function usageCountForCategory(name) {
  const n = String(name || '');
  return Product.count({
    where: sequelize.where(sequelize.fn('LOWER', sequelize.col('category')), n.toLowerCase())
  });
}
async function usageCountForLocation(name) {
  const n = String(name || '');
  return InventoryItem.count({
    where: sequelize.where(sequelize.fn('LOWER', sequelize.col('location')), n.toLowerCase())
  });
}

/* ------------- CATEGORIES ------------- */
// GET /api/dictionaries/categories/options?query=&limit=
router.get('/categories/options', async (req, res) => {
  try {
    const q = String(req.query.query || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
    if (q.length < 1) return res.json({ success: true, data: { options: [] } });

    const rows = await Category.findAll({
      where: likeContainsCI('name', q),
      order: [['name', 'ASC']],
      limit
    });
    const options = rows.map(r => ({ id: r.id, label: r.name }));
    res.json({ success: true, data: { options } });
  } catch (e) {
    console.error('categories/options error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/dictionaries/categories/ensure { name }
router.post('/categories/ensure', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

    let row = await Category.findOne({ where: likeExactCI('name', name) });
    if (!row) row = await Category.create({ name });
    res.json({ success: true, data: { category: row } });
  } catch (e) {
    console.error('categories/ensure error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/dictionaries/categories?query=&page=&limit=
router.get('/categories', async (req, res) => {
  try {
    const q = String(req.query.query || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;

    const where = q ? likeContainsCI('name', q) : undefined;
    const { rows, count } = await Category.findAndCountAll({
      where, order: [['name', 'ASC']], limit, offset
    });

    const items = await Promise.all(rows.map(async r => ({
      id: r.id, name: r.name, description: r.description,
      usageCount: await usageCountForCategory(r.name),
      createdAt: r.createdAt, updatedAt: r.updatedAt
    })));

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (e) {
    console.error('categories list error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/dictionaries/categories { name, description? }
router.post('/categories', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

    const exists = await Category.findOne({ where: likeExactCI('name', name) });
    if (exists) return res.status(409).json({ success: false, error: 'Category already exists' });

    const row = await Category.create({ name, description });
    res.status(201).json({ success: true, data: { item: row } });
  } catch (e) {
    console.error('categories create error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/dictionaries/categories/:id { name?, description? }
router.put('/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await Category.findByPk(id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });

    const name = req.body?.name != null ? String(req.body.name).trim() : undefined;
    const description = req.body?.description != null ? String(req.body.description).trim() : undefined;

    if (name) {
      const dup = await Category.findOne({
        where: {
          [Op.and]: [likeExactCI('name', name), { id: { [Op.ne]: id } }]
        }
      });
      if (dup) return res.status(409).json({ success: false, error: 'Category already exists' });
      row.name = name;
    }
    if (description !== undefined) row.description = description || null;

    await row.save();
    res.json({ success: true, data: { item: row } });
  } catch (e) {
    console.error('categories update error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/dictionaries/categories/:id
router.delete('/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await Category.findByPk(id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });

    const used = await usageCountForCategory(row.name);
    if (used > 0) {
      return res.status(409).json({ success: false, error: 'Nie można usunąć – kategoria jest używana' });
    }
    await row.destroy();
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (e) {
    console.error('categories delete error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ------------- LOCATIONS ------------- */
// GET /api/dictionaries/locations/options?query=&limit=
router.get('/locations/options', async (req, res) => {
  try {
    const q = String(req.query.query || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
    if (q.length < 1) return res.json({ success: true, data: { options: [] } });

    const rows = await Location.findAll({
      where: likeContainsCI('name', q),
      order: [['name', 'ASC']],
      limit
    });
    const options = rows.map(r => ({ id: r.id, label: r.name }));
    res.json({ success: true, data: { options } });
  } catch (e) {
    console.error('locations/options error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/dictionaries/locations/ensure { name }
router.post('/locations/ensure', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

    let row = await Location.findOne({ where: likeExactCI('name', name) });
    if (!row) row = await Location.create({ name });
    res.json({ success: true, data: { location: row } });
  } catch (e) {
    console.error('locations/ensure error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/dictionaries/locations
router.get('/locations', async (req, res) => {
  try {
    const q = String(req.query.query || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;

    const where = q ? likeContainsCI('name', q) : undefined;
    const { rows, count } = await Location.findAndCountAll({
      where, order: [['name', 'ASC']], limit, offset
    });

    const items = await Promise.all(rows.map(async r => ({
      id: r.id, name: r.name, description: r.description,
      usageCount: await usageCountForLocation(r.name),
      createdAt: r.createdAt, updatedAt: r.updatedAt
    })));

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (e) {
    console.error('locations list error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/dictionaries/locations
router.post('/locations', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

    const exists = await Location.findOne({ where: likeExactCI('name', name) });
    if (exists) return res.status(409).json({ success: false, error: 'Location already exists' });

    const row = await Location.create({ name, description });
    res.status(201).json({ success: true, data: { item: row } });
  } catch (e) {
    console.error('locations create error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/dictionaries/locations/:id
router.put('/locations/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await Location.findByPk(id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });

    const name = req.body?.name != null ? String(req.body.name).trim() : undefined;
    const description = req.body?.description != null ? String(req.body.description).trim() : undefined;

    if (name) {
      const dup = await Location.findOne({
        where: {
          [Op.and]: [likeExactCI('name', name), { id: { [Op.ne]: id } }]
        }
      });
      if (dup) return res.status(409).json({ success: false, error: 'Location already exists' });
      row.name = name;
    }
    if (description !== undefined) row.description = description || null;

    await row.save();
    res.json({ success: true, data: { item: row } });
  } catch (e) {
    console.error('locations update error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/dictionaries/locations/:id
router.delete('/locations/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await Location.findByPk(id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });

    const used = await usageCountForLocation(row.name);
    if (used > 0) {
      return res.status(409).json({ success: false, error: 'Nie można usunąć – lokalizacja jest używana' });
    }
    await row.destroy();
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (e) {
    console.error('locations delete error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;

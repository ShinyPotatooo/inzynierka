// routes/locations.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Location } = require('../models');

// GET /api/locations/options?query=A1&limit=20
router.get('/options', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);

    if (!query) {
      return res.json({ success: true, data: { options: [] } });
    }

    const where = {
      [Op.or]: [
        { code: { [Op.iLike]: `%${query}%` } },
        { label: { [Op.iLike]: `%${query}%` } }
      ]
    };

    const list = await Location.findAll({ where, order: [['code', 'ASC']], limit });
    const options = list.map(l => ({ id: l.id, label: l.label ? `${l.code} — ${l.label}` : l.code }));
    return res.json({ success: true, data: { options } });
  } catch (err) {
    console.error('Locations options error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/locations/ensure  { code, label? }
router.post('/ensure', async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim();
    const label = req.body?.label != null ? String(req.body.label).trim() : null;
    if (!code) return res.status(400).json({ success: false, error: 'Code is required' });

    let loc = await Location.findOne({ where: { code } });
    if (!loc) loc = await Location.create({ code, label });

    return res.json({ success: true, data: { location: loc } });
  } catch (err) {
    console.error('Locations ensure error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Prosta lista/paging
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const offset = (page - 1) * limit;

    const { rows, count } = await Location.findAndCountAll({
      order: [['code', 'ASC']],
      limit,
      offset
    });

    return res.json({
      success: true,
      data: {
        locations: rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (err) {
    console.error('Locations list error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const loc = await Location.findByPk(id);
    if (!loc) return res.status(404).json({ success: false, error: 'Not found' });

    if (req.body.code) loc.code = String(req.body.code).trim();
    if (req.body.label !== undefined) loc.label = req.body.label ? String(req.body.label).trim() : null;

    await loc.save();
    return res.json({ success: true, data: { location: loc } });
  } catch (err) {
    console.error('Locations update error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const loc = await Location.findByPk(id);
    if (!loc) return res.status(404).json({ success: false, error: 'Not found' });

    await loc.destroy();
    return res.json({ success: true, data: { message: 'Deleted' } });
  } catch (err) {
    console.error('Locations delete error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;

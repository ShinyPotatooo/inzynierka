const express = require('express');
const router = express.Router();
const { Product, InventoryItem, ActivityLog } = require('../models');
const { Op } = require('sequelize');

/* ===== Helpers ===== */
const isEmpty = (v) => v === '' || v === undefined || v === null;
const toNumOrNull = (v) => (isEmpty(v) ? null : Number(v));
const toIntOrNull = (v) => (isEmpty(v) ? null : parseInt(v, 10));
const parseJsonOrError = (v) => {
  if (isEmpty(v)) return null;
  if (typeof v === 'object') return v;
  if (typeof v === 'string') {
    try { return JSON.parse(v); }
    catch {
      const err = new Error('Invalid JSON in "dimensions"');
      err.status = 400;
      throw err;
    }
  }
  return null;
};

const sanitize = (b = {}) => ({
  sku: isEmpty(b.sku) ? null : String(b.sku).trim(),
  name: isEmpty(b.name) ? null : String(b.name).trim(),
  description: isEmpty(b.description) ? null : b.description,
  category: isEmpty(b.category) ? null : b.category,
  brand: isEmpty(b.brand) ? null : b.brand,
  unit: isEmpty(b.unit) ? null : b.unit,
  status: isEmpty(b.status) ? 'active' : b.status,

  price: toNumOrNull(b.price),
  cost: toNumOrNull(b.cost),

  // te pola w modelu mają defaultValue: 0 (pozwólmy DB ustawić, jeśli nie podano)
  minStockLevel: isEmpty(b.minStockLevel) ? undefined : toIntOrNull(b.minStockLevel),
  reorderPoint: isEmpty(b.reorderPoint) ? undefined : toIntOrNull(b.reorderPoint),

  // może być null w modelu
  maxStockLevel: toIntOrNull(b.maxStockLevel),
  weight: toNumOrNull(b.weight),

  dimensions: parseJsonOrError(b.dimensions),

  barcode: isEmpty(b.barcode) ? null : b.barcode,
  imageUrl: isEmpty(b.imageUrl) ? null : b.imageUrl,
});

const sendSeqError = (res, err) => {
  if (err?.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ success: false, error: 'SKU must be unique' });
  }
  if (err?.name === 'SequelizeValidationError') {
    const msg = err.errors?.map(e => e.message).join(', ') || 'Validation error';
    return res.status(422).json({ success: false, error: msg });
  }
  const status = err.status || 500;
  return res.status(status).json({ success: false, error: err.message || 'Internal server error' });
};

/* ===== OPTIONS (autocomplete) ===== */
router.get('/options', async (req, res) => {
  try {
    const { query = '', limit = 20 } = req.query;
    const where = {};
    if (query) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${query}%` } },
        { sku: { [Op.iLike]: `%${query}%` } },
      ];
    }
    const rows = await Product.findAll({
      where,
      attributes: ['id', 'name', 'sku'],
      limit: Number(limit) || 20,
      order: [['name', 'ASC']],
    });
    res.json({
      success: true,
      data: { options: rows.map(p => ({ id: p.id, label: `${p.name} (${p.sku})` })) },
    });
  } catch (err) {
    console.error('Product options error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ===== LIST ===== */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 10, category, brand, status, search, minPrice, maxPrice,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const where = {};
    if (category) where.category = category;
    if (brand) where.brand = brand;
    if (status) where.status = status;

    if (!isEmpty(minPrice)) where.price = { [Op.gte]: parseFloat(minPrice) };
    if (!isEmpty(maxPrice)) {
      where.price = where.price || {};
      where.price[Op.lte] = parseFloat(maxPrice);
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const result = await Product.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [{ model: InventoryItem, as: 'inventoryItems', attributes: ['quantity', 'reservedQuantity'] }],
    });

    const rows = result.rows.map(p => {
      const json = p.toJSON();
      const totalStock = (json.inventoryItems || []).reduce((s, it) => s + (it.quantity || 0), 0);
      const totalReserved = (json.inventoryItems || []).reduce((s, it) => s + (it.reservedQuantity || 0), 0);
      return {
        ...json,
        totalStock,
        totalReserved,
        totalAvailable: totalStock - totalReserved,
        inventoryItems: undefined,
      };
    });

    res.json({
      success: true,
      data: {
        products: rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(result.count / Number(limit)),
          totalItems: result.count,
          itemsPerPage: Number(limit),
        },
      },
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ===== GET ONE ===== */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: InventoryItem, as: 'inventoryItems' },
        { model: ActivityLog, as: 'activityLogs', limit: 10, order: [['createdAt', 'DESC']] },
      ],
    });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: { product } });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ===== CREATE ===== */
router.post('/', async (req, res) => {
  try {
    const payload = sanitize(req.body);

    // wymagane zgodnie z modelem (allowNull: false)
    if (!payload.sku || !payload.name || !payload.category || !payload.unit || payload.price == null) {
      return res.status(400).json({
        success: false,
        error: 'Fields required: sku, name, category, unit, price',
      });
    }

    const exists = await Product.findOne({ where: { sku: payload.sku } });
    if (exists) return res.status(409).json({ success: false, error: 'SKU already exists' });

    const product = await Product.create(payload);
    res.status(201).json({ success: true, data: { product, message: 'Product created successfully' } });
  } catch (err) {
    console.error('Create product error:', err);
    return sendSeqError(res, err);
  }
});

/* ===== UPDATE ===== */
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const update = sanitize(req.body);

    if (update.sku && update.sku !== product.sku) {
      const dup = await Product.findOne({ where: { sku: update.sku, id: { [Op.ne]: req.params.id } } });
      if (dup) return res.status(409).json({ success: false, error: 'SKU already exists' });
    }

    await product.update(update);
    res.json({ success: true, data: { product, message: 'Product updated successfully' } });
  } catch (err) {
    console.error('Update product error:', err);
    return sendSeqError(res, err);
  }
});

/* ===== DELETE ===== */
router.delete('/:id', async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id);
    if (!p) return res.status(404).json({ success: false, error: 'Product not found' });

    const count = await InventoryItem.count({ where: { productId: req.params.id } });
    if (count > 0) {
      return res.status(409).json({ success: false, error: 'Cannot delete product with existing inventory' });
    }

    await p.destroy();
    res.json({ success: true, data: { message: 'Product deleted successfully' } });
  } catch (err) {
    console.error('Delete product error:', err);
    return sendSeqError(res, err);
  }
});

/* ===== INVENTORY OF PRODUCT ===== */
router.get('/:id/inventory', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: InventoryItem, as: 'inventoryItems' }],
    });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: { product } });
  } catch (err) {
    console.error('Get product inventory error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;

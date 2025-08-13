const express = require('express');
const router = express.Router();
const { Product, InventoryItem, ActivityLog } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/products/options?query=...&limit=20
 * Lekki endpoint do autouzupełniania
 */
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

    const options = rows.map((p) => ({
      id: p.id,
      label: `${p.name} (${p.sku})`,
    }));

    res.json({ success: true, data: { options } });
  } catch (err) {
    console.error('Product options error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/products
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      brand,
      status,
      search,
      minPrice,
      maxPrice,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause = {};

    if (category) whereClause.category = category;
    if (brand) whereClause.brand = brand;
    if (status) whereClause.status = status;

    if (minPrice != null) whereClause.price = { [Op.gte]: parseFloat(minPrice) };
    if (maxPrice != null) {
      whereClause.price = whereClause.price || {};
      whereClause.price[Op.lte] = parseFloat(maxPrice);
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const products = await Product.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: InventoryItem,
          as: 'inventoryItems',
          attributes: ['quantity', 'reservedQuantity'],
        },
      ],
    });

    const enriched = products.rows.map((p) => {
      const json = p.toJSON();
      const totalStock = (json.inventoryItems || []).reduce(
        (s, it) => s + (it.quantity || 0),
        0
      );
      const totalReserved = (json.inventoryItems || []).reduce(
        (s, it) => s + (it.reservedQuantity || 0),
        0
      );
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
        products: enriched,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(products.count / Number(limit)),
          totalItems: products.count,
          itemsPerPage: Number(limit),
        },
      },
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/products/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: InventoryItem, as: 'inventoryItems', order: [['createdAt', 'DESC']] },
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

/**
 * POST /api/products
 */
router.post('/', async (req, res) => {
  try {
    const {
      sku, name, description, category, brand, unit, price, cost,
      minStockLevel, maxStockLevel, reorderPoint, status = 'active',
      weight, dimensions, barcode, imageUrl,
    } = req.body;

    if (!sku || !name || !category || !brand || !unit || price == null) {
      return res.status(400).json({
        success: false,
        error: 'SKU, name, category, brand, unit, and price are required',
      });
    }

    const exists = await Product.findOne({ where: { sku } });
    if (exists) return res.status(400).json({ success: false, error: 'SKU already exists' });

    const product = await Product.create({
      sku,
      name,
      description,
      category,
      brand,
      unit,
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : 0,
      minStockLevel: minStockLevel ? parseInt(minStockLevel) : 0,
      maxStockLevel: maxStockLevel ? parseInt(maxStockLevel) : null,
      reorderPoint: reorderPoint ? parseInt(reorderPoint) : 0,
      status,
      weight: weight ? parseFloat(weight) : null,
      dimensions:
        typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions || null,
      barcode,
      imageUrl,
    });

    res.status(201).json({ success: true, data: { product, message: 'Product created successfully' } });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/products/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const update = { ...req.body };
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    if (update.sku) {
      const duplicate = await Product.findOne({
        where: { sku: update.sku, id: { [Op.ne]: req.params.id } },
      });
      if (duplicate) return res.status(400).json({ success: false, error: 'SKU already exists' });
    }

    if (update.price != null) update.price = parseFloat(update.price);
    if (update.cost != null) update.cost = parseFloat(update.cost);
    if (update.minStockLevel != null) update.minStockLevel = parseInt(update.minStockLevel);
    if (update.maxStockLevel != null) update.maxStockLevel = parseInt(update.maxStockLevel);
    if (update.reorderPoint != null) update.reorderPoint = parseInt(update.reorderPoint);
    if (update.weight != null) update.weight = parseFloat(update.weight);
    if (update.dimensions && typeof update.dimensions === 'string') {
      update.dimensions = JSON.parse(update.dimensions);
    }

    await product.update(update);
    res.json({ success: true, data: { product, message: 'Product updated successfully' } });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id);
    if (!p) return res.status(404).json({ success: false, error: 'Product not found' });

    const count = await InventoryItem.count({ where: { productId: req.params.id } });
    if (count > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete product with existing inventory' });
    }

    await p.destroy();
    res.json({ success: true, data: { message: 'Product deleted successfully' } });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/products/:id/inventory
 */
router.get('/:id/inventory', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: InventoryItem, as: 'inventoryItems', order: [['createdAt', 'DESC']] }],
    });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    res.json({ success: true, data: { product } });
  } catch (err) {
    console.error('Get product inventory error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;




const express = require('express');
const router = express.Router();
const { Product, InventoryItem, ActivityLog } = require('../models');
const { Op, literal } = require('sequelize');

// GET /api/products/options?query=...&limit=20
// Lekki endpoint do autouzupełniania (id, name, sku)
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
      limit: Number(limit),
      order: [['name', 'ASC']]
    });

    const options = rows.map(p => ({
      id: p.id,
      label: `${p.name} (${p.sku})`
    }));

    res.json({ success: true, data: { options } });
  } catch (error) {
    console.error('Product options error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/products - Get all products (z filtrem iLike po name/sku/desc)
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

    if (minPrice) {
      whereClause.price = { [Op.gte]: parseFloat(minPrice) };
    }
    if (maxPrice) {
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
          attributes: ['quantity', 'reservedQuantity', 'availableQuantity'],
        },
      ],
    });

    // Agregaty per produkt (totalStock/Reserved/Available)
    const productsWithStock = products.rows.map((product) => {
      const p = product.toJSON();
      const totalStock = (p.inventoryItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalReserved = (p.inventoryItems || []).reduce((sum, item) => sum + (item.reservedQuantity || 0), 0);
      const totalAvailable = (p.inventoryItems || []).reduce((sum, item) => sum + (item.availableQuantity || 0), 0);
      return {
        ...p,
        totalStock,
        totalReserved,
        totalAvailable,
        inventoryItems: undefined
      };
    });

    res.json({
      success: true,
      data: {
        products: productsWithStock,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(products.count / Number(limit)),
          totalItems: products.count,
          itemsPerPage: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        {
          model: InventoryItem,
          as: 'inventoryItems',
          order: [['createdAt', 'DESC']],
        },
        {
          model: ActivityLog,
          as: 'activityLogs',
          limit: 10,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: { product } });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/products - Create new product
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

    const existingProduct = await Product.findOne({ where: { sku } });
    if (existingProduct) {
      return res.status(400).json({ success: false, error: 'SKU already exists' });
    }

    const product = await Product.create({
      sku,
      name,
      description,
      category,
      brand,
      unit,
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : 0.0,
      minStockLevel: minStockLevel ? parseInt(minStockLevel) : 0,
      maxStockLevel: maxStockLevel ? parseInt(maxStockLevel) : null,
      reorderPoint: reorderPoint ? parseInt(reorderPoint) : 0,
      status,
      weight: weight ? parseFloat(weight) : null,
      dimensions: typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions || null,
      barcode,
      imageUrl,
    });

    res.status(201).json({
      success: true,
      data: { product, message: 'Product created successfully' },
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    if (updateData.sku) {
      const exists = await Product.findOne({ where: { sku: updateData.sku, id: { [Op.ne]: id } } });
      if (exists) return res.status(400).json({ success: false, error: 'SKU already exists' });
    }

    if (updateData.price != null) updateData.price = parseFloat(updateData.price);
    if (updateData.cost != null) updateData.cost = parseFloat(updateData.cost);
    if (updateData.minStockLevel != null) updateData.minStockLevel = parseInt(updateData.minStockLevel);
    if (updateData.maxStockLevel != null) updateData.maxStockLevel = parseInt(updateData.maxStockLevel);
    if (updateData.reorderPoint != null) updateData.reorderPoint = parseInt(updateData.reorderPoint);
    if (updateData.weight != null) updateData.weight = parseFloat(updateData.weight);
    if (updateData.dimensions && typeof updateData.dimensions === 'string') {
      updateData.dimensions = JSON.parse(updateData.dimensions);
    }

    await product.update(updateData);

    res.json({ success: true, data: { product, message: 'Product updated successfully' } });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const inventoryCount = await InventoryItem.count({ where: { productId: id } });
    if (inventoryCount > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete product with existing inventory' });
    }

    await product.destroy();

    res.json({ success: true, data: { message: 'Product deleted successfully' } });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/products/:id/inventory - Get product inventory details
router.get('/:id/inventory', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [{ model: InventoryItem, as: 'inventoryItems', order: [['createdAt', 'DESC']] }],
    });

    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    res.json({ success: true, data: { product } });
  } catch (error) {
    console.error('Get product inventory error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;


const express = require('express');
const router = express.Router();
const { Product, InventoryItem, ActivityLog } = require('../models');

// GET /api/products - Get all products
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
      maxPrice
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (category) whereClause.category = category;
    if (brand) whereClause.brand = brand;
    if (status) whereClause.status = status;
    if (minPrice) whereClause.price = { [require('sequelize').Op.gte]: parseFloat(minPrice) };
    if (maxPrice) {
      whereClause.price = whereClause.price || {};
      whereClause.price[require('sequelize').Op.lte] = parseFloat(maxPrice);
    }
    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { name: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { sku: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { description: { [require('sequelize').Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: InventoryItem,
          as: 'inventoryItems',
          attributes: ['quantity', 'reservedQuantity', 'availableQuantity']
        }
      ]
    });

    // Calculate total stock for each product
    const productsWithStock = products.rows.map(product => {
      const productData = product.toJSON();
      const totalStock = productData.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalReserved = productData.inventoryItems.reduce((sum, item) => sum + item.reservedQuantity, 0);
      const totalAvailable = productData.inventoryItems.reduce((sum, item) => sum + item.availableQuantity, 0);
      
      return {
        ...productData,
        totalStock,
        totalReserved,
        totalAvailable,
        inventoryItems: undefined // Remove detailed inventory items from response
      };
    });

    res.json({
      success: true,
      data: {
        products: productsWithStock,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(products.count / limit),
          totalItems: products.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
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
          order: [['createdAt', 'DESC']]
        },
        {
          model: ActivityLog,
          as: 'activityLogs',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/products - Create new product
router.post('/', async (req, res) => {
  try {
    const {
      sku,
      name,
      description,
      category,
      brand,
      unit,
      price,
      cost,
      minStockLevel,
      maxStockLevel,
      reorderPoint,
      status = 'active',
      weight,
      dimensions,
      barcode,
      imageUrl
    } = req.body;

    if (!sku || !name || !category || !brand || !unit || !price) {
      return res.status(400).json({
        success: false,
        error: 'SKU, name, category, brand, unit, and price are required'
      });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ where: { sku } });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        error: 'SKU already exists'
      });
    }

    // Create product
    const product = await Product.create({
      sku,
      name,
      description,
      category,
      brand,
      unit,
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : null,
      minStockLevel: minStockLevel ? parseInt(minStockLevel) : null,
      maxStockLevel: maxStockLevel ? parseInt(maxStockLevel) : null,
      reorderPoint: reorderPoint ? parseInt(reorderPoint) : null,
      status,
      weight: weight ? parseFloat(weight) : null,
      dimensions: dimensions ? JSON.parse(dimensions) : null,
      barcode,
      imageUrl
    });

    res.status(201).json({
      success: true,
      data: {
        product,
        message: 'Product created successfully'
      }
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check if SKU already exists (excluding current product)
    if (updateData.sku) {
      const existingProduct = await Product.findOne({
        where: {
          sku: updateData.sku,
          id: { [require('sequelize').Op.ne]: id }
        }
      });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          error: 'SKU already exists'
        });
      }
    }

    // Convert numeric fields
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.cost) updateData.cost = parseFloat(updateData.cost);
    if (updateData.minStockLevel) updateData.minStockLevel = parseInt(updateData.minStockLevel);
    if (updateData.maxStockLevel) updateData.maxStockLevel = parseInt(updateData.maxStockLevel);
    if (updateData.reorderPoint) updateData.reorderPoint = parseInt(updateData.reorderPoint);
    if (updateData.weight) updateData.weight = parseFloat(updateData.weight);
    if (updateData.dimensions) updateData.dimensions = JSON.parse(updateData.dimensions);

    await product.update(updateData);

    res.json({
      success: true,
      data: {
        product,
        message: 'Product updated successfully'
      }
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check if product has inventory
    const inventoryCount = await InventoryItem.count({ where: { productId: id } });
    if (inventoryCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete product with existing inventory'
      });
    }

    await product.destroy();

    res.json({
      success: true,
      data: {
        message: 'Product deleted successfully'
      }
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/products/:id/inventory - Get product inventory details
router.get('/:id/inventory', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        {
          model: InventoryItem,
          as: 'inventoryItems',
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error('Get product inventory error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 
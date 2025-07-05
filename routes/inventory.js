const express = require('express');
const router = express.Router();
const { InventoryItem, InventoryOperation, Product, User, ActivityLog } = require('../models');

// GET /api/inventory - Get all inventory items
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      productId,
      location,
      condition,
      supplier,
      lowStock = false
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (productId) whereClause.productId = productId;
    if (location) whereClause.location = { [require('sequelize').Op.iLike]: `%${location}%` };
    if (condition) whereClause.condition = condition;
    if (supplier) whereClause.supplier = { [require('sequelize').Op.iLike]: `%${supplier}%` };
    if (lowStock === 'true') {
      whereClause.quantity = { [require('sequelize').Op.lte]: require('sequelize').col('Product.minStockLevel') };
    }

    const inventoryItems = await InventoryItem.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'sku', 'name', 'category', 'brand', 'minStockLevel', 'reorderPoint']
        },
        {
          model: User,
          as: 'lastUpdatedByUser',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        inventoryItems: inventoryItems.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(inventoryItems.count / limit),
          totalItems: inventoryItems.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/inventory/summary - Get inventory summary (MUST BE BEFORE /:id ROUTE)
router.get('/summary', async (req, res) => {
  try {
    const totalItems = await InventoryItem.count();
    const totalProducts = await Product.count();
    const lowStockItems = await InventoryItem.count({
      include: [
        {
          model: Product,
          as: 'product',
          where: {
            minStockLevel: { [require('sequelize').Op.not]: null }
          }
        }
      ],
      where: {
        quantity: { [require('sequelize').Op.lte]: require('sequelize').literal('"product"."minStockLevel"') }
      }
    });

    const totalValue = await InventoryItem.findAll({
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['cost']
        }
      ]
    });

    const totalCost = totalValue.reduce((sum, item) => {
      return sum + (item.quantity * (item.product.cost || 0));
    }, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalItems,
          totalProducts,
          lowStockItems,
          totalCost: parseFloat(totalCost.toFixed(2))
        }
      }
    });

  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/inventory/operations - Get all inventory operations (MUST BE BEFORE /:id ROUTE)
router.get('/operations', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      productId,
      operationType,
      performedBy,
      startDate,
      endDate
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (productId) whereClause.productId = productId;
    if (operationType) whereClause.operationType = operationType;
    if (performedBy) whereClause.performedBy = performedBy;
    if (startDate || endDate) {
      whereClause.operationDate = {};
      if (startDate) whereClause.operationDate[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) whereClause.operationDate[require('sequelize').Op.lte] = new Date(endDate);
    }

    const operations = await InventoryOperation.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['operationDate', 'DESC']],
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
        },
        {
          model: InventoryItem,
          as: 'inventoryItem',
          attributes: ['id', 'location', 'batchNumber']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        operations: operations.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(operations.count / limit),
          totalItems: operations.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get operations error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/inventory/:id - Get inventory item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const inventoryItem = await InventoryItem.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product'
        },
        {
          model: User,
          as: 'lastUpdatedByUser',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: InventoryOperation,
          as: 'inventoryOperations',
          limit: 10,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'firstName', 'lastName']
            }
          ]
        }
      ]
    });

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: { inventoryItem }
    });

  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/inventory - Create new inventory item
router.post('/', async (req, res) => {
  try {
    const {
      productId,
      location,
      quantity,
      reservedQuantity = 0,
      batchNumber,
      expiryDate,
      manufacturingDate,
      supplier,
      purchaseOrderNumber,
      condition = 'new',
      notes,
      lastUpdatedBy = 1 // TODO: Get from JWT when implemented
    } = req.body;

    if (!productId || !location || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Product ID, location, and quantity are required'
      });
    }

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(400).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Create inventory item
    const inventoryItem = await InventoryItem.create({
      productId,
      location,
      quantity: parseInt(quantity),
      reservedQuantity: parseInt(reservedQuantity),
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      supplier,
      purchaseOrderNumber,
      condition,
      notes,
      lastUpdatedBy
    });

    // Create initial operation record
    await InventoryOperation.create({
      inventoryItemId: inventoryItem.id,
      productId,
      operationType: 'in',
      quantity: parseInt(quantity),
      performedBy: lastUpdatedBy,
      operationDate: new Date(),
      notes: 'Initial stock entry'
    });

    res.status(201).json({
      success: true,
      data: {
        inventoryItem,
        message: 'Inventory item created successfully'
      }
    });

  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const inventoryItem = await InventoryItem.findByPk(id);
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Convert numeric fields
    if (updateData.quantity) updateData.quantity = parseInt(updateData.quantity);
    if (updateData.reservedQuantity) updateData.reservedQuantity = parseInt(updateData.reservedQuantity);
    if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);
    if (updateData.manufacturingDate) updateData.manufacturingDate = new Date(updateData.manufacturingDate);

    await inventoryItem.update(updateData);

    res.json({
      success: true,
      data: {
        inventoryItem,
        message: 'Inventory item updated successfully'
      }
    });

  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const inventoryItem = await InventoryItem.findByPk(id);
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Check if item has quantity
    if (inventoryItem.quantity > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete inventory item with stock'
      });
    }

    await inventoryItem.destroy();

    res.json({
      success: true,
      data: {
        message: 'Inventory item deleted successfully'
      }
    });

  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/inventory/operations - Create new inventory operation
router.post('/operations', async (req, res) => {
  try {
    const {
      inventoryItemId,
      productId,
      operationType,
      quantity,
      performedBy = 1, // TODO: Get from JWT when implemented
      operationDate = new Date(),
      notes
    } = req.body;

    if (!inventoryItemId || !operationType || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Inventory item ID, operation type, and quantity are required'
      });
    }

    // Check if inventory item exists
    const inventoryItem = await InventoryItem.findByPk(inventoryItemId);
    if (!inventoryItem) {
      return res.status(400).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Validate operation
    if (operationType === 'out' && quantity > inventoryItem.availableQuantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient available quantity'
      });
    }

    // Create operation
    const operation = await InventoryOperation.create({
      inventoryItemId,
      productId: inventoryItem.productId,
      operationType,
      quantity: parseInt(quantity),
      performedBy,
      operationDate: new Date(operationDate),
      notes
    });

    // Update inventory item
    let newQuantity = inventoryItem.quantity;
    if (operationType === 'in') {
      newQuantity += parseInt(quantity);
    } else if (operationType === 'out') {
      newQuantity -= parseInt(quantity);
    }

    await inventoryItem.update({
      quantity: newQuantity,
      lastUpdatedBy: performedBy
    });

    res.status(201).json({
      success: true,
      data: {
        operation,
        message: 'Inventory operation created successfully'
      }
    });

  } catch (error) {
    console.error('Create operation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 
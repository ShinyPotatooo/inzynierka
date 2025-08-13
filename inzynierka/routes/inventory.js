const express = require('express');
const router = express.Router();
const { Op, literal } = require('sequelize');
const { InventoryItem, InventoryOperation, Product, User } = require('../models');

/**
 * GET /api/inventory
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      productId,
      location,
      condition,
      supplier,
      lowStock = false,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const where = {};

    if (productId) where.productId = productId;
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (condition) where.condition = condition;
    if (supplier) where.supplier = { [Op.iLike]: `%${supplier}%` };
    if (String(lowStock) === 'true') {
      where.quantity = { [Op.lte]: literal('"product"."minStockLevel"') };
    }

    const result = await InventoryItem.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'sku', 'name', 'category', 'brand', 'minStockLevel', 'reorderPoint'],
        },
        {
          model: User,
          as: 'lastUpdatedByUser',
          attributes: ['id', 'username', 'firstName', 'lastName'],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        inventoryItems: result.rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(result.count / Number(limit)),
          totalItems: result.count,
          itemsPerPage: Number(limit),
        },
      },
    });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/inventory/summary
 */
router.get('/summary', async (_req, res) => {
  try {
    const totalItems = await InventoryItem.count();
    const totalProducts = await Product.count();

    const lowStockItems = await InventoryItem.count({
      include: [
        {
          model: Product,
          as: 'product',
          where: { minStockLevel: { [Op.not]: null } },
        },
      ],
      where: { quantity: { [Op.lte]: literal('"product"."minStockLevel"') } },
    });

    const all = await InventoryItem.findAll({
      include: [{ model: Product, as: 'product', attributes: ['cost'] }],
    });

    const totalCost = all.reduce((s, it) => s + it.quantity * (it.product.cost || 0), 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalItems,
          totalProducts,
          lowStockItems,
          totalCost: Number(totalCost.toFixed(2)),
        },
      },
    });
  } catch (err) {
    console.error('Get summary error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/inventory/operations
 * Filtry: productId, operationType, userId (alias: performedBy), startDate, endDate
 */
router.get('/operations', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      productId,
      operationType,
      userId,         // preferowane
      performedBy,    // alias wstecznej kompatybilności
      startDate,
      endDate,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const where = {};

    if (productId) where.productId = productId;
    if (operationType) where.operationType = operationType;

    const userFilter = userId || performedBy;
    if (userFilter) where.userId = userFilter;

    if (startDate || endDate) {
      where.operationDate = {};
      if (startDate) where.operationDate[Op.gte] = new Date(startDate);
      if (endDate) where.operationDate[Op.lte] = new Date(endDate);
    }

    const ops = await InventoryOperation.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['operationDate', 'DESC']],
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: InventoryItem, as: 'inventoryItem', attributes: ['id', 'location', 'batchNumber'] },
      ],
    });

    res.json({
      success: true,
      data: {
        operations: ops.rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(ops.count / Number(limit)),
          totalItems: ops.count,
          itemsPerPage: Number(limit),
        },
      },
    });
  } catch (err) {
    console.error('Get operations error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/inventory/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id, {
      include: [
        { model: Product, as: 'product' },
        { model: User, as: 'lastUpdatedByUser', attributes: ['id', 'username', 'firstName', 'lastName'] },
        {
          model: InventoryOperation,
          as: 'inventoryOperations',
          limit: 10,
          order: [['createdAt', 'DESC']],
          include: [{ model: User, as: 'user', attributes: ['id', 'username', 'firstName', 'lastName'] }],
        },
      ],
    });

    if (!item) return res.status(404).json({ success: false, error: 'Inventory item not found' });
    res.json({ success: true, data: { inventoryItem: item } });
  } catch (err) {
    console.error('Get inventory item error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/inventory
 * Tworzy pozycję i zapisuje operację "in".
 */
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
      quantity: parseInt(quantity, 10),
      reservedQuantity: parseInt(reservedQuantity, 10),
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
  quantity: parseInt(quantity, 10),
  userId: lastUpdatedBy,        // <-- tu ma być userId
  operationDate: new Date(),
  notes: 'Initial stock entry'
});

    // ⬇️ KLUCZ: zwróć obiekt z dołączonym produktem
    const inventoryItemWithProduct = await InventoryItem.findByPk(inventoryItem.id, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'sku', 'name', 'category', 'brand']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: {
        inventoryItem: inventoryItemWithProduct,
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

/**
 * PUT /api/inventory/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Inventory item not found' });

    const update = { ...req.body };
    if (update.quantity != null) update.quantity = parseInt(update.quantity);
    if (update.reservedQuantity != null) update.reservedQuantity = parseInt(update.reservedQuantity);
    if (update.expiryDate) update.expiryDate = new Date(update.expiryDate);
    if (update.manufacturingDate) update.manufacturingDate = new Date(update.manufacturingDate);

    await item.update(update);

    res.json({ success: true, data: { inventoryItem: item, message: 'Inventory item updated successfully' } });
  } catch (err) {
    console.error('Update inventory item error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/inventory/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Inventory item not found' });

    if (item.quantity > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete inventory item with stock' });
    }

    await item.destroy();
    res.json({ success: true, data: { message: 'Inventory item deleted successfully' } });
  } catch (err) {
    console.error('Delete inventory item error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/inventory/operations
 * Tworzy operację i aktualizuje stan pozycji.
 */
router.post('/operations', async (req, res) => {
  try {
    const {
      inventoryItemId,
      operationType, // 'in' | 'out' | 'transfer' | ...
      quantity,
      userId,        // wymagane (wcześniej performedBy)
      operationDate = new Date(),
      notes,
    } = req.body;

    if (!inventoryItemId || !operationType || !quantity) {
      return res.status(400).json({ success: false, error: 'Inventory item ID, operation type, and quantity are required' });
    }
    const item = await InventoryItem.findByPk(inventoryItemId);
    if (!item) return res.status(400).json({ success: false, error: 'Inventory item not found' });

    if (operationType === 'out' && Number(quantity) > (item.quantity - item.reservedQuantity)) {
      return res.status(400).json({ success: false, error: 'Insufficient available quantity' });
    }

    const op = await InventoryOperation.create({
      inventoryItemId,
      productId: item.productId,
      operationType,
      quantity: parseInt(quantity),
      userId: userId ? Number(userId) : 1,
      operationDate: new Date(operationDate),
      notes,
    });

    let newQty = item.quantity;
    if (operationType === 'in') newQty += parseInt(quantity);
    if (operationType === 'out') newQty -= parseInt(quantity);

    await item.update({ quantity: newQty, lastUpdatedBy: userId ? Number(userId) : 1 });

    res.status(201).json({ success: true, data: { operation: op, message: 'Inventory operation created successfully' } });
  } catch (err) {
    console.error('Create operation error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;

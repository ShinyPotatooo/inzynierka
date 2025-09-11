// routes/inventory.js
const express = require('express');
const router = express.Router();
const { Op, literal } = require('sequelize');
const { InventoryItem, InventoryOperation, Product, User } = require('../models');
const { recomputeAndNotifyLowStock } = require('../utils/lowStock'); // <— DODANE

/* ===========================
   Helpers
=========================== */
function todayIsoDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// BATCH-YYYY-<seq per product>
async function generateBatchNumber(InventoryItemModel, productId) {
  const year = new Date().getFullYear();
  const count = await InventoryItemModel.count({ where: { productId } });
  const seq = String(count + 1).padStart(3, '0');
  return `BATCH-${year}-${seq}`;
}

// PO-YYYY-<global seq>
async function generatePurchaseOrderNumber(InventoryItemModel) {
  const year = new Date().getFullYear();
  const total = await InventoryItemModel.count();
  const seq = String(total + 1).padStart(3, '0');
  return `PO-${year}-${seq}`;
}

/* ===========================
   GET /api/inventory
=========================== */
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
      // porównanie do pola z dołączonego Product (alias "product")
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

/* ===========================
   GET /api/inventory/summary
=========================== */
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

    const totalCost = all.reduce(
      (s, it) => s + it.quantity * (it.product.cost || 0),
      0
    );

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

/* ===========================
   GET /api/inventory/operations
   Filtry: productId, operationType, userId|performedBy, startDate, endDate
=========================== */
router.get('/operations', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      productId,
      operationType,
      userId,
      performedBy,
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

/* ===========================
   GET /api/inventory/:id
=========================== */
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

    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    res.json({ success: true, data: { inventoryItem: item } });
  } catch (err) {
    console.error('Get inventory item error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ===========================
   POST /api/inventory
   Tworzy pozycję + loguje operację "in"
=========================== */
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
      lastUpdatedBy, // z JWT; fallback niżej
    } = req.body;

    if (!productId || !location || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Product ID, location, and quantity are required',
      });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(400).json({ success: false, error: 'Product not found' });
    }

    const ensuredBatch = batchNumber || await generateBatchNumber(InventoryItem, productId);
    const ensuredPO = purchaseOrderNumber || await generatePurchaseOrderNumber(InventoryItem);
    const ensuredSupplier = supplier ?? 'Nieznany';
    const ensuredNotes = notes ?? '';
    const userId = lastUpdatedBy ? Number(lastUpdatedBy) : 1;

    const item = await InventoryItem.create({
      productId,
      location,
      quantity: parseInt(quantity, 10),
      reservedQuantity: parseInt(reservedQuantity, 10) || 0,
      batchNumber: ensuredBatch,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      supplier: ensuredSupplier,
      purchaseOrderNumber: ensuredPO,
      condition,
      notes: ensuredNotes,
      lastUpdatedBy: userId,
    });

    // log operacji "in"
    await InventoryOperation.create({
      inventoryItemId: item.id,
      productId,
      operationType: 'in',
      quantity: parseInt(quantity, 10),
      userId,
      operationDate: new Date(),
      notes: 'Initial stock entry',
    });

    // >>> GENERUJ ALERT NISKIEGO STANU (globalny) <<<
    try { await recomputeAndNotifyLowStock(productId); } catch (e) { console.warn('lowStock recompute failed:', e?.message); }

    const itemWithProduct = await InventoryItem.findByPk(item.id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'category', 'brand'] }],
    });

    res.status(201).json({
      success: true,
      data: { inventoryItem: itemWithProduct, message: 'Inventory item created successfully' },
    });
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ===========================
   PUT /api/inventory/:id
   Aktualizacja + auto-log korekty ilości
=========================== */
router.put('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Inventory item not found' });

    const prevQty = item.quantity;

    const update = { ...req.body };
    if (update.quantity != null) update.quantity = parseInt(update.quantity, 10);
    if (update.reservedQuantity != null) update.reservedQuantity = parseInt(update.reservedQuantity, 10);
    if (update.expiryDate) update.expiryDate = new Date(update.expiryDate);
    if (update.manufacturingDate) update.manufacturingDate = new Date(update.manufacturingDate);
    if (req.body.lastUpdatedBy != null) update.lastUpdatedBy = Number(req.body.lastUpdatedBy);

    await item.update(update);

    if (update.quantity != null && update.quantity !== prevQty) {
      const delta = update.quantity - prevQty; // + lub -
      await InventoryOperation.create({
        inventoryItemId: item.id,
        productId: item.productId,
        operationType: 'adjustment',
        quantity: Math.abs(delta),
        userId: update.lastUpdatedBy ?? 1,
        operationDate: new Date(),
        notes: `Manual quantity change via UI: ${prevQty} → ${update.quantity}`
      });

      // >>> GENERUJ ALERT NISKIEGO STANU (globalny) <<<
      try { await recomputeAndNotifyLowStock(item.productId); } catch (e) { console.warn('lowStock recompute failed:', e?.message); }
    }

    res.json({
      success: true,
      data: { inventoryItem: item, message: 'Inventory item updated successfully' }
    });
  } catch (err) {
    console.error('Update inventory item error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ===========================
   DELETE /api/inventory/:id
=========================== */
router.delete('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    if (item.quantity > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete inventory item with stock' });
    }

    const productId = item.productId;
    await item.destroy();

    // Po usunięciu pustej pozycji globalna dostępność może się zmienić
    try { await recomputeAndNotifyLowStock(productId); } catch (e) { console.warn('lowStock recompute failed:', e?.message); }

    res.json({ success: true, data: { message: 'Inventory item deleted successfully' } });
  } catch (err) {
    console.error('Delete inventory item error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ===========================
   POST /api/inventory/operations
   Tworzenie operacji + aktualizacja stanu
=========================== */
router.post('/operations', async (req, res) => {
  try {
    const {
      inventoryItemId,
      operationType,        // 'in' | 'out'
      quantity,
      userId,
      operationDate = new Date(),
      notes,
    } = req.body;

    if (!inventoryItemId || !operationType || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Inventory item ID, operation type, and quantity are required',
      });
    }

    if (!['in', 'out'].includes(operationType)) {
      return res.status(400).json({ success: false, error: 'Unsupported operation type' });
    }

    const item = await InventoryItem.findByPk(inventoryItemId);
    if (!item) return res.status(400).json({ success: false, error: 'Inventory item not found' });

    const q = parseInt(quantity, 10);
    const actor = userId ? Number(userId) : 1;
    const quantityBefore = item.quantity;

    if (operationType === 'out' && q > (item.quantity - item.reservedQuantity)) {
      return res.status(400).json({ success: false, error: 'Insufficient available quantity' });
    }

    const quantityAfter = operationType === 'in' ? quantityBefore + q : quantityBefore - q;

    const op = await InventoryOperation.create({
      inventoryItemId,
      productId: item.productId,
      operationType,
      quantity: q,
      userId: actor,
      operationDate: new Date(operationDate),
      notes,
      quantityBefore,
      quantityAfter,
    });

    await item.update({ quantity: quantityAfter, lastUpdatedBy: actor });

    // >>> GENERUJ ALERT NISKIEGO STANU (globalny) <<<
    try { await recomputeAndNotifyLowStock(item.productId); } catch (e) { console.warn('lowStock recompute failed:', e?.message); }

    res.status(201).json({
      success: true,
      data: { operation: op, message: 'Inventory operation created successfully' },
    });
  } catch (err) {
    console.error('Create operation error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ===========================
   (opcjonalnie) Ręczny trigger do testów
   POST /api/inventory/alerts/recompute { productId }
=========================== */
router.post('/alerts/recompute', async (req, res) => {
  try {
    const productId = Number(req.body?.productId);
    if (!productId) return res.status(400).json({ success: false, error: 'productId required' });

    await recomputeAndNotifyLowStock(productId);
    res.json({ success: true, data: { message: 'Recomputed' } });
  } catch (e) {
    console.error('alerts/recompute error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;

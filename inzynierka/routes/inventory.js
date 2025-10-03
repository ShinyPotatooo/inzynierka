// routes/inventory.js
const express = require('express');
const router = express.Router();
const { Op, literal, fn, col } = require('sequelize');
const { sequelize, InventoryItem, InventoryOperation, Product, User, Location } = require('../models');
const { recomputeAndNotifyLowStock } = require('../utils/lowStock');

const FLOW_STATUSES_ALL   = ['available', 'in_transit', 'reserved', 'damaged'];
const FLOW_STATUSES_WRITE = ['available', 'in_transit', 'damaged'];

const isValidFlowStatusAny   = (v) => typeof v === 'string' && FLOW_STATUSES_ALL.includes(v);
const isValidFlowStatusWrite = (v) => typeof v === 'string' && FLOW_STATUSES_WRITE.includes(v);

async function locationExistsCI(name = '') {
  if (!name || typeof name !== 'string') return false;
  const row = await Location.findOne({
    where: sequelize.where(fn('LOWER', col('name')), name.toLowerCase()),
  });
  return !!row;
}

async function generateBatchNumber(InventoryItemModel, productId) {
  const year = new Date().getFullYear();
  const count = await InventoryItemModel.count({ where: { productId } });
  const seq = String(count + 1).padStart(3, '0');
  return `BATCH-${year}-${seq}`;
}

async function generatePurchaseOrderNumber(InventoryItemModel) {
  const year = new Date().getFullYear();
  const total = await InventoryItemModel.count();
  const seq = String(total + 1).padStart(3, '0');
  return `PO-${year}-${seq}`;
}

/* =========================== GET /api/inventory ========================== */
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
      flowStatus,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const where = {};

    if (productId) where.productId = productId;
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (condition) where.condition = condition;
    if (supplier) where.supplier = { [Op.iLike]: `%${supplier}%` };
    if (flowStatus && isValidFlowStatusAny(flowStatus)) where.flowStatus = flowStatus;

    const productInclude = {
      model: Product,
      as: 'product',
      attributes: ['id', 'sku', 'name', 'category', 'brand', 'minStockLevel', 'reorderPoint', 'cost'],
      required: String(lowStock) === 'true',
      where: {},
    };

    if (String(lowStock) === 'true') {
      where.quantity = { [Op.lte]: literal('"product"."minStockLevel"') };
      productInclude.where.minStockLevel = { [Op.not]: null };
    }

    const result = await InventoryItem.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        productInclude,
        {
          model: User,
          as: 'lastUpdatedByUser',
          attributes: ['id', 'username', 'firstName', 'lastName'],
        },
      ],
    });

    // autoStatus liczony po ILOŚCI (quantity), nie po available
    const items = result.rows.map((it) => {
      const j = it.toJSON();
      const qty = Number(j.quantity || 0);
      const min = Number(j.product?.minStockLevel ?? NaN);
      const autoStatus =
        qty === 0 ? 'empty'
        : Number.isFinite(min) && qty <= min ? 'low'
        : 'ok';
      return { ...j, autoStatus };
    });

    res.json({
      success: true,
      data: {
        inventoryItems: items,
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

/* =========================== GET /api/inventory/summary ================== */
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
          required: true,
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

/* ====================== GET /api/inventory/operations ==================== */
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

    // sanity-check zakresu dat
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;
    if (start && end && start > end) [start, end] = [end, start];

    if (start || end) {
      where.operationDate = {};
      if (start) where.operationDate[Op.gte] = start;
      if (end) where.operationDate[Op.lte] = end;
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

/* =========================== GET /api/inventory/:id ====================== */
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

/* =========================== POST /api/inventory ========================= */
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
      lastUpdatedBy,
      flowStatus = 'available',
    } = req.body;

    if (!productId || !location || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Product ID, location, and quantity are required',
      });
    }
    if (flowStatus && !isValidFlowStatusWrite(flowStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid flowStatus' });
    }

    if (!(await locationExistsCI(location))) {
      return res.status(400).json({ success: false, error: 'Location not found in dictionary' });
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
      flowStatus,
    });

    await InventoryOperation.create({
      inventoryItemId: item.id,
      productId,
      operationType: 'in',
      quantity: parseInt(quantity, 10),
      userId,
      operationDate: new Date(),
      notes: 'Initial stock entry',
      quantityBefore: 0,
      quantityAfter: parseInt(quantity, 10),
    });

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

/* =========================== PUT /api/inventory/:id ====================== */
// Jedna operacja „adjustment” z pełnym changelogiem + productId zawsze w operacji
router.put('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Inventory item not found' });

    const before = {
      qty: item.quantity,
      loc: item.location,
      st:  item.flowStatus,
    };

    const update = { ...req.body };
    if (update.flowStatus && !isValidFlowStatusWrite(update.flowStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid flowStatus' });
    }

    if (update.location != null) {
      const ok = await locationExistsCI(String(update.location));
      if (!ok) {
        return res.status(400).json({ success: false, error: 'Location not found in dictionary' });
      }
    }

    if (update.quantity != null) update.quantity = parseInt(update.quantity, 10);
    if (update.reservedQuantity != null) update.reservedQuantity = parseInt(update.reservedQuantity, 10);
    if (update.expiryDate) update.expiryDate = new Date(update.expiryDate);
    if (update.manufacturingDate) update.manufacturingDate = new Date(update.manufacturingDate);
    if (req.body.lastUpdatedBy != null) update.lastUpdatedBy = Number(req.body.lastUpdatedBy);

    await item.update(update);

    const actor  = update.lastUpdatedBy ?? 1;
    const opDate = req.body.operationDate ? new Date(req.body.operationDate) : new Date();

    const after = {
      qty: item.quantity,
      loc: item.location,
      st:  item.flowStatus,
    };

    const changes = [];
    if (after.qty !== before.qty) changes.push(`qty: ${before.qty} → ${after.qty}`);
    if ((before.loc || '') !== (after.loc || '')) changes.push(`loc: ${before.loc || '—'} → ${after.loc || '—'}`);
    if ((before.st  || '') !== (after.st  || '')) changes.push(`status: ${before.st || '—'} → ${after.st || '—'}`);
    if (req.body.notes) changes.push(`note: ${req.body.notes}`);

    if (changes.length) {
      await InventoryOperation.create({
        inventoryItemId: item.id,
        productId: item.productId, // ID produktu zawsze w logu
        operationType: 'adjustment',
        quantity: Math.abs((after.qty ?? 0) - (before.qty ?? 0)),
        userId: actor,
        operationDate: opDate,
        fromLocation: before.loc,
        toLocation: after.loc,
        notes: `Edit: ${changes.join(' | ')}`,
        quantityBefore: before.qty ?? 0,
        quantityAfter:  after.qty ?? 0,
      });
    }

    try { await recomputeAndNotifyLowStock(item.productId); } catch (e) { console.warn('lowStock recompute failed:', e?.message); }

    res.json({
      success: true,
      data: { inventoryItem: item, message: 'Inventory item updated successfully' }
    });
  } catch (err) {
    console.error('Update inventory item error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* =================== POST /api/inventory/operations (in/out) ============= */
router.post('/operations', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      inventoryItemId,
      operationType, // 'in' | 'out'
      quantity,
      userId,
      operationDate = new Date(),
      notes,
      useReserved = false,
      reserveAfter = false,
      reserveAmount = 0,
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

    const q = parseInt(quantity, 10);
    if (!Number.isFinite(q) || q <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be > 0' });
    }

    const item = await InventoryItem.findByPk(inventoryItemId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!item) return res.status(400).json({ success: false, error: 'Inventory item not found' });

    const actor = userId ? Number(userId) : 1;
    const qtyBefore = Number(item.quantity || 0);
    const resBefore = Number(item.reservedQuantity || 0);
    const available = Math.max(0, qtyBefore - resBefore);

    let qtyAfter = qtyBefore;
    let resAfter = resBefore;
    let infoNote = '';

    if (operationType === 'out') {
      if (item.flowStatus === 'damaged') {
        return res.status(400).json({ success: false, error: 'Item is damaged — issuing is blocked' });
      }
      if (item.flowStatus === 'in_transit') {
        return res.status(400).json({ success: false, error: 'Item is in transit — receive first or mark as available' });
      }

      if (useReserved) {
        if (q > resBefore) return res.status(400).json({ success: false, error: 'Nie możesz wydać więcej niż zarezerwowane' });
        qtyAfter = qtyBefore - q;
        resAfter = resBefore - q;
        infoNote = '[OUT from reserved] ';
      } else {
        if (q > available) return res.status(400).json({ success: false, error: 'Insufficient available quantity' });
        qtyAfter = qtyBefore - q;
      }
    }

    if (operationType === 'in') {
      qtyAfter = qtyBefore + q;

      if (reserveAfter) {
        let r = Math.max(0, Math.min(parseInt(reserveAmount, 10) || 0, q));
        r = Math.min(r, qtyAfter - resBefore);
        resAfter = resBefore + r;
        infoNote = r > 0 ? `[IN reserve +${r}] ` : '';
      }
    }

    const op = await InventoryOperation.create({
      inventoryItemId,
      productId: item.productId,
      operationType,
      quantity: q,
      userId: actor,
      operationDate: new Date(operationDate),
      notes: (infoNote || '') + (notes || ''),
      quantityBefore: qtyBefore,
      quantityAfter: qtyAfter,
    }, { transaction: t });

    await item.update(
      { quantity: qtyAfter, reservedQuantity: resAfter, lastUpdatedBy: actor },
      { transaction: t }
    );

    try { await recomputeAndNotifyLowStock(item.productId); } catch (e) { console.warn('lowStock recompute failed:', e?.message); }

    await t.commit();
    res.status(201).json({
      success: true,
      data: { operation: op, message: 'Inventory operation created successfully' },
    });
  } catch (err) {
    await t.rollback();
    console.error('Create operation error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ====================== POST /api/inventory/receive ===================== */
router.post('/receive', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { inventoryItemId, userId, operationDate = new Date(), notes } = req.body;

    if (!inventoryItemId) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'inventoryItemId is required' });
    }

    const item = await InventoryItem.findByPk(inventoryItemId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!item) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    if (item.flowStatus !== 'in_transit') {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Item is not in transit' });
    }

    const actor = userId ? Number(userId) : 1;
    const qtyBefore = Number(item.quantity || 0);

    await item.update(
      { flowStatus: 'available', lastUpdatedBy: actor },
      { transaction: t }
    );

    const op = await InventoryOperation.create({
      inventoryItemId: item.id,
      productId: item.productId,
      operationType: 'receive',
      quantity: 0,
      userId: actor,
      operationDate: new Date(operationDate),
      notes: notes || 'Receive from transit',
      quantityBefore: qtyBefore,
      quantityAfter: qtyBefore,
      fromLocation: item.location,
      toLocation: item.location,
    }, { transaction: t });

    try { await recomputeAndNotifyLowStock(item.productId); } catch (e) { console.warn('lowStock recompute failed:', e?.message); }

    await t.commit();
    return res.json({ success: true, data: { message: 'Received from transit', operation: op, item } });
  } catch (err) {
    await t.rollback();
    console.error('Receive in-transit error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ====================== POST /api/inventory/transfer ===================== */
router.post('/transfer', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      fromItemId,
      toLocation,
      quantity,
      userId,
      operationDate = new Date(),
      notes,
    } = req.body;

    if (!fromItemId || !toLocation || !quantity) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'fromItemId, toLocation i quantity są wymagane' });
    }
    const q = parseInt(quantity, 10);
    if (!q || q <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Nieprawidłowa ilość' });
    }

    if (!(await locationExistsCI(String(toLocation)))) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Location not found in dictionary' });
    }

    const src = await InventoryItem.findByPk(fromItemId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!src) { await t.rollback(); return res.status(400).json({ success: false, error: 'Inventory item not found' }); }

    if (String(src.location).trim().toLowerCase() === String(toLocation).trim().toLowerCase()) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Docelowa lokalizacja nie może być taka sama' });
    }

    if (src.flowStatus === 'damaged') { await t.rollback(); return res.status(400).json({ success: false, error: 'Item is damaged — transfer blocked' }); }
    if (src.flowStatus === 'in_transit') { await t.rollback(); return res.status(400).json({ success: false, error: 'Item already in transit' }); }

    const actor = userId ? Number(userId) : 1;
    const available = Math.max(0, (src.quantity || 0) - (src.reservedQuantity || 0));
    if (q > available) { await t.rollback(); return res.status(400).json({ success: false, error: 'Insufficient available quantity' }); }

    // OUT ze źródła
    const srcBefore = src.quantity;
    const srcAfter  = src.quantity - q;

    const opOut = await InventoryOperation.create({
      inventoryItemId: src.id,
      productId: src.productId,
      operationType: 'out',
      quantity: q,
      userId: actor,
      operationDate: new Date(operationDate),
      notes: `Transfer → ${toLocation}${notes ? ` | ${notes}` : ''}`,
      quantityBefore: srcBefore,
      quantityAfter: srcAfter,
    }, { transaction: t });
    await src.update({ quantity: srcAfter, lastUpdatedBy: actor }, { transaction: t });

    // Pozycja docelowa
    let dest = await InventoryItem.findOne({
      where: { productId: src.productId, location: toLocation },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!dest) {
      dest = await InventoryItem.create({
        productId: src.productId,
        location: toLocation,
        quantity: 0,
        reservedQuantity: 0,
        condition: src.condition || 'new',
        flowStatus: 'in_transit',
        supplier: src.supplier || null,
        batchNumber: null,
        purchaseOrderNumber: null,
        lastUpdatedBy: actor,
      }, { transaction: t });
    } else {
      await dest.update({ flowStatus: 'in_transit', lastUpdatedBy: actor }, { transaction: t });
    }

    // IN do celu
    const destBefore = dest.quantity;
    const destAfter  = dest.quantity + q;

    const opIn = await InventoryOperation.create({
      inventoryItemId: dest.id,
      productId: dest.productId,
      operationType: 'in',
      quantity: q,
      userId: actor,
      operationDate: new Date(operationDate),
      notes: `Transfer ← ${src.location}${notes ? ` | ${notes}` : ''}`,
      quantityBefore: destBefore,
      quantityAfter: destAfter,
    }, { transaction: t });
    await dest.update({ quantity: destAfter, lastUpdatedBy: actor }, { transaction: t });

    try { await recomputeAndNotifyLowStock(src.productId); } catch (e) { console.warn('lowStock recompute failed:', e?.message); }

    await t.commit();
    res.status(201).json({
      success: true,
      data: {
        message: 'Transfer recorded',
        fromItem: src,
        toItem: dest,
        operations: { out: opOut, in: opIn },
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('Create transfer error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* =================== Ręczny trigger alertów niskiego stanu =============== */
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

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryItem = sequelize.define('InventoryItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' }
    },

    location: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'A1-01-01'
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 }
    },

    reservedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 }
    },

    availableQuantity: {
      type: DataTypes.VIRTUAL,
      get() { return (this.quantity || 0) - (this.reservedQuantity || 0); }
    },

    // (jeśli masz już flowStatus – zostawiamy bez zmian)
    flowStatus: {
      type: DataTypes.ENUM('available', 'in_transit', 'damaged', 'reserved'),
      allowNull: false,
      defaultValue: 'available'
    },

    batchNumber: { type: DataTypes.STRING(50), allowNull: true },
    expiryDate: { type: DataTypes.DATE, allowNull: true },
    manufacturingDate: { type: DataTypes.DATE, allowNull: true },
    supplier: { type: DataTypes.STRING(100), allowNull: true },
    purchaseOrderNumber: { type: DataTypes.STRING(50), allowNull: true },

    condition: {
      type: DataTypes.ENUM('new', 'good', 'fair', 'damaged', 'expired'),
      allowNull: false,
      defaultValue: 'new'
    },

    notes: { type: DataTypes.TEXT, allowNull: true },

    lastUpdatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },

    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'inventory_items',
    timestamps: true,
    indexes: [
      { fields: ['productId'] },
      { fields: ['location'] },
      { fields: ['batchNumber'] },
      { fields: ['expiryDate'] },
      { fields: ['condition'] },
      { fields: ['flowStatus'] },
      { fields: ['lastUpdatedBy'] }
    ],
    validate: {
      reservedNotAboveQuantity() {
        const q = Number(this.quantity || 0);
        const r = Number(this.reservedQuantity || 0);
        if (r > q) {
          throw new Error('reservedQuantity cannot be greater than quantity');
        }
      }
    }
  });

  InventoryItem.associate = (models) => {
    InventoryItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    InventoryItem.belongsTo(models.User, { foreignKey: 'lastUpdatedBy', as: 'lastUpdatedByUser' });
    InventoryItem.hasMany(models.InventoryOperation, { foreignKey: 'inventoryItemId', as: 'inventoryOperations' });
  };

  /** -------- Low-stock hook (jak było) -------- */
  async function ensureLowStockAlertFor(item) {
    try {
      const { Product, InventoryItem, Notification } = sequelize.models;
      if (!item?.productId) return;

      const product = await Product.findByPk(item.productId);
      if (!product) return;

      const rows = await InventoryItem.findAll({
        where: { productId: item.productId },
        attributes: ['quantity', 'reservedQuantity']
      });

      const totalQty = rows.reduce((s, r) => s + (r.quantity || 0), 0);
      const totalRes = rows.reduce((s, r) => s + (r.reservedQuantity || 0), 0);
      const available = totalQty - totalRes;

      const reorder = Number(product.reorderPoint ?? 0);
      if (!Number.isFinite(reorder) || reorder <= 0) return;

      if (available < reorder) {
        const existing = await Notification.findOne({
          where: { type: 'low_stock', productId: product.id, isRead: false },
          order: [['createdAt', 'DESC']]
        });

        const title = `Niski stan: ${product.name} (${product.sku || 'SKU?'})`;
        const message = `Dostępne: ${available}, próg: ${reorder}`;

        if (!existing) {
          await Notification.create({
            type: 'low_stock',
            title, message,
            productId: product.id,
            userId: null,
            targetRole: 'manager',
            isRead: false,
            isSent: false,
            priority: 'high',
            metadata: { productId: product.id, sku: product.sku, productName: product.name, available, reorder }
          });
        } else {
          existing.title = title;
          existing.message = message;
          existing.metadata = {
            ...(existing.metadata || {}),
            productId: product.id, sku: product.sku, productName: product.name, available, reorder,
            updatedAt: new Date().toISOString(),
          };
          await existing.save();
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.error('[low-stock hook] error:', e?.message || e);
    }
  }

  InventoryItem.addHook('afterCreate', ensureLowStockAlertFor);
  InventoryItem.addHook('afterUpdate', ensureLowStockAlertFor);
  InventoryItem.addHook('afterDestroy', ensureLowStockAlertFor);

  return InventoryItem;
};

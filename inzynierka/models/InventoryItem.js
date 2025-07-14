const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryItem = sequelize.define('InventoryItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
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
      validate: {
        min: 0
      }
    },
    reservedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    availableQuantity: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.quantity - this.reservedQuantity;
      }
    },
    batchNumber: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    manufacturingDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    supplier: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    purchaseOrderNumber: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    condition: {
      type: DataTypes.ENUM('new', 'good', 'fair', 'damaged', 'expired'),
      allowNull: false,
      defaultValue: 'new'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lastUpdatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'inventory_items',
    timestamps: true,
    indexes: [
      {
        fields: ['productId']
      },
      {
        fields: ['location']
      },
      {
        fields: ['batchNumber']
      },
      {
        fields: ['expiryDate']
      },
      {
        fields: ['condition']
      },
      {
        fields: ['lastUpdatedBy']
      }
    ]
  });

  InventoryItem.associate = (models) => {
    // InventoryItem belongs to Product
    InventoryItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });

    // InventoryItem belongs to User (lastUpdatedBy)
    InventoryItem.belongsTo(models.User, {
      foreignKey: 'lastUpdatedBy',
      as: 'lastUpdatedByUser'
    });

    // InventoryItem has many InventoryOperations
    InventoryItem.hasMany(models.InventoryOperation, {
      foreignKey: 'inventoryItemId',
      as: 'inventoryOperations'
    });
  };

  return InventoryItem;
}; 
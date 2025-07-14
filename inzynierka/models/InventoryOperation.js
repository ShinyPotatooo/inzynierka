const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryOperation = sequelize.define('InventoryOperation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    operationType: {
      type: DataTypes.ENUM('in', 'out', 'transfer', 'adjustment', 'reservation', 'release'),
      allowNull: false
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    inventoryItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'inventory_items',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    quantityBefore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    quantityAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    fromLocation: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    toLocation: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    referenceNumber: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    referenceType: {
      type: DataTypes.ENUM('purchase_order', 'sales_order', 'transfer_order', 'adjustment', 'inventory_count'),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    operationDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
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
    tableName: 'inventory_operations',
    timestamps: true,
    indexes: [
      {
        fields: ['operationType']
      },
      {
        fields: ['productId']
      },
      {
        fields: ['inventoryItemId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['operationDate']
      },
      {
        fields: ['referenceType']
      },
      {
        fields: ['referenceNumber']
      }
    ]
  });

  InventoryOperation.associate = (models) => {
    // InventoryOperation belongs to Product
    InventoryOperation.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });

    // InventoryOperation belongs to InventoryItem
    InventoryOperation.belongsTo(models.InventoryItem, {
      foreignKey: 'inventoryItemId',
      as: 'inventoryItem'
    });

    // InventoryOperation belongs to User
    InventoryOperation.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return InventoryOperation;
}; 
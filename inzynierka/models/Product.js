const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50]
      }
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [2, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'szt'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    cost: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: true,  // Zmiena z false na true
  defaultValue: 0.00,
  validate: {
    min: 0
  }
},
    minStockLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    maxStockLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    reorderPoint: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'discontinued'),
      allowNull: false,
      defaultValue: 'active'
    },
    weight: {
      type: DataTypes.DECIMAL(8, 3),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    dimensions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    barcode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
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
    tableName: 'products',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['sku']
      },
      {
        unique: true,
        fields: ['barcode']
      },
      {
        fields: ['category']
      },
      {
        fields: ['brand']
      },
      {
        fields: ['status']
      }
    ]
  });

  Product.associate = (models) => {
    // Product has many InventoryItems
    Product.hasMany(models.InventoryItem, {
      foreignKey: 'productId',
      as: 'inventoryItems'
    });

    // Product has many InventoryOperations
    Product.hasMany(models.InventoryOperation, {
      foreignKey: 'productId',
      as: 'inventoryOperations'
    });

    // Product has many ActivityLogs
    Product.hasMany(models.ActivityLog, {
      foreignKey: 'productId',
      as: 'activityLogs'
    });
  };

  return Product;
}; 
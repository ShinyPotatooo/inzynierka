'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('products', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sku: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      brand: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'szt'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      minStockLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      maxStockLevel: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      reorderPoint: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'discontinued'),
        allowNull: false,
        defaultValue: 'active'
      },
      weight: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      barcode: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
      },
      imageUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('products', ['sku'], {
      unique: true
    });
    await queryInterface.addIndex('products', ['barcode'], {
      unique: true
    });
    await queryInterface.addIndex('products', ['category']);
    await queryInterface.addIndex('products', ['brand']);
    await queryInterface.addIndex('products', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('products');
  }
}; 
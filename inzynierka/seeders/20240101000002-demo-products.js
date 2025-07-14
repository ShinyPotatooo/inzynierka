'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('products', [
      {
        sku: 'LAPTOP-001',
        name: 'Laptop Dell Inspiron 15',
        description: '15-calowy laptop biznesowy z procesorem Intel i5',
        category: 'Elektronika',
        brand: 'Dell',
        unit: 'szt',
        price: 2999.99,
        cost: 2200.00,
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderPoint: 10,
        status: 'active',
        weight: 2.5,
        dimensions: JSON.stringify({ length: 35, width: 24, height: 2 }),
        barcode: '1234567890123',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        sku: 'MOUSE-001',
        name: 'Mysz bezprzewodowa Logitech',
        description: 'Bezprzewodowa mysz optyczna z baterią długotrwałą',
        category: 'Akcesoria',
        brand: 'Logitech',
        unit: 'szt',
        price: 89.99,
        cost: 45.00,
        minStockLevel: 20,
        maxStockLevel: 200,
        reorderPoint: 30,
        status: 'active',
        weight: 0.1,
        dimensions: JSON.stringify({ length: 12, width: 6, height: 3 }),
        barcode: '1234567890124',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        sku: 'KEYBOARD-001',
        name: 'Klawiatura mechaniczna RGB',
        description: 'Klawiatura mechaniczna z podświetleniem RGB',
        category: 'Akcesoria',
        brand: 'Corsair',
        unit: 'szt',
        price: 299.99,
        cost: 180.00,
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderPoint: 15,
        status: 'active',
        weight: 0.8,
        dimensions: JSON.stringify({ length: 44, width: 13, height: 3 }),
        barcode: '1234567890125',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        sku: 'MONITOR-001',
        name: 'Monitor 24" Full HD',
        description: 'Monitor LED 24 cale z rozdzielczością Full HD',
        category: 'Elektronika',
        brand: 'Samsung',
        unit: 'szt',
        price: 599.99,
        cost: 400.00,
        minStockLevel: 8,
        maxStockLevel: 40,
        reorderPoint: 12,
        status: 'active',
        weight: 3.2,
        dimensions: JSON.stringify({ length: 54, width: 32, height: 5 }),
        barcode: '1234567890126',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        sku: 'CABLE-001',
        name: 'Kabel HDMI 2m',
        description: 'Kabel HDMI wysokiej jakości 2 metry',
        category: 'Akcesoria',
        brand: 'Generic',
        unit: 'szt',
        price: 19.99,
        cost: 8.00,
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderPoint: 75,
        status: 'active',
        weight: 0.2,
        dimensions: JSON.stringify({ length: 200, width: 1, height: 1 }),
        barcode: '1234567890127',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('products', null, {});
  }
}; 
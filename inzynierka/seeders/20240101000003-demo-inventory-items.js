'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('inventory_items', [
      {
        productId: 1, // Laptop Dell
        location: 'A1-01-01',
        quantity: 15,
        reservedQuantity: 2,
        batchNumber: 'BATCH-2024-001',
        expiryDate: null,
        manufacturingDate: new Date('2024-01-15'),
        supplier: 'Dell Poland',
        purchaseOrderNumber: 'PO-2024-001',
        condition: 'new',
        notes: 'Laptopy biznesowe - nowa dostawa',
        lastUpdatedBy: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        productId: 2, // Mysz Logitech
        location: 'A1-02-01',
        quantity: 85,
        reservedQuantity: 5,
        batchNumber: 'BATCH-2024-002',
        expiryDate: null,
        manufacturingDate: new Date('2024-02-01'),
        supplier: 'Logitech Europe',
        purchaseOrderNumber: 'PO-2024-002',
        condition: 'new',
        notes: 'Myszy bezprzewodowe - popularny produkt',
        lastUpdatedBy: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        productId: 3, // Klawiatura Corsair
        location: 'A1-03-01',
        quantity: 25,
        reservedQuantity: 3,
        batchNumber: 'BATCH-2024-003',
        expiryDate: null,
        manufacturingDate: new Date('2024-01-20'),
        supplier: 'Corsair Gaming',
        purchaseOrderNumber: 'PO-2024-003',
        condition: 'new',
        notes: 'Klawiatury mechaniczne RGB',
        lastUpdatedBy: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        productId: 4, // Monitor Samsung
        location: 'A2-01-01',
        quantity: 12,
        reservedQuantity: 1,
        batchNumber: 'BATCH-2024-004',
        expiryDate: null,
        manufacturingDate: new Date('2024-01-10'),
        supplier: 'Samsung Electronics',
        purchaseOrderNumber: 'PO-2024-004',
        condition: 'new',
        notes: 'Monitory 24" Full HD',
        lastUpdatedBy: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        productId: 5, // Kabel HDMI
        location: 'A2-02-01',
        quantity: 200,
        reservedQuantity: 15,
        batchNumber: 'BATCH-2024-005',
        expiryDate: null,
        manufacturingDate: new Date('2024-02-15'),
        supplier: 'Cable Supplier Ltd',
        purchaseOrderNumber: 'PO-2024-005',
        condition: 'new',
        notes: 'Kable HDMI 2m - duża dostawa',
        lastUpdatedBy: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Dodatkowe lokalizacje dla tego samego produktu
      {
        productId: 2, // Mysz Logitech - dodatkowa lokalizacja
        location: 'A1-02-02',
        quantity: 45,
        reservedQuantity: 2,
        batchNumber: 'BATCH-2024-006',
        expiryDate: null,
        manufacturingDate: new Date('2024-02-10'),
        supplier: 'Logitech Europe',
        purchaseOrderNumber: 'PO-2024-006',
        condition: 'new',
        notes: 'Dodatkowa lokalizacja dla myszy',
        lastUpdatedBy: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('inventory_items', null, {});
  }
}; 
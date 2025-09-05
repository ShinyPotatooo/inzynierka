'use strict';

module.exports = {
  up: async (qi) => {
    const now = new Date();

    const rows = [
      {
        sku: 'LAPTOP-001',
        location: 'A1-01-01',
        quantity: 15,
        reservedQuantity: 2,
        batchNumber: 'BATCH-2024-001',
        expiryDate: null,
        manufacturingDate: '2024-01-15',
        supplier: 'Dell Poland',
        purchaseOrderNumber: 'PO-2024-001',
        condition: 'new',
        notes: 'Laptopy biznesowe - nowa dostawa',
        lastUpdatedByUsername: 'admin',
      },
      {
        sku: 'MOUSE-001',
        location: 'A1-02-01',
        quantity: 85,
        reservedQuantity: 5,
        batchNumber: 'BATCH-2024-002',
        expiryDate: null,
        manufacturingDate: '2024-02-01',
        supplier: 'Logitech Europe',
        purchaseOrderNumber: 'PO-2024-002',
        condition: 'new',
        notes: 'Myszy bezprzewodowe - popularny produkt',
        lastUpdatedByUsername: 'worker1',
      },
      {
        sku: 'KEYBOARD-001',
        location: 'A1-03-01',
        quantity: 25,
        reservedQuantity: 3,
        batchNumber: 'BATCH-2024-003',
        expiryDate: null,
        manufacturingDate: '2024-01-20',
        supplier: 'Corsair Gaming',
        purchaseOrderNumber: 'PO-2024-003',
        condition: 'new',
        notes: 'Klawiatury mechaniczne RGB',
        lastUpdatedByUsername: 'worker1',
      },
      {
        sku: 'MONITOR-001',
        location: 'A2-01-01',
        quantity: 12,
        reservedQuantity: 1,
        batchNumber: 'BATCH-2024-004',
        expiryDate: null,
        manufacturingDate: '2024-01-10',
        supplier: 'Samsung Electronics',
        purchaseOrderNumber: 'PO-2024-004',
        condition: 'new',
        notes: 'Monitory 24" Full HD',
        lastUpdatedByUsername: 'admin',
      },
      {
        sku: 'CABLE-001',
        location: 'A2-02-01',
        quantity: 200,
        reservedQuantity: 15,
        batchNumber: 'BATCH-2024-005',
        expiryDate: null,
        manufacturingDate: '2024-02-15',
        supplier: 'Cable Supplier Ltd',
        purchaseOrderNumber: 'PO-2024-005',
        condition: 'new',
        notes: 'Kable HDMI 2m - duża dostawa',
        lastUpdatedByUsername: 'worker2',
      },
      {
        sku: 'MOUSE-001',
        location: 'A1-02-02',
        quantity: 45,
        reservedQuantity: 2,
        batchNumber: 'BATCH-2024-006',
        expiryDate: null,
        manufacturingDate: '2024-02-10',
        supplier: 'Logitech Europe',
        purchaseOrderNumber: 'PO-2024-006',
        condition: 'new',
        notes: 'Dodatkowa lokalizacja dla myszy',
        lastUpdatedByUsername: 'worker2',
      },
    ];

    for (const r of rows) {
      await qi.sequelize.query(
        `
        INSERT INTO "inventory_items"
          ("productId","location","quantity","reservedQuantity","batchNumber",
           "expiryDate","manufacturingDate","supplier","purchaseOrderNumber",
           "condition","notes","lastUpdatedBy","createdAt","updatedAt")
        SELECT
          p.id, :location, :quantity, :reservedQuantity, :batchNumber,
          :expiryDate, :manufacturingDate, :supplier, :purchaseOrderNumber,
          :condition, :notes, u.id, :createdAt, :updatedAt
        FROM "products" p
        LEFT JOIN "users" u ON u.username = :lastUpdatedByUsername
        WHERE p.sku = :sku
          AND NOT EXISTS (
            SELECT 1 FROM "inventory_items" ii
            WHERE ii."productId" = p.id
              AND ii."location" = :location
              AND COALESCE(ii."batchNumber",'') = COALESCE(:batchNumber,'')
          );
        `,
        {
          replacements: {
            ...r,
            createdAt: now,
            updatedAt: now,
          },
        }
      );
    }
  },

  down: async (qi) => {
    await qi.sequelize.query(`
      DELETE FROM "inventory_items"
      WHERE "purchaseOrderNumber" IN (
        'PO-2024-001','PO-2024-002','PO-2024-003','PO-2024-004','PO-2024-005','PO-2024-006'
      );
    `);
  }
};

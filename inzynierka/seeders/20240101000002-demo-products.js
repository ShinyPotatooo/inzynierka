'use strict';

module.exports = {
  up: async (qi) => {
    const now = new Date();
    const rows = [
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
        dimensions: { length: 35, width: 24, height: 2 },
        barcode: '1234567890123',
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
        dimensions: { length: 12, width: 6, height: 3 },
        barcode: '1234567890124',
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
        dimensions: { length: 44, width: 13, height: 3 },
        barcode: '1234567890125',
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
        dimensions: { length: 54, width: 32, height: 5 },
        barcode: '1234567890126',
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
        dimensions: { length: 200, width: 1, height: 1 },
        barcode: '1234567890127',
      },
    ];

    for (const p of rows) {
      await qi.sequelize.query(
        `
        INSERT INTO "products"
          ("sku","name","description","category","brand","unit","price","cost",
           "minStockLevel","maxStockLevel","reorderPoint","status","weight",
           "dimensions","barcode","createdAt","updatedAt")
        SELECT
          :sku,:name,:description,:category,:brand,:unit,:price,:cost,
          :minStockLevel,:maxStockLevel,:reorderPoint,:status,:weight,
          :dimensions::jsonb,:barcode,:createdAt,:updatedAt
        WHERE NOT EXISTS (
          SELECT 1 FROM "products"
          WHERE "sku" = :sku OR ("barcode" IS NOT NULL AND "barcode" = :barcode)
        );
        `,
        {
          replacements: {
            ...p,
            dimensions: JSON.stringify(p.dimensions),
            createdAt: now,
            updatedAt: now,
          },
        }
      );
    }
  },

  down: async (qi) => {
    // Usuń powiązane pozycje magazynowe i dopiero potem produkty
    await qi.sequelize.query(`
      DELETE FROM "inventory_items"
      WHERE "productId" IN (
        SELECT id FROM "products"
        WHERE "sku" IN ('LAPTOP-001','MOUSE-001','KEYBOARD-001','MONITOR-001','CABLE-001')
      );
    `);
    await qi.sequelize.query(`
      DELETE FROM "products"
      WHERE "sku" IN ('LAPTOP-001','MOUSE-001','KEYBOARD-001','MONITOR-001','CABLE-001');
    `);
  }
};

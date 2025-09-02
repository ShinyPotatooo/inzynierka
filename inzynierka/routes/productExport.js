// inzynierka/routes/productsExport.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Product, InventoryItem } = require('../models');

let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch (e) { console.warn('[productsExport] pdfkit not installed'); }

function buildWhere(q = {}) {
  const where = {};
  if (q.category) where.category = q.category;
  if (q.brand) where.brand = q.brand;
  if (q.status) where.status = q.status;

  if (q.minPrice !== undefined && q.minPrice !== '') {
    where.price = { [Op.gte]: parseFloat(q.minPrice) };
  }
  if (q.maxPrice !== undefined && q.maxPrice !== '') {
    where.price = where.price || {};
    where.price[Op.lte] = parseFloat(q.maxPrice);
  }

  if (q.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${q.search}%` } },
      { sku: { [Op.iLike]: `%${q.search}%` } },
      { description: { [Op.iLike]: `%${q.search}%` } },
      { barcode: { [Op.iLike]: `%${q.search}%` } },
    ];
  }
  return where;
}

async function fetchRows(query) {
  const where = buildWhere(query);

  const rows = await Product.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { model: InventoryItem, as: 'inventoryItems', attributes: ['quantity','reservedQuantity'] },
    ],
  });

  return rows.map(p => {
    const json = p.toJSON();
    const stock = (json.inventoryItems || []).reduce((s, it) => s + (it.quantity || 0), 0);
    const reserved = (json.inventoryItems || []).reduce((s, it) => s + (it.reservedQuantity || 0), 0);
    return {
      sku: json.sku,
      name: json.name,
      category: json.category || '',
      brand: json.brand || '',
      unit: json.unit || '',
      price: json.price != null ? Number(json.price) : null,
      cost: json.cost != null ? Number(json.cost) : null,
      barcode: json.barcode || '',
      status: json.status || '',
      min: json.minStockLevel ?? null,
      reorder: json.reorderPoint ?? null,
      max: json.maxStockLevel ?? null,
      stock,
      reserved,
      available: stock - reserved,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      id: json.id,
    };
  });
}

/* ---------- CSV ---------- */
router.get('/export.csv', async (req, res) => {
  try {
    const rows = await fetchRows(req.query);
    const now = new Date();
    const filename = `products_${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const header = [
      'SKU','Nazwa','Kategoria','Marka','Jednostka',
      'Cena','Koszt','Barcode','Status',
      'Min','Reorder','Max',
      'Stan','Zarezerwowane','Dostępne',
      'ID','Utworzono','Zaktualizowano'
    ];

    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[,"\n;]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    };

    res.write('\uFEFF');
    res.write(header.join(';') + '\n');

    for (const r of rows) {
      const line = [
        r.sku, r.name, r.category, r.brand, r.unit,
        r.price != null ? r.price.toFixed(2) : '',
        r.cost != null ? r.cost.toFixed(2) : '',
        r.barcode, r.status,
        r.min, r.reorder, r.max,
        r.stock, r.reserved, r.available,
        r.id, r.createdAt?.toISOString() || '', r.updatedAt?.toISOString() || '',
      ].map(esc).join(';');
      res.write(line + '\n');
    }
    res.end();
  } catch (err) {
    console.error('products export.csv error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ---------- PDF ---------- */
router.get('/export.pdf', async (req, res) => {
  try {
    if (!PDFDocument) {
      return res.status(500).json({ success: false, error: 'PDF export not available (pdfkit not installed)' });
    }
    const rows = await fetchRows(req.query);
    const now = new Date();
    const filename = `products_${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.pipe(res);

    doc.fontSize(16).text('Produkty – raport', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#666').text(`Wygenerowano: ${now.toLocaleString()}`).fillColor('black');
    doc.moveDown(0.6);

    const cols = [
      { key: 'sku', label: 'SKU', width: 65 },
      { key: 'name', label: 'Nazwa', width: 140 },
      { key: 'category', label: 'Kategoria', width: 70 },
      { key: 'price', label: 'Cena', width: 45, align: 'right' },
      { key: 'stock', label: 'Stan', width: 40, align: 'right' },
      { key: 'available', label: 'Dostępne', width: 55, align: 'right' },
      { key: 'min', label: 'Min', width: 35, align: 'right' },
      { key: 'reorder', label: 'Reorder', width: 50, align: 'right' },
      { key: 'max', label: 'Max', width: 35, align: 'right' },
    ];

    doc.font('Helvetica-Bold').fontSize(9);
    let x = doc.page.margins.left;
    let y = doc.y;
    cols.forEach(c => { doc.text(c.label, x, y, { width: c.width, align: c.align || 'left' }); x += c.width + 6; });
    doc.moveDown(0.2);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.4);
    doc.font('Helvetica');

    const startX = doc.page.margins.left;
    for (const r0 of rows) {
      const r = { ...r0, price: r0.price != null ? r0.price.toFixed(2) : '' };
      x = startX; y = doc.y;
      cols.forEach(c => {
        let val = r[c.key] ?? '';
        if (c.key === 'name' && val.length > 40) val = val.slice(0, 37) + '…';
        doc.text(String(val), x, y, { width: c.width, align: c.align || 'left' });
        x += c.width + 6;
      });
      doc.moveDown(0.3);

      if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        doc.font('Helvetica-Bold');
        x = startX; y = doc.y;
        cols.forEach(c => { doc.text(c.label, x, y, { width: c.width, align: c.align || 'left' }); x += c.width + 6; });
        doc.moveDown(0.4);
        doc.font('Helvetica');
      }
    }

    doc.end();
  } catch (err) {
    console.error('products export.pdf error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;

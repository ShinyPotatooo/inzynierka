const express = require('express');
const router = express.Router();
const { Sequelize } = require('sequelize');
const { sequelize, InventoryItem, Product } = require('../models');

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch (e) { console.warn('[inventoryExport] pdfkit not installed'); }

/* ---------- helpers ---------- */
function buildWhereAndParams(q = {}) {
  const where = [];
  const params = {};
  const dialect = sequelize.getDialect();
  const likeExpr = dialect === 'postgres'
    ? (col) => `${col} ILIKE :term`
    : (col) => `LOWER(${col}) LIKE LOWER(:term)`;

  if (q.minQty !== undefined && q.minQty !== null && q.minQty !== '') {
    where.push(`i.quantity >= :minQty`); params.minQty = Number(q.minQty);
  }
  if (q.maxQty !== undefined && q.maxQty !== null && q.maxQty !== '') {
    where.push(`i.quantity <= :maxQty`); params.maxQty = Number(q.maxQty);
  }
  if (q.category) { where.push(`p.category = :category`); params.category = String(q.category); }
  if (q.brand)    { where.push(`p.brand = :brand`);       params.brand    = String(q.brand); }
  if (q.status)   { where.push(`p.status = :status`);     params.status   = String(q.status); }
  if (q.productId){ where.push(`p.id = :productId`);      params.productId= Number(q.productId); }

  if (q.search) {
    where.push(`(
      ${likeExpr('p.name')} OR
      ${likeExpr('p.sku')} OR
      ${likeExpr('p.barcode')} OR
      ${likeExpr('p.description')}
    )`);
    params.term = `%${String(q.search)}%`;
  }

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

function quoteTableName(model) {
  const qi = sequelize.getQueryInterface();
  const qg = qi && qi.queryGenerator;

  // nazwa tabeli może być stringiem albo obiektem { tableName, schema }
  const tn = model.getTableName();
  const tableName = typeof tn === 'object' ? tn.tableName : tn;
  const schema    = typeof tn === 'object' ? tn.schema    : undefined;

  if (qg && typeof qg.quoteTable === 'function') {
    // standardowy, przenośny sposób w Sequelize v6
    return qg.quoteTable({ tableName, schema });
  }

  // Fallback – ręczne cytowanie (gdyby queryGenerator nie był dostępny)
  const dialect = sequelize.getDialect();
  const q = (id) =>
    dialect === 'postgres'
      ? `"${String(id).replace(/"/g, '""')}"`
      : `\`${String(id).replace(/`/g, '``')}\``;

  return schema ? `${q(schema)}.${q(tableName)}` : q(tableName);
}

async function runQuery(query, { logLabel } = {}) {
  const itemsTable = quoteTableName(InventoryItem);
  const productsTable = quoteTableName(Product);
  const { whereSql, params } = buildWhereAndParams(query);

  const sql = `
    SELECT
      p.sku,
      p.name,
      COALESCE(p.category, '')  AS category,
      COALESCE(p.brand, '')     AS brand,
      COALESCE(p.unit, '')      AS unit,
      p.price,
      COALESCE(p.barcode, '')   AS barcode,
      p.status                  AS "productStatus",
      p."minStockLevel"         AS min,
      p."reorderPoint"          AS reorder,
      p."maxStockLevel"         AS max,
      i.quantity                AS stock,
      COALESCE(i."reservedQuantity", 0) AS reserved,
      (i.quantity - COALESCE(i."reservedQuantity",0)) AS available,
      i.id                      AS "itemId",
      i."createdAt",
      i."updatedAt"
    FROM ${itemsTable} AS i
    JOIN ${productsTable} AS p ON p."id" = i."productId"
    ${whereSql}
    ORDER BY i."createdAt" DESC
  `;

  try {
    const rows = await sequelize.query(sql, {
      type: Sequelize.QueryTypes.SELECT,
      replacements: params,
    });

    // normalizacja liczb
    return rows.map(r => ({
      ...r,
      price: r.price == null ? null : Number(r.price),
      min: r.min == null ? null : Number(r.min),
      reorder: r.reorder == null ? null : Number(r.reorder),
      max: r.max == null ? null : Number(r.max),
      stock: Number(r.stock || 0),
      reserved: Number(r.reserved || 0),
      available: Number(r.available || 0),
    }));
  } catch (err) {
    console.error(`\n[${logLabel || 'inventoryExport'}] RAW SQL ERROR`);
    console.error('Dialect:', sequelize.getDialect());
    console.error('SQL:\n', sql.trim());
    console.error('Replacements:', params);
    console.error('Message:', err?.message);
    throw err;
  }
}

/* ---------- DEBUG JSON ---------- */
// GET /api/inventory/export.debug
router.get('/export.debug', async (req, res) => {
  try {
    const rows = await runQuery(req.query, { logLabel: 'inventoryExport.debug' });
    res.json({ success: true, count: rows.length, rows });
  } catch (err) {
    const msg = isDev ? (err?.message || 'Internal error') : 'Internal server error';
    res.status(500).json({ success: false, error: msg });
  }
});

/* ---------- CSV ---------- */
router.get('/export.csv', async (req, res) => {
  try {
    const rows = await runQuery(req.query, { logLabel: 'inventoryExport.csv' });
    const now = new Date();
    const filename = `inventory_${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const header = [
      'SKU','Nazwa','Kategoria','Marka','Jednostka','Cena',
      'Barcode','Status produktu',
      'Min','Reorder','Max',
      'Stan','Zarezerwowane','Dostępne',
      'ID pozycji','Utworzono','Zaktualizowano'
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
        r.barcode, r.productStatus,
        r.min, r.reorder, r.max,
        r.stock, r.reserved, r.available,
        r.itemId,
        r.createdAt ? new Date(r.createdAt).toISOString() : '',
        r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
      ].map(esc).join(';');
      res.write(line + '\n');
    }
    res.end();
  } catch (err) {
    const msg = isDev ? (err?.message || 'Internal error') : 'Internal server error';
    res.status(500).json({ success: false, error: msg });
  }
});

/* ---------- PDF ---------- */
router.get('/export.pdf', async (req, res) => {
  try {
    if (!PDFDocument) {
      return res.status(500).json({ success: false, error: 'PDF export not available (pdfkit not installed)' });
    }
    const rows = await runQuery(req.query, { logLabel: 'inventoryExport.pdf' });

    const now = new Date();
    const filename = `inventory_${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.pipe(res);

    doc.fontSize(16).text('Stan magazynowy – raport', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#666').text(`Wygenerowano: ${now.toLocaleString()}`).fillColor('black');
    doc.moveDown(0.6);

    const cols = [
      { key: 'sku',       label: 'SKU',      width: 70 },
      { key: 'name',      label: 'Nazwa',    width: 140 },
      { key: 'category',  label: 'Kategoria',width: 70 },
      { key: 'stock',     label: 'Stan',     width: 40, align: 'right' },
      { key: 'reserved',  label: 'Zarezerw.',width: 55, align: 'right' },
      { key: 'available', label: 'Dostępne', width: 55, align: 'right' },
      { key: 'min',       label: 'Min',      width: 35, align: 'right' },
      { key: 'reorder',   label: 'Reorder',  width: 50, align: 'right' },
      { key: 'max',       label: 'Max',      width: 35, align: 'right' },
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
    for (const r of rows) {
      x = startX; y = doc.y;
      const row = {
        ...r,
        stock: String(r.stock ?? ''),
        reserved: String(r.reserved ?? ''),
        available: String(r.available ?? ''),
        min: String(r.min ?? ''),
        reorder: String(r.reorder ?? ''),
        max: String(r.max ?? ''),
      };
      cols.forEach(c => {
        let val = row[c.key] ?? '';
        if (c.key === 'name' && val.length > 40) val = val.slice(0, 37) + '…';
        doc.text(val, x, y, { width: c.width, align: c.align || 'left' });
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

    const totalQty = rows.reduce((s, r) => s + (r.stock || 0), 0);
    const totalAvail = rows.reduce((s, r) => s + (r.available || 0), 0);
    doc.moveDown(0.6);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text(`Razem sztuk: ${totalQty} | Razem dostępne: ${totalAvail}`);
    doc.end();
  } catch (err) {
    const msg = isDev ? (err?.message || 'Internal error') : 'Internal server error';
    res.status(500).json({ success: false, error: msg });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { sequelize, InventoryItem, Product } = require('../models');

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch (_) { console.warn('[inventoryExport] pdfkit not installed'); }

/* ---------- helpers: SQL ---------- */
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

  const tn = model.getTableName();
  const tableName = typeof tn === 'object' ? tn.tableName : tn;
  const schema    = typeof tn === 'object' ? tn.schema    : undefined;

  if (qg && typeof qg.quoteTable === 'function') {
    return qg.quoteTable({ tableName, schema });
  }

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

/* ---------- helpers: PDF (font + tabela) ---------- */
function registerFonts(doc) {
  const regular = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Regular.ttf');
  const bold    = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Bold.ttf');

  const hasRegular = fs.existsSync(regular);
  const hasBold    = fs.existsSync(bold);

  if (hasRegular) doc.registerFont('PL-Regular', regular);
  if (hasBold)    doc.registerFont('PL-Bold', bold);

  return {
    regular: hasRegular ? 'PL-Regular' : 'Helvetica',
    bold:    hasBold    ? 'PL-Bold'    : 'Helvetica-Bold',
  };
}

function drawTable(doc, cols, rows, opts = {}) {
  const padY = opts.padY ?? 4;
  const gapX = opts.gapX ?? 8;

  let x0 = doc.page.margins.left;
  let y  = opts.startY ?? doc.y;

  // header
  doc.font(opts.fonts.bold).fontSize(9);
  let x = x0;
  cols.forEach(c => {
    doc.text(c.label, x, y, { width: c.width, align: c.align || 'left' });
    x += c.width + gapX;
  });
  y = doc.y + 4;
  doc.moveTo(doc.page.margins.left, y)
     .lineTo(doc.page.width - doc.page.margins.right, y)
     .strokeColor('#ddd').stroke();
  y += 4;

  doc.font(opts.fonts.regular);

  const pageBottom = () => doc.page.height - doc.page.margins.bottom;

  for (const r of rows) {
    // compute cell heights
    const heights = cols.map(c => {
      let val = r[c.key] ?? '';
      if (c.truncate && typeof val === 'string' && val.length > c.truncate) {
        val = val.slice(0, c.truncate - 1) + '…';
      }
      return doc.heightOfString(String(val), { width: c.width, align: c.align || 'left' });
    });
    const rowH = Math.max(...heights, 10) + padY * 2;

    // page break
    if (y + rowH > pageBottom()) {
      doc.addPage();
      y = doc.page.margins.top;

      // repeat header
      doc.font(opts.fonts.bold).fontSize(9);
      x = x0;
      cols.forEach(c => {
        doc.text(c.label, x, y, { width: c.width, align: c.align || 'left' });
        x += c.width + gapX;
      });
      y = doc.y + 4;
      doc.moveTo(doc.page.margins.left, y)
         .lineTo(doc.page.width - doc.page.margins.right, y)
         .strokeColor('#ddd').stroke();
      y += 4;
      doc.font(opts.fonts.regular);
    }

    // draw row
    x = x0;
    cols.forEach(c => {
      let val = r[c.key] ?? '';
      if (c.truncate && typeof val === 'string' && val.length > c.truncate) {
        val = val.slice(0, c.truncate - 1) + '…';
      }
      doc.text(String(val), x, y + padY, { width: c.width, align: c.align || 'left' });
      x += c.width + gapX;
    });

    y += rowH;
  }

  // bottom line
  doc.moveTo(doc.page.margins.left, y)
     .lineTo(doc.page.width - doc.page.margins.right, y)
     .strokeColor('#eee').stroke();

  doc.y = y + 6;
}

/* ---------- DEBUG JSON ---------- */
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

    res.write('\uFEFF'); // BOM
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
    const rowsRaw = await runQuery(req.query, { logLabel: 'inventoryExport.pdf' });

    const rows = rowsRaw.map(r => ({
      ...r,
      stock:    r.stock ?? '',
      reserved: r.reserved ?? '',
      available:r.available ?? '',
      min:      r.min ?? '',
      reorder:  r.reorder ?? '',
      max:      r.max ?? '',
    }));

    const now = new Date();
    const filename = `inventory_${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.pipe(res);

    const fonts = registerFonts(doc);

    doc.font(fonts.bold).fontSize(22).text('Stan magazynowy – raport');
    doc.moveDown(0.2);
    doc.font(fonts.regular).fontSize(11).fillColor('#666')
       .text(`Wygenerowano: ${now.toLocaleString('pl-PL')}`)
       .fillColor('black');
    doc.moveDown(0.8);

    const cols = [
      { key: 'sku',       label: 'SKU',        width: 95,  truncate: 22 },
      { key: 'name',      label: 'Nazwa',      width: 200, truncate: 60 },
      { key: 'category',  label: 'Kategoria',  width: 110, truncate: 26 },
      { key: 'stock',     label: 'Stan',       width: 40,  align: 'right' },
      { key: 'reserved',  label: 'Zarezerw.',  width: 60,  align: 'right' },
      { key: 'available', label: 'Dostępne',   width: 60,  align: 'right' },
      { key: 'min',       label: 'Min',        width: 35,  align: 'right' },
      { key: 'reorder',   label: 'Reorder',    width: 50,  align: 'right' },
      { key: 'max',       label: 'Max',        width: 35,  align: 'right' },
    ];

    drawTable(doc, cols, rows, { fonts });

    const totalQty   = rowsRaw.reduce((s, r) => s + (r.stock || 0), 0);
    const totalAvail = rowsRaw.reduce((s, r) => s + (r.available || 0), 0);
    doc.moveDown(0.6);
    doc.font(fonts.bold).text(`Razem sztuk: ${totalQty} | Razem dostępne: ${totalAvail}`);

    doc.end();
  } catch (err) {
    const msg = isDev ? (err?.message || 'Internal error') : 'Internal server error';
    res.status(500).json({ success: false, error: msg });
  }
});

module.exports = router;

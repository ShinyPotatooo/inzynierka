// routes/operationsExport.js
const express = require('express');
const router = express.Router();
const { Sequelize } = require('sequelize');
const { sequelize, InventoryItem, Product, User } = require('../models');

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch (e) { console.warn('[operationsExport] pdfkit not installed'); }

/* ---------- helpers ---------- */
function likeExpr(col) {
  const dialect = sequelize.getDialect();
  return dialect === 'postgres' ? `${col} ILIKE :term` : `LOWER(${col}) LIKE LOWER(:term)`;
}

function likeUser(col) {
  const dialect = sequelize.getDialect();
  return dialect === 'postgres' ? `${col} ILIKE :userq` : `LOWER(${col}) LIKE LOWER(:userq)`;
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
    dialect === 'postgres' ? `"${String(id).replace(/"/g, '""')}"` : `\`${String(id).replace(/`/g, '``')}\``;
  return schema ? `${q(schema)}.${q(tableName)}` : q(tableName);
}

function buildWhereAndParams(q = {}) {
  const where = [];
  const params = {};

  // produkt (nazwa / SKU)
  if (q.search) {
    where.push(`(${likeExpr('p.name')} OR ${likeExpr('p.sku')})`);
    params.term = `%${String(q.search)}%`;
  }

  // typ operacji
  if (q.type && q.type !== 'any') {
    where.push(`o."operationType" = :type`);
    params.type = String(q.type);
  }

  // użytkownik (imię/nazwisko/login/email)
  if (q.user) {
    where.push(`(${likeUser('u.username')} OR ${likeUser('u.email')} OR ${likeUser('u."firstName"')} OR ${likeUser('u."lastName"')})`);
    params.userq = `%${String(q.user)}%`;
  }

  // zakres dat
  if (q.dateFrom) {
    where.push(`o."operationDate" >= :dateFrom`);
    params.dateFrom = new Date(q.dateFrom);
  }
  if (q.dateTo) {
    // < północ dnia następnego
    const d = new Date(q.dateTo);
    const to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    where.push(`o."operationDate" < :dateTo`);
    params.dateTo = to;
  }

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function runQuery(query, { logLabel } = {}) {
  const itemsTable = quoteTableName(InventoryItem);
  const productsTable = quoteTableName(Product);
  const usersTable = quoteTableName(User);
  const operationsTable = sequelize.getQueryInterface().queryGenerator.quoteTable('inventory_operations');

  const { whereSql, params } = buildWhereAndParams(query);

  const sql = `
    SELECT
      o.id,
      o."operationType"      AS type,
      o.quantity,
      o."quantityBefore",
      o."quantityAfter",
      o."fromLocation",
      o."toLocation",
      o."referenceNumber",
      o."referenceType",
      o.notes,
      o."operationDate"      AS date,
      p.sku                  AS "productSku",
      p.name                 AS "productName",
      u.username,
      u."firstName",
      u."lastName",
      i.location             AS "itemLocation",
      i."batchNumber"
    FROM ${operationsTable} AS o
    LEFT JOIN ${productsTable}  AS p ON p."id" = o."productId"
    LEFT JOIN ${usersTable}     AS u ON u."id" = o."userId"
    LEFT JOIN ${itemsTable}     AS i ON i."id" = o."inventoryItemId"
    ${whereSql}
    ORDER BY o."operationDate" DESC, o."id" DESC
  `;

  try {
    const rows = await sequelize.query(sql, {
      type: Sequelize.QueryTypes.SELECT,
      replacements: params,
    });

    return rows.map(r => ({
      ...r,
      quantity: Number(r.quantity || 0),
      quantityBefore: r.quantityBefore == null ? null : Number(r.quantityBefore),
      quantityAfter:  r.quantityAfter  == null ? null : Number(r.quantityAfter),
      fullUser: ((r.firstName || r.lastName) ? `${r.firstName || ''} ${r.lastName || ''}`.trim() : r.username || ''),
      product: r.productName ? `${r.productName} (${r.productSku || ''})`.trim() : (r.productSku || ''),
      locBatch: [r.itemLocation, r.batchNumber].filter(Boolean).join(' / ') || '—',
    }));
  } catch (err) {
    console.error(`\n[${logLabel || 'operationsExport'}] RAW SQL ERROR`);
    console.error('Dialect:', sequelize.getDialect());
    console.error('SQL:\n', sql.trim());
    console.error('Replacements:', params);
    console.error('Message:', err?.message);
    throw err;
  }
}

/* ---------- CSV ---------- */
router.get('/export.csv', async (req, res) => {
  try {
    const rows = await runQuery(req.query, { logLabel: 'operationsExport.csv' });

    const now = new Date();
    const filename = `operations_${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const header = [
      'Data','Produkt','Typ','Ilość','Użytkownik','Pozycja','Notatki',
      'Od','Do','Stan przed','Stan po','Ref. typ','Ref. nr','ID operacji'
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
        r.date ? new Date(r.date).toLocaleString() : '',
        r.product,
        r.type,
        r.quantity,
        r.fullUser,
        r.locBatch,
        r.notes || '',
        r.fromLocation || '',
        r.toLocation || '',
        r.quantityBefore ?? '',
        r.quantityAfter ?? '',
        r.referenceType || '',
        r.referenceNumber || '',
        r.id,
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
    const rows = await runQuery(req.query, { logLabel: 'operationsExport.pdf' });

    const now = new Date();
    const filename = `operations_${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });

    // czcionka (NotoSans – jeśli pobrana przez postinstall)
    try {
      const path = require('path');
      doc.registerFont('NotoSans', path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Regular.ttf'));
      doc.registerFont('NotoSans-Bold', path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Bold.ttf'));
      doc.font('NotoSans');
    } catch { /* zostanie Helvetica */ }

    doc.pipe(res);

    doc.font('NotoSans-Bold').fontSize(16).text('Operacje magazynowe — raport', { align: 'left' });
    doc.font('NotoSans').moveDown(0.2);
    doc.fontSize(10).fillColor('#666').text(`Wygenerowano: ${now.toLocaleString()}`).fillColor('black');
    doc.moveDown(0.6);

    const cols = [
      { key: 'date',     label: 'Data',       width: 105 },
      { key: 'product',  label: 'Produkt',    width: 170 },
      { key: 'type',     label: 'Typ',        width: 60 },
      { key: 'quantity', label: 'Ilość',      width: 40, align: 'right' },
      { key: 'fullUser', label: 'Użytkownik', width: 120 },
      { key: 'locBatch', label: 'Pozycja',    width: 95 },
      { key: 'notes',    label: 'Notatki',    width: 160 },
    ];

    // header
    doc.font('NotoSans-Bold').fontSize(9);
    let x = doc.page.margins.left;
    let y = doc.y;
    cols.forEach(c => { doc.text(c.label, x, y, { width: c.width, align: c.align || 'left' }); x += c.width + 6; });
    doc.moveDown(0.2);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.4);
    doc.font('NotoSans');

    const startX = doc.page.margins.left;
    for (const r0 of rows) {
      const r = {
        ...r0,
        date: r0.date ? new Date(r0.date).toLocaleString() : '',
        quantity: String(r0.quantity ?? ''),
        product: (r0.product || '').length > 36 ? (r0.product || '').slice(0, 33) + '…' : (r0.product || ''),
        notes: (r0.notes || '').length > 60 ? (r0.notes || '').slice(0, 57) + '…' : (r0.notes || ''),
      };

      x = startX; y = doc.y;
      cols.forEach(c => {
        doc.text(r[c.key] ?? '', x, y, { width: c.width, align: c.align || 'left' });
        x += c.width + 6;
      });
      doc.moveDown(0.3);

      if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        doc.font('NotoSans-Bold');
        x = startX; y = doc.y;
        cols.forEach(c => { doc.text(c.label, x, y, { width: c.width, align: c.align || 'left' }); x += c.width + 6; });
        doc.moveDown(0.4);
        doc.font('NotoSans');
      }
    }

    doc.end();
  } catch (err) {
    const msg = isDev ? (err?.message || 'Internal error') : 'Internal server error';
    res.status(500).json({ success: false, error: msg });
  }
});

module.exports = router;

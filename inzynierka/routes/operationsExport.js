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

  if (q.search) {
    where.push(`(${likeExpr('p.name')} OR ${likeExpr('p.sku')})`);
    params.term = `%${String(q.search)}%`;
  }
  if (q.type && q.type !== 'any') {
    where.push(`o."operationType" = :type`);
    params.type = String(q.type);
  }
  if (q.user) {
    where.push(`(${likeUser('u.username')} OR ${likeUser('u.email')} OR ${likeUser('u."firstName"')} OR ${likeUser('u."lastName"')})`);
    params.userq = `%${String(q.user)}%`;
  }
  if (q.dateFrom) {
    where.push(`o."operationDate" >= :dateFrom`);
    params.dateFrom = new Date(q.dateFrom);
  }
  if (q.dateTo) {
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
      product: r.productName ? `${r.productName}${r.productSku ? ` (${r.productSku})` : ''}` : (r.productSku || ''),
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

/* Sanitizacja tekstu do PDF – usuwamy znaki sterujące (poza \n) i normalizujemy CRLF */
function sanitizeText(v) {
  if (v == null) return '';
  let s = String(v);
  s = s.replace(/\r\n?/g, '\n');                  // CRLF/CR → LF
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); // control chars
  return s;
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
        r.date ? new Date(r.date).toLocaleString('pl-PL') : '',
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

/* ---------- PDF (poprawiony renderer) ---------- */
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

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, left: 40, right: 40, bottom: 52 },
      bufferPages: true,
    });

    // czcionki
    try {
      const path = require('path');
      doc.registerFont('NotoSans', path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Regular.ttf'));
      doc.registerFont('NotoSans-Bold', path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Bold.ttf'));
      doc.font('NotoSans');
    } catch { /* fallback: Helvetica */ }

    doc.pipe(res);

    // nagłówek
    doc.font('NotoSans-Bold').fontSize(18).text('Operacje magazynowe — raport', { align: 'left' });
    doc.moveDown(0.15);
    doc.font('NotoSans').fontSize(10).fillColor('#666')
       .text(`Wygenerowano: ${now.toLocaleString('pl-PL')}`)
       .fillColor('#000');
    doc.moveDown(0.5);

    // parametry tabeli
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const gutter = 8;
    const columns = [
      { key: 'date',     label: 'Data',       ratio: 0.16, align: 'left'  },
      { key: 'product',  label: 'Produkt',    ratio: 0.25, align: 'left'  }, // lekko ciaśniej
      { key: 'type',     label: 'Typ',        ratio: 0.14, align: 'left'  }, // szerzej + 1 linia
      { key: 'quantity', label: 'Ilość',      ratio: 0.06, align: 'right' },
      { key: 'fullUser', label: 'Użytkownik', ratio: 0.16, align: 'left'  },
      { key: 'locBatch', label: 'Pozycja',    ratio: 0.11, align: 'left'  },
      { key: 'notes',    label: 'Notatki',    ratio: 0.12, align: 'left'  },
    ];
    const guttersTotal = gutter * (columns.length - 1);
    const tableWidth = pageWidth - guttersTotal;
    columns.forEach(c => { c.width = Math.floor(tableWidth * c.ratio); });

    const padX = 4;
    const padY = 4;
    const rowFont = 10;
    let y = doc.y;

    const drawHeader = () => {
      let x = doc.page.margins.left;
      doc.rect(x, y, pageWidth, 22).fill('#eef2f7').fillColor('#000');
      columns.forEach((c, i) => {
        doc.font('NotoSans-Bold').fontSize(10)
           .text(c.label, x + padX, y + 5, { width: c.width, align: c.align || 'left' });
        x += c.width + (i < columns.length - 1 ? gutter : 0);
      });
      y += 24;
      doc.moveTo(doc.page.margins.left, y - 2)
         .lineTo(doc.page.width - doc.page.margins.right, y - 2)
         .lineWidth(0.5).strokeColor('#d8dde6').stroke();
    };

    drawHeader();

    for (const r0 of rows) {
      const r = {
        date: r0.date ? new Date(r0.date).toLocaleString('pl-PL') : '',
        product: sanitizeText(r0.product || ''),
        type: sanitizeText(r0.type || ''),
        quantity: String(r0.quantity ?? ''),
        fullUser: sanitizeText(r0.fullUser || ''),
        locBatch: sanitizeText(r0.locBatch || ''),
        notes: sanitizeText(r0.notes || ''),
      };

      // wysokość wiersza (dla "type" nie łamiemy linii)
      const heights = columns.map(c => {
        return doc.font('NotoSans').fontSize(rowFont).heightOfString(r[c.key], {
          width: c.width - padX * 2,
          align: c.align === 'right' ? 'right' : 'left',
          lineBreak: c.key === 'type' ? false : true, // typ zawsze 1 linia
        });
      });
      const rowH = Math.max(16, Math.ceil(Math.max(...heights)) + padY * 2);

      // nowa strona?
      const bottom = doc.page.height - doc.page.margins.bottom;
      if (y + rowH > bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }

      // tło
      doc.rect(doc.page.margins.left, y, pageWidth, rowH).fillOpacity(0.03).fill('#6b7280').fillOpacity(1);

      // komórki
      let x = doc.page.margins.left;
      columns.forEach((c, i) => {
        const opts = {
          width: c.width - padX * 2,
          align: c.align || 'left',
          ellipsis: true,
          lineBreak: c.key === 'type' ? false : true, // "adjustment" nie łamie się
        };
        doc.font('NotoSans').fontSize(rowFont).fillColor('#000')
           .text(r[c.key], x + padX, y + padY, opts);
        x += c.width + (i < columns.length - 1 ? gutter : 0);
      });

      y += rowH;
    }

    // stopka – numery stron
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      const footer = `Strona ${i + 1} / ${range.count}`;
      doc.font('NotoSans').fontSize(9).fillColor('#666')
        .text(footer, doc.page.margins.left, doc.page.height - 36, {
          width: pageWidth, align: 'right',
        });
    }

    doc.end();
  } catch (err) {
    const msg = isDev ? (err?.message || 'Internal error') : 'Internal server error';
    res.status(500).json({ success: false, error: msg });
  }
});

module.exports = router;

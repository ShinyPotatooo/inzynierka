// src/services/download.js
import API from './api';

function filenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const m = /filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i.exec(disposition);
  return m ? decodeURIComponent(m[2]) : fallback;
}

function cleanParams(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

/* -------- INVENTORY -------- */
export async function downloadInventoryCSV(params = {}) {
  const res = await API.get('/inventory/export.csv', {
    params: cleanParams(params),
    responseType: 'blob',
  });
  const fallback = `inventory_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  const filename = filenameFromDisposition(res.headers?.['content-disposition'], fallback);
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function downloadInventoryPDF(params = {}) {
  const res = await API.get('/inventory/export.pdf', {
    params: cleanParams(params),
    responseType: 'blob',
  });
  const fallback = `inventory_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
  const filename = filenameFromDisposition(res.headers?.['content-disposition'], fallback);
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* -------- PRODUCTS -------- */
export async function downloadProductsCSV(params = {}) {
  const res = await API.get('/products/export.csv', {
    params: cleanParams(params),
    responseType: 'blob',
  });
  const fallback = `products_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  const filename = filenameFromDisposition(res.headers?.['content-disposition'], fallback);
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function downloadProductsPDF(params = {}) {
  const res = await API.get('/products/export.pdf', {
    params: cleanParams(params),
    responseType: 'blob',
  });
  const fallback = `products_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
  const filename = filenameFromDisposition(res.headers?.['content-disposition'], fallback);
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* -------- OPERATIONS (NOWE) -------- */
// Eksportuje pełny zestaw wg filtrów: search, type, user, dateFrom, dateTo
export async function downloadOperationsCSV(params = {}) {
  const res = await API.get('/inventory/operations/export.csv', {
    params: cleanParams(params),
    responseType: 'blob',
  });
  const fallback = `operations_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  const filename = filenameFromDisposition(res.headers?.['content-disposition'], fallback);
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function downloadOperationsPDF(params = {}) {
  const res = await API.get('/inventory/operations/export.pdf', {
    params: cleanParams(params),
    responseType: 'blob',
  });
  const fallback = `operations_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
  const filename = filenameFromDisposition(res.headers?.['content-disposition'], fallback);
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

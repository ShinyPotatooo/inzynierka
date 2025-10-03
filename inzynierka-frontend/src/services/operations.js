// src/services/operations.js
import API from './api';

/**
 * Pobiera operacje magazynowe z filtrami i paginacją.
 * params: { page?, limit?, operationType?, userId?, productId?, startDate?, endDate? }
 */
export async function fetchOperations(params = {}) {
  const res = await API.get('/inventory/operations', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 25,
      operationType: params.operationType || undefined,
      userId: params.userId || params.performedBy || undefined,
      productId: params.productId || undefined,
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
    },
  });
  if (!res.data?.success) {
    throw new Error(res.data?.error || 'Błąd pobierania operacji');
  }
  const { operations, pagination } = res.data.data || {};
  return {
    items: operations || [],
    pagination:
      pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: params.limit ?? 25 },
  };
}

/** Eksport CSV w tym samym układzie kolumn, co tabela na stronie */
export async function exportOperationsCSV(params = {}) {
  const max = Math.max(Number(params.limit || 0), 2000);
  const { items } = await fetchOperations({ ...params, page: 1, limit: max });

  const headers = [
    'Data',
    'Produkt',
    'Typ',
    'Ilość',
    'Użytkownik',
    'Pozycja',
    'Notatki',
  ];

  const rows = items.map((op) => {
    const before = op?.quantityBefore ?? 0;
    const after  = op?.quantityAfter ?? 0;
    const delta  = (op?.quantity ?? (after - before)) ?? 0;
    const qtyStr = `${before} → ${after} (${delta >= 0 ? '+' : ''}${delta})`;

    const prod = `${op?.product?.name || ''}${op?.product?.sku ? ` (${op.product.sku})` : ''}`.trim();
    const user =
      [op?.user?.firstName, op?.user?.lastName].filter(Boolean).join(' ') ||
      op?.user?.username ||
      op?.userId ||
      '';

    return [
      new Date(op.operationDate).toISOString(),
      prod,
      op.operationType || '',
      qtyStr,
      user,
      op?.inventoryItem?.location || '',
      (op?.notes || '').replace(/\r?\n/g, ' ').slice(0, 500),
    ];
  });

  const csv = [headers, ...rows].map((r) =>
    r
      .map((v) => {
        const s = String(v ?? '');
        if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      })
      .join(';')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `operations_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

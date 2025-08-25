// src/services/notifications.js
import API from './api';

export async function listNotifications(params = {}) {
  const res = await API.get('/notifications', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      type: params.type || undefined,
      priority: params.priority || undefined,
      isRead: params.isRead ?? undefined,
      targetRole: params.targetRole || undefined,
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
    },
  });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania powiadomień');
  const { notifications, pagination } = res.data.data || {};
  return {
    notifications: notifications || [],
    pagination:
      pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: params.limit ?? 20 },
  };
}

export async function markNotificationRead(id) {
  const res = await API.patch(`/notifications/${id}/read`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd oznaczenia jako przeczytane');
  return res.data.data.notification;
}

export async function markAllRead(targetRole) {
  const res = await API.patch('/notifications/read-all', {}, { params: { targetRole } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd masowego oznaczenia jako przeczytane');
  return true;
}

export async function deleteNotification(id) {
  const res = await API.delete(`/notifications/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd usuwania powiadomienia');
  return true;
}

export async function getUnreadCount(targetRole) {
  const res = await API.get('/notifications/unread/count', { params: { targetRole } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania licznika');
  return res.data?.data?.unreadCount ?? 0;
}

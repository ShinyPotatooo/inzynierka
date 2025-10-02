// src/services/notifications.js
import API from './api';

const BASE = '/notifications';

export async function listNotifications({
  page = 1,
  limit = 20,
  type,
  priority,
  isRead,   // boolean|undefined
  role = 'all',
  userId,
  includeResolved = false, // domyślnie pomijamy resolved
}) {
  const params = { page, limit, role, userId };
  if (type) params.type = type;
  if (priority) params.priority = priority;
  if (typeof isRead === 'boolean') params.isRead = isRead;
  if (includeResolved) params.includeResolved = 1;

  const { data } = await API.get(BASE, { params });
  const notifications = (data?.data?.notifications ?? []).map(n => ({
    ...n,
    isReadForUser: n.isReadForUser ?? Boolean(n.isRead),
  }));
  return { notifications, pagination: data?.data?.pagination };
}

export async function getUnreadCount({ userId, role = 'all' }) {
  const { data } = await API.get(`${BASE}/unread/count`, { params: { userId, role } });
  return data?.data?.count ?? 0;
}

export async function markNotificationRead(id, userId) {
  const { data } = await API.patch(`${BASE}/${id}/read`, { userId });
  return data.data;
}

export async function markNotificationUnread(id, userId) {
  const { data } = await API.patch(`${BASE}/${id}/unread`, { userId });
  return data.data;
}

export async function markAllRead(userId, role = 'all') {
  const { data } = await API.post(`${BASE}/mark-all-read`, { userId, role });
  return data.data;
}

export async function getNotification(id, { userId, role = 'all', markRead = false } = {}) {
  const params = { userId, role };
  if (markRead) params.markRead = 1;
  const { data } = await API.get(`/notifications/${id}`, { params });
  return data?.data?.notification;
}

/** Ręczne tworzenie powiadomienia (admin/manager) */
export async function createSystemMessage({
  authorId,
  role, // 'admin' | 'manager'
  title,
  message,
  priority = 'medium',
  // typ jest wymuszany po stronie backendu: admin_message / manager_message
  targetRole = 'all', // 'admin'|'manager'|'worker'|'all'  (opcjonalne, gdy brak targetUserId)
  targetUserId,       // opcjonalnie: pojedynczy odbiorca (wybierany po nazwie na UI)
  productId,          // opcjonalnie: powiązanie z produktem
  scheduledAt,        // opcjonalnie: data przyszła (ISO/string)
  metadata,           // opcjonalnie
}) {
  const { data } = await API.post('/notifications', {
    authorId, role, title, message, priority,
    targetRole, targetUserId, productId, scheduledAt, metadata,
  });
  if (!data?.success) throw new Error(data?.error || 'Błąd tworzenia powiadomienia');
  return data?.data?.notification;
}

/* Opcjonalnie, jeśli korzystasz:
export async function updateNotification(id, payload) {
  const { data } = await API.patch(`/notifications/${id}`, payload);
  return data?.data?.notification;
}

export async function deleteNotification(id, role) {
  const { data } = await API.delete(`/notifications/${id}`, { data: { role } });
  return data?.data;
}
*/

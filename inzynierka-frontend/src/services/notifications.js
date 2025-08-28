// inzynierka-frontend/src/services/notifications.js
import API from './api';

const BASE = '/notifications';

export async function listNotifications({
  page = 1,
  limit = 20,
  type,
  priority,
  isRead,
  role = 'all',
  userId,
}) {
  const params = { page, limit, role, userId };
  if (type) params.type = type;
  if (priority) params.priority = priority;
  if (typeof isRead === 'boolean') params.isRead = isRead;

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

export async function dismissNotification(id, userId) {
  const { data } = await API.post(`${BASE}/${id}/dismiss`, { userId });
  return data.data;
}

export async function deleteNotificationGlobal(id, role = 'worker') {
  const { data } = await API.delete(`${BASE}/${id}`, { params: { role } });
  return data.data;
}
export const deleteNotification = deleteNotificationGlobal;

export async function markAllRead(userId, role = 'all') {
  const { data } = await API.post(`${BASE}/mark-all-read`, { userId, role });
  return data.data;
}

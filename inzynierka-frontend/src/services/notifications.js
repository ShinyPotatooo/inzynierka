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
  includeResolved = false,
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

/** (pozostawione – jeżeli gdzieś używasz) */
export async function createSystemMessage(payload) {
  const { data } = await API.post('/notifications', payload);
  return data?.data?.notification;
}

/** ➕ NOWE: wiadomość admin/manager – typ ustawiany automatycznie na backendzie */
export async function composeAdminManagerMessage({ title, message, priority = 'medium', audience = 'all', recipientId = null }) {
  const { data } = await API.post('/notifications/admin-message', {
    title, message, priority, audience, recipientId,
  });
  if (!data?.success) throw new Error(data?.error || 'Błąd tworzenia powiadomienia');
  return data?.data?.notification;
}

const BASE = 'https://os-api.esc68-os.workers.dev';

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const d = await res.json(); msg = d.message || d.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

const api = {
  get:    (path)       => req(path),
  post:   (path, body) => req(path, { method: 'POST',  body: body != null ? JSON.stringify(body) : undefined }),
  patch:  (path, body) => req(path, { method: 'PATCH', body: body != null ? JSON.stringify(body) : undefined }),
  delete: (path)       => req(path, { method: 'DELETE' }),
};

export function photoUrl(key) { return `${BASE}/upload/photo/${key}`; }

// Auth
export const getMe     = ()    => api.get('/auth/me');
export const postLogout = ()   => api.post('/auth/logout');
export const loginUrl  = ()    => `${BASE}/auth/google`;

// Items
export const getItems       = (cat)       => api.get(`/items${cat ? '?category=' + encodeURIComponent(cat) : ''}`);
export const getItem        = (id)        => api.get(`/items/${id}`);
export const createItem     = (data)      => api.post('/items', data);
export const updateItem     = (id, data)  => api.patch(`/items/${id}`, data);
export const deleteItem     = (id)        => api.delete(`/items/${id}`);
export const getStockLogs   = (id)        => api.get(`/items/${id}/stock/logs`);
export const addStock       = (id, data)  => api.post(`/items/${id}/stock/add`, data);
export const removeStock    = (id, data)  => api.post(`/items/${id}/stock/remove`, data);
export const sendToRepair   = (id, data)  => api.post(`/items/${id}/stock/repair`, data);
export const restoreRepair  = (id, data)  => api.post(`/items/${id}/stock/restore`, data);

// Projects
export const getProjects    = ()          => api.get('/projects');
export const getProject     = (id)        => api.get(`/projects/${id}`);
export const createProject  = (data)      => api.post('/projects', data);
export const updateProject  = (id, data)  => api.patch(`/projects/${id}`, data);
export const deleteProject  = (id)        => api.delete(`/projects/${id}`);

// Requests
export const getRequests       = (status)       => api.get(`/requests${status ? '?status=' + status : ''}`);
export const getRequest        = (id)           => api.get(`/requests/${id}`);
export const createRequest     = (data)         => api.post('/requests', data);
export const addRequestItem    = (id, data)     => api.post(`/requests/${id}/items`, data);
export const removeRequestItem = (id, itemId)   => api.delete(`/requests/${id}/items/${itemId}`);
export const submitRequest     = (id)           => api.post(`/requests/${id}/submit`);
export const cancelRequest     = (id)           => api.patch(`/requests/${id}/cancel`);
export const rejectRequest     = (id, data)     => api.patch(`/requests/${id}/reject`, data);
export const processRequest    = (id, data)     => api.patch(`/requests/${id}/process`, data);
export const tickItem          = (id, itemId)   => api.patch(`/requests/${id}/items/${itemId}/tick`);
export const markReady         = (id)           => api.patch(`/requests/${id}/ready`);
export const confirmPickup     = (id)           => api.patch(`/requests/${id}/pickup`);
export const getRequestReturns = (id)           => api.get(`/requests/${id}/returns`);
export const submitReturn      = (id, data)     => api.post(`/requests/${id}/returns`, data);

// Returns (admin)
export const getAllReturns  = (status) => api.get(`/returns${status ? '?status=' + status : ''}`);
export const confirmReturn  = (id)        => api.patch(`/returns/${id}/confirm`);
export const rejectReturn   = (id, data)  => api.patch(`/returns/${id}/reject`, data);

// Notifications
export const getNotifications = (page, limit) => api.get(`/notifications?page=${page}&limit=${limit}`);
export const markNotifRead    = (id)           => api.patch(`/notifications/${id}/read`);
export const markAllRead      = ()             => api.patch('/notifications/read-all');

// Users (admin)
export const getUsers      = (role) => api.get(`/users${role ? '?role=' + role : ''}`);
export const updateUserRole = (id, role) => api.patch(`/users/${id}/role`, { role });

// Upload
export async function uploadPhoto(file) {
  const { r2Key, uploadPath } = await api.post('/upload/presign');
  await fetch(BASE + uploadPath, {
    method: 'PUT', credentials: 'include',
    headers: { 'Content-Type': file.type }, body: file,
  });
  return r2Key;
}

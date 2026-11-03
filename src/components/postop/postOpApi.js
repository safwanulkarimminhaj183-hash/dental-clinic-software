// API helper for the Post-Op Recovery module. Mirrors the auth convention used in
// PatientRecords.jsx (Bearer token, with the dev sandbox key when no one is signed in).
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const apiRequest = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('token');
  // The demo-login placeholder token is not a real JWT; fall back to the dev sandbox key like the rest of the app
  if (token && token !== 'demo-jwt-token-authenticated') headers.Authorization = `Bearer ${token}`;
  else headers['x-admin-key'] = 'dentocare_admin_sandbox_key_2026';

  for (const url of [path, `${BASE}${path}`]) {
    try {
      const res = await fetch(url, { ...options, headers });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      // A non-JSON answer from the Vite dev server means the proxy path missed; try the API origin
      if (data === null && url === path) continue;
      return { ok: res.ok, status: res.status, data };
    } catch { /* try next URL */ }
  }
  return { ok: false, status: 0, data: { message: 'Unable to reach the server. Check that the backend is running.' } };
};

const R = '/api/v1/post-op-recovery';
export const recoveryApi = {
  list: (params) => apiRequest(`${R}?${new URLSearchParams(params)}`),
  followUps: () => apiRequest(`${R}/follow-ups`),
  get: (id) => apiRequest(`${R}/${id}`),
  create: (body) => apiRequest(R, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => apiRequest(`${R}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  followUp: (id, body) => apiRequest(`${R}/${id}/follow-up`, { method: 'PATCH', body: JSON.stringify(body) }),
  archive: (id, reason) => apiRequest(`${R}/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  restore: (id) => apiRequest(`${R}/${id}/restore`, { method: 'PATCH' }),
  patients: () => apiRequest('/api/v1/patient-records'),
  dentists: () => apiRequest('/api/v1/specialists?limit=100'),
};

export const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : '—');
export const toInputDate = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

export const isOverdue = (r) =>
  !!r.followUpDate && r.recoveryStatus !== 'Completed' && !['Completed', 'Not Required'].includes(r.followUpStatus) &&
  new Date(r.followUpDate) < new Date(new Date().setHours(0, 0, 0, 0));

export const STATUS_STYLES = {
  Recovering: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50',
  'Needs Attention': 'bg-amber-950/60 text-amber-300 border-amber-800/50',
  Completed: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
};

// UI-only role hint (the server enforces real authorization). Sandbox/demo sessions behave as super_admin.
export const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token || token === 'demo-jwt-token-authenticated') return 'super_admin';
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.role || u.user?.role || 'receptionist';
  } catch { return 'receptionist'; }
};
export const CLINICAL_WRITE_ROLES = ['super_admin', 'admin', 'doctor'];
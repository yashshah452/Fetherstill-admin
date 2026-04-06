const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const withAuth = (token, extra = {}) => ({
  ...extra,
  Authorization: `Bearer ${token}`,
});

export const checkAdminAccess = async (token) => {
  const res = await fetch(`${API_BASE}/api/firmware/me`, {
    method: 'GET',
    headers: withAuth(token),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

export const uploadFirmwareFile = async ({ token, version, changelog, file }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('version', version);
  formData.append('changelog', changelog || '');

  const res = await fetch(`${API_BASE}/api/firmware/upload`, {
    method: 'POST',
    headers: withAuth(token),
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

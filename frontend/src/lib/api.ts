const TOKEN_KEY = 'absen_admin_token';
const USER_KEY = 'absen_admin_user';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getSchoolSlug(): string | null {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return null;
  const parts = host.split('.');
  if (parts.length >= 3) return parts[0];
  return null;
}

async function request<T = any>(
  method: string,
  path: string,
  body?: any,
  opts?: { public?: boolean }
): Promise<{ success: boolean; data?: T; error?: string }> {
  const headers: Record<string, string> = {};

  if (!opts?.public) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const slug = getSchoolSlug();
  if (slug) headers['X-School-Slug'] = slug;

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(path, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok && res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = '/#/login';
      return { success: false, error: 'Sesi habis. Silakan login ulang.' };
    }

    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal terhubung ke server.' };
  }
}

export const api = {
  get: <T = any>(path: string, opts?: { public?: boolean }) =>
    request<T>('GET', path, undefined, opts),

  post: <T = any>(path: string, body?: any, opts?: { public?: boolean }) =>
    request<T>('POST', path, body, opts),

  put: <T = any>(path: string, body?: any, opts?: { public?: boolean }) =>
    request<T>('PUT', path, body, opts),

  del: <T = any>(path: string, opts?: { public?: boolean }) =>
    request<T>('DELETE', path, undefined, opts),

  getSchoolSlug,
};

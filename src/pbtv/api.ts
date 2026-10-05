export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  let json: ApiResult<T>;
  try {
    json = (await res.json()) as ApiResult<T>;
  } catch {
    throw new PbError(res.status, 'BAD_RESPONSE', `Unexpected server response (${res.status}).`);
  }
  if (!json.ok) throw new PbError(res.status, json.error.code, json.error.message);
  return json.data;
}

export class PbError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const get = <T = unknown>(path: string) => api<T>(path);
export const post = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const patch = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
export const put = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });
export const del = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, { method: 'DELETE', body: JSON.stringify(body ?? {}) });

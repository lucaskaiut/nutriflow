import Constants from 'expo-constants';

/**
 * Cliente HTTP da API. A URL vem de EXPO_PUBLIC_API_URL (nenhuma credencial fica no app;
 * o único segredo é o token de sessão da pessoa, guardado no SecureStore).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:8090/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** Primeira mensagem de validação de um campo (aceita prefixos como "items.0"). */
  field(name: string): string | undefined {
    if (this.errors[name]) return this.errors[name][0];
    const key = Object.keys(this.errors).find((k) => k.startsWith(`${name}.`));
    return key ? this.errors[key][0] : undefined;
  }

  get firstError(): string {
    const first = Object.values(this.errors)[0]?.[0];
    return first ?? this.message;
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const session = {
  setToken(value: string | null) {
    token = value;
  },
  getToken() {
    return token;
  },
  onUnauthorized(handler: () => void) {
    onUnauthorized = handler;
  },
};

type Options = { method?: string; body?: unknown; query?: Record<string, string | number | boolean | null | undefined>; form?: FormData };

export async function request<T>(path: string, { method = 'GET', body, query, form }: Options = {}): Promise<{ data: T; message: string | null; meta?: any }> {
  const qs = query
    ? '?' + Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
    : '';

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}${qs === '?' ? '' : qs}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(form ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError('Sem conexão com o servidor. Verifique sua internet e tente novamente.', 0);
  }

  const json = await response.json().catch(() => null);

  if (!response.ok || json?.success === false) {
    if (response.status === 401 && token) onUnauthorized?.();
    const fallback =
      response.status === 429 ? 'Muitas tentativas. Aguarde um instante.' : response.status >= 500 ? 'Erro no servidor. Tente novamente em instantes.' : 'Não foi possível concluir a operação.';
    throw new ApiError(json?.message ?? fallback, response.status, json?.errors && !Array.isArray(json.errors) ? json.errors : {});
  }

  return { data: json?.data as T, message: json?.message ?? null, meta: json?.meta };
}

export const api = {
  get: <T>(path: string, query?: Options['query']) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', form }),
};

/** Headers para recursos autenticados carregados fora do fetch (ex.: foto da receita no <Image>). */
export function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

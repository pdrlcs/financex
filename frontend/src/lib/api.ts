/**
 * Wrapper fetch tipado. O front fala SEMPRE por caminho relativo `/api/...`
 * (PORT_FRONTEND.md §6, decisão #1): em Docker o nginx faz reverse proxy
 * `/api/ → backend:8000`; em dev o proxy do Vite reescreve `/api → :8000`.
 * Em ambos os modos as requisições são same-origin — sem CORS pela UI.
 */

const BASE_URL = "/api";

/** Erro tipado lançado quando a resposta não é 2xx. Consumido pelos estados
 *  de erro da UI (toast + retry). */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query): string {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

/** Extrai a mensagem de erro do shape FastAPI ({detail: ...}). */
function errorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
  }
  return `Erro ${status} na requisição.`;
}

interface RequestOptions {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  /** Quando o corpo já é FormData (upload), não setar Content-Type. */
  formData?: FormData;
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { query, body, signal, formData } = options;

  const init: RequestInit = { method, signal };

  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  const res = await fetch(buildUrl(path, query), init);

  if (res.status === 204) {
    return undefined as T;
  }

  const parsed = await parseBody(res);

  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(res.status, parsed), parsed);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>("GET", path, { query, signal }),
  post: <T>(path: string, body?: unknown, query?: Query) =>
    request<T>("POST", path, { body, query }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>("POST", path, { formData }),
  /** Baixa um arquivo (CSV/JSON export) como Blob. */
  getBlob: async (path: string, query?: Query): Promise<Blob> => {
    const res = await fetch(buildUrl(path, query));
    if (!res.ok) {
      const parsed = await parseBody(res);
      throw new ApiError(res.status, errorMessage(res.status, parsed), parsed);
    }
    return res.blob();
  },
};

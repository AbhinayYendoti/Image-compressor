import type {
  ApiReadiness,
  AuditEvent,
  CloseDetail,
  DocumentItem,
  ExportStatus,
  GeneratedArtifact,
  GenerationJob,
  ReviewItem,
  Session,
  SignoffItem,
  SuperDocsLedger
} from "./types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly blockers: string[];

  constructor(status: number, message: string, code = "", blockers: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.blockers = blockers;
  }
}

/** FastAPI returns `detail` as a string, a validation array, or our structured object. */
function readError(status: number, payload: unknown): ApiError {
  const detail = (payload as { detail?: unknown })?.detail ?? payload;

  if (typeof detail === "string") {
    return new ApiError(status, detail);
  }
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    return new ApiError(status, first?.msg ?? "Request was rejected");
  }
  if (detail && typeof detail === "object") {
    const shaped = detail as { error?: string; message?: string; blockers?: string[] };
    return new ApiError(
      status,
      shaped.message ?? shaped.error ?? "Request was rejected",
      shaped.error ?? "",
      shaped.blockers ?? []
    );
  }
  return new ApiError(status, `Request failed with status ${status}`);
}

type RequestOptions = {
  method?: string;
  token?: string;
  json?: unknown;
  body?: BodyInit;
};

async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.json !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.body
    });
  } catch {
    throw new ApiError(0, `Cannot reach the API at ${BASE_URL}. Is the backend running?`);
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      /* non-JSON error body */
    }
    throw readError(response.status, payload);
  }
  return response;
}

async function json<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await request(path, options)).json() as Promise<T>;
}

export const api = {
  startDemoSession: () => json<Session & { expires_in: number }>("/api/v1/auth/demo-session", { method: "POST" }),

  me: (token: string) => json<Session["user"]>("/api/v1/auth/me", { token }),

  listCloses: (token: string) => json<CloseDetail[]>("/api/v1/closes", { token }),

  getClose: (token: string, closeId: string) => json<CloseDetail>(`/api/v1/closes/${closeId}`, { token }),

  getReadiness: (token: string, closeId: string) =>
    json<ApiReadiness>(`/api/v1/closes/${closeId}/readiness`, { token }),

  getAudit: (token: string, closeId: string) => json<AuditEvent[]>(`/api/v1/closes/${closeId}/audit`, { token }),

  /** The SuperDocs operation ledger: proof the contract is exercised, not just described. */
  getSuperDocs: (token: string, closeId: string) =>
    json<SuperDocsLedger>(`/api/v1/closes/${closeId}/superdocs`, { token }),

  getArtifacts: (token: string, closeId: string) =>
    json<GeneratedArtifact[]>(`/api/v1/closes/${closeId}/artifacts`, { token }),

  downloadArtifact: async (
    token: string,
    closeId: string,
    artifactId: string,
    filename: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await request(`/api/v1/closes/${closeId}/artifacts/${artifactId}/content`, { token });
    return { blob: await response.blob(), filename };
  },

  uploadDocument: (token: string, closeId: string, file: File) => {
    const form = new FormData();
    form.append("file", file, file.name);
    return json<DocumentItem>(`/api/v1/closes/${closeId}/documents`, { method: "POST", token, body: form });
  },

  mapDocument: (token: string, closeId: string, documentId: string, documentType?: string | null) =>
    json<DocumentItem>(`/api/v1/closes/${closeId}/documents/${documentId}/mapping`, {
      method: "PATCH",
      token,
      json: { document_type: documentType ?? null }
    }),

  setChecklistStatus: (token: string, closeId: string, itemId: string, status: "COMPLETE" | "PENDING") =>
    json(`/api/v1/closes/${closeId}/checklist/${itemId}`, { method: "PATCH", token, json: { status } }),

  generate: (token: string, closeId: string) =>
    json<GenerationJob>(`/api/v1/closes/${closeId}/generate`, { method: "POST", token }),

  getJob: (token: string, closeId: string, jobId: string) =>
    json<GenerationJob>(`/api/v1/closes/${closeId}/jobs/${jobId}`, { token }),

  approveReview: (token: string, closeId: string, reviewId: string) =>
    json<ReviewItem>(`/api/v1/closes/${closeId}/reviews/${reviewId}/approve`, { method: "POST", token }),

  rejectReview: (token: string, closeId: string, reviewId: string, reason?: string) =>
    json<ReviewItem>(`/api/v1/closes/${closeId}/reviews/${reviewId}/reject`, {
      method: "POST",
      token,
      json: { reason: reason ?? null }
    }),

  approveSignoff: (token: string, closeId: string, signoffId: string) =>
    json<SignoffItem>(`/api/v1/closes/${closeId}/signoffs/${signoffId}/approve`, { method: "POST", token }),

  getExportStatus: (token: string, closeId: string) =>
    json<ExportStatus>(`/api/v1/closes/${closeId}/export`, { token }),

  createExport: (token: string, closeId: string) =>
    json<{ status: string; filename: string; files: string[] }>(`/api/v1/closes/${closeId}/export`, {
      method: "POST",
      token
    }),

  /** Streams the real zip to the browser. The old export never produced a file. */
  downloadExport: async (token: string, closeId: string): Promise<{ blob: Blob; filename: string }> => {
    const response = await request(`/api/v1/closes/${closeId}/export/download`, { token });
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const match = /filename="?([^"]+)"?/.exec(disposition);
    return { blob: await response.blob(), filename: match?.[1] ?? "close-pack.zip" };
  },

  closePeriod: (token: string, closeId: string) =>
    json<CloseDetail>(`/api/v1/closes/${closeId}/close`, { method: "POST", token })
};

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const SESSION_KEY = "closeorbit.session";

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed?.token && parsed?.user ? parsed : null;
  } catch {
    return null;
  }
}

export function storeSession(session: Session | null): void {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable; the session simply will not persist */
  }
}

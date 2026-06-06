import type { AnalyticsResponse, KnowledgeGraphResponse, PonenciasAnalyticsResponse } from "./types";
import type { AiCauseEffectResponse, AiInterpretationResponse } from "./types/ai";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function apiUnavailableMessage(): string {
  if (import.meta.env.DEV) {
    return "No se pudo conectar con el backend. Abre una terminal y ejecuta: ./start-backend.sh (debe quedar activo en http://127.0.0.1:8000).";
  }
  return "No se pudo conectar con el servidor de analítica. En Vercel verifica Root Directory vacío (raíz del repo), carpeta api/ y redeploy.";
}

async function parseApiError(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (response.status === 404) {
      return apiUnavailableMessage();
    }
    return fallback;
  }

  const error = await response.json().catch(() => ({ detail: fallback }));
  const detail = error.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg ?? JSON.stringify(item)).join("; ");
  }

  return fallback;
}

async function apiPost<T>(path: string, file: File, fallbackError: string): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(apiUnavailableMessage());
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response, fallbackError));
  }

  return response.json() as Promise<T>;
}

export async function analyzeExcel(file: File): Promise<AnalyticsResponse> {
  return apiPost<AnalyticsResponse>("/api/v1/analyze", file, "Error al analizar el archivo");
}

export async function fetchKnowledgeGraph(file: File): Promise<KnowledgeGraphResponse> {
  return apiPost<KnowledgeGraphResponse>(
    "/api/v1/knowledge-graph",
    file,
    "Error al generar el grafo de conocimiento"
  );
}

export async function fetchPonenciasAnalytics(file: File): Promise<PonenciasAnalyticsResponse> {
  return apiPost<PonenciasAnalyticsResponse>(
    "/api/v1/ponencias",
    file,
    "Error al analizar ponencias seleccionadas"
  );
}

export async function fetchAiInterpretation(payload: {
  graph: KnowledgeGraphResponse;
  analytics?: AnalyticsResponse | null;
  focusNodeId?: string | null;
}): Promise<AiInterpretationResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/api/v1/knowledge-graph/interpret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        graph: payload.graph,
        analytics: payload.analytics ?? null,
        focus_node_id: payload.focusNodeId ?? null,
      }),
    });
  } catch {
    throw new Error(apiUnavailableMessage());
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Error al generar interpretación con IA"));
  }

  return response.json() as Promise<AiInterpretationResponse>;
}

export async function fetchAiCauseEffect(payload: {
  graph: KnowledgeGraphResponse;
  analytics?: AnalyticsResponse | null;
  focusNodeId?: string | null;
}): Promise<AiCauseEffectResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/api/v1/knowledge-graph/cause-effect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        graph: payload.graph,
        analytics: payload.analytics ?? null,
        focus_node_id: payload.focusNodeId ?? null,
      }),
    });
  } catch {
    throw new Error(apiUnavailableMessage());
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Error al generar análisis causa–efecto"));
  }

  return response.json() as Promise<AiCauseEffectResponse>;
}

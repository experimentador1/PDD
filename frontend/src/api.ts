import type { AnalyticsResponse, KnowledgeGraphResponse, PonenciasAnalyticsResponse } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const API_UNAVAILABLE_MSG =
  "No se pudo conectar con el servidor de analítica. Verifica que el despliegue en Vercel incluya la carpeta api/ y vuelve a desplegar.";

async function parseApiError(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (response.status === 404) {
      return API_UNAVAILABLE_MSG;
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
    throw new Error(API_UNAVAILABLE_MSG);
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

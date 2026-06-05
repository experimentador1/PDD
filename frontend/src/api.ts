import type { AnalyticsResponse, KnowledgeGraphResponse, PonenciasAnalyticsResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function analyzeExcel(file: File): Promise<AnalyticsResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error desconocido" }));
    throw new Error(error.detail ?? "Error al analizar el archivo");
  }

  return response.json();
}

export async function fetchKnowledgeGraph(file: File): Promise<KnowledgeGraphResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/v1/knowledge-graph`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error desconocido" }));
    throw new Error(error.detail ?? "Error al generar el grafo de conocimiento");
  }

  return response.json();
}

export async function fetchPonenciasAnalytics(file: File): Promise<PonenciasAnalyticsResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/v1/ponencias`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error desconocido" }));
    if (response.status === 404) {
      throw new Error(
        "El servidor no tiene disponible el análisis de ponencias. Reinicia el backend con: ./start-backend.sh"
      );
    }
    throw new Error(error.detail ?? "Error al analizar ponencias seleccionadas");
  }

  return response.json();
}

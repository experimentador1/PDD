import { useEffect, useState } from "react";
import { analyzeExcel, fetchKnowledgeGraph } from "./api";
import { Dashboard } from "./components/Dashboard";
import { KnowledgeGraphView } from "./components/KnowledgeGraphView";
import { UploadZone } from "./components/UploadZone";
import {
  clearPersistedFile,
  getPersistedFileName,
  loadPersistedFile,
  openPonenciasTab,
  persistUploadedFile,
} from "./lib/fileStorage";
import type { AnalyticsResponse, KnowledgeGraphResponse } from "./types";

type View = "upload" | "dashboard" | "knowledge-graph";

export default function App() {
  const [view, setView] = useState<View>("upload");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [graphData, setGraphData] = useState<KnowledgeGraphResponse | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const file = loadPersistedFile();
    const name = getPersistedFileName();
    if (!file) {
      setRestoring(false);
      return;
    }

    setFileName(name);
    setUploadedFile(file);
    setLoading(true);

    analyzeExcel(file)
      .then((result) => {
        setData(result);
        setView("dashboard");
      })
      .catch(() => {
        clearPersistedFile();
      })
      .finally(() => {
        setLoading(false);
        setRestoring(false);
      });
  }, []);

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    setUploadedFile(file);
    setGraphData(null);

    try {
      await persistUploadedFile(file);
      const result = await analyzeExcel(file);
      setData(result);
      setView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el archivo");
      setData(null);
      setView("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setData(null);
    setGraphData(null);
    setUploadedFile(null);
    setFileName("");
    setError(null);
    clearPersistedFile();
    setView("upload");
  };

  const handleOpenKnowledgeGraph = async () => {
    if (!uploadedFile) return;
    setLoadingGraph(true);
    setError(null);
    try {
      const graph = await fetchKnowledgeGraph(uploadedFile);
      setGraphData(graph);
      setView("knowledge-graph");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el mapa de conocimiento");
    } finally {
      setLoadingGraph(false);
    }
  };

  const goToDashboard = () => {
    if (data) setView("dashboard");
  };

  const goToKnowledgeGraph = async () => {
    if (graphData) {
      setView("knowledge-graph");
      return;
    }
    await handleOpenKnowledgeGraph();
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goToDashboard}
              disabled={!data}
              className={`flex items-center gap-3 ${data ? "cursor-pointer rounded-xl transition hover:opacity-80" : "cursor-default"}`}
              title={data ? "Volver al dashboard" : undefined}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ujat-blue">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <h1 className="font-display text-lg font-bold text-ujat-blue">PDD DACYTI Analytics</h1>
                <p className="text-xs text-slate-500">Inteligencia de negocios · UJAT</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {data && (
              <nav className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:flex">
                <button
                  type="button"
                  onClick={goToDashboard}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    view === "dashboard"
                      ? "bg-white text-ujat-blue shadow-sm"
                      : "text-slate-600 hover:text-ujat-blue"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={goToKnowledgeGraph}
                  disabled={loadingGraph}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    view === "knowledge-graph"
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-600 hover:text-violet-700"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {loadingGraph ? "Cargando..." : "Mapa de conocimiento"}
                </button>
                <button
                  type="button"
                  onClick={openPonenciasTab}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-amber-700"
                  title="Abrir en nueva pestaña"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                  Exposición foro
                  <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </nav>
            )}

            {view === "knowledge-graph" && (
              <button
                type="button"
                onClick={goToDashboard}
                className="btn-secondary sm:hidden"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </button>
            )}

            {view === "dashboard" && (
              <span className="hidden rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 sm:inline">
                Dashboard activo
              </span>
            )}
            {view === "knowledge-graph" && (
              <span className="hidden rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 sm:inline">
                Mapa de conocimiento
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && view !== "upload" && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {restoring && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg className="mb-4 h-10 w-10 animate-spin text-ujat-blue" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-600">Restaurando dashboard...</p>
          </div>
        )}

        {view === "upload" && !restoring && (
          <div className="py-8">
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold text-slate-900">
                Analítica estratégica de propuestas
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-600">
                Carga el archivo Excel exportado del foro PDD DACYTI para generar un dashboard interactivo
                con indicadores clave, visualizaciones D3.js y mapa de conocimiento.
              </p>
            </div>
            <UploadZone onFileSelect={handleFileSelect} loading={loading} error={error} />

            <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
              {[
                { step: "1", title: "Cargar Excel", desc: "Archivo con estructura estándar del foro" },
                { step: "2", title: "Analizar", desc: "Procesamiento automático de 22 columnas" },
                { step: "3", title: "Explorar", desc: "Dashboard + grafo de conocimiento D3.js" },
              ].map((item) => (
                <div key={item.step} className="card p-4 text-center">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ujat-blue text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <h4 className="mt-2 font-semibold text-slate-800">{item.title}</h4>
                  <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "dashboard" && data && (
          <Dashboard
            data={data}
            fileName={fileName}
            onReset={handleReset}
            onOpenKnowledgeGraph={handleOpenKnowledgeGraph}
            loadingGraph={loadingGraph}
          />
        )}

        {view === "knowledge-graph" && graphData && (
          <KnowledgeGraphView
            data={graphData}
            fileName={fileName}
            onBack={goToDashboard}
          />
        )}
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        PDD DACYTI Analytics · División Académica de Ciencias y Tecnologías de la Información · UJAT
      </footer>
    </div>
  );
}

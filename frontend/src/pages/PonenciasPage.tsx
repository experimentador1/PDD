import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchPonenciasAnalytics } from "../api";
import { PonenciasDashboardView } from "../components/PonenciasDashboardView";
import { getPersistedFileName, loadPersistedFile } from "../lib/fileStorage";
import type { PonenciasAnalyticsResponse } from "../types";

export function PonenciasPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PonenciasAnalyticsResponse | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const file = loadPersistedFile();
    const name = getPersistedFileName();

    if (!file) {
      setError("No hay archivo Excel cargado. Vuelve al dashboard principal y carga el archivo primero.");
      setLoading(false);
      return;
    }

    setFileName(name);
    setLoading(true);
    setError(null);

    fetchPonenciasAnalytics(file)
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error al cargar ponencias para exposición");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-ujat-blue">Exposición en foro</h1>
              <p className="text-xs text-slate-500">Ponencias seleccionadas · PDD DACYTI</p>
            </div>
          </div>
          <Link to="/" className="btn-secondary">
            Volver al dashboard principal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg className="mb-4 h-10 w-10 animate-spin text-amber-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-600">Analizando ponencias seleccionadas para exposición...</p>
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <Link to="/" className="btn-primary mt-4 inline-flex">
              Volver al dashboard
            </Link>
          </div>
        )}

        {data && !loading && (
          <PonenciasDashboardView
            data={data}
            fileName={fileName}
            onBack={() => navigate("/")}
          />
        )}
      </main>
    </div>
  );
}

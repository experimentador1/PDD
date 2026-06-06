import { useCallback, useState } from "react";
import { fetchAiCauseEffect } from "../api";
import type { AnalyticsResponse, GraphNode, KnowledgeGraphResponse } from "../types";
import type { AiCauseEffectResponse, AreaCausaEfecto } from "../types/ai";

interface Props {
  graph: KnowledgeGraphResponse;
  analytics?: AnalyticsResponse | null;
  focusNode?: GraphNode | null;
}

export function AiCauseEffectPanel({ graph, analytics, focusNode }: Props) {
  const [analysis, setAnalysis] = useState<AiCauseEffectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAiCauseEffect({
        graph,
        analytics,
        focusNodeId: focusNode?.id ?? null,
      });
      setAnalysis(result);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar análisis causa–efecto");
    } finally {
      setLoading(false);
    }
  }, [graph, analytics, focusNode?.id]);

  return (
    <div className="card overflow-hidden border-teal-200/70 bg-gradient-to-br from-teal-50/80 via-white to-amber-50/40">
      <div className="flex flex-col gap-4 border-b border-teal-100/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 shadow-sm">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-display font-semibold text-teal-950">Análisis causa–efecto</h3>
            <p className="mt-0.5 text-xs text-teal-700/80">
              Cadena causal · 5 porqués · acciones sobre causa raíz
              {focusNode ? ` · foco: ${focusNode.label}` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {analysis && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="btn-secondary text-xs">
              {expanded ? "Ocultar" : "Mostrar"}
            </button>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-teal-700 hover:to-emerald-700 disabled:opacity-60"
          >
            {loading ? "Analizando..." : analysis ? "Regenerar análisis" : "Generar causa–efecto"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!analysis && !loading && !error && (
        <div className="px-5 py-6 text-sm text-teal-800/70">
          Identifica <strong>por qué</strong> ocurren las brechas del PDD: cadenas causales
          (Causa → Mecanismo → Efecto → Indicador) y <strong>5 porqués</strong> con acción correctiva
          por área (2–4 áreas prioritarias).
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 px-5 py-8 text-sm text-teal-700">
          <svg className="h-5 w-5 animate-spin text-teal-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Construyendo cadenas causales y análisis de 5 porqués...
        </div>
      )}

      {analysis && expanded && !loading && (
        <div className="space-y-5 px-5 py-5">
          <section className="rounded-xl border border-teal-100 bg-white/70 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-teal-700">Resumen causa–efecto</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{analysis.resumen_causa_efecto}</p>
          </section>

          {analysis.areas_analisis.map((area, i) => (
            <AreaCard key={i} area={area} index={i} />
          ))}

          <p className="text-[10px] text-slate-400">
            Modelo: {analysis.modelo || "OpenAI"} ·{" "}
            {analysis.generado_en ? new Date(analysis.generado_en).toLocaleString("es-MX") : "ahora"}
          </p>
        </div>
      )}
    </div>
  );
}

function AreaCard({ area, index }: { area: AreaCausaEfecto; index: number }) {
  const { cadena_causal: cadena, cinco_porques: porques } = area;

  return (
    <section className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-800">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-slate-900">{area.nombre}</h4>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Problema:</span> {area.problema}
          </p>
          <p className="mt-1 text-sm text-amber-800/90">
            <span className="font-medium">Brecha:</span> {area.brecha}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <h5 className="text-xs font-bold uppercase tracking-wide text-teal-700">Cadena causal</h5>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <CausalStep label="Causa" value={cadena.causa} accent="rose" />
          <CausalStep label="Mecanismo" value={cadena.mecanismo} accent="amber" />
          <CausalStep label="Efecto" value={cadena.efecto} accent="orange" />
          <CausalStep label="Indicador PDD" value={cadena.indicador_pdd} accent="teal" />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
        <h5 className="text-xs font-bold uppercase tracking-wide text-amber-800">5 porqués</h5>
        <p className="mt-2 text-xs text-slate-600">
          <span className="font-medium text-amber-900">Punto de partida:</span> {porques.brecha_inicial}
        </p>
        {porques.niveles.length > 0 && (
          <ol className="mt-3 space-y-2">
            {porques.niveles.map((nivel, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-xs font-bold text-amber-900">
                  {i + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{nivel}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-amber-200/60 bg-white/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Causa raíz</p>
            <p className="mt-1 text-sm text-slate-800">{porques.causa_raiz}</p>
          </div>
          <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Acción sugerida</p>
            <p className="mt-1 text-sm text-slate-800">{porques.accion_sugerida}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CausalStep({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "rose" | "amber" | "orange" | "teal";
}) {
  const styles = {
    rose: "border-rose-100 bg-rose-50/60 text-rose-800",
    amber: "border-amber-100 bg-amber-50/60 text-amber-900",
    orange: "border-orange-100 bg-orange-50/60 text-orange-900",
    teal: "border-teal-100 bg-teal-50/60 text-teal-900",
  }[accent];

  return (
    <div className={`relative rounded-lg border p-3 ${styles}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-800">{value}</p>
      {label !== "Indicador PDD" && (
        <span
          className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-slate-300 lg:inline"
          aria-hidden
        >
          →
        </span>
      )}
    </div>
  );
}

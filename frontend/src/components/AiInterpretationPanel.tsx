import { useCallback, useState } from "react";
import { fetchAiInterpretation } from "../api";
import type { AnalyticsResponse, GraphNode, KnowledgeGraphResponse } from "../types";
import type { AiInterpretationResponse, PrioridadIniciativa } from "../types/ai";

interface Props {
  graph: KnowledgeGraphResponse;
  analytics?: AnalyticsResponse | null;
  focusNode?: GraphNode | null;
}

const CUADRANTE_STYLES: Record<string, string> = {
  "quick win": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "proyecto estratégico": "bg-violet-100 text-violet-800 border-violet-200",
  "proyecto estrategico": "bg-violet-100 text-violet-800 border-violet-200",
  evaluar: "bg-amber-100 text-amber-800 border-amber-200",
  evitar: "bg-slate-100 text-slate-600 border-slate-200",
};

const HORIZONTE_STYLES: Record<string, string> = {
  H1: "bg-blue-100 text-blue-800",
  H2: "bg-indigo-100 text-indigo-800",
  H3: "bg-purple-100 text-purple-800",
};

export function AiInterpretationPanel({ graph, analytics, focusNode }: Props) {
  const [interpretation, setInterpretation] = useState<AiInterpretationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAiInterpretation({
        graph,
        analytics,
        focusNodeId: focusNode?.id ?? null,
      });
      setInterpretation(result);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar interpretación");
    } finally {
      setLoading(false);
    }
  }, [graph, analytics, focusNode?.id]);

  return (
    <div className="card overflow-hidden border-violet-200/70 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50">
      <div className="flex flex-col gap-4 border-b border-violet-100/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-sm">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="font-display font-semibold text-violet-950">Consultoría IA · Marcos McKinsey</h3>
            <p className="mt-0.5 text-xs text-violet-700/80">
              Issue Tree · Gap Analysis · Impacto–Esfuerzo · Three Horizons · 5 puntos clave
              {focusNode ? ` · foco: ${focusNode.label}` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {interpretation && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="btn-secondary text-xs">
              {expanded ? "Ocultar" : "Mostrar"}
            </button>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
          >
            {loading ? "Analizando..." : interpretation ? "Regenerar análisis" : "Generar interpretación IA"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!interpretation && !loading && !error && (
        <div className="px-5 py-6 text-sm text-violet-800/70">
          Genera un diagnóstico consultor con <strong>áreas de oportunidad</strong>, matriz de priorización,
          árbol de issues y <strong>5 puntos clave ejecutivos</strong> basados en propuestas e indicadores PDD.
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 px-5 py-8 text-sm text-violet-700">
          <svg className="h-5 w-5 animate-spin text-violet-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Aplicando marcos McKinsey sobre el mapa de conocimiento...
        </div>
      )}

      {interpretation && expanded && !loading && (
        <div className="space-y-5 px-5 py-5">
          {interpretation.puntos_clave_ejecutivos.length > 0 && (
            <section className="rounded-xl border border-ujat-blue/20 bg-gradient-to-r from-ujat-blue/5 to-indigo-50 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-ujat-blue">5 puntos clave ejecutivos</h4>
              <ol className="mt-3 space-y-2">
                {interpretation.puntos_clave_ejecutivos.map((punto, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-800">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ujat-blue text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{punto}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="rounded-xl border border-violet-100 bg-white/70 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-violet-600">Resumen ejecutivo</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{interpretation.resumen_ejecutivo}</p>
          </section>

          {interpretation.areas_oportunidad.length > 0 && (
            <section>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-700">Áreas de oportunidad</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {interpretation.areas_oportunidad.map((area, i) => (
                  <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <h5 className="font-semibold text-emerald-900">{area.nombre}</h5>
                    <p className="mt-1 text-sm text-slate-700">{area.descripcion}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      <span className="font-medium text-emerald-700">Evidencia:</span> {area.evidencia}
                    </p>
                    {area.indicadores_relacionados.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {area.indicadores_relacionados.slice(0, 3).map((ind, j) => (
                          <span key={j} className="rounded-full bg-white px-2 py-0.5 text-[10px] text-emerald-800 ring-1 ring-emerald-200">
                            {ind.length > 40 ? `${ind.slice(0, 37)}…` : ind}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {interpretation.arbol_issues.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white/70 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Issue Tree (MECE)</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {interpretation.arbol_issues.map((rama, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <p className="text-sm font-semibold text-slate-800">{rama.pregunta}</p>
                    <ul className="mt-2 space-y-1">
                      {rama.hallazgos.map((h, j) => (
                        <li key={j} className="flex gap-2 text-xs text-slate-600">
                          <span className="text-slate-400">→</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {interpretation.analisis_brechas && (
            <section className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-amber-800">Gap Analysis · Brechas vs. meta 2026</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{interpretation.analisis_brechas}</p>
            </section>
          )}

          {interpretation.matriz_priorizacion.length > 0 && (
            <section className="rounded-xl border border-indigo-100 bg-white/70 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-700">Matriz Impacto–Esfuerzo · Three Horizons</h4>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pr-3">Iniciativa</th>
                      <th className="pb-2 pr-3">Impacto</th>
                      <th className="pb-2 pr-3">Esfuerzo</th>
                      <th className="pb-2 pr-3">Cuadrante</th>
                      <th className="pb-2 pr-3">Horizonte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {interpretation.matriz_priorizacion.map((item, i) => (
                      <PrioridadRow key={i} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-indigo-100 bg-white/70 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-600">Alineación propuestas ↔ PDD</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{interpretation.analisis_alineacion}</p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <InsightList title="Hallazgos sobre indicadores" items={interpretation.hallazgos_indicadores} accent="violet" />
            <InsightList title="Brechas y riesgos" items={interpretation.brechas_y_riesgos} accent="amber" />
            <InsightList title="Recomendaciones estratégicas" items={interpretation.recomendaciones} accent="emerald" />
            <InsightList title="Conexiones clave tema ↔ indicador" items={interpretation.conexiones_clave} accent="cyan" />
          </div>

          {interpretation.marcos_consultoria.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-violet-100 pt-3">
              {interpretation.marcos_consultoria.map((marco, i) => (
                <span key={i} className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-medium text-violet-700">
                  {marco}
                </span>
              ))}
            </div>
          )}

          <p className="text-[10px] text-slate-400">
            Modelo: {interpretation.modelo || "OpenAI"} ·{" "}
            {interpretation.generado_en ? new Date(interpretation.generado_en).toLocaleString("es-MX") : "ahora"}
          </p>
        </div>
      )}
    </div>
  );
}

function PrioridadRow({ item }: { item: PrioridadIniciativa }) {
  const cuadranteKey = item.cuadrante.toLowerCase();
  const cuadranteClass = CUADRANTE_STYLES[cuadranteKey] ?? CUADRANTE_STYLES.evaluar;
  const horizonteClass = HORIZONTE_STYLES[item.horizonte.toUpperCase()] ?? "bg-slate-100 text-slate-600";

  return (
    <tr className="hover:bg-slate-50/50">
      <td className="py-2.5 pr-3">
        <p className="font-medium text-slate-800">{item.iniciativa}</p>
        <p className="mt-0.5 text-xs text-slate-500">{item.rationale}</p>
      </td>
      <td className="py-2.5 pr-3 capitalize text-slate-600">{item.impacto}</td>
      <td className="py-2.5 pr-3 capitalize text-slate-600">{item.esfuerzo}</td>
      <td className="py-2.5 pr-3">
        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${cuadranteClass}`}>
          {item.cuadrante}
        </span>
      </td>
      <td className="py-2.5">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${horizonteClass}`}>
          {item.horizonte.toUpperCase()}
        </span>
      </td>
    </tr>
  );
}

function InsightList({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: "violet" | "amber" | "emerald" | "cyan";
}) {
  if (items.length === 0) return null;

  const styles = {
    violet: { box: "border-violet-100 bg-violet-50/50", title: "text-violet-700", dot: "bg-violet-500" },
    amber: { box: "border-amber-100 bg-amber-50/50", title: "text-amber-800", dot: "bg-amber-500" },
    emerald: { box: "border-emerald-100 bg-emerald-50/50", title: "text-emerald-800", dot: "bg-emerald-500" },
    cyan: { box: "border-cyan-100 bg-cyan-50/50", title: "text-cyan-800", dot: "bg-cyan-500" },
  }[accent];

  return (
    <section className={`rounded-xl border p-4 ${styles.box}`}>
      <h4 className={`text-xs font-bold uppercase tracking-wide ${styles.title}`}>{title}</h4>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

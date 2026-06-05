import { DonutChart } from "../charts/DonutChart";
import { GroupedBarChart } from "../charts/GroupedBarChart";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";
import { TermBubbleChart } from "../charts/TermBubbleChart";
import type { PonenciasAnalyticsResponse } from "../types";
import { KpiGrid } from "./KpiGrid";

interface Props {
  data: PonenciasAnalyticsResponse;
  fileName: string;
  onBack: () => void;
}

export function PonenciasDashboardView({ data, fileName, onBack }: Props) {
  const meta = data.metadata;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3">
            <button type="button" onClick={onBack} className="btn-secondary inline-flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Volver al dashboard principal
            </button>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Exposición en foro · EXPONE = Sí
          </span>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-900">
            Ponencias seleccionadas para exposición
          </h2>
          <p className="text-sm text-slate-500">
            Drill-down desde «Exposición en foro» · {meta.ponencias_seleccionadas as number} de{" "}
            {meta.total_propuestas as number} propuestas ({meta.tasa_seleccion as number}%) · {fileName}
          </p>
        </div>
      </div>

      {/* Insights */}
      <div className="card border-amber-200/60 bg-amber-50/40 p-5">
        <h3 className="font-display font-semibold text-amber-900">Hallazgos clave</h3>
        <ul className="mt-3 space-y-2">
          {data.insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-amber-950/80">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              {insight}
            </li>
          ))}
        </ul>
      </div>

      <KpiGrid kpis={data.kpis} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Áreas de las ponencias seleccionadas</h3>
            <p className="text-xs text-slate-500">Distribución temática de las exposiciones orales</p>
          </div>
          <div className="card-body">
            <DonutChart data={data.por_area} height={280} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Seleccionadas vs. no seleccionadas</h3>
            <p className="text-xs text-slate-500">Comparativa por área estratégica</p>
          </div>
          <div className="card-body">
            <GroupedBarChart data={data.comparativa_areas} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-display font-semibold text-slate-800">Temas más expuestos en el foro</h3>
          <p className="text-xs text-slate-500">Temas con ponencia oral seleccionada</p>
        </div>
        <div className="card-body overflow-x-auto">
          <HorizontalBarChart data={data.top_temas} color="#d97706" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Nube de términos frecuentes</h3>
            <p className="text-xs text-slate-500">Vocabulario en títulos, problemáticas y propuestas seleccionadas</p>
          </div>
          <div className="card-body">
            <TermBubbleChart data={data.terminos_combinados.slice(0, 25)} color="#003366" />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Categorías semánticas del discurso</h3>
            <p className="text-xs text-slate-500">Agrupación temática de términos recurrentes</p>
          </div>
          <div className="card-body">
            <DonutChart
              data={data.categorias_terminos.map((d, i) => ({
                ...d,
                metadata: { color: ["#2563eb", "#7c3aed", "#059669", "#d97706", "#db2777", "#0891b2", "#64748b"][i % 7] },
              }))}
              height={280}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Términos en problemáticas</h3>
            <p className="text-xs text-slate-500">Top palabras del campo PROBLEMATICA</p>
          </div>
          <div className="card-body overflow-x-auto">
            <HorizontalBarChart data={data.terminos_problematica.slice(0, 12)} color="#dc2626" showValues />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Términos en propuestas</h3>
            <p className="text-xs text-slate-500">Top palabras del campo PROPUESTA</p>
          </div>
          <div className="card-body overflow-x-auto">
            <HorizontalBarChart data={data.terminos_propuesta.slice(0, 12)} color="#059669" showValues />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Términos distintivos</h3>
            <p className="text-xs text-slate-500">Más frecuentes en seleccionadas vs. resto</p>
          </div>
          <div className="card-body overflow-x-auto">
            <HorizontalBarChart data={data.terminos_distintivos} color="#7c3aed" showValues />
          </div>
        </div>
      </div>

      {data.bigramas.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Bigramas recurrentes</h3>
            <p className="text-xs text-slate-500">Pares de palabras que aparecen juntas con frecuencia</p>
          </div>
          <div className="card-body overflow-x-auto">
            <HorizontalBarChart data={data.bigramas} color="#0891b2" />
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-display font-semibold text-slate-800">Catálogo de ponencias seleccionadas</h3>
          <p className="text-xs text-slate-500">{data.ponencias.length} registros con EXPONE = Sí</p>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Tema</th>
                <th className="px-4 py-3">Ponentes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.ponencias.map((p) => (
                <tr key={p.folio} className="hover:bg-amber-50/30">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-amber-800">{p.folio}</td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-2 font-medium text-slate-800">{p.titulo}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{p.problematica_preview}</p>
                  </td>
                  <td className="max-w-[180px] px-4 py-3 text-xs text-slate-600">{p.tema}</td>
                  <td className="max-w-[160px] px-4 py-3 text-xs text-slate-500">{p.ponentes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { BarChart } from "../charts/BarChart";
import { DonutChart } from "../charts/DonutChart";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";
import { StackedBarChart } from "../charts/StackedBarChart";
import { TreemapChart } from "../charts/TreemapChart";
import { openPonenciasTab } from "../lib/fileStorage";
import type { AnalyticsResponse } from "../types";
import { IndicadoresPanel } from "./IndicadoresPanel";
import { KpiGrid } from "./KpiGrid";
import { ProposalTable } from "./ProposalTable";

interface Props {
  data: AnalyticsResponse;
  fileName: string;
  onReset: () => void;
  onOpenKnowledgeGraph: () => void;
  loadingGraph?: boolean;
}

export function Dashboard({ data, fileName, onReset, onOpenKnowledgeGraph, loadingGraph }: Props) {
  const foro = (data.metadata.foro as string) ?? "PDD DACYTI";
  const exponeSi = data.por_expone.find((d) => d.label.toLowerCase() === "si")?.value ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-ujat-gold/20 px-3 py-1 text-xs font-semibold text-ujat-blue">
              {foro}
            </span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-900">
            Dashboard Analítico de Propuestas
          </h2>
          <p className="text-sm text-slate-500">
            Fuente: <span className="font-medium text-slate-700">{fileName}</span> ·{" "}
            {data.metadata.total_propuestas as number} propuestas analizadas
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={onOpenKnowledgeGraph}
            disabled={loadingGraph}
            className="btn-primary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            {loadingGraph ? "Generando grafo..." : "Mapa de conocimiento"}
          </button>
          <button onClick={onReset} className="btn-secondary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Cargar otro archivo
        </button>
        </div>
      </div>

      <KpiGrid kpis={data.kpis} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Distribución por área estratégica</h3>
            <p className="text-xs text-slate-500">5 ejes del Plan de Desarrollo Divisional</p>
          </div>
          <div className="card-body">
            <DonutChart data={data.por_area} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Participación por perfil</h3>
            <p className="text-xs text-slate-500">Conteo de ponentes por tipo de actor</p>
          </div>
          <div className="card-body">
            <BarChart data={data.por_perfil} height={280} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-display font-semibold text-slate-800">Top 15 temas más propuestos</h3>
          <p className="text-xs text-slate-500">Temas específicos con mayor frecuencia en el foro</p>
        </div>
        <div className="card-body overflow-x-auto">
          <HorizontalBarChart data={data.top_temas} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Perfiles por área temática</h3>
            <p className="text-xs text-slate-500">¿Quién propone en cada eje estratégico?</p>
          </div>
          <div className="card-body">
            <StackedBarChart data={data.perfiles_por_area} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Propuestas por dependencia</h3>
            <p className="text-xs text-slate-500">Origen institucional de las iniciativas</p>
          </div>
          <div className="card-body">
            <BarChart data={data.por_dependencia} height={280} color="#059669" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-display font-semibold text-slate-800">Mapa jerárquico temático</h3>
            <p className="text-xs text-slate-500">Área → Clasificación → Tema (treemap D3.js)</p>
          </div>
          <div className="card-body">
            <TreemapChart data={data.jerarquia_tematica} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card ring-1 ring-amber-200/60">
            <div className="card-header">
              <h3 className="font-display font-semibold text-slate-800">Exposición en foro</h3>
              <p className="text-xs text-slate-500">Selección para presentación oral · clic en Sí para explorar</p>
            </div>
            <div className="card-body">
              <DonutChart
                data={data.por_expone}
                height={220}
                drillDownLabels={["Si"]}
                onSegmentClick={() => openPonenciasTab()}
              />
              <button
                type="button"
                onClick={openPonenciasTab}
                disabled={exponeSi === 0}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                {`Ver ${exponeSi} ponencias seleccionadas para exposición`}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-display font-semibold text-slate-800">Top ponentes</h3>
              <p className="text-xs text-slate-500">Mayor participación en propuestas</p>
            </div>
            <div className="card-body">
              <HorizontalBarChart data={data.top_ponentes} color="#003366" />
            </div>
          </div>
        </div>
      </div>

      {data.propuestas_externas.length > 0 && (
        <div className="card border-emerald-200 bg-emerald-50/30">
          <div className="card-header border-emerald-100">
            <h3 className="font-display font-semibold text-emerald-900">
              Vinculación externa ({data.propuestas_externas.length} propuestas)
            </h3>
            <p className="text-xs text-emerald-700">Colaboración con sector productivo e instituciones externas</p>
          </div>
          <div className="card-body">
            <div className="grid gap-3 sm:grid-cols-2">
              {data.propuestas_externas.map((p) => (
                <div key={p.label} className="rounded-xl border border-emerald-200 bg-white p-3">
                  <p className="font-mono text-xs font-semibold text-emerald-800">{p.label}</p>
                  <p className="mt-1 text-sm text-slate-700">{(p.metadata?.titulo as string) ?? ""}</p>
                  <p className="mt-1 text-xs text-emerald-600">{p.group}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ProposalTable proposals={data.propuestas} />

      <IndicadoresPanel indicadores={data.indicadores_alineados} />
    </div>
  );
}

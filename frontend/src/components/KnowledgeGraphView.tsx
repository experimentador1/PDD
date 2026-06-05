import { useMemo, useState } from "react";
import { KnowledgeGraph } from "../charts/KnowledgeGraph";
import type { GraphNode, KnowledgeGraphResponse } from "../types";

interface Props {
  data: KnowledgeGraphResponse;
  fileName: string;
  onBack: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  root: "Raíz",
  area: "Áreas temáticas",
  clasificacion: "Clasificaciones",
  tema: "Temas",
  eje: "Ejes PDD",
  oe: "Objetivos Estratégicos",
  pud: "Programas (PUD)",
  indicador: "Indicadores",
};

export function KnowledgeGraphView({ data, fileName, onBack }: Props) {
  const allTypes = useMemo(() => [...new Set(data.nodes.map((n) => n.type))], [data.nodes]);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(
    () => new Set(allTypes)
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const stats = data.stats;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Volver al dashboard
            </button>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Mapa de Conocimiento PDD</h2>
          <p className="mt-1 text-sm text-slate-500">
            Integración de propuestas ({fileName}) con los 61 indicadores institucionales
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Áreas temáticas", value: stats.areas_tematicas, unit: "ejes" },
            { label: "Temas únicos", value: stats.temas_unicos, unit: "temas" },
            { label: "Indicadores PDD", value: stats.indicadores_pdd, unit: "KPIs" },
            { label: "Nodos / Enlaces", value: `${stats.total_nodos}/${stats.total_enlaces}`, unit: "" },
          ].map((s) => (
            <div key={s.label} className="card px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              <p className="font-display text-xl font-bold text-ujat-blue">
                {s.value}
                {s.unit && <span className="ml-1 text-xs font-normal text-slate-500">{s.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr_280px]">
        {/* Panel filtros */}
        <div className="card p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar</label>
            <input
              type="search"
              placeholder="Nodo, tema, indicador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-ujat-blue focus:outline-none focus:ring-1 focus:ring-ujat-blue/30"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capas del grafo</p>
            <div className="mt-2 space-y-1.5">
              {allTypes.map((type) => {
                const legend = data.legend.find((l) => l.type === type);
                const count = data.nodes.filter((n) => n.type === type).length;
                return (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={activeTypes.has(type)}
                      onChange={() => toggleType(type)}
                      className="rounded border-slate-300 text-ujat-blue focus:ring-ujat-blue/30"
                    />
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: legend?.color ?? "#94a3b8" }}
                    />
                    <span className="flex-1 text-xs text-slate-700">{TYPE_LABELS[type] ?? type}</span>
                    <span className="text-[10px] text-slate-400">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Relaciones</p>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
              <li>━━ Estructura propuestas</li>
              <li>━━ Alineación área ↔ eje PDD</li>
              <li>┄┄ Relación semántica tema-indicador</li>
            </ul>
          </div>
        </div>

        {/* Grafo */}
        <div className="card overflow-hidden" style={{ minHeight: 560 }}>
          <KnowledgeGraph
            data={data}
            activeTypes={activeTypes}
            searchTerm={searchTerm}
            onNodeSelect={setSelectedNode}
            selectedId={selectedNode?.id ?? null}
          />
        </div>

        {/* Panel detalle */}
        <div className="card p-4">
          <h3 className="font-display font-semibold text-slate-800">Detalle del nodo</h3>
          {selectedNode ? (
            <div className="mt-3 space-y-3">
              <div>
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                  style={{ background: selectedNode.color }}
                >
                  {TYPE_LABELS[selectedNode.type] ?? selectedNode.type}
                </span>
                <h4 className="mt-2 font-semibold text-slate-900">{selectedNode.label}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{selectedNode.description}</p>
              </div>

              {selectedNode.value > 1 && (
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Valor / frecuencia</p>
                  <p className="text-lg font-bold text-ujat-blue">{selectedNode.value}</p>
                </div>
              )}

              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-slate-400">Metadatos</p>
                  {Object.entries(selectedNode.metadata).map(([key, val]) =>
                    val ? (
                      <div key={key} className="rounded border border-slate-100 bg-white px-2.5 py-1.5">
                        <p className="text-[10px] uppercase text-slate-400">{key.replace(/_/g, " ")}</p>
                        <p className="text-xs text-slate-700">{String(val)}</p>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Conexiones</p>
                <p className="mt-1 text-sm text-slate-600">
                  {data.links.filter((l) => l.source === selectedNode.id || l.target === selectedNode.id).length}{" "}
                  enlaces directos
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-8 text-center text-sm text-slate-400">
              <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Haz clic en un nodo para explorar su información
            </div>
          )}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-display text-sm font-semibold text-slate-800">Arquitectura del conocimiento</h3>
        <p className="mt-2 text-sm text-slate-600">
          El grafo integra tres capas: <strong>propuestas del foro</strong> (5 áreas → 16 clasificaciones → 46 temas),{" "}
          <strong>marco institucional PDD</strong> (7 ejes → 15 OE → 41 PUD → 61 indicadores) y{" "}
          <strong>puentes semánticos</strong> que conectan temas con indicadores por afinidad temática.
          Las áreas de propuestas se alinean con los ejes estratégicos del Plan de Desarrollo Divisional.
        </p>
      </div>
    </div>
  );
}

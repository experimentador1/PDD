import type { IndicadorAlineado } from "../types";

interface Props {
  indicadores: IndicadorAlineado[];
}

export function IndicadoresPanel({ indicadores }: Props) {
  const grouped = indicadores.reduce<Record<string, IndicadorAlineado[]>>((acc, ind) => {
    (acc[ind.categoria] ??= []).push(ind);
    return acc;
  }, {});

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-display font-semibold text-slate-800">Indicadores alineados al PDD DACYTI</h3>
        <p className="text-xs text-slate-500">
          Referencia basada en indicadores_pdd_dacyti_2022_2026 y estructura de propuestas
        </p>
      </div>
      <div className="card-body space-y-5">
        {Object.entries(grouped).map(([categoria, items]) => (
          <div key={categoria}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ujat-blue">{categoria}</h4>
            <div className="space-y-2">
              {items.map((ind) => (
                <div
                  key={ind.indicador}
                  className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                >
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-ujat-gold" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{ind.indicador}</p>
                    <p className="text-xs text-slate-500">{ind.descripcion}</p>
                    <span className="mt-1 inline-block rounded bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                      {ind.eje_pdd}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

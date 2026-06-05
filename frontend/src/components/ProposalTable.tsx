import { useMemo, useState } from "react";
import type { ProposalSummary } from "../types";

interface Props {
  proposals: ProposalSummary[];
}

const AREA_COLORS: Record<string, string> = {
  "Calidad y mejora continua en la formación académica": "bg-blue-100 text-blue-800",
  "Investigación de Alto Impacto": "bg-violet-100 text-violet-800",
  "Vinculación productiva y responsabilidad universitaria": "bg-emerald-100 text-emerald-800",
  "Gestión innovadora y sostenibilidad financiera": "bg-amber-100 text-amber-800",
  "Cultura, Identidad y Legado UJAT": "bg-pink-100 text-pink-800",
};

export function ProposalTable({ proposals }: Props) {
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const areas = useMemo(() => [...new Set(proposals.map((p) => p.area))], [proposals]);

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      const matchSearch =
        !search ||
        p.titulo.toLowerCase().includes(search.toLowerCase()) ||
        p.folio.toLowerCase().includes(search.toLowerCase()) ||
        p.ponentes.toLowerCase().includes(search.toLowerCase());
      const matchArea = !areaFilter || p.area === areaFilter;
      return matchSearch && matchArea;
    });
  }, [proposals, search, areaFilter]);

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display font-semibold text-slate-800">Catálogo de propuestas</h3>
          <p className="text-xs text-slate-500">{filtered.length} de {proposals.length} registros</p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Buscar folio, título, ponente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-ujat-blue focus:outline-none focus:ring-1 focus:ring-ujat-blue/30"
          />
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-ujat-blue focus:outline-none"
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a.split(" ").slice(0, 4).join(" ")}...
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Área</th>
              <th className="px-4 py-3">Expone</th>
              <th className="px-4 py-3">Perfiles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.folio} className="hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-ujat-blue">
                  {p.folio}
                </td>
                <td className="max-w-xs px-4 py-3">
                  <p className="line-clamp-2 text-slate-800">{p.titulo}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{p.ponentes}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${AREA_COLORS[p.area] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {p.area.split(" ").slice(0, 3).join(" ")}…
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.expone === "Si" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {p.expone}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(p.cargos)].map((c) => (
                      <span key={c} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

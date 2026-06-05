import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { ChartDataPoint } from "../types";
import { createTooltip, hideTooltip, moveTooltip, showTooltipNearElement } from "./tooltip";

interface Props {
  data: ChartDataPoint[];
  height?: number;
}

const PERFIL_COLORS: Record<string, string> = {
  "Profesor Investigador": "#2563eb",
  Estudiante: "#059669",
  "Personal Administrativo": "#d97706",
  Egresado: "#7c3aed",
  "Externo / Otro": "#db2777",
  "Sector Privado": "#dc2626",
  "Colegio Profesional": "#0891b2",
  Otro: "#64748b",
};

export function StackedBarChart({ data, height = 300 }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth || 500;
    const margin = { top: 20, right: 20, bottom: 80, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    const areas = [...new Set(data.map((d) => d.group ?? ""))];
    const perfiles = [...new Set(data.map((d) => d.label))];

    const areaShort: Record<string, string> = {};
    areas.forEach((a) => {
      const words = a.split(" ");
      areaShort[a] = words.length > 3 ? words.slice(0, 3).join(" ") + "…" : a;
    });

    const stackedData = areas.map((area) => {
      const entry: Record<string, number | string> = { area };
      perfiles.forEach((p) => {
        const match = data.find((d) => d.group === area && d.label === p);
        entry[p] = match?.value ?? 0;
      });
      return entry;
    });

    const stack = d3.stack<Record<string, number | string>>().keys(perfiles);
    const series = stack(stackedData);

    const x = d3.scaleBand().domain(areas).range([0, innerW]).padding(0.3);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(series, (s) => d3.max(s, (d) => d[1])) ?? 0])
      .nice()
      .range([innerH, 0]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = createTooltip("tooltip-stacked");

    g.selectAll("g.layer")
      .data(series)
      .join("g")
      .attr("class", "layer")
      .attr("fill", (d) => PERFIL_COLORS[d.key] ?? "#94a3b8")
      .selectAll("rect")
      .data((d) => d)
      .join("rect")
      .attr("x", (d) => x(d.data.area as string) ?? 0)
      .attr("y", (d) => y(d[1]))
      .attr("height", (d) => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
      .attr("rx", 2)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        const el = this as SVGRectElement;
        const parent = el.parentNode as SVGGElement;
        const key = (d3.select(parent).datum() as d3.Series<
          Record<string, number | string>,
          string
        >).key;
        const val = (d.data[key] as number) ?? 0;
        showTooltipNearElement(
          tooltip,
          event,
          `<strong>${key}</strong><br/>${d.data.area}<br/>${val} participaciones`,
          el
        );
      })
      .on("mousemove", (event) => moveTooltip(tooltip, event))
      .on("mouseleave", () => hideTooltip(tooltip));

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickFormat((d) => areaShort[d as string] ?? d))
      .selectAll("text")
      .attr("transform", "rotate(-35)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    g.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").style("font-size", "10px");

    return () => {
      tooltip.remove();
    };
  }, [data, height]);

  return (
    <div>
      <svg ref={ref} className="w-full" />
      <div className="mt-2 flex flex-wrap gap-3 justify-center">
        {Object.entries(PERFIL_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

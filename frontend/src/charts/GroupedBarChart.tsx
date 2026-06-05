import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { ChartDataPoint } from "../types";
import { createTooltip, hideTooltip, moveTooltip, showTooltipNearElement } from "./tooltip";

interface Props {
  data: ChartDataPoint[];
  height?: number;
}

const GROUP_COLORS: Record<string, string> = {
  Seleccionadas: "#2563eb",
  "No seleccionadas": "#cbd5e1",
};

export function GroupedBarChart({ data, height = 280 }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth || 500;
    const margin = { top: 20, right: 20, bottom: 72, left: 44 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    const labels = [...new Set(data.map((d) => d.label))];
    const groups = [...new Set(data.map((d) => d.group ?? ""))];

    const x0 = d3.scaleBand().domain(labels).range([0, innerW]).padding(0.25);
    const x1 = d3.scaleBand().domain(groups).range([0, x0.bandwidth()]).padding(0.12);
    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(data, (d) => d.value) ?? 0) * 1.15])
      .nice()
      .range([innerH, 0]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const tooltip = createTooltip("tooltip-grouped");

    const labelGroups = g
      .selectAll<SVGGElement, string>("g.label-group")
      .data(labels)
      .join("g")
      .attr("class", "label-group")
      .attr("transform", (d) => `translate(${x0(d) ?? 0},0)`);

    labelGroups
      .selectAll<SVGRectElement, ChartDataPoint>("rect")
      .data((label) => data.filter((d) => d.label === label))
      .join("rect")
      .attr("x", (d) => x1(d.group ?? "") ?? 0)
      .attr("width", x1.bandwidth())
      .attr("y", innerH)
      .attr("height", 0)
      .attr("fill", (d) =>
        d.group === "Seleccionadas"
          ? ((d.metadata?.color as string) ?? GROUP_COLORS.Seleccionadas)
          : GROUP_COLORS["No seleccionadas"]
      )
      .attr("rx", 3)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        const el = this as SVGRectElement;
        const extra = d.metadata?.tasa ? `<br/>Tasa selección: ${d.metadata.tasa}%` : "";
        showTooltipNearElement(
          tooltip,
          event,
          `<strong>${d.label}</strong><br/>${d.group}: ${d.value}${extra}`,
          el
        );
      })
      .on("mousemove", (event) => moveTooltip(tooltip, event))
      .on("mouseleave", () => hideTooltip(tooltip))
      .transition()
      .duration(500)
      .attr("y", (d) => y(d.value))
      .attr("height", (d) => innerH - y(d.value));

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
      .attr("transform", "rotate(-28)")
      .style("text-anchor", "end")
      .style("font-size", "9px");

    g.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").style("font-size", "10px");

    return () => {
      tooltip.remove();
    };
  }, [data, height]);

  return (
    <div>
      <svg ref={ref} className="w-full" />
      <div className="mt-2 flex justify-center gap-4">
        {Object.entries(GROUP_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

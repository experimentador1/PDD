import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { ChartDataPoint } from "../types";
import { createTooltip, hideTooltip, moveTooltip, showTooltipNearElement } from "./tooltip";

interface Props {
  data: ChartDataPoint[];
  title?: string;
  height?: number;
  /** Etiquetas de segmentos clicables (ej. "Si" para drill-down) */
  drillDownLabels?: string[];
  onSegmentClick?: (point: ChartDataPoint) => void;
}

export function DonutChart({
  data,
  height = 320,
  drillDownLabels = [],
  onSegmentClick,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const drillSet = new Set(drillDownLabels.map((l) => l.toLowerCase()));

  useEffect(() => {
    if (!ref.current || !data.length) return;

    const drillable = new Set(drillDownLabels.map((l) => l.toLowerCase()));

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth || 400;
    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.55;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3
      .scaleOrdinal<string>()
      .domain(data.map((d) => d.label))
      .range(data.map((d) => (d.metadata?.color as string) ?? d3.schemeTableau10[data.indexOf(d) % 10]));

    const pie = d3
      .pie<ChartDataPoint>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<ChartDataPoint>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(4);

    const tooltip = createTooltip("tooltip-donut");
    const total = d3.sum(data, (d) => d.value);

    g.selectAll("path")
      .data(pie(data))
      .join("path")
      .attr("d", arc)
      .attr("fill", (d) => color(d.data.label))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", (d) =>
        drillable.has(d.data.label.toLowerCase()) && onSegmentClick ? "pointer" : "default"
      )
      .on("mouseenter", function (event, d) {
        const el = this as SVGPathElement;
        d3.select(el).attr("opacity", 0.85);
        const pct = ((d.data.value / total) * 100).toFixed(1);
        const drill = drillable.has(d.data.label.toLowerCase()) && onSegmentClick;
        showTooltipNearElement(
          tooltip,
          event,
          `<strong>${d.data.label}</strong><br/>${d.data.value} propuestas (${pct}%)` +
            (drill ? "<br/><em style='opacity:0.85'>Clic para explorar →</em>" : ""),
          el
        );
      })
      .on("mousemove", (event) => moveTooltip(tooltip, event))
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 1);
        hideTooltip(tooltip);
      })
      .on("click", (_event, d) => {
        if (drillable.has(d.data.label.toLowerCase()) && onSegmentClick) {
          onSegmentClick(d.data);
        }
      });

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .style("font-size", "28px")
      .style("font-weight", "700")
      .style("fill", "#1e293b")
      .text(total);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .style("font-size", "12px")
      .style("fill", "#64748b")
      .text("propuestas");

    return () => {
      d3.selectAll(".tooltip-donut").remove();
    };
  }, [data, height, drillDownLabels, onSegmentClick]);

  return (
    <div>
      <svg ref={ref} className="w-full" />
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((d, i) => {
          const isDrill = drillSet.has(d.label.toLowerCase()) && onSegmentClick;
          return (
            <button
              key={d.label}
              type="button"
              disabled={!isDrill}
              onClick={() => isDrill && onSegmentClick?.(d)}
              className={`flex items-center gap-1.5 text-xs text-slate-600 ${
                isDrill ? "cursor-pointer rounded-lg px-1.5 py-0.5 transition hover:bg-amber-50 hover:text-amber-800" : ""
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: (d.metadata?.color as string) ?? d3.schemeTableau10[i % 10] }}
              />
              <span className="max-w-[140px] truncate">{d.label}</span>
              <span className="font-semibold text-slate-800">{d.value}</span>
              {isDrill && <span className="text-[10px] text-amber-600">↗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

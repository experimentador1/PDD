import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { ChartDataPoint } from "../types";
import { bindTooltipHandlers, createTooltip } from "./tooltip";

interface Props {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
}

export function BarChart({ data, height = 260, color = "#003366" }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth || 400;
    const margin = { top: 16, right: 16, bottom: 56, left: 44 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerW])
      .padding(0.25);

    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(data, (d) => d.value) ?? 0) * 1.1])
      .nice()
      .range([innerH, 0]);

    const tooltip = createTooltip("tooltip-bar");

    const bars = g
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", (d) => x(d.label) ?? 0)
      .attr("width", x.bandwidth())
      .attr("y", innerH)
      .attr("height", 0)
      .attr("fill", (d, i) => (d.metadata?.color as string) ?? d3.schemeTableau10[i % 10])
      .attr("rx", 4)
      .style("cursor", "pointer");

    bars
      .transition()
      .duration(500)
      .attr("y", (d) => y(d.value))
      .attr("height", (d) => innerH - y(d.value));

    bindTooltipHandlers(
      bars,
      tooltip,
      (d) => {
        const point = d as ChartDataPoint;
        const pct = point.metadata?.pct ? ` (${point.metadata.pct}%)` : "";
        return `<strong>${point.label}</strong><br/>${point.value} propuestas${pct}`;
      },
      true
    );

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    g.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").style("font-size", "10px");

    return () => {
      tooltip.remove();
    };
  }, [data, height, color]);

  return <svg ref={ref} className="w-full" />;
}

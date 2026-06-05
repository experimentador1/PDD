import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { ChartDataPoint } from "../types";
import { bindTooltipHandlers, createTooltip } from "./tooltip";

interface Props {
  data: ChartDataPoint[];
  color?: string;
  showValues?: boolean;
}

export function HorizontalBarChart({ data, color = "#2563eb", showValues = true }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const barHeight = 28;
    const height = data.length * (barHeight + 6) + 16;
    const width = ref.current.clientWidth || 500;

    const maxLabelLen = d3.max(data, (d) => d.label.length) ?? 20;
    const labelWidth = Math.min(260, Math.max(120, maxLabelLen * 6.5));
    const margin = { top: 8, right: 48, bottom: 8, left: labelWidth + 12 };
    const innerWidth = width - margin.left - margin.right;

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const maxVal = d3.max(data, (d) => d.value) ?? 1;

    const x = d3.scaleLinear().domain([0, maxVal]).range([0, innerWidth]);
    const y = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, data.length * (barHeight + 6)])
      .padding(0.15);

    const tooltip = createTooltip("tooltip-hbar");

    const bars = g
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d.label) ?? 0)
      .attr("height", y.bandwidth())
      .attr("width", 0)
      .attr("fill", (d) => (d.metadata?.color as string) ?? color)
      .attr("rx", 4)
      .style("cursor", "pointer");

    bars
      .transition()
      .duration(600)
      .attr("width", (d) => x(d.value));

    bindTooltipHandlers(
      bars,
      tooltip,
      (d) => {
        const point = d as ChartDataPoint;
        const full = (point.metadata?.tema_completo as string) ?? point.label;
        return `<strong>${full}</strong><br/>${point.value} propuestas`;
      },
      true
    );

    g.selectAll(".label")
      .data(data)
      .join("text")
      .attr("class", "label")
      .attr("x", -10)
      .attr("y", (d) => (y(d.label) ?? 0) + y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .style("font-size", "11px")
      .style("fill", "#475569")
      .text((d) => {
        const maxChars = Math.floor(labelWidth / 6.5);
        return d.label.length > maxChars ? d.label.slice(0, maxChars - 1) + "…" : d.label;
      });

    if (showValues) {
      g.selectAll(".value")
        .data(data)
        .join("text")
        .attr("class", "value")
        .attr("x", (d) => x(d.value) + 6)
        .attr("y", (d) => (y(d.label) ?? 0) + y.bandwidth() / 2)
        .attr("dominant-baseline", "middle")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("fill", "#1e293b")
        .text((d) => d.value);
    }

    return () => {
      tooltip.remove();
    };
  }, [data, color, showValues]);

  return <svg ref={ref} className="w-full" />;
}

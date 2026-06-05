import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { ChartDataPoint } from "../types";
import { createTooltip, hideTooltip, moveTooltip, showTooltipNearElement } from "./tooltip";

interface Props {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
}

export function TermBubbleChart({ data, height = 320, color = "#2563eb" }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth || 500;
    svg.attr("width", width).attr("height", height);

    const maxVal = d3.max(data, (d) => d.value) ?? 1;
    const radiusScale = d3.scaleSqrt().domain([1, maxVal]).range([12, 48]);

    const nodes = data.map((d) => ({
      ...d,
      r: radiusScale(d.value),
      x: width / 2 + (Math.random() - 0.5) * 80,
      y: height / 2 + (Math.random() - 0.5) * 80,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(2))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<(typeof nodes)[0]>().radius((d) => d.r + 3)
      )
      .force("x", d3.forceX(width / 2).strength(0.04))
      .force("y", d3.forceY(height / 2).strength(0.04));

    const tooltip = createTooltip("tooltip-bubble");

    const node = svg
      .selectAll<SVGGElement, (typeof nodes)[0]>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer");

    node
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (_d, i) => d3.interpolateBlues(0.35 + (i / nodes.length) * 0.55))
      .attr("stroke", color)
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.88);

    node
      .filter((d) => d.r > 18)
      .append("text")
      .text((d) => (d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("font-size", (d) => `${Math.max(8, Math.min(d.r / 2.5, 11))}px`)
      .style("fill", "#1e293b")
      .style("font-weight", "500")
      .style("pointer-events", "none");

    node
      .on("mouseenter", function (event, d) {
        const el = this as SVGGElement;
        showTooltipNearElement(
          tooltip,
          event,
          `<strong>${d.label}</strong><br/>Frecuencia: ${d.value}`,
          el
        );
      })
      .on("mousemove", (event) => moveTooltip(tooltip, event))
      .on("mouseleave", () => hideTooltip(tooltip));

    simulation.on("tick", () => {
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, height, color]);

  return <svg ref={ref} className="w-full" />;
}

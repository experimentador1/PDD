import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { HierarchyNode as DataNode } from "../types";
import { createTooltip, hideTooltip, moveTooltip, showTooltipNearElement } from "./tooltip";

type TreemapNode = d3.HierarchyRectangularNode<DataNode>;

interface Props {
  data: DataNode;
  height?: number;
}

const AREA_COLORS: Record<string, string> = {
  "Calidad y mejora continua en la formación académica": "#2563eb",
  "Investigación de Alto Impacto": "#7c3aed",
  "Vinculación productiva y responsabilidad universitaria": "#059669",
  "Gestión innovadora y sostenibilidad financiera": "#d97706",
  "Cultura, Identidad y Legado UJAT": "#db2777",
};

export function TreemapChart({ data, height = 380 }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.children?.length) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth || 600;
    svg.attr("width", width).attr("height", height);

    const root = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    d3
      .treemap<DataNode>()
      .size([width, height])
      .paddingInner(3)
      .paddingOuter(4)
      .round(true)(root);

    const tooltip = createTooltip("tooltip-treemap");
    const leaves = root.leaves() as TreemapNode[];

    const nodes = svg
      .selectAll<SVGGElement, TreemapNode>("g")
      .data(leaves)
      .join("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    nodes
      .append("rect")
      .attr("width", (d) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .attr("fill", (d) => {
        const area = d.ancestors().find((a) => a.depth === 1)?.data.name ?? "";
        const base = AREA_COLORS[area] ?? "#64748b";
        const opacity = 0.4 + (d.depth / 4) * 0.5;
        return d3.color(base)?.copy({ opacity })?.formatRgb() ?? base;
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("rx", 3)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        const el = this as SVGRectElement;
        const area = d.ancestors().find((a) => a.depth === 1)?.data.name ?? "";
        showTooltipNearElement(
          tooltip,
          event,
          `<strong>${d.data.name}</strong><br/>Área: ${area}<br/>${d.value} propuestas`,
          el
        );
      })
      .on("mousemove", (event) => moveTooltip(tooltip, event))
      .on("mouseleave", () => hideTooltip(tooltip));

    nodes
      .filter((d) => d.x1 - d.x0 > 50 && d.y1 - d.y0 > 24)
      .append("text")
      .attr("x", 6)
      .attr("y", 16)
      .style("font-size", "10px")
      .style("fill", "#fff")
      .style("font-weight", "500")
      .text((d) => {
        const w = d.x1 - d.x0;
        const maxChars = Math.floor(w / 6);
        const name = d.data.name;
        return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
      });

    nodes
      .filter((d) => d.x1 - d.x0 > 30 && d.y1 - d.y0 > 36)
      .append("text")
      .attr("x", 6)
      .attr("y", 30)
      .style("font-size", "11px")
      .style("fill", "rgba(255,255,255,0.85)")
      .style("font-weight", "700")
      .text((d) => d.value ?? 0);

    return () => {
      tooltip.remove();
    };
  }, [data, height]);

  return <svg ref={ref} className="w-full rounded-xl" />;
}

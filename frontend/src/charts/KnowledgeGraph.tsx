import * as d3 from "d3";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphNode, KnowledgeGraphResponse } from "../types";
import { createTooltip, hideTooltip, moveTooltip, showTooltipNearElement } from "./tooltip";

interface SimNode extends GraphNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  relation: string;
  strength: number;
}

interface Props {
  data: KnowledgeGraphResponse;
  activeTypes: Set<string>;
  searchTerm: string;
  onNodeSelect: (node: GraphNode | null) => void;
  selectedId: string | null;
}

const TYPE_RADIUS: Record<string, number> = {
  root: 28,
  area: 22,
  eje: 20,
  clasificacion: 14,
  oe: 12,
  pud: 10,
  tema: 8,
  indicador: 6,
};

const PAN_STEP = 80;
const ZOOM_FACTOR = 1.25;

function ControlButton({
  onClick,
  title,
  children,
  className = "",
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-ujat-blue/40 hover:bg-slate-50 hover:text-ujat-blue active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}

export function KnowledgeGraph({
  data,
  activeTypes,
  searchTerm,
  onNodeSelect,
  selectedId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const savedTransform = transformRef.current;
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    svg.attr("width", width).attr("height", height);

    const filteredNodes: SimNode[] = data.nodes
      .filter((n) => activeTypes.has(n.type))
      .map((n) => ({ ...n }));

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks: SimLink[] = data.links
      .filter((l) => nodeIds.has(l.source as string) && nodeIds.has(l.target as string))
      .map((l) => ({
        source: l.source,
        target: l.target,
        relation: l.relation,
        strength: l.strength,
      }));

    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        transformRef.current = event.transform;
        setZoomLevel(Math.round(event.transform.k * 100));
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    if (savedTransform.k !== 1 || savedTransform.x !== 0 || savedTransform.y !== 0) {
      svg.call(zoom.transform, savedTransform);
    }

    const simulation = d3
      .forceSimulation<SimNode>(filteredNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(filteredLinks)
          .id((d) => d.id)
          .distance((l) => (l.relation === "relacion_semantica" ? 120 : 70))
          .strength((l) => Math.min(l.strength * 0.3, 0.8))
      )
      .force("charge", d3.forceManyBody<SimNode>().strength((d) => ((d as SimNode).type === "root" ? -800 : -180)))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<SimNode>().radius((d) => (TYPE_RADIUS[d.type] ?? 8) + 4)
      );

    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", (d) => (d.relation === "relacion_semantica" ? "#cbd5e1" : "#94a3b8"))
      .attr("stroke-opacity", (d) => (d.relation === "relacion_semantica" ? 0.35 : 0.55))
      .attr("stroke-width", (d) => (d.relation === "alineado_con" ? 2.5 : 1))
      .attr("stroke-dasharray", (d) => (d.relation === "relacion_semantica" ? "4,3" : "none"));

    const tooltip = createTooltip("tooltip-kg");

    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, SimNode>("g")
      .data(filteredNodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as unknown as (selection: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>) => void
      );

    node
      .append("circle")
      .attr("r", (d) => TYPE_RADIUS[d.type] ?? 8)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) => (d.id === selectedId ? "#003366" : "#fff"))
      .attr("stroke-width", (d) => (d.id === selectedId ? 3 : 1.5))
      .attr("opacity", (d) => {
        if (!searchTerm) return 0.92;
        const match =
          d.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.description.toLowerCase().includes(searchTerm.toLowerCase());
        return match ? 1 : 0.25;
      });

    node
      .filter((d) => TYPE_RADIUS[d.type] >= 14)
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (TYPE_RADIUS[d.type] ?? 8) + 14)
      .style("font-size", "9px")
      .style("fill", "#334155")
      .style("pointer-events", "none")
      .style("font-weight", (d) => (d.type === "root" || d.type === "area" ? "600" : "400"));

    node
      .on("click", (_event, d) => onNodeSelect(d))
      .on("mouseenter", function (event, d) {
        const el = this as SVGGElement;
        d3.select(el).select("circle").attr("stroke-width", 3).attr("stroke", "#003366");
        showTooltipNearElement(
          tooltip,
          event,
          `<strong>${d.label}</strong><br/><span style="opacity:0.8">${d.type}</span><br/>${d.description}`,
          el
        );
      })
      .on("mousemove", (event) => moveTooltip(tooltip, event))
      .on("mouseleave", function (_event, d) {
        const el = this as SVGGElement;
        d3.select(el)
          .select("circle")
          .attr("stroke-width", d.id === selectedId ? 3 : 1.5)
          .attr("stroke", d.id === selectedId ? "#003366" : "#fff");
        hideTooltip(tooltip);
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, dimensions, activeTypes, searchTerm, selectedId, onNodeSelect]);

  const applyTransform = useCallback((transform: d3.ZoomTransform) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.transform, transform);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, ZOOM_FACTOR);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, 1 / ZOOM_FACTOR);
  }, []);

  const handleReset = useCallback(() => {
    transformRef.current = d3.zoomIdentity;
    applyTransform(d3.zoomIdentity);
  }, [applyTransform]);

  const handlePan = useCallback(
    (dx: number, dy: number) => {
      const t = transformRef.current;
      applyTransform(t.translate(dx, dy));
    },
    [applyTransform]
  );

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-xl bg-slate-50/80">
      <svg ref={svgRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Controles de navegación */}
      <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col items-end gap-2">
        {/* Zoom */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-md backdrop-blur-sm">
          <ControlButton onClick={handleZoomOut} title="Alejar">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M5 12h14" />
            </svg>
          </ControlButton>
          <span className="min-w-[3rem] select-none text-center text-xs font-medium text-slate-500">
            {zoomLevel}%
          </span>
          <ControlButton onClick={handleZoomIn} title="Acercar">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </ControlButton>
          <div className="mx-0.5 h-5 w-px bg-slate-200" />
          <ControlButton onClick={handleReset} title="Restablecer vista">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </ControlButton>
        </div>

        {/* Traslación */}
        <div className="pointer-events-auto rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-md backdrop-blur-sm">
          <div className="grid grid-cols-3 gap-0.5">
            <div />
            <ControlButton onClick={() => handlePan(0, PAN_STEP)} title="Mover arriba">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </ControlButton>
            <div />
            <ControlButton onClick={() => handlePan(PAN_STEP, 0)} title="Mover izquierda">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </ControlButton>
            <ControlButton onClick={handleReset} title="Centrar vista" className="bg-slate-50">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              </svg>
            </ControlButton>
            <ControlButton onClick={() => handlePan(-PAN_STEP, 0)} title="Mover derecha">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </ControlButton>
            <div />
            <ControlButton onClick={() => handlePan(0, -PAN_STEP)} title="Mover abajo">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </ControlButton>
            <div />
          </div>
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-white/80 px-2.5 py-1 text-[10px] text-slate-400 backdrop-blur-sm">
        Rueda del mouse: zoom · Arrastrar lienzo: mover · Arrastrar nodo: reposicionar
      </p>
    </div>
  );
}

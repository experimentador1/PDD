import * as d3 from "d3";

type TooltipSelection = d3.Selection<HTMLDivElement, number, d3.BaseType, unknown>;

export function createTooltip(className: string): TooltipSelection {
  return d3
    .select("body")
    .selectAll<HTMLDivElement, number>(`.${className}`)
    .data([0])
    .join("div")
    .attr("class", `tooltip-d3 ${className}`)
    .style("opacity", 0)
    .style("position", "fixed")
    .style("pointer-events", "none");
}

function clampPosition(
  tooltip: TooltipSelection,
  x: number,
  y: number,
  anchor: "cursor" | "element",
  event: MouseEvent
): { x: number; y: number } {
  const node = tooltip.node();
  if (!node) return { x, y };

  const rect = node.getBoundingClientRect();
  const padding = 8;
  let left = x;
  let top = y;

  if (left + rect.width > window.innerWidth - padding) {
    left = anchor === "cursor" ? event.clientX - rect.width - 12 : x - rect.width;
  }
  if (top + rect.height > window.innerHeight - padding) {
    top = anchor === "cursor" ? event.clientY - rect.height - 12 : y - rect.height;
  }
  if (left < padding) left = padding;
  if (top < padding) top = padding;

  return { x: left, y: top };
}

export function showTooltipAtCursor(
  tooltip: TooltipSelection,
  event: MouseEvent,
  html: string,
  offsetX = 14,
  offsetY = -10
): void {
  tooltip.style("opacity", 1).html(html);

  const { x, y } = clampPosition(
    tooltip,
    event.clientX + offsetX,
    event.clientY + offsetY,
    "cursor",
    event
  );

  tooltip.style("left", `${x}px`).style("top", `${y}px`);
}

export function showTooltipNearElement(
  tooltip: TooltipSelection,
  event: MouseEvent,
  html: string,
  element: Element
): void {
  tooltip.style("opacity", 1).html(html);

  const box = element.getBoundingClientRect();
  const offsetX = 10;
  let x = box.right + offsetX;
  let y = box.top + box.height / 2 - 20;

  if (x + 200 > window.innerWidth) {
    x = box.left - offsetX;
    tooltip.style("transform", "translateX(-100%)");
  } else {
    tooltip.style("transform", "none");
  }

  const { x: left, y: top } = clampPosition(tooltip, x, y, "element", event);
  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

export function moveTooltip(tooltip: TooltipSelection, event: MouseEvent, offsetX = 14, offsetY = -10): void {
  if (parseFloat(tooltip.style("opacity") || "0") <= 0) return;

  const { x, y } = clampPosition(
    tooltip,
    event.clientX + offsetX,
    event.clientY + offsetY,
    "cursor",
    event
  );

  tooltip.style("left", `${x}px`).style("top", `${y}px`);
}

export function hideTooltip(tooltip: TooltipSelection): void {
  tooltip.style("opacity", 0).style("transform", "none");
}

export function bindTooltipHandlers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selection: d3.Selection<any, any, any, any>,
  tooltip: TooltipSelection,
  getHtml: (datum: unknown) => string,
  useElementAnchor = false
): void {
  selection
    .on("mouseenter", function (event: MouseEvent, d) {
      const html = getHtml(d);
      const el = this as Element;
      if (useElementAnchor) {
        showTooltipNearElement(tooltip, event, html, el);
      } else {
        showTooltipAtCursor(tooltip, event, html);
      }
    })
    .on("mousemove", (event: MouseEvent) => {
      moveTooltip(tooltip, event);
    })
    .on("mouseleave", () => {
      hideTooltip(tooltip);
    });
}

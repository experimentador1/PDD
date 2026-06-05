from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pandas as pd

from app.schemas.models import GraphLink, GraphNode, KnowledgeGraphResponse
from app.services.analytics import AREA_COLORS, _shorten

INDICATORS_PATH = Path(__file__).resolve().parents[2] / "data" / "indicadores_pdd_dacyti_2022_2026.xlsx"

AREA_TO_EJE: dict[str, str] = {
    "Calidad y mejora continua en la formación académica": "Calidad en los Programas Educativos",
    "Investigación de Alto Impacto": "Producción, Gestión, Aplicación y Divulgación del Conocimiento",
    "Vinculación productiva y responsabilidad universitaria": "Vinculación con Responsabilidad Social",
    "Gestión innovadora y sostenibilidad financiera": "Gestión Eficaz y Transparente",
    "Cultura, Identidad y Legado UJAT": "Cultura y Valores Universitarios",
}

EJE_COLORS: dict[str, str] = {
    "Calidad en los Programas Educativos": "#2563eb",
    "Producción, Gestión, Aplicación y Divulgación del Conocimiento": "#7c3aed",
    "Cultura y Valores Universitarios": "#db2777",
    "Vinculación con Responsabilidad Social": "#059669",
    "Gestión Eficaz y Transparente": "#d97706",
    "Equidad y Movilidad Social": "#0891b2",
    "Extensionismo": "#64748b",
}

NODE_COLORS: dict[str, str] = {
    "root": "#003366",
    "area": "#2563eb",
    "clasificacion": "#60a5fa",
    "tema": "#93c5fd",
    "eje": "#7c3aed",
    "oe": "#a78bfa",
    "pud": "#c4b5fd",
    "indicador": "#e9d5ff",
}


def _slug(text: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9]+", "-", str(text).strip().lower())
    return clean.strip("-")[:60]


def load_indicators() -> pd.DataFrame:
    path = INDICATORS_PATH
    if not path.exists():
        alt = Path(__file__).resolve().parents[3] / "indicadores_pdd_dacyti_2022_2026.xlsx"
        path = alt
    return pd.read_excel(path, sheet_name=0)


def build_knowledge_graph(df: pd.DataFrame) -> KnowledgeGraphResponse:
    nodes: list[GraphNode] = []
    links: list[GraphLink] = []
    node_ids: set[str] = set()

    def add_node(node: GraphNode) -> None:
        if node.id not in node_ids:
            nodes.append(node)
            node_ids.add(node.id)

    def add_link(source: str, target: str, rel: str, strength: float = 1.0) -> None:
        links.append(GraphLink(source=source, target=target, relation=rel, strength=strength))

    root_id = "pdd-dacyti"
    add_node(
        GraphNode(
            id=root_id,
            label="PDD DACYTI",
            type="root",
            value=len(df),
            color=NODE_COLORS["root"],
            description="Plan de Desarrollo Divisional — mapa integrado de propuestas e indicadores",
        )
    )

    # --- Propuestas: Área → Clasificación → Tema ---
    area_counts = df.groupby("AREA").size()
    for area, count in area_counts.items():
        area_id = f"area-{_slug(area)}"
        add_node(
            GraphNode(
                id=area_id,
                label=_shorten(area, 45),
                type="area",
                value=int(count),
                color=AREA_COLORS.get(area, NODE_COLORS["area"]),
                description=f"{count} propuestas en {area}",
                metadata={"area_completa": area},
            )
        )
        add_link(root_id, area_id, "contiene_propuestas", 2.0)

        mapped_eje = AREA_TO_EJE.get(area)
        if mapped_eje:
            eje_id = f"eje-{_slug(mapped_eje)}"
            add_link(area_id, eje_id, "alineado_con", 1.5)

    for (area, clasif), count in df.groupby(["AREA", "CLASIFICACION"]).size().items():
        area_id = f"area-{_slug(area)}"
        clasif_id = f"clasif-{_slug(area)}-{_slug(str(clasif))}"
        add_node(
            GraphNode(
                id=clasif_id,
                label=str(clasif),
                type="clasificacion",
                value=int(count),
                color=AREA_COLORS.get(area, NODE_COLORS["clasificacion"]),
                description=f"Clasificación {clasif} — {count} propuestas",
                metadata={"area": area},
            )
        )
        add_link(area_id, clasif_id, "clasifica", 1.2)

    tema_counts = df.groupby(["AREA", "CLASIFICACION", "TEMA"]).size().reset_index(name="count")
    for _, row in tema_counts.iterrows():
        tema_id = f"tema-{_slug(row['TEMA'])}"
        clasif_id = f"clasif-{_slug(row['AREA'])}-{_slug(str(row['CLASIFICACION']))}"
        add_node(
            GraphNode(
                id=tema_id,
                label=_shorten(row["TEMA"], 40),
                type="tema",
                value=int(row["count"]),
                color=AREA_COLORS.get(row["AREA"], NODE_COLORS["tema"]),
                description=f"{row['count']} propuestas · {row['TEMA']}",
                metadata={"tema_completo": row["TEMA"], "area": row["AREA"]},
            )
        )
        add_link(clasif_id, tema_id, "tema_de", 0.8)

    # --- Indicadores PDD: Eje → OE/PUD → Indicador ---
    ind_df = load_indicators()
    oe_tracker: dict[str, str] = {}
    pud_tracker: dict[str, str] = {}

    for _, row in ind_df.iterrows():
        eje_name = str(row["eje_nombre"])
        eje_id = f"eje-{_slug(eje_name)}"
        add_node(
            GraphNode(
                id=eje_id,
                label=_shorten(eje_name, 40),
                type="eje",
                value=int(row["eje_num"]),
                color=EJE_COLORS.get(eje_name, NODE_COLORS["eje"]),
                description=f"Eje {row['eje_num']}: {eje_name}",
                metadata={"eje_num": int(row["eje_num"])},
            )
        )
        add_link(root_id, eje_id, "eje_estrategico", 1.8)

        nivel = str(row["nivel"]) if pd.notna(row["nivel"]) else ""
        indicador_text = str(row["indicador"]) if pd.notna(row["indicador"]) else ""
        if not indicador_text:
            continue

        parent_id = eje_id

        if nivel == "OE" and pd.notna(row.get("oe_codigo")):
            oe_code = str(row["oe_codigo"])
            oe_id = f"oe-{_slug(oe_code)}"
            oe_tracker[oe_code] = oe_id
            add_node(
                GraphNode(
                    id=oe_id,
                    label=oe_code,
                    type="oe",
                    value=1,
                    color=NODE_COLORS["oe"],
                    description=f"Objetivo Estratégico: {oe_code}",
                )
            )
            add_link(eje_id, oe_id, "objetivo_estrategico", 1.0)
            parent_id = oe_id

        if nivel == "PUD" and pd.notna(row.get("pud")):
            pud_text = str(row["pud"])
            pud_key = pud_text.split()[0] if pud_text else f"pud-{row.name}"
            pud_id = f"pud-{_slug(pud_key)}"
            pud_tracker[pud_key] = pud_id
            add_node(
                GraphNode(
                    id=pud_id,
                    label=_shorten(pud_text, 42),
                    type="pud",
                    value=1,
                    color=NODE_COLORS["pud"],
                    description=pud_text,
                    metadata={"estrategia": str(row.get("estrategia_codigo", ""))},
                )
            )
            add_link(eje_id, pud_id, "programa_desarrollo", 0.9)
            parent_id = pud_id

        ind_id = f"ind-{_slug(indicador_text[:50])}-{row.name}"
        meta_2026 = row.get("meta_2026")
        add_node(
            GraphNode(
                id=ind_id,
                label=_shorten(indicador_text, 50),
                type="indicador",
                value=1,
                color=NODE_COLORS["indicador"],
                description=indicador_text,
                metadata={
                    "linea_base": str(row.get("linea_base", "")),
                    "meta_2026": str(meta_2026) if pd.notna(meta_2026) else "",
                    "area_responsable": str(row.get("area_responsable", "")),
                    "nivel": nivel,
                },
            )
        )
        add_link(parent_id, ind_id, "mide", 0.6)

    # Cross-link temas con indicadores por similitud de palabras clave (top matches)
    _link_temas_indicadores(nodes, links, tema_counts)

    stats = {
        "total_propuestas": len(df),
        "areas_tematicas": int(df["AREA"].nunique()),
        "temas_unicos": int(df["TEMA"].nunique()),
        "clasificaciones": int(df["CLASIFICACION"].nunique()),
        "indicadores_pdd": len(ind_df),
        "ejes_institucionales": int(ind_df["eje_num"].nunique()),
        "total_nodos": len(nodes),
        "total_enlaces": len(links),
    }

    return KnowledgeGraphResponse(
        nodes=nodes,
        links=links,
        stats=stats,
        legend=_build_legend(),
    )


def _link_temas_indicadores(
    nodes: list[GraphNode],
    links: list[GraphLink],
    tema_counts: pd.DataFrame,
    max_links: int = 30,
) -> None:
    tema_nodes = [n for n in nodes if n.type == "tema"]
    ind_nodes = [n for n in nodes if n.type == "indicador"]
    existing = {(l.source, l.target) for l in links}
    scored: list[tuple[float, str, str]] = []

    for tema in tema_nodes:
        tema_words = set(re.findall(r"\w{4,}", tema.description.lower()))
        for ind in ind_nodes:
            ind_words = set(re.findall(r"\w{4,}", ind.description.lower()))
            overlap = tema_words & ind_words
            if len(overlap) >= 2:
                score = len(overlap) / max(len(tema_words), 1)
                scored.append((score, tema.id, ind.id))

    scored.sort(reverse=True)
    for score, source, target in scored[:max_links]:
        if (source, target) not in existing:
            links.append(GraphLink(source=source, target=target, relation="relacion_semantica", strength=score))
            existing.add((source, target))


def _build_legend() -> list[dict[str, str]]:
    return [
        {"type": "root", "label": "PDD DACYTI", "color": NODE_COLORS["root"]},
        {"type": "area", "label": "Área temática (propuestas)", "color": NODE_COLORS["area"]},
        {"type": "clasificacion", "label": "Clasificación", "color": NODE_COLORS["clasificacion"]},
        {"type": "tema", "label": "Tema específico", "color": NODE_COLORS["tema"]},
        {"type": "eje", "label": "Eje PDD institucional", "color": NODE_COLORS["eje"]},
        {"type": "oe", "label": "Objetivo Estratégico (OE)", "color": NODE_COLORS["oe"]},
        {"type": "pud", "label": "Programa de desarrollo (PUD)", "color": NODE_COLORS["pud"]},
        {"type": "indicador", "label": "Indicador PDD (61)", "color": NODE_COLORS["indicador"]},
    ]

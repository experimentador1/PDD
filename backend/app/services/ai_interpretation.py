from __future__ import annotations

import json
import os
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Optional

from openai import OpenAI

from app.schemas.models import (
    AiInterpretationResponse,
    AnalyticsResponse,
    GraphNode,
    IssueTreeRama,
    KnowledgeGraphResponse,
    OportunidadArea,
    PrioridadIniciativa,
)

SYSTEM_PROMPT = """Eres un consultor estratégico senior al estilo McKinsey, especializado en el Plan de
Desarrollo Divisional (PDD) de la División Académica de Ciencias y Tecnologías de la Información
(DACYTI) de la Universidad Juárez Autónoma de Tabasco (UJAT).

Interpreta el mapa de conocimiento que integra:
1) propuestas del foro PDD (áreas, clasificaciones, temas),
2) marco institucional (ejes, OE, PUD, 61 indicadores),
3) puentes semánticos tema↔indicador.

Aplica estos marcos McKinsey de forma explícita y estructurada (MECE):
- Issue Tree: descomponer oportunidades en ramas mutuamente excluyentes
- Gap Analysis: brecha entre situación actual (propuestas/indicadores) y metas 2026
- Matriz Impacto–Esfuerzo: priorizar iniciativas (quick wins, estratégicos, evaluar, evitar)
- Three Horizons (H1/H2/H3): clasificar temporalmente las oportunidades
- 5 puntos clave ejecutivos: bullets accionables para la dirección divisional

Responde SIEMPRE en español formal, con cifras y evidencia del contexto.
Responde únicamente con JSON válido según el esquema solicitado."""

JSON_SCHEMA_INSTRUCTION = """
Responde con JSON con exactamente estas claves:
{
  "resumen_ejecutivo": "string (3-4 oraciones, estilo nota ejecutiva McKinsey)",
  "puntos_clave_ejecutivos": ["string", ...] (EXACTAMENTE 5 puntos clave para la dirección divisional),
  "areas_oportunidad": [
    {
      "nombre": "string (nombre del área de oportunidad)",
      "descripcion": "string (por qué es oportunidad)",
      "evidencia": "string (datos del contexto que la sustentan)",
      "indicadores_relacionados": ["string", ...]
    }
  ] (4-6 áreas de oportunidad),
  "arbol_issues": [
    {
      "pregunta": "string (rama MECE del issue tree, ej. Cobertura temática)",
      "hallazgos": ["string", ...] (2-4 hallazgos por rama)
    }
  ] (3-4 ramas del issue tree),
  "analisis_brechas": "string (párrafo Gap Analysis: actual vs meta 2026 en indicadores clave)",
  "matriz_priorizacion": [
    {
      "iniciativa": "string (tema o propuesta priorizada)",
      "impacto": "alto|medio|bajo",
      "esfuerzo": "alto|medio|bajo",
      "cuadrante": "quick win|proyecto estratégico|evaluar|evitar",
      "horizonte": "H1|H2|H3",
      "rationale": "string (justificación breve)"
    }
  ] (5-8 iniciativas priorizadas),
  "analisis_alineacion": "string (alineación propuestas ↔ ejes/indicadores PDD)",
  "hallazgos_indicadores": ["string", ...] (4-6 hallazgos sobre indicadores y metas 2026),
  "brechas_y_riesgos": ["string", ...] (3-5 brechas o riesgos),
  "recomendaciones": ["string", ...] (4-6 recomendaciones accionables),
  "conexiones_clave": ["string", ...] (3-5 vínculos semánticos tema↔indicador),
  "marcos_consultoria": ["string", ...] (lista de marcos McKinsey aplicados en el análisis)
}"""


def _node_map(nodes: list[GraphNode]) -> dict[str, GraphNode]:
    return {n.id: n for n in nodes}


def _top_nodes(nodes: list[GraphNode], node_type: str, limit: int = 8) -> list[dict[str, Any]]:
    filtered = [n for n in nodes if n.type == node_type]
    filtered.sort(key=lambda n: n.value, reverse=True)
    return [
        {
            "label": n.label,
            "valor": n.value,
            "descripcion": n.description[:200],
        }
        for n in filtered[:limit]
    ]


def build_interpretation_context(
    graph: KnowledgeGraphResponse,
    analytics: Optional[AnalyticsResponse] = None,
    focus_node_id: Optional[str] = None,
) -> dict[str, Any]:
    nodes = graph.nodes
    links = graph.links
    by_id = _node_map(nodes)

    semantic_links: list[dict[str, Any]] = []
    alignment_links: list[dict[str, str]] = []

    for link in links:
        src = by_id.get(link.source)
        tgt = by_id.get(link.target)
        if not src or not tgt:
            continue
        if link.relation == "relacion_semantica":
            semantic_links.append(
                {
                    "tema": src.label if src.type == "tema" else tgt.label,
                    "indicador": tgt.label if tgt.type == "indicador" else src.label,
                    "fuerza": round(link.strength, 2),
                }
            )
        elif link.relation == "alineado_con":
            alignment_links.append({"area_propuesta": src.label, "eje_pdd": tgt.label})

    indicators = [n for n in nodes if n.type == "indicador"]
    indicators_with_meta = [
        {
            "indicador": n.label,
            "linea_base": n.metadata.get("linea_base", ""),
            "meta_2026": n.metadata.get("meta_2026", ""),
            "area_responsable": n.metadata.get("area_responsable", ""),
        }
        for n in indicators[:25]
    ]

    linked_indicator_ids: set[str] = set()
    for link in links:
        if link.relation != "relacion_semantica":
            continue
        src = by_id.get(link.source)
        tgt = by_id.get(link.target)
        if src and src.type == "indicador":
            linked_indicator_ids.add(link.source)
        if tgt and tgt.type == "indicador":
            linked_indicator_ids.add(link.target)
    unlinked_count = sum(1 for n in indicators if n.id not in linked_indicator_ids)

    type_counts = Counter(n.type for n in nodes)
    relation_counts = Counter(l.relation for l in links)

    context: dict[str, Any] = {
        "estadisticas_grafo": graph.stats,
        "conteo_nodos_por_tipo": dict(type_counts),
        "conteo_enlaces_por_relacion": dict(relation_counts),
        "areas_con_mas_propuestas": _top_nodes(nodes, "area"),
        "temas_destacados": _top_nodes(nodes, "tema", 12),
        "ejes_institucionales": _top_nodes(nodes, "eje", 7),
        "alineaciones_area_eje": alignment_links,
        "vinculos_semanticos_tema_indicador": semantic_links[:25],
        "indicadores_con_metas": indicators_with_meta,
        "indicadores_sin_vinculo_semantico": unlinked_count,
        "total_indicadores": len(indicators),
    }

    if analytics:
        context["dashboard"] = {
            "total_propuestas": analytics.metadata.get("total_propuestas"),
            "kpis": [
                {"label": k.label, "valor": k.value, "unidad": k.unit, "descripcion": k.description}
                for k in analytics.kpis[:8]
            ],
            "distribucion_areas": [
                {"area": p.label, "propuestas": p.value, "pct": p.metadata.get("pct")}
                for p in analytics.por_area
            ],
            "top_temas_dashboard": [
                {"tema": t.label, "propuestas": t.value} for t in analytics.top_temas[:10]
            ],
            "tasa_exposicion": next(
                ({"label": p.label, "valor": p.value} for p in analytics.por_expone if str(p.label).lower().startswith("si")),
                None,
            ),
        }

    if focus_node_id and focus_node_id in by_id:
        node = by_id[focus_node_id]
        neighbors = [
            {
                "relacion": l.relation,
                "nodo": by_id[l.target if l.source == focus_node_id else l.source].label,
                "tipo": by_id[l.target if l.source == focus_node_id else l.source].type,
            }
            for l in links
            if l.source == focus_node_id or l.target == focus_node_id
        ][:15]
        context["nodo_foco"] = {
            "label": node.label,
            "tipo": node.type,
            "descripcion": node.description,
            "vecinos": neighbors,
        }

    return context


def _parse_oportunidades(raw: list[Any]) -> list[OportunidadArea]:
    result: list[OportunidadArea] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        result.append(
            OportunidadArea(
                nombre=str(item.get("nombre", "")),
                descripcion=str(item.get("descripcion", "")),
                evidencia=str(item.get("evidencia", "")),
                indicadores_relacionados=[str(x) for x in item.get("indicadores_relacionados", [])],
            )
        )
    return result


def _parse_issue_tree(raw: list[Any]) -> list[IssueTreeRama]:
    result: list[IssueTreeRama] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        result.append(
            IssueTreeRama(
                pregunta=str(item.get("pregunta", "")),
                hallazgos=[str(x) for x in item.get("hallazgos", [])],
            )
        )
    return result


def _parse_priorizacion(raw: list[Any]) -> list[PrioridadIniciativa]:
    result: list[PrioridadIniciativa] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        result.append(
            PrioridadIniciativa(
                iniciativa=str(item.get("iniciativa", "")),
                impacto=str(item.get("impacto", "medio")),
                esfuerzo=str(item.get("esfuerzo", "medio")),
                cuadrante=str(item.get("cuadrante", "evaluar")),
                horizonte=str(item.get("horizonte", "H1")),
                rationale=str(item.get("rationale", "")),
            )
        )
    return result


def interpret_knowledge_graph(
    graph: KnowledgeGraphResponse,
    analytics: Optional[AnalyticsResponse] = None,
    focus_node_id: Optional[str] = None,
) -> AiInterpretationResponse:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY no está configurada. Agrégala en backend/.env (local) o en Vercel → Environment Variables."
        )

    context = build_interpretation_context(graph, analytics, focus_node_id)
    model = os.getenv("OPENAI_MODEL", "gpt-4o")

    user_prompt = f"""Analiza el contexto del mapa de conocimiento PDD DACYTI aplicando marcos McKinsey
(Issue Tree, Gap Analysis, Matriz Impacto–Esfuerzo, Three Horizons) para identificar áreas de
oportunidad y generar 5 puntos clave ejecutivos.

CONTEXTO (JSON):
{json.dumps(context, ensure_ascii=False, indent=2)}

{JSON_SCHEMA_INSTRUCTION}"""

    client = OpenAI(api_key=api_key)
    completion = client.chat.completions.create(
        model=model,
        temperature=0.35,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw = completion.choices[0].message.content or "{}"
    parsed = json.loads(raw)

    puntos = [str(x) for x in parsed.get("puntos_clave_ejecutivos", [])][:5]

    return AiInterpretationResponse(
        resumen_ejecutivo=parsed.get("resumen_ejecutivo", ""),
        analisis_alineacion=parsed.get("analisis_alineacion", ""),
        puntos_clave_ejecutivos=puntos,
        areas_oportunidad=_parse_oportunidades(parsed.get("areas_oportunidad", [])),
        arbol_issues=_parse_issue_tree(parsed.get("arbol_issues", [])),
        analisis_brechas=parsed.get("analisis_brechas", ""),
        matriz_priorizacion=_parse_priorizacion(parsed.get("matriz_priorizacion", [])),
        hallazgos_indicadores=parsed.get("hallazgos_indicadores", []),
        brechas_y_riesgos=parsed.get("brechas_y_riesgos", []),
        recomendaciones=parsed.get("recomendaciones", []),
        conexiones_clave=parsed.get("conexiones_clave", []),
        marcos_consultoria=parsed.get("marcos_consultoria", [
            "Issue Tree (MECE)",
            "Gap Analysis",
            "Matriz Impacto–Esfuerzo",
            "Three Horizons",
        ]),
        modelo=model,
        generado_en=datetime.now(timezone.utc).isoformat(),
    )

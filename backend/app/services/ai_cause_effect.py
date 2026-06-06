from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

from openai import OpenAI

from app.schemas.models import (
    AiCauseEffectResponse,
    AnalyticsResponse,
    AreaCausaEfecto,
    CadenaCausal,
    CincoPorques,
    KnowledgeGraphResponse,
)
from app.services.ai_interpretation import build_interpretation_context

SYSTEM_PROMPT = """Eres un analista estratégico especializado en el Plan de Desarrollo Divisional (PDD)
de la División Académica de Ciencias y Tecnologías de la Información (DACYTI) de la UJAT.

Tu tarea es aplicar análisis causa–efecto sobre brechas detectables en el mapa de conocimiento
(propuestas del foro, indicadores institucionales, vínculos semánticos tema↔indicador).

Marcos a aplicar (sin diagrama Ishikawa):
1. Cadena causal: Causa → Mecanismo → Efecto → Indicador PDD afectado
2. 5 porqués: partir de una brecha concreta hasta llegar a la causa raíz y proponer acción correctiva

Reglas:
- Basa cada afirmación en evidencia del contexto (cifras, temas, indicadores, propuestas).
- Prioriza 2–4 áreas con brechas reales vs. meta 2026.
- Los 5 niveles de "por qué" deben ser preguntas/respuestas encadenadas (no repetir la misma idea).
- La acción sugerida debe atacar la causa raíz, no el síntoma.

Responde SIEMPRE en español formal.
Responde únicamente con JSON válido según el esquema solicitado."""

JSON_SCHEMA_INSTRUCTION = """
Responde con JSON con exactamente estas claves:
{
  "resumen_causa_efecto": "string (2-3 oraciones: panorama de causas raíz detectadas)",
  "areas_analisis": [
    {
      "nombre": "string (área temática o brecha prioritaria)",
      "problema": "string (síntoma observable en propuestas o indicadores)",
      "brecha": "string (diferencia actual vs. meta 2026, con datos si existen)",
      "cadena_causal": {
        "causa": "string (factor originario)",
        "mecanismo": "string (cómo la causa produce el efecto)",
        "efecto": "string (consecuencia observable)",
        "indicador_pdd": "string (indicador institucional afectado)"
      },
      "cinco_porques": {
        "brecha_inicial": "string (brecha o problema desde el que parten los porqués)",
        "niveles": ["string", ...] (EXACTAMENTE 5 niveles encadenados: cada uno responde al anterior),
        "causa_raiz": "string (causa fundamental identificada)",
        "accion_sugerida": "string (acción correctiva sobre la causa raíz)"
      }
    }
  ] (2-4 áreas)
}"""


def _parse_cadena(raw: Any) -> CadenaCausal:
    if not isinstance(raw, dict):
        return CadenaCausal(causa="", mecanismo="", efecto="", indicador_pdd="")
    return CadenaCausal(
        causa=str(raw.get("causa", "")),
        mecanismo=str(raw.get("mecanismo", "")),
        efecto=str(raw.get("efecto", "")),
        indicador_pdd=str(raw.get("indicador_pdd", "")),
    )


def _parse_cinco_porques(raw: Any) -> CincoPorques:
    if not isinstance(raw, dict):
        return CincoPorques(brecha_inicial="", causa_raiz="", accion_sugerida="")
    niveles = [str(x) for x in raw.get("niveles", [])][:5]
    return CincoPorques(
        brecha_inicial=str(raw.get("brecha_inicial", "")),
        niveles=niveles,
        causa_raiz=str(raw.get("causa_raiz", "")),
        accion_sugerida=str(raw.get("accion_sugerida", "")),
    )


def _parse_areas(raw: list[Any]) -> list[AreaCausaEfecto]:
    result: list[AreaCausaEfecto] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        result.append(
            AreaCausaEfecto(
                nombre=str(item.get("nombre", "")),
                problema=str(item.get("problema", "")),
                brecha=str(item.get("brecha", "")),
                cadena_causal=_parse_cadena(item.get("cadena_causal", {})),
                cinco_porques=_parse_cinco_porques(item.get("cinco_porques", {})),
            )
        )
    return result[:4]


def analyze_cause_effect(
    graph: KnowledgeGraphResponse,
    analytics: Optional[AnalyticsResponse] = None,
    focus_node_id: Optional[str] = None,
) -> AiCauseEffectResponse:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY no está configurada. Agrégala en backend/.env (local) o en Vercel → Environment Variables."
        )

    context = build_interpretation_context(graph, analytics, focus_node_id)
    model = os.getenv("OPENAI_MODEL", "gpt-4o")

    user_prompt = f"""Analiza el contexto del mapa de conocimiento PDD DACYTI aplicando:
- Cadena causal (Causa → Mecanismo → Efecto → Indicador PDD)
- 5 porqués por cada área con brecha relevante

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

    return AiCauseEffectResponse(
        resumen_causa_efecto=parsed.get("resumen_causa_efecto", ""),
        areas_analisis=_parse_areas(parsed.get("areas_analisis", [])),
        modelo=model,
        generado_en=datetime.now(timezone.utc).isoformat(),
    )

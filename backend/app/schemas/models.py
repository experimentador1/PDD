from __future__ import annotations

from typing import Any, Optional, Union

from pydantic import BaseModel, Field


class KpiCard(BaseModel):
    id: str
    label: str
    value: Union[float, int, str]
    unit: str = ""
    description: str = ""
    trend_label: str = ""
    icon: str = ""


class ChartDataPoint(BaseModel):
    label: str
    value: float
    group: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class HierarchyNode(BaseModel):
    name: str
    value: float = 0
    children: list["HierarchyNode"] = Field(default_factory=list)


class ProposalSummary(BaseModel):
    folio: str
    titulo: str
    area: str
    tema: str
    expone: str
    ponentes: str
    dependencia: str
    cargos: list[str]


class AnalyticsResponse(BaseModel):
    metadata: dict[str, Any]
    kpis: list[KpiCard]
    por_area: list[ChartDataPoint]
    por_clasificacion: list[ChartDataPoint]
    top_temas: list[ChartDataPoint]
    por_dependencia: list[ChartDataPoint]
    por_expone: list[ChartDataPoint]
    por_perfil: list[ChartDataPoint]
    perfiles_por_area: list[ChartDataPoint]
    top_ponentes: list[ChartDataPoint]
    jerarquia_tematica: HierarchyNode
    propuestas_externas: list[ChartDataPoint]
    propuestas: list[ProposalSummary]
    indicadores_alineados: list[dict[str, str]]


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    value: float = 1
    color: str = "#64748b"
    description: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphLink(BaseModel):
    source: str
    target: str
    relation: str = ""
    strength: float = 1.0


class KnowledgeGraphResponse(BaseModel):
    nodes: list[GraphNode]
    links: list[GraphLink]
    stats: dict[str, Any]
    legend: list[dict[str, str]]


class AiInterpretationRequest(BaseModel):
    graph: KnowledgeGraphResponse
    analytics: Optional[AnalyticsResponse] = None
    focus_node_id: Optional[str] = None


class OportunidadArea(BaseModel):
    nombre: str
    descripcion: str
    evidencia: str
    indicadores_relacionados: list[str] = Field(default_factory=list)


class IssueTreeRama(BaseModel):
    pregunta: str
    hallazgos: list[str] = Field(default_factory=list)


class PrioridadIniciativa(BaseModel):
    iniciativa: str
    impacto: str
    esfuerzo: str
    cuadrante: str
    horizonte: str
    rationale: str


class AiInterpretationResponse(BaseModel):
    resumen_ejecutivo: str
    analisis_alineacion: str
    puntos_clave_ejecutivos: list[str] = Field(default_factory=list)
    areas_oportunidad: list[OportunidadArea] = Field(default_factory=list)
    arbol_issues: list[IssueTreeRama] = Field(default_factory=list)
    analisis_brechas: str = ""
    matriz_priorizacion: list[PrioridadIniciativa] = Field(default_factory=list)
    hallazgos_indicadores: list[str]
    brechas_y_riesgos: list[str]
    recomendaciones: list[str]
    conexiones_clave: list[str]
    marcos_consultoria: list[str] = Field(default_factory=list)
    modelo: str = ""
    generado_en: str = ""


class CadenaCausal(BaseModel):
    causa: str
    mecanismo: str
    efecto: str
    indicador_pdd: str


class CincoPorques(BaseModel):
    brecha_inicial: str
    niveles: list[str] = Field(default_factory=list)
    causa_raiz: str
    accion_sugerida: str


class AreaCausaEfecto(BaseModel):
    nombre: str
    problema: str
    brecha: str
    cadena_causal: CadenaCausal
    cinco_porques: CincoPorques


class AiCauseEffectRequest(BaseModel):
    graph: KnowledgeGraphResponse
    analytics: Optional[AnalyticsResponse] = None
    focus_node_id: Optional[str] = None


class AiCauseEffectResponse(BaseModel):
    resumen_causa_efecto: str
    areas_analisis: list[AreaCausaEfecto] = Field(default_factory=list)
    modelo: str = ""
    generado_en: str = ""


class PonenciaDetail(BaseModel):
    folio: str
    titulo: str
    area: str
    tema: str
    clasificacion: str
    problematica_preview: str
    propuesta_preview: str
    ponentes: str
    dependencia: str


class PonenciasAnalyticsResponse(BaseModel):
    metadata: dict[str, Any]
    kpis: list[KpiCard]
    por_area: list[ChartDataPoint]
    comparativa_areas: list[ChartDataPoint]
    top_temas: list[ChartDataPoint]
    por_clasificacion: list[ChartDataPoint]
    terminos_problematica: list[ChartDataPoint]
    terminos_propuesta: list[ChartDataPoint]
    terminos_combinados: list[ChartDataPoint]
    categorias_terminos: list[ChartDataPoint]
    bigramas: list[ChartDataPoint]
    terminos_distintivos: list[ChartDataPoint]
    ponencias: list[PonenciaDetail]
    insights: list[str]

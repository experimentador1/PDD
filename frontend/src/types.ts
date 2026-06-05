export interface KpiCard {
  id: string;
  label: string;
  value: number | string;
  unit: string;
  description: string;
  trend_label: string;
  icon: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  group?: string;
  metadata?: Record<string, unknown>;
}

export interface HierarchyNode {
  name: string;
  value: number;
  children?: HierarchyNode[];
}

export interface ProposalSummary {
  folio: string;
  titulo: string;
  area: string;
  tema: string;
  expone: string;
  ponentes: string;
  dependencia: string;
  cargos: string[];
}

export interface IndicadorAlineado {
  categoria: string;
  indicador: string;
  descripcion: string;
  eje_pdd: string;
}

export interface AnalyticsResponse {
  metadata: Record<string, unknown>;
  kpis: KpiCard[];
  por_area: ChartDataPoint[];
  por_clasificacion: ChartDataPoint[];
  top_temas: ChartDataPoint[];
  por_dependencia: ChartDataPoint[];
  por_expone: ChartDataPoint[];
  por_perfil: ChartDataPoint[];
  perfiles_por_area: ChartDataPoint[];
  top_ponentes: ChartDataPoint[];
  jerarquia_tematica: HierarchyNode;
  propuestas_externas: ChartDataPoint[];
  propuestas: ProposalSummary[];
  indicadores_alineados: IndicadorAlineado[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  value: number;
  color: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
  strength: number;
}

export interface KnowledgeGraphResponse {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: Record<string, number>;
  legend: Array<{ type: string; label: string; color: string }>;
}

export interface PonenciaDetail {
  folio: string;
  titulo: string;
  area: string;
  tema: string;
  clasificacion: string;
  problematica_preview: string;
  propuesta_preview: string;
  ponentes: string;
  dependencia: string;
}

export interface PonenciasAnalyticsResponse {
  metadata: Record<string, unknown>;
  kpis: KpiCard[];
  por_area: ChartDataPoint[];
  comparativa_areas: ChartDataPoint[];
  top_temas: ChartDataPoint[];
  por_clasificacion: ChartDataPoint[];
  terminos_problematica: ChartDataPoint[];
  terminos_propuesta: ChartDataPoint[];
  terminos_combinados: ChartDataPoint[];
  categorias_terminos: ChartDataPoint[];
  bigramas: ChartDataPoint[];
  terminos_distintivos: ChartDataPoint[];
  ponencias: PonenciaDetail[];
  insights: string[];
}

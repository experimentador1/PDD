export interface OportunidadArea {
  nombre: string;
  descripcion: string;
  evidencia: string;
  indicadores_relacionados: string[];
}

export interface IssueTreeRama {
  pregunta: string;
  hallazgos: string[];
}

export interface PrioridadIniciativa {
  iniciativa: string;
  impacto: string;
  esfuerzo: string;
  cuadrante: string;
  horizonte: string;
  rationale: string;
}

export interface AiInterpretationResponse {
  resumen_ejecutivo: string;
  analisis_alineacion: string;
  puntos_clave_ejecutivos: string[];
  areas_oportunidad: OportunidadArea[];
  arbol_issues: IssueTreeRama[];
  analisis_brechas: string;
  matriz_priorizacion: PrioridadIniciativa[];
  hallazgos_indicadores: string[];
  brechas_y_riesgos: string[];
  recomendaciones: string[];
  conexiones_clave: string[];
  marcos_consultoria: string[];
  modelo: string;
  generado_en: string;
}

export interface CadenaCausal {
  causa: string;
  mecanismo: string;
  efecto: string;
  indicador_pdd: string;
}

export interface CincoPorques {
  brecha_inicial: string;
  niveles: string[];
  causa_raiz: string;
  accion_sugerida: string;
}

export interface AreaCausaEfecto {
  nombre: string;
  problema: string;
  brecha: string;
  cadena_causal: CadenaCausal;
  cinco_porques: CincoPorques;
}

export interface AiCauseEffectResponse {
  resumen_causa_efecto: string;
  areas_analisis: AreaCausaEfecto[];
  modelo: string;
  generado_en: string;
}

from __future__ import annotations

import io
import math
import re
from collections import Counter
from typing import Any

import pandas as pd

from app.schemas.models import (
    AnalyticsResponse,
    ChartDataPoint,
    HierarchyNode,
    KpiCard,
    ProposalSummary,
)

EXPECTED_COLUMNS = [
    "FOLIO",
    "FORO",
    "EXPONE",
    "TITULO",
    "PROBLEMATICA",
    "PROPUESTA",
    "CLAVE_TEMA",
    "TEMA",
    "CLAVE_AREA",
    "CLASIFICACION",
    "AREA",
    "CLAVE_TIPO",
    "ORD",
    "TIPO",
    "PONENCIA",
    "PONENTES",
    "CARGO",
    "CORREOS",
    "TELEFONOS",
    "PONENCIA_1",
    "DEPENDENCIA",
    "OTRA",
]

AREA_COLORS = {
    "Calidad y mejora continua en la formación académica": "#2563eb",
    "Investigación de Alto Impacto": "#7c3aed",
    "Vinculación productiva y responsabilidad universitaria": "#059669",
    "Gestión innovadora y sostenibilidad financiera": "#d97706",
    "Cultura, Identidad y Legado UJAT": "#db2777",
}

PERFIL_MAP = {
    "PROFESOR INVESTIGADOR": "Profesor Investigador",
    "ESTUDIANTE": "Estudiante",
    "PERSONAL ADMINISTRATIVO DE LA UJAT": "Personal Administrativo",
    "EGRESADO": "Egresado",
    "OTRO": "Externo / Otro",
    "EMPLEADOR DE LA INICIATIVA PRIVADA": "Sector Privado",
    "COLEGIO O BARRA DE PROFESIONALES": "Colegio Profesional",
}

INDICADORES_ALINEADOS = [
    {
        "categoria": "Participación",
        "indicador": "Total de propuestas registradas",
        "descripcion": "Volumen de iniciativas captadas en el foro PDD DACYTI",
        "eje_pdd": "Transversal",
    },
    {
        "categoria": "Cobertura temática",
        "indicador": "Distribución por área estratégica",
        "descripcion": "Alineación con los 5 ejes del Plan de Desarrollo Divisional",
        "eje_pdd": "Ejes 1-5",
    },
    {
        "categoria": "Calidad educativa",
        "indicador": "Propuestas en formación académica",
        "descripcion": "Relacionado con OE-CPE-DACYTI (programas, egreso, titulación)",
        "eje_pdd": "Eje 1 - Calidad en Programas Educativos",
    },
    {
        "categoria": "Investigación",
        "indicador": "Propuestas de alto impacto",
        "descripcion": "Relacionado con OE-ADC-DACYTI (proyectos, divulgación, SNI)",
        "eje_pdd": "Eje 2 - Producción del Conocimiento",
    },
    {
        "categoria": "Cultura",
        "indicador": "Propuestas cultura e identidad",
        "descripcion": "Relacionado con OE-CVU-DACYTI (valores, deporte, cultura)",
        "eje_pdd": "Eje 3 - Cultura y Valores",
    },
    {
        "categoria": "Vinculación",
        "indicador": "Propuestas de vinculación productiva",
        "descripcion": "Relacionado con OE-VRS-DACYTI (convenios, RSU, transferencia)",
        "eje_pdd": "Eje 4 - Vinculación Social",
    },
    {
        "categoria": "Gestión",
        "indicador": "Propuestas de gestión y sostenibilidad",
        "descripcion": "Relacionado con OE-GET-DACYTI (eficiencia, transparencia)",
        "eje_pdd": "Eje 5 - Gestión Eficaz",
    },
    {
        "categoria": "Participación",
        "indicador": "Perfil de ponentes",
        "descripcion": "Profesores, estudiantes, administrativos, egresados y externos",
        "eje_pdd": "Comunidad universitaria",
    },
    {
        "categoria": "Colaboración",
        "indicador": "Promedio de ponentes por propuesta",
        "descripcion": "Grado de trabajo colaborativo e interdisciplinario",
        "eje_pdd": "Transversal",
    },
    {
        "categoria": "Vinculación externa",
        "indicador": "Propuestas con actores externos",
        "descripcion": "Sector productivo, instituciones nacionales/internacionales",
        "eje_pdd": "Eje 4 - Vinculación",
    },
    {
        "categoria": "Difusión",
        "indicador": "Tasa de exposición en foro",
        "descripcion": "Propuestas seleccionadas para presentación oral (EXPONE=Si)",
        "eje_pdd": "Divulgación científica",
    },
    {
        "categoria": "Diversidad",
        "indicador": "Índice de diversidad temática",
        "descripcion": "Entropía de Shannon sobre distribución de temas",
        "eje_pdd": "Cobertura PUD",
    },
]


def _split_csv_field(value: Any) -> list[str]:
    if pd.isna(value):
        return []
    return [item.strip() for item in str(value).split(",") if item.strip()]


def _normalize_cargo(cargo: str) -> str:
    upper = cargo.upper().strip()
    for key, label in PERFIL_MAP.items():
        if key in upper:
            return label
    return "Otro"


def _is_externo(cargo: str, otra: Any) -> bool:
    if pd.notna(otra) and str(otra).strip() not in {"", "Ninguno", ".", "nan"}:
        return True
    upper = cargo.upper()
    return any(k in upper for k in ("OTRO", "EMPLEADOR", "COLEGIO", "BARRA"))


def _shannon_entropy(counts: list[int]) -> float:
    total = sum(counts)
    if total == 0:
        return 0.0
    entropy = 0.0
    for count in counts:
        if count > 0:
            p = count / total
            entropy -= p * math.log2(p)
    return round(entropy, 2)


def _shorten(text: str, max_len: int = 60) -> str:
    text = re.sub(r"\s+", " ", str(text)).strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _normalize_expone_label(value: Any) -> str:
    """Normaliza el campo EXPONE del Excel a «Si» o «No»."""
    if pd.isna(value):
        return "No"
    normalized = str(value).strip().lower().replace("í", "i")
    return "Si" if normalized in {"si", "s", "yes", "1", "true"} else "No"


def _filter_expone_si(df: pd.DataFrame) -> pd.DataFrame:
    """Dataset de ponencias: solo filas con EXPONE = Si."""
    expone = df["EXPONE"].apply(_normalize_expone_label)
    return df[expone == "Si"].copy()


def load_dataframe(file_bytes: bytes) -> pd.DataFrame:
    buffer = io.BytesIO(file_bytes)
    xl = pd.ExcelFile(buffer)
    sheet = "Exportar Hoja de Trabajo"
    if sheet not in xl.sheet_names:
        sheet = xl.sheet_names[0]
    df = pd.read_excel(xl, sheet_name=sheet)
    missing = [col for col in EXPECTED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(
            f"El archivo no cumple la estructura esperada. Columnas faltantes: {', '.join(missing)}"
        )
    df["EXPONE"] = df["EXPONE"].apply(_normalize_expone_label)
    return df


def analyze_proposals(df: pd.DataFrame) -> AnalyticsResponse:
    total = len(df)
    areas = df["AREA"].value_counts()
    temas = df["TEMA"].value_counts()
    clasificaciones = df.groupby(["AREA", "CLASIFICACION"]).size().reset_index(name="count")
    dependencias = df["DEPENDENCIA"].value_counts()
    expone = df["EXPONE"].value_counts()

    all_cargos: list[str] = []
    all_names: list[str] = []
    perfiles_por_area: list[ChartDataPoint] = []
    propuestas_externas: list[ChartDataPoint] = []

    con_profesor = 0
    con_estudiante = 0
    con_admin = 0
    con_egresado = 0
    con_externo = 0
    num_ponentes_list: list[int] = []

    for _, row in df.iterrows():
        cargos_raw = _split_csv_field(row["CARGO"])
        cargos_norm = [_normalize_cargo(c) for c in cargos_raw]
        all_cargos.extend(cargos_norm)

        names = _split_csv_field(row["PONENTES"])
        all_names.extend(names)
        num_ponentes_list.append(len(names) if names else 1)

        cargo_str = str(row["CARGO"]) if pd.notna(row["CARGO"]) else ""
        if "PROFESOR" in cargo_str.upper():
            con_profesor += 1
        if "ESTUDIANTE" in cargo_str.upper():
            con_estudiante += 1
        if "PERSONAL ADMINISTRATIVO" in cargo_str.upper():
            con_admin += 1
        if "EGRESADO" in cargo_str.upper():
            con_egresado += 1
        if _is_externo(cargo_str, row["OTRA"]):
            con_externo += 1
            propuestas_externas.append(
                ChartDataPoint(
                    label=str(row["FOLIO"]),
                    value=1,
                    group=str(row["OTRA"]) if pd.notna(row["OTRA"]) else "Externo",
                    metadata={"titulo": _shorten(row["TITULO"], 80)},
                )
            )

        for perfil in set(cargos_norm):
            perfiles_por_area.append(
                ChartDataPoint(label=perfil, value=1, group=str(row["AREA"]))
            )

    perfil_counts = Counter(all_cargos)
    ponente_counts = Counter(all_names)
    avg_ponentes = round(sum(num_ponentes_list) / len(num_ponentes_list), 2) if num_ponentes_list else 0
    multi_autor = sum(1 for n in num_ponentes_list if n > 1)
    diversidad = _shannon_entropy(temas.tolist())
    tasa_expone = round((expone.get("Si", 0) / total) * 100, 1) if total else 0

    kpis = [
        KpiCard(
            id="total",
            label="Total de propuestas",
            value=total,
            unit="propuestas",
            description="Iniciativas registradas en el foro",
            icon="document",
        ),
        KpiCard(
            id="areas",
            label="Áreas temáticas",
            value=int(df["AREA"].nunique()),
            unit="ejes",
            description="Cobertura de ejes estratégicos PDD",
            icon="layers",
        ),
        KpiCard(
            id="temas",
            label="Temas únicos",
            value=int(df["TEMA"].nunique()),
            unit="temas",
            description="Diversidad temática de las propuestas",
            icon="tag",
        ),
        KpiCard(
            id="profesores",
            label="Con participación docente",
            value=con_profesor,
            unit="propuestas",
            description="Propuestas con al menos un profesor investigador",
            icon="academic",
        ),
        KpiCard(
            id="estudiantes",
            label="Con participación estudiantil",
            value=con_estudiante,
            unit="propuestas",
            description="Propuestas impulsadas o co-creadas por estudiantes",
            icon="student",
        ),
        KpiCard(
            id="externos",
            label="Vinculación externa",
            value=con_externo,
            unit="propuestas",
            description="Con actores del sector productivo u otras instituciones",
            icon="link",
        ),
        KpiCard(
            id="expone",
            label="Tasa de exposición",
            value=tasa_expone,
            unit="%",
            description="Propuestas seleccionadas para presentar en el foro",
            icon="presentation",
        ),
        KpiCard(
            id="colaboracion",
            label="Promedio de ponentes",
            value=avg_ponentes,
            unit="por propuesta",
            description=f"{multi_autor} propuestas con más de un autor",
            icon="users",
        ),
        KpiCard(
            id="diversidad",
            label="Índice diversidad temática",
            value=diversidad,
            unit="bits",
            description="Entropía de Shannon (mayor = más diversidad)",
            icon="chart",
        ),
    ]

    por_area = [
        ChartDataPoint(
            label=area,
            value=int(count),
            metadata={"color": AREA_COLORS.get(area, "#64748b"), "pct": round(count / total * 100, 1)},
        )
        for area, count in areas.items()
    ]

    por_clasificacion = [
        ChartDataPoint(
            label=f"{row['CLASIFICACION']}",
            value=int(row["count"]),
            group=row["AREA"],
            metadata={"color": AREA_COLORS.get(row["AREA"], "#64748b")},
        )
        for _, row in clasificaciones.sort_values("count", ascending=False).iterrows()
    ]

    top_temas = [
        ChartDataPoint(label=_shorten(tema, 55), value=int(count), metadata={"tema_completo": tema})
        for tema, count in temas.head(15).items()
    ]

    por_dependencia = [
        ChartDataPoint(label=dep, value=int(count))
        for dep, count in dependencias.items()
    ]

    por_expone = [
        ChartDataPoint(label=label, value=int(count), metadata={"pct": round(count / total * 100, 1)})
        for label, count in expone.items()
    ]

    por_perfil = [
        ChartDataPoint(label=perfil, value=int(count))
        for perfil, count in perfil_counts.most_common()
    ]

    top_ponentes = [
        ChartDataPoint(label=nombre, value=int(count))
        for nombre, count in ponente_counts.most_common(12)
    ]

    jerarquia = _build_hierarchy(df)

    propuestas = [
        ProposalSummary(
            folio=str(row["FOLIO"]),
            titulo=_shorten(row["TITULO"], 100),
            area=str(row["AREA"]),
            tema=_shorten(row["TEMA"], 70),
            expone=str(row["EXPONE"]),
            ponentes=str(row["PONENTES"]) if pd.notna(row["PONENTES"]) else "",
            dependencia=str(row["DEPENDENCIA"]) if pd.notna(row["DEPENDENCIA"]) else "",
            cargos=[_normalize_cargo(c) for c in _split_csv_field(row["CARGO"])],
        )
        for _, row in df.iterrows()
    ]

    metadata = {
        "total_propuestas": total,
        "foro": str(df["FORO"].iloc[0]) if total else "",
        "fecha_analisis": pd.Timestamp.now().isoformat(),
        "area_colors": AREA_COLORS,
    }

    return AnalyticsResponse(
        metadata=metadata,
        kpis=kpis,
        por_area=por_area,
        por_clasificacion=por_clasificacion,
        top_temas=top_temas,
        por_dependencia=por_dependencia,
        por_expone=por_expone,
        por_perfil=por_perfil,
        perfiles_por_area=perfiles_por_area,
        top_ponentes=top_ponentes,
        jerarquia_tematica=jerarquia,
        propuestas_externas=propuestas_externas,
        propuestas=propuestas,
        indicadores_alineados=INDICADORES_ALINEADOS,
    )


def _build_hierarchy(df: pd.DataFrame) -> HierarchyNode:
    root = HierarchyNode(name="Propuestas DACYTI", value=len(df), children=[])

    for area, area_df in df.groupby("AREA"):
        area_node = HierarchyNode(name=area, value=len(area_df), children=[])
        for clasif, clasif_df in area_df.groupby("CLASIFICACION"):
            clasif_node = HierarchyNode(name=str(clasif), value=len(clasif_df), children=[])
            for tema, tema_df in clasif_df.groupby("TEMA"):
                clasif_node.children.append(
                    HierarchyNode(name=_shorten(tema, 50), value=len(tema_df))
                )
            area_node.children.append(clasif_node)
        root.children.append(area_node)

    return root

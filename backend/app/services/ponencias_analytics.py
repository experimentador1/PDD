from __future__ import annotations

import re
from collections import Counter
from typing import Any

import pandas as pd

from app.schemas.models import (
    ChartDataPoint,
    KpiCard,
    PonenciaDetail,
    PonenciasAnalyticsResponse,
)
from app.services.analytics import AREA_COLORS, _filter_expone_si, _shorten

STOPWORDS_ES = {
    "para", "por", "con", "como", "esta", "este", "estos", "estas", "entre", "desde",
    "hasta", "sobre", "bajo", "ante", "tras", "durante", "mediante", "según", "hacia",
    "donde", "cuando", "quien", "quienes", "cual", "cuales", "cada", "todo", "toda",
    "todos", "todas", "más", "mas", "menos", "muy", "tan", "tanto", "también", "tambien",
    "solo", "sólo", "solo", "aun", "aún", "ya", "año", "años", "ser", "estar", "tener",
    "hacer", "poder", "debe", "deben", "deber", "deberá", "debera", "puede", "pueden",
    "son", "sea", "sido", "siendo", "fue", "fueron", "será", "sera", "han", "has", "hay",
    "una", "uno", "unos", "unas", "del", "las", "los", "les", "que", "qué", "se", "su",
    "sus", "al", "el", "la", "lo", "le", "de", "en", "es", "y", "o", "u", "a", "un", "con",
    "no", "si", "sí", "ni", "pero", "sino", "porque", "pues", "así", "asi", "bien", "mal",
    "tan", "tal", "tales", "otro", "otra", "otros", "otras", "mismo", "misma", "mismos",
    "mismas", "tal", "cual", "donde", "quien", "cuyo", "cuya", "cuyos", "cuyas", "además",
    "ademas", "asimismo", "igualmente", "mediante", "través", "traves", "parte", "partes",
    "forma", "manera", "modo", "tipo", "tipos", "caso", "casos", "nivel", "niveles",
    "proceso", "procesos", "programa", "programas", "sistema", "sistemas", "universidad",
    "universitario", "universitaria", "universitarios", "universitarias", "institucional",
    "institucionales", "académico", "academica", "académicos", "academicas", "academico",
    "estudiantes", "estudiante", "profesores", "profesor", "ujat", "dacyti", "división",
    "division", "académica", "academica", "propuesta", "propuestas", "problemática",
    "problematica", "mediante", "generar", "permitir", "realizar", "implementar", "desarrollo",
    "desarrollar", "fortalecer", "mejorar", "incrementar", "disminuir", "reducir", "así",
    "asi", "además", "ademas", "asimismo", "donde", "quien", "cual", "cuales", "entre",
    "hacia", "desde", "hasta", "sobre", "bajo", "ante", "tras", "durante", "según", "segun",
    "x000d", "x000d_", "nbsp",
}

TERM_CATEGORIES = {
    "tecnologia": {"tecnología", "tecnologias", "digital", "inteligencia", "artificial", "software", "plataforma", "datos", "sistema", "automatización", "automatizacion", "innovación", "innovacion"},
    "formacion": {"formación", "formacion", "educación", "educacion", "aprendizaje", "docente", "docentes", "curricular", "titulación", "titulacion", "egreso", "egresados", "estudiantil"},
    "investigacion": {"investigación", "investigacion", "científica", "cientifica", "proyectos", "conocimiento", "laboratorio", "laboratorios"},
    "vinculacion": {"vinculación", "vinculacion", "sector", "empresas", "productivo", "convenios", "externa", "externo", "comunidad"},
    "gestion": {"gestión", "gestion", "administrativa", "administrativo", "eficiencia", "transparencia", "recursos", "financiera", "financiero"},
    "cultura": {"cultural", "cultura", "identidad", "valores", "deportiva", "deportivo", "artística", "artistica", "salud", "bienestar"},
}


def _clean_text(text: Any) -> str:
    if pd.isna(text):
        return ""
    s = str(text).lower()
    s = re.sub(r"_x000[dD]_?", " ", s)
    s = re.sub(r"[^\w\sáéíóúüñ]", " ", s)
    return s


def _tokenize(text: str) -> list[str]:
    words = _clean_text(text).split()
    return [
        w.strip("áéíóúüñ").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        for w in words
        if len(w) >= 4 and w not in STOPWORDS_ES and not w.isdigit()
    ]


def _extract_bigrams(tokens: list[str]) -> list[str]:
    return [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)]


def _term_counts(texts: pd.Series, top_n: int = 25) -> list[ChartDataPoint]:
    counter: Counter[str] = Counter()
    for text in texts.dropna():
        counter.update(_tokenize(str(text)))
    return [
        ChartDataPoint(label=term, value=count)
        for term, count in counter.most_common(top_n)
    ]


def _categorize_terms(terms: list[ChartDataPoint]) -> list[ChartDataPoint]:
    cat_counts: Counter[str] = Counter()
    for item in terms:
        term_lower = item.label.lower()
        matched = False
        for cat, keywords in TERM_CATEGORIES.items():
            if term_lower in keywords or any(k in term_lower for k in keywords):
                cat_counts[cat] += item.value
                matched = True
                break
        if not matched:
            cat_counts["otros"] += item.value
    labels = {
        "tecnologia": "Tecnología e innovación",
        "formacion": "Formación académica",
        "investigacion": "Investigación",
        "vinculacion": "Vinculación",
        "gestion": "Gestión",
        "cultura": "Cultura y bienestar",
        "otros": "Otros términos",
    }
    return [
        ChartDataPoint(label=labels.get(k, k), value=v)
        for k, v in cat_counts.most_common()
        if v > 0
    ]


def analyze_ponencias(df: pd.DataFrame) -> PonenciasAnalyticsResponse:
    total = len(df)
    sel = _filter_expone_si(df)
    no_sel = df[~df.index.isin(sel.index)].copy()
    n_sel = len(sel)

    if n_sel == 0:
        raise ValueError("No hay ponencias seleccionadas para exposición (EXPONE=Si)")

    tasa = round(n_sel / total * 100, 1) if total else 0

    areas_sel = sel["AREA"].value_counts()
    temas_sel = sel["TEMA"].value_counts()
    clasif_sel = sel.groupby(["AREA", "CLASIFICACION"]).size().reset_index(name="count")

    # Comparativa área: seleccionadas vs no seleccionadas (%)
    comparativa: list[ChartDataPoint] = []
    for area in df["AREA"].unique():
        sel_count = len(sel[sel["AREA"] == area])
        no_count = len(no_sel[no_sel["AREA"] == area])
        sel_pct = round(sel_count / len(sel[sel["AREA"] == area].index.union(sel["AREA"].index)) * 100, 1) if area in sel["AREA"].values else 0
        total_area = len(df[df["AREA"] == area])
        tasa_area = round(sel_count / total_area * 100, 1) if total_area else 0
        comparativa.append(
            ChartDataPoint(
                label=_shorten(area, 40),
                value=sel_count,
                group="Seleccionadas",
                metadata={"color": AREA_COLORS.get(area, "#64748b"), "tasa": tasa_area, "total_area": total_area},
            )
        )
        comparativa.append(
            ChartDataPoint(
                label=_shorten(area, 40),
                value=no_count,
                group="No seleccionadas",
                metadata={"color": "#94a3b8"},
            )
        )

    terminos_prob = _term_counts(sel["PROBLEMATICA"], 30)
    terminos_prop = _term_counts(sel["PROPUESTA"], 30)
    textos_combinados = sel["TITULO"].astype(str) + " " + sel["PROBLEMATICA"].astype(str) + " " + sel["PROPUESTA"].astype(str)
    terminos_comb = _term_counts(textos_combinados, 35)
    categorias_terminos = _categorize_terms(terminos_comb)

    bigram_counter: Counter[str] = Counter()
    for text in textos_combinados.dropna():
        tokens = _tokenize(str(text))
        bigram_counter.update(_extract_bigrams(tokens))
    bigramas = [
        ChartDataPoint(label=bg, value=count)
        for bg, count in bigram_counter.most_common(20)
        if count >= 2
    ]

    # Términos distintivos: más frecuentes en seleccionadas vs resto
    sel_counter: Counter[str] = Counter()
    rest_counter: Counter[str] = Counter()
    for text in textos_combinados.dropna():
        sel_counter.update(_tokenize(str(text)))
    for text in (no_sel["TITULO"].astype(str) + " " + no_sel["PROBLEMATICA"].astype(str) + " " + no_sel["PROPUESTA"].astype(str)).dropna():
        rest_counter.update(_tokenize(str(text)))

    distintivos: list[ChartDataPoint] = []
    for term, count in sel_counter.most_common(50):
        rest = rest_counter.get(term, 0)
        sel_rate = count / n_sel
        rest_rate = rest / max(len(no_sel), 1)
        score = sel_rate / (rest_rate + 0.001)
        if count >= 3 and score > 1.5:
            distintivos.append(
                ChartDataPoint(label=term, value=count, metadata={"score": round(score, 2)})
            )
    distintivos.sort(key=lambda x: x.metadata.get("score", 0), reverse=True)
    distintivos = distintivos[:20]

    avg_prob = int(sel["PROBLEMATICA"].astype(str).str.len().mean())
    avg_prop = int(sel["PROPUESTA"].astype(str).str.len().mean())

    kpis = [
        KpiCard(id="sel", label="Ponencias seleccionadas", value=n_sel, unit="de " + str(total), description=f"{tasa}% del total fueron elegidas para exponer", icon="presentation"),
        KpiCard(id="areas", label="Áreas representadas", value=int(sel["AREA"].nunique()), unit="ejes", description="Cobertura temática en ponencias orales", icon="layers"),
        KpiCard(id="temas", label="Temas en exposición", value=int(sel["TEMA"].nunique()), unit="temas", description="Diversidad temática de las seleccionadas", icon="tag"),
        KpiCard(id="terminos", label="Términos analizados", value=len(terminos_comb), unit="términos", description="Vocabulario extraído de textos de ponencias", icon="chart"),
        KpiCard(id="long_prob", label="Extensión problemática", value=avg_prob, unit="caracteres", description="Promedio de longitud del campo problemática", icon="document"),
        KpiCard(id="long_prop", label="Extensión propuesta", value=avg_prop, unit="caracteres", description="Promedio de longitud del campo propuesta", icon="document"),
    ]

    por_area = [
        ChartDataPoint(label=_shorten(a, 45), value=int(c), metadata={"color": AREA_COLORS.get(a, "#64748b"), "pct": round(c / n_sel * 100, 1)})
        for a, c in areas_sel.items()
    ]

    top_temas = [
        ChartDataPoint(label=_shorten(t, 55), value=int(c), metadata={"tema_completo": t})
        for t, c in temas_sel.head(12).items()
    ]

    por_clasificacion = [
        ChartDataPoint(
            label=str(row["CLASIFICACION"]),
            value=int(row["count"]),
            group=row["AREA"],
            metadata={"color": AREA_COLORS.get(row["AREA"], "#64748b")},
        )
        for _, row in clasif_sel.sort_values("count", ascending=False).iterrows()
    ]

    ponencias = [
        PonenciaDetail(
            folio=str(row["FOLIO"]),
            titulo=_shorten(row["TITULO"], 120),
            area=str(row["AREA"]),
            tema=_shorten(row["TEMA"], 80),
            clasificacion=str(row["CLASIFICACION"]),
            problematica_preview=_shorten(row["PROBLEMATICA"], 200),
            propuesta_preview=_shorten(row["PROPUESTA"], 200),
            ponentes=str(row["PONENTES"]) if pd.notna(row["PONENTES"]) else "",
            dependencia=str(row["DEPENDENCIA"]) if pd.notna(row["DEPENDENCIA"]) else "",
        )
        for _, row in sel.iterrows()
    ]

    top_area = areas_sel.index[0] if len(areas_sel) else ""
    top_tema = temas_sel.index[0] if len(temas_sel) else ""
    top_term = terminos_comb[0].label if terminos_comb else ""

    insights = [
        f"El {tasa}% de las propuestas ({n_sel} de {total}) fue seleccionada para exposición oral en el foro.",
        f"El eje con más ponencias seleccionadas es «{_shorten(top_area, 50)}» con {areas_sel.iloc[0]} intervenciones." if len(areas_sel) else "",
        f"El tema más expuesto es «{_shorten(top_tema, 55)}» con {temas_sel.iloc[0]} ponencias." if len(temas_sel) else "",
        f"El término más recurrente en los textos seleccionados es «{top_term}»." if top_term else "",
        f"Se identificaron {len(distintivos)} términos distintivos que aparecen con mayor frecuencia relativa en ponencias seleccionadas vs. no seleccionadas.",
        f"La analítica de texto procesó en promedio {avg_prob + avg_prop:,} caracteres por ponencia (problemática + propuesta).",
    ]
    insights = [i for i in insights if i]

    return PonenciasAnalyticsResponse(
        metadata={
            "total_propuestas": total,
            "ponencias_seleccionadas": n_sel,
            "tasa_seleccion": tasa,
            "foro": str(df["FORO"].iloc[0]) if total else "",
        },
        kpis=kpis,
        por_area=por_area,
        comparativa_areas=comparativa,
        top_temas=top_temas,
        por_clasificacion=por_clasificacion,
        terminos_problematica=terminos_prob,
        terminos_propuesta=terminos_prop,
        terminos_combinados=terminos_comb,
        categorias_terminos=categorias_terminos,
        bigramas=bigramas,
        terminos_distintivos=distintivos,
        ponencias=ponencias,
        insights=insights,
    )

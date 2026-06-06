from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.models import (
    AiCauseEffectRequest,
    AiCauseEffectResponse,
    AiInterpretationRequest,
    AiInterpretationResponse,
    AnalyticsResponse,
    KnowledgeGraphResponse,
    PonenciasAnalyticsResponse,
)
from app.services.ai_cause_effect import analyze_cause_effect
from app.services.ai_interpretation import interpret_knowledge_graph
from app.services.analytics import analyze_proposals, load_dataframe
from app.services.knowledge_graph import build_knowledge_graph
from app.services.ponencias_analytics import analyze_ponencias

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(
    title="PDD DACYTI Analytics API",
    description="API de analítica estratégica para propuestas del Plan de Desarrollo Divisional",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "pdd-dacyti-analytics"}


@app.post("/api/v1/analyze", response_model=AnalyticsResponse)
async def analyze_excel(file: UploadFile = File(...)) -> AnalyticsResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó archivo")

    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos Excel (.xlsx, .xls)")

    try:
        content = await file.read()
        df = load_dataframe(content)
        if df.empty:
            raise HTTPException(status_code=400, detail="El archivo no contiene propuestas")
        return analyze_proposals(df)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {exc}") from exc


@app.post("/api/v1/knowledge-graph", response_model=KnowledgeGraphResponse)
async def knowledge_graph(file: UploadFile = File(...)) -> KnowledgeGraphResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó archivo")

    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos Excel (.xlsx, .xls)")

    try:
        content = await file.read()
        df = load_dataframe(content)
        if df.empty:
            raise HTTPException(status_code=400, detail="El archivo no contiene propuestas")
        return build_knowledge_graph(df)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al generar grafo: {exc}") from exc


@app.post("/api/v1/knowledge-graph/interpret", response_model=AiInterpretationResponse)
async def knowledge_graph_interpret(body: AiInterpretationRequest) -> AiInterpretationResponse:
    try:
        return interpret_knowledge_graph(
            graph=body.graph,
            analytics=body.analytics,
            focus_node_id=body.focus_node_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al generar interpretación IA: {exc}") from exc


@app.post("/api/v1/knowledge-graph/cause-effect", response_model=AiCauseEffectResponse)
async def knowledge_graph_cause_effect(body: AiCauseEffectRequest) -> AiCauseEffectResponse:
    try:
        return analyze_cause_effect(
            graph=body.graph,
            analytics=body.analytics,
            focus_node_id=body.focus_node_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al generar análisis causa–efecto: {exc}") from exc


@app.post("/api/v1/ponencias", response_model=PonenciasAnalyticsResponse)
async def ponencias_analytics(file: UploadFile = File(...)) -> PonenciasAnalyticsResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó archivo")

    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos Excel (.xlsx, .xls)")

    try:
        content = await file.read()
        df = load_dataframe(content)
        if df.empty:
            raise HTTPException(status_code=400, detail="El archivo no contiene propuestas")
        return analyze_ponencias(df)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al analizar ponencias: {exc}") from exc

# PDD DACYTI Analytics Dashboard

Aplicación web de inteligencia de negocios para analizar propuestas del Plan de Desarrollo Divisional (PDD) de la DACYTI-UJAT.

## Flujo de trabajo

1. **Cargar** el archivo Excel exportado del foro (hoja `Exportar Hoja de Trabajo`)
2. **Procesar** automáticamente las 22 columnas estándar
3. **Explorar** el dashboard interactivo con visualizaciones D3.js

## Indicadores del dashboard

| Indicador | Descripción |
|-----------|-------------|
| Total de propuestas | Volumen de iniciativas registradas |
| Áreas temáticas | Cobertura de los 5 ejes estratégicos PDD |
| Temas únicos | Diversidad temática |
| Participación docente | Propuestas con profesores investigadores |
| Participación estudiantil | Propuestas con estudiantes |
| Vinculación externa | Propuestas con actores del sector productivo/otras instituciones |
| Tasa de exposición | % seleccionadas para presentar (EXPONE=Si) |
| Promedio de ponentes | Grado de colaboración interdisciplinaria |
| Índice diversidad temática | Entropía de Shannon sobre distribución de temas |

### Visualizaciones D3.js

- **Donut**: distribución por área estratégica y exposición en foro
- **Barras horizontales**: top temas y top ponentes
- **Barras apiladas**: perfiles participantes por área
- **Treemap**: jerarquía Área → Clasificación → Tema
- **Barras verticales**: dependencias y perfiles

## Requisitos

- Python 3.11+
- Node.js 18+

## Instalación y ejecución

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite + D3.js)

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173 y cargar el archivo Excel.

## Estructura del Excel

Columnas requeridas: `FOLIO`, `FORO`, `EXPONE`, `TITULO`, `PROBLEMATICA`, `PROPUESTA`, `CLAVE_TEMA`, `TEMA`, `CLAVE_AREA`, `CLASIFICACION`, `AREA`, `CLAVE_TIPO`, `ORD`, `TIPO`, `PONENCIA`, `PONENTES`, `CARGO`, `CORREOS`, `TELEFONOS`, `PONENCIA_1`, `DEPENDENCIA`, `OTRA`.

## Despliegue en Render.com

- **Web Service (backend)**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Static Site (frontend)**: `npm run build` → carpeta `dist`
- Variable de entorno frontend: `VITE_API_URL=https://tu-api.onrender.com`

## Referencias

- Indicadores PDD: `indicadores_pdd_dacyti_2022_2026.xlsx`
- [D3.js Visualization Guide](https://github.com/wentorai/research-plugins/blob/HEAD/skills/analysis/dataviz/d3-visualization-guide/SKILL.md)

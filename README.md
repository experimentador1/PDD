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

## Despliegue en Vercel (frontend + backend)

Todo el proyecto corre en **Vercel**: el frontend React como sitio estático y el backend FastAPI como **función serverless Python** en `/api`.

### Configuración en Vercel

1. Importa el repo [experimentador1/PDD](https://github.com/experimentador1/PDD).
2. **Root Directory:** deja vacío (raíz del repo, **no** `frontend`).
3. Vercel detectará `vercel.json` en la raíz con:
   - Build del frontend → `frontend/dist`
   - API Python → `api/index.py` (FastAPI + pandas)
4. Despliega. No necesitas variables de entorno adicionales.

### Estructura relevante

```
PDD/
├── api/index.py          ← entrada serverless (FastAPI)
├── backend/app/          ← lógica de analítica
├── requirements.txt      ← dependencias Python para Vercel
├── vercel.json           ← configuración de despliegue
└── frontend/             ← React + D3.js
```

### Verificación

- API: `https://tu-dominio.vercel.app/health` → `{"status":"ok"}`
- App: carga el Excel en tu dominio Vercel → debe mostrar el dashboard.

### Desarrollo local

Sigue usando dos terminales (backend + frontend) con los scripts `start-backend.sh` y `start-frontend.sh`.

## Referencias

- Indicadores PDD: `indicadores_pdd_dacyti_2022_2026.xlsx`
- [D3.js Visualization Guide](https://github.com/wentorai/research-plugins/blob/HEAD/skills/analysis/dataviz/d3-visualization-guide/SKILL.md)

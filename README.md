# Evaluación del Impacto Medioambiental de Modelos de IA

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![pytest](https://img.shields.io/badge/pytest-tested-0A9EDC?logo=pytest&logoColor=white)](https://pytest.org/)
[![Demo](https://img.shields.io/badge/Demo-Render-46E3B7?logo=render&logoColor=white)](https://tfg-evaluacion-del-impacto.onrender.com)

> **Trabajo de Fin de Grado — Antonio Luis Jiménez de la Fuente · Mayo 2026**

Herramienta web para cuantificar y comparar el impacto medioambiental de consultas a modelos de IA generativa, inspirada en el etiquetado europeo de eficiencia energética (A+++ – F). Descompone las emisiones de CO₂ en tres componentes —datacenter, dispositivo de usuario y red de comunicaciones— integrando datos de carbono en tiempo real de Electricity Maps API.

**[→ Demo en producción](https://tfg-evaluacion-del-impacto.onrender.com)**

---

## Índice

1. [Stack tecnológico](#stack-tecnológico)
2. [Funcionalidades](#funcionalidades)
3. [Cómo funciona](#cómo-funciona)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Instalación](#instalación)
6. [Variables de entorno](#variables-de-entorno)
7. [Uso](#uso)
8. [API REST](#api-rest)
9. [Tests](#tests)
10. [Datasets](#datasets)
11. [Despliegue](#despliegue)
12. [Troubleshooting](#troubleshooting)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12 · Flask 3.1 · Gunicorn |
| Frontend | Vanilla JS · Chart.js · Leaflet · CSS custom |
| Datos carbono | Electricity Maps API v3 (tiempo real) |
| Contenedores | Docker (python:3.12-slim, multi-stage) · Docker Compose |
| Pruebas | pytest · Postman (colección incluida) |
| Despliegue | Render (auto-deploy desde `main`) |

---

## Funcionalidades

- **Calculadora de emisiones** — modelo, datacenter, dispositivo, red y tokens; resultado en gCO₂eq con desglose por componente y etiqueta medioambiental.
- **Comparador de escenarios** — análisis de dominancia Pareto para identificar la configuración más sostenible.
- **Etiquetado A+++ – F** — umbrales calculados sobre ~639 000 combinaciones posibles, análogo al etiquetado de electrodomésticos de la UE.
- **Carbon intensity en tiempo real** — Electricity Maps API con sistema de 4 niveles de fallback; opera en modo offline sin clave API.
- **Cobertura**: 15 modelos LLM · 71 datacenters (AWS, GCP, Azure, DeepGreen) · 20 dispositivos · 5 tecnologías de red · 128 zonas geográficas.

---

## Cómo funciona

Las emisiones totales se descomponen en tres términos independientes:

| Componente | Variables |
|---|---|
| **Datacenter** | Tokens · energía por 1k tokens (Wh) · PUE · CI de la red eléctrica del DC |
| **Dispositivo** | Potencia (idle + carga) · tiempo de inferencia · CI local del usuario |
| **Red** | GB transferidos · kWh/GB según tecnología · CI local del usuario |

$$CO_2^{total} = CO_2^{DC} + CO_2^{disp} + CO_2^{red}$$

$$CO_2^{DC} = \frac{tokens}{1000} \times E_{1k} \times PUE \times \frac{CI_{DC}}{1000}, \qquad CO_2^{disp} = \frac{P \cdot t}{3600} \times \frac{CI_{usr}}{1000}$$

La intensidad de carbono ($CI$, gCO₂/kWh) se obtiene en tiempo real de Electricity Maps. Cuando la API no está disponible, el sistema aplica un fallback de 4 niveles: API nativa por DC → CSV con 128 zonas → valor por defecto del país → 450 gCO₂/kWh global.

---

## Estructura del proyecto

```
├── app/
│   ├── routes/
│   │   ├── main.py                  # Rutas HTML
│   │   └── api.py                   # Endpoints REST (/api/*)
│   ├── services/
│   │   ├── calculator_service.py    # Orquestador del motor de cálculo
│   │   └── report_service.py        # Comparativas y generación de informes
│   ├── static/                      # CSS + JS (Chart.js, Leaflet)
│   └── templates/                   # landing.html · index.html · base.html
├── scripts/
│   ├── calculate_emissions.py       # Motor CarbonCalculator (8 CSVs)
│   ├── carbon_intensity_api.py      # Cliente Electricity Maps + 4-tier fallback
│   └── environmental_labels.py      # Etiquetas A+++–F por percentiles
├── datasets/
│   ├── raw/
│   │   ├── models/                  # models.csv (15 LLMs) · request_types.csv
│   │   ├── data_centers/            # data_centers.csv (71 DCs)
│   │   ├── devices/                 # devices.csv (20 dispositivos)
│   │   ├── network/                 # network_energy_sources_2024.csv
│   │   └── carbon_intensity/        # carbon_intensity.csv · carbon_intensity_datacenters.csv
│   └── processed/
│       └── emissions_distribution.csv   # Percentiles para etiquetado
├── testing/
│   ├── unit/ · integration/ · regression/ · validation/ · performance/
│   ├── postman/                     # Colección Postman
│   └── conftest.py · pytest.ini
├── Dockerfile                       # Imagen multi-stage (python:3.12-slim, uid 1001)
├── docker-compose.yml
├── render.yaml                      # Despliegue automático en Render
├── requirements.txt
└── run.py                           # Punto de entrada
```

---

## Instalación

### Local

```bash
git clone https://github.com/antonioluisjf22/TFG-Evaluacion-del-impacto-medioambiental-de-modelos-de-Inteligencia-Artificial.git
cd TFG-Evaluacion-del-impacto-medioambiental-de-modelos-de-Inteligencia-Artificial
python -m venv .venv
source .venv/bin/activate        # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env             # Editar con los valores adecuados
python run.py                    # http://localhost:5000
```

### Docker

```bash
docker build -t tfg-carbon-calculator .
docker run -d -p 5000:5000 \
  -e SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')" \
  -e ELECTRICITY_MAPS_API_KEY="tu-api-key" \
  tfg-carbon-calculator
```

### Docker Compose

```bash
cp .env.example .env
docker compose up -d
```

---

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `SECRET_KEY` | Sí (producción) | Clave Flask para sesiones. Generar: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ELECTRICITY_MAPS_API_KEY` | No | Token de [Electricity Maps API](https://api-portal.electricitymaps.com). Sin ella, modo offline con datos históricos. |

---

## Uso

1. Abrir **http://localhost:5000** → página de inicio.
2. En la **Calculadora**: seleccionar modelo LLM, datacenter, dispositivo, tecnología de red e introducir número de tokens.
3. Pulsar **Calcular**: se muestra el CO₂ total, el desglose por componente y la etiqueta A+++ – F.
4. En el **Comparador**: añadir varias configuraciones para obtener el análisis de dominancia Pareto.

---

## API REST

Todos los endpoints devuelven `application/json`.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado de los servicios internos |
| `GET` | `/api/options` | Catálogos de modelos, DCs, dispositivos y redes |
| `POST` | `/api/calculate` | Calcula emisiones para una configuración |
| `POST` | `/api/compare` | Compara configuraciones con análisis Pareto |

**Ejemplo `POST /api/calculate`:**

```jsonc
// Request
{ "model_id": "gpt-4", "datacenter_id": "aws-us-east-1",
  "device_id": "macbook-pro-m3", "network_id": "wifi-6",
  "input_tokens": 500, "output_tokens": 200 }

// Response
{ "total_co2_g": 0.847,
  "breakdown": { "datacenter_co2_g": 0.612, "device_co2_g": 0.198, "network_co2_g": 0.037 },
  "label": "B", "energy_wh": 2.14, "renewable_pct": 43.2 }
```

---

## Tests

Las pruebas están en `testing/` organizadas con pytest. Se incluye además una **colección Postman** en `testing/postman/` para pruebas manuales de la API.

```bash
# Todos los tests (excluye lentos)
pytest testing/ -m "not slow"

# Por categoría
pytest testing/ -m unit          # Unitarios sin I/O externo
pytest testing/ -m integration   # End-to-end con Flask y datasets
pytest testing/ -m regression    # Anclan valores conocidos entre versiones
pytest testing/ -m validation    # Validación matemática de fórmulas

# Con cobertura
pytest testing/ --cov=scripts --cov=app --cov-report=term-missing
```

| Marcador | Propósito |
|---|---|
| `unit` | Lógica aislada sin dependencias externas |
| `integration` | API completa con datos reales |
| `regression` | Detección de regresiones numéricas |
| `validation` | Exactitud matemática de fórmulas de emisiones |
| `boundary` | Entradas extremas y casos límite |
| `performance` | Tiempos de respuesta bajo carga |

---

## Datasets

| Dataset | Registros | Descripción |
|---|---|---|
| `models.csv` | 15 LLMs | Parámetros, Wh/1k tokens, latencia (2N FLOPs · A100) |
| `data_centers.csv` | 71 DCs | PUE, país, % renovables (AWS 21 · GCP 33 · Azure 16 · DeepGreen 1) |
| `devices.csv` | 20 dispositivos | TDP idle/carga (portátiles, móviles, desktops, edge, tablets) |
| `network_energy_sources_2024.csv` | 5 tecnologías | kWh/GB por tecnología (0.4–6.0 kWh/GB) |
| `carbon_intensity.csv` | 128 zonas | CI en tiempo real vía Electricity Maps (fallback tier 2) |
| `carbon_intensity_datacenters.csv` | 71 DCs | CI por datacenter (53.5% API nativa, 46.5% mapeo manual) |
| `request_types.csv` | 7 tipos | Tokens entrada/salida por tipo de consulta (LMSYS-Chat-1M, WildChat…) |
| `emissions_distribution.csv` | ~639 000 combinaciones | Percentiles para cálculo de etiquetas A+++ – F |

---

## Despliegue

El repositorio incluye `render.yaml` preconfigurado para despliegue automático en [Render](https://render.com).

1. Conectar el repositorio en Render → detección automática del `render.yaml`.
2. Añadir `ELECTRICITY_MAPS_API_KEY` en **Environment** si se desea modo tiempo real.
3. Pulsar **Deploy** — la URL pública queda disponible al instante.

Los redespliegues se activan automáticamente con cada push a `main`. En el plan Free, el servicio hiberna tras 15 min de inactividad (*cold start* de ~30–60 s en la primera petición).

---

## Troubleshooting

**La app tarda en responder en Render** — cold start del plan Free; las peticiones siguientes son inmediatas.

**Modo offline activo** — `ELECTRICITY_MAPS_API_KEY` no configurada o rate-limit alcanzado. Verificar con `GET /api/health` → campo `electricity_maps_api.mode`.

**Puerto 5000 ocupado localmente:**
```bash
lsof -i :5000                                # macOS/Linux
Get-NetTCPConnection -LocalPort 5000         # Windows PowerShell
```

**`ModuleNotFoundError` en tests** — activar el entorno virtual antes de ejecutar pytest.

**`.env` no se carga** — `run.py` no auto-carga `.env`. Exportar manualmente o usar Docker Compose:
```bash
$env:ELECTRICITY_MAPS_API_KEY="tu-key"   # PowerShell
python run.py
```


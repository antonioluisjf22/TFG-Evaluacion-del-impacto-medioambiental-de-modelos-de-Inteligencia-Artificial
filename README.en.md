# CarbonAI — Environmental Impact Assessment of AI Models

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![pytest](https://img.shields.io/badge/pytest-tested-0A9EDC?logo=pytest&logoColor=white)](https://pytest.org/)
[![Demo](https://img.shields.io/badge/Demo-Render-46E3B7?logo=render&logoColor=white)](https://tfg-evaluacion-del-impacto.onrender.com)

> **Bachelor's Thesis — Antonio Luis Jiménez de la Fuente · May 2026**

**CarbonAI** is a web tool for quantifying and comparing the environmental impact of queries to generative AI models, inspired by the EU energy-efficiency labeling scheme (A+++ – F). It breaks down CO₂ emissions into three components — datacenter, user device, and communication network — integrating real-time carbon data from the Electricity Maps API.

**[→ Live demo](https://tfg-evaluacion-del-impacto.onrender.com)**

*[Versión en español](README.md)*

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Features](#features)
3. [How it works](#how-it-works)
4. [Project structure](#project-structure)
5. [Installation](#installation)
6. [Environment variables](#environment-variables)
7. [Usage](#usage)
8. [REST API](#rest-api)
9. [Tests](#tests)
10. [Datasets](#datasets)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12 · Flask 3.1 · Gunicorn |
| Frontend | Vanilla JS · Chart.js · Leaflet · custom CSS |
| Carbon data | Electricity Maps API v3 (real-time) |
| Containers | Docker (python:3.12-slim, multi-stage) · Docker Compose |
| Testing | pytest · Postman (collection included) |
| Deployment | Render (auto-deploy from `main`) |

---

## Features

- **Emissions calculator** — model, datacenter, device, network, and tokens; result in gCO₂eq with a per-component breakdown and environmental label.
- **Scenario comparator** — Pareto dominance analysis to identify the most sustainable configuration.
- **A+++ – F labeling** — thresholds computed over ~639,000 possible combinations, analogous to EU home-appliance labeling.
- **Real-time carbon intensity** — Electricity Maps API with a 4-tier fallback system; works offline without an API key.
- **Coverage**: 15 LLM models · 71 datacenters (AWS, GCP, Azure, DeepGreen) · 20 devices · 5 network technologies · 128 geographic zones.
- **Bilingual interface (ES/EN)** — selector in the header; also via `?lang=en` / `?lang=es` in the URL (remembered via cookie) or based on the browser's `Accept-Language`.

---

## How it works

Total emissions are broken down into three independent terms:

| Component | Variables |
|---|---|
| **Datacenter** | Tokens · energy per 1k tokens (Wh) · PUE · grid carbon intensity of the DC |
| **Device** | Power draw (idle + load) · inference time · user's local CI |
| **Network** | GB transferred · kWh/GB by technology · user's local CI |

$$CO_2^{total} = CO_2^{DC} + CO_2^{device} + CO_2^{network}$$

$$CO_2^{DC} = \frac{tokens}{1000} \times E_{1k} \times PUE \times \frac{CI_{DC}}{1000}, \qquad CO_2^{device} = \frac{P \cdot t}{3600} \times \frac{CI_{usr}}{1000}$$

Carbon intensity ($CI$, gCO₂/kWh) is obtained in real time from Electricity Maps. When the API is unavailable, the system applies a 4-tier fallback: native API per DC → CSV with 128 zones → country default value → 450 gCO₂/kWh global default.

---

## Project structure

```
├── app/
│   ├── routes/
│   │   ├── main.py                  # HTML routes
│   │   └── api.py                   # REST endpoints (/api/*)
│   ├── services/
│   │   ├── calculator_service.py    # Calculation engine orchestrator
│   │   └── report_service.py        # Comparisons and report generation
│   ├── i18n.py                      # ES/EN template language (?lang=, cookie, Accept-Language)
│   ├── static/                      # CSS + JS (Chart.js, Leaflet) · js/i18n.js = frontend translations
│   └── templates/                   # landing.html · index.html · base.html
├── scripts/
│   ├── calculate_emissions.py       # CarbonCalculator engine (8 CSVs)
│   ├── carbon_intensity_api.py      # Electricity Maps client + 4-tier fallback
│   └── environmental_labels.py      # A+++–F labels by percentile
├── datasets/
│   ├── raw/
│   │   ├── models/                  # models.csv (15 LLMs) · request_types.csv
│   │   ├── data_centers/            # data_centers.csv (71 DCs)
│   │   ├── devices/                 # devices.csv (20 devices)
│   │   ├── network/                 # network_energy_sources_2024.csv
│   │   └── carbon_intensity/        # carbon_intensity.csv · carbon_intensity_datacenters.csv
│   └── processed/
│       └── emissions_distribution.csv   # Percentiles for labeling
├── testing/
│   ├── unit/ · integration/ · regression/ · validation/ · performance/
│   ├── postman/                     # Postman collection
│   └── conftest.py · pytest.ini
├── Dockerfile                       # Multi-stage image (python:3.12-slim, uid 1001)
├── docker-compose.yml
├── render.yaml                      # Automatic deployment on Render
├── requirements.txt
└── run.py                           # Entry point
```

---

## Installation

### Local

```bash
git clone https://github.com/antonioluisjf22/TFG-Evaluacion-del-impacto-medioambiental-de-modelos-de-Inteligencia-Artificial.git
cd TFG-Evaluacion-del-impacto-medioambiental-de-modelos-de-Inteligencia-Artificial
python -m venv .venv
source .venv/bin/activate        # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env             # Edit with the appropriate values
python run.py                    # http://localhost:5000
```

### Docker

```bash
docker build -t tfg-carbon-calculator .
docker run -d -p 5000:5000 \
  -e SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')" \
  -e ELECTRICITY_MAPS_API_KEY="your-api-key" \
  tfg-carbon-calculator
```

### Docker Compose

```bash
cp .env.example .env
docker compose up -d
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes (production) | Flask session key. Generate with: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ELECTRICITY_MAPS_API_KEY` | No | Token from [Electricity Maps API](https://api-portal.electricitymaps.com). Without it, offline mode with historical data is used. |

---

## Usage

1. Open **http://localhost:5000** → home page.
2. In the **Calculator**: select an LLM model, datacenter, device, network technology, and enter the number of tokens.
3. Click **Calculate**: total CO₂, per-component breakdown, and the A+++ – F label are displayed.
4. In the **Comparator**: add several configurations to get the Pareto dominance analysis.
5. **Language**: **ES / EN** button in the header, or `http://localhost:5000/calculator?lang=en`.

---

## REST API

All endpoints return `application/json`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Status of internal services |
| `GET` | `/api/options` | Catalogs of models, DCs, devices, and networks |
| `POST` | `/api/calculate` | Calculates emissions for a configuration |
| `POST` | `/api/compare` | Compares configurations with Pareto analysis |

**Example `POST /api/calculate`:**

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

Tests live in `testing/`, organized with pytest. A **Postman collection** is also included in `testing/postman/` for manual API testing.

```bash
# All tests (excludes slow ones)
pytest testing/ -m "not slow"

# By category
pytest testing/ -m unit          # Unit tests without external I/O
pytest testing/ -m integration   # End-to-end with Flask and datasets
pytest testing/ -m regression    # Pin known values across versions
pytest testing/ -m validation    # Mathematical validation of formulas

# With coverage
pytest testing/ --cov=scripts --cov=app --cov-report=term-missing
```

| Marker | Purpose |
|---|---|
| `unit` | Isolated logic without external dependencies |
| `integration` | Full API with real data |
| `regression` | Numerical regression detection |
| `validation` | Mathematical accuracy of emission formulas |
| `boundary` | Extreme inputs and edge cases |
| `performance` | Response times under load |

---

## Datasets

| Dataset | Records | Description |
|---|---|---|
| `models.csv` | 15 LLMs | Parameters, Wh/1k tokens, latency (2N FLOPs · A100) |
| `data_centers.csv` | 71 DCs | PUE, country, % renewables (AWS 21 · GCP 33 · Azure 16 · DeepGreen 1) |
| `devices.csv` | 20 devices | Idle/load TDP (laptops, mobiles, desktops, edge, tablets) |
| `network_energy_sources_2024.csv` | 5 technologies | kWh/GB by technology (0.4–6.0 kWh/GB) |
| `carbon_intensity.csv` | 128 zones | Real-time CI via Electricity Maps (fallback tier 2) |
| `carbon_intensity_datacenters.csv` | 71 DCs | CI per datacenter (53.5% native API, 46.5% manual mapping) |
| `request_types.csv` | 7 types | Input/output tokens per query type (LMSYS-Chat-1M, WildChat…) |
| `emissions_distribution.csv` | ~639,000 combinations | Percentiles for A+++ – F label computation |

---

## Deployment

The repository includes a preconfigured `render.yaml` for automatic deployment on [Render](https://render.com).

1. Connect the repository on Render → automatic detection of `render.yaml`.
2. Add `ELECTRICITY_MAPS_API_KEY` under **Environment** if real-time mode is desired.
3. Click **Deploy** — the public URL becomes available instantly.

Redeployments are triggered automatically on every push to `main`. On the Free plan, the service sleeps after 15 min of inactivity (*cold start* of ~30–60 s on the first request).

---

## Troubleshooting

**The app is slow to respond on Render** — cold start on the Free plan; subsequent requests are immediate.

**Offline mode active** — `ELECTRICITY_MAPS_API_KEY` not configured or rate limit reached. Check with `GET /api/health` → `electricity_maps_api.mode` field.

**Port 5000 already in use locally:**
```bash
lsof -i :5000                                # macOS/Linux
Get-NetTCPConnection -LocalPort 5000         # Windows PowerShell
```

**`ModuleNotFoundError` during tests** — activate the virtual environment before running pytest.

**`.env` not loading** — `run.py` does not auto-load `.env`. Export it manually or use Docker Compose:
```bash
$env:ELECTRICITY_MAPS_API_KEY="your-key"   # PowerShell
python run.py
```

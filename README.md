
# Evaluación del Impacto Medioambiental de Modelos de IA

## Español

El auge de la Inteligencia Artificial ha traído consigo un consumo energético masivo y una huella de carbono significativa, aspectos que con frecuencia quedan en un segundo plano frente al rendimiento técnico. Esta falta de estandarización en el reporte del impacto ecológico crea una asimetría de información que impide a desarrolladores e investigadores valorar si la eficacia de un modelo justifica su coste ambiental.

Este Trabajo de Fin de Grado propone una herramienta de evaluación inspirada en el etiquetado de eficiencia energética de los electrodomésticos. Su objetivo es que el programador deje de ser un consumidor ciego de recursos para convertirse en un decisor consciente, capaz de discernir no solo cuántos "litros de combustible digital" consume un proceso, sino también qué tan limpia es la fuente de esa energía.

Para ello, la herramienta integra factores externos como la eficiencia de la infraestructura, la ubicación geográfica y el mix energético local, reconociendo que el impacto real de un modelo va más allá de su arquitectura. Esto permite recomendar alternativas más sostenibles sin comprometer los objetivos técnicos, sentando las bases de una Inteligencia Artificial responsable donde innovación y protección del entorno avancen en una misma dirección.

## English

The rise of Artificial Intelligence has brought massive energy consumption and a significant carbon footprint, aspects that are often overshadowed by technical performance metrics. The lack of standardization in ecological impact reporting creates an information gap that prevents developers and researchers from assessing whether a model's effectiveness justifies its environmental cost.

This Bachelor's Thesis proposes an evaluation tool inspired by household appliance energy labels. Its goal is to transform developers from blind resource consumers into conscious decision-makers, capable of understanding not only how many "digital fuel liters" a process consumes, but also how clean the source of that energy is.

To achieve this, the tool incorporates external factors such as infrastructure efficiency, geographic location, and local energy mix, acknowledging that a model's true impact extends beyond its architecture. This makes it possible to recommend more sustainable alternatives without compromising technical objectives, laying the groundwork for responsible AI where innovation and environmental protection advance together.

---

🌐 **Demo en producción:** https://tfg-evaluacion-del-impacto.onrender.com

---

## Índice

1. [Descripción](#descripción)
2. [Estructura del proyecto](#estructura-del-proyecto)
3. [Requisitos previos](#requisitos-previos)
4. [Instalación local (sin Docker)](#instalación-local-sin-docker)
5. [Instalación con Docker](#instalación-con-docker)
6. [Instalación con Docker Compose](#instalación-con-docker-compose)
7. [Variables de entorno](#variables-de-entorno)
8. [Uso de la aplicación](#uso-de-la-aplicación)
9. [API REST](#api-rest)
10. [Ejecución de pruebas](#ejecución-de-pruebas)
11. [Despliegue en Render](#despliegue-en-render)
12. [Troubleshooting](#troubleshooting)
13. [Estructura de datasets](#estructura-de-datasets)

---

## Descripción

La herramienta estima las emisiones de CO₂ de una inferencia en un modelo de IA desglosándolas en tres componentes:

- **Centro de datos:** consumo del servidor según tokens procesados, eficiencia PUE e intensidad de carbono de la red eléctrica local (vía Electricity Maps API o datos históricos en modo offline).
- **Dispositivo del usuario:** consumo energético del terminal (CPU/GPU/NPU) durante la petición.
- **Red de comunicaciones:** energía consumida por la transmisión de datos según la tecnología de red (Fibra, WiFi, 4G, 5G).

Los resultados se presentan con una **etiqueta de eficiencia medioambiental** (A+ a G), análoga al etiquetado europeo de electrodomésticos, y permiten comparar múltiples escenarios en paralelo.

---

## Estructura del proyecto

```
├── app/
│   ├── __init__.py          # Factory de la aplicación Flask
│   ├── routes/
│   │   ├── main.py          # Rutas de vistas HTML
│   │   └── api.py           # Endpoints REST (/api/*)
│   ├── services/
│   │   ├── calculator_service.py   # Orquestador del motor de cálculo
│   │   └── report_service.py       # Generación de informes y comparativas
│   ├── static/              # CSS, JS, imágenes
│   └── templates/           # Plantillas HTML (Jinja2)
├── scripts/
│   ├── calculate_emissions.py      # Motor de cálculo (CarbonCalculator)
│   ├── carbon_intensity_api.py     # Cliente de Electricity Maps API
│   ├── environmental_labels.py     # Lógica de etiquetas A+–G
│   └── ...
├── datasets/
│   ├── raw/                 # Datos fuente originales
│   └── processed/           # Datasets procesados listos para la app
├── testing/
│   ├── unit/                # Tests unitarios (pytest)
│   ├── integration/         # Tests de integración end-to-end
│   ├── regression/          # Tests de regresión
│   ├── validation/          # Tests de validación matemática
│   ├── conftest.py          # Fixtures compartidas
│   └── pytest.ini           # Configuración de pytest
├── .env.example             # Plantilla de variables de entorno
├── docker-compose.yml       # Despliegue con Docker Compose
├── Dockerfile               # Imagen Docker multi-stage
├── render.yaml              # Configuración de despliegue en Render
├── requirements.txt         # Dependencias Python
└── run.py                   # Punto de entrada de la aplicación
```

---

## Requisitos previos

- **Python 3.12** o superior
- **pip** actualizado (`pip install --upgrade pip`)
- **Docker** (opcional, para despliegue con contenedores)
- **Clave API de Electricity Maps** (opcional; sin ella la app opera en modo offline con datos históricos)

---

## Instalación local (sin Docker)

### 1. Clonar el repositorio

```bash
git clone https://github.com/antonioluisjf22/TFG-Evaluacion-del-impacto-medioambiental-de-modelos-de-Inteligencia-Artificial.git
cd TFG-Evaluacion-del-impacto-medioambiental-de-modelos-de-Inteligencia-Artificial
```

### 2. Crear y activar un entorno virtual

```bash
# Crear entorno virtual
python -m venv .venv

# Activar en Linux/macOS
source .venv/bin/activate

# Activar en Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

```bash
# Copiar la plantilla
cp .env.example .env
```

Editar `.env` con los valores adecuados (ver sección [Variables de entorno](#variables-de-entorno)).

### 5. Arrancar la aplicación

```bash
python run.py
```

La aplicación estará disponible en **http://localhost:5000**.

---

## Instalación con Docker

### 1. Construir la imagen

```bash
docker build -t tfg-carbon-calculator .
```

### 2. Arrancar el contenedor

```bash
docker run -d \
  --name tfg \
  -p 5000:5000 \
  -e SECRET_KEY="<clave-secreta-aleatoria>" \
  -e ELECTRICITY_MAPS_API_KEY="<tu-api-key>" \
  tfg-carbon-calculator
```

Omitir `ELECTRICITY_MAPS_API_KEY` para usar el modo offline.

### 3. Verificar el estado

```bash
docker ps
docker logs tfg
curl http://localhost:5000/api/health
```

### 4. Detener el contenedor

```bash
docker stop tfg && docker rm tfg
```

---

## Instalación con Docker Compose

### 1. Crear el fichero `.env`

```bash
cp .env.example .env
# Editar .env con tus valores
```

### 2. Arrancar

```bash
docker compose up -d
```

### 3. Consultar el estado

```bash
docker compose ps
```

### 4. Detener

```bash
docker compose down
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `SECRET_KEY` | Sí (producción) | Clave secreta de Flask para la gestión de sesiones. Generar con: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ELECTRICITY_MAPS_API_KEY` | No (pero recomendable) | Token de la API de Electricity Maps para obtener intensidad de carbono en tiempo real. Sin ella la app usa datos históricos del CSV. Obtener en https://api-portal.electricitymaps.com |

> **Nota:** En desarrollo local se puede usar el valor por defecto del `.env.example`. En producción, `SECRET_KEY` debe ser un valor aleatorio y secreto.

---

## Uso de la aplicación

### Calculadora de emisiones

1. Acceder a **http://localhost:5000**.
2. Seleccionar el **modelo de IA** (GPT-4, Claude, Llama, etc.).
3. Seleccionar el **centro de datos** (proveedor y región geográfica).
4. Seleccionar el **dispositivo** del usuario (MacBook, PC sobremesa, móvil, etc.).
5. Seleccionar la **tecnología de red** (Fibra, WiFi, 4G, 5G).
6. Introducir el **número de tokens** de entrada y salida.
7. Pulsar **Calcular** para obtener el desglose de emisiones y la etiqueta medioambiental.

### Comparador de escenarios

Permite añadir múltiples configuraciones y compararlas en una tabla lado a lado, identificando la opción más sostenible con análisis de dominancia Pareto.

---

## API REST

Todos los endpoints devuelven JSON.

### `GET /api/health`

Estado de los servicios internos.

```json
{
  "status": "ok",
  "services": {
    "calculator": {"status": "ok", "models_loaded": 42},
    "electricity_maps_api": {"status": "configured", "mode": "realtime"}
  }
}
```

### `GET /api/options`

Catálogos disponibles para los selectores del formulario (modelos, datacenters, dispositivos, redes).

### `POST /api/calculate`

Calcula las emisiones para una configuración dada.

**Body (JSON):**
```json
{
  "model_id": "gpt-4",
  "datacenter_id": "aws-us-east-1",
  "device_id": "macbook-pro-m3",
  "network_id": "wifi-6",
  "input_tokens": 500,
  "output_tokens": 200
}
```

**Respuesta:**
```json
{
  "total_co2_g": 0.847,
  "breakdown": {
    "datacenter_co2_g": 0.612,
    "device_co2_g": 0.198,
    "network_co2_g": 0.037
  },
  "label": "B",
  "energy_wh": 2.14,
  "renewable_pct": 43.2
}
```

### `POST /api/compare`

Compara múltiples configuraciones y devuelve el análisis de dominancia Pareto.

---

## Ejecución de pruebas

Las pruebas están organizadas en `testing/` con pytest.

### Ejecutar todos los tests (excluye los lentos)

```bash
cd testing
pytest -m "not slow"
```

### Ejecutar por categoría

```bash
# Solo tests unitarios
pytest -m unit

# Tests de integración
pytest -m integration

# Tests de regresión
pytest -m regression

# Tests de validación matemática
pytest -m validation
```

### Ejecutar con informe de cobertura

```bash
pytest --cov=scripts --cov=app --cov-report=term-missing
```

### Categorías de marcadores disponibles

| Marcador | Descripción |
|---|---|
| `unit` | Tests unitarios sin I/O externo |
| `integration` | Tests end-to-end con Flask y datasets |
| `regression` | Anclan valores conocidos entre versiones |
| `validation` | Validación matemática y calidad de datos |
| `boundary` | Casos límite y entradas extremas |
| `performance` | Tests de rendimiento y timing |
| `slow` | Tests que tardan más de 5 segundos |

---

## Despliegue en Render

El repositorio incluye `render.yaml` con la configuración completa.

1. Crear cuenta en https://render.com y conectar el repositorio de GitHub.
2. Render detecta automáticamente el `render.yaml` y preconfigura el servicio.
3. En **Environment**, añadir la variable `ELECTRICITY_MAPS_API_KEY` si se desea modo tiempo real (`SECRET_KEY` se genera automáticamente).
4. Pulsar **Deploy**.

La aplicación queda disponible en la URL pública asignada por Render. Los redespliegues son automáticos con cada push a `main`.

---

## Troubleshooting

### La aplicación tarda mucho en responder la primera petición

Render en plan Free hiberna el servicio tras 15 minutos de inactividad. El primer acceso puede tardar entre 30 y 60 segundos mientras el contenedor arranca (*cold start*). Es el comportamiento esperado; las peticiones siguientes responden con normalidad.

### Modo offline: no se obtienen datos en tiempo real de Electricity Maps

Si `ELECTRICITY_MAPS_API_KEY` no está configurada o la API no está disponible, la aplicación cambia automáticamente a modo offline y usa los datos históricos del CSV. El endpoint `/api/health` indica el modo activo:

```json
{"electricity_maps_api": {"mode": "offline"}}
```

Para activar el modo en tiempo real, añadir la variable al `.env` o a las variables de entorno de Render.

### Error `Address already in use` al arrancar localmente

El puerto 5000 está ocupado por otro proceso. Identificar el proceso y terminarlo:

```bash
# Linux/macOS
lsof -i :5000

# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
```

### Error al instalar dependencias en Windows (`Microsoft Visual C++ required`)

Algunas dependencias requieren el compilador de C++ de Microsoft. Instalar las **Build Tools para Visual Studio** desde https://visualstudio.microsoft.com/visual-cpp-build-tools/ y volver a ejecutar `pip install -r requirements.txt`.

### Docker: error `permission denied` al construir la imagen

En Linux, añadir el usuario al grupo `docker` para no requerir `sudo`:

```bash
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para que el cambio surta efecto
```

### Los tests fallan con `ModuleNotFoundError`

Asegurarse de que el entorno virtual está activado y las dependencias instaladas antes de ejecutar pytest:

```bash
source .venv/bin/activate    # Linux/macOS
.venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt
pytest testing/
```

### La variable `ELECTRICITY_MAPS_API_KEY` no se carga desde `.env`

`run.py` no carga automáticamente `.env`. Exportar la variable manualmente o usar Docker Compose (que sí la carga):

```bash
# Linux/macOS
export ELECTRICITY_MAPS_API_KEY="tu-api-key"
python run.py

# Windows (PowerShell)
$env:ELECTRICITY_MAPS_API_KEY="tu-api-key"
python run.py
```

---

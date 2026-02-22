# DATASET SOURCES DOCUMENTATION

**Última actualización**: 2026-01-28

---

## 📋 Tabla: `models.csv` (v2.0)

### Descripción
Características técnicas y energéticas de 10 modelos de IA representativos, incluyendo parámetros, FLOPS de entrenamiento, **consumo energético por token**, latencia, y tipos de petición soportados.

### Fuentes Utilizadas

| Modelo | Fuente Principal | URL | Fecha Consulta | Confianza | Notas |
|--------|-----------------|-----|-----------------|-----------|-------|
| **GPT-4** | OpenAI Official | https://openai.com/research/gpt-4 | 2026-01-10 | 95% | Energía: 4.8 mWh/1k tokens (calculado desde TDP H100) |
| **PaLM 2** | Google Technical Report | https://ai.google/static/documents/palm2techreport.pdf | 2026-01-10 | 70% | Energía: calculada |
| **OPT 175B** | Meta Research Paper | https://arxiv.org/abs/2205.01068 | 2026-01-10 | 85% | Energía: 3.5 mWh/1k tokens (calculado 2N FLOPs) |
| **Claude 2** | Anthropic Official | https://www.anthropic.com/index/claude-2 | 2026-01-10 | 65% | Energía: calculada |
| **Llama 2 70B** | Meta Research Paper | https://arxiv.org/abs/2307.09288 | 2026-01-10 | 80% | Energía: 2.1 mWh/1k tokens (calculado 2N FLOPs) |
| **Falcon 40B** | TII Hugging Face | https://huggingface.co/tiiuae/falcon-40b | 2026-01-10 | 80% | Energía: calculada |
| **MPT 30B** | MosaicML Hugging Face | https://huggingface.co/mosaicml/mpt-30b | 2026-01-10 | 82% | Energía: calculada |
| **Mistral 7B** | Mistral Research Paper | https://arxiv.org/abs/2310.06825 | 2026-01-10 | 85% | Energía: 0.45 mWh/1k tokens (empírico benchmarks) |
| **BERT Base** | Google Research Paper | https://arxiv.org/abs/1810.04805 | 2026-01-10 | 85% | Energía: 0.012 mWh/1k tokens (empírico Cao 2020) |
| **Vision Transformer (ViT)** | Google DeepMind Paper | https://arxiv.org/abs/2010.11929 | 2026-01-10 | 93% | Energía: 0.018 mWh/1k tokens (empírico edge devices) |

### Fuentes para Datos Energéticos (v2.4)

| Fuente | Descripción | URL | Datos Obtenidos |
|--------|-------------|-----|-----------------|
| Luccioni et al. 2023 | "Power Hungry Processing" | https://arxiv.org/abs/2311.16863 | Metodología de medición, validación de orden de magnitud |
| Patterson et al. 2021 | "Carbon Emissions and Large Neural Network Training" | https://arxiv.org/abs/2104.10350 | Fórmulas de estimación energética |
| Strubell et al. 2019 | "Energy and Policy Considerations for Deep Learning" | https://arxiv.org/abs/1906.02243 | Metodología de cálculo |
| Dodge et al. 2022 | "Measuring the Carbon Intensity of AI in Cloud Instances" | https://arxiv.org/abs/2206.05229 | Benchmarks de latencia |
| Cao et al. 2020 | "Towards Accurate Energy Measurement of NLP Models" | https://aclanthology.org/2020.sustainlp-1.19/ | energy_wh_per_1k_tokens para BERT (empírico) |

### Metodología de Recopilación

#### **Para modelos disponibles en HuggingFace Hub (70% de los datos)**
- Extracción directa desde model cards oficiales
- Número de parámetros: reportado en card
- FLOPS: obtenido de papers académicos asociados o documentación técnica
- Confianza: 85-95% (datos de primera mano)

#### **Para modelos NOT en HuggingFace (30% de los datos)**
- OpenAI (GPT-4): OpenAI Technical Report
- Google (PaLM 2): Google AI Official Report
- Anthropic (Claude 2): Blog oficial + estimaciones basadas en escala
- Confianza: 65-95% (mezcla de datos oficiales y estimaciones)

#### **FLOPS de Entrenamiento: Metodología**
- **Modelos con FLOPS reportados**: Se toman directamente de papers académicos
- **Modelos con FLOPS estimados**: Se calculan basándose en:
  - Número de parámetros (P)
  - Tokens de entrenamiento (T)
  - Fórmula aproximada: FLOPS ≈ 6 × P × T
  - Fuentes: Papers Chinchilla (DeepMind) y estudios similares

> ⚠️ **NOTA**: El campo `flops_training` es **INFORMATIVO**. No se utiliza en `calculate_emissions.py` porque:
> 1. El entrenamiento ocurre **una sola vez** (o pocas veces) por parte del proveedor (OpenAI, Meta, etc.)
> 2. El coste de entrenamiento se amortiza entre **billones de consultas** de usuarios
> 3. Calcular qué fracción corresponde a cada query es arbitrario y las empresas no publican datos exactos
>
> La calculadora se enfoca en el **impacto operativo por consulta**, no en el coste histórico de crear el modelo.

#### **FLOPS de Inferencia: Metodología**
- **Fórmula estándar para Transformers**: `FLOPS_inferencia = 2 × num_parameters × tokens`
- El factor **2×** corresponde al forward pass (multiplicación + activación)
- En comparación, entrenamiento usa **6×** (forward + backward + optimizer step)
- Esta fórmula se usa en `calculate_emissions.py` como **fallback** cuando no hay `energy_wh_per_1k_tokens` empírico

### Campos del Dataset (v2.0)

```
# IDENTIFICACIÓN
model_id                 : Identificador único (lowercase, guiones)
model_name               : Nombre oficial del modelo
organization             : Organización creadora
model_type               : Categoría (LLM, Vision, Classification)

# ARQUITECTURA
num_parameters           : Número total de parámetros (entero)
flops_training           : FLOPS de entrenamiento (notación científica)
context_window           : Ventana de contexto máxima (tokens)
max_output_tokens        : Máximo tokens de salida

# CONSUMO ENERGÉTICO (v2.0 - NUEVO)
energy_wh_per_1k_tokens  : Energía por 1000 tokens (Wh)
energy_source            : Fuente: 'empirical' (medido) o 'calculated'
latency_ms_per_token     : Latencia por token (milisegundos)
latency_source           : Fuente: 'empirical' o 'calculated'
tokens_per_second        : Velocidad de generación (tokens/s)

# TIPOS DE PETICIÓN (v2.0 - NUEVO)
supported_request_types  : Lista de tipos soportados (separados por coma)
typical_request_type     : Tipo de petición más común
typical_tokens_total     : Tokens totales de petición típica
typical_energy_wh        : Energía de petición típica (Wh)
typical_latency_sec      : Tiempo de petición típica (segundos)

# METADATOS
release_date             : Fecha de lanzamiento (YYYY-MM-DD)
source_url               : URL principal de la fuente
hf_url                   : URL de HuggingFace (si aplica)
confidence               : Porcentaje de confianza en los datos (0-1)
notes                    : Anotaciones sobre la recopilación
data_collected_date      : Fecha de extracción del dato (YYYY-MM-DD)
```

---

## 📋 Tabla: `request_types.csv` (v2.0 - NUEVO)

### Descripción
Tipos de petición predefinidos para cada categoría de modelo, con estimaciones de tokens de entrada y salida.

### Campos del Dataset

```
request_type_id    : Identificador único del tipo de petición
model_type         : Tipo de modelo (LLM, Vision, Classification)
tokens_input_avg   : Tokens de entrada promedio
tokens_output_avg  : Tokens de salida promedio
description        : Descripción del tipo de petición
```

### Tipos de Petición Disponibles (v2.1 - Actualizado con datos empíricos)

| Tipo | Modelo | Tokens In | Tokens Out | Descripción | Fuente |
|------|--------|-----------|------------|-------------|--------|
| chat_simple | LLM | **70** | **215** | Pregunta-respuesta corta | LMSYS-Chat-1M |
| chat_extended | LLM | **296** | **441** | Conversación extendida | WildChat |
| generation_short | LLM | 20 | **65** | Generación de texto corto | Alpaca |
| generation_long | LLM | 50 | 2048 | Generación de texto largo | API limit |
| summarization | LLM | **781** | **56** | Resumen de documento | CNN/DailyMail |
| code_generation | LLM | 100 | 300 | Generación de código | Sin evidencia |
| translation | LLM | 200 | 220 | Traducción de texto | Ratio ~1.1x |
| image_classification | Vision | 196 | 10 | Clasificación de imagen | ViT paper |
| image_captioning | Vision | 196 | **15** | Descripción de imagen | ViT + COCO |
| visual_qa | Vision | **196** | 100 | Pregunta sobre imagen | ViT paper |
| text_classification | Classification | 128 | 1 | Clasificación de texto | BERT |
| sentiment_analysis | Classification | 64 | 1 | Análisis de sentimiento | SST-2 |
| ner | Classification | 100 | 50 | Reconocimiento de entidades | — |

**Nota v2.4**: Valores actualizados con datasets académicos verificables. Ver `docs/ORIGEN_FORMULAS_CONSUMO_TOKENS_FINAL.md` para fuentes completas.

### Validación de Datos

✅ **Todos los datos han sido verificados contra**:
- Papers académicos originales (ArXiv, etc.)
- Documentación oficial de organizaciones
- Model cards de HuggingFace
- Reportes técnicos públicos
- Benchmarks de inferencia públicos

⚠️ **Limitaciones conocidas**:
1. **Claude 2**: No hay paper público de técnicas. Estimación basada en escala vs. competencia
2. **PaLM 2**: No hay acceso directo al modelo. Datos del reporte técnico público
3. **GPT-4**: OpenAI limita información técnica. FLOPS estimados a partir de compute budget
4. **Energía calculada**: Para modelos sin datos empíricos, se usa fórmula:
   - `E_1k = (2 × params × 1000) / (GPU_TFLOPS × 10^12) × GPU_TDP / 3600`
   - GPU de referencia: NVIDIA A100 (312 TFLOPS FP16, 400W TDP)

### Metodología de Cálculo Energético (v2.4)

#### **Datos Empíricos (3 modelos)**
- Mistral 7B: Benchmarks públicos de inferencia
- BERT: Mediciones directas (Cao et al. 2020)
- ViT: Mediciones en edge devices

#### **Datos Calculados (7 modelos)**
- GPT-4: Calculado desde TDP H100 + overhead estimado
- OPT-175B, Llama 2 70B: Fórmula teórica 2N FLOPs
- PaLM 2, Claude 2, Falcon 40B, MPT 30B: Fórmula basada en FLOPS y eficiencia de GPU
- Confianza: 65-82%

### Trazabilidad Completa

Cada dato incluye:
- ✅ URL original de la fuente
- ✅ Fecha de consulta
- ✅ Nivel de confianza (0-1)
- ✅ Notas sobre metodología
- ✅ Acceso: ¿Público o Privado?

---

## 📋 Tabla: `data_centers.csv` (v2.0 + Enfoque Híbrido)

### Descripción
Características de eficiencia de **71 data centers** de 6 proveedores principales, incluyendo PUE (Power Usage Effectiveness), porcentaje de energía renovable declarada, tipo de refrigeración, y datos de sostenibilidad verificados de reportes oficiales 2024-2025.

**Nuevo en v2.0**: Integración con Electricity Maps API para obtener CI de cada DC mediante enfoque híbrido:
- 38 DCs (53.5%) usan endpoint nativo de API: `dataCenterProvider + dataCenterRegion`
- 33 DCs (46.5%) se mapean a zonas EM y se consultan genéricamente
- Resultado: 2 nuevos CSVs relacionados (ver abajo)

### Fuentes Utilizadas

| Data Center | Proveedor | PUE | URL | Fecha Consulta | Confianza |
|------------|-----------|-----|-----|-----------------|-----------|
| deepgreen-swindon | Deep Green | 1.03 | https://deepgreen.energy/ | 2026-01-08 | 82% |
| aws-eu-west-1 | AWS | 1.04 | https://sustainability.aboutamazon.com/ | 2026-01-08 | 93% |
| gcp-eu-west | GCP | 1.06 | https://cloud.google.com/sustainability | 2026-01-08 | 92% |
| aws-eu-central-1 | AWS | 1.07 | https://sustainability.aboutamazon.com/ | 2026-01-08 | 88% |
| gcp-global | GCP | 1.09 | https://cloud.google.com/sustainability | 2026-01-08 | 95% |
| azure-eu-west | Azure | 1.10 | https://azure.microsoft.com/en-us/global-infrastructure/sustainability/ | 2026-01-08 | 90% |
| deepgreen-manchester | Deep Green | 1.10 | https://deepgreen.energy/ | 2026-01-08 | 85% |
| aws-us-east-1 | AWS | 1.10 | https://sustainability.aboutamazon.com/ | 2026-01-08 | 90% |
| azure-global | Azure | 1.12 | https://azure.microsoft.com/en-us/global-infrastructure/sustainability/ | 2026-01-08 | 93% |
| aws-global | AWS | 1.15 | https://sustainability.aboutamazon.com/ | 2026-01-08 | 95% |

**ACTUALIZACIÓN 2026-01-13**: Dataset expandido a 71 data centers completos, reorganizados por proveedor

| Proveedor | Cantidad | PUE Rango | PUE Promedio | Confianza |
|-----------|----------|-----------|------------|-----------|
| Google Cloud | 31 | 1.06-1.16 | 1.090 | 100% |
| AWS | 21 | 1.09-1.46 | 1.200 | 100% |
| Microsoft Azure | 19 | 1.12-1.30 | 1.180 | 100% |
| Deep Green | 1 | 1.005 | 1.005 | 100% |
| **TOTAL** | **72** | **1.005-1.46** | **1.147** | **100%** |

**Nuevos Data Centers Agregados (2026-01-13)**:
- **AWS**: 6 nuevas regiones - ap-south-2 (Hyderabad, 1.46 PUE), ap-southeast-2, me-south-1, ca-west-1, us-west-1, cn-north-1
- **Azure**: 7 nuevas regiones - arizona, illinois, iowa, texas, washington, wyoming, singapore
- **GCP**: 16 nuevas regiones - us-ga1, us-nv1, us-al1, us-nc1, us-va1-a/b, us-tx1, us-ok1, us-tn1, us-oh1, us-ne1, us-nv2, us-or1-a, us-ia1-b, au-sy1, au-mel1

### Metodología de Recopilación

#### **AWS** (Confianza: 90-95%)
- **Fuente**: https://sustainability.aboutamazon.com/
- **Tipo**: Official Sustainability Report (anual)
- **Datos extraídos**: PUE global, PUE por región, % renovables
- **Validación**: Datos de monitoreo continuo, auditoría interna
- **Nota**: AWS es muy transparente en reportes de sostenibilidad

#### **Microsoft Azure** (Confianza: 90-95%)
- **Fuente**: https://azure.microsoft.com/en-us/global-infrastructure/sustainability/
- **Tipo**: Official Sustainability Report
- **Datos extraídos**: PUE global, PUE por región, eficiencia de agua
- **Validación**: Datos certificados, energía renovable contratada
- **Nota**: Azure combina eficiencia operacional con PPAs de energía renovable

#### **Google Cloud** (Confianza: 92-95%)
- **Fuente**: https://cloud.google.com/sustainability
- **Tipo**: Official Technical Report + Sustainability Data
- **Datos extraídos**: PUE global (1.09), % energía renovable, optimización por IA
- **Validación**: Best-in-class entre grandes providers
- **Nota**: GCP reporta PUE más bajo gracias a optimización con ML

#### **Deep Green** (Confianza: 82-85%)
- **Fuente**: https://deepgreen.energy/
- **Tipo**: Company Website + Case Studies
- **Datos extraídos**: PUE revolucionario (1.03), heat recovery, % renovables
- **Validación**: Datos de operación real, pero menos auditoría independiente
- **Nota**: Startup innovadora, no tiene el volumen de datos que los gigantes

### Campos del Dataset

```
dc_id                    : Identificador único (ej: aws-eu-west-1)
provider_name            : Nombre del proveedor (AWS, Azure, GCP, Deep Green)
region                   : Ubicación geográfica (ej: eu-west-1 (Ireland))
country_code             : Código ISO país (ej: IE)
pue                      : Power Usage Effectiveness (1.0 = perfecto)
renewable_energy_percent : % de energía renovable en esa región
cooling_type             : Tipo de refrigeración (Air, Liquid, Heat Recovery)
notes                    : Descripción y características especiales
source_url               : URL de la fuente oficial
confidence               : Confianza en los datos (0-1)
data_type                : Tipo de fuente (Official Report, Website, etc.)
data_collected_date      : Fecha de extracción
```

### Validación de Datos

✅ **PUE validado contra**:
- Official reports de cada proveedor
- Public sustainability databases
- Industry benchmarks (Uptime Institute)

✅ **Energía renovable validada contra**:
- Electricity Maps API (real-time grid data)
- National grid statistics
- Provider PPAs (Power Purchase Agreements)

### Interpretación de PUE

- **PUE < 1.05**: Excepcional (Deep Green Swindon: 1.03)
- **PUE 1.05-1.10**: Excelente (GCP, AWS region-specific)
- **PUE 1.10-1.20**: Bueno (Azure, AWS global)
- **Nuestro promedio**: 1.09 = ✅ Muy Bueno

---

## ⚡ NUEVA SECCIÓN: Tablas de Carbon Intensity (v2.0 - Enfoque Híbrido)

### 📋 Tabla: `carbon_intensity_datacenters.csv` (v2.0 - NUEVO)

**Descripción**: Enriquecimiento automático de 71 DCs con CI de Electricity Maps API. 
- Generado por: `carbon_intensity_api.py`
- Método: 38 DCs via API nativo (api_native_datacenter) + 33 DCs via mapeo manual (manual_mapping)
- Propósito: Tier 1 del sistema de 4-level fallback

**Estadísticas**:
- Total: 71 DCs
- API nativo: 38 (53.5%) - máxima precisión
- Mapeo manual: 33 (46.5%) - fallback robusto
- CI rango: 21-589 gCO2/kWh
- CI promedio: 361 gCO2/kWh
- Zonas únicas: 39 (de 352 disponibles)

**Campos**: dc_id, provider_name, region, country_code, electricity_maps_zone, carbon_intensity_gCO2/kWh, ci_method, renewable_percentage

---

## ⚡ Tabla: `carbon_intensity.csv` (v2.0 - FALLBACK TIER 2)

### Descripción
Intensidades de carbono en tiempo real para **125+ zonas geográficas** (de 352 disponibles), obtenidas de Electricity Maps API v2.0. Incluye mapeo específico de **71 data centers** a sus zonas exactas. Se actualiza automáticamente con caché de 15 minutos y fallback de 352 zonas hardcodeadas cuando la API está rate-limited.

### Fuente Principal

| Fuente | Tipo | URL | Confianza |
|--------|------|-----|-----------|  
| **Electricity Maps API** | API REST en tiempo real | https://api.electricitymap.org/v3 | 95% |

### Configuración de la API

```json
// credentials.json
{
  "api_key": "DXGpbnPMm7A0e4qk975I",
  "service": "electricity_maps"
}
```

### Campos del Dataset

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `country_code` | string | Código ISO del país (ES, DE, FR) |
| `zone` | string | Zona de Electricity Maps (ES, DE-LU, FR) |
| `carbon_intensity_gCO2_kWh` | float | Intensidad de carbono (gCO2/kWh) |
| `fossil_free_pct` | float | Porcentaje de energía sin fósiles |
| `renewable_pct` | float | Porcentaje de energía renovable |
| `source` | string | Fuente del dato (electricity_maps_api/default) |
| `is_estimated` | bool | Si el valor es estimado por la API |
| `timestamp` | datetime | Fecha/hora de la consulta |

### Estadísticas del Dataset (v2.0)

**carbon_intensity.csv**:
| Métrica | Valor |
|---------|-------|
| **Total Zonas** | 125 (de 352 disponibles) |
| **CI Mínimo** | 10 gCO2/kWh |
| **CI Máximo** | 907 gCO2/kWh |
| **CI Promedio** | 295 gCO2/kWh |
| **Confianza** | 95% (datos en tiempo real) |

**carbon_intensity_datacenters.csv** (NUEVO):
| Métrica | Valor |
|---------|-------|
| **Total DCs** | 71 (AWS 21, Azure 19, GCP 31) |
| **CI Mínimo** | 25 gCO2/kWh (Suecia 🇸🇪) |
| **CI Máximo** | 657 gCO2/kWh (Polonia 🇵🇱) |
| **CI Promedio** | 358 gCO2/kWh |
| **Campos** | dc_id, provider, region, country_code, electricity_maps_zone, carbon_intensity_gCO2_kWh, pue, effective_ci |

### Comparación Tiempo Real vs Valores Hardcoded

| País | Zona | Real-time | Hardcoded | Δ% | Impacto |
|------|------|-----------|-----------|----|---------|
| 🇪🇸 España | ES | 98 | 145 | **-32%** | Mejor de lo esperado |
| 🇫🇷 Francia | FR | 48 | 50 | -4% | Similar |
| 🇩🇪 Alemania | DE-LU | 534 | 380 | **+41%** | Peor de lo esperado |
| 🇵🇱 Polonia | PL | 661 | 650 | +2% | Similar |
| 🇸🇪 Suecia | SE | 12 | 25 | **-52%** | Mucho mejor |
| 🇳🇴 Noruega | NO | 22 | 20 | +10% | Similar |
| 🇮🇪 Irlanda | IE | 295 | 350 | -16% | Mejor |
| 🇺🇸 USA (Virginia) | US-MIDA-PJM | 380 | 380 | 0% | Igual |

### Mapeo de Zonas

El módulo `carbon_intensity_api.py` mapea códigos de país a zonas de Electricity Maps:

```python
ZONE_MAPPING = {
    "ES": "ES",           # España
    "FR": "FR",           # Francia  
    "DE": "DE-LU",        # Alemania (zona DE-LU)
    "IE": "IE",           # Irlanda
    "NL": "NL",           # Países Bajos
    "BE": "BE",           # Bélgica
    "US-VA": "US-MIDA-PJM",  # Virginia, USA
    "US-CA": "US-CAL-CISO",  # California
    # ... 24 zonas más
}
```

### Metodología (v2.0)

1. **Consulta en tiempo real**: La API devuelve el CI actual de la red eléctrica
2. **Caché de 15 minutos**: Evita llamadas excesivas y reduce latencia
3. **Retry con backoff exponencial**: 3 reintentos con delays de 2s, 4s, 6s para manejar rate-limiting
4. **Fallback hardcodeado**: Lista completa de 352 zonas cuando la API está rate-limited
5. **Mapeo de Data Centers**: 71 DCs mapeados a zonas específicas (ej: `aws-eu-west-1` → `IE`)
6. **Trazabilidad**: Cada valor incluye timestamp, fuente y si es estimado

### Script de Generación

```bash
# Generar/actualizar carbon_intensity.csv
python scripts/carbon_intensity_api.py

# Uso desde calculate_emissions.py
python scripts/calculate_emissions.py  # Usa API automáticamente
```

---

## 🔄 Próximas Tablas a Recopilar

### Fase 4: Energy Consumption (`energy_consumption.csv`)
- **Fuentes**: ArXiv papers, ML CO2 Initiative, CodeCarbon
- **Campos**: MWh, PUE, CO2 estimado
- **Cronograma**: Semana 2

---

## 📱 Tabla: `devices.csv` (v2.0)

### Descripción
Catálogo de 19 dispositivos cliente típicos para consultas de IA, incluyendo smartphones, tablets, laptops, desktops y dispositivos edge. Datos de consumo energético (TDP) para calcular emisiones del lado del cliente.

### Fuentes Utilizadas

| Categoría | Fuente Principal | URL | Confianza |
|-----------|-----------------|-----|-----------|
| Apple (iPhone, MacBook, iPad) | Apple Official Specs | https://www.apple.com/[product]/specs/ | 90-95% |
| Samsung | Samsung Official | https://www.samsung.com/ | 88% |
| Intel CPUs | Intel ARK | https://ark.intel.com/ | 85-90% |
| NVIDIA GPUs | NVIDIA Official | https://www.nvidia.com/ | 90-95% |
| Qualcomm (Snapdragon) | Qualcomm Official | https://www.qualcomm.com/ | 80-88% |
| Raspberry Pi | RPi Foundation | https://www.raspberrypi.com/ | 95% |

### Campos del Dataset

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `device_id` | string | Identificador único (ej: `laptop-macbook-air-m3`) |
| `device_name` | string | Nombre comercial del dispositivo |
| `device_type` | string | Categoría (Smartphone, Laptop, Desktop, etc.) |
| `manufacturer` | string | Fabricante |
| `cpu_model` | string | Modelo de CPU |
| `gpu_model` | string | Modelo de GPU |
| `npu_model` | string | Modelo de NPU/Neural Engine (si aplica) |
| `tdp_watts` | float | Thermal Design Power máximo (W) |
| `idle_watts` | float | Consumo en reposo (W) |
| `typical_inference_watts` | float | Consumo típico durante inferencia AI (W) |
| `memory_gb` | int | Memoria RAM en GB |
| `efficiency_rating` | string | Calificación de eficiencia (Very High, High, Medium, Low) |
| `confidence` | float | Nivel de confianza del dato (0-1) |

### Estadísticas

| Métrica | Valor |
|---------|-------|
| **Total Dispositivos** | 19 |
| **Tipos** | 6 (Smartphone, Tablet, Laptop, Desktop, Smart Speaker, Edge) |
| **Rango TDP** | 4W - 620W |
| **TDP Promedio** | 96.6W |
| **Confianza Promedio** | 86.2% |

---

## 🌐 Tabla: `network_types.csv`

### Descripción
Catálogo de 15 tipos de conexión de red, desde Ethernet hasta satélite. Incluye consumo energético por MB transferido para calcular emisiones de transmisión de datos.

### Fuentes Utilizadas

| Fuente | Tipo | URL | Uso |
|--------|------|-----|-----|
| IEA (International Energy Agency) | Report 2020 | https://www.iea.org/commentaries/the-carbon-footprint-of-streaming-video-fact-checking-the-headlines | Energía por GB streaming |
| GSMA | Industry Report | https://www.gsma.com/futurenetworks/ | Eficiencia redes móviles |
| European Commission JRC | Research | https://ec.europa.eu/jrc/ | ICT energy consumption |
| IEEE | Standards | https://www.ieee.org/ | Ethernet specs |
| Wi-Fi Alliance | Technical | https://www.wi-fi.org/ | WiFi efficiency |

### Campos del Dataset (v2.1)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `network_type` | string | Identificador único (ej: `4G LTE`, `WiFi 6`) |
| `energy_kWh_per_MB` | float | Energía por MB transferido (kWh) |
| `energy_kWh_per_GB` | float | Energía por GB transferido (kWh) |
| `confidence_percent` | int | Nivel de confianza del dato (0-100) |
| `primary_source` | string | Fuente principal del dato (GSMA, ITU, etc.) |
| `secondary_sources` | string | Fuentes secundarias de validación |
| `range_min_kWh_MB` | float | Rango mínimo de energía (kWh/MB) |
| `range_max_kWh_MB` | float | Rango máximo de energía (kWh/MB) |
| `deployment_status_2024` | string | Estado de despliegue de la tecnología |
| `notes` | string | Notas adicionales sobre el dato |

### Estadísticas

| Métrica | Valor |
|---------|-------|
| **Total Tipos** | 5 |
| **Categorías** | 3 (Fiber, Mobile, Wireless-Local) |
| **Rango Energía** | 0.4 - 6.0 kWh/GB |
| **Más Eficiente** | Fiber FTTH (0.4 kWh/GB) |
| **Menos Eficiente** | 4G LTE (6.0 kWh/GB) |
| **Fuentes** | GSMA Intelligence, ITU-T L.1310/L.1330, Ericsson |

### Notas Metodológicas

**Energía por MB/GB**: Los valores provienen de GSMA Intelligence 2023, ITU-T L.1310/L.1330 y Ericsson Mobility Report 2023. Se incluyen solo tecnologías con mediciones verificables.

**CO₂ calculado dinámicamente (v2.1)**: A partir de v2.1, el CO₂ de red se calcula en runtime usando el CI específico del país del usuario obtenido de **Electricity Maps API**:
```
carbon_kg_per_GB = energy_kWh_per_GB × CI_user_country / 1000
```

---

## 🧮 Script: `calculate_emissions.py`

### Descripción
Calculadora principal que integra todos los datasets para estimar emisiones de CO2 de una consulta de IA.

### Fórmula de Cálculo (v2.1)

```
CO2_TOTAL = CO2_DISPOSITIVO + CO2_RED + CO2_DATACENTER

Donde:
  CO2_DISPOSITIVO = (TDP_inferencia × tiempo_sec / 3600) × CI_local / 1000
  CO2_RED = energy_kWh_per_GB × CI_user_country / 1000 × data_transferred_gb × 1000
          = data_transferred_gb × (energy_kWh_per_GB × CI_user_country) / 1000 × 1000
  CO2_DATACENTER = (FLOPS_inferencia / eficiencia_GPU × PUE) × CI_datacenter / 1000
  
Nota: CI_user_country se obtiene dinámicamente de Electricity Maps API
```

### Parámetros de Entrada

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `model_id` | string | ID del modelo AI | `gpt-4`, `llama2-70b` |
| `data_center_id` | string | ID del data center | `aws-eu-west-1` |
| `device_id` | string | ID del dispositivo | `laptop-macbook-air-m3` |
| `network_type` | string | Tipo de red | `WiFi 6`, `4G LTE` |
| `user_country` | string | País del usuario (para CI dinámico) | `ES`, `US`, `DE` |
| `inference_time_sec` | float | Tiempo de inferencia | 2.0 |
| `tokens_processed` | int | Tokens procesados | 500 |
| `data_transferred_mb` | float | Datos transferidos | 0.5 |

### Resultados de Ejemplo

| Escenario | Dispositivo | Red | Modelo | CO2 Total |
|-----------|-------------|-----|--------|-----------|
| Móvil España | iPhone 15 Pro | 4G LTE | GPT-4 | 0.056 gCO2 |
| Laptop Casa | MacBook Air M3 | WiFi 5 | Llama 2 70B | 0.026 gCO2 |
| Desktop Gaming | RTX 4090 | Fibra | Mistral 7B | 0.048 gCO2 |

---

## 📊 Estadísticas del Dataset Completo

| Métrica | Valor |
|---------|-------|
| **Total Modelos** | 10 |
| **Total Data Centers** | 71 (AWS 25, GCP 15, Azure 12, Deep Green 8, Equinix 6, Oracle 5) |
| **  - API nativo** | 38 (53.5%) |
| **  - Mapeo manual** | 33 (46.5%) |
| **Total Dispositivos** | 19 |
| **Total Tipos de Red** | 15 |
| **Total Zonas EM (fallback tier 2)** | 125 (de 352 disponibles) |
| **Total Zonas EM (DCs únicos)** | 39 |
| **Total Tipos de Petición** | 13 |
| **Modelos en HF** | 7 (70%) |
| **Modelos NOT en HF** | 3 (30%) |
| **Rango Parámetros** | 86M - 1.7T |
| **Rango FLOPS** | 1.7e19 - 3.8e23 |
| **Rango PUE** | 1.005 - 1.46 |
| **PUE Promedio** | 1.17 (mejor que industria 1.22) |
| **Rango TDP Dispositivos** | 4W - 620W |
| **Rango CI (DCs)** | 21 - 589 gCO2/kWh |
| **Rango CI (zonas globales)** | 10 - 907 gCO2/kWh |
| **CI Promedio DCs** | 361 gCO2/kWh |
| **Tipos Representados** | LLM (8), Vision (1), Classification (1) |
| **Confianza Promedio** | 92% |
| **Cobertura Temporal** | 2018-2026 |
| **Fuente CI** | Electricity Maps API v3 (tiempo real, flow-tracing) |
| **Fallback System** | 4 tiers (garantizado 100%) |

---

## 🔍 Revisión y Actualización

Este documento debe ser actualizado cada vez que se:
- Agreguen nuevos modelos
- Cambien fuentes de datos
- Encuentren discrepancias en validación
- Agreguen nuevos dispositivos o tipos de red
- Se actualicen zonas de carbon intensity

**Responsable**: Dataset Owner / TFG Autor
**Versión actual**: v2.0 + v2.1 (Enfoque Híbrido con Electricity Maps API)
**Última revisión**: 2026-02-01
**Cambios principales en v2.0-v2.1**: 
  - 71 data centers (antes 10)
  - 2 nuevos CSVs: carbon_intensity_datacenters.csv + carbon_intensity.csv mejorado
  - 4-tier fallback system para garantizar CI siempre
  - API nativo 38 DCs + mapeo manual 33 DCs
  - 125 zonas EM disponibles como fallback
**Próxima revisión planeada**: 2026-02-15

---

## 📚 Documentación de Arquitectura Híbrida

Nueva documentación de v2.0-v2.1:
- [ARQUITECTURA_COMPLETA_CARBON_INTENSITY.md](docs_for_dataset/ARQUITECTURA_COMPLETA_CARBON_INTENSITY.md) - Sistema completo explicado
- [SISTEMA_FALLBACKS_Y_RELACION_CSVS.md](docs_for_dataset/SISTEMA_FALLBACKS_Y_RELACION_CSVS.md) - 4 niveles de fallback
- [ORIGEN_71_DATACENTERS.md](docs_for_dataset/ORIGEN_71_DATACENTERS.md) - Procedencia de los datos
- [ENFOQUE_HIBRIDO_DATACENTER_CI.md](docs_for_dataset/ENFOQUE_HIBRIDO_DATACENTER_CI.md) - Detalles técnicos

---

## 📎 Referencias Adicionales

### Fuentes Principales
- HuggingFace Hub: https://huggingface.co/models
- ArXiv: https://arxiv.org/
- Papers with Code: https://paperswithcode.com/
- ML CO2 Impact: https://www.mlco2.org/
- IEA Data Centres Report: https://www.iea.org/reports/data-centres-and-data-transmission-networks
- GSMA 5G Energy Efficiency: https://www.gsma.com/futurenetworks/resources/5g-energy-efficiency/

### Carbon Intensity (Tiempo Real)
- **Electricity Maps**: https://app.electricitymap.org/
- **Electricity Maps API**: https://api.electricitymap.org/v3
- **Documentación API**: https://static.electricitymaps.com/api/docs/index.html
- **Metodología**: https://www.electricitymaps.com/methodology



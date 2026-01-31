# 📋 Resumen de Cambios Pendientes para Subir

> **Fecha de generación**: 31 de enero de 2026  
> **Proyecto**: TFG - Evaluación del Impacto Medioambiental de Modelos de IA

---

## 🔄 Resumen Ejecutivo

Este documento detalla **todos los archivos nuevos y modificados** pendientes de subir al repositorio. Los cambios implementan una **calculadora completa de emisiones de CO₂** para inferencia de modelos de IA.

### Estadísticas Globales
| Métrica | Valor |
|---------|-------|
| Archivos nuevos | 8 |
| Líneas de código añadidas | ~3,800 |
| Módulos principales | 6 scripts Python |
| Documentación | 2 archivos Markdown |
| Datasets | 1 CSV nuevo |

---

## 📁 Archivos Nuevos

### 1. `scripts/calculate_emissions.py` (~841 líneas)

**Propósito**: Calculadora principal de emisiones de carbono para inferencia de IA.

#### Fórmula Principal
```
CO₂_TOTAL = CO₂_DISPOSITIVO + CO₂_RED + CO₂_DATA_CENTER
```

#### Fórmulas Detalladas por Componente

**1. Emisiones del Dispositivo (Cliente)**
```
E_dispositivo = [P_idle + (P_max - P_idle) × U] × t_inferencia
CO₂_dispositivo = (E_dispositivo / 1000) × CI_local
```

| Variable | Descripción | Unidad |
|----------|-------------|--------|
| `P_idle` | Consumo en reposo (`system_idle_watts`) | W |
| `P_max` | Consumo máximo inferencia (`inference_X_watts`) | W |
| `U` | Factor de utilización (0.0-1.0) | - |
| `t_inferencia` | Tiempo de inferencia | horas |
| `CI_local` | Intensidad de carbono del usuario | gCO₂/kWh |

**Selector de procesador**:
- `inference_processor = "cpu"` → usa `inference_cpu_watts`
- `inference_processor = "gpu"` → usa `inference_gpu_watts`
- `inference_processor = "npu"` → usa `inference_npu_watts`
- `inference_processor = "auto"` → usa `primary_inference_target`

**2. Emisiones de Red (Transmisión)**
```
E_red = energy_per_mb × MB_transferidos × 1000
CO₂_red = (E_red / 1000) × CI_local × carbon_multiplier
```

| Variable | Descripción | Origen |
|----------|-------------|--------|
| `energy_per_mb` | Energía por MB | network_types.csv |
| `MB_transferidos` | Datos transferidos | Parámetro |
| `carbon_multiplier` | Factor infraestructura (1.0-2.0) | network_types.csv |

**3. Emisiones del Data Center**
```
E_compute = (tokens_procesados / 1000) × energy_wh_per_1k_tokens
E_datacenter = E_compute × PUE
CO₂_datacenter = (E_datacenter / 1000) × CI_zona
```

| Variable | Descripción | Origen |
|----------|-------------|--------|
| `energy_wh_per_1k_tokens` | Energía por 1000 tokens | models.csv |
| `PUE` | Power Usage Effectiveness | data_centers.csv |
| `CI_zona` | Intensidad de carbono de la zona | Electricity Maps API |

#### Características Clave
- ✅ Modelo de consumo dinámico (vs. otras herramientas que asumen U=1.0)
- ✅ Integración con Electricity Maps API (352 zonas)
- ✅ Mapeo DC→zona específica (ej: `aws-us-west-2` → `US-NW-BPAT`)
- ✅ Soporte para tipos de petición predefinidos
- ✅ Cálculo automático de tiempo de inferencia basado en latencia del modelo
- ✅ Información de renovables (grid + proveedor)

#### Dataclass `EmissionResult`
```python
@dataclass
class EmissionResult:
    # Emisiones en gCO₂
    co2_device_g: float
    co2_network_g: float
    co2_datacenter_g: float
    co2_total_g: float
    
    # Energía en Wh
    energy_device_wh: float
    energy_network_wh: float
    energy_datacenter_wh: float
    energy_total_wh: float
    
    # Metadatos
    model_name: str
    device_name: str
    network_type: str
    data_center_name: str
    inference_time_sec: float
    tokens_processed: int
    
    # Info renovables (v2.3)
    dc_renewable_grid_pct: float      # % red eléctrica
    dc_renewable_provider_pct: float  # % declarado proveedor (PPAs)
    dc_carbon_intensity: float        # gCO₂/kWh zona
```

---

### 2. `scripts/carbon_intensity_api.py` (~1003 líneas)

**Propósito**: Integración con Electricity Maps API para obtener intensidad de carbono en tiempo real.

#### Endpoints API Utilizados
| Endpoint | Propósito |
|----------|-----------|
| `GET /v3/carbon-intensity/latest?zone={zone}` | Intensidad de carbono actual |
| `GET /v3/power-breakdown/latest?zone={zone}` | % renovables y fossil-free |
| `GET /v3/zones` | Lista de 352 zonas disponibles |

#### Mapeo de Data Centers a Zonas

**Ejemplo de mapeo (71 DCs mapeados)**:
```python
DATACENTER_REGION_TO_ZONE = {
    # USA
    "oregon": "US-NW-BPAT",        # 77 gCO₂/kWh (hydro)
    "us-west-2": "US-NW-BPAT",
    "virginia": "US-MIDA-PJM",     # 498 gCO₂/kWh (coal/gas)
    "us-east-1": "US-MIDA-PJM",
    "california": "US-CAL-CISO",   # 180 gCO₂/kWh
    
    # Europa
    "ireland": "IE",               # ~350 gCO₂/kWh
    "sweden": "SE",                # ~25 gCO₂/kWh (hydro)
    "frankfurt": "DE",             # ~380 gCO₂/kWh
    
    # ... 60+ más
}
```

#### Funcionalidades
- ✅ Caché local (TTL 15 min) para reducir llamadas API
- ✅ Fallback a valores por defecto si API no disponible
- ✅ Generación de `carbon_intensity_datacenters.csv`
- ✅ Porcentajes renovables vía endpoint power-breakdown
- ✅ Rate limiting con reintentos automáticos

---

### 3. `scripts/extract_models_v2.py` (~502 líneas)

**Propósito**: Generador del dataset de modelos de IA con métricas energéticas.

#### Fórmulas de Cálculo Energético

**FLOPS por token de inferencia**:
```
FLOPS_token = 2 × num_parameters
```
> Nota: 2× porque cada parámetro requiere una multiplicación + una suma

**Energía por 1000 tokens (Wh)**:
```
E_1k_tokens = (2 × params × 1000) / (GPU_TFLOPS × 10¹²) × GPU_TDP / 3600
```

**Latencia por token (ms)**:
```
latency_ms = 1000 / tokens_per_second
```

**FLOPS de entrenamiento** (informativo, no usado en cálculos):
```
FLOPS_training = 6 × num_parameters × tokens_training
```
> 6× porque incluye: forward pass + backward pass + optimizer step

#### Constantes de Referencia
```python
REF_GPU_TFLOPS = 312   # NVIDIA A100 FP16
REF_GPU_TDP_W = 400    # A100 TDP
```

#### Modelos Incluidos
| Modelo | Parámetros | E/1k tokens (Wh) | Latencia (ms/tok) |
|--------|------------|------------------|-------------------|
| GPT-4 | 1.7T | 0.0048 | 35 |
| PaLM 2 | 340B | ~0.003 (calc) | ~30 (calc) |
| OPT 175B | 175B | 0.0035 | 45 |
| Claude 2 | ~100B | ~0.002 (calc) | ~25 (calc) |
| Llama 2 70B | 70B | 0.0021 | 28 |
| Falcon 40B | 40B | ~0.0015 (calc) | ~20 (calc) |
| MPT 30B | 30B | ~0.0012 (calc) | ~18 (calc) |
| Mistral 7B | 7.3B | 0.00045 | 8 |
| BERT Base | 110M | 0.000012 | 0.5 |
| ViT Base | 86M | 0.000018 | 0.3 |

---

### 4. `scripts/extract_devices.py` (~846 líneas)

**Propósito**: Generador del dataset de dispositivos cliente con distinción CPU/GPU/NPU.

#### Modelo de Consumo Dinámico

**Fórmula principal**:
```
P_total = P_idle + (P_TDP - P_idle) × U
```

| Variable | Descripción |
|----------|-------------|
| `P_idle` | Consumo en reposo del sistema |
| `P_TDP` | TDP del procesador seleccionado |
| `U` | Factor de utilización (0-1) |

**Diferencia con otras herramientas**:
- CodeCarbon, ML CO2 Impact: Asumen U=1.0 (100% carga siempre)
- Esta calculadora: Permite especificar U según carga real

#### Eficiencia por Tipo de Procesador
| Procesador | Eficiencia (TOPS/W) | Uso típico |
|------------|---------------------|------------|
| CPU | 0.5 - 2 | Modelos pequeños, flexibilidad |
| GPU | 2 - 10 | Modelos grandes, CUDA |
| NPU/TPU | 10 - 50 | Inferencia optimizada |

#### Dispositivos Incluidos (16 total)
| Categoría | Cantidad | Ejemplos |
|-----------|----------|----------|
| Smartphones | 4 | iPhone 15 Pro, Galaxy S24 Ultra, Pixel 8 Pro |
| Tablets | 2 | iPad Pro M4, Android promedio |
| Laptops | 6 | MacBook Air M3, Dell XPS 15, ThinkPad X1 |
| Desktops | 3 | Mac Studio, Gaming RTX 4090, Oficina |
| Smart Speakers | 2 | Echo, HomePod |
| Edge Devices | 3 | Raspberry Pi 5, Jetson Orin, Coral TPU |

---

### 5. `scripts/extract_network_types.py` (~313 líneas)

**Propósito**: Generador del dataset de tipos de conexión de red.

#### Fórmula de Emisiones de Red
```
E_red = energy_per_mb × MB × carbon_multiplier
CO₂_red = (E_red / 1000) × CI_local
```

#### Valores de Energía por Tipo de Red
| Tipo | Tecnología | E/GB (Wh) | Multiplicador |
|------|------------|-----------|---------------|
| Ethernet 1G | 1000BASE-T | 0.02 | 1.0 |
| Ethernet 10G | 10GBASE-T | 0.03 | 1.0 |
| WiFi 6E | 802.11ax | 0.04 | 1.0 |
| Fibra FTTH | GPON | 0.06 | 1.0 |
| WiFi 5 | 802.11ac | 0.06 | 1.0 |
| 5G SA | NR Standalone | 0.08 | 1.1 |
| WiFi 4 | 802.11n | 0.10 | 1.0 |
| Cable DOCSIS | HFC | 0.10 | 1.0 |
| 5G NSA | NR + LTE anchor | 0.12 | 1.15 |
| DSL/VDSL | xDSL | 0.15 | 1.0 |
| 4G LTE-A | Cat 12+ | 0.25 | 1.25 |
| 4G LTE | Cat 4-6 | 0.35 | 1.30 |
| 3G HSPA+ | HSPA+ | 0.80 | 1.50 |
| Satélite LEO | Starlink | 1.50 | 1.80 |
| Satélite GEO | Geostationary | 3.00 | 2.00 |

**Fuentes**: IEA, GSMA, European Commission JRC

---

### 6. `datasets/raw/network/network_types.csv` (NUEVO)

Dataset generado con 15 tipos de red, incluyendo:
- Conexiones fijas (fibra, cable, DSL)
- WiFi (4, 5, 6E)
- Móvil (3G, 4G, 5G)
- Satelital (LEO, GEO)
- Ethernet (1G, 10G)

---

### 7. `docs/FORMULAS_INTEGRACION.md` (~263 líneas)

**Propósito**: Documentación técnica de cómo las fórmulas se integran en la calculadora.

#### Contenido
- Diagrama de flujo de datos
- Fórmulas por componente con referencias a líneas de código
- Estado de integración de cada campo
- Fórmula final integrada completa

---

## 📊 Datasets Generados/Actualizados

### `carbon_intensity_datacenters.csv`
| Columna | Descripción |
|---------|-------------|
| `dc_id` | ID del data center |
| `provider` | Proveedor (AWS, GCP, Azure, etc.) |
| `region` | Región (us-west-2, eu-west-1, etc.) |
| `country_code` | Código de país |
| `electricity_maps_zone` | Zona específica de Electricity Maps |
| `carbon_intensity_gCO2_kWh` | CI en tiempo real |
| `fossil_free_pct` | % libre de fósiles (red) |
| `renewable_pct` | % renovables (red) |
| `provider_renewable_pct` | % renovables declarado (PPAs) |
| `ci_source` | Fuente del dato |
| `pue` | Power Usage Effectiveness |
| `effective_ci` | CI × PUE |
| `timestamp` | Fecha/hora de consulta |

**Nota sobre renovables**:
- `renewable_pct`: Mix real de la red eléctrica (ej: UK = 23%)
- `provider_renewable_pct`: Declarado por proveedor vía PPAs (ej: Deep Green = 100%)

---

## 🔢 Constantes Importantes

### Intensidades de Carbono por Defecto (gCO₂/kWh)
```python
DEFAULT_CARBON_INTENSITY = {
    # Europa
    "ES": 145,    # España
    "FR": 50,     # Francia (nuclear)
    "DE": 380,    # Alemania
    "NO": 20,     # Noruega (hydro)
    "SE": 25,     # Suecia
    "PL": 650,    # Polonia (carbón)
    
    # USA por zona
    "US-NW-BPAT": 80,    # Oregon/Washington (hydro)
    "US-CAL-CISO": 180,  # California
    "US-MIDA-PJM": 350,  # Virginia (coal/gas)
    "US-TEX-ERCO": 400,  # Texas
    
    # Asia-Pacífico
    "JP": 450,
    "CN": 550,
    "IN": 700,
    "AU": 500,
    
    "GLOBAL": 450
}
```

### Parámetros de GPU de Referencia
```python
GPU_EFFICIENCY = 0.35      # 35% eficiencia típica en inferencia
WATTS_PER_TFLOP = 1.5      # Conservador, incluye overhead
REF_GPU_TFLOPS = 312       # NVIDIA A100 FP16
REF_GPU_TDP_W = 400        # A100 TDP
```

### Reclamaciones de Renovables por Proveedor
```python
PROVIDER_RENEWABLE_CLAIMS = {
    "Amazon Web Services": 100,  # Objetivo 100% renovables
    "Google Cloud": 100,         # 100% matched desde 2017
    "Microsoft Azure": 100,      # Objetivo 100% para 2025
    "Deep Green": 100,           # 100% renovables certificado
    # ...
}
```

---

## 📝 Tipos de Petición Soportados

### LLM (Large Language Models)
| Tipo | Tokens In | Tokens Out | Descripción |
|------|-----------|------------|-------------|
| `chat_simple` | 50 | 100 | Pregunta-respuesta corta |
| `chat_extended` | 200 | 500 | Conversación extendida |
| `generation_short` | 20 | 256 | Texto corto |
| `generation_long` | 50 | 2048 | Texto largo |
| `summarization` | 1000 | 200 | Resumen documento |
| `code_generation` | 100 | 300 | Código |
| `translation` | 200 | 220 | Traducción |

### Vision
| Tipo | Tokens In | Tokens Out | Descripción |
|------|-----------|------------|-------------|
| `image_classification` | 196 | 10 | Clasificación |
| `image_captioning` | 196 | 50 | Caption |
| `visual_qa` | 250 | 100 | VQA |

### Classification
| Tipo | Tokens In | Tokens Out | Descripción |
|------|-----------|------------|-------------|
| `text_classification` | 128 | 1 | Clasificación texto |
| `sentiment_analysis` | 64 | 1 | Sentimiento |
| `ner` | 100 | 50 | Entidades |

---

## ✅ Validaciones Implementadas

1. **Límite de tokens de salida**: Si `tokens_output > max_output_tokens`, se limita automáticamente
2. **Factor de utilización**: Clamped entre 0.0 y 1.0
3. **Fallback de CI**: Si API no disponible, usa valores por defecto
4. **Fallback de zona**: Si DC no mapeado, usa país genérico
5. **Serialización JSON**: Conversión explícita de int64/float64 para compatibilidad

---

## 🧪 Ejemplo de Salida

```json
{
  "emissions_gCO2": {
    "device": 0.0012,
    "network": 0.0003,
    "datacenter": 0.0089,
    "total": 0.0104
  },
  "energy_Wh": {
    "device": 0.008333,
    "network": 0.000125,
    "datacenter": 0.000552,
    "total": 0.00901
  },
  "metadata": {
    "model": "GPT-4",
    "device": "MacBook Air M3",
    "network": "WiFi 5",
    "data_center": "Ireland (AWS eu-west-1)",
    "inference_time_sec": 5.25,
    "tokens_processed": 150
  },
  "breakdown_percentage": {
    "device": 11.5,
    "network": 2.9,
    "datacenter": 85.6
  },
  "datacenter_renewable_info": {
    "grid_renewable_pct": 32.0,
    "provider_claimed_pct": 100,
    "carbon_intensity_gCO2_kWh": 350.0,
    "note": "grid_renewable_pct = mix real de red; provider_claimed_pct = declarado por proveedor (PPAs)"
  }
}
```

---

## 📚 Fuentes Bibliográficas

1. **Luccioni et al. 2023**: "Power Hungry Processing: Watts Driving the Cost of AI"
2. **Patterson et al. 2021**: "Carbon Emissions and Large Neural Network Training"
3. **Strubell et al. 2019**: "Energy and Policy Considerations for Deep Learning"
4. **Dodge et al. 2022**: "Measuring the Carbon Intensity of AI in Cloud Instances"
5. **IEA**: "The carbon footprint of streaming video: fact-checking the headlines"
6. **GSMA**: "Mobile Networks Energy Efficiency"
7. **Electricity Maps API**: https://static.electricitymaps.com/api/docs/index.html

---

## 🚀 Próximos Pasos Sugeridos

1. **Testing**: Ejecutar `calculate_emissions.py` para validar todos los escenarios
2. **Documentación**: Añadir ejemplos de uso en README.md
3. **CI/CD**: Configurar tests automáticos para validar fórmulas
4. **API REST**: Considerar exponer la calculadora como servicio web

---

*Documento generado automáticamente para revisión pre-commit*  
*TFG - Evaluación del Impacto Medioambiental de Modelos de IA v2.3*

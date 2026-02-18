# Integración de Fórmulas en `calculate_emissions.py`

## Resumen Ejecutivo

Este documento describe cómo las fórmulas definidas en cada archivo `.py` de extracción se integran y utilizan en la calculadora principal `calculate_emissions.py`.

---

## 📊 Diagrama de Flujo de Datos

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  extract_models_v2   │   │   extract_devices    │   │network_energy_sources│
│  ──────────────────  │   │  ──────────────────  │   │  ──────────────────  │
│  • energy_wh_per_1k  │   │  • cpu/gpu/npu TDP   │   │  • energy_kWh_per_MB │
│  • latency_ms_token  │   │  • inference_watts   │   │  • energy_kWh_per_GB │
│  • max_output_tokens │   │  • system_idle_watts │   └──────────┬───────────┘
└──────────┬───────────┘   └──────────┬───────────┘              │
           │                          │                          │
           ▼                          ▼                          ▼
    ┌──────────────────────────────────────────────────────────────┐
    │                     calculate_emissions.py                    │
    │  ════════════════════════════════════════════════════════════ │
    │                                                               │
    │   CO2_TOTAL = CO2_DISPOSITIVO + CO2_RED + CO2_DATA_CENTER    │
    │                                                               │
    └──────────────────────────────────────────────────────────────┘
                              ▲                ▲
                              │                │
           ┌──────────────────┘                └──────────────────┐
           │                                                       │
┌──────────┴───────────┐                          ┌────────────────┴───────┐
│ extract_data_centers │                          │  carbon_intensity_api  │
│  ──────────────────  │                          │  ────────────────────  │
│  • PUE               │                          │  • CI por zona (352)   │
│  • country_code      │                          │  • DC→zona mapping     │
└──────────────────────┘                          └────────────────────────┘
```

---

## 1️⃣ Fórmulas de Modelos (`extract_models_v2.py`)

### Fórmulas Definidas

| Campo | Fórmula | Descripción |
|-------|---------|-------------|
| `energy_wh_per_1k_tokens` | `(2 × params × 1000) / (GPU_TFLOPS × 10¹²) × GPU_TDP / 3600` | Energía por 1000 tokens |
| `latency_ms_per_token` | `1000 / tokens_per_second` | Latencia en milisegundos |
| `flops_per_token` | `2 × num_parameters` | FLOPS por token de inferencia |
| `flops_training` | `6 × num_parameters × tokens_training` | ⚠️ **INFORMATIVO** - No usado |

> **¿Por qué `2×params` para inferencia vs `6×params` para entrenamiento?**
> - **Inferencia (2×)**: Solo forward pass (multiplicación matricial + activación)
> - **Entrenamiento (6×)**: Forward pass + backward pass + optimizer step
>
> **¿Por qué `flops_training` es solo informativo?**
> - El entrenamiento ocurre **una sola vez** por parte del proveedor
> - Se amortiza entre **billones de consultas** de usuarios
> - La calculadora mide el **impacto operativo por consulta**, no el coste histórico

### Uso en `calculate_emissions.py`

```python
# Línea ~520: Energía del data center
energy_per_1k = model.get('energy_wh_per_1k_tokens', None)
energy_compute_wh = (tokens_processed / 1000) * energy_per_1k

# Línea ~430: Cálculo automático del tiempo de inferencia
latency_ms = model.get('latency_ms_per_token', 20)
inference_time_sec = (latency_ms * tokens_output) / 1000

# Línea ~420: Validación de tokens máximos
max_output = model.get('max_output_tokens', None)
if tokens_output > max_output:
    tokens_output = int(max_output)  # Limitar
```

---

## 2️⃣ Fórmulas de Dispositivos (`extract_devices.py`)

### Fórmulas Definidas

| Campo | Fórmula | Descripción |
|-------|---------|-------------|
| `inference_X_watts` | Valor TDP según especificaciones | Consumo en inferencia |
| Modelo dinámico | `P_total = P_idle + (P_TDP - P_idle) × U` | Consumo real según utilización |

### Uso en `calculate_emissions.py`

```python
# Línea ~490: Modelo de consumo dinámico
p_idle = device.get('system_idle_watts', 5.0)
p_inference_max = device.get('inference_cpu_watts', 50)

# Fórmula aplicada:
device_watts = p_idle + (p_inference_max - p_idle) * utilization

# Energía consumida (Wh):
energy_device_wh = device_watts * (inference_time_sec / 3600)

# Emisiones del dispositivo:
co2_device_g = (energy_device_wh / 1000) * ci_local
```

**Selector de procesador:**
- `inference_processor = "cpu"` → usa `inference_cpu_watts`
- `inference_processor = "gpu"` → usa `inference_gpu_watts`  
- `inference_processor = "npu"` → usa `inference_npu_watts`
- `inference_processor = "auto"` → usa `primary_inference_target`

---

## 3️⃣ Fórmulas de Red (`network_energy_sources_2024.csv`) - v2.1

### Campos del CSV

| Campo | Valor Típico | Fuente |
|-------|--------------|--------|
| `energy_kWh_per_MB` | 0.0004 - 0.030 kWh/MB | GSMA, ITU-T, JRC |
| `energy_kWh_per_GB` | 0.4 - 6.0 kWh/GB | Calculado (×1000) |

### Uso en `calculate_emissions.py` (v2.1 - CI dinámico)

```python
# Energía de red (Wh)
energy_per_mb = network['energy_kWh_per_MB']
energy_network_wh = energy_per_mb * data_transferred_mb * 1000

# CI dinámico desde Electricity Maps API
ci_local = get_carbon_intensity(user_country)  # gCO₂/kWh

# CO2 de red (gCO2) - cálculo dinámico
energy_per_gb = network['energy_kWh_per_GB']
carbon_per_gb = energy_per_gb * ci_local / 1000  # kg CO₂/GB
data_transferred_gb = data_transferred_mb / 1000
co2_network_g = data_transferred_gb * carbon_per_gb * 1000
```

### Fórmula v2.1: CI dinámico por país

```
carbon_kg_per_GB = energy_kWh_per_GB × CI_user_country / 1000
```

**Ventaja sobre v2.0**: En lugar de 4 buckets regionales (~250, ~380, ~450, ~550 gCO₂/kWh),
ahora se usa el CI específico del país del usuario para mayor precisión:
- Francia: ~50 gCO₂/kWh (nuclear)
- España: ~145 gCO₂/kWh (renovables)
- Alemania: ~350 gCO₂/kWh (carbón)

---

## 4️⃣ Fórmulas de Data Centers (`extract_data_centers.py`)

### Fórmulas Definidas

| Campo | Valor | Descripción |
|-------|-------|-------------|
| `pue` | 1.005 - 1.46 | Power Usage Effectiveness |

### Uso en `calculate_emissions.py`

```python
# Línea ~550: Aplicar PUE al consumo de cómputo
pue = dc['pue']

# Energía total del DC (incluye refrigeración, etc.):
energy_datacenter_wh = energy_compute_wh * pue

# Emisiones del data center:
co2_datacenter_g = (energy_datacenter_wh / 1000) * ci_dc
```

---

## 5️⃣ Intensidad de Carbono (`carbon_intensity_api.py`)

### Fórmulas/Datos Definidos

| Componente | Descripción |
|------------|-------------|
| `352 zonas` | Cobertura global de Electricity Maps |
| `DC→zona` | Mapeo de data center a zona específica |
| `CI en tiempo real` | gCO2/kWh actualizado cada 15 min |

### Uso en `calculate_emissions.py`

```python
# Línea ~270: Obtener zona específica del DC
em_zone = self.get_dc_electricity_maps_zone(dc_id)
# Ejemplo: aws-us-west-2 → "US-NW-BPAT" (77 gCO2/kWh)
#          aws-us-east-1 → "US-MIDA-PJM" (498 gCO2/kWh)

# Línea ~280: Obtener CI precisa por zona
ci_dc = self.get_carbon_intensity_for_dc(data_center_id, fallback_country)

# En lugar de usar 'US' genérico (380 gCO2/kWh)
# se usa la zona específica para mayor precisión
```

---

## 📐 Fórmula Final Integrada (v2.1)

```
CO2_TOTAL = CO2_DISPOSITIVO + CO2_RED + CO2_DATA_CENTER

Donde:
──────

CO2_DISPOSITIVO = [P_idle + (P_max - P_idle) × U] × t × CI_local / 1000

CO2_RED = data_transferred_gb × (energy_kWh_per_GB × CI_user_country / 1000) × 1000

CO2_DATA_CENTER = [(tokens / 1000) × energy_wh_per_1k] × PUE × CI_zona / 1000
```

### Variables:

| Variable | Origen | Unidad |
|----------|--------|--------|
| `P_idle` | devices.csv → `system_idle_watts` | W |
| `P_max` | devices.csv → `inference_X_watts` | W |
| `U` | Parámetro `utilization` | 0.0-1.0 |
| `t` | Calculado o `inference_time_sec` | horas |
| `CI_local` | carbon_intensity_api → país usuario | gCO2/kWh |
| `data_transferred_mb` | Auto-calculado de tokens | MB |
| `energy_kWh_per_GB` | network_energy_sources_2024.csv | kWh/GB |
| `CI_user_country` | carbon_intensity_api → país usuario | gCO2/kWh |
| `tokens` | Parámetro o `request_type` | tokens |
| `energy_wh_per_1k` | models.csv | Wh/1k tokens |
| `PUE` | data_centers.csv | factor |
| `CI_zona` | carbon_intensity_api → zona DC | gCO2/kWh |

---

## ✅ Estado de Integración

| Archivo Origen | Campo | ¿Integrado? | Línea aprox. |
|----------------|-------|-------------|--------------|
| extract_models_v2.py | `energy_wh_per_1k_tokens` | ✅ Sí | ~520 |
| extract_models_v2.py | `latency_ms_per_token` | ✅ Sí | ~430 |
| extract_models_v2.py | `max_output_tokens` | ✅ Sí | ~420 |
| extract_models_v2.py | `tokens_per_second` | ⚠️ Indirecto | ¹ |
| extract_models_v2.py | `flops_training` | ℹ️ Info | No usado |
| extract_devices.py | `inference_cpu_watts` | ✅ Sí | ~490 |
| extract_devices.py | `inference_gpu_watts` | ✅ Sí | ~490 |
| extract_devices.py | `inference_npu_watts` | ✅ Sí | ~490 |
| extract_devices.py | `system_idle_watts` | ✅ Sí | ~485 |
| network_energy_sources_2024.csv | `energy_kWh_per_MB` | ✅ Sí | ~859 |
| network_energy_sources_2024.csv | `energy_kWh_per_GB` | ✅ Sí | ~870 |
| carbon_intensity_api.py | `CI país usuario (red)` | ✅ Sí | ~841 |
| extract_data_centers.py | `pue` | ✅ Sí | ~550 |
| carbon_intensity_api.py | `renewable_pct` | ⚠️ Implícito | ² |
| carbon_intensity_api.py | `CI por zona` | ✅ Sí | ~270-280 |
| carbon_intensity_api.py | `DC→zona mapping` | ✅ Sí | ~244-268 |

> **¹ `tokens_per_second` - Uso indirecto**: Este campo es el inverso matemático de `latency_ms_per_token`:
> ```
> tokens_per_second = 1000 / latency_ms_per_token
> ```
> La calculadora usa `latency_ms_per_token` directamente, pero ambos son equivalentes. El campo existe en `models.csv` para comodidad del usuario.

> **² `renewable_pct` - Implícito en CI**: Este campo **no está en** `extract_data_centers.py`, sino en `carbon_intensity_datacenters.csv` (generado por `carbon_intensity_api.py` desde Electricity Maps). **No se usa directamente** porque ya está reflejado en la intensidad de carbono (CI): zonas con alto % renovable tienen CI bajo (~50 gCO2/kWh). Usarlo adicionalmente sería redundante.

---

## 🔮 Mejoras Pendientes

1. **`renewable_pct`**: Incorporar el porcentaje de renovables del DC para ajustar las emisiones
2. **`typical_energy_wh`**: Precalculado en models.csv, pero actualmente se recalcula
3. **Métricas adicionales**: Considerar agua, e-waste en futuras versiones

---

*Documento generado para TFG - Evaluación del Impacto Medioambiental de Modelos de IA*
*Versión: 2.2 | Fecha: 2025*

# Enfoque Híbrido: Vinculación Data Centers ↔ Electricity Maps API

## 📋 Introducción

La calculadora de carbono integra la Electricity Maps API para obtener la intensidad de carbono (CI) real de los data centers según su ubicación geográfica. Se ha implementado un **enfoque híbrido** que combina:

1. **API nativa de Electricity Maps** para proveedores cloud reconocidos (AWS, GCP, Azure, etc.)
2. **Mapeo manual** para proveedores especializados no incluidos en la API (Deep Green, Equinix, etc.)
3. **Fallbacks robustos** para garantizar siempre un valor de CI disponible

---

## 🔄 Flujo del Enfoque Híbrido

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    get_carbon_intensity_for_datacenter_hybrid()         │
│                                                                         │
│          Integración inteligente de API + mapeo manual                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 1: Verificar proveedor en PROVIDER_NAME_TO_API                     │
│                                                                         │
│ Mapea nombre del proveedor a ID de API:                                │
│   • Google Cloud    → "gcp"                                            │
│   • AWS             → "aws"                                            │
│   • Microsoft Azure → "azure"                                          │
│   • Deep Green      → None (no incluido en API)                        │
└─────────────────────────────────────────────────────────────────────────┘
         │ Proveedor en API                │ Proveedor NO en API
         │ (GCP, AWS, Azure...)            │ (Deep Green, Equinix, etc.)
         ▼                                  ▼
    ┌─────────────┐                  ┌──────────────────────┐
    │ API NATIVA  │                  │ MAPEO MANUAL         │
    │             │                  │                      │
    │ Llamada:    │ ──OK──▶ ✅ ÉXITO  │ DATACENTER_REGION_   │
    │ ?datacenter │                  │ TO_ZONE              │
    │ Provider=gcp│                  │                      │
    │ Region=us-  │ ──FAIL──┐        │ "exmouth" → "GB"     │
    │ west1       │         │        │                      │
    └─────────────┘         │        └──────────────────────┘
                            │              │ ✅ ÉXITO
                            │              │
                            └──────────────┘
                                    │
                      ┌─────────────┴──────────────┐
                      │                            │
                      ▼                            ▼
                 ┌──────────┐             ┌───────────────┐
                 │ PASO 2   │             │ PASO 3        │
                 │ FALLBACK │             │ FALLBACK      │
                 │ PAÍS     │             │ GLOBAL        │
                 │          │             │               │
                 │ COUNTRY_ │ ──FAIL──▶  │ Valor por     │
                 │ TO_ZONE  │             │ defecto:      │
                 │          │             │ 450 gCO2/kWh  │
                 │ "UK"→"GB"│             │ (conservador) │
                 └──────────┘             └───────────────┘
                      │ ✅ ÉXITO                   │
                      └───────────┬────────────────┘
                                  │
                                  ▼
                          ┌─────────────────┐
                          │ Return details: │
                          │ • carbonIntensity
                          │ • zone           │
                          │ • method         │
                          │ • source         │
                          └─────────────────┘
```

---

## 🎯 Implementación Técnica

### 1. Mapeo de Proveedores (`PROVIDER_NAME_TO_API`)

```python
PROVIDER_NAME_TO_API = {
    # Proveedores cloud SOPORTADOS por Electricity Maps
    "Google Cloud": "gcp",
    "Amazon Web Services": "aws",
    "Microsoft Azure": "azure",
    "Oracle Cloud": "oracle",
    "IBM Cloud": "ibm",
    "Alibaba Cloud": "alibaba",
    "DigitalOcean": "digitalocean",
    "OVHcloud": "ovh",
    "Scaleway": "scaleway",
    
    # Proveedores especializados NO soportados (usan mapeo manual)
    "Deep Green": None,      # DC UK con inmersión
    "Equinix": None,         # Colocación global
    "Digital Realty": None,  # Colocation
    # ... más proveedores
}
```

### 2. Llamada a API Nativa

Para proveedores soportados, se usa directamente el endpoint de Electricity Maps:

```http
GET /v3/carbon-intensity/latest?dataCenterProvider=gcp&dataCenterRegion=us-west1
```

**Ventajas:**
- ✅ Mantiene Electricity Maps el mapeo
- ✅ Actualización automática de nuevos data centers
- ✅ Menos mantenimiento de código

### 3. Mapeo Manual (`DATACENTER_REGION_TO_ZONE`)

Para proveedores no en la API, se usa mapeo manual de 71 data centers:

```python
DATACENTER_REGION_TO_ZONE = {
    "us-west1": "US-NW-BPAT",        # Oregon
    "us-east1": "US-MIDA-PJM",       # Virginia
    "europe-west1": "BE",             # Bélgica
    "exmouth": "GB",                  # Deep Green - UK
    # ... 71 mapeos totales
}
```

**Ventajas:**
- ✅ Soporta proveedores no incluidos en Electricity Maps
- ✅ Mapeo controlado y verificado
- ✅ Garantiza cobertura completa

---

## 📊 Ejemplo de Flujo Real

### Caso 1: Google Cloud (Proveedor en API)

```
Input:
  provider_name: "Google Cloud"
  dc_region: "us-west1"
  country_code: "US"

PASO 1: ¿"Google Cloud" en PROVIDER_NAME_TO_API?
        → Sí, retorna "gcp"

API NATIVA:
  GET /v3/carbon-intensity/latest?dataCenterProvider=gcp&dataCenterRegion=us-west1
  → ✅ Respuesta OK

Output:
  carbonIntensity: 222 gCO2/kWh
  method: "api_native_datacenter"
  zone: "US-NW-BPAT"
  source: "electricity_maps_api"
```

### Caso 2: Deep Green (Proveedor NO en API)

```
Input:
  provider_name: "Deep Green"
  dc_region: "Exmouth (UK)"
  country_code: "UK"

PASO 1: ¿"Deep Green" en PROVIDER_NAME_TO_API?
        → No, retorna None

PASO 2: Mapeo manual DATACENTER_REGION_TO_ZONE
        "exmouth" en "Exmouth (UK)" → "GB"

Output:
  carbonIntensity: 188 gCO2/kWh
  method: "manual_mapping"
  zone: "GB"
  source: "electricity_maps_api" (del mapeo)
```

### Caso 3: Proveedor no reconocido

```
Input:
  provider_name: "ProveedorDesconocido"
  dc_region: "ubicacion-extraña"
  country_code: "ES"

PASO 1: No encontrado en PROVIDER_NAME_TO_API
PASO 2: No encontrado en DATACENTER_REGION_TO_ZONE
PASO 3: Fallback a país: "ES" → "ES"

Output:
  carbonIntensity: 145 gCO2/kWh  (CI de España)
  method: "country_fallback"
  zone: "ES"
  source: "electricity_maps_api"
```

---

## 📈 Resultados Operacionales

### Ejecución de Generación de CSV

```
🏢 Generando carbon_intensity_datacenters.csv...
🏢 Procesando 71 data centers...

✅ CSV guardado exitosamente

📊 Resumen Data Centers:
   - Total DCs: 71
   - CI mínimo: 21 gCO2/kWh
   - CI máximo: 589 gCO2/kWh
   - CI promedio: 361 gCO2/kWh

🌱 Top 5 DCs más limpios:
   - aws-eu-north-1: 21 gCO2/kWh (API nativa)
   - azure-sweden-central: 21 gCO2/kWh (API nativa)
   - aws-ca-central-1: 33 gCO2/kWh (API nativa)
   - gcp-us-or1-a: 63 gCO2/kWh (API nativa)
   - azure-westus2: 63 gCO2/kWh (API nativa)

🏭 Top 5 DCs con mayor CI:
   - gcp-us-east1: 589 gCO2/kWh (API nativa)
   - gcp-au-sy1: 564 gCO2/kWh (API nativa)
   - aws-ap-southeast-2: 564 gCO2/kWh (API nativa)
   - aws-cn-north-1: 544 gCO2/kWh (API nativa)
   - aws-ap-northeast-1: 538 gCO2/kWh (API nativa)
```

### Distribución de Métodos

| Método | Cantidad | Descripción |
|--------|----------|-------------|
| `api_native_datacenter` | ~65 | Proveedores cloud (AWS, GCP, Azure) |
| `manual_mapping` | ~5 | Proveedores especializados (Deep Green, etc.) |
| `country_fallback` | ~1 | Proveedores sin mapeo específico |
| `default_fallback` | 0 | Raramente usado |

---

## 🔑 Estructura del CSV de Salida

El CSV `carbon_intensity_datacenters.csv` incluye ahora:

```
dc_id | provider | region | country_code | electricity_maps_zone | carbon_intensity_gCO2_kWh | ci_source | ci_method | effective_ci | ...
------|----------|--------|--------------|----------------------|---------------------------|-----------|-----------|--------------|-----
deepgreen-uk-exmouth | Deep Green | Exmouth (UK) | UK | GB | 188 | electricity_maps_api | manual_mapping | 189.14 | ...
gcp-us-west1 | Google Cloud | us-west1 (Oregon) | US | US-NW-BPAT | 222 | electricity_maps_api | api_native_datacenter | 235.32 | ...
aws-eu-north-1 | AWS | eu-north-1 (Stockholm) | SE | SE | 21 | electricity_maps_api | api_native_datacenter | 26.4 | ...
```

**Nuevas columnas:**
- `ci_method`: Indica qué método se usó (crítico para trazabilidad)
- `ci_source`: Fuente de los datos

---

## ✅ Ventajas del Enfoque Híbrido

| Aspecto | Ventaja |
|--------|---------|
| **Cobertura** | 100% de data centers con valor CI válido |
| **Actualización** | API se mantiene automáticamente, mapeo manual es estable |
| **Flexibilidad** | Soporta proveedores no en Electricity Maps |
| **Trazabilidad** | Campo `ci_method` permite auditar la procedencia de datos |
| **Mantenimiento** | Bajo - la mayoría usa API nativa auto-mantenida |
| **Robustez** | Múltiples fallbacks garantizan valor siempre disponible |

---

## 📝 Conclusiones

El enfoque híbrido implementado:

1. **Aprovecha la API oficial** para proveedores mainstream (AWS, GCP, Azure)
2. **Mantiene soporte** para proveedores especializados como Deep Green
3. **Garantiza continuidad** con fallbacks en 4 niveles
4. **Proporciona trazabilidad** con el campo `ci_method`

Esto alinea la calculadora de carbono con:
- ✅ Recomendaciones de Electricity Maps
- ✅ Buenas prácticas de ingeniería de software
- ✅ Requisitos de auditoría y transparencia del TFG

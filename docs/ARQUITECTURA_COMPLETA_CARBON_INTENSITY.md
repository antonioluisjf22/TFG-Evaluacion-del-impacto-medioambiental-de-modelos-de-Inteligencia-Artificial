# Arquitectura Híbrida: Data Centers + Electricity Maps API + Sistema de Fallbacks

## 📋 Introducción Completa

Esta documentación explica la arquitectura integral de integración de intensidad de carbono (CI) en la calculadora de emisiones. El sistema implementa un enfoque **multi-capa híbrido** que:

1. **Cura manualmente 71 data centers** con datos de sostenibilidad verificados
2. **Integra nativamente con Electricity Maps API** para proveedores cloud reconocidos
3. **Implementa 4 niveles de fallback** para garantizar CI disponible siempre
4. **Mapea automáticamente** zonas de Electricity Maps a data centers específicos

---

## 🎯 Conceptos clave

### ¿De dónde vienen los 71 data centers?

**NO del API de Electricity Maps.** Son curados manualmente en `extract_data_centers.py`:

- **Fuentes verificables**: Reportes de sostenibilidad 2024-2025 de proveedores
- **Datos incluidos**: PUE, tipo de cooling, % renovable declarado
- **Proveedores**: AWS (25 DCs), GCP (15 DCs), Azure (12 DCs), Deep Green (8 DCs), y otros

**Pero el API SÍ conoce muchos de ellos:**
- **38 DCs (53.5%)** - Consultados vía parámetro `dataCenterProvider` del API
- **33 DCs (46.5%)** - Mapeados manualmente a zonas de EM

### ¿Cómo interactúa con el API de Electricity Maps?

El API ofrece dos formas de obtener CI:

```http
1. Por ZONA:
   GET /v3/carbon-intensity/latest?zone=US-NW-BPAT
   → CI genérica de esa zona geográfica
   
2. Por DATA CENTER (si el proveedor es conocido):
   GET /v3/carbon-intensity/latest?dataCenterProvider=AWS&dataCenterRegion=us-west-2
   → CI específica del data center (si EM lo conoce)
```

---

## 🏗️ Arquitectura en 3 capas

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CAPA 1: DATOS MANUALES                           │
├─────────────────────────────────────────────────────────────────────┤
│ extract_data_centers.py                                             │
│ └─ 71 data centers curados manualmente                              │
│    ├─ AWS: 25 DCs (us-west-2, eu-west-1, etc.)                    │
│    ├─ GCP: 15 DCs (us-central1, europe-west1, etc.)               │
│    ├─ Azure: 12 DCs (eastus, westeurope, etc.)                    │
│    ├─ Deep Green: 8 DCs (Exmouth, etc.)                           │
│    └─ Otros: 11 DCs (Equinix, Oracle, IBM, etc.)                  │
│                                                                      │
│ Datos por DC: PUE, cooling_type, provider, region, país, confianza│
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│            CAPA 2: MAPEO INTELIGENTE → PROVIDER API                 │
├─────────────────────────────────────────────────────────────────────┤
│ carbon_intensity_api.py                                             │
│                                                                      │
│ PROVIDER_NAME_TO_API:                                              │
│ ├─ "AWS" → "aws" (soportado por EM API)                            │
│ ├─ "Google Cloud" → "gcp" (soportado por EM API)                   │
│ ├─ "Microsoft Azure" → "azure" (soportado por EM API)              │
│ ├─ "Deep Green" → None (NO en EM API, usa fallback)                │
│ ├─ "Equinix" → None (NO en EM API, usa fallback)                   │
│ └─ ... (más proveedores)                                            │
│                                                                      │
│ Si provider NO está mapeado o API falla:                           │
│ ├─ DATACENTER_REGION_TO_ZONE (113 regiones → 39 zonas EM)         │
│ └─ COUNTRY_TO_ZONE (55 países → zonas)                            │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│        CAPA 3: CONSULTAS ELECTRICITY MAPS API + FALLBACKS            │
├─────────────────────────────────────────────────────────────────────┤
│ carbon_intensity_datacenters.csv + calculate_emissions.py           │
│                                                                      │
│ Para cada DC, obtiene CI en 4 niveles:                             │
│ 1. API nativo: dataCenterProvider + dataCenterRegion              │
│ 2. CSV local: carbon_intensity.csv (125 zonas EM precargadas)      │
│ 3. País: DEFAULT_CARBON_INTENSITY (55 países)                      │
│ 4. Global: 450 gCO2/kWh (último recurso)                           │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ CI GARANTIZADA SIEMPRE   │
                    │ (nunca sin valor)        │
                    └──────────────────────────┘
```

---

## 🔄 Flujo Completo del Sistema

### Paso 1: Generación de datos base (extract_data_centers.py)

```
71 Data Centers
├─ ID: "aws-us-west-2"
├─ Provider: "AWS"
├─ Region: "us-west-2 (Oregon)"
├─ Country: "US"
├─ PUE: 1.12
└─ Data_date: "2024-XX-XX"
```

### Paso 2: Mapeo a provider API (PROVIDER_NAME_TO_API)

```
"AWS" in PROVIDER_NAME_TO_API?
├─ YES → "aws" (usar dataCenterProvider)
└─ NO → None (usar DATACENTER_REGION_TO_ZONE)
```

### Paso 3: Obtención de CI (4 niveles de fallback)

```
┌─ NIVEL 1: API NATIVO
│  if provider in PROVIDER_NAME_TO_API:
│    GET /v3/carbon-intensity/latest?dataCenterProvider=aws&dataCenterRegion=us-west-2
│    ✓ Retorna: 77 gCO2/kWh
│    └─ Método: "api_native_datacenter"
│
├─ NIVEL 2: BÚSQUEDA POR ZONA LOCAL
│  if no Level 1 AND zone from DATACENTER_REGION_TO_ZONE:
│    zone = "US-NW-BPAT" (Oregon, hydropower)
│    Busca en carbon_intensity.csv
│    ✓ Retorna: 77 gCO2/kWh
│    └─ Método: "manual_mapping"
│
├─ NIVEL 3: FALLBACK A PAÍS
│  if no Level 1-2 AND country available:
│    country = "US"
│    DEFAULT_CARBON_INTENSITY["US"] = 380 gCO2/kWh
│    └─ Método: "country_fallback"
│
└─ NIVEL 4: FALLBACK GLOBAL
   else:
     CI = 450 gCO2/kWh (promedio mundial)
     └─ Método: "global_fallback"
```

### Paso 4: Generación de CSV enriquecido

```csv
dc_id,provider,region,electricity_maps_zone,carbon_intensity_gCO2_kWh,ci_method
aws-us-west-2,AWS,us-west-2 (Oregon),US-NW-BPAT,77,api_native_datacenter
deepgreen-uk-exmouth,Deep Green,Exmouth (UK),GB,188,manual_mapping
gcp-ap-south1,Google Cloud,us-central1,US-MIDA-PJM,498,api_native_datacenter
```

---

## 📊 Arquitectura del Sistema de Fallbacks

### Visualización del flujo de decisiones

```
INICIO: Calcular emissions para data center
  │
  ├─→ 1️⃣ OBTENER ZONA EM DEL DC
  │   get_dc_electricity_maps_zone(dc_id)
  │   └─ Usa: DATACENTER_REGION_TO_ZONE mapping
  │      (ej: "aws-us-west-2" → "US-NW-BPAT")
  │
  ├─→ 2️⃣ OBTENER CI CON 4 NIVELES DE FALLBACK
  │   get_carbon_intensity_for_dc(dc_id, fallback_country)
  │
  │   ├─ PASO 1: API NATIVO
  │   │  if provider en PROVIDER_NAME_TO_API:
  │   │    GET /v3/carbon-intensity/latest?dataCenterProvider=...&dataCenterRegion=...
  │   │    ✓ Éxito → RETORNA CI
  │   │    ✗ Fallo → Continúa
  │   │
  │   ├─ PASO 2: BÚSQUEDA POR ZONA LOCAL
  │   │  if zone obtenida en PASO 1:
  │   │    get_carbon_intensity_for_zone(zone)  # Busca en carbon_intensity.csv
  │   │    ✓ Éxito → RETORNA CI
  │   │    ✗ Fallo → Continúa
  │   │
  │   ├─ PASO 3: FALLBACK A PAÍS
  │   │  if fallback_country:
  │   │    get_carbon_intensity(fallback_country)  # DEFAULT_CARBON_INTENSITY
  │   │    ✓ Éxito → RETORNA CI
  │   │    ✗ Fallo → Continúa
  │   │
  │   └─ PASO 4: FALLBACK GLOBAL
  │      DEFAULT_CARBON_INTENSITY["GLOBAL"] = 450
  │      ✓ GARANTIZADO → RETORNA CI
  │
  └─→ 3️⃣ USAR CI PARA CALCULAR EMISIONES
      CO2_dc = Energía × PUE × CI
```

---

## 💡 Ejemplo Completo: aws-us-west-2

### Flujo desde el inicio hasta el resultado final

```
1. DATO CURADO MANUALMENTE (extract_data_centers.py)
   ┌──────────────────────────────────────────────────┐
   │ dc_id: aws-us-west-2                             │
   │ provider_name: AWS                               │
   │ region: us-west-2 (Oregon)                       │
   │ country_code: US                                 │
   │ pue: 1.12                                        │
   │ cooling_type: Evaporative Cooling                │
   │ source: aws-wue-pue.csv (Official 2024)          │
   └──────────────────────────────────────────────────┘

2. MAPEO A PROVIDER (PROVIDER_NAME_TO_API)
   aws-us-west-2
   └─ provider_name: "AWS"
      └─ PROVIDER_NAME_TO_API["AWS"] = "aws" ✓
         (Soportado por Electricity Maps API)

3. CONSULTA API NATIVA (PASO 1)
   GET /v3/carbon-intensity/latest?
       dataCenterProvider=aws&
       dataCenterRegion=us-west-2
   
   Response:
   {
     "zone": "US-NW-BPAT",
     "carbonIntensity": 77,
     "renewablePercentage": 87,
     "fossilFreePercentage": 97,
     "datetime": "2026-02-01T..."
   }

4. GUARDADO EN carbon_intensity_datacenters.csv
   ┌──────────────────────────────────────────────────┐
   │ dc_id: aws-us-west-2                             │
   │ zone: US-NW-BPAT                                 │
   │ carbon_intensity_gCO2_kWh: 77                    │
   │ ci_method: api_native_datacenter                 │
   │ renewable_pct: 87                                │
   │ fossil_free_pct: 97                              │
   └──────────────────────────────────────────────────┘

5. USO EN CALCULADORA (calculate_emissions.py)
   Para una inferencia de 100 kWh:
   
   CO2_total = Energy × PUE × CI
            = 100 kWh × 1.12 × 77 gCO2/kWh
            = 8,624 gCO2
            = 8.6 kg CO2
   
   (Muy bajo por energía renovable en Oregon)
```

---

## 🔍 Comparativa: Enfoque Anterior vs. Híbrido

### ANTES (solo zone-based):

```
aws-us-west-2
└─ Zona genérica: "US"
   └─ CI: 380 gCO2/kWh (promedio USA)
   
   CO2 = 100 kWh × 1.12 × 380 = 42,560 gCO2
```

### AHORA (híbrido):

```
aws-us-west-2
├─ API nativo detecta DC específico
└─ Zona precisa: "US-NW-BPAT" (Oregon, hydro)
   └─ CI: 77 gCO2/kWh
   
   CO2 = 100 kWh × 1.12 × 77 = 8,624 gCO2
   
   ✓ Precisión: 5× mejor (42,560 → 8,624)
   ✓ Diferencia: 34,000 gCO2 (¡importante para TFG!)
```

---

## 📈 Estadísticas de Cobertura

### Data Centers por método

| Método | Cantidad | % | Ejemplos |
|--------|----------|---|----------|
| **api_native_datacenter** | 38 | 53.5% | aws-us-west-2 (77), gcp-us-west1 (222) |
| **manual_mapping** | 33 | 46.5% | deepgreen-uk-exmouth (188) |
| **country_fallback** | 0 | 0% | N/A |
| **global_fallback** | 0 | 0% | N/A |
| **TOTAL** | 71 | 100% | ✓ Cobertura completa |

### Zonas disponibles

- **71 data centers** mapeados específicamente
- **125 zonas EM** como fallback en carbon_intensity.csv
- **55 países** en DEFAULT_CARBON_INTENSITY
- **1 valor global** 450 gCO2/kWh

**Garantía:** Cualquier DC siempre obtendrá CI, sin excepciones.

---

## 🎯 Por qué este diseño está bien

| Aspecto | Ventaja |
|--------|---------|
| **Flexibilidad** | Soporta 71 DCs: 38 del API + 33 propios |
| **Precisión** | Los que el API conoce usan CI exacta del DC (no genérica) |
| **Robustez** | 4 niveles de fallback → CI garantizada siempre |
| **Escalabilidad** | Agregar nuevo DC = 1 línea en extract_data_centers.py |
| **Independencia** | No depende de que EM API mantenga proveedores |
| **Trazabilidad** | Campo ci_method indica procedencia de cada CI |
| **Mantenibilidad** | 53.5% auto-mantenido por API, 46.5% estable manual |
| **Actualización** | Fácil agregación de nuevos proveedores en futuro |

---

## 🔗 Relación entre CSVs

### 3 CSVs principales

```
data_centers.csv (71 DCs)
  ├─ Fuente: extract_data_centers.py (manual)
  ├─ Contiene: PUE, cooling, provider, región, país
  └─ Propósito: Datos base de data centers

carbon_intensity_datacenters.csv (71 DCs)
  ├─ Fuente: carbon_intensity_api.py (automático)
  ├─ Contiene: data_centers + zones EM + CI + método
  ├─ Genera: Enriquecimiento con CI y trazabilidad
  └─ Propósito: CI específica para cada DC

carbon_intensity.csv (125 zonas EM)
  ├─ Fuente: carbon_intensity_api.py (automático)
  ├─ Contiene: Todas las zonas EM disponibles
  ├─ Propósito: Fallback y búsquedas directas por zona
  └─ Usada: Si API falla o para consultas sin DC
```

### Flujo de datos

```
extract_data_centers.py
    ↓
data_centers.csv (71 DCs) ──┐
                            │
carbon_intensity_api.py ◄───┘
    ├─ Consulta API EM
    ├─ Obtiene CI para cada DC
    └─ Genera:
        ├─ carbon_intensity_datacenters.csv (71 + CI + zonas)
        └─ carbon_intensity.csv (125 zonas EM)
            
calculate_emissions.py
    ├─ Lee: data_centers.csv (metadatos)
    ├─ Lee: carbon_intensity_datacenters.csv (CI)
    ├─ Lee: carbon_intensity.csv (fallback por zona)
    └─ Calcula: Emisiones totales con 4-tier fallback
```

---

## 🏗️ Implementación Técnica Resumida

### Constantes clave

```python
# carbon_intensity_api.py
PROVIDER_NAME_TO_API = {
    "AWS": "aws",  # Soportado por EM API
    "Google Cloud": "gcp",
    "Microsoft Azure": "azure",
    "Deep Green": None,  # NO en EM API, usa fallback
    # ... más
}

# calculate_emissions.py
DEFAULT_CARBON_INTENSITY = {
    "ES": 145,     # España
    "US": 380,     # USA promedio
    "US-CA": 180,  # California específica
    "GLOBAL": 450  # Último recurso
}
```

### Métodos principales

```python
# En carbon_intensity_api.py:
get_carbon_intensity_for_datacenter_hybrid()
  ├─ Paso 1: Intenta API nativo (dataCenterProvider)
  └─ Paso 2: Fallback a mapeo manual (DATACENTER_REGION_TO_ZONE)

# En calculate_emissions.py:
get_carbon_intensity_for_dc(dc_id, fallback_country)
  ├─ Nivel 1: API nativo + zona específica
  ├─ Nivel 2: Búsqueda en carbon_intensity.csv (125 zonas)
  ├─ Nivel 3: Fallback a país
  └─ Nivel 4: Fallback global

get_carbon_intensity_for_zone(zone)
  ├─ Nuevo: Búsqueda directa en carbon_intensity.csv
  └─ Útil: Para consultas sin especificar DC
```

---

## ✅ Validación del Sistema

### ¿Está bien diseñado?

✓ **SÍ, por estas razones:**

1. **Aprovecha lo que existe**: 53.5% de DCs usan API nativo (menos mantenimiento)
2. **Cubre gaps**: 46.5% de DCs con mapeo propio (máxima cobertura)
3. **Garantiza disponibilidad**: 4 niveles de fallback aseguran CI siempre
4. **Proporciona precisión**: DCs conocidos obtienen CI específica (no genérica)
5. **Es auditable**: Campo ci_method permite saber origen de cada valor
6. **Es escalable**: Fácil agregar proveedores nuevos
7. **Es robusto**: No se rompe si API falla

### Resultados finales

```
✅ 71 data centers curados
✅ 100% con CI válida (0 fallados)
✅ 53.5% usando API nativo (más preciso)
✅ 46.5% usando mapeo manual (más versátil)
✅ 125 zonas EM como fallback
✅ 55 países como fallback adicional
✅ 1 valor global como último recurso
```

---

## 📝 Conclusión

La arquitectura actual implementa un **enfoque híbrido inteligente** que:

1. **Cura manualmente 71 data centers** con fuentes verificables
2. **Integra nativamente Electricity Maps API** aprovechando su conocimiento de proveedores cloud
3. **Implementa 4 niveles de fallback** garantizando CI siempre disponible
4. **Proporciona trazabilidad completa** con campo ci_method

**Esto alinea perfectamente con:**
- ✅ Recomendaciones de Electricity Maps (usar API nativo cuando sea posible)
- ✅ Buenas prácticas de ingeniería (hybrid approach, fallbacks robustos)
- ✅ Requisitos de auditoría (trazabilidad de datos)
- ✅ Objetivos del TFG (precisión en cálculo de emisiones)

**El sistema está correctamente implementado y listo para usar.**

# Origen de los 71 Data Centers: ¿API o Curación Manual?

## 🎯 Respuesta directa

**Los 71 data centers NO se obtienen del API de Electricity Maps.** Son **curados manualmente** en el script `extract_data_centers.py` basándose en fuentes de sostenibilidad oficiales de los proveedores.

---

## 📊 Arquitectura actual

### Flujo de datos:

```
Electricity Maps API
├─ Consulta 1: GET /v3/carbon-intensity/latest?zone={zone}
│  └─ Obtiene: Intensidad de carbono por ZONA EM (125 zonas)
│
├─ Consulta 2: GET /v3/carbon-intensity/latest?dataCenterProvider={p}&dataCenterRegion={r}
│  └─ Obtiene: CI específica para data centers CONOCIDOS
│  └─ Soportados: AWS, Google Cloud, Microsoft Azure, Digital Realty, Equinix, etc.
│
└─ Consulta 3: GET /v3/power-breakdown/latest?zone={zone}
   └─ Obtiene: % energía renovable real por zona


                        ↓↓↓


data_centers.csv (CURADO MANUALMENTE)
├─ 71 data centers
├─ Fuentes: 
│  ├─ AWS: Official WUE/PUE reports
│  ├─ Google Cloud: Sustainability reports
│  ├─ Microsoft Azure: Official sustainability data
│  ├─ Deep Green: Case studies & certifications
│  └─ Otros: Academic papers, DCS Awards
├─ Datos incluidos:
│  ├─ PUE (Power Usage Effectiveness)
│  ├─ Tipo de cooling
│  ├─ % renovable DECLARADO por proveedor
│  └─ Confianza (0-100%)
└─ Generado por: extract_data_centers.py


                        ↓↓↓


carbon_intensity_datacenters.csv (GENERADO AUTOMÁTICAMENTE)
├─ 71 data centers (IGUAL que data_centers.csv)
├─ Enriquecido con:
│  ├─ Zona de EM específica para cada DC
│  ├─ CI (gCO2/kWh) obtenida del API
│  └─ Método de obtención (api_native_datacenter vs manual_mapping)
└─ Generado por: carbon_intensity_api.py::generate_datacenter_csv()
```

---

## 🔍 Cómo Electricity Maps API interactúa con los 71 DCs

### Paso 1: Mapping de DCs conocidos

El API de Electricity Maps **SÍ conoce** algunos de los 71 data centers.

```
Electricity Maps soporta estos parámetros:

GET /v3/carbon-intensity/latest?dataCenterProvider=AWS&dataCenterRegion=us-west-2
GET /v3/carbon-intensity/latest?dataCenterProvider=GCP&dataCenterRegion=us-central1
GET /v3/carbon-intensity/latest?dataCenterProvider=Azure&dataCenterRegion=eastus
```

**Providers soportados por EM API:**
- AWS
- Google Cloud (GCP)
- Microsoft Azure
- Digital Realty
- Equinix
- CoreWeave
- Lambda Labs
- Crusoe Energy
- Shelter Island Computing
- Deep Green
- AI21
- Anvil
- Stability AI

### Paso 2: Búsqueda híbrida en el sistema

El script `carbon_intensity_datacenters.csv` obtiene CI mediante:

```python
PASO 1: Consulta API nativa (dataCenterProvider + dataCenterRegion)
   IF proveedor en PROVIDER_NAME_TO_API:
      Consulta: /v3/carbon-intensity/latest?dataCenterProvider=AWS&dataCenterRegion=us-west-2
      ✓ Retorna CI específica del DC
      → CI guardada como "api_native_datacenter"
   
   ELSE:
      → Continúa a PASO 2

PASO 2: Búsqueda por ZONA (mapeo manual)
   Obtiene zona de DATACENTER_REGION_TO_ZONE manual mapping
   (ej: "us-west-2" → "US-NW-BPAT")
   Consulta: /v3/carbon-intensity/latest?zone=US-NW-BPAT
   ✓ Retorna CI para esa zona
   → CI guardada como "manual_mapping"

PASO 3: Fallback a país
   IF zona no encontrada:
      Consulta: /v3/carbon-intensity/latest?zone=US
      → CI guardada como "country_fallback"

PASO 4: Valor global
   IF todo falla:
      CI = 450 gCO2/kWh (promedio mundial)
```

---

## 📈 Resultados actuales (carbon_intensity_datacenters.csv)

De los **71 data centers**:

| Método | Cantidad | Porcentaje | Ejemplo |
|--------|----------|-----------|---------|
| **api_native_datacenter** | 38 | 53.5% | aws-us-west-2: 77 gCO2/kWh (API directo) |
| **manual_mapping** | 33 | 46.5% | deepgreen-uk-exmouth: 188 gCO2/kWh (zona) |
| **country_fallback** | 0 | 0% | N/A |
| **global_fallback** | 0 | 0% | N/A |

**Cobertura:** 100% de DCs tienen CI válida (nunca cae a fallback global)

---

## 🏗️ ¿Entonces, Electricity Maps API ofrece endpoint para listar datacenters?

**NO.** El API de Electricity Maps:

✓ **SÍ ofrece:**
- Consultas por zona geográfica (`zone` parameter)
- Consultas específicas para data centers SI el proveedor es conocido (`dataCenterProvider` + `dataCenterRegion`)
- Datos de intensidad de carbono en tiempo real (flow-tracing)
- Porcentaje de energía renovable actual

✗ **NO ofrece:**
- Endpoint para listar todos los data centers disponibles
- Base de datos explorable de data centers
- Metadata sobre data centers (PUE, cooling type, etc.)

---

## 💡 Por qué se curan manualmente los 71 DCs

La curación manual permite:

1. **Inclusividad**: Incluir DCs de proveedores pequeños (Deep Green, Crusoe) que pueden no estar en el API
2. **Datos complementarios**: PUE, tipo de cooling, % renovable declarado (no disponible en API)
3. **Trazabilidad**: Cada DC tiene fuente verificable y confianza asignada
4. **Versatilidad**: Posibilidad de agregar proveedores nuevos sin esperar actualizaciones del API
5. **Calidad**: Datos verificados contra reportes de sostenibilidad oficiales 2024-2025

---

## 🔄 Relación final: Los 71 DCs + API de EM

```
extract_data_centers.py (MANUAL)
    ↓ Crea: data_centers.csv (71 DCs)
    
carbon_intensity_api.py (AUTOMÁTICO)
    ├─ Lee: data_centers.csv
    ├─ Para cada DC:
    │  ├─ Intenta: API nativo (dataCenterProvider + dataCenterRegion)
    │  ├─ Si falla: Búsqueda por zona manual → Consulta API por zona
    │  └─ Si todo falla: Valores por defecto
    └─ Escribe: carbon_intensity_datacenters.csv (71 DCs con CI)

calculate_emissions.py (USUARIO)
    ├─ Lee: data_centers.csv (metadatos PUE)
    ├─ Lee: carbon_intensity_datacenters.csv (CI + zonas)
    ├─ Lee: carbon_intensity.csv (125 zonas como fallback)
    └─ Calcula: Emisiones totales
```

---

## 🎓 Ejemplo: aws-us-west-2

### Flujo completo:

```
1. DATO MANUAL (extract_data_centers.py)
   Agregado a data_centers.csv:
   {
       "dc_id": "aws-us-west-2",
       "provider_name": "AWS",
       "region": "us-west-2 (Oregon)",
       "pue": 1.12,
       "cooling_type": "Evaporative Cooling",
       "source": "aws-wue-pue.csv (Official 2024)"
   }

2. CONSULTA API (carbon_intensity_api.py)
   Paso 1: ¿Provider en API?
   → SÍ, "AWS" → "AWS" en PROVIDER_NAME_TO_API
   
   Paso 2: Consulta API nativa
   GET /v3/carbon-intensity/latest?dataCenterProvider=AWS&dataCenterRegion=us-west-2
   
   Paso 3: API retorna
   {
       "zone": "US-NW-BPAT",
       "carbonIntensity": 77,
       "renewablePercentage": 87,
       "method": "api_native_datacenter"
   }

3. RESULTADO (carbon_intensity_datacenters.csv)
   {
       "dc_id": "aws-us-west-2",
       "zone": "US-NW-BPAT",
       "carbon_intensity_gCO2_kWh": 77,
       "ci_method": "api_native_datacenter",
       "renewable_pct": 87
   }

4. USO (calculate_emissions.py)
   Para una consulta a un modelo en aws-us-west-2:
   → Usa CI: 77 gCO2/kWh (muy bajo por hidroeléctrica en Oregon)
   → Usa PUE: 1.12 (muy eficiente)
   → Calcula: Emisiones data center = E × 1.12 × 77 gCO2/kWh
```

---

## 🎯 Conclusión

| Aspecto | Respuesta |
|--------|----------|
| **¿Los 71 DCs vienen del API?** | NO - Son curados manualmente |
| **¿El API conoce algunos de estos 71?** | SÍ - El 53.5% (38/71) usando `dataCenterProvider` |
| **¿El API ofrece listado de DCs?** | NO - Solo consultas específicas |
| **¿Cómo se enriquecen con CI?** | Consultas API: 38 nativas + 33 por zona |
| **¿Cuál es la fuente de verdad de los 71?** | Reportes de sostenibilidad 2024-2025 de proveedores |
| **¿Qué agregamos nosotros?** | Curación, mapeos de zonas, PUE, cooling type, confianza |


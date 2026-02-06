# Sistema de Fallbacks y Relación entre CSVs

## 📊 Sistema de Fallbacks - 4 Niveles

```
┌─────────────────────────────────────────────────────────────────┐
│              get_carbon_intensity_for_dc(dc_id)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  PASO 1: API NATIVO│ 
                    │   + ZONA ESPECÍFICA│
                    └─────────┬──────────┘
                              │
            ┌─────────────────▼────────────────┐
            │  get_dc_electricity_maps_zone()  │
            │  Mapea: aws-us-west-2 → US-NW-BA│
            └─────────────┬────────────────────┘
                          │
                  ┌───────▼────────┐
                  │  carbon_api    │
                  │  (API Online)  │
                  │  ✓ Zone query  │
                  └───────┬────────┘
                          │
            ┌─────────────▼────────────────────┐
            │   ¿Obtuvo CI del API?            │
            │   Ej: 77 gCO2/kWh (Oregon)      │
            │   SÍ → RETORNA ✓                │
            │   NO ↓                           │
            └─────────────┬────────────────────┘
                          │
                    ┌─────▼──────────────┐
                    │    PASO 2:         │
                    │  BÚSQUEDA POR ZONA │
                    │ (125 zonas locales)│
                    └─────┬──────────────┘
                          │
            ┌─────────────▼──────────────────────┐
            │ get_carbon_intensity_for_zone()    │
            │ Busca zone en:                     │
            │ carbon_intensity.csv               │
            │ (tabla completa de 125 zonas EM)   │
            └─────────────┬──────────────────────┘
                          │
            ┌─────────────▼──────────────────────┐
            │ ¿Encontró zona en CSV local?       │
            │ SÍ: Retorna CI del CSV  ✓         │
            │ NO: Continúa ↓                     │
            └─────────────┬──────────────────────┘
                          │
                    ┌─────▼──────────────┐
                    │    PASO 3:         │
                    │  FALLBACK A PAÍS   │
                    │ (valor por defecto)│
                    └─────┬──────────────┘
                          │
            ┌─────────────▼──────────────────────┐
            │ get_carbon_intensity(country_code) │
            │ Busca en DEFAULT_CARBON_INTENSITY │
            │ {"US": 380, "ES": 145, ...}       │
            │ SÍ: Retorna CI del país ✓         │
            │ NO: Continúa ↓                     │
            └─────────────┬──────────────────────┘
                          │
                    ┌─────▼──────────────┐
                    │    PASO 4:         │
                    │  VALOR GLOBAL      │
                    │ GLOBAL: 450 gCO2/kWh
                    │ ✓ SIEMPRE DEVUELVE │
                    └────────────────────┘
```

---

## 📁 Relación entre CSVs

### 3 CSVs principales:

| CSV | Registros | Propósito | Información |
|-----|-----------|----------|------------|
| **carbon_intensity_datacenters.csv** | 71 DCs | Mapeo DC → Zona EM | `dc_id`, `zone`, `carbon_intensity_gCO2_kWh`, `ci_method` |
| **carbon_intensity.csv** | 125 zonas | Base de zonas EM | `zone`, `carbon_intensity_gCO2_kWh` |
| **data_centers.csv** | 71 DCs | Datos generales DCs | `dc_id`, `provider`, `region`, `country`, `pue`, ... |

### Relaciones de dependencia:

```
data_centers.csv (71 DCs)
    │
    ├─► BUSCA ZONA EM (mapeos internos)
    │   (get_dc_electricity_maps_zone)
    │
    └─► carbon_intensity_datacenters.csv (71 DCs)
        │
        ├─► zone = "US-NW-BPAT" (ej: aws-us-west-2)
        │   │
        │   ├─ PASO 1: Consulta API con zone
        │   │
        │   └─ PASO 2: Si falla → busca en:
        │
        └─► carbon_intensity.csv (125 zonas)
            │
            ├─ Si zone encontrada → retorna CI
            └─ Si no → fallback a país → fallback a GLOBAL
```

---

## 🎯 Ejemplo práctico:

### Escenario: Calcular emissions para `aws-us-west-2`

```python
# PASO 1: Obtiene zona específica de EM
zone = get_dc_electricity_maps_zone("aws-us-west-2")  
# → Retorna: "US-NW-BPAT"

# PASO 1: Intenta consultar API en línea
ci = carbon_api.get_carbon_intensity("US-NW-BPAT")
# Si API está online → 77 gCO2/kWh ✓ RETORNA

# PASO 2: Si API falla → busca en CSV local
ci = get_carbon_intensity_for_zone("US-NW-BPAT")
# carbon_intensity.csv tiene: "US-NW-BPAT": 77 gCO2/kWh ✓ RETORNA

# PASO 3: Si zona no existe en CSV
ci = get_carbon_intensity("US")  
# DEFAULT_CARBON_INTENSITY["US"]: 380 gCO2/kWh ✓ RETORNA

# PASO 4: Si país tampoco existe
ci = DEFAULT_CARBON_INTENSITY["GLOBAL"]
# → 450 gCO2/kWh ✓ RETORNA (siempre hay fallback)
```

---

## 💾 Carga de CSVs en memoria

En la función `_load_datasets()`:

```python
self.data_centers_df        # 71 DCs con datos generales
self.dc_ci_df               # 71 DCs con zonas EM específicas ← PRINCIPAL
self.ci_zones_df            # 125 zonas EM completas ← FALLBACK (NUEVO)
```

---

## 🔄 Flujo completo de una consulta:

```
Usuario: calculate_emissions(model_id, dc_id, device_id, ...)
    │
    ├─ Obtiene datos del DC
    │  └─ self.data_centers_df
    │
    ├─ Obtiene zona EM del DC
    │  └─ get_dc_electricity_maps_zone("aws-us-west-2") 
    │     → "US-NW-BPAT"
    │
    └─ Calcula CI con fallback de 4 niveles
       └─ get_carbon_intensity_for_dc("aws-us-west-2", fallback_country="US")
          ├─ Nivel 1: API + Zona específica
          ├─ Nivel 2: carbon_intensity.csv (125 zonas)
          ├─ Nivel 3: DEFAULT_CARBON_INTENSITY[país]
          └─ Nivel 4: DEFAULT_CARBON_INTENSITY["GLOBAL"]
```

---

## 📊 Estadísticas de cobertura

- **71 data centers** mapeados en `data_centers.csv`
- **71 data centers** con CI en `carbon_intensity_datacenters.csv`
- **125 zonas EM** disponibles como fallback en `carbon_intensity.csv`
- **55 países** en `DEFAULT_CARBON_INTENSITY`
- **1 valor global** como último recurso (450 gCO2/kWh)

**Garantía:** Cualquier DC siempre obtendrá un valor de CI, sin excepciones.

---

## 🏗️ Arquitectura resumida

1. **Datos específicos** (máxima precisión)
   - Zone-specific CI from Electricity Maps API
   
2. **Datos locales** (fallback rápido)
   - 125 zonas precargadas en `carbon_intensity.csv`
   
3. **Datos nacionales** (aproximación moderada)
   - 55 países en diccionario interno
   
4. **Valor global** (último recurso)
   - 450 gCO2/kWh (promedio mundial)

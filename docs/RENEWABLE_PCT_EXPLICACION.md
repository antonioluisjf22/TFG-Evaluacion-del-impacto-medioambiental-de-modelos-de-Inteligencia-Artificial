# Obtención de `renewable_pct` en `carbon_intensity_datacenters.csv`

Este documento explica el flujo detallado de cómo se obtiene el valor de `renewable_pct` (porcentaje de energía renovable) para cada data center.

---

## Flujo Detallado

### Paso 1: Iterar sobre cada Data Center

```python
for _, row in dc_df.iterrows():
    dc_id = row['dc_id']           # ej: "gcp-us-east5"
    region = row['region']          # ej: "us-east5 (Ohio)"
    country = row['country_code']   # ej: "US"
```

### Paso 2: Mapear región → zona de Electricity Maps

```python
zone = self.get_zone_for_datacenter(region, country)
# "us-east5 (Ohio)" contiene "ohio" → busca en diccionario
# DATACENTER_REGION_TO_ZONE["ohio"] = "US-MIDW-MISO"
```

### Paso 3: Llamar a `get_carbon_intensity_with_details(zone)`

```python
details = self.get_carbon_intensity_with_details("US-MIDW-MISO")
```

Este método hace **dos llamadas a la API de Electricity Maps**:

#### Llamada 1: Carbon Intensity

```
GET https://api.electricitymap.org/v3/carbon-intensity/latest?zone=US-MIDW-MISO
```

Respuesta típica:
```json
{
  "zone": "US-MIDW-MISO",
  "carbonIntensity": 427,
  "datetime": "2026-01-28T19:00:00.000Z",
  "fossilFreePercentage": null,
  "renewablePercentage": null,
  "isEstimated": false
}
```

> **Nota**: El endpoint de carbon-intensity a veces no devuelve los porcentajes de renovables.

#### Llamada 2: Power Breakdown (si los % son null)

```python
# Si no vienen los porcentajes, consultar power-breakdown
if result['renewablePercentage'] is None:
    breakdown = self.get_power_breakdown(zone)
```

```
GET https://api.electricitymap.org/v3/power-breakdown/latest?zone=US-MIDW-MISO
```

Respuesta típica:
```json
{
  "zone": "US-MIDW-MISO",
  "datetime": "2026-01-28T19:00:00.000Z",
  "fossilFreePercentage": 50,
  "renewablePercentage": 28,
  "powerConsumptionTotal": 85420,
  "powerProductionTotal": 87230,
  "powerProductionBreakdown": {
    "nuclear": 22,
    "wind": 18,
    "solar": 5,
    "hydro": 5,
    "coal": 25,
    "gas": 20,
    "oil": 0,
    "unknown": 5
  }
}
```

### Paso 4: Guardar en el CSV

```python
results.append({
    # ...
    'renewable_pct': details.get('renewablePercentage'),  # ← 28% de la API
    # ...
})
```

---

## Diagrama del Flujo

```
┌─────────────────────────────────────────────────────────────────────┐
│                     generate_datacenter_csv()                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Para cada DC en data_centers.csv:                                  │
│  dc_id = "gcp-us-east5", region = "Ohio", country = "US"           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  get_zone_for_datacenter("Ohio", "US")                              │
│  → Busca "ohio" en DATACENTER_REGION_TO_ZONE                        │
│  → Retorna "US-MIDW-MISO"                                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  get_carbon_intensity_with_details("US-MIDW-MISO")                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐    ┌───────────────────────────────────┐
│  API Call #1              │    │  API Call #2 (si % es null)       │
│  ─────────────────────    │    │  ─────────────────────────────    │
│  GET /v3/carbon-intensity │    │  GET /v3/power-breakdown/latest   │
│  ?zone=US-MIDW-MISO       │    │  ?zone=US-MIDW-MISO               │
│                           │    │                                    │
│  Retorna:                 │    │  Retorna:                          │
│  - carbonIntensity: 427   │    │  - fossilFreePercentage: 50%      │
│  - renewablePercentage: ? │───▶│  - renewablePercentage: 28%  ←───│
└───────────────────────────┘    └───────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Resultado final para el CSV:                                        │
│  {                                                                   │
│    'dc_id': 'gcp-us-east5',                                         │
│    'electricity_maps_zone': 'US-MIDW-MISO',                         │
│    'carbon_intensity_gCO2_kWh': 427,                                │
│    'fossil_free_pct': 50,     ← Nuclear (22%) + Renovables (28%)    │
│    'renewable_pct': 28,       ← Solo renovables (wind+solar+hydro)  │
│    'provider_renewable_pct': 100  ← Lo que Google declara (PPAs)    │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Diferencia entre `fossil_free_pct` y `renewable_pct`

| Campo | Incluye | Ejemplo Ohio |
|-------|---------|--------------|
| `fossil_free_pct` | Nuclear + Renovables | 22% + 28% = **50%** |
| `renewable_pct` | Solo renovables (eólica, solar, hydro) | **28%** |

> **Nota**: La energía nuclear es libre de carbono (`fossil_free`) pero no se considera renovable.

---

## Diferencia entre `renewable_pct` y `provider_renewable_pct`

| Campo | Origen | Significado |
|-------|--------|-------------|
| `renewable_pct` | **Electricity Maps API** | % renovables real de la red eléctrica en ese momento |
| `provider_renewable_pct` | **Hardcodeado** (declaraciones oficiales) | % que el proveedor declara usar (mediante PPAs, RECs) |

### Ejemplo: Deep Green UK

```
renewable_pct:          23%   ← La red UK en ese momento era 23% renovable
provider_renewable_pct: 100%  ← Deep Green declara usar 100% renovables (PPAs)
```

Un proveedor puede declarar "100% renovable" porque **compra certificados** equivalentes a su consumo, aunque los electrones físicos vengan de la red mixta.

---

## Endpoints de Electricity Maps Utilizados

| Endpoint | Propósito | Campos obtenidos |
|----------|-----------|------------------|
| `GET /v3/carbon-intensity/latest?zone={zone}` | Intensidad de carbono | `carbonIntensity`, `datetime` |
| `GET /v3/power-breakdown/latest?zone={zone}` | Desglose de fuentes | `fossilFreePercentage`, `renewablePercentage` |

---

## Código Relevante en `carbon_intensity_api.py`

### Método `get_power_breakdown()`

```python
def get_power_breakdown(self, zone: str) -> Dict[str, Any]:
    """
    Obtiene el desglose de fuentes de energía para una zona.
    
    Endpoint: /v3/power-breakdown/latest
    """
    data = self._make_request("power-breakdown/latest", params={"zone": zone})
    
    if data:
        return {
            'fossilFreePercentage': data.get('fossilFreePercentage'),
            'renewablePercentage': data.get('renewablePercentage'),
            'powerConsumptionTotal': data.get('powerConsumptionTotal'),
            'powerProductionTotal': data.get('powerProductionTotal'),
            'isEstimated': data.get('isEstimated', True),
            'datetime': data.get('datetime'),
            'source': 'electricity_maps_api'
        }
    
    return {
        'fossilFreePercentage': None,
        'renewablePercentage': None,
        'source': 'not_available'
    }
```

### Método `get_carbon_intensity_with_details()`

```python
def get_carbon_intensity_with_details(self, zone_or_country: str, 
                                       include_power_breakdown: bool = True) -> Dict[str, Any]:
    # ...
    
    # Si no vienen los porcentajes y se solicita, consultar power-breakdown
    if include_power_breakdown and (result['fossilFreePercentage'] is None 
                                     or result['renewablePercentage'] is None):
        breakdown = self.get_power_breakdown(zone)
        if breakdown.get('fossilFreePercentage') is not None:
            result['fossilFreePercentage'] = breakdown['fossilFreePercentage']
        if breakdown.get('renewablePercentage') is not None:
            result['renewablePercentage'] = breakdown['renewablePercentage']
    
    return result
```

---

*Documentación técnica - TFG Evaluación del Impacto Medioambiental de Modelos de IA*

# PROMPT PARA CLAUDE OPUS — Suite de Pruebas Completa del TFG

## Contexto del proyecto

Eres un ingeniero de QA experto que trabaja en un TFG (Trabajo de Fin de Grado) titulado **"Evaluación del impacto medioambiental de modelos de Inteligencia Artificial"**. El proyecto es una aplicación web Flask (Python 3.11+) que calcula la huella de carbono (CO₂) de consultas a modelos LLM, descomponiendo las emisiones en tres componentes: dispositivo cliente, red de transmisión y data center.

### Stack tecnológico
- **Backend**: Flask (application factory pattern), Python 3.11+
- **Frontend**: Vanilla JS (~285 KB), Chart.js, Leaflet, CountUp.js
- **Datos**: CSVs planos (no BD relacional) — 8 datasets + 1 JSON
- **API externa**: Electricity Maps API v3 (intensidad de carbono en tiempo real)
- **Framework de testing**: pytest (Python), unittest como fallback

### Arquitectura del sistema

```
POST /api/calculate → routes/api.py → _sanitize_params()
    → services/calculator_service.py → CalculatorService.calculate()
    → scripts/calculate_emissions.py → CarbonCalculator.calculate_emissions()
    → [3 componentes: Device + Network + DataCenter]
    → EmissionResult dataclass
    → services/report_service.py → energy_label() + equivalencies()
    → JSON response
```

### Módulos principales a testear

1. **`scripts/calculate_emissions.py`** — Motor central de cálculo
   - Clase `CarbonCalculator`: carga datasets, calcula emisiones
   - Dataclass `EmissionResult`: resultado con 30+ campos
   - Funciones `_fill_custom_model_defaults()`, `_fill_custom_dc_defaults()`, `_fill_custom_device_defaults()`
   - Fórmula principal: `CO2_TOTAL = CO2_device + CO2_network + CO2_datacenter`
   - Modelo dinámico de potencia: `P_real = P_idle + (P_TDP - P_idle) × U`
   - Conversión tokens→MB: `data_mb = (1200 + tokens × 5) / 1_000_000`
   - FLOPS inferencia: `2 × num_parameters × tokens`

2. **`scripts/environmental_labels.py`** — Sistema de etiquetas A+++ a F
   - Enum `EnvironmentalClass` (9 clases)
   - `get_environmental_label(co2_g)` → clasificación por percentiles
   - `get_label_scale()` → escala completa de umbrales
   - `get_percentile(co2_g)` → percentil de la emisión dentro de 639K combinaciones

3. **`scripts/reports_generator.py`** — Generador de reportes
   - Clase `ReportGenerator`
   - `generate_breakdown_data(result)` → datos de gráfico pie
   - `generate_comparative_table(results)` → tabla comparativa con deltas
   - `generate_equivalencies(co2_grams, scale)` → árboles, vuelos, coches
   - `generate_production_impact(result, queries/day, days/year)` → escala anual

4. **`scripts/carbon_intensity_api.py`** — Cliente API Electricity Maps
   - Clase `CarbonIntensityAPI`: caché 15 min, fallbacks, mapeo de zonas
   - `get_carbon_intensity(zone)` → gCO₂/kWh en tiempo real
   - Mapeos: 70+ data centers → zonas de Electricity Maps

5. **`app/routes/api.py`** — Endpoints REST
   - `GET /api/options` — catálogos de selección
   - `POST /api/calculate` — cálculo individual
   - `POST /api/compare` — comparar todos los modelos
   - `POST /api/report/breakdown` — desglose pie chart
   - `POST /api/report/production` — impacto a escala
   - `GET /api/map-data` — datos geográficos
   - `_sanitize_params()` — parsing/validación de entrada
   - Soporte de entidades personalizadas (`__custom__`)

6. **`app/services/calculator_service.py`** — Servicio calculadora (singleton)
   - `get_options()` → catálogos del formulario
   - `calculate(params)` → wrapper de `CarbonCalculator`
   - `compare_models(params)` → cálculo para todos los modelos

7. **`app/services/report_service.py`** — Servicio de reportes
   - `breakdown(result)`, `energy_label(result)`, `equivalencies(co2, scale)`
   - `comparative(results)`, `production_impact(...)`

8. **`app/__init__.py`** — Factory + `_SafeJSONProvider`
   - Sanitización de `Infinity`/`NaN` → `null` en JSON

### Datasets (esquemas relevantes para testing)
- **models.csv**: model_id, num_parameters, energy_wh_per_1k_tokens, latency_ms_per_token, context_window, max_output_tokens
- **data_centers.csv**: dc_id, provider_name, country_code, pue, provider_renewable_pct
- **devices.csv**: device_id, has_npu, primary_inference_target, inference_cpu/gpu/npu_watts, system_idle_watts
- **network_energy_sources_2024.csv**: network_type, energy_kWh_per_MB, energy_kWh_per_GB
- **request_types.csv**: request_type_id, tokens_input_avg, tokens_output_avg
- **carbon_intensity.csv**: zone, carbon_intensity_gCO2_kWh
- **emissions_distribution.csv**: percentiles para etiquetado

### Tests existentes (no formales, son scripts de validación)
- `testing/test_network_updates.py` — Valida CSV de redes y cálculo dinámico de CI
- `testing/test_processor_selection.py` — Valida selección CPU/GPU/NPU y fallbacks

---

## INSTRUCCIONES: Genera la suite completa de pruebas

### Estructura de archivos a generar

```
testing/
├── conftest.py                           # Fixtures compartidos globales
├── pytest.ini                            # Configuración de pytest
├── unit/
│   ├── test_calculate_emissions.py       # Motor de cálculo (CarbonCalculator)
│   ├── test_environmental_labels.py      # Sistema de etiquetado A+++ a F
│   ├── test_reports_generator.py         # Generador de reportes
│   ├── test_carbon_intensity_api.py      # Cliente API Electricity Maps (mocks)
│   ├── test_custom_entities.py           # Entidades personalizadas (__custom__)
│   ├── test_json_provider.py             # Sanitización _SafeJSONProvider
│   ├── test_boundary_edge_cases.py       # Casos límite y entradas extremas
│   └── test_parametrized_combinations.py # Combinaciones exhaustivas parametrizadas
├── integration/
│   ├── test_api_endpoints.py             # Endpoints REST (/api/*)
│   ├── test_calculation_flow.py          # Flujo completo calculate → report
│   ├── test_dataset_integrity.py         # Integridad y coherencia de CSVs
│   └── test_service_integration.py       # CalculatorService + ReportService
├── regression/
│   └── test_calculation_stability.py     # Resultados conocidos como anclas
├── validation/
│   ├── test_formula_accuracy.py          # Exactitud matemática de las fórmulas
│   └── test_data_quality.py              # Calidad estadística de la distribución
└── performance/
    └── test_timing.py                    # Tiempos de respuesta y SLAs de velocidad
```

### 1. PRUEBAS UNITARIAS (`testing/unit/`)

#### 1.1. `test_calculate_emissions.py` — Motor de cálculo (~30 tests)

**Inicialización:**
- `test_calculator_loads_all_datasets`: Verifica que se cargan correctamente los 8 CSVs
- `test_calculator_loads_models_count`: Exactamente 15 modelos cargados (o 10 según versión)
- `test_calculator_loads_datacenters_count`: Exactamente 71 data centers
- `test_calculator_loads_devices_count`: Exactamente 20 dispositivos
- `test_calculator_loads_network_types`: Verifica tipos de red esperados (WiFi, 4G, 5G, Fiber...)

**Lookups de entidades:**
- `test_get_model_valid`: `get_model("gpt-4")` retorna Series válida con campos esperados
- `test_get_model_invalid`: `get_model("modelo-inexistente")` retorna None
- `test_get_data_center_valid`: Lookup correcto de un DC conocido
- `test_get_device_valid`: Lookup correcto de un dispositivo
- `test_get_network_valid`: Lookup correcto de tipo de red

**Selección de procesador:**
- `test_get_valid_processors_smartphone`: Smartphone con NPU → ["cpu", "gpu", "npu"]
- `test_get_valid_processors_raspberry_pi`: Edge device → ["cpu"] solamente
- `test_get_processor_watts_returns_positive`: Watts > 0 para procesador válido
- `test_auto_processor_selects_primary_target`: "auto" usa `primary_inference_target`

**Cálculo de emisiones — Casos normales:**
- `test_calculate_basic_returns_emission_result`: Tipo de retorno correcto
- `test_calculate_co2_total_is_sum_of_components`: `co2_total = device + network + datacenter`
- `test_calculate_energy_total_is_sum_of_components`: Idem para energía
- `test_calculate_all_components_positive`: Todas las emisiones ≥ 0
- `test_calculate_tokens_from_request_type`: Si no se pasan tokens explícitos, usa request_type
- `test_calculate_default_tokens_fallback`: Sin tokens ni request_type → 50 input + 100 output

**Proporcionalidad y propiedades matemáticas:**
- `test_more_tokens_more_emissions`: 200 tokens > 100 tokens en emisiones
- `test_emissions_scale_linearly_with_tokens`: Duplicar tokens ≈ duplicar emisiones (tolerancia 5%)
- `test_higher_pue_higher_datacenter_emissions`: PUE 1.8 > PUE 1.1 (con custom DC)
- `test_higher_ci_higher_emissions`: País con alta CI > país con baja CI
- `test_gpu_vs_cpu_different_emissions`: GPU y CPU producen emisiones distintas para mismo dispositivo

**Capping de tokens:**
- `test_tokens_output_capped_to_max_output`: Si tokens_output > max_output_tokens del modelo, se capea

**Campos de metadata:**
- `test_result_contains_model_name`: `result.model_name` coincide con el modelo usado
- `test_result_contains_processor_used`: `result.processor_used` es "cpu", "gpu" o "npu"
- `test_result_inference_time_positive`: `result.inference_time_sec > 0`
- `test_result_to_dict_structure`: `to_dict()` contiene keys esperadas (emissions_gCO2, energy_Wh, metadata, etc.)

#### 1.2. `test_environmental_labels.py` (~15 tests)

**Clasificación básica:**
- `test_very_low_emissions_gets_a_plus_plus_plus`: co2 < P2 → "A+++"
- `test_moderate_emissions_gets_b_or_c`: co2 en rango medio → "B" o "C"
- `test_very_high_emissions_gets_f`: co2 > P97 → "F"
- `test_zero_emissions_gets_best_label`: co2 = 0 → "A+++"
- `test_negative_emissions_handled`: co2 < 0 → no crash (edge case)

**Percentiles:**
- `test_percentile_zero_for_zero_emissions`: 0 gCO₂ → percentil ~0
- `test_percentile_100_for_extreme_emissions`: co2 enorme → percentil ~100
- `test_percentile_monotonic`: Si co2_a < co2_b entonces percentile(a) ≤ percentile(b)

**Escala:**
- `test_label_scale_has_9_classes`: get_label_scale() retorna 9 clases
- `test_label_scale_ordered`: Los umbrales están en orden creciente
- `test_all_classes_have_required_fields`: Cada clase tiene max_co2_g, color_hex, emoji, description

**Consistencia:**
- `test_label_and_percentile_consistent`: Si label="A", percentile debe estar en rango [20, 30]
- `test_boundary_values`: Testear exactamente en los umbrales de cada clase

#### 1.3. `test_reports_generator.py` (~15 tests)

**Breakdown:**
- `test_breakdown_percentages_sum_100`: Los tres porcentajes suman ~100% (tolerancia 0.1%)
- `test_breakdown_matches_absolute_values`: Los gCO₂ absolutos coinciden con el EmissionResult
- `test_breakdown_contains_chart_data`: Retorna colores y labels para Chart.js

**Comparativa:**
- `test_comparative_table_contains_all_models`: Una entrada por cada resultado pasado
- `test_comparative_table_includes_deltas`: Campo delta_vs_first presente
- `test_comparative_summary_has_best_and_worst`: summary.best_model y summary.worst_model existen

**Equivalencias:**
- `test_equivalencies_trees_positive`: Árboles necesarios > 0 para co2 > 0
- `test_equivalencies_scale_factor`: Con scale=1000, equivalencies crecen ~1000x
- `test_equivalencies_zero_co2`: Para 0 gCO₂, retorna valores cero

**Producción:**
- `test_production_impact_annual_totals`: Emisiones anuales = single × queries/day × days/year
- `test_production_impact_default_million_queries`: Con 1M queries/day, valores son grandes

#### 1.4. `test_carbon_intensity_api.py` (~10 tests, CON MOCKS)

**IMPORTANTE: Mockear SIEMPRE las llamadas HTTP a la API de Electricity Maps. No hacer llamadas reales.**

- `test_cache_returns_cached_value`: Si el valor está en caché (< 15 min), no llama API
- `test_cache_expired_calls_api`: Valor en caché > 15 min → llama API de nuevo
- `test_fallback_to_csv_on_api_failure`: Si la API falla, usa CSV como fallback
- `test_datacenter_zone_mapping`: DC conocido → zona de EM correcta
- `test_unknown_zone_returns_default`: Zona desconocida → valor por defecto
- `test_provider_name_mapping`: Mapeo proveedor → API provider ID correcto
- `test_api_response_parsing`: Parseo correcto de JSON de respuesta de la API
- `test_graceful_degradation_no_credentials`: Sin API key → no crash, solo usa fallbacks

#### 1.5. `test_custom_entities.py` (~12 tests)

**Custom Model:**
- `test_fill_custom_model_from_parameters`: Si se da num_parameters, estima energy y latency
- `test_fill_custom_model_from_energy`: Si se da energy_wh_per_1k_tokens, estima parámetros invertidos
- `test_fill_custom_model_default_7b`: Sin datos → asigna 7B parámetros como default
- `test_fill_custom_model_returns_estimated_fields`: El segundo retorno lista los campos estimados

**Custom Data Center:**
- `test_fill_custom_dc_default_country_es`: Sin country → asigna "ES"
- `test_fill_custom_dc_derives_ci_from_country`: CI se calcula a partir del country
- `test_fill_custom_dc_preserves_explicit_pue`: Si el usuario da PUE, no lo sobrescribe

**Custom Device:**
- `test_fill_custom_device_detects_primary_processor`: Detecta CPU/GPU/NPU según watts proporcionados
- `test_fill_custom_device_zeroes_unspecified_processors`: Procesadores no especificados → 0W
- `test_fill_custom_device_default_cpu`: Sin especificar → asigna CPU por defecto

**Flujo completo custom:**
- `test_calculate_with_custom_model`: `model_id="__custom__"` + custom_model dict → EmissionResult válido
- `test_calculate_with_custom_dc`: `data_center_id="__custom__"` con custom_dc → funciona

#### 1.6. `test_json_provider.py` (~5 tests)

- `test_infinity_serialized_as_null`: `float('inf')` → `null` en JSON
- `test_nan_serialized_as_null`: `float('nan')` → `null` en JSON
- `test_normal_floats_preserved`: `3.14` → `3.14` sin cambios
- `test_nested_infinity_sanitized`: Dict anidado con Infinity → sanitizado recursivamente
- `test_list_with_nan_sanitized`: Lista con NaN → cada NaN reemplazado por None

---

### 2. PRUEBAS DE INTEGRACIÓN (`testing/integration/`)

#### 2.1. `test_api_endpoints.py` (~20 tests, usa Flask test client)

**GET /api/options:**
- `test_options_returns_200`: Status 200
- `test_options_contains_all_catalogs`: Response contiene models, data_centers, devices, networks, request_types, countries
- `test_options_models_have_required_fields`: Cada modelo tiene model_id, model_name, num_parameters
- `test_options_data_centers_have_country_code`: Cada DC tiene country_code

**POST /api/calculate:**
- `test_calculate_valid_request_200`: Request completa → 200 + JSON con emissions_gCO2
- `test_calculate_missing_model_400`: Sin model_id → 400 con error descriptivo
- `test_calculate_missing_datacenter_400`: Sin data_center_id → 400
- `test_calculate_custom_model_200`: model_id="__custom__" + custom_model → funciona
- `test_calculate_invalid_model_id_400`: model_id que no existe → 400
- `test_calculate_with_explicit_tokens`: tokens_input=100, tokens_output=200 → usa esos tokens
- `test_calculate_response_structure`: Response tiene emissions_gCO2, energy_Wh, metadata, breakdown_percentage

**POST /api/compare:**
- `test_compare_returns_all_models`: Response tiene tantas entradas como modelos en dataset
- `test_compare_includes_environmental_labels`: Cada entrada tiene label
- `test_compare_custom_model_added`: Con custom_model → una entrada extra

**POST /api/report/breakdown:**
- `test_breakdown_after_calculate`: Calcular, luego pedir breakdown → datos coherentes

**POST /api/report/production:**
- `test_production_default_params`: Sin queries_per_day → usa 1M por defecto
- `test_production_custom_queries`: Con queries_per_day=500000 → valores coherentes

**GET /api/map-data:**
- `test_map_data_returns_datacenters`: Response tiene data_centers con coordenadas
- `test_map_data_countries_have_ci`: Cada país tiene carbon_intensity

#### 2.2. `test_calculation_flow.py` (~8 tests)

**Flujo end-to-end (sin HTTP, solo Python):**
- `test_flow_calculator_to_report_breakdown`: CarbonCalculator → EmissionResult → ReportGenerator.breakdown  
- `test_flow_calculator_to_environmental_label`: EmissionResult.co2_total_g → get_environmental_label → label válido
- `test_flow_compare_all_models_and_rank`: Calcular para todos los modelos → ordenar por emisiones → ranking correcto
- `test_flow_equivalencies_after_calculation`: Calcular → equivalencias → árboles y vuelos coherentes
- `test_flow_production_impact_coherent`: Impacto producción = single × scale

**Consistencia cross-module:**
- `test_report_breakdown_matches_result`: Los gCO₂ del breakdown coinciden con EmissionResult
- `test_label_consistent_with_percentile`: Label y percentil concuerdan
- `test_comparative_table_sorted_correctly`: La tabla comparativa está bien ordenada

#### 2.3. `test_dataset_integrity.py` (~15 tests)

**IMPORTANTE: Estos tests validan que los CSVs son correctos y coherentes entre sí.**

**Estructura:**
- `test_models_csv_required_columns`: models.csv tiene todas las columnas necesarias
- `test_datacenters_csv_required_columns`: data_centers.csv tiene dc_id, pue, country_code, etc.
- `test_devices_csv_required_columns`: devices.csv tiene device_id, inference_cpu_watts, etc.
- `test_network_csv_required_columns`: network CSV tiene energy_kWh_per_MB, energy_kWh_per_GB

**Validez de datos:**
- `test_all_pue_values_valid_range`: PUE entre 1.0 y 3.0
- `test_all_energy_per_1k_tokens_positive`: energy_wh_per_1k_tokens > 0 para todos los modelos
- `test_all_device_watts_non_negative`: Watts ≥ 0 para todos los procesadores
- `test_network_energy_positive`: Energía por MB > 0 para tipos de red
- `test_carbon_intensity_positive`: CI > 0 para todas las zonas

**Coherencia entre datasets:**
- `test_datacenter_countries_have_ci`: Todos los country_code de DCs existen en carbon_intensity.csv
- `test_no_duplicate_model_ids`: Sin IDs duplicados
- `test_no_duplicate_dc_ids`: Sin IDs duplicados
- `test_no_duplicate_device_ids`: Sin IDs duplicados
- `test_emissions_distribution_has_percentiles`: El CSV de distribución tiene columnas P0-P100

**Referencia cruzada:**
- `test_request_types_csv_matches_code`: Los request_type_ids del CSV coinciden con los que usa el código

#### 2.4. `test_service_integration.py` (~6 tests)

- `test_calculator_service_singleton_behavior`: Dos llamadas a get_services() retornan la misma instancia
- `test_calculator_service_get_options_structure`: get_options() retorna dict con todos los catálogos
- `test_calculator_service_calculate_returns_result`: calculate() retorna EmissionResult válido
- `test_report_service_breakdown_valid`: breakdown() retorna porcentajes válidos
- `test_report_service_label_valid_class`: energy_label() retorna clase A+++ a F
- `test_report_service_equivalencies_positive`: equivalencies() retorna valores ≥ 0

---

### 3. PRUEBAS DE REGRESIÓN (`testing/regression/`)

#### 3.1. `test_calculation_stability.py` — Resultados conocidos como anclas (~15 tests)

Estas pruebas fijan valores de referencia calculados con la versión estable actual del código y verifican que no varían entre refactorizaciones. Son la primera línea de defensa ante cambios inesperados en el motor de cálculo.

**NOTA DE IMPLEMENTACIÓN**: Los valores exactos de CO₂ deben obtenerse ejecutando el cálculo una vez con la versión estable y anotarlos como constantes al inicio del fichero. Usar tolerancia relativa del 1% con `pytest.approx(expected, rel=0.01)`. Si el valor cambia intencionalmente (nueva versión de fórmula), actualizar la constante y documentarlo en el commit.

```python
# Constantes de referencia — calcular una vez con la versión estable y fijar:
REF_GPT4_AWS_MACBOOK_WIFI_CHAT_CO2 = ...    # gCO2, obtener ejecutando el cálculo
REF_PHI2_EUROPE_RASPI_LTE_CO2 = ...         # gCO2
REF_LLAMA2_AZURE_LAPTOP_4G_CO2 = ...
REF_GPT4_CHAT_SIMPLE_LABEL = "C"            # verificar al generar los tests
REF_MILLION_QUERIES_GPT4_TREES = ...        # número de árboles/año
```

**Tests de estabilidad de valores absolutos:**
- `test_gpt4_aws_macbook_wifi_chat_co2_stable`: GPT-4 + AWS US-East-1 + MacBook M3 + WiFi 5 GHz + chat_simple → co2_total_g ≈ `REF_GPT4_AWS_MACBOOK_WIFI_CHAT_CO2` ± 1%
- `test_phi2_europe_raspi_lte_co2_stable`: Phi-2 + DC europeo + Raspberry Pi 5 + LTE 4G → co2_total_g estable ± 1%
- `test_llama2_azure_laptop_4g_co2_stable`: Llama-2 70B + Azure West Europe + laptop genérico + 4G → estable ± 1%
- `test_gpt4_chat_simple_label_stable`: La etiqueta asignada a GPT-4 + chat_simple no cambia entre versiones
- `test_phi2_label_stable`: La etiqueta de Phi-2 (modelo más eficiente) no cambia
- `test_gpt4_percentile_below_50`: El percentil de una consulta GPT-4 estándar es < 50 (es menos eficiente que la media)
- `test_phi2_percentile_above_50`: El percentil de Phi-2 estándar es > 50 (es más eficiente que la media)
- `test_equivalencies_million_queries_gpt4_stable`: 1 M consultas/día de GPT-4 generan ≈ `REF_MILLION_QUERIES_GPT4_TREES` árboles/año ± 5%

**Tests de invariantes relacionales (no dependen de valor absoluto):**
- `test_phi2_always_less_co2_than_gpt4`: Para cualquier DC/device/network fijos, Phi-2 < GPT-4 en co2_total_g
- `test_comparative_ranking_stable`: El orden relativo de modelos por emisiones es siempre: Phi-2 < Gemma-7B < Mistral-7B < Llama2-70B < GPT-4
- `test_european_dc_less_than_us_dc_emissions`: DC europeo de baja CI (SE, NO, IS) produce siempre menos emisiones DC que DC en US carbón-intensivo
- `test_npu_less_energy_than_cpu_on_smartphone`: En dispositivos con NPU (iPhone, Pixel), NPU < CPU en energía de dispositivo para mismas condiciones
- `test_chat_simple_always_less_than_generation_long`: chat_simple (285 tokens) siempre < generation_long (2098 tokens) en co2_total_g
- `test_fiber_less_network_emissions_than_5g`: Para misma cantidad de tokens, Fiber < WiFi 5 GHz < 5G móvil en emisiones de red
- `test_breakdown_percentages_stable_order_cpu_device`: Para Raspberry Pi (CPU + sin GPU/NPU), device_pct está en el rango [20%, 60%] consistentemente

---

### 4. PRUEBAS DE LÍMITES Y CASOS EXTREMOS (`testing/unit/test_boundary_edge_cases.py`) (~18 tests)

Verifican el comportamiento del sistema en los extremos de los rangos válidos y ante entradas anómalas. **Todos los casos extremos deben manejarse sin lanzar excepciones no controladas** (sin `RuntimeError`, `ZeroDivisionError`, `OverflowError` sin capturar).

**Tokens extremos:**
- `test_zero_tokens_input`: `tokens_input=0, tokens_output=1` → no crash; `result.co2_total_g >= 0`; solo se transfieren los 1200 bytes de overhead HTTP
- `test_zero_tokens_output`: `tokens_input=50, tokens_output=0` → no crash; `result.co2_datacenter_g >= 0`
- `test_tokens_input_and_output_both_zero`: `tokens_input=0, tokens_output=0` → resultado mínimo posible, solo overhead; no crash
- `test_tokens_exactly_at_max_output`: `tokens_output == model.max_output_tokens` → se acepta sin capping; tokens_processed == max_output_tokens
- `test_tokens_output_one_above_max`: `tokens_output = model.max_output_tokens + 1` → se capea automáticamente; `result.tokens_processed <= model.max_output_tokens`
- `test_tokens_input_extremely_large`: `tokens_input=100000` (supera context_window de cualquier modelo) → se maneja sin overflow; resultado válido o error controlado con mensaje claro

**Utilización extrema:**
- `test_utilization_exactly_zero`: `utilization=0.0` → `step_p_real_w == step_p_idle_w`; las emisiones de dispositivo son las mínimas posibles (solo idle)
- `test_utilization_exactly_one`: `utilization=1.0` → `step_p_real_w == processor_tdp`; emisiones de dispositivo son las máximas posibles
- `test_utilization_result_idle_less_than_full`: resultado con `utilization=0.01` < resultado con `utilization=0.99` en co2_device_g

**Intensidad de carbono extrema:**
- `test_very_low_ci_country_iceland`: `user_country="IS"` (CI ≈ 15 gCO₂/kWh) → emisiones de red muy bajas pero positivas
- `test_very_high_ci_country_china`: `user_country="CN"` (CI ≈ 600 gCO₂/kWh) → emisiones de red elevadas
- `test_ci_ratio_iceland_vs_china_network`: `co2_network(CN) / co2_network(IS)` ≈ 40x (proporción de CIs); usar `pytest.approx(rel=0.15)` por variabilidad de datos

**PUE extremo con custom DC:**
- `test_pue_exactly_one`: `custom_dc` con `pue=1.0` → mínimas emisiones DC posibles; `result.co2_datacenter_g > 0`
- `test_pue_value_two_is_double_pue_one`: `pue=2.0` vs `pue=1.0` → `co2_datacenter(pue=2.0) ≈ 2 × co2_datacenter(pue=1.0)` con tolerancia 1%

**Parámetros extremos del modelo custom:**
- `test_tiny_custom_model_1b_params`: `custom_model` con `num_parameters=1e9` (1 B) → resultado válido con emisiones bajas
- `test_large_custom_model_1000b_params`: `custom_model` con `num_parameters=1000e9` (1000 B) → resultado válido sin overflow de float
- `test_custom_model_zero_energy_field`: `custom_model` con `energy_wh_per_1k_tokens=0` → manejado sin `ZeroDivisionError`; si se estima desde parámetros, resultado coherente

---

### 5. PRUEBAS DE VALIDACIÓN DE FÓRMULAS MATEMÁTICAS (`testing/validation/test_formula_accuracy.py`) (~15 tests)

**CRÍTICO para un TFG académico**: verifica que las fórmulas científicas implementadas producen exactamente los resultados esperados por cálculo manual con lápiz y papel. Cada test debe incluir en su docstring el cálculo manual paso a paso con todas las constantes.

**IMPORTANTE**: Acceder al `EmissionResult` a través de sus campos `step_*` (que exponen los valores intermedios del cálculo) para verificar cada fase de la fórmula, no solo el resultado final.

**Modelo dinámico de potencia del dispositivo** — `P_real = P_idle + (P_TDP - P_idle) × U`:
- `test_dynamic_power_formula_nominal`:
  - Usar `custom_device` con `system_idle_watts=10`, procesador con TDP=100 W, `utilization=0.7`
  - Cálculo manual: `P_real = 10 + (100 - 10) × 0.7 = 73.0 W` exacto
  - Verificar: `result.step_p_real_w == pytest.approx(73.0, rel=1e-6)`
- `test_dynamic_power_formula_at_zero_utilization`:
  - `utilization=0.0` → `P_real = P_idle` exactamente
  - Verificar: `result.step_p_real_w == pytest.approx(result.step_p_idle_w, rel=1e-9)`
- `test_dynamic_power_formula_at_full_utilization`:
  - `utilization=1.0` → `P_real = P_TDP`
  - Verificar que `step_p_real_w` coincide con los vatios del procesador seleccionado del dispositivo

**Conversión tokens → megabytes** — `data_mb = (1200 + tokens × 5) / 1_000_000`:
- `test_tokens_to_mb_nominal`:
  - 100 tokens → `(1200 + 100 × 5) / 1_000_000 = 0.0017 MB` exacto
  - Verificar: `result.step_data_mb == pytest.approx(0.0017, rel=1e-6)`
- `test_tokens_to_mb_zero_tokens`:
  - 0 tokens → solo overhead HTTP: `1200 / 1_000_000 = 0.0012 MB`
  - Verificar: `result.step_data_mb == pytest.approx(0.0012, rel=1e-6)`
- `test_tokens_to_mb_large_quantity`:
  - 2048 tokens → `(1200 + 2048 × 5) / 1_000_000 = 0.011440 MB`
  - Verificar: `result.step_data_mb == pytest.approx(0.01144, rel=1e-5)`
- `test_tokens_to_mb_linearity`:
  - Triplicar tokens_total → data_mb aumenta, pero no triplica (el overhead fijo 1200 bytes amortigua la linealidad)
  - Para tokens grandes (> 10000), la linealidad es prácticamente perfecta: `data_mb(20000) ≈ 2 × data_mb(10000)` con tolerancia 0.1%

**FLOPS de inferencia** — `FLOPS = 2 × num_parameters × tokens_total`:
- `test_flops_formula_reference_model`:
  - Phi-2 (2.7B params), 100 tokens → `FLOPS = 2 × 2.7e9 × 100 = 540e9`
  - Verificar que `result.step_energy_compute_wh` es coherente con esta base usando las constantes `WATTS_PER_TFLOP` del código
- `test_flops_scales_linearly_with_tokens`:
  - `FLOPS(200 tokens)` debe ser exactamente `2 × FLOPS(100 tokens)` (propiedad derivable del campo `step_energy_compute_wh`)
  - Verificar: `result_200.step_energy_compute_wh ≈ 2 × result_100.step_energy_compute_wh` con tolerancia 0.1%

**Fórmula de emisiones de red** — `CO2_red = data_MB × energy_kWh_per_MB × CI × 1000`:
- `test_co2_network_formula_manual`:
  - `data_mb=0.001 MB`, `energy_kWh_per_MB=0.000023` (WiFi 5 GHz ≈ valor real del CSV), `CI=145 gCO₂/kWh` (ES)
  - Cálculo: `E = 0.001 × 0.000023 = 2.3e-8 kWh`; `CO2 = 2.3e-8 × 1000 × 145 = 0.003335 gCO₂`
  - Verificar con `custom_device`, `custom_dc` con CI=145, y tokens que produzcan data_mb=0.001
- `test_co2_network_scales_exactly_with_ci`:
  - Con todo lo demás constante, duplicar la CI del usuario → `co2_network_g` se duplica exactamente
  - Verificar: `co2_network(CI=200) / co2_network(CI=100) == pytest.approx(2.0, rel=0.001)`

**Fórmula de emisiones del datacenter** — `CO2_dc = FLOPS × W_per_TFLOP × PUE × CI_dc`:
- `test_co2_datacenter_pue_factor`:
  - Con `custom_dc`, duplicar PUE manteniendo CI constante → `co2_datacenter_g` se duplica
  - Verificar: `co2_dc(pue=2.0) / co2_dc(pue=1.0) == pytest.approx(2.0, rel=0.01)`
- `test_co2_datacenter_scales_with_model_size`:
  - Phi-2 (2.7B params) vs Llama2-70B (70B params): ratio esperado ≈ 70/2.7 ≈ 25.9x en FLOPS → ratio similar en `co2_datacenter_g`
  - Verificar: `co2_dc(llama2) / co2_dc(phi2) == pytest.approx(70/2.7, rel=0.05)`

**Identidades fundamentales de consistencia:**
- `test_co2_total_identity`:
  - `co2_total_g == co2_device_g + co2_network_g + co2_datacenter_g` con tolerancia de precisión de float (`abs=1e-12`)
- `test_energy_total_identity`:
  - `energy_total_wh == energy_device_wh + energy_network_wh + energy_datacenter_wh` con `abs=1e-12`

---

### 6. PRUEBAS PARAMETRIZADAS EXHAUSTIVAS (`testing/unit/test_parametrized_combinations.py`) (~10 definiciones → ~4000+ casos)

Usando `@pytest.mark.parametrize` de pytest, verificar que todas las combinaciones relevantes producen resultados válidos. **Cada combinación genera un caso de test individual** con su propio nombre descriptivo en el reporte.

**Marcar todos los tests de este fichero como `@pytest.mark.slow`**. Ejecutarlos selectivamente con `pytest testing/unit/test_parametrized_combinations.py -v`.

**Constantes de parametrización** (definir al inicio del fichero; leer IDs reales de los CSVs):
```python
import pytest
from itertools import product
import pandas as pd
import os

# Leer todos los IDs reales de los CSVs para no depender de strings hardcoded
_BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'raw')
ALL_MODEL_IDS = pd.read_csv(f"{_BASE}/models/models.csv")['model_id'].tolist()
ALL_DC_IDS = pd.read_csv(f"{_BASE}/data_centers/data_centers.csv")['dc_id'].tolist()
ALL_DEVICE_IDS = pd.read_csv(f"{_BASE}/devices/devices.csv")['device_id'].tolist()
ALL_NETWORK_IDS = pd.read_csv(f"{_BASE}/network/network_energy_sources_2024.csv")['network_type'].tolist()
ALL_REQUEST_TYPES = pd.read_csv(f"{_BASE}/models/request_types.csv")['request_type_id'].tolist()

SAMPLE_COUNTRIES = ["ES", "US", "DE", "CN", "IN", "IS", "FR", "GB", "JP", "BR"]
SAMPLE_DCS = ["aws-us-east-1", "gcp-europe-west1", "azure-westeurope"]  # DCs fijos para tests rápidos
SAMPLE_DEVICES = ["macbook-pro-m3", "iphone-15-pro", "raspberry-pi-5"]
```

**Tests:**
- `test_all_models_all_sample_countries_no_crash`:
  - `@pytest.mark.parametrize("model_id,country", list(product(ALL_MODEL_IDS, SAMPLE_COUNTRIES)))`
  - Para cada (modelo, país): calcular con DC, device y network fijos → `result.co2_total_g >= 0`, sin excepción
- `test_all_request_types_produce_valid_result`:
  - `@pytest.mark.parametrize("request_type", ALL_REQUEST_TYPES)`
  - Con modelo+DC+device+network fijos, cada request_type → resultado válido con `tokens_processed > 0`
- `test_all_network_types_produce_valid_result`:
  - `@pytest.mark.parametrize("network_id", ALL_NETWORK_IDS)`
  - Con el resto fijo, cada tipo de red → `result.co2_network_g > 0`
- `test_all_models_parse_correctly`:
  - `@pytest.mark.parametrize("model_id", ALL_MODEL_IDS)`
  - `calculator.get_model(model_id) is not None` para todos
- `test_all_data_centers_parse_correctly`:
  - `@pytest.mark.parametrize("dc_id", ALL_DC_IDS)`
  - `calculator.get_data_center(dc_id) is not None` para todos
- `test_all_devices_parse_correctly`:
  - `@pytest.mark.parametrize("device_id", ALL_DEVICE_IDS)`
  - `calculator.get_device(device_id) is not None` para todos
- `test_all_processors_for_each_device`:
  - `@pytest.mark.parametrize("device_id", ALL_DEVICE_IDS)`
  - Para cada dispositivo, obtener `get_valid_processors_for_device(device_id)` y calcular con cada uno → todos válidos
- `test_all_label_classes_are_reachable`:
  - Calcular para TODOS los modelos × TODOS los DCs × 3 devices fijos × 1 network fijo
  - Recoger todas las etiquetas → verificar que las 9 clases (A+++ hasta F) están representadas al menos una vez
  - Esto demuestra que el sistema de etiquetado cubre todo el espacio de emisiones real
- `test_token_counts_consistent_with_csv`:
  - `@pytest.mark.parametrize("request_type", ALL_REQUEST_TYPES)`
  - Los tokens del resultado (`result.tokens_processed`) son ≤ `tokens_input_avg + tokens_output_avg` del CSV (pueden ser menos por capping pero nunca más)
- `test_model_ranking_invariant_across_sample_dcs`:
  - `@pytest.mark.parametrize("dc_id", SAMPLE_DCS)`
  - Para cada DC, Phi-2 < GPT-4 en co2_total_g → el DC no invierte el ranking de modelos

---

### 7. PRUEBAS DE CALIDAD DE DATOS (`testing/validation/test_data_quality.py`) (~10 tests)

Verifican propiedades estadísticas y de distribución de los resultados generados, garantizando que el sistema produce una distribución coherente con el análisis de 639 K combinaciones que originó las etiquetas A+++–F.

**Marcar como `@pytest.mark.slow`** los que requieran calcular muchas combinaciones.

- `test_phi2_is_most_efficient_model_across_sample_dcs`:
  - Para una muestra de 5 DCs representativos, Phi-2 produce siempre la menor `co2_datacenter_g` por ser el modelo con menos parámetros
  - No requiere calcular los 71 DCs: bastan 5 representativos de diferentes continentes
- `test_model_efficiency_order_consistent`:
  - Calcular todos los modelos con parámetros fijos → verificar que el ranking por co2_total_g es monótono con el tamaño del modelo: Phi-2 < Gemma-7B < Mistral-7B < Llama2-70B < GPT-4
  - Marcar `@pytest.mark.slow`
- `test_no_negative_emissions_in_random_sample`:
  - Generar 50 combinaciones aleatorias (usando `random.seed(42)` para reproducibilidad) a partir de todos los IDs del dataset
  - Para todas: `result.co2_total_g >= 0`, `result.energy_total_wh >= 0`
- `test_emissions_range_stays_in_realistic_bounds`:
  - Para una muestra de 100 combinaciones, todas las emisiones están en `[1e-7, 500]` gCO₂
  - Fuera de este rango indica un error de escala en fórmulas o datos
- `test_device_contribution_scales_with_watts`:
  - Dos dispositivos con TDP muy diferente (ej. smartphone 5W vs servidor 300W) con mismos otros parámetros → `co2_device(servidor) >> co2_device(smartphone)` al menos 10x
- `test_network_5g_higher_emissions_than_fiber`:
  - 5G móvil tiene `energy_kWh_per_MB` mayor que Fiber en el CSV → `co2_network(5G) > co2_network(fiber)` para mismos tokens
- `test_datacenter_pue_range_impact`:
  - DC con PUE más alto del dataset vs DC con PUE más bajo → diferencia relativa en `co2_datacenter_g` debe ser al menos 20%
- `test_renewable_info_present_for_all_results`:
  - Para todos los DCs del dataset, `result.dc_renewable_grid_pct is not None` o `result.dc_renewable_provider_pct is not None`
- `test_equivalencies_intuitive_for_single_query`:
  - Una sola consulta GPT-4 chat_simple → `equivalencies['trees_needed'] < 0.001` (una consulta es una fracción ínfima de lo que absorbe un árbol al año)
  - `equivalencies['transatlantic_flights'] < 0.000001` (una consulta es microscópica frente a un vuelo)
- `test_production_impact_million_queries_realistic`:
  - 1 M consultas/día × 365 días de GPT-4 → resultado en toneladas de CO₂ (orden de magnitud: toneladas, no gramos ni mega-toneladas)
  - `1 <= result.co2_total_tons <= 10000` (rango razonable para un servicio de tamaño medio)

---

### 8. PRUEBAS DE RENDIMIENTO Y TIMING (`testing/performance/test_timing.py`) (~5 tests)

No son pruebas de carga ni de concurrencia. Verifican que no hay regresiones de velocidad en el motor de cálculo individual: si un cálculo que tardaba 50ms pasa a tardar 5s, estos tests lo detectan.

**Dependencia opcional**: instalar `pytest-benchmark` para benchmarking estadísticamente robusto:
```bash
pip install pytest-benchmark
```
Si no está disponible, usar `time.perf_counter()`. El fichero debe detectar la disponibilidad automáticamente.

```python
try:
    import pytest_benchmark
    HAS_BENCHMARK = True
except ImportError:
    HAS_BENCHMARK = False
```

- `test_single_calculation_under_500ms`:
  - Medir el tiempo de una sola llamada a `calculator.calculate_emissions()` con parámetros estándar
  - Umbral: `elapsed < 0.500` segundos
  - Justificación: 500 ms es el umbral perceptible de latencia en UX interactiva
  - Si pytest-benchmark disponible: usar el fixture `benchmark` para obtener estadísticas (min/mean/max)
- `test_compare_all_models_under_10s`:
  - Medir el tiempo de calcular todos los modelos del dataset en secuencia con parámetros fijos
  - Umbral: `elapsed < 10.0` segundos
  - Marcar como `@pytest.mark.slow`
- `test_dataset_initialization_under_5s`:
  - Instanciar un nuevo `CarbonCalculator(use_realtime_carbon_intensity=False)` (que carga todos los CSVs)
  - Umbral: `elapsed < 5.0` segundos
  - Nota: medir solo la inicialización, no el cálculo
- `test_label_lookup_1000_calls_under_100ms`:
  - Llamar a `get_environmental_label()` 1000 veces con valores variados
  - Umbral: tiempo total < 100 ms (cada lookup debe ser O(1), no O(n))
- `test_options_endpoint_response_under_1s`:
  - `GET /api/options` vía Flask test client
  - Umbral: `elapsed < 1.0` segundos (incluye serialización JSON de todos los catálogos)

---

### 9. DOCTESTS EN MÓDULOS PRINCIPALES

Pytest descubre y ejecuta automáticamente los ejemplos en los docstrings con `pytest --doctest-modules scripts/`. Son la forma más ligera de documentación verificada: si el ejemplo del docstring está desactualizado, el test falla.

**Añadir los siguientes ejemplos ejecutables en los docstrings de estos módulos:**

**`scripts/environmental_labels.py` — función `get_environmental_label()`:**
```python
def get_environmental_label(co2_g: float) -> dict:
    """
    Retorna la etiqueta medioambiental para las emisiones dadas.

    >>> result = get_environmental_label(0.0)
    >>> result['label']
    'A+++'

    >>> result_high = get_environmental_label(1000.0)
    >>> result_high['label']
    'F'

    >>> scale = get_label_scale()
    >>> len(scale)
    9

    >>> p = get_percentile(0.0)
    >>> p == 0.0
    True
    """
```

**`scripts/reports_generator.py` — método `generate_equivalencies()`:**
```python
def generate_equivalencies(self, co2_grams: float, scale: int = 1) -> dict:
    """
    Convierte gramos de CO₂ en equivalencias comprensibles.

    >>> gen = ReportGenerator()
    >>> result = gen.generate_equivalencies(0.0)
    >>> result['trees_needed'] == 0
    True

    >>> result_nonzero = gen.generate_equivalencies(100.0)
    >>> result_nonzero['trees_needed'] > 0
    True

    >>> result_scaled = gen.generate_equivalencies(1.0, scale=1000)
    >>> result_scaled['co2_total_g']
    1000.0
    """
```

**`scripts/calculate_emissions.py` — método `get_model()`:**
```python
def get_model(self, model_id: str):
    """
    Busca un modelo en el dataset por su ID.

    >>> calc = CarbonCalculator(use_realtime_carbon_intensity=False)
    >>> calc.get_model("nonexistent") is None
    True

    >>> model = calc.get_model("phi-2")
    >>> model is not None
    True
    """
```

**Comandos para ejecutar los doctests:**
```bash
# Módulo por módulo
pytest --doctest-modules scripts/environmental_labels.py -v
pytest --doctest-modules scripts/reports_generator.py -v
pytest --doctest-modules scripts/calculate_emissions.py -v

# Todos los doctests de scripts/ a la vez
pytest --doctest-modules scripts/ -v

# Junto con el resto de la suite
pytest testing/ --doctest-modules scripts/ -v
```

---

### 10. DECISIÓN SOBRE PRUEBAS DE INTERFAZ Y DE CARGA

#### 3.1. Pruebas de interfaz (UI/E2E) — NO SE RECOMIENDA IMPLEMENTAR

**Justificación de exclusión:**
- El frontend son ~285 KB de Vanilla JS en un solo archivo (`app.js`) sin framework (React, Vue, etc.), lo que hace que la automatización E2E (Selenium/Playwright) sea compleja de mantener y frágil ante cambios CSS
- El proyecto es un TFG con un solo desarrollador, y el ROI de tests E2E para una SPA relativamente simple no justifica la inversión temporal
- La cobertura funcional del frontend queda cubierta implícitamente por los tests de integración de la API (el frontend es un consumidor de la API)
- **Alternativa recomendada**: Describir en la memoria un plan de pruebas manuales exploratorias del frontend (checklist de funcionalidades a verificar manualmente), lo cual es más realista para el alcance del TFG

#### 3.2. Pruebas de carga — NO SE RECOMIENDA IMPLEMENTAR

**Justificación de exclusión:**
- La aplicación es una herramienta de consulta individual (un usuario calcula su impacto), no un servicio de alta concurrencia
- El despliegue previsto es local/académico (no hay requisito de escalabilidad a miles de usuarios concurrentes)
- Las pruebas de carga requieren infraestructura adicional (Locust, k6, JMeter) desproporcionada para el alcance del TFG
- **Alternativa**: Mencionar en la memoria que se ha medido el tiempo de respuesta de una consulta típica (~50-200ms) como métrica de rendimiento suficiente para el contexto académico

---

### 11. CONFIGURACIÓN

#### `testing/conftest.py`

Debe contener:

```python
import pytest
import sys
import os

# Ajustar paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from app import create_app
from scripts.calculate_emissions import CarbonCalculator, EmissionResult
from scripts.environmental_labels import get_environmental_label, get_label_scale, get_percentile
from scripts.reports_generator import ReportGenerator
from app.services.calculator_service import CalculatorService
from app.services.report_service import ReportService


@pytest.fixture(scope="session")
def app():
    """Crea la aplicación Flask para testing."""
    app = create_app()
    app.config['TESTING'] = True
    return app


@pytest.fixture(scope="session")
def client(app):
    """Cliente de test Flask."""
    return app.test_client()


@pytest.fixture(scope="session")
def calculator():
    """Instancia del motor de cálculo (carga datasets una sola vez)."""
    return CarbonCalculator(use_realtime_carbon_intensity=False)


@pytest.fixture
def sample_params():
    """Parámetros de ejemplo para una consulta típica."""
    return {
        "model_id": "gpt-4",
        "data_center_id": "aws-us-east-1",
        "device_id": "macbook-pro-m3",
        "network_id": "wifi_5ghz",
        "user_country": "ES",
        "request_type": "chat_simple",
        "inference_processor": "auto",
        "utilization": 0.7,
    }


@pytest.fixture
def sample_result(calculator, sample_params):
    """Resultado precalculado para reutilizar en tests."""
    return calculator.calculate_emissions(**sample_params)


@pytest.fixture
def report_generator(calculator):
    """Generador de reportes con datos del calculator."""
    return ReportGenerator(models_df=calculator.models_df)


@pytest.fixture(scope="session")
def all_model_ids(calculator):
    """Lista de todos los model_id del dataset real."""
    return calculator.models_df['model_id'].tolist()


@pytest.fixture(scope="session")
def all_dc_ids(calculator):
    """Lista de todos los dc_id del dataset real."""
    return calculator.data_centers_df['dc_id'].tolist()


@pytest.fixture(scope="session")
def all_device_ids(calculator):
    """Lista de todos los device_id del dataset real."""
    return calculator.devices_df['device_id'].tolist()


@pytest.fixture(scope="session")
def all_network_ids(calculator):
    """Lista de todos los network_type del dataset real."""
    return calculator.network_df['network_type'].tolist()


@pytest.fixture
def sample_custom_model():
    """Modelo personalizado mínimo para tests de entidades custom."""
    return {
        "model_name": "Custom Test Model",
        "num_parameters": 7e9,
        "energy_wh_per_1k_tokens": 0.05,
        "latency_ms_per_token": 10.0,
        "context_window": 4096,
        "max_output_tokens": 1024,
        "typical_request_type": "chat_simple",
    }


@pytest.fixture
def sample_custom_dc():
    """Datacenter personalizado mínimo para tests de custom DC."""
    return {
        "provider_name": "Custom DC",
        "region": "eu-test",
        "country_code": "ES",
        "pue": 1.3,
        "provider_renewable_pct": 50.0,
    }


@pytest.fixture
def sample_custom_device():
    """Dispositivo personalizado mínimo para tests de custom device."""
    return {
        "device_name": "Custom Device",
        "device_type": "laptop",
        "inference_cpu_watts": 45.0,
        "inference_gpu_watts": 0.0,
        "inference_npu_watts": 0.0,
        "system_idle_watts": 10.0,
        "has_npu": False,
        "primary_inference_target": "cpu",
    }


@pytest.fixture
def boundary_params_base(sample_params):
    """Copia de sample_params para modificar en tests de casos límite."""
    return dict(sample_params)
```

#### `testing/pytest.ini`

```ini
[pytest]
testpaths = testing
python_files = test_*.py
python_classes = Test*
python_functions = test_*
markers =
    unit: Pruebas unitarias (sin I/O externo)
    integration: Pruebas de integración (requieren datasets y/o Flask app)
    regression: Pruebas de regresión (anclan valores conocidos entre versiones)
    validation: Pruebas de validación matemática y calidad de datos
    boundary: Pruebas de casos límite y entradas extremas
    parametrized: Pruebas parametrizadas exhaustivas (muchos casos)
    performance: Pruebas de rendimiento y timing
    slow: Pruebas lentas que tardan >5s (carga de muchas combinaciones)
addopts = -v --tb=short -ra
# Para ejecutar solo tests rápidos (exclude slow):
# pytest testing/ -m "not slow" -v
```

---

### 12. INSTRUCCIONES FINALES PARA LA GENERACIÓN

1. **Usa pytest** como framework, con fixtures del `conftest.py` proporcionado
2. **NUNCA hagas llamadas reales** a la API de Electricity Maps — usa `unittest.mock.patch` o `pytest-mock`
3. **Los IDs de entidades reales** que puedes usar en tests: consulta los CSVs del proyecto para obtener IDs válidos (gpt-4, aws-us-east-1, iphone-15-pro, wifi_5ghz, etc.)
4. **Usa los marcadores** `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.regression`, `@pytest.mark.validation`, `@pytest.mark.boundary`, `@pytest.mark.parametrized`, `@pytest.mark.performance`, `@pytest.mark.slow` para clasificar cada test
5. **Cada test debe tener un docstring** explicando qué verifica y por qué es importante
6. **Los asserts deben ser específicos**: no solo `assert result`, sino `assert result.co2_total_g > 0`
7. **Para tests de proporcionalidad**, usa `pytest.approx()` con tolerancia adecuada: `rel=0.05` (5%) para relaciones físicas, `rel=0.001` para igualdades matemáticas exactas, `abs=1e-12` para identidades de punto flotante
8. **Para tests de API**, usa `client.get()` y `client.post()` de Flask
9. **Para tests de regresión**: al inicio de `test_calculation_stability.py`, añade una sección `# === BASELINE VALUES ===` con un comentario indicando cómo generarlos:
   ```python
   # Para generar los valores de referencia, ejecutar una vez:
   # python -c "from scripts.calculate_emissions import CarbonCalculator; ..."
   # y copiar los resultados como constantes.
   REF_GPT4_AWS_MACBOOK_WIFI_CHAT_CO2 = None  # RELLENAR al generar
   ```
10. **Para tests de fórmulas matemáticas**: incluir siempre en el docstring el cálculo manual completo con todas las constantes, unidades y pasos intermedios, para que un revisor académico pueda verificarlo sin ejecutar el código
11. **Para tests parametrizados**: usar `product()` de `itertools` para combinaciones cruzadas; comenzar con subconjuntos pequeños para validar el patrón antes de ampliar a todos los IDs del CSV
12. **Para tests de timing**: usar `time.perf_counter()` para medición de alta resolución; si `pytest-benchmark` está disponible, usarlo para obtener estadísticas (min/media/max); añadir el umbral como constante documentada al inicio del fichero
13. **Para doctests**: verificar que los ejemplos del docstring se ejecutan `pytest --doctest-modules scripts/` antes de entregarlos; los doctests no deben depender de red ni de la API externa
14. **Genera TODOS los archivos completos**, no fragmentos. Cada archivo debe ser ejecutable con `pytest testing/unit/test_X.py`
15. **Incluye al final** un resumen de cobertura esperada y los comandos para ejecutar:
    - `pytest testing/unit/ -m "not slow" -v` → Solo unitarias rápidas
    - `pytest testing/integration/ -v` → Solo integración
    - `pytest testing/regression/ -v` → Solo regresión
    - `pytest testing/validation/ -v` → Solo validación de fórmulas y calidad
    - `pytest testing/performance/ -v` → Solo rendimiento
    - `pytest testing/ -m "not slow" -v` → Suite completa sin tests lentos (<1 min)
    - `pytest testing/ -v` → Suite completa incluyendo lento (~5 min)
    - `pytest testing/ --doctest-modules scripts/ -v` → Todo + doctests
    - `pytest testing/ -v --co` → Listar todos los tests sin ejecutar

---

### 13. MÉTRICAS ESPERADAS

| Tipo | Fichero(s) | N.º tests | Cobertura objetivo | Tiempo |
|------|------------|------------|-------------------|--------|
| Unitarias (PU-01…06) | `unit/test_*.py` (6 ficheros) | ~87 | >85% lógica de negocio | <10 s |
| Casos límite | `unit/test_boundary_edge_cases.py` | ~18 | Robustez ante entradas extremas | <5 s |
| Parametrizadas | `unit/test_parametrized_combinations.py` | ~10 def. → ~4000+ casos | Todas las combinaciones clave | ~120 s |
| Integración (PI-01…04) | `integration/test_*.py` (4 ficheros) | ~49 | Flujo completo + integridad CSV | <30 s |
| Regresión | `regression/test_calculation_stability.py` | ~15 | Estabilidad entre versiones | <15 s |
| Validación fórmulas | `validation/test_formula_accuracy.py` | ~15 | Exactitud matemática (CRÍTICO) | <5 s |
| Calidad de datos | `validation/test_data_quality.py` | ~10 | Distribución estadística | <20 s |
| Rendimiento/Timing | `performance/test_timing.py` | ~5 | SLAs de velocidad | <30 s |
| Doctests | `scripts/*.py` (inline) | ~10 | Documentación verificada | <5 s |
| **TOTAL (sin slow)** | | **~209** | **>85% global del backend** | **<2 min** |
| **TOTAL (con slow)** | | **~209 + ~4000 param** | **>90% global del backend** | **~5 min** |

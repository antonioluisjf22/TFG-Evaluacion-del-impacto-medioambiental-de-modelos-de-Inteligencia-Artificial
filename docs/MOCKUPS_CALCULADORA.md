# 🎨 MOCKUPS DE LA CALCULADORA DE CARBONO

**Documento**: Diagramas, flujos y mockups del funcionamiento de la calculadora  
**Fecha**: 2026-02-06  
**Objetivo**: Visualizar la arquitectura y UX de la calculadora de emisiones

---

## 📋 TABLA DE CONTENIDOS

1. **Flujo General del Sistema** - Cómo funciona todo
2. **Arquitectura de Capas** - Componentes internos
3. **Flujo de Cálculo** - Paso a paso de la fórmula
4. **UX/UI Mockups** - Interfaces de usuario
5. **Tipos de Reportes** - Salidas disponibles

---

## 1️⃣ FLUJO GENERAL DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CALCULADORA DE CARBONO                             │
│                     (Carbon Emissions Calculator)                        │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   USUARIO    │
│ (Developer)  │
└──────┬───────┘
       │ Input: Parámetros de ejecución
       ▼
┌─────────────────────────────────────────────────┐
│ FORMULARIO / API INPUT                          │
├─────────────────────────────────────────────────┤
│ • Modelo IA: [GPT-4 / Llama-70b / Mistral]     │
│ • Tipo petición: [Chat / Clasificación / ...]  │
│ • Data Center: [AWS EU-West / GCP US-Central]  │
│ • Dispositivo: [Laptop / Mobile / Server]      │
│ • Utilización: [0.0 - 1.0]                     │
│ • Ubicación usuario: [País]                    │
│ • Queries/año (opcional): [0 - ∞]              │
└────────────┬────────────────────────────────────┘
             │ Valida entrada
             ▼
┌─────────────────────────────────────────────────┐
│ MOTOR DE CÁLCULO (calculate_emissions.py)       │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Carga datos:                                │
│     ├─ models.csv        (10 modelos)           │
│     ├─ data_centers.csv  (71 DCs)               │
│     ├─ devices.csv       (20 dispositivos)      │
│     ├─ network_energy_sources_2024.csv (6 tipos)│
│     └─ request_types.csv (13 tipos petición)    │
│                                                  │
│  2. Obtiene Carbon Intensity (CI):              │
│     ├─ Intenta API Electricity Maps (real)      │
│     ├─ Si falla → Fallback CSV local            │
│     ├─ Si no hay → Fallback por país            │
│     └─ Si no hay → Valor por defecto global     │
│                                                  │
│  3. Calcula:                                    │
│     ├─ Energía dispositivo (Wh)                 │
│     ├─ Energía red (Wh)                         │
│     ├─ Energía data center (Wh)                 │
│     └─ Energía TOTAL (Wh)                       │
│                                                  │
│  4. Convierte a CO2:                            │
│     ├─ CO2_dispositivo = E_device × CI_local    │
│     ├─ CO2_red = E_network × CI_local           │
│     ├─ CO2_datacenter = E_dc × CI_datacenter    │
│     └─ CO2_TOTAL (g)                            │
│                                                  │
│  5. Calcula breakdown %:                        │
│     ├─ % Dispositivo / Total                    │
│     ├─ % Red / Total                            │
│     ├─ % Data Center / Total                    │
│     └─ % Renovables disponible                  │
│                                                  │
└────────────┬────────────────────────────────────┘
             │ EmissionResult (dataclass)
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ GENERADOR DE REPORTES (reports_generator.py - NUEVO)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Toma EmissionResult y genera:                                   │
│                                                                  │
│ ┌─────────────────────┐    ┌──────────────────────┐             │
│ │ REPORTES ESTÁTICOS  │    │ REPORTES INTERACTIVOS│             │
│ ├─────────────────────┤    ├──────────────────────┤             │
│ │ • Pie Chart JSON    │    │ • Dashboard HTML     │             │
│ │ • Energy Label HTML │    │ • Simulador de comparaciones      │             │
│ │ • Tabla comparativa │    │ • Mapa interactivo   │             │
│ │ • PDF de impresión  │    │ • Análisis sensitiv. │             │
│ └─────────────────────┘    └──────────────────────┘             │
│                                                                  │
└────────────┬────────────────────────────────────────────────────┘
             │ JSON + HTML + PNG/PDF
             ▼
┌──────────────────────────┐
│   SALIDA AL USUARIO      │
├──────────────────────────┤
│ ✓ Visualización gráfica  │
│ ✓ Desglose por componentes  │
│ ✓ Comparativa por regiones  │
│ ✓ Números exactos        │
│ ✓ Simulación desituaciones        │
│ ✓ Equivalencias intuitivas
│ ✓ Recomendaciones       │
│ ✓ Etiqueta enérgica       │
│ ✓ Mapa interactivo con impacto por región       │
└──────────────────────────┘
```

---

## 2️⃣ ARQUITECTURA DE CAPAS

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND / API                            │
│  (Flask/FastAPI con templates HTML o API REST JSON)              │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                    CAPA 1: VALIDACIÓN                            │
│  - Valida entrada de usuario                                     │
│  - Verifica modelos, DCs, dispositivos existen                   │
│  - Normaliza formatos                                            │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│              CAPA 2: OBTENCIÓN DE CARBON INTENSITY              │
│  carbon_intensity_api.py                                         │
│  - Intenta Electricity Maps API (tiempo real)                    │
│  - Fallback 1: CSV local curado (71 DCs + 125 zonas)            │
│  - Fallback 2: Mapeo automático región → zona                    │
│  - Fallback 3: Valor por defecto global (450 gCO2/kWh)          │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                  CAPA 3: MOTOR DE CÁLCULO                        │
│  calculate_emissions.py                                          │
│  - Carga datasets (CSV)                                          │
│  - Aplica fórmulas de energía                                    │
│  - Convierte Wh → gCO2                                           │
│  - Output: EmissionResult                                        │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SALIDA FINAL AL USUARIO                        │
│  - Interfaces visuales para comprobación de datos                            │
│  - Interfaces interactivas para comparación de situaciones                    │
│  - PNG/PDF con reportes para descargar e imprimir                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ FLUJO DE CÁLCULO DETALLADO

### Paso 1: Cargar Datos Base

```
BÚSQUEDA EN CSVs (por parámetro):

🔍 Modelo: "GPT-4"
   → models.csv → "name" = "GPT-4"
   → Extrae: tokens_by_request_type (diccionario)
   → Extrae: inference_energy_cost_per_token (0.00512 Wh/token)
   → Extrae: latency_ms (800 ms)

   📍 ORIGEN DE ESTOS PARÁMETROS:
   
   • inference_energy_cost_per_token (0.00512 Wh/token):
     └─ Fuente: models.csv → columna "energy_wh_per_1k_tokens" 
     └─ Valor original para GPT-4: 0.0048 Wh/1k tokens
     └─ Cálculo: 0.0048 / 1000 = 0.0000048 Wh/token
     └─ Para petición típica de 150 tokens: 0.0000048 × 150 = 0.00072 Wh ≈ 0.00512 Wh/req
     └─ Basado en: Reportes de sostenibilidad de OpenAI (empírico/medido)
   
   • latency_ms (800 ms):
     └─ Fuente: models.csv → columna "latency_ms_per_token"
     └─ Valor original para GPT-4: 35.0 ms/token
     └─ Cálculo: 35 ms/token × ~150 tokens output = 5250 ms ≈ 800 ms promedio por batch
     └─ Basado en: Mediciones empíricas de latencia de API (tiempo real)

🔍 Tipo petición: "chat_simple"
   → request_types.csv → "type" = "chat_simple"
   → Extrae: tokens_input (50)
   → Extrae: tokens_output (100)
   → Extrae: tokens_total (150)

   📍 ORIGEN DE ESTOS PARÁMETROS:
   
   • tokens_input (50), tokens_output (100), tokens_total (150):
     └─ Fuente: request_types.csv → columnas "tokens_input_avg" y "tokens_output_avg"
     └─ Definición de "chat_simple": Pregunta-respuesta corta típica
     └─ Valores: 50 tokens promedio para entrada + 100 tokens promedio para salida
     └─ Cálculo: tokens_total = tokens_input (50) + tokens_output (100) = 150
     └─ Basado en: Análisis estadístico de patrones reales de uso de LLMs
     └─ Nota: Valores predefinidos por tipo, pero pueden ser sobrescritos por el usuario en calculate_emissions.py

🔍 Data Center: "AWS EU-West-1"
   → data_centers.csv → "name" = "AWS EU-West-1"
   → Extrae: country = "IE" (Irlanda)
   → Extrae: pue = 1.2 (Power Usage Effectiveness)
   → Extrae: renewable_percentage = 45%
   → Extrae: provider = "AWS"

🔍 Dispositivo: "MacBook Pro 16\""
   → devices.csv → "name" = "MacBook Pro"
   → Extrae: cpu_tdp_watts = 45W
   → Extrae: gpu_tdp_watts = 120W
   → Extrae: inference_cpu_watts = 15W
   → Extrae: inference_gpu_watts = 85W
   → Extrae: inference_npu_watts = 8W (si tiene NPU)
   → Extrae: idle_power_watts = 8W

🔍 Procesador de Inferencia: "CPU"
   → inference_processor = "cpu"
   → Selecciona: inference_cpu_watts = 15W ← USADO EN CÁLCULO
   → (Si fuera "GPU" → usaría inference_gpu_watts = 85W)
   → (Si fuera "NPU" → usaría inference_npu_watts = 8W)
   → (Si fuera "Auto" → detecta capability del dispositivo)

🔍 Tipo Red: "4G LTE"
   → network_energy_sources_2024.csv → "network_type" = "4G LTE"
   → Extrae: energy_kWh_per_MB = 0.006 kWh/MB
   → Extrae: energy_kWh_per_GB = 6.0 kWh/GB

   📍 ORIGEN DE ESTOS PARÁMETROS:
   
   • energy_kWh_per_MB (0.006 kWh/MB para 4G):
     └─ Fuente: GSMA Intelligence 2023, ITU-T L.1310 2022
     └─ Secundarias: Ericsson Mobility 2023, Nokia Research 2021
     └─ Rango total en dataset: 0.0004 - 0.030 kWh/MB (Fibra a Satélite LEO)
     └─ Basado en: Papers revisados por pares + informes industriales
     └─ Tipo: FUENTE DE DATOS VERIFICADA (derivado indirecto)
   
   • carbon_kg_per_GB (v2.1 - calculado dinámicamente):
     └─ Significado: CO₂ por GB calculado en runtime con CI del país del usuario
     └─ Fórmula (v2.1): carbon_kg_per_GB = energy_kWh_per_GB × CI_user_country / 1000
     └─ Ejemplo para 4G LTE (6.0 kWh/GB):
        ├─ España (CI=145 gCO₂/kWh) → 0.87 kg/GB
        ├─ Francia (CI=50 gCO₂/kWh) → 0.30 kg/GB
        ├─ Alemania (CI=350 gCO₂/kWh) → 2.10 kg/GB
        └─ USA (CI=380 gCO₂/kWh) → 2.28 kg/GB
     └─ Fuente CI: Electricity Maps API (tiempo real)
```

### Paso 2: Obtener Carbon Intensity (CI)

```
┌─ ¿Proveedor cloud conocido? (AWS, GCP, Azure)
│   └─ Sí → carbon_intensity_api.py
│      └─ Llama API: /v3/carbon-intensity/latest?dataCenterProvider=aws&dataCenterRegion=eu-west-1
│         └─ Respuesta: {"carbonIntensity": 165} gCO2/kWh
│         └─ Guardar en cache (reducir llamadas)
│
└─ No → Fallback 1: Búsqueda CSV local
   └─ Mapear provider + región → CSV carbon_intensity_datacenters.csv
      └─ Encontrado: 165 gCO2/kWh
      
      └─ No encontrado → Fallback 2: Mapeo automático zona
         └─ DATACENTER_REGION_TO_ZONE: "eu-west-1" → "IE"
         └─ Buscar CI promedio para Irlanda: 350 gCO2/kWh
         
         └─ No encontrado → Fallback 3: Por país
            └─ COUNTRY_TO_ZONE: país del usuario (ej: España)
            └─ Obtener CI para España: 145 gCO2/kWh
            
            └─ No encontrado → Fallback 4: Global
               └─ DEFAULT_CARBON_INTENSITY["GLOBAL"] = 450 gCO2/kWh
```

### Paso 2.5: Seleccionar Procesador (CPU/GPU/NPU) ⚙️

---

#### 📊 ¿Qué es TOPS/W? (Métrica de Eficiencia Energética)

```
TOPS/W = Tera Operations Per Watt
═════════════════════════════════════════════════════════

Desglose:
  • TOPS = Trillion Operations Per Second (billones de operaciones por segundo)
  • W = Watts (consumo de energía)
  • TOPS/W = Operaciones que puede hacer por cada vatio de energía consumido

INTERPRETACIÓN:
───────────────
Mayor TOPS/W = Procesador más eficiente energéticamente

EJEMPLOS:
─────────
┌─────────────────────┬──────────┬─────────────────────────────┐
│ Procesador          │ TOPS/W   │ Significado                 │
├─────────────────────┼──────────┼─────────────────────────────┤
│ CPU tradicional      │ 0.5-2    │ Consume mucha energía       │
│ GPU NVIDIA A100      │ 2-10     │ Más eficiente, buena para IA│
│ Apple Neural Engine  │ 10-50    │ Muy eficiente, optimizado   │
│ TPU v4 (Google)      │ 15-30    │ Especial para LLMs, muy eff.│
│ Qualcomm Snapdragon  │ 20-100   │ NPU muy eficiente en phones │
│ x86 CPU Intel        │ 0.3-1    │ Menos eficiente            │
└─────────────────────┴──────────┴─────────────────────────────┘

IMPLICACIÓN PRÁCTICA:
─────────────────────
Si un problema requiere 1 TOPS de computación:
  • CPU @ 0.5 TOPS/W  → 2W de consumo
  • GPU @ 10 TOPS/W   → 0.1W de consumo  (20x más eficiente)
  • NPU @ 50 TOPS/W   → 0.02W de consumo (100x más eficiente)

POR QUÉ IMPORTA:
────────────────
  → Mismo resultado, menos energía = menos CO2
  → NPUs optimizados para IA pueden procesar la misma solicitud
     de LLM con 2.5-10x menos energía que CPU/GPU genéricos
```

---

```
╔═══════════════════════════════════════════════════════════════╗
║  DECISIÓN CRÍTICA: ¿QUÉ PROCESADOR USAR?                    ║
╚═══════════════════════════════════════════════════════════════╝

Usuario selecciona: inference_processor = "CPU"

OPCIONES DISPONIBLES:
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│ 1️⃣ CPU (Procesador Central)                                  │
│   └─ Eficiencia: 0.5-2 TOPS/W (menos eficiente)              │
│   └─ Potencia típica: 10-45W                                 │
│   └─ Ventajas: Disponible en todos los dispositivos          │
│   └─ Desventajas: Lento para LLMs, consume más energía       │
│   └─ Mejor para: Aplicaciones ligeras, inferencía simple     │
│                                                               │
│ 2️⃣ GPU (Tarjeta Gráfica - NVIDIA, AMD)                      │
│   └─ Eficiencia: 2-10 TOPS/W (buena)                         │
│   └─ Potencia típica: 80-300W                                │
│   └─ Ventajas: Muy rápido, bueno para LLMs                   │
│   └─ Desventajas: Consume más energía, no disponible siempre │
│   └─ Mejor para: Modelos grandes, latencia crítica           │
│                                                               │
│ 3️⃣ NPU (Neural Processing Unit - Acelerador IA) [1]            │
│   └─ Eficiencia: 10-50 TOPS/W (EXCELENTE)                    │
│   └─ Potencia típica: 3-20W                                  │
│   └─ Ventajas: Muy eficiente, optimizado para IA             │
│   └─ Desventajas: No disponible en todos los dispositivos    │
│   └─ Mejor para: Phones, laptops con NPU, máxima eficiencia  │
│                                                               │
│ 4️⃣ Auto (Detectar automáticamente) ⚡                       │
│   └─ Sistema selecciona automáticamente basándose en:        │
│                                                               │
│   🔍 PROCESO DE DETECCIÓN:                                   │
│   ════════════════════════════════════════════════            │
│                                                               │
│   1️⃣ Lee de devices.csv la columna "primary_inference_target"  │
│      (campo que indica el procesador recomendado del device hardcodeado en extract_devices.py)   │
│      Ejemplos:                                                │
│      ├─ flagship_smartphone → "npu"  (Qualcomm Snapdragon)    │
│      ├─ macbook_pro_16 → "gpu"  (Apple Silicon GPU)           │
│      ├─ laptop_windows → "cpu"  (sin GPU/NPU)                 │
│      └─ server_gpu_cluster → "gpu"  (NVIDIA A100)  
|      Lógica de selección:       
NPU: Dispositivos con procesador especializado optimizado para IA (iPhones, algunos Android)
GPU: Dispositivos donde la GPU es más eficiente (algunas laptops, desktops)
CPU: Dispositivos sin GPU/NPU dedicada o donde el CPU es la opción estándar           
│                                                               │
│   2️⃣ Valida que el procesador esté disponible:               │
│      ├─ Verifica gpu_tdp_watts > 0 (indica presencia GPU)     │
│      ├─ Verifica has_npu = True (indica presencia NPU)        │
│      └─ CPU siempre disponible como fallback                  │
│                                                               │
│   3️⃣ Si el procesador no está disponible → vuelve a CPU      │
│      Ejemplo: Si selecciona "npu" pero has_npu=False          │
│               → automáticamente cae a "cpu"                   │
│                                                               │
│   💡 VENTAJA: Los desarrolladores no necesitan saber qué     │
│      procesadores tiene cada dispositivo. El sistema lo      │
│      detecta automáticamente del CSV.                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘

IMPACTO REAL EN EJEMPLO:

MacBook Pro 16" corriendo GPT-4 (Chat Simple):

╔─────────────┬──────────┬──────────┬────────────────┐
║ Procesador  │ Potencia │ E_device │ CO2_device     ║
╠─────────────┼──────────┼──────────┼────────────────╣
║ CPU         │ 15W      │ 8.4 Wh   │ 1.218 gCO2     ║ ← Actual
║ GPU         │ 85W      │ 47.6 Wh  │ 6.902 gCO2     ║ (5.7x más)
║ NPU         │ 8W       │ 4.48 Wh  │ 0.650 gCO2     ║ (46% menos)
╚─────────────┴──────────┴──────────┴────────────────╝

Nota: NPU no disponible en MacBook Pro actual (futuro)

DECISIÓN DEL USUARIO:
┌──────────────────────────────────────────────────────────────┐
│ En el formulario selecciona:                                  │
│                                                               │
│ ⚙️ Procesador de Inferencia: [▼ CPU ▼]                      │
│   ├─ CPU (Procesador Central)   ← SELECCIONADO               │
│   ├─ GPU (Tarjeta Gráfica)                                   │
│   ├─ NPU (Acelerador de IA)                                  │
│   └─ Auto (Detectar automáticamente)                         │
│                                                               │
│ → Sistema usa: inference_cpu_watts = 15W                     │
│ → Si hubiera seleccionado GPU: inference_gpu_watts = 85W     │
│ → Si hubiera seleccionado NPU: inference_npu_watts = ...     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Paso 3: Calcular Energía

```
═══════════════════════════════════════════════════════════

FÓRMULA 1: ENERGÍA DEL DISPOSITIVO (MODELO DINÁMICO)
─────────────────────────────────────────────────────

1️⃣ CALCULAR POTENCIA REAL (en vatios):
   P_real = P_idle + (P_max_inference - P_idle) × U
   
   Donde:
     P_idle = consumo del dispositivo en reposo = 5 W
     P_max_inference = potencia máx del procesador durante inferencia:
                       ├─ Si CPU: inference_cpu_watts = 15 W
                       ├─ Si GPU: inference_gpu_watts = 85 W  
                       └─ Si NPU: inference_npu_watts = 8 W
     U = utilization = 0.7 (factor dinámico, parámetro usuario)
   
   P_real = 5 + (15 - 5) × 0.7 = 5 + 7 = 12 W

2️⃣ CALCULAR ENERGÍA (en Wh):
   E_device = P_real × (t_latency / 3600)
   
   Donde:
     t_latency = 8 segundos (tiempo total de inferencia)
     Conversión: 8 seg / 3600 = 0.00222 horas
   
   E_device = 12 W × 0.00222 h = 0.0267 Wh

NOTA IMPORTANTE:
  • El modelo DINÁMICO calcula potencia real según utilización
  • Diferencia con CodeCarbon/ML_CO2: ellos asumen U=1.0 siempre
  • Resultado: estimaciones más precisas del consumo real
  • La CPU seleccionada (CPU/GPU/NPU) afecta directamente al CO2

Comparación con otros procesadores (mismo dispositivo, utilization=0.7):
  Si CPU:  5 + (15-5)×0.7 = 12 W   → 12×0.00222 = 0.0267 Wh
  Si GPU:  5 + (85-5)×0.7 = 61 W   → 61×0.00222 = 0.135 Wh  (5x más)
  Si NPU:  5 + (8-5)×0.7  = 7.1 W  → 7.1×0.00222 = 0.0158 Wh (40% menos)

═══════════════════════════════════════════════════════════

FÓRMULA 2: ENERGÍA DE LA RED
────────────────────────────

E_network = energy_per_mb × data_transferred_mb

Donde:
  data_transferred_mb = parámetro de entrada (parámetro usuario)
                      Representa los MB transferidos durante la consulta
                      Por defecto: 0.5 MB
           
  energy_kWh_per_MB = consumo de energía por MB transferido (de network_energy_sources_2024.csv)
                Ejemplos por tipo de red:
                ├─ Fiber FTTH:     0.0004 kWh/MB (más eficiente)
                ├─ WiFi 6:         0.0008 kWh/MB
                ├─ 4G LTE:         0.006 kWh/MB
                ├─ 5G NSA:         0.004 kWh/MB (mejor que 4G)
                └─ WiFi 6E:        0.0007 kWh/MB
  
  Para 4G: E_network = 0.006 kWh/MB × 0.00195 MB × 1000 = 0.0117 Wh
           ↑              ↑           ↑             ↑
        Wh           kWh/MB       data_mb      kWh→Wh

CO2_network se calcula con CI dinámico del país del usuario (v2.1):
  energy_kWh_per_GB = energy_kWh_per_MB × 1000 (de network_energy_sources_2024.csv)
  ci_local = get_carbon_intensity(user_country) (de Electricity Maps API, gCO₂/kWh)
  carbon_kg_per_gb = energy_kWh_per_GB × ci_local / 1000
  data_transferred_gb = data_transferred_mb / 1000
  co2_network_g = data_transferred_gb × carbon_kg_per_gb × 1000

═══════════════════════════════════════════════════════════

FÓRMULA 3: ENERGÍA DEL DATA CENTER
───────────────────────────────────

1️⃣ CALCULAR ENERGÍA DE COMPUTE (en Wh):
   E_compute = (tokens_processed / 1000) × energy_wh_per_1k_tokens
   
   Donde:
     tokens_processed = tokens_input + tokens_output = 50 + 100 = 150
     energy_wh_per_1k_tokens = consumo del modelo por 1000 tokens (de models.csv)
                             Ejemplo: GPT-4 ≈ 0.004 Wh/1k tokens
   
   E_compute = (150 / 1000) × 0.004 = 0.0006 Wh

2️⃣ APLICAR PUE (Power Usage Effectiveness):
   E_datacenter = E_compute × PUE
   
   PUE = 1 + infraestructura (cooling, pérdidas, etc.)
   Rango: 1.005 (datacenters ultra-eficientes) a 1.46 (promedio mundial)
   Uso típico: 1.15 - 1.2
   
   E_datacenter = 0.0006 Wh × 1.2 = 0.00072 Wh

NOTA IMPORTANTE:
  • PUE multiplica la energía (NO divide por utilization)
  • Utilization afecta al CPU/GPU del dispositivo, NO al datacenter
  • Valor bajo PUE = datacenter eficiente en refrigeración
  • El PUE ya incluye el factor de utilización del datacenter

═══════════════════════════════════════════════════════════

TOTAL ENERGÍA:
──────────────

E_total = E_device + E_network + E_datacenter
        = 0.0267 + 0.001 + 0.00072
        = 0.0284 Wh ≈ 0.03 Wh

Breakdown por componente:
  Dispositivo:  0.0267 Wh  (94% del consumo)
  Red:          0.001 Wh   (3%)
  Data Center:  0.00072 Wh (3%)
```

### Paso 4: Convertir a CO2

```
═══════════════════════════════════════════════════════════

CO2_DISPOSITIVO:
────────────────

CI_local = 145 gCO2/kWh (para España, usuario local)

CO2_device = E_device × CI_local / 1000
           = 0.0267 Wh × 145 gCO2/kWh / 1000
           = 0.00387 gCO2
             ↑
          (divide por 1000 porque Wh → kWh)

═══════════════════════════════════════════════════════════

CO2_RED:
────────

CO2_network = E_network × CI_local / 1000
            = 0.001 Wh × 145 gCO2/kWh / 1000
            = 0.000145 gCO2

═══════════════════════════════════════════════════════════

CO2_DATA CENTER:
─────────────────

CI_datacenter = 165 gCO2/kWh (AWS EU-West, Electricity Maps)

CO2_datacenter = E_datacenter × CI_datacenter / 1000
               = 0.00072 Wh × 165 gCO2/kWh / 1000
               = 0.000119 gCO2

═══════════════════════════════════════════════════════════

CO2_TOTAL:
──────────

CO2_total = CO2_device + CO2_network + CO2_datacenter
          = 0.00387 + 0.000145 + 0.000119
          = 0.00413 gCO2 ≈ 4.13 mgCO2

═══════════════════════════════════════════════════════════
```

### Paso 5: Calcular Breakdown %

```
Breakdown de CO2:

┌──────────────────────────────────────┐
│ Total: 0.00413 gCO2 (4.13 mgCO2)     │
├──────────────────────────────────────┤
│                                      │
│ Dispositivo:   0.00387 / 0.00413 = 93.7% │
│ Red:           0.000145 / 0.00413 = 3.5%  │
│ Data Center:   0.000119 / 0.00413 = 2.8%  │
│                                      │
│ Renovables:    45% (del DC)          │
│                                      │
└──────────────────────────────────────┘

Interpretación:
- El dispositivo local domina (84.9%)
  → La elección del hardware cliente es crítica
  
- Data center contribuye poco (15.1%)
  → Pero con alto impacto ambiental si es grid "sucio"
  
- Red es negligible (≈0%)
  → No es cuello de botella energético
```

---

## 4️⃣ MOCKUPS DE INTERFAZ DE USUARIO

**7 pantallas interactivas para explorar el impacto ambiental:**

1. **PANTALLA 1: Formulario de entrada** - Configurar parámetros
2. **PANTALLA 2: Resultados compactos** - Vista rápida de CO2 + energía
3. **PANTALLA 3: Dashboard detallado** - Análisis profundo con gráficos
4. **PANTALLA 4: Comparador** - Diferentes modelos y escenarios (¿Qué hubiera pasado si...?)
5. **PANTALLA 5: Impacto anual** - Proyecciones de producción (queries/día × 365)
6. **PANTALLA 6: Energy Label** - Etiqueta de eficiencia (Clase A-F)
7. **PANTALLA 7: Mapa Global** - Intensidad carbono por región y data centers

---

### PANTALLA 1: FORMULARIO DE ENTRADA

```
╔════════════════════════════════════════════════════════════════╗
║  🌍 CALCULADORA DE EMISIONES DE CARBONO PARA IA              ║
║  (Carbon Emissions Calculator for AI Inference)               ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  CONFIGURACIÓN DE PARÁMETROS                                  ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  1️⃣ MODELO DE IA                                              ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Selecciona modelo: [▼ GPT-4        ▼]                │   ║
║  │                    ├─ GPT-4                           │   ║
║  │                    ├─ Claude 2.0                      │   ║
║  │                    ├─ Llama 2-70b                     │   ║
║  │                    ├─ Mistral-7b                      │   ║
║  │                    ├─ BERT-base                       │   ║
║  │                    └─ [Ver todos (10)]                │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  2️⃣ TIPO DE PETICIÓN                                          ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ ¿Qué hace tu usuario? [▼ Chat Simple ▼]             │   ║
║  │                        ├─ Chat simple (50+100 tokens) │   ║
║  │                        ├─ Chat largo (500+1000)       │   ║
║  │                        ├─ Clasificación (50 tokens)   │   ║
║  │                        ├─ Resumen (200+300)           │   ║
║  │                        └─ [Ver todos (13)]            │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  3️⃣ DATA CENTER (INFRAESTRUCTURA)                             ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Dónde ejecutas: [▼ AWS EU-West-1 ▼]                 │   ║
║  │                 ├─ AWS US-East-1 (Virginia)          │   ║
║  │                 ├─ AWS EU-West-1 (Irlanda)           │   ║
║  │                 ├─ GCP US-Central                     │   ║
║  │                 ├─ Azure Westeurope                   │   ║
║  │                 └─ [Ver todos (71)]                  │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  4️⃣ DISPOSITIVO CLIENTE                                       ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Tu dispositivo: [▼ MacBook Pro 16\" ▼]               │   ║
║  │                 ├─ MacBook Pro 16\"                   │   ║
║  │                 ├─ Dell XPS 15                        │   ║
║  │                 ├─ iPhone 15 Pro                      │   ║
║  │                 ├─ Samsung S24                        │   ║
║  │                 └─ [Ver todos (20)]                  │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  5️⃣ PROCESADOR DE INFERENCIA (NUEVO)                          ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Tipo: [▼ CPU (Procesador Central) ▼]                │   ║
║  │       ├─ CPU (Procesador Central)                     │   ║
║  │       │  └─ 0.5-2 TOPS/W (menos eficiente)           │   ║
║  │       ├─ GPU (Tarjeta Gráfica)                        │   ║
║  │       │  └─ 2-10 TOPS/W (bueno para LLMs)             │   ║
║  │       ├─ NPU (Acelerador de IA)                       │   ║
║  │       │  └─ 10-50 TOPS/W (más eficiente)              │   ║
║  │       └─ Auto (Detectar automáticamente)              │   ║
║  │                                                        │   ║
║  │  Nota: Afecta directamente a potencia (Watts)         │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  6️⃣ TIPO DE RED                                               ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Conexión: [▼ 4G ▼]                                  │   ║
║  │          ├─ WiFi 6                                    │   ║
║  │          ├─ 4G LTE                                    │   ║
║  │          ├─ 5G                                        │   ║
║  │          └─ Cable (fibra óptica)                      │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║                                                                ║
║  7️⃣ UBICACIÓN DEL USUARIO (para CI local)                     ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ País: [▼ España ▼]                                  │   ║
║  │        (Para calcular CI de tu grid local)           │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  8️⃣ FACTOR DE UTILIZACIÓN (Opcional)                          ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Intensidad: [0─────●─────────────1]  0.7             │   ║
║  │            (Baja)                (Alta)              │   ║
║  │ Explicación: ¿Qué % del hardware se usa realmente?   │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  9️⃣ IMPACTO ANUAL (Opcional - para simulación)                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ ☐ Simular anual                                       │   ║
║  │   Queries por día: [___________] (ej: 1,000,000)     │   ║
║  │   Días operativos: [365]                              │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │  [🔄 CALCULAR EMISIONES]    [↻ Limpiar]              │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### PANTALLA 2: RESULTADOS - VISTA COMPACTA

```
╔════════════════════════════════════════════════════════════════╗
║  ✅ RESULTADO: GPT-4 en AWS EU-West-1                         ║
║     Chat Simple | MacBook Pro | 4G | España                   ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  📊 EMISIONES POR CONSULTA                                     ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ CO2 TOTAL: 1.435 gCO2 (≈ andar 5 metros en coche)    │  ║
║  │                                                         │  ║
║  │ Desglose:                                               │  ║
║  │ ├─ 📱 Dispositivo:    1.218 gCO2 (84.9%)   ████████   │  ║
║  │ ├─ 🌐 Red:            0.00 gCO2 (0.0%)     ░░░░░░░░   │  ║
║  │ └─ 🖥️  Data Center:    0.217 gCO2 (15.1%)  █░░░░░░░░   │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                ║
║  ⚡ ENERGÍA CONSUMIDA DESGLOSADA                                      ║
║  ────────────────────────────────────────────────────────────  ║
║  Total: 9.72 Wh                                                ║
║  - Dispositivo:  8.4 Wh                                        ║
║  - Red:          0.00045 Wh                                    ║
║  - Data Center:  1.317 Wh                                      ║
║                                                                ║
║  🌿 RENOVABLES                                                 ║
║  ────────────────────────────────────────────────────────────  ║
║  AWS EU-West (Irlanda): 45% renovable                          ║
║  Tu grid local (España): 45% renovable                         ║
║                                                                ║
║  ────────────────────────────────────────────────────────────  ║
║  [📊 Ver gráficos]  [📋 Tabla completa]  [💾 Descargar PDF] │
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### PANTALLA 3: DASHBOARD DETALLADO

```
╔════════════════════════════════════════════════════════════════╗
║  📊 DASHBOARD COMPLETO - Análisis Detallado                   ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  [📈 Gráficas] [📋 Tablas] [🔄 Comparativas] [🌍 Mapa]      ║
║                                                                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │          PIE CHART: Breakdown de CO2                  │   ║
║  │                                                        │   ║
║  │              ╔═══════════════╗                         │   ║
║  │            /                   \                       │   ║
║  │          /      Data Center     \                      │   ║
║  │        /           15.1%          \                    │   ║
║  │       |                             |                  │   ║
║  │       |       CO2: 1.435 gCO2      |                  │   ║
║  │       |                             |                  │   ║
║  │        \                           /                   │   ║
║  │          \     Dispositivo      /                      │   ║
║  │            \     84.9%        /                        │   ║
║  │              ╚════════════════╝                        │   ║
║  │                 Red: ≈0%                               │   ║
║  │                                                        │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │   TARJETA ENERGÉTICA (Energy Label)                  │   ║
║  │                                                        │   ║
║  │   ╔════════════════════════════════════╗              │   ║
║  │   ║         GPT-4                      ║              │   ║
║  │   ║     Chat Simple                    ║              │   ║
║  │   ║                                    ║              │   ║
║  │   ║    ╔════════════════╗              ║              │   ║
║  │   ║    ║   EFICIENCIA   ║              ║              │   ║
║  │   ║    ║       B        ║              ║              │   ║
║  │   ║    ╚════════════════╝              ║              │   ║
║  │   ║                                    ║              │   ║
║  │   ║  CO2: 1.435 gCO2                  ║              │   ║
║  │   ║  Energía: 9.72 Wh                 ║              │   ║
║  │   ║  Renovables: 45%                  ║              │   ║
║  │   ║                                    ║              │   ║
║  │   ╚════════════════════════════════════╝              │   ║
║  │                                                        │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │  COMPARATIVAS: Otros modelos (misma configuración)   │   ║
║  │                                                        │   ║
║  │  Modelo      │ CO2 (g)  │ Energía (Wh) │ vs GPT-4   │   ║
║  │  ─────────────┼──────────┼──────────────┼────────────│   ║
║  │  Mistral-7b  │ 0.11     │ 1.17         │ -92% ✓✓✓   │   ║
║  │  Llama-70b   │ 0.45     │ 4.56         │ -68% ✓✓    │   ║
║  │  Claude-2    │ 0.32     │ 3.28         │ -77% ✓✓    │   ║
║  │  GPT-4 [*]   │ 1.435    │ 9.72         │ Baseline   │   ║
║  │  PaLM-2      │ 0.82     │ 8.32         │ -43% ✓     │   ║
║  │                                                        │   ║
║  │  Recomendación: Usa Mistral-7b (92% menos CO2)      │   ║
║  │                                                        │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │  EQUIVALENCIAS INTUITIVAS                            │   ║
║  │                                                        │   ║
║  │  Tus emisiones (1.435 gCO2) equivalen a:             │   ║
║  │  • Andar 5.7 metros en coche 🚗                       │   ║
║  │  • Encender un bombilla LED 10 segundos 💡            │   ║
║  │  • 1/350 de una taza de café ☕                        │   ║
║  │                                                        │   ║
║  │  Si ejecutas 1M de queries/año:                       │   ║
║  │  • CO2 anual: 1,435 kg ≈ 1.4 toneladas               │   ║
║  │  • Árboles necesarios: 57-71 árboles 🌲             │   ║
║  │  • Vuelos transatlánticos: 2 vuelos ✈️              │   ║
║  │  • Coches conducidos: 3 años 🚗                       │   ║
║  │                                                        │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### PANTALLA 4: COMPARADOR DE MÚLTIPLES ESCENARIOS

```
╔════════════════════════════════════════════════════════════════╗
║  🔄 SIMULADOR INTERACTIVO DE COMPARATIVAS DE DIFERENTES ESCENARIOS: Cómo cambia CO2 según decisiones               ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ESCENARIO 1: Cambiando el MODELO                              ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  Modelo         │ CO2 (g) │ Energía (Wh) │ Impacto anual    │  ║
║  ────────────────┼─────────┼──────────────┼──────────────────│  ║
║  GPT-4          │ 1.435   │ 9.72         │ 1,435 kg         │  ║
║  │ Cambio: -92% ↓                                             │  ║
║  Mistral-7b     │ 0.115   │ 0.78         │ 115 kg ✓✓✓       │  ║
║                                                                ║
║  Ahorro anual: 1,320 kg CO2 = 52-66 árboles                   ║
║                                                                ║
║  ────────────────────────────────────────────────────────────  ║
║  ESCENARIO 2: Cambiando el DATA CENTER                         ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  Data Center      │ CI (g) │ CO2 (g) │ Renovables       │    ║
║  ─────────────────┼────────┼─────────┼──────────────────│    ║
║  AWS Virginia     │ 498    │ 0.324   │ 18% ✗            │    ║
║  │ Cambio: -67% ↓                                            │    ║
║  AWS Oregon       │ 77     │ 0.107   │ 92% ✓✓✓          │    ║
║                                                                ║
║  Ahorro anual: 217 kg CO2 (si 1M queries/año)                 ║
║                                                                ║
║  ────────────────────────────────────────────────────────────  ║
║  ESCENARIO 3: Cambiando el DISPOSITIVO                         ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  Dispositivo       │ CO2 (g) │ Energía (Wh) │ CPU TDP       │  ║
║  ─────────────────┼─────────┼──────────────┼───────────────│  ║
║  MacBook Pro 16   │ 1.435   │ 9.72         │ 45W           │  ║
║  │ Cambio: -40% ↓                                            │  ║
║  iPhone 15 Pro    │ 0.861   │ 5.84         │ 27W ✓         │  ║
║                                                                ║
║  ────────────────────────────────────────────────────────────  ║
║  ANÁLISIS GLOBAL: ¿Qué factor importa más?                    ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  Factor           │ Impacto en CO2                             ║
║  ──────────────────┼──────────────────────────────────────────│  ║
║  Modelo IA         │ ████████████████████ 92%  [Dominante]  │  ║
║  Data Center       │ ███████░░░░░░░░░░░░░░ 67%  [Alto]      │  ║
║  Dispositivo       │ ████████░░░░░░░░░░░░░ 40%  [Medio]     │  ║
║  Red               │ ░░░░░░░░░░░░░░░░░░░░░  3%  [Bajo]      │  ║
║                                                                ║
║  💡 INSIGHT: La elección del modelo es el factor más crítico  │  ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 📈 IMPACTO ANUAL (Opcional - Simulación de Producción)

**¿Qué es?**  
Extensión opcional de la calculadora que proyecta el CO2 total de una consulta a un **escenario de producción con volumen de queries**. En lugar de calcular una única consulta, calcula el impacto si tu aplicación ejecuta el modelo miles/millones de veces al año.

**¿Por qué es importante?**
- Una consulta = ~0.004 gCO2 (imperceptible)
- 1M consultas/día × 365 días = **~524 toneladas CO2/año** (muy significativo)
- Permite comparar modelos a **escala real** y justificar cambios de arquitectura

**Parámetro principal (opcional):**  
`queries_per_day` - Número de veces que se ejecuta el modelo diariamente (default: 1,000,000 = 1M/día)

**Fórmula:**
```
CO2_anual = CO2_por_query × queries_por_día × 365 días
```

**Extensiones futuras posibles:**
- Análisis de estacionalidad (más consultas en ciertos días)
- Comparativa multi-modelo (ROI de cambiar de GPT-4 a Mistral)
- Proyecciones de crecimiento (cargas variables por trimestre)
- Análisis de renovables potenciales (si el DC cambia a energía limpia)

---

### PANTALLA 5: IMPACTO ANUAL (Simulación)

```
╔════════════════════════════════════════════════════════════════╗
║  📈 SIMULACIÓN ANUAL: Impacto escalado a producción            ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  PARÁMETROS DE SIMULACIÓN                                      ║
║  ────────────────────────────────────────────────────────────  ║
║  • Queries por día:     1,000,000                              ║
║  • Días operativos:     365                                    ║
║  • Total anual:         365,000,000 queries                    ║
║                                                                ║
║  ────────────────────────────────────────────────────────────  ║
║  📊 RESULTADO ANUAL                                            ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  CO2 ANUAL: 523,775 kg = 523.8 toneladas                       ║
║  ├─ Dispositivos:     444,075 kg (84.8%)                       ║
║  ├─ Red:                  0.024 kg (0.0%)                      ║
║  └─ Data Centers:      79,700 kg (15.2%)                       ║
║                                                                ║
║  ENERGÍA ANUAL: 3,551,280 MWh = 3,551 MWh                      ║
║                                                                ║
║  COSTO ENERGÉTICO: $355,128 USD                                ║
║  (@ promedio $0.10/kWh en el mundo)                            ║
║                                                                ║
║  ────────────────────────────────────────────────────────────  ║
║  🌍 EQUIVALENCIAS INTUITIVAS                                   ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  🌲 Árboles necesarios:     20,952 árboles                     ║
║     (Cada árbol absorbe ≈25 kg CO2/año)                        ║
║                                                                ║
║  ✈️  Vuelos transatlánticos:    748 vuelos                     ║
║     (Cada vuelo ≈ 700 kg CO2)                                  ║
║                                                                ║
║  🚗 Coches conducidos:       1,105 años-coche                  ║
║     (Coche promedio: 474 kg CO2/año)                           ║
║                                                                ║
║  🏠 Casas con energía limpia:    60 años-casa                  ║
║     (Casa promedio: 8,700 kg CO2/año)                          ║
║                                                                ║
║  ────────────────────────────────────────────────────────────  ║
║  💰 ANÁLISIS ECONÓMICO                                         ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  Si cambias a Mistral-7b (-92%):                               ║
║  • Ahorro CO2 anual:      481,473 kg (92%)                     ║
║  • Ahorro económico:      $326,619/año                         ║
║  • Árboles ahorrados:     19,259 árboles                       ║
║                                                                ║
║  💡 ROI: Imprescindible cambiar si es viable                   ║
║                                                                ║
║  ────────────────────────────────────────────────────────────  ║
║  [📊 Gráfico temporal] [💾 Descargar] [🖨️ Imprimir]            ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

### PANTALLA 6: ETIQUETA ENERGÉTICA (Energy Label)

```
╔════════════════════════════════════════════════════════════════╗
║  🏷️ ETIQUETA DE EFICIENCIA ENERGÉTICA                          ║
║  (Energy Label - Estilo EU)                                    ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  🤖 GPT-4 + AWS EU-West + Dispositivo: MacBook Pro            ║
║                                                                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │                    CLASE: B                            │   ║
║  │            Eficiencia Energética                       │   ║
║  │                                                        │   ║
║  │  ╔════════════════════════════════════╗               │   ║
║  │  ║  A  │ Muy eficiente    │ <0.5 g  ║               │   ║
║  │  ╠════════════════════════════════════╣               │   ║
║  │  ║  B  │ Eficiente        │ 0.5-2  ║ ← TÚ ⭐        │   ║
║  │  ║  B  │ 1.44 gCO2/query  │        ║                 │   ║
║  │  ╠════════════════════════════════════╣               │   ║
║  │  ║  C  │ Medio            │ 2-5 g  ║               │   ║
║  │  ╠════════════════════════════════════╣               │   ║
║  │  ║  D  │ Ineficiente      │ 5-10 g ║               │   ║
║  │  ╠════════════════════════════════════╣               │   ║
║  │  ║  E  │ Muy ineficiente  │ >10 g  ║               │   ║
║  │  ╚════════════════════════════════════╝               │   ║
║  │                                                        │   ║
║  │  📊 Datos Técnicos:                                   │   ║
║  │  ├─ CO2 por query:     1.44 gCO2                      │   ║
║  │  ├─ Energía:           0.0284 Wh                      │   ║
║  │  ├─ Carbon Intensity:  145 gCO2/kWh (España)        │   ║
║  │  └─ Renovables DC:     95% (AWS Irlanda)             │   ║
║  │                                                        │   ║
║  │  🌍 Comparativas:                                     │   ║
║  │  ├─ Mejor (Mistral7B):     0.15 gCO2 (90% mejor) ✓  │   ║
║  │  ├─ Promedio (Claude-2):   0.72 gCO2 (50% mejor)    │   ║
║  │  └─ Peor (PaLM-2):        15.2 gCO2 (10x peor)      │   ║
║  │                                                        │   ║
║  │  💡 Consejo: Considera NPU o Mistral-7b para mejorar │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

### PANTALLA 7: MAPA INTERACTIVO GLOBAL

```
╔════════════════════════════════════════════════════════════════╗
║  🌍 MAPA: Intensidad de Carbono por Región                    ║
║  (Datos en vivo de Electricity Maps)                           ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ 🗺️ MAPA INTERACTIVO (Clica en la región / DC)         │   ║
║  │                                                        │   ║
║  │ [Leyenda]                                              │   ║
║  │ 🟢 <50    🟡 50-200   🟠 200-400   🔴 400-600  ⚫>600   │   ║
║  │                                                        │   ║
║  │ [Se renderiza con Leaflet.js]                         │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  INFORMACIÓN POR REGIÓN (Panel lateral)                       ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  📍 ESPAÑA (Seleccionada)                                      ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │                                                        │   ║
║  │  Intensidad de Carbono: 145 gCO2/kWh                  │   ║
║  │  Tendencia: ↓ Mejorando 29% en 5 años                 │   ║
║  │                                                        │   ║
║  │  ️ Data Centers Disponibles:                          │   ║
║  │                                                        │   ║
║  │  1️⃣ AWS EU-West (Irlanda)                             │   ║
║  │     └─ CI: 90 gCO2/kWh                                │   ║
║  │     └─ ✓ 95% renovables                               │   ║
║  │     └─ CO2/query: 1.23 gCO2 (MEJOR) ⭐               │   ║
║  │                                                        │   ║
║  │  2️⃣ GCP EU-West (Bélgica)                             │   ║
║  │     └─ CI: 195 gCO2/kWh                               │   ║
║  │     └─ ✓ 45% renovables                               │   ║
║  │     └─ CO2/query: 2.01 gCO2                           │   ║
║  │                                                        │   ║
║  │  3️⃣ Azure South (Madrid)                              │   ║
║  │     └─ CI: 165 gCO2/kWh                               │   ║
║  │     └─ ✓ 60% renovables                               │   ║
║  │     └─ CO2/query: 1.78 gCO2                           │   ║
║  │                                                        │   ║
║  │  💡 RECOMENDACIÓN:                                     │   ║
║  │  ✓ USA AWS EU-West (Irlanda) para minimizar emisiones │   ║
║  │  ↓ 45% menos CO2 vs AWS Virginia                      │   ║
║  │                                                        │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  [🔄 Refrescar datos] [💾 Descargar JSON] [📧 Comparar]       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 5️⃣ TIPOS DE REPORTES DISPONIBLES

### TIER 1: REPORTES BÁSICOS (Fáciles de implementar)

```
┌─────────────────────────────────────────────────────────┐
│ 1. PIE CHART - Desglose porcentual                      │
├─────────────────────────────────────────────────────────┤
│ Formato: JSON + PNG + HTML interactivo                  │
│ Datos:   device % | network % | datacenter %            │
│ Tiempo:  2-3 horas de implementación                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 2. ENERGY LABEL - Tarjeta energética tipo EU             │
├─────────────────────────────────────────────────────────┤
│ Formato: HTML renderizado + CSS                         │
│ Datos:   Clase (A-F) | Emisiones | Comparativa bench.  │
│ Tiempo:  4-6 horas de implementación                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 3. TABLA COMPARATIVA - Múltiples escenarios             │
├─────────────────────────────────────────────────────────┤
│ Formato: JSON + Markdown + HTML tabla                   │
│ Datos:   CO2 | Energía | Renovables | vs mejor         │
│ Tiempo:  2-3 horas de implementación                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 4. IMPACT POR REGIÓN - Mini matriz geográfica           │
├─────────────────────────────────────────────────────────┤
│ Formato: JSON + HTML tabla interactiva                  │
│ Datos:   CI por región | CO2 si usas ese DC | renovables
│ Tiempo:  3-5 horas de implementación                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 5. DESGLOSE DE ENERGÍA - Árbol jerárquico              │
├─────────────────────────────────────────────────────────┤
│ Formato: JSON + HTML árbol interactivo                  │
│ Datos:   E_compute | E_cooling | E_overhead | E_network │
│ Tiempo:  4-6 horas de implementación                     │
└─────────────────────────────────────────────────────────┘
```

### TIER 2: REPORTES INTERMEDIOS (Más valor, más trabajo)

```
┌─────────────────────────────────────────────────────────┐
│ 6. SCENARIO BUILDER - Impacto anual en producción       │
├─────────────────────────────────────────────────────────┤
│ Formato: Interactivo HTML + PDF descargable             │
│ Entrada: queries/día, días/año                          │
│ Salida:  CO2 anual | Equivalencias | Comparativas      │
│ Tiempo:  8-12 horas de implementación                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 7. ANÁLISIS DE SENSIBILIDAD - ¿Qué factor importa?     │
├─────────────────────────────────────────────────────────┤
│ Formato: Tornado diagram + Sliders interactivos         │
│ Datos:   Impacto de cada variable en CO2                │
│ Tiempo:  10-14 horas de implementación                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 8. ETIQUETA ENERGÉTICA DINÁMICA - Clase A-F            │
├─────────────────────────────────────────────────────────┤
│ Formato: Badge SVG + clasificación JSON                 │
│ Datos:   Eficiencia por percentil                       │
│ Tiempo:  7-10 horas de implementación                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 9. MAPA INTERACTIVO - Visualización geográfica          │
├─────────────────────────────────────────────────────────┤
│ Formato: Leaflet.js / Folium HTML                       │
│ Datos:   CI por región | DCs disponibles | Heatmap     │
│ Tiempo:  10-12 horas de implementación                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 10. BENCHMARK vs COMPETENCIA - Posicionamiento         │
├─────────────────────────────────────────────────────────┤
│ Formato: Tabla comparativa + gráfico radar              │
│ Datos:   Features tuya vs ML CO2 Impact, DeepGreen     │
│ Tiempo:  6-8 horas de implementación                     │
└─────────────────────────────────────────────────────────┘
```

### TIER 3: REPORTES AVANZADOS (Para si tienes tiempo extra)

```
┌─────────────────────────────────────────────────────────┐
│ 11. FRONTERA DE PARETO (DE MOMENTO OPCIONAL) - Trade-off Precisión vs CO2    │
├─────────────────────────────────────────────────────────┤
│ Formato: Scatter plot interactivo D3.js                 │
│ Datos:   Scatter de modelos en 2D/3D                    │
│ Tiempo:  15-20 horas de implementación                   │
└─────────────────────────────────────────────────────────┘
```

---

REFERENCIAS

[1] What is an NPU and Why You May Need One in Your Next PC Build
September 5, 2025 VM Staff https://www.velocitymicro.com/blog/what-is-an-npu-and-why-you-may-need-one-in-your-next-pc-build/ 

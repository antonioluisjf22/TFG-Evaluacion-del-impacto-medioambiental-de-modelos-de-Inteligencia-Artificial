# 🌍 FLUJO DE CÁLCULOS DE LA CALCULADORA DE CARBONO

**Propósito**: Documentar en detalle cómo se derivan los cálculos de impacto por LLM y por consulta (tokens), profundizando en cada variable y cómo afecta el consumo energético.

**Enfoque**: SOLO cálculos y sensibilidades. Se IGNORAN resultados finales/visualización.

---

## 📐 ARQUITECTURA DE CÁLCULOS

La calculadora realiza **3 cálculos de energía independientes** (NO incluye su suma/conversión final):

```
PARÁMETROS ENTRADA
    ├─ Modelo LLM (ej: GPT-4)
    ├─ Tokens de la consulta (input + output)
    ├─ Dispositivo (ej: MacBook Pro)
    ├─ Procesador (CPU/GPU/NPU)
    ├─ Data center (ej: AWS EU-West)
    ├─ Red (ej: 4G)
    └─ Ubicación usuario (para CI local)
        │
        ▼
    MOTOR DE CÁLCULO [ESTE DOCUMENTO PROFUNDIZA AQUÍ]
        ├─ E_device = f(latency, tokens_out, P_device, U, tiempo)
        ├─ E_network = f(tokens, energy_per_mb, red_type)
        └─ E_datacenter = f(tokens, energy_per_1k, PUE)
```

---

## 1️⃣ IMPACTO POR LLM: ORIGEN DE `energy_wh_per_1k_tokens`

### 🔬 ¿Qué es este Parámetro?

`energy_wh_per_1k_tokens` es **el consumo energético específico** del modelo LLM al procesar 1000 tokens en el data center (GPU/TPU):

- **Proviene de**: `models.csv` columna `energy_wh_per_1k_tokens`
- **Unidad**: Wh (vatio-hora) por 1000 tokens
- **Fuente de datos**: Reportes de sostenibilidad + mediciones empíricas
- **Invarianza**: Es FIJO por modelo, no depende del usuario

### 📐 Derivación desde Principios Físicos

```
NIVEL 1: FLOPS REQUERIDOS POR TOKEN
═══════════════════════════════════════

FLOPS_por_token = 2 × num_parameters

¿Por qué el 2?
  • Durante inferencia LLM, cada token atraviesa el modelo una sola vez
  • En cada neurona: 1 multiplicación + 1 suma = 2 FLOPS
  • Con num_parameters neuronas: total = 2 × num_parameters

Ejemplos de num_parameters (de models.csv):
  • BERT-base: 110 millones
    FLOPS = 2 × 110 × 10^6 = 220 × 10^6 FLOPS/token
    
  • Mistral-7b: 7 billones
    FLOPS = 2 × 7 × 10^9 = 14 × 10^9 FLOPS/token
    
  • GPT-4: 1.76 billones (estimado)
    FLOPS = 2 × 1.76 × 10^12 = 3.52 × 10^12 FLOPS/token

Para 1000 tokens:
  FLOPS_totales = FLOPS_por_token × 1000

CONCLUSIÓN: FLOPS ∝ num_parameters (determinante fundamental del modelo)
```

**NIVEL 2: CONVERSIÓN DE FLOPS A WATTS (potencia)**
```
Power_compute = FLOPS_por_token / TOPS_W_GPU

Donde TOPS/W es la eficiencia energética de la GPU (típicamente 5-20 TOPS/W)

Ejemplo NVIDIA A100:
  • TOPS/W = 5
  • FLOPS para GPT-4 = 3.52 × 10^12 FLOPS/token
  
  Power = (3.52 × 10^12 FLOPS) / (5 × 10^12 FLOPS/W)
        = 0.704 W de puro cómputo

Para 1000 tokens de GPT-4:
  • Tiempo de procesamiento = 1000 tokens / 200 tok/seg = 5 seg (estimado)
  • Energy = 0.704 W × 5 seg = 3.52 Ws = 0.00098 Wh ≈ 0.001 Wh/1k
  
  Realidad empírica reportada = 0.0048 Wh/1k (5x superior)
  
  Diferencia explícita (0.001 vs 0.0048):
    • 0.001 = cómputo puro
    • 0.0048 = cómputo + overhead de memoria, IO, scheduling
    • Factor 4.8x = overhead operacional real del modelo
```

**NIVEL 3: VALORES EMPÍRICOS VERIFICADOS**

```
Parámetros energy_wh_per_1k_tokens (de models.csv):

┌──────────────────────┬──────────────┬────────────────────┐
│ Modelo               │ Parámetros   │ energy_wh/1k       │
├──────────────────────┼──────────────┼────────────────────┤
│ BERT-base            │ 110M         │ 0.0005 Wh/1k       │
│ Mistral-7b           │ 7B           │ 0.0015 Wh/1k       │
│ Claude 2             │ 100B         │ 0.0035 Wh/1k       │
│ GPT-3.5-turbo        │ ~175B        │ 0.0040 Wh/1k       │
│ GPT-4                │ ~1.76T       │ 0.0048 Wh/1k       │
│ PaLM (Google)        │ 540B         │ 0.0042 Wh/1k       │
└──────────────────────┴──────────────┴────────────────────┘

Relación tamaño ↔ energía:
  • BERT (110M) → 0.0005
  • GPT-4 (1.76T) → 0.0048
  • Razón: 1.76T / 110M = 16000x
  • Energía: 0.0048 / 0.0005 = 9.6x (sublineal porque GPUs son eficientes)

INTERPRETACIÓN: Un modelo 16000x más grande consume ~10x más energía.
                No es lineal porque:
                  • Paralelismo en las GPUs
                  • Caches y optimizaciones
                  • Batch processing amortiza overhead
```

### 🎯 Característica Crítica: INVARIANZA

```
Este parámetro es INVARIANTE porque:

  ✓ NO varía con el usuario que hace la consulta
  ✓ NO varía con la hora del día
  ✓ NO varía con la carga del data center
  ✓ NO varía con el número de tokens específico (es por 1k)

SOLO varía entre:
  ✓ Diferentes modelos LLM
  ✓ Diferentes versiones del mismo modelo
  ✓ Diferentes GPUs/TPUs (pero OpenAI/Google lo miden con sus propios)

Implicación práctica:
  "Un token de GPT-4 en el data center SIEMPRE consume 0.0048 Wh,
   indiferentemente de quién lo pida o cuándo."
```

---

## 2️⃣ IMPACTO POR CONSULTA: EL PAPEL DOMINANTE DE TOKENS

### 🔑 Axioma Fundamental

```
TODOS los calculos de energía escalan LINEALMENTE con los tokens:

E_device       ∝ tokens_output        (relación lineal)
E_network      ∝ tokens_totales       (relación lineal)
E_datacenter   ∝ tokens_totales       (relación lineal)  ← MÁS IMPORTANTE

Definición de tokens:
  tokens_input   = número de tokens en pregunta/prompt
  tokens_output  = número de tokens en respuesta (generado por LLM)
  tokens_totales = tokens_input + tokens_output
```

### 📐 Sensibilidad Base: Efecto de Duplicar Tokens

```
Escenario: Misma consulta, pero salida 2x más larga

Cambio: tokens_output pasa 100 → 200

IMPACTO EN CADA COMPONENTE:

E_device cambio:
  • Basada en tiempo total (latency × tokens_output)
  • 100 tokens: t = 35 ms/token × 100 = 3500 ms
  • 200 tokens: t = 35 ms/token × 200 = 7000 ms
  • E_device (100) = P × (3500 / 3600000) = 0.01166 Wh
  • E_device (200) = P × (7000 / 3600000) = 0.02332 Wh
  • CAMBIO: ×2.0 (perfectamente lineal)

E_network cambio:
  • Basada en volumen total
  • Volumen (100) ≈ 0.25 MB
  • Volumen (200) ≈ 0.50 MB
  • E_network (100) = 0.002 × 0.25 = 0.0005 Wh
  • E_network (200) = 0.002 × 0.50 = 0.001 Wh
  • CAMBIO: ×2.0 (perfectamente lineal)

E_datacenter cambio:
  • Basada en tokens procesados × energy_wh_per_1k
  • E_dc (100) = (100 / 1000) × 0.0048 × 1.2 = 0.000576 Wh
  • E_dc (200) = (200 / 1000) × 0.0048 × 1.2 = 0.001152 Wh
  • CAMBIO: ×2.0 (perfectamente lineal)

┌──────────────┬──────────────┬──────────────┐
│ Componente   │ 100 tokens   │ 200 tokens   │
├──────────────┼──────────────┼──────────────┤
│ E_device     │ 0.01166 Wh   │ 0.02332 Wh   │ (×2)
│ E_network    │ 0.0005 Wh    │ 0.001 Wh     │ (×2)
│ E_datacenter │ 0.000576 Wh  │ 0.001152 Wh  │ (×2)
│ E_TOTAL      │ 0.012236 Wh  │ 0.024472 Wh  │ (×2)
└──────────────┴──────────────┴──────────────┘

CONCLUSIÓN: Duplicar tokens → duplica energía total
```

---

## 3️⃣ CÁLCULO PROFUNDO: ENERGÍA DEL DISPOSITIVO

### 📱 Estructura de la Fórmula

```
E_device = P_dinámico × (t_total_ms / 3600000)

Donde:
  P_dinámico    = potencia real que consume el dispositivo (Watts)
  t_total_ms    = tiempo total que espera → latencia (milisegundos)
  /3600000      = conversión ms → horas
```

### 📐 Componente 1: Potencia Dinámica

**Origen del modelo dinámico:**

```
Hipótesis: La potencia NO es binaria (0 o máxima),
           sino que escala con la carga.

Modelo lineal: P = P_idle + ΔP × utilization

Variables:
  P_idle = Consumo base del dispositivo (siempre activo)
           Incluye: pantalla, almacenamiento, SoC mínimo, WiFi pasiva
           Rango: 3-15 W típicos
           
  P_max_inference = Consumo máximo durante cómputo
                   Depende del TIPO de procesador seleccionado
                   ├─ CPU: 8-50 W
                   ├─ GPU: 50-300 W
                   └─ NPU: 3-20 W
                   
  utilization (U) = Factor 0-1 indicando % de carga real
                   Parámetro del usuario
                   ├─ 0.3 = funcionamiento ligero
                   ├─ 0.7 = funcionamiento típico
                   └─ 1.0 = máxima carga

Fórmula completa:
  P_dinámico = P_idle + (P_max_inference - P_idle) × U

Ejemplos (MacBook Pro, U=0.7):
  ┌──────────────┬────────────────────┬────────────┐
  │ Procesador   │ P_max_inference    │ P_dinámico │
  ├──────────────┼────────────────────┼────────────┤
  │ CPU          │ 15 W               │ 12 W       │
  │ GPU          │ 85 W               │ 61 W       │
  │ NPU          │ 8 W                │ 7.1 W      │
  └──────────────┴────────────────────┴────────────┘

Cálculos detallados:
  CPU: 5 + (15-5) × 0.7 = 5 + 7 = 12 W
  GPU: 5 + (85-5) × 0.7 = 5 + 56 = 61 W
  NPU: 5 + (8-5) × 0.7 = 5 + 2.1 = 7.1 W

Sensibilidad a utilization:
  ┌──────────┬───────────┐
  │ U        │ P CPU (W) │
  ├──────────┼───────────┤
  │ 0.0 (idle)       │ 5.0       │
  │ 0.3      │ 8.0       │
  │ 0.7      │ 12.0      │
  │ 1.0 (max)        │ 15.0      │
  └──────────┴───────────┘
```

**Procesador como variable cualitativa:**

```
El usuario ELIGE cuál procesador usar:
  ├─ CPU (Procesador Central)
  │   ├─ TDP bajo (5-15W)
  │   ├─ Disponible siempre
  │   ├─ Lento para LLMs
  │   └─ Eficiencia: 0.5-2 TOPS/W (bajo)
  │
  ├─ GPU (Tarjeta Gráfica NVIDIA/AMD)
  │   ├─ TDP alto (50-300W)
  │   ├─ No disponible en todos
  │   ├─ Rápido para LLMs
  │   └─ Eficiencia: 2-10 TOPS/W (bueno)
  │
  ├─ NPU (Neural Processing Unit-IA estilo Qualcomm)
  │   ├─ TDP muy bajo (3-20W)
  │   ├─ Raro/futuro en dispositivos
  │   ├─ Muy rápido si disponible
  │   └─ Eficiencia: 10-50 TOPS/W (excelente)
  │
  └─ Auto (detecta automáticamente)
      └─ Lee de devices.csv → primary_inference_target
```

### 📐 Componente 2: Latencia Total (Tiempo de Espera)

**Cálculo:**

```
t_total_ms = latency_ms_per_token × tokens_output

Variables:
  latency_ms_per_token = tiempo para procesar 1 token (de models.csv)
                        Rango: 5-100 ms/token
                        
  tokens_output = tokens generados por el modelo (del usuario)
                 Rango: 10-2000 tokens típicos

Ejemplos:
  • GPT-4: 35 ms/token
    - 50 tokens → 1750 ms = 1.75 seg
    - 100 tokens → 3500 ms = 3.5 seg
    - 200 tokens → 7000 ms = 7.0 seg
    - 1000 tokens → 35000 ms = 35 seg
    
  • Mistral: 12 ms/token
    - 100 tokens → 1200 ms = 1.2 seg (3x más rápido que GPT-4)
    
  • BERT: 5 ms/token
    - 100 tokens → 500 ms (7x más rápido que GPT-4)
```

**Sensibilidad:**

```
Si tokens_output ↑ 2x → t_total ↑ 2x → E_device ↑ 2x (LINEAL)

Tabla comparativa:
  ┌──────────────┬─────────────┬──────────────┐
  │ tokens_output│ t_total (s) │ E_device (W)  │
  ├──────────────┼─────────────┼──────────────┤
  │ 50           │ 1.75        │ 0.005833 Wh  │
  │ 100          │ 3.5         │ 0.01166 Wh   │
  │ 200          │ 7.0         │ 0.02332 Wh   │
  │ 500          │ 17.5        │ 0.05830 Wh   │
  │ 1000         │ 35.0        │ 0.11660 Wh   │
  └──────────────┴─────────────┴──────────────┘
```

### 📐 Componente 3: Conversión Potencia × Tiempo → Energía

```
E_device = P_dinámico × (t_total_ms / 3600000)

Factores de conversión:
  • ms a segundos: ÷ 1000
  • segundos a horas: ÷ 3600
  • Combinado: ÷ 3,600,000

Ejemplo completo:
  P_dinámico = 12 W (MacBook Pro, CPU, U=0.7)
  t_total_ms = 3500 ms (100 tokens con GPT-4)
  
  E_device = 12 × (3500 / 3,600,000)
           = 12 × 0.000972
           = 0.01166 Wh

Magnitud:
  ~0.01 Wh es muy pequeña (10 mWh)
  Comparación:
    • Una bombilla LED (~9W) durante 1 hora = 9 Wh
    • E_device es ~900x menor que una bombilla 1 hora
```

---

## 4️⃣ CÁLCULO PROFUNDO: ENERGÍA DE LA RED

### 🌐 Parámetro Crítico: Volumen de Datos

**Conversión tokens → MB (v2.7 corregida):**

```
MODELO REALISTA:
  El overhead HTTP es FIJO por request, NO proporcional a cada token.

Constantes fundamentadas (RFCs verificables):
  - OVERHEAD_HTTP = 1200 bytes (estimación conservadora, sin validación empírica)
    * RFC 7540 §4.1: HTTP/2 frame header = 9 bytes (exacto)
    * RFC 7541: HPACK headers comprimidos = ~400-600 bytes (variable)
    * RFC 8446 §5.1: TLS record = 5 bytes + 16-32 AEAD tag
  - BYTES_PER_TOKEN = 5 bytes (1 token ≈ 4 chars × ~1.2 UTF-8)
    * OpenAI docs: "1 token ≈ 4 characters"
    * RFC 3629: UTF-8 encoding

Fórmula:
  data_transferred_mb = (1200 + tokens_processed × 5) / 1,000,000

Ejemplos:
  • 70 input + 215 output = 285 tokens (chat_simple v2.1)
    → (1200 + 1425) / 1M = 0.002625 MB ≈ 2.6 KB
    
  • 296 input + 441 output = 737 tokens (chat_extended v2.1)
    → (1200 + 3685) / 1M = 0.004885 MB ≈ 4.9 KB

⚠️ LIMITACIÓN: Modelo NO validado empíricamente contra tráfico real de APIs LLM.

⚠️ FÓRMULA ANTERIOR INCORRECTA (tokens × 0.0001):
   Sobreestimaba 7-19× porque trataba el overhead HTTP como proporcional.

Relación: tokens_totales ↑ → data_mb ↑ (casi lineal para muchos tokens)
```

### 📐 Parámetro: Energy per MB

```
Representa consumo energético por MB transferido en la red.

Física subyacente:
  • Amplificadores de RF (antenas)
  • Routers y switches
  • Modulación/demodulación de señales
  • Backhaul a centrales

Valores por tecnología (de network_energy_sources_2024.csv):

┌──────────────────────┬──────────────────────┐
│ Tipo Red             │ energy_kWh_per_MB    │
├──────────────────────┼──────────────────────┤
│ Fiber FTTH           │ 0.0004               │ ← eficiente
│ WiFi 6 802.11ax      │ 0.0008               │
│ WiFi 6E 802.11be     │ 0.0007               │
│ 4G LTE               │ 0.006                │ (15x más)
│ 5G NSA               │ 0.004                │ (mejor que 4G)
└──────────────────────┴──────────────────────┘

Fuentes de estos datos:
  • GSMA Intelligence 2023
  • ITU-T L.1310/L.1330
  • Ericsson Mobility Report 2023
  • Real measurements of datacenter backhaul

Interpretación:
  • Satélite es 150x más ineficiente que fibra pura
  • 4G es 10x más ineficiente que WiFi moderno
  • 5G mejora 2x sobre 4G
```

### 📐 Cálculo de CO₂ de Red (v2.1 - CI Dinámico)

```
A partir de v2.1, el CO₂ de red se calcula dinámicamente usando
el CI específico del país del usuario desde Electricity Maps API:

┌──────────────────────┬───────────────────────────────────────────────────────────┐
│ Campo CSV            │ Descripción                                               │
├──────────────────────┼───────────────────────────────────────────────────────────┤
│ energy_kWh_per_MB    │ Energía por MB transferido (kWh/MB)                       │
│ energy_kWh_per_GB    │ Energía por GB transferido (kWh/GB)                       │
└──────────────────────┴───────────────────────────────────────────────────────────┘

Fórmula v2.1 (cálculo dinámico):
  ci_local = get_carbon_intensity(user_country)  # gCO₂/kWh desde API
  carbon_kg_per_GB = energy_kWh_per_GB × ci_local / 1000
  
Ejemplo 4G LTE con España (CI=145 gCO₂/kWh):
  carbon_kg_per_GB = 6.0 kWh/GB × 145 / 1000 = 0.87 kg CO₂/GB

Ventaja v2.1: Precisión por país en lugar de 4 buckets regionales
  Francia (CI=50): 0.30 kg/GB
  España (CI=145): 0.87 kg/GB
  Alemania (CI=350): 2.10 kg/GB
```

### 📐 Fórmula Completa

```
# Energía de red (simplificada)
E_network = energy_kWh_per_MB × data_transferred_mb

# CO₂ de red (v2.1 - CI dinámico)
carbon_kg_per_GB = energy_kWh_per_GB × CI_user_country / 1000
CO2_network = carbon_kg_per_GB × data_transferred_gb × 1000  # resultado en gramos

Ejemplo (4G, 150 tokens, España CI=145):
  data_transferred_mb = (1200 + 150×5) / 1_000_000 = 0.00195 MB
  data_transferred_gb = 0.00195 / 1000 = 0.00000195 GB
  
  Carbon (dinámico):
  carbon_kg_per_GB = 6.0 × 145 / 1000 = 0.87 kg/GB
  CO2_network = 0.87 kg/GB × 0.00000195 GB × 1000 = 0.0017 g CO₂

Magnitud: Muy pequeña (~0.1% del consumo total típicamente)
```

---

## 5️⃣ CÁLCULO PROFUNDO: ENERGÍA DEL DATA CENTER (DOMINANTE)

### 🖥️ Estructura de la Fórmula

```
E_datacenter = (tokens_procesados / 1000) × energy_wh_per_1k × PUE

Desglose:
  1. (tokens / 1000): Normalizar energy_wh_per_1k al número real de tokens
  2. × energy_wh_per_1k: Consumo específico del modelo LLM
  3. × PUE: Overhead de infraestructura (cooling, pérdidas, etc.)
```

### 📐 Componente 1: Computación Pura (E_compute)

```
E_compute = (tokens_procesados / 1000) × energy_wh_per_1k

Clave: Este es el consumo de las GPUs al procesar el modelo.

Sensibilidad a tokens (LINEAL):
  ┌──────────────┬────────────────────────────┐
  │ tokens       │ E_compute (GPT-4, 0.0048)  │
  ├──────────────┼────────────────────────────┤
  │ 50           │ 0.00024 Wh                 │
  │ 100          │ 0.00048 Wh                 │
  │ 150          │ 0.00072 Wh                 │
  │ 300          │ 0.00144 Wh (2x)            │
  │ 1000         │ 0.0048 Wh (6.7x)           │
  └──────────────┴────────────────────────────┘

CLAVE: E_compute ∝ tokens (perfectamente LINEAL)

Sensibilidad al MODELO (150 tokens):
  ┌──────────────────┬─────────────┬──────────────────┐
  │ Modelo           │ en_wh/1k    │ E_compute @ 150t │
  ├──────────────────┼─────────────┼──────────────────┤
  │ BERT-base        │ 0.0005      │ 0.000075 Wh      │
  │ Mistral-7b       │ 0.0015      │ 0.000225 Wh      │
  │ Claude 2         │ 0.0035      │ 0.000525 Wh      │
  │ GPT-3.5-turbo    │ 0.0040      │ 0.0006 Wh        │
  │ GPT-4            │ 0.0048      │ 0.00072 Wh       │
  └──────────────────┴─────────────┴──────────────────┘

FACTOR: GPT-4 usa 64x más energía que BERT
        Esto es la MAYOR fuente de variabilidad en CO2_dc
```

### 📐 Componente 2: PUE (Power Usage Effectiveness)

**¿Qué es PUE?**

```
PUE = Total Energy Input / Energy to IT Equipment

Significa:
  Si un data center consume 1000 kWh de la red:
  Y solo 833 kWh llegan a las GPUs/CPUs:
  Entonces PUE = 1000 / 833 = 1.2

Donde se "pierde" la energía (~167 kWh):
  • Refrigeración (40-50% del overhead) ← lo MAYOR
  • Transformadores y PDU (10-15%)
  • UPS y baterías (5%)
  • Iluminación (5%)
  • Sistemas de seguridad/control (5%)
  • Pérdidas por efecto Joule (15-20%)
```

**Valores reales (de data_centers.csv):**

```
┌──────────────────────────────────┬────┬──────────────┐
│ Data Center / Proveedor          │PUE │ % Overhead   │
├──────────────────────────────────┼────┼──────────────┤
│ Google DC (ultra-eficiente)      │1.05│ 5%           │ ← MEJOR
│ Facebook Data Center             │1.08│ 8%           │
│ AWS DC (promedio)                │1.15│ 15%          │
│ Microsoft Azure DC (promedio)    │1.18│ 18%          │
│ Promedio mundial (2024)          │1.20│ 20%          │
│ Data centers viejos (2010-2015)  │1.46│ 46%          │ ← PEOR
└──────────────────────────────────┴────┴──────────────┘

Variabilidad: 1.46 / 1.05 = 1.39x diferencia
              Un DC viejo consume 39% más de lo "útil"
```

**Aplicación en fórmula:**

```
E_datacenter = E_compute × PUE

Ejemplo (AWS, PUE=1.15):
  E_compute = 0.00072 Wh
  E_datacenter = 0.00072 × 1.15 = 0.000828 Wh
  
  Overhead = 0.000828 - 0.00072 = 0.000108 Wh
  % Overhead = 0.000108 / 0.000828 = 13%

Impacto de elegir peor DC (PUE 1.2 vs 1.05):
  E_dc (PUE 1.2) = 0.00072 × 1.2 = 0.000864 Wh
  E_dc (PUE 1.05) = 0.00072 × 1.05 = 0.000756 Wh
  Diferencia = 14% (modera pero visible)
```

### 📐 Componente 3: Carbon Intensity del Data Center

**Búsqueda jerárquica (fallbacks):**

```
NIVEL 1 (Primaria): Electricity Maps API
───────────────────
  Input: código proveedor + región
  Ejemplo: "aws" + "eu-west-1"
  Output: CI actualizado cada 15 minutos
  Ejemplo: 165 gCO2/kWh (Irlanda)

NIVEL 2 (If API fails): CSV local carbon_intensity_datacenters.csv
─────────────────────
  Contiene 71 data centers mapeados
  Datos históricos de últimos 30 días
  Si no está → siguiente nivel

NIVEL 3 (If DC not in CSV): Automapping zona → país
──────────────────────────
  DATACENTER_REGION_TO_ZONE: eu-west-1 → Irlanda
  Obtener CI promedio del país
  Ejemplo: Irlanda → ~350 gCO2/kWh

NIVEL 4 (If zona desconocida): Valor global por defecto
────────────────────────────
  DEFAULT_CARBON_INTENSITY = 450 gCO2/kWh (promedio mundial)
```

**Ejemplos reales de CI (Electricity Maps, enero 2026):**

```
┌──────────────────────────────────┬──────────────────┬────────────┐
│ Zona / Data Center               │ CI (gCO2/kWh)   │ Fuente enum │
├──────────────────────────────────┼──────────────────┼────────────┤
│ AWS US-West-2 (Oregon)           │ 77               │ Muy limpio  │
│ GCP US-Central (Iowa)            │ 250              │ Mixto       │
│ AWS EU-West-1 (Irlanda)          │ 165              │ Mixto       │
│ Azure NorthEurope (Irlanda)      │ 165              │ Mixto       │
│ AWS US-East-1 (Virginia)         │ 498              │ Sucio       │
│ AWS US-East-2 (Ohio)             │ 520              │ Sucio       │
│ Mundo promedio                   │ 450              │ Referencia  │
└──────────────────────────────────┴──────────────────┴────────────┘

VARIABILIDAD extrema: 77 (Oregon) vs 520 (Ohio) = 6.75x diferencia

Razones de la variabilidad:
  • Portland (Oregon): 60% hidroeléctrica → muy limpio
  • Ohio: 50% carbón → muy sucio
  • La elección of DC puede cambiar CO2 en 6.75x
```

---

## 6️⃣ ANÁLISIS: ESCALABILIDAD DE LOS TOKENS

### 📈 Regla Universal

```
TODOS los componentes escalan LINEALMENTE con tokens_totales:

  Componente    | Relación
  ──────────────┼──────────
  E_device      | ∝ tokens_output         (directamente)
  E_network     | ∝ tokens_totales        (volumen datos)
  E_datacenter  | ∝ tokens_totales        (cómputo)

Implicación: Si tokens ×N → Energía ×N (aproximadamente)
```

### 📊 Tabla Comparativa Completa

```
ESCENARIO BASE: 150 tokens, GPT-4, MacBook Pro CPU, España, AWS EU-West, 4G

┌─────────────────────────┬─────────────────┬──────────────┬──────────────┐
│ Componente              │ Valor (Wh)      │ % del Total  │ Fuente CI    │
├─────────────────────────┼─────────────────┼──────────────┼──────────────┤
│ E_device × CI_local     │ 0.000169 gCO2   │ ~55%         │ 145 ESP      │
│ E_network × CI_local × m│ 0.000218 gCO2   │ ~7%          │ 145 ESP      │
│ E_datacenter × CI_dc    │ 0.0001366 gCO2  │ ~37%         │ 165 AWS      │
│ ────────────────────────┼─────────────────┼──────────────┤──────────────
│ TOTAL CO2               │ 0.0005232 gCO2  │ 100%         │ mixto        │
└─────────────────────────┴─────────────────┴──────────────┴──────────────┘

NOTA: El dispositivo domina EN ENERGÍA (94 Wh = 94% de energía bruta)
      Pero en CO2 está balanceado con data center (porque Costa daño local)
```

### 📈 Sensibilidad: Si Cambias Un Parámetro

```
TABLA: ¿Por cuánto se multiplica el CO2 total si cambio esto?

Base: 150 tokens, GPT-4, CPU, España, AWS EU-West, 4G

┌─────────────────────────┬─────────────────┬──────────────┐
│ Cambio                  │ Multiplicador CO2│ Magnitud     │
├─────────────────────────┼─────────────────┼──────────────┤
│ tokens: 150 → 300       │ ×2.0            │ ALTÍSIMA     │
│ modelo: GPT-4 → BERT    │ ÷10             │ ALTÍSIMA     │
│ DC: AWS-EU → AWS-US-W   │ ÷2.1            │ ALTÍSIMA     │
│ usuario: España → Oregon│ ÷2.0            │ ALTÍSIMA     │
│ CPU → GPU               │ ×5.0            │ ALTÍSIMA     │
│ 4G → Fibra              │ ÷5              │ MEDIA        │
│ PUE 1.15 → 1.46        │ ×1.26           │ BAJA         │
│ U: 0.7 → 1.0            │ ×1.9            │ MEDIA        │
└─────────────────────────┴─────────────────┴──────────────┘

RANKING de impacto (de mayor a menor):
  1. Tokens (×N → ×N)
  2. Modelo LLM (×10)
  3. Geografía DC (×6-7)
  4. Geografía usuario (×3-4)
  5. Procesador (×5)
  6. Utilización (×1.9)
  7. Red (÷5)
  8. PUE (×1.2)
```

---

## 7️⃣ FÓRMULAS MAESTRAS INTEGRADAS (SIN RESULTADO FINAL)

```
ENERGÍA TOTAL CALCULADA:

                         ┌────────────────────────────────────────┐
E_total = E_device + E_network + E_datacenter                      │
                         │
Donde:                   │
                         │
E_device = [P_idle + (P_max - P_idle)×U] × latency_ms×tokens_out  │
                                              3,600,000 ms/h      │

E_network = energy_kWh_per_MB × data_transferred_mb               │

E_datacenter = (tokens_procesados / 1000)                         │
             × energy_wh_per_1k                                   │
             × PUE                                                │
                         └────────────────────────────────────────┘

CO₂ de red se calcula dinámicamente con CI del país del usuario (v2.1):
  carbon_kg_per_GB = energy_kWh_per_GB × CI_user_country / 1000
  CO2_network = carbon_kg_per_GB × data_transferred_gb × 1000  # gramos
```

---

*Documento integro de derivaciones matemáticas para cálculos de impacto*

*TFG - Evaluación del Impacto Medioambiental de Modelos de Inteligencia Artificial*

*Versión: 3.1 | Enfoque exclusivo: CÁLCULOS y sensibilidades (SIN visualización)*


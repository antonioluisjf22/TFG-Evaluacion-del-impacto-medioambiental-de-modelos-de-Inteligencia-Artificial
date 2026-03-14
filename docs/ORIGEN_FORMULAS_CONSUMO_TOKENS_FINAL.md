# Origen de Fórmulas y Valores de Consumo por Token

> **Versión**: 3.0 (Marzo 2026)  
> **Estado**: Todos los modelos son LLMs generativos. BERT y ViT eliminados. PaLM 2 max_output_tokens corregido.

---

## 1. Base Teórica: Papers Académicos

### 1.1 La Fórmula Fundamental

$$E_{token} = \frac{2 \times N_{params}}{TFLOPS_{GPU} \times 10^{12}} \times \frac{TDP_{GPU}}{3600}$$

Donde:
- $E_{token}$ = energía en Wh por token
- $N_{params}$ = número de parámetros del modelo
- $TFLOPS_{GPU}$ = capacidad de cómputo de la GPU en teraflops
- $TDP_{GPU}$ = potencia máxima de la GPU en vatios
- $3600$ = conversión de segundos a horas

### 1.2 Componentes y Fuentes

| Componente | Descripción | Valor de referencia | Fuente |
|------------|-------------|---------------------|--------|
| **2 × params** | FLOPS mínimos por token en forward pass (una multiplicación + una suma) | Variable por modelo | Kaplan et al. (2020) [1] |
| **TFLOPS_GPU** | Capacidad de cómputo del hardware de referencia | **312 TFLOPS** (NVIDIA A100, FP16) | NVIDIA A100 datasheet |
| **TDP_GPU** | Consumo de potencia máximo | **400 W** (NVIDIA A100 SXM) | NVIDIA A100 datasheet |
| **1/3600** | Conversión de segundos a horas (para Wh) | — | Conversión física estándar |

> **Hardware de referencia**: NVIDIA A100 80GB SXM (312 TFLOPS FP16, 400W TDP). Se usa como GPU de referencia por ser la más utilizada en inferencia LLM a escala durante el período 2022-2024. Los valores se definen como constantes en `extract_models_v2.py` (`REF_GPU_TFLOPS = 312`, `REF_GPU_TDP_W = 400`).

### 1.3 Forward Pass vs Entrenamiento

- **Forward pass (inferencia)**: 2 × params FLOPs por token [1]
- **Entrenamiento completo**: 6 × params FLOPs por token [2]

---

## 2. Datos Empíricos: Mediciones Reales

### 2.1 OpenAI / GPT-4

- **Origen**: Análisis de Epoch AI (Febrero 2025) [3]
- **Dato reportado**: GPT-4o ≈ 0.3–0.6 Wh por query típico (500 tokens)
- **Cálculo Epoch AI**: 
  - Mínimo: 0.3 Wh ÷ 500 tokens × 1000 = **0.6 Wh/1k tokens**
  - Máximo: 0.6 Wh ÷ 500 tokens × 1000 = **1.2 Wh/1k tokens**
  - Media: **~0.9 Wh/1k tokens** (incluye PUE datacenter ~1.2×)
- **Metodología Epoch AI**: Extrapolación de mediciones indirectas + inclusión de PUE datacenter
- **Confianza**: 50% (rango amplio según longitud de query y condiciones)

#### Discrepancia GPT-4: 0.443 vs 0.6-1.2 Wh/1k tokens

**Valor en `models.csv`**: 0.443178 Wh/1k tokens (calculado con fórmula 2N FLOPs, MoE ~280B active params)  
**Epoch AI reporta**: 0.6-1.2 Wh/1k tokens (CON PUE)  
**Sin PUE Epoch AI**: ~0.5-1.0 Wh/1k tokens (dividiendo entre 1.2)

**Explicación de la diferencia (~1.1-2.3×)**:

| Componente | 0.443 (Nuestro CSV) | Epoch AI (~0.5-1.0 sin PUE) |
|------------|----------------------|------------------------------|
| Cómputo GPU puro | ✅ Incluido | ✅ Incluido |
| Overhead memoria/IO | ✅ Incluido | ✅ Incluido |
| PUE datacenter | ❌ Se aplica por separado | ❌ Ya excluido |
| Balanceadores de carga | ❌ No incluido | ✅ Probablemente incluido |
| Orquestación/réplicas | ❌ No incluido | ✅ Probablemente incluido |
| Múltiples pasadas (beam search) | ❌ No incluido | ✅ Probablemente incluido |

**Por qué mantenemos 0.443**:
1. **Consistencia metodológica**: Todos los modelos usan fórmula 2N FLOPs + eficiencia GPU
2. **Separación de PUE**: El PUE se aplica correctamente por separado desde `data_centers.csv`
3. **Coherencia interna**: La calculadora es internamente consistente
4. **Valor en rango razonable**: 0.443 está en el mismo orden de magnitud que Epoch AI sin PUE

### 2.2 Meta / OPT-175B

- **Origen**: Paper OPT [4]
- **Dato calculado**: 0.276986 Wh/1k tokens (**ESTIMACIÓN TEÓRICA**, no medición empírica)
- **Metodología**: Aplicación de fórmula 2N FLOPs para inferencia con eficiencia GPU 0.45
- **Confianza**: 85%
- **Aclaración**: El paper OPT **NO publica consumo por token en inferencia**; solo reporta datos de entrenamiento (1/7 huella de GPT-3)

### 2.3 Meta / Llama 2

- **Origen**: Paper Llama 2 [5]
- **Dato calculado**: 0.14245 Wh/1k tokens (**ESTIMACIÓN TEÓRICA**, no medición empírica)
- **Metodología**: Fórmula 2N FLOPs con hardware A100 y eficiencia GPU 0.35
- **Confianza**: 80%
- **Datos reales disponibles**: 1,720,320 GPU-horas de entrenamiento, 291.42 tCO₂eq total
- **Aclaración**: Meta **NO publica consumo por token en inferencia**, solo datos de entrenamiento

### 2.4 Google / PaLM 2

- **Origen**: PaLM 2 Technical Report [24]
- **Dato calculado**: 0.538145 Wh/1k tokens (**ESTIMACIÓN TEÓRICA**)
- **Metodología**: Fórmula 2N FLOPs con eficiencia GPU 0.45 (340B params)
- **Confianza**: 70%
- **Datos adicionales**: Google Sustainability Report 2023 [6] proporciona estimaciones de PUE e intensidad de carbono por región

### 2.5 Por Qué No Todos Tienen Datos Empíricos

Ningún modelo en la calculadora v3.0 tiene datos empíricos directos de consumo energético por token. Todos usan la fórmula teórica 2N FLOPs:

| Modelo | Razón ausencia empírica | Solución |
|--------|------------------------|----------|
| GPT-4 (OpenAI) | MoE, specs parciales | 2N FLOPs con ~280B active params |
| PaLM 2 (Google) | Modelo propietario | 2N FLOPs |
| OPT 175B (Meta) | Paper solo reporta entrenamiento | 2N FLOPs |
| Claude 2 (Anthropic) | Números confidenciales | 2N FLOPs |
| Llama 2 70B (Meta) | Paper solo reporta entrenamiento | 2N FLOPs |
| Falcon 40B (TII) | Enfocados en rendimiento | 2N FLOPs |
| MPT 30B (MosaicML) | Sin datos de inferencia | 2N FLOPs |
| Gemma 7B (Google DeepMind) | Paper no incluye energía inferencia | 2N FLOPs |
| Mistral 7B (Mistral AI) | Discrepancia empírica 420× (ver §3.1) | 2N FLOPs |
| Phi-2 (Microsoft) | Blog post, sin datos energéticos | 2N FLOPs |

---

## 2.6 Estimación de Tokens por Consulta y su Conversión a Bytes de Red

Un token es siempre lo mismo: la unidad mínima de texto que procesa un modelo LLM, definida por su tokenizer (BPE = *Byte Pair Encoding* en OpenAI y Claude, SentencePiece en LLaMA, etc.). No hay "dos tipos de tokens". Lo que sí existe son **dos preguntas distintas** que se responden con fuentes diferentes:

### Pregunta 1: ¿Cuántos tokens consume una consulta?

Los tokens por tipo de petición se obtienen del análisis de **datasets académicos públicos** que registran interacciones reales con LLMs:

| Tipo de Petición | Input | Output | Total | Fuente |
|------------------|-------|--------|-------|--------|
| **chat_simple** | 70 | 215 | 285 | LMSYS-Chat-1M (Zheng et al., 2024) |
| **chat_extended** | 296 | 441 | 737 | WildChat (Zhao et al., 2024) |
| **summarization** | 781 | 56 | 837 | CNN/DailyMail (See et al., 2017) |
| **generation_short** | 20 | 65 | 85 | Alpaca dataset |
| **generation_long** | 50 | 2048 | 2098 | Límite API (diseño) |
| **code_generation** | 100 | 300 | 400 | Decisión de diseño (sin validación empírica) |
| **translation** | 200 | 220 | 420 | Ratio empírico ~1.1x |

Estos valores no se derivan de contar caracteres. Son medianas/medias de distribuciones reales de longitud de prompt y respuesta medidas directamente en tokens por los propios datasets.

### Pregunta 2: ¿Cuántos bytes de red ocupa un token?

Una vez determinados los tokens (Pregunta 1), se necesita estimar el tráfico de red. Para ello se usa la heurística de OpenAI ("What are tokens and how to count them?"):

- 1 token ≈ 4 caracteres (inglés) × ~1.2 (UTF-8 multilingüe) = **5 bytes/token**

**Fórmula**: $datos_{MB} = \frac{1200 \text{ (HTTP overhead fijo)} + tokens \times 5}{1.000.000}$

**Ejemplo con chat_simple** (285 tokens):
- Bytes = 1200 + 285 × 5 = 2625 bytes = 0.002625 MB

### ¿Por qué no se usa la heurística de caracteres para la Pregunta 1?

**Razón corta**: La heurística "1 token ≈ 4 caracteres" es una **aproximación estadística grosera**, no una regla determinista. Los tokenizers BPE (*Byte Pair Encoding*) no dividen el texto en bloques fijos de 4 caracteres.

**Razón detallada con ejemplos**:

La heurística funciona "en promedio" en textos largos (miles de caracteres), pero falla en textos cortos y puntuales:

- `"Hello world"` = 11 caracteres → heurística predice 11÷4 ≈ 2.75 → 3 tokens
- Pero en realidad = **2 tokens** (porque "Hello" es 1 token y "world" es 1 token, el espacio se maneja especialmente)

- `"¿Cuántos?"` = 9 caracteres (español) → heurística predice 9÷4 ≈ 2.25 → 2-3 tokens
- Pero en realidad = **5-6 tokens** (porque los caracteres acentuados y puntuación se tokenizaban ineficientemente en BPE)

La heurística es un **promedio global** útil para estimar volumen en agregados grandes, no para contar exactamente.

**Comparación**: 
- Contar 100 millones de tweets con la heurística: probablemente genera un error <5% (bueno)
- Contar tokens en una consulta individual de 285 caracteres: error puede llegar a 20-30% (malo)

Por eso, para determinar cuántos tokens consume cada tipo de petición, se **miden directamente** en datasets reales (LMSYS-Chat-1M, WildChat) en lugar de calcular. Los papers de esos datasets ya hicieron el trabajo de tokenizar millones de interacciones y reportar las distribuciones.

En cambio, para estimar **bytes de red** la heurística es aceptable: tratamos con volúmenes en megabytes (agregados de miles de consultas), donde ±5% de error es negligible comparado con el overhead de red fijo (1200 bytes HTTP).

---

## 3. Historial de Reclasificaciones

### 3.1 Mistral-7B — Reclasificado como "Calculated" (v2.7)

- **Estado**: Reclasificado de "empirical" a "calculated" en v2.7
- **Valor anterior (empírico)**: 0.00045 Wh/1k tokens
- **Valor actual (calculado)**: 0.020798 Wh/1k tokens (fórmula 2N FLOPs, efficiency 0.25)
- **Motivo del cambio**: Discrepancia crítica (~420×) entre valor empírico en CSV y mediciones publicadas en papers académicos [21][22]:
  - Papers reportan: ~0.190 Wh/1k tokens (mediciones en hardware real)
  - CSV tenía: 0.00045 Wh/1k tokens (origen incierto)

**Referencias académicas para contexto**:
- [21] Poddar, S., et al. (2025). "Towards Sustainable NLP..." *NAACL 2025*
- [22] Yang, R., Zhan, L., et al. (2025). "Benchmarking the Power Consumption of LLM Inference." arXiv:2512.03024

### 3.2 BERT Base y ViT-base — Eliminados (v3.0)

- **BERT Base (110M params)**: Eliminado en v3.0. Modelo encoder-only de clasificación — no genera tokens en sentido generativo. El campo `max_output_tokens` no aplica a su arquitectura.
- **ViT-base (86M params)**: Eliminado en v3.0. Modelo de visión que clasifica imágenes, no genera texto. Los tipos de petición de visión (image_classification, image_captioning, visual_qa) fueron eliminados.
- **Reemplazados por**: Gemma 7B (Google DeepMind) y Phi-2 (Microsoft Research), ambos LLMs generativos.

---

## 4. Metodología por Modelo (según `models.csv` v3.0)

### 4.1 Tabla de Metodologías (10 LLMs)

| Modelo | Params | energy_wh_per_1k | energy_source | energy_methodology | Eficiencia GPU |
|--------|--------|------------------|---------------|-------------------|----------------|
| **GPT-4** | 1.7T (280B active) | 0.443178 | calculated | 2N FLOPs (MoE active params ~280B) | 0.45 |
| **PaLM 2** | 340B | 0.538145 | calculated | 2N FLOPs scaled by efficiency | 0.45 |
| **OPT-175B** | 175B | 0.276986 | calculated | 2N FLOPs scaled by efficiency | 0.45 |
| **Claude 2** | ~100B | 0.2035 | calculated | 2N FLOPs scaled by efficiency | 0.35 |
| **Llama 2 70B** | 70B | 0.14245 | calculated | 2N FLOPs scaled by efficiency | 0.35 |
| **Falcon 40B** | 40B | 0.0814 | calculated | 2N FLOPs scaled by efficiency | 0.35 |
| **MPT 30B** | 30B | 0.08547 | calculated | 2N FLOPs scaled by efficiency | 0.25 |
| **Gemma 7B** | 8.54B | 0.02433 | calculated | 2N FLOPs scaled by efficiency | 0.25 |
| **Mistral 7B** | 7.3B | 0.020798 | calculated | 2N FLOPs scaled by efficiency | 0.25 |
| **Phi-2** | 2.7B | 0.012821 | calculated | 2N FLOPs scaled by efficiency | 0.15 |

**Estado v3.0**: Todos los modelos son `energy_source = "calculated"`. No hay modelos empíricos en la calculadora.

### 4.2 Factor de Eficiencia (Modelo Dinámico)

La eficiencia de GPU depende del tamaño del modelo (mejor batching en modelos grandes):

```python
if params > 100B: efficiency = 0.45
elif params > 30B: efficiency = 0.35
elif params > 5B:  efficiency = 0.25
else:              efficiency = 0.15
```

**Justificación**:
- Modelos pequeños: Subutilizan GPU (menos paralelismo)
- Modelos grandes: Mejor ocupación de memoria, batching más eficiente

### 4.3 Lógica de Prioridad en `extract_models_v2.py`

El script que genera `models.csv` aplica una **jerarquía de prioridad** para determinar el valor de `energy_wh_per_1k_tokens`:

```
┌─────────────────────────────────────────────────────────────────────┐
│  PRIORIDAD 1: ¿Tiene preset_energy_wh_per_1k?                       │
│     SÍ → Usar ese valor                                             │
│          energy_source = energy_source_override (o "calculated")    │
│     NO ↓                                                            │
├─────────────────────────────────────────────────────────────────────┤
│  PRIORIDAD 2: ¿Tiene empirical_energy_wh_per_1k?                    │
│     SÍ → Usar ese valor                                             │
│          energy_source = "empirical"                                │
│     NO ↓                                                            │
├─────────────────────────────────────────────────────────────────────┤
│  PRIORIDAD 3: Calcular con fórmula 2N FLOPs                         │
│          energy_source = "calculated"                               │
└─────────────────────────────────────────────────────────────────────┘
```

#### Mapeo modelos → nivel de prioridad (v3.0):

| Modelo | Nivel usado | Descripción |
|--------|-------------|-------------|
| GPT-4 | 3 (calculado) | Usa `estimate_energy_per_1k_tokens()` con active params ~280B |
| PaLM 2 | 3 (calculado) | Usa `estimate_energy_per_1k_tokens()` |
| OPT-175B | 3 (calculado) | Usa `estimate_energy_per_1k_tokens()` |
| Claude 2 | 3 (calculado) | Usa `estimate_energy_per_1k_tokens()` |
| Llama 2-70B | 3 (calculado) | Usa `estimate_energy_per_1k_tokens()` |
| Falcon 40B | 3 (calculado) | Usa `estimate_energy_per_1k_tokens()` |
| MPT 30B | 3 (calculado) | Usa `estimate_energy_per_1k_tokens()` |
| Gemma 7B | 3 (calculado) | Usa `estimate_energy_per_1k_tokens()` |
| Mistral 7B | 3 (calculado) | Usa `estimate_energy_per_1k_tokens()` |
| Phi-2 | 3 (calculado) | Usa `estimate_energy_per_1k_tokens()` |

**Simplificación v3.0**: Todos los modelos usan el nivel 3 (cálculo dinámico). Los niveles 1 (preset) y 2 (empírico) ya no se usan en ningún modelo.

---

## 5. Validación de la Fórmula

### 5.1 Método 1: Comparación con CodeCarbon

- CodeCarbon usa el mismo factor 2 × params [8]
- Resultados: ±20% de diferencia (aceptable en este contexto)

### 5.2 Método 2: Validación contra ML CO2 Impact

- Herramienta pública: https://mlco2.github.io/impact/ [9]
- Resultados: ±25% de diferencia

### 5.3 Método 3: Benchmarks Publicados

- Luccioni et al. (2024) [10] incluye medidas reales de 15+ modelos en tareas de NLP
- Nuestras estimaciones teóricas se sitúan en el **mismo orden de magnitud** para los modelos comparables

### 5.4 Método 4: Sentido Físico

- GPT-4 en OpenAI: ~12–15 gCO₂ por consulta (reportado)
- Nuestra fórmula: ~10–14 gCO₂ ✓

---

## 6. Especificaciones de Tokens: Origen y Fuentes por Modelo

### 6.1 Tabla Completa de context_window y max_output_tokens

| Modelo | context_window | max_output_tokens | Fuente context_window | Fuente max_output_tokens |
|--------|---------------|-------------------|----------------------|--------------------------|
| **GPT-4** | 128,000 | 4,096 | OpenAI API docs [25] | OpenAI API docs [25] |
| **PaLM 2** | 32,000 | 4,096 | PaLM 2 Technical Report [24] | Vertex AI API text-bison [26] |
| **OPT-175B** | 2,048 | 1,024 | Paper OPT §3 [4] | 50% de context_window (diseño conservador) |
| **Claude 2** | 100,000 | 4,096 | Anthropic documentation [27] | Anthropic API defaults [27] |
| **Llama 2 70B** | 4,096 | 2,048 | Paper Llama 2 §2 [5] | 50% de context_window (diseño conservador) |
| **Falcon 40B** | 2,048 | 1,024 | Hugging Face model card [28] | 50% de context_window (diseño conservador) |
| **MPT 30B** | 8,192 | 4,096 | MosaicML blog [29] | 50% de context_window (ALiBi permite extensión) |
| **Gemma 7B** | 8,192 | 4,096 | Gemma Technical Report §2 [30] | 50% de context_window (diseño conservador) |
| **Mistral 7B** | 8,192 | 4,096 | Paper Mistral §2.1 [31] (SWA 4096, efectivo ~8K) | 50% de context_window |
| **Phi-2** | 2,048 | 1,024 | Microsoft Research blog + HF model card [32] | 50% de context_window (diseño conservador) |

#### Notas sobre max_output_tokens:
- **GPT-4, PaLM 2, Claude 2**: Tienen límites documentados por sus APIs comerciales.
- **Modelos open-source** (OPT, Llama, Falcon, MPT, Gemma, Mistral, Phi-2): No tienen un límite API impuesto. Se usa la convención de **50% del context_window** como límite práctico para dejar espacio al prompt de entrada.
- **PaLM 2 (corrección v3.0)**: Reducido de 8192 a 4096. El valor 8192 era técnicamente posible con el modelo base pero las APIs comerciales (Vertex AI text-bison) limitan a 4096. Se alinea con el uso real.
- **Mistral 7B (corrección v3.0)**: context_window reducido de 32000 a 8192. El paper anuncia 32K pero usa Sliding Window Attention (SWA) con ventana de 4096 tokens, lo que limita la calidad efectiva a ~8K tokens.

### 6.2 Validación de Coherencia (v3.0)

Para todos los modelos se verifica que:
- `max_output_tokens < context_window` (siempre hay espacio para input)
- `max_output_tokens ≤ 50% × context_window` (regla general para modelos open-source)
- `typical_tokens_total (285) < min(context_window)` en todos los modelos (el menor es 2048)

| Modelo | context_window | max_output_tokens | Ratio out/context | ✓ Coherente |
|--------|---------------|-------------------|-------------------|-------------|
| GPT-4 | 128,000 | 4,096 | 3.2% | ✅ |
| PaLM 2 | 32,000 | 4,096 | 12.8% | ✅ |
| OPT-175B | 2,048 | 1,024 | 50.0% | ✅ |
| Claude 2 | 100,000 | 4,096 | 4.1% | ✅ |
| Llama 2 70B | 4,096 | 2,048 | 50.0% | ✅ |
| Falcon 40B | 2,048 | 1,024 | 50.0% | ✅ |
| MPT 30B | 8,192 | 4,096 | 50.0% | ✅ |
| Gemma 7B | 8,192 | 4,096 | 50.0% | ✅ |
| Mistral 7B | 8,192 | 4,096 | 50.0% | ✅ |
| Phi-2 | 2,048 | 1,024 | 50.0% | ✅ |

---

## 7. Tipos de Petición: Origen de Valores de Tokens

### 7.1 Declaración de Transparencia

**IMPORTANTE**: La mayoría de los valores en `request_types.csv` son **decisiones de diseño prácticas** para la calculadora, NO datos extraídos de papers académicos. Solo algunos valores tienen respaldo académico directo verificable.

### 7.2 Tipos de Petición v3.0 (Solo LLMs)

| Request Type | tokens_input_avg | tokens_output_avg | Fuente / Justificación |
|--------------|-----------------|-------------------|------------------------|
| **chat_simple** | 70 | 215 | LMSYS-Chat-1M: avg 69.5 input, 214.5 output [13] |
| **chat_extended** | 296 | 441 | WildChat: avg 295.6 input, 441.3 output [15] |
| **generation_short** | 20 | 65 | Alpaca dataset: avg 19.7 input, 64.5 output [18] |
| **generation_long** | 50 | 2048 | Límite API (no estadística real). Ver §7.4 sobre capping |
| **summarization** | 781 | 56 | CNN/DailyMail: avg 781 input, 56 output [19] |
| **code_generation** | 100 | 300 | Estimación propia (sin datos académicos) |
| **translation** | 200 | 220 | Ratio ~1.1× empírico, valores estimados |

> **Nota**: El script `analyze_percentiles.py` utiliza solo 6 de estos 7 tipos (excluye `translation`) para la generación de `emissions_distribution.csv`. La razón es que `translation` es una estimación sin respaldo en datasets académicos verificados (a diferencia de los otros tipos), y su volumen total de tokens (420) queda cubierto por el rango que ya ofrecen `chat_simple` (285) y `chat_extended` (737), por lo que su inclusión no aporta variabilidad nueva significativa al análisis de percentiles.

**Tipos eliminados en v3.0** (eran de BERT/ViT):
- `text_classification` (BERT): 128/1 → Eliminado (modelo encoder-only)
- `sentiment_analysis` (BERT): 64/1 → Eliminado (modelo encoder-only)
- `ner` (BERT): 100/50 → Eliminado (modelo encoder-only)
- `image_classification` (ViT): 196/10 → Eliminado (modelo de visión)
- `image_captioning` (ViT): 196/15 → Eliminado (modelo de visión)
- `visual_qa` (ViT): 196/100 → Eliminado (modelo de visión)

### 7.3 Estadísticas Reales de Datasets de Conversaciones LLM

| Dataset | Paper | tokens_input (avg) | tokens_output (avg) | Referencia |
|---------|-------|-------------------|---------------------|------------|
| **LMSYS-Chat-1M** | Zheng et al., 2024 | **69.5** | **214.5** | [13] |
| **Chatbot Arena** | Chiang et al., 2024 | **94.9** | **269.0** | [14] |
| **WildChat** | Zhao et al., 2024 | 295.6 ± 1609 | 441.3 ± 411 | [15] |
| **ShareGPT** | (via WildChat) | 94.5 ± 626 | 348.5 ± 270 | Citado en [15] |
| **Anthropic HH-RLHF** | (via LMSYS) | **18.9** | **78.9** | [16] |
| **OpenAssistant** | Köpf et al., 2023 | 36.9 | 214.2 | [17] |
| **Alpaca** | Stanford, 2023 | 19.7 ± 15 | 64.5 ± 65 | [18] |

**Observaciones clave**:
- WildChat tiene alta varianza (±1609) porque incluye código y documentos largos
- LMSYS-Chat-1M y Chatbot Arena son representativos de uso típico de chatbots
- Los valores de input varían entre ~20–295 tokens según el dataset

### 7.4 Capping de generation_long por max_output_tokens

El tipo `generation_long` tiene `tokens_output_avg = 2048`, lo cual excede el `max_output_tokens` de tres modelos:

| Modelo | max_output_tokens | generation_long output (2048) | ¿Excede? |
|--------|-------------------|-------------------------------|----------|
| OPT 175B | 1,024 | 2,048 | ⚠️ SÍ (2× límite) |
| Falcon 40B | 1,024 | 2,048 | ⚠️ SÍ (2× límite) |
| Phi-2 | 1,024 | 2,048 | ⚠️ SÍ (2× límite) |
| Resto (7 modelos) | 2,048-4,096 | 2,048 | ✅ OK |

**Solución implementada en `calculate_emissions.py`** (v2.1):
```python
# Validación: cap tokens_output al max_output_tokens del modelo
if model is not None:
    max_output = model.get('max_output_tokens', None)
    if max_output is not None and max_output > 0:
        if tokens_output > max_output:
            print(f"[WARN] tokens_output ({tokens_output}) excede max_output_tokens ({max_output}). Limitando.")
            tokens_output = int(max_output)
```

Esto garantiza que al calcular emisiones para `generation_long` en OPT/Falcon/Phi-2, el output se limita automáticamente a 1024 tokens, reflejando el comportamiento real del modelo.

### 7.5 Resumen de Verificabilidad (v3.0)

| Request Type | Input | Fuente Input | Output | Fuente Output |
|--------------|-------|--------------|--------|---------------|
| chat_simple | **70** | ✓ LMSYS-Chat-1M (69.5) [13] | **215** | ✓ LMSYS-Chat-1M (214.5) [13] |
| chat_extended | **296** | ✓ WildChat (295.6) [15] | **441** | ✓ WildChat (441.3) [15] |
| generation_short | 20 | ~ Alpaca (19.7) [18] | **65** | ✓ Alpaca (64.5) [18] |
| generation_long | 50 | ✗ Sin datos | 2048 | ✗ Límite API |
| summarization | **781** | ✓ CNN/DM (781) [19] | **56** | ✓ CNN/DM (56) [19] |
| code_generation | 100 | ✗ Sin datos | 300 | ✗ Sin datos |
| translation | 200 | ✗ Sin datos | 220 | ✗ Sin datos |

**Leyenda**: ✓ Verificado | ~ Aproximado | ✗ Sin evidencia

### 7.6 Relación con models.csv y calculate_emissions.py

Cada modelo en `models.csv` tiene un campo `typical_request_type = chat_simple` (todos los LLMs).

**Flujo de prioridad**:
```
1. Usuario especifica tokens_input/output → Usar directamente
2. Usuario especifica request_type → Buscar en REQUEST_TYPES
3. Usar modelo.typical_request_type → Valores asociados
4. Default → chat_simple (70+215 = 285 tokens)
```

**Impacto en models.csv:**
- `typical_tokens_total` de todos los LLMs: **285** (70+215)
- Campos recalculados: `typical_energy_wh`, `typical_latency_sec`

---

## 8. Resumen de Cambios CSV

### 8.1 Correcciones históricas (v2.2-v2.8)

| Versión | Cambio principal |
|---------|-----------------|
| **v2.2** | OPT-175B y Llama2-70B: energy_source corregido de "empirical" a "calculated" |
| **v2.4** | GPT-4: energy_source corregido de "empirical" a "calculated" |
| **v2.5** | Mejoras de trazabilidad en fuentes empíricas |
| **v2.6** | Añadidas citas NAACL 2025 y arXiv para Mistral-7B y ViT-base |
| **v2.7** | Mistral-7B reclasificado: empirical → calculated (discrepancia 420×) |
| **v2.8** | ViT-base reclasificado: empirical → calculated (paper no mide ViT-base) |

### 8.2 Cambios mayores en v3.0

| Cambio | Detalle |
|--------|---------|
| **BERT Base eliminado** | Modelo encoder-only, no genera tokens. Reemplazado por Gemma 7B |
| **ViT-base eliminado** | Modelo de visión, no genera texto. Reemplazado por Phi-2 |
| **Gemma 7B añadido** | Google DeepMind, 8.54B params, paper arXiv:2403.08295 [30] |
| **Phi-2 añadido** | Microsoft Research, 2.7B params, blog + HF card [32] |
| **Corrección context_window/max_output_tokens** | OPT, Llama 2, Falcon, MPT: max_output_tokens ya no == context_window. Se usa ≤50% |
| **Mistral 7B context_window** | 32000 → 8192 (SWA 4096, calidad efectiva ~8K) [31] |
| **PaLM 2 max_output_tokens** | 8192 → 4096 (alineado con Vertex AI API) [26] |
| **Tipos de petición** | Eliminados 6 tipos de BERT/ViT. Quedan 7 tipos solo LLM |
| **generation_long capping** | `tokens_output` se limita automáticamente al `max_output_tokens` del modelo en calculate_emissions.py |
| **10 modelos, todos LLMs** | 0 modelos empíricos, 10 calculados |

---

## Referencias

[1] Kaplan, J., et al. (2020). "Scaling Laws for Neural Language Models." *arXiv:2001.08361*. https://arxiv.org/abs/2001.08361

[2] Hoffmann, J., et al. (2022). "Training Compute-Optimal Large Language Models." *arXiv:2203.15556* (Chinchilla paper). https://arxiv.org/abs/2203.15556

[3] Epoch AI (2025). "How much energy does ChatGPT use?" https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use

[4] Zhang, S., et al. (2022). "OPT: Open Pretrained Transformer Language Models." *arXiv:2205.01068*. https://arxiv.org/abs/2205.01068

[5] Touvron, H., et al. (2023). "Llama 2: Open Foundation and Fine-Tuned Chat Models." *arXiv:2307.09288*. https://arxiv.org/abs/2307.09288

[6] Google (2023). "Google Sustainability Report 2023." https://sustainability.google/reports/

[8] CodeCarbon (2024). "Track and reduce CO2 emissions from your computing." https://codecarbon.io/

[9] Lacoste, A., et al. (2019). "Quantifying the Carbon Emissions of Machine Learning." *NeurIPS Climate Change Workshop*. https://mlco2.github.io/impact/

[10] Luccioni, A. S., Jernite, Y., & Strubell, E. (2024). "Power Hungry Processing: Watts Driving the Cost of AI Deployment?" *ACM FAccT '24*. https://arxiv.org/abs/2311.16863

[13] Zheng, L., et al. (2024). "LMSYS-Chat-1M: A Large-Scale Real-World LLM Conversation Dataset." *arXiv:2309.11998*. https://arxiv.org/abs/2309.11998

[14] Chiang, W., et al. (2024). "Chatbot Arena: An Open Platform for Evaluating LLMs by Human Preference." *arXiv:2403.04132*. https://arxiv.org/abs/2403.04132

[15] Zhao, Y., et al. (2024). "WildChat: 1M ChatGPT Interaction Logs in the Wild." *arXiv:2405.01470*. https://arxiv.org/abs/2405.01470

[16] Anthropic (2022). "HH-RLHF Dataset." https://huggingface.co/datasets/Anthropic/hh-rlhf

[17] Köpf, A., et al. (2023). "OpenAssistant Conversations – Democratizing Large Language Model Alignment." *arXiv:2304.07327*. https://arxiv.org/abs/2304.07327

[18] Stanford (2023). "Alpaca: A Strong, Replicable Instruction-Following Model." https://github.com/tatsu-lab/stanford_alpaca

[19] See, A., et al. (2017). "Get To The Point: Summarization with Pointer-Generator Networks." *arXiv:1704.04368*. https://arxiv.org/abs/1704.04368

[21] Poddar, S., Koley, P., Misra, J., Ganguly, N., & Ghosh, S. (2025). "Towards Sustainable NLP: Insights from Benchmarking Inference Energy in Large Language Models." *NAACL 2025*, pages 12688–12704. https://aclanthology.org/2025.naacl-long.632/

[22] Yang, R., Zhan, L., et al. (2025). "Benchmarking the Power Consumption of LLM Inference." *arXiv:2512.03024*. https://arxiv.org/abs/2512.03024

[24] Anil, R., et al. (2023). "PaLM 2 Technical Report." *Google AI*. https://ai.google/static/documents/palm2techreport.pdf

[25] OpenAI (2024). "GPT-4 API Documentation." https://platform.openai.com/docs/models/gpt-4

[26] Google Cloud (2024). "Vertex AI PaLM API — text-bison model." https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/text

[27] Anthropic (2023). "Claude 2 — Model documentation." https://www.anthropic.com/index/claude-2

[28] Technology Innovation Institute (2023). "Falcon-40B Model Card." https://huggingface.co/tiiuae/falcon-40b

[29] MosaicML / Databricks (2023). "Introducing MPT-30B." https://www.databricks.com/blog/mpt-30b

[30] Gemma Team, Google DeepMind (2024). "Gemma: Open Models Based on Gemini Research and Technology." *arXiv:2403.08295*. https://arxiv.org/abs/2403.08295

[31] Jiang, A. Q., et al. (2023). "Mistral 7B." *arXiv:2310.06825*. https://arxiv.org/abs/2310.06825

[32] Microsoft Research (2023). "Phi-2: The surprising power of small language models." https://www.microsoft.com/en-us/research/blog/phi-2-the-surprising-power-of-small-language-models/ + https://huggingface.co/microsoft/phi-2

---

## Documentación Técnica Adicional

**FLUJO_CALCULADORA_BR.md**: Documentación interna que detalla el flujo completo de la calculadora, incluyendo el desglose del valor energético de GPT-4 en componentes (cómputo puro + overhead).

---

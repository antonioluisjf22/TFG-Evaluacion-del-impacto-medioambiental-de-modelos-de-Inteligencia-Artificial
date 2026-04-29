# Prompt para Claude Opus: Mejora del Frente de Pareto en calculadora de impacto medioambiental de IA

## CONTEXTO DEL PROYECTO

Estoy desarrollando una calculadora web de impacto medioambiental de modelos de IA como TFG (Trabajo de Fin de Grado). El stack es: **Flask (Python)** en backend, **Vanilla JS + Chart.js** en frontend.

### Arquitectura actual relevante

```
app/
  routes/api.py              — endpoints REST Flask
  services/calculator_service.py  — envuelve CarbonCalculator
  services/report_service.py      — genera tablas comparativas
  static/js/app.js           — toda la lógica JS del frontend (~4500 líneas)
scripts/
  calculate_emissions.py     — motor principal de cálculo (CarbonCalculator, EmissionResult)  
  reports_generator.py       — genera comparative_table con los campos para Pareto
datasets/raw/models/
  models.csv                 — 10 modelos LLM con sus métricas
```

### Fórmula de cálculo de CO₂
```
CO2_TOTAL = CO2_Device + CO2_Network + CO2_DataCenter
```
- El cálculo es **puramente teórico** usando la fórmula `2N FLOPs` (2 × num_parameters × tokens)
- La energía por token es directamente proporcional al número de parámetros del modelo
- La velocidad (tokens/s) también se calcula inversamente proporcional al tamaño del modelo

---

## PROBLEMA CENTRAL

**El frente de Pareto siempre elige a Phi-2 como ganador, independientemente de los criterios activos (CO₂, Velocidad, Latencia, Tamaño de modelo).**

### Por qué ocurre esto (análisis técnico)

El dataset actual tiene 10 modelos calculados TODOS con la misma fórmula teórica:
```python
E_token = (2 × N_params × 1000) / (GPU_TFLOPS × 10^12) × GPU_TDP / 3600
```

Esto genera una correlación perfecta y monótona: cuanto más pequeño el modelo → menos CO₂ Y más velocidad. Phi-2 (2.7B params) gana en TODOS los criterios que existen actualmente porque tiene el menor tamaño.

**Valores actuales del dataset (models.csv):**
```
model_id       | num_parameters | energy_wh_per_1k | tokens_per_second | latency_ms_per_token
gpt-4          | 1.7T           | 0.443178         | 28.6              | 35.0
palm2          | 340B           | 0.538145         | 101.6             | 9.84
opt-175b       | 175B           | 0.276986         | 22.2              | 45.0
claude-2       | 100B           | 0.203500         | 261.1             | 3.83
llama2-70b     | 70B            | 0.142450         | 35.7              | 28.0
falcon-40b     | 40B            | 0.081400         | 366.3             | 2.73
mpt-30b        | 30B            | 0.085470         | 361.0             | 2.77
gemma-7b       | 8.54B          | 0.024330         | 819.7             | 1.22
mistral-7b     | 7.3B           | 0.020798         | 125.0             | 8.0  ← nota: latency inconsistente
phi-2          | 2.7B           | 0.012821         | 892.9             | 1.12
```

**Phi-2 tiene el menor CO₂, mayor velocidad y menor latencia simultáneamente → domina a TODOS en todos los criterios.** El "tamaño de modelo" como criterio tampoco ayuda porque Phi-2 también es el más pequeño (lo que se considera "mejor" en ese criterio de eficiencia).

---

## LO QUE QUIERO CONSEGUIR

### Objetivo 1: Romper la dominancia trivial de Phi-2 añadiendo una dimensión de CALIDAD

El frente de Pareto debe reflejar **trade-offs reales** entre sostenibilidad y capacidad. Un modelo más grande consume más pero también ofrece más calidad. Necesito añadir una métrica de **rendimiento/calidad del modelo** (benchmark score) como criterio Pareto adicional en el frontend (criterio "Calidad").

**IMPORTANTE: Los scores NO deben añadirse al CSV.** Son datos estáticos que no varían con el cálculo de emisiones, así que deben hardcodearse directamente en el frontend JavaScript como una **lookup table por nombre de modelo** (objeto literal JS). El backend y el CSV no se tocan para esto.

**Fuentes de scores de referencia reales (ya publicados):**
- MMLU (Massive Multitask Language Understanding) — normalizado a 0.0–1.0
- Cuando no hay datos MMLU, usar MT-Bench normalizado (÷10) o estimación por parámetros como fallback

Scores aproximados documentados para los modelos actuales:
```
GPT-4:      MMLU ~0.864
PaLM 2:     MMLU ~0.780
Claude 2:   MMLU ~0.785
Llama2-70B: MMLU ~0.685
Falcon-40B: MMLU ~0.551
MPT-30B:    MMLU ~0.460
Gemma-7B:   MMLU ~0.643
Mistral-7B: MMLU ~0.628  ← alta para su tamaño, clave para Pareto interesante
OPT-175B:   MMLU ~0.260  ← muy bajo, quedará dominado
Phi-2:      MMLU ~0.570  ← moderado, ya no domina en calidad
```

Con esta dimensión, Phi-2 ya **no domina** a modelos como Mistral-7B (más calidad, tamaño similar), Claude-2 o GPT-4 (mucha más calidad aunque peor CO₂). El frente pasará de 1 modelo a 3-5 modelos con trade-offs reales.

### Objetivo 2: Expandir el dataset de modelos (de 10 a ~20-25 modelos)

Añadir modelos con perfiles de trade-off variados que enriquecen el frente de Pareto:
- **Modelos con alta calidad pero gran tamaño**: GPT-4o, Claude 3 Sonnet/Haiku, Llama 3 70B, Mixtral 8x7B (MoE)
- **Modelos eficientes de nueva generación**: Phi-3 Mini/Medium, Gemma 2 9B, Mistral Nemo, Qwen2 7B
- **Modelos medianos con buen balance calidad/eficiencia**: Llama 3 8B, Gemma 2 27B, Command R

### Objetivo 3: Incluir el modelo personalizado del usuario en el frente de Pareto

Cuando el usuario define un `__custom__` model (rellenando sus propios params: num_parameters, energy_wh_per_1k_tokens, etc.), ese modelo debe aparecer en el scatter del frente de Pareto con una marca visual especial (por ejemplo, un diamante ◆ o icono "Custom").

Actualmente **se excluye** en `compare_models()`:
```python
# calculator_service.py línea 199:
p.pop("custom_model", None)  # no custom model en comparación  ← PROBLEMA
```

Y en el frontend:
```javascript
// doCompare() línea 1524-1525:
const params = { ...LAST_PARAMS };
delete params.model_id;  // se borra el model_id, pero custom_model podría propagarse
```

---

## CÓDIGO RELEVANTE PARA MODIFICAR

### Backend: `app/services/calculator_service.py` — método `compare_models()`
```python
def compare_models(self, params: dict) -> list[EmissionResult]:
    models = self.calculator.models_df
    if models is None:
        return []

    results: list[EmissionResult] = []
    for model_id in models["model_id"]:
        try:
            p = {**params, "model_id": model_id}
            p.pop("custom_model", None)  # ← EXCLUYE el custom model
            results.append(self.calculate(p))
        except Exception:
            continue
    return results
```

### Backend: `app/routes/api.py` — endpoint `POST /api/compare`
```python
@api_bp.route("/compare", methods=["POST"])
def compare():
    # ...valida params...
    results = calc.compare_models(params)  # ← no pasa custom_model
    comparative = reports.comparative(results)
    for row, result in zip(comparative.get("comparative_table", []), results):
        label_data = reports.energy_label(result)
        row["environmental_label"] = label_data.get("label", {})
    return jsonify(comparative)
```

### Backend: `scripts/reports_generator.py` — `generate_comparative_table()`
```python
def generate_comparative_table(self, results):
    model_meta = {}
    if self.models_df is not None:
        for _, mrow in self.models_df.iterrows():
            model_meta[mrow.get("model_name", "")] = {
                "organization": mrow.get("organization", ""),
                "tokens_per_second": ...,
                "latency_ms_per_token": ...,
                "num_parameters": ...,
                # benchmark_score NO viene del CSV — se gestiona en el frontend
            }
    rows = []
    for r in results:
        meta = model_meta.get(r.model_name, {})
        rows.append({
            "model": r.model_name,
            # ... campos actuales ...
            "tokens_per_second": meta.get("tokens_per_second"),
            "latency_ms_per_token": meta.get("latency_ms_per_token"),
            "num_parameters": meta.get("num_parameters"),
            # ← falta solo: "is_custom": False  (flag para el modelo custom)
        })
```

**Nota**: `benchmark_score` es un dato estático de conocimiento público que no depende del cálculo de emisiones. Se gestionará íntegramente en el frontend JS mediante una lookup table, sin tocar el CSV ni el backend.

### Dataset: `datasets/raw/models/models.csv`
```
Columnas actuales: model_id, model_name, organization, model_type, num_parameters,
flops_training, context_window, max_output_tokens, energy_wh_per_1k_tokens,
energy_source, latency_ms_per_token, latency_source, tokens_per_second,
supported_request_types, typical_request_type, typical_tokens_total,
typical_energy_wh, typical_latency_sec, release_date, source_url, hf_url,
confidence, notes, data_collected_date, energy_methodology
```
**Falta la columna `benchmark_score` (MMLU normalizado 0.0–1.0).**

### Frontend: `app/static/js/app.js` — estado Pareto `PS`
```javascript
const PS = {
    criteria: { co2: true, speed: true, latency: false, params: false },
    // ← falta: quality: false
    scaleLog: true,
    referenceModel: null,
    selectedModels: [],
    topsisWeights: { co2: 0.40, speed: 0.35, latency: 0.25 },
    // ← falta: quality weight en topsisWeights
    table: [],
    paretoModels: [],
    currentModel: '',
    // ...
};
```

```javascript
// findParetoOptimal — falta criterio quality:
function findParetoOptimal(rows) {
    const c = PS.criteria;
    const pareto = [];
    for (const r of rows) {
        const dominated = rows.some(other => {
            // ...
            if (c.co2) { /* ... */ }
            if (c.speed) { /* ... */ }
            if (c.latency) { /* ... */ }
            if (c.params) { /* ... */ }
            // ← falta: if (c.quality) { check benchmark_score (benefit: true) }
            return dominated_all && better_one;
        });
        if (!dominated) pareto.push(r.model);
    }
    return pareto;
}
```

```javascript
// renderParetoConfigBar — falta toggle de Calidad:
bar.innerHTML = `
    <div class="pcfg-group">
        <span class="pcfg-label">CRITERIOS PARETO</span>
        <label class="pcfg-toggle"><input type="checkbox" id="pcrit-co2" ...> CO₂</label>
        <label class="pcfg-toggle"><input type="checkbox" id="pcrit-speed" ...> Velocidad</label>
        <label class="pcfg-toggle"><input type="checkbox" id="pcrit-latency" ...> Latencia</label>
        <label class="pcfg-toggle"><input type="checkbox" id="pcrit-params" ...> Tamaño modelo</label>
        <!-- ← falta: <label class="pcfg-toggle"><input type="checkbox" id="pcrit-quality"> Calidad</label> -->
    </div>
```

---

## RESTRICCIONES IMPORTANTES

1. **No romper la arquitectura existente**: La fórmula de cálculo de CO₂ no debe tocarse; es el núcleo del TFG.

2. **Mantener compatibilidad**: Si un modelo no tiene `benchmark_score` en el CSV (ej. el custom model del usuario), el criterio de calidad debe manejarse graciosamente (ser ignorado o usar un valor neutro).

3. **El custom model debe permitir que el usuario especifique su `benchmark_score`** en el formulario de valores personalizados o asignarlo mediante interpolación por tamaño de modelo (fallback estimado).

4. **No modificar la lógica de emisiones de CarbonCalculator** — solo la capa de comparación y visualización.

5. **No cambiar el esquema de la API pública** salvo añadir campos opcionales a la respuesta del `/api/compare`.

6. **Los nuevos modelos del dataset** deben seguir el mismo esquema CSV existente + nueva columna `benchmark_score`. Los valores de `energy_wh_per_1k_tokens` y `tokens_per_second` para modelos nuevos deben calcularse con la misma fórmula 2N FLOPs que los actuales (para consistencia del TFG).

---

## TAREA SOLICITADA

Proporciona un plan de implementación completo y el código necesario para resolver los 3 objetivos, con el siguiente alcance:

### A. Nuevo `models.csv` ampliado (~20-25 modelos)
- Incluir los 10 modelos existentes + ~12-15 nuevos
- **NO añadir columna `benchmark_score`** — los scores se hardcodean en el frontend JS
- Los nuevos modelos deben cubrir trade-offs distintos:
  - Al menos 2-3 modelos MoE (Mixtral 8x7B, Mixtral 8x22B, Llama 3 70B)
  - Al menos 3-4 modelos pequeños pero de alta calidad (Phi-3 Mini, Gemma 2 9B, Llama 3 8B, Mistral Nemo 12B)
  - Al menos 2 modelos grandes frontier (Claude 3 Sonnet ~70B approx, GPT-4o ~200B active MoE approx)
- Usar la misma fórmula teórica 2N FLOPs para calcular `energy_wh_per_1k_tokens` y `tokens_per_second`
- El CSV mantiene exactamente el mismo esquema de columnas que ya tiene

### B. Backend — propagación de `benchmark_score` y `custom model`
- Modificar `generate_comparative_table()` en `reports_generator.py` para incluir `benchmark_score` en cada fila de la tabla comparativa
- Modificar `compare_models()` en `calculator_service.py` para que, si `params` incluye `custom_model` dict Y `model_id == "__custom__"`, se calcule y añada ese resultado al final de la lista
- En el endpoint `/api/compare` de `api.py`, propagar correctamente el `custom_model` dict cuando esté presente
- El `custom_model` puede incluir un `benchmark_score` opcional; si no lo tiene, asignarlo a `None` (el frontend lo manejará)

### C. Frontend — criterio "Calidad" en el frente de Pareto

Los scores de calidad se definen como una **constante JS** en `app.js`, justo antes de la sección del comparador:

```javascript
// Lookup table de MMLU scores (fuente: papers publicados / Open LLM Leaderboard)
// Escala 0.0–1.0. null = sin dato conocido (se usará fallback por parámetros)
const MODEL_QUALITY_SCORES = {
    'GPT-4':         0.864,
    'PaLM 2':        0.780,
    'OPT 175B':      0.260,
    'Claude 2':      0.785,
    'Llama 2 (70B)': 0.685,
    'Falcon 40B':    0.551,
    'MPT 30B':       0.460,
    'Gemma 7B':      0.643,
    'Mistral 7B':    0.628,
    'Phi-2':         0.570,
    // Nuevos modelos a añadir al dataset:
    'Mixtral 8x7B':  0.706,
    'Llama 3 8B':    0.664,
    'Llama 3 70B':   0.820,
    'Phi-3 Mini':    0.688,
    'Gemma 2 9B':    0.715,
    // ... completar para todos los modelos nuevos del CSV
};

function getQualityScore(modelName, numParameters) {
    if (MODEL_QUALITY_SCORES[modelName] != null) return MODEL_QUALITY_SCORES[modelName];
    // Fallback estimado por tamaño de modelo cuando no hay dato conocido
    if (!numParameters) return null;
    const paramsB = numParameters / 1e9;
    return Math.min(0.90, 0.25 + 0.35 * Math.log10(Math.max(paramsB, 0.1)) / Math.log10(1700));
}
```

Luego:
- Añadir `quality: false` al objeto `PS.criteria`
- Al construir la `table` en `renderComparison`, enriquecer cada fila con `benchmark_score: getQualityScore(row.model, row.num_parameters)` antes de pasarla a `findParetoOptimal`
- Añadir el toggle "Calidad" en `renderParetoConfigBar()` con el mismo estilo que los otros
- Actualizar `findParetoOptimal()` para considerar `benchmark_score` cuando `c.quality === true` (es un criterio benefit: maximize)
- Actualizar `dominates()` igualmente
- En `calculateTOPSIS()`, añadir `benchmark_score` como criterio con peso configurable
- En `renderParetoScatter()`, marcar visualmente el modelo custom con un estilo diferenciado (icono distinto ◆ o color cyan diferente) para que destaque como "tu modelo"
- En el tooltip del scatter (`externalTooltipHandler`), mostrar el `benchmark_score` cuando esté disponible (con etiqueta "MMLU")
- En `doCompare()`, asegurarse de que si `LAST_PARAMS.model_id === '__custom__'`, el `custom_model` dict se incluya en el body del POST `/api/compare`
- Actualizar `updateScatterDesc()` para mencionar la nueva dimensión de calidad cuando esté activa

### D. Score de calidad para el custom model del usuario
El custom model no tendrá una entrada en `MODEL_QUALITY_SCORES`. La función `getQualityScore()` ya maneja esto con el fallback por `num_parameters`:
```
score_estimado ≈ 0.25 + 0.35 × log10(params_B) / log10(1700)
```
Esto da ~0.25 para modelos <1B params, ~0.57 para 7B, ~0.70 para 70B, ~0.85 para el rango de GPT-4. Es solo un valor aproximado para posicionarlo en el frente; no afecta al cálculo de CO₂. En el tooltip se mostrará como "MMLU estimado" en lugar de "MMLU" para que el usuario sepa que es una aproximación.

---

## OUTPUT ESPERADO

1. **El CSV completo ampliado** (`datasets/raw/models/models.csv`) con todos los modelos — **sin columna `benchmark_score`**, mismo esquema que el actual
2. **Parches de código** para:
   - `app/static/js/app.js` — sección principal: constante `MODEL_QUALITY_SCORES`, función `getQualityScore`, enriquecimiento de `table` en `renderComparison`, `PS` state, `findParetoOptimal`, `dominates`, `calculateTOPSIS`, `renderParetoConfigBar`, `renderParetoScatter`, `doCompare`, `updateScatterDesc`, `externalTooltipHandler`
   - `app/services/calculator_service.py` (método `compare_models` — para propagar custom model)
   - `app/routes/api.py` (endpoint `POST /api/compare` — para propagar custom model)
   - `scripts/reports_generator.py` (sección `generate_comparative_table` — solo añadir flag `is_custom`)
3. **Explicación de por qué con estos cambios el frente de Pareto variará** significativamente según los criterios activados:
   - Solo CO₂+Velocidad: seguirán ganando modelos pequeños (Phi-2, Gemma-7B, Mistral-7B)
   - CO₂+Velocidad+Calidad: aparecerán Mistral-7B, Llama3-8B, Phi-3, GPT-4 en el frente (distintos trade-offs)
   - Solo Calidad: solo modelos tipo GPT-4, Claude 3 estarán en el frente
   - Combinaciones mixtas: el frente reflejará trade-offs reales y significativos

---

## NOTAS ADICIONALES PARA CLAUDE OPUS

- El proyecto está en **español** (textos UI, comentarios); mantener el idioma en todo lo nuevo
- La paleta de colores del tema: fondo `#0a1a0f`, verde principal `#00e676`, amarillo `#ffd600`, rojo `#ef4444`, cian `#00e5ff`
- El estilo CSS del toggle de criterios ya existe (clase `pcfg-toggle`) — reutilizarlo para el nuevo criterio
- El TOPSIS ya tiene pesos configurables — el peso de `quality` podría inicializarse en `0.30` y rebalancear los existentes a `{co2: 0.35, speed: 0.30, latency: 0.20, quality: 0.15}` (TOPSIS solo usa criterios activos, así que se puede normalizar)
- Para los modelos MoE, usar `active_parameters` en la fórmula 2N FLOPs (igual que ya hace GPT-4 con ~280B active de 1.7T total); Mixtral 8x7B tiene ~12.9B active de 45B total
- El `is_custom` flag en la fila del comparative_table podría ser simplemente añadido como `True` para el custom y `False` para los demás, sin romper nada existente
- **El CSV no se modifica estructuralmente** — solo se añaden filas de nuevos modelos con las mismas columnas que ya existen. Todos los scores de calidad van en el JS frontend únicamente.


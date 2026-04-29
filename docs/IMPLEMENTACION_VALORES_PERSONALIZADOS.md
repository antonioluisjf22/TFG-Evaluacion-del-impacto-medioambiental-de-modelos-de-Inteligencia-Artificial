# Implementación de Parámetros Personalizados

## Resumen

Permite al usuario introducir sus propios valores para Modelo, Data Center, Dispositivo y Red cuando no están en el dataset. Cada parámetro puede activarse de forma independiente. El backend aplica autocompletado inteligente: **si el usuario especifica un dato concreto, no se le mezclan estimaciones genéricas en campos relacionados**. Se prefiere dejar un campo en `null` antes que inventar un valor inconsistente.

---

## 1. UX/UI — Paneles Custom

Debajo de cada `<select>` principal, añadir:

```html
<button type="button" class="btn-custom-toggle" data-target="custom-panel-MODEL">
  ¿No encuentras el tuyo? → Introducir valores personalizados
</button>

<div id="custom-panel-MODEL" class="custom-input-panel" style="display:none;">
  <div class="custom-panel-header">
    <span class="custom-mode-badge">⚙ Modo personalizado</span>
    <button type="button" class="btn-custom-cancel">✕ Cancelar</button>
  </div>
  <!-- inputs del parámetro -->
</div>
```

**Comportamiento JS**: Al activar un panel, el `<select>` original pasa a `opacity: 0.4; pointer-events: none`. Al cancelar, se revierte. Se lleva la cuenta en:

```javascript
const CUSTOM_ACTIVE = { model: false, dc: false, device: false, network: false };
```

**Estilos** (en `styles.css`, usando variables ya definidas):

```css
.custom-input-panel {
  border-left: 3px solid var(--primary);
  background: var(--card-bg);
  border-radius: 10px;
  padding: 16px;
  /* apertura/cierre con max-height + overflow: hidden */
}
```

---

## 2. Campos por Parámetro

### Modelo (`custom_model`)
| Campo HTML | Columna CSV | Tipo | Notas |
|---|---|---|---|
| `custom_model_name` | `model_name` | texto | Obligatorio |
| `custom_model_energy_wh_per_1k` | `energy_wh_per_1k_tokens` | float | Obligatorio* |
| `custom_model_latency_ms` | `latency_ms_per_token` | float | Obligatorio* |
| `custom_model_params_b` | `num_parameters` × 1e9 | float | Opcional; fallback |
| `custom_model_max_output_tokens` | `max_output_tokens` | int | Opcional |

*Al menos uno de los tres (energy, latency, params) es necesario; el backend deriva los demás.

### Data Center (`custom_dc`)
| Campo HTML | Columna CSV | Tipo | Notas |
|---|---|---|---|
| `custom_dc_name` | `region` | texto | Obligatorio |
| `custom_dc_country_code` | `country_code` | texto ISO-2 | Obligatorio |
| `custom_dc_pue` | `pue` | float ≥ 1.0 | Obligatorio |
| `custom_dc_renewable_pct` | `provider_renewable_pct` | float 0–100 | Opcional |

El campo `country_code` incluye un `<datalist>` con los países ya cargados en `OPTIONS.countries`.

### Dispositivo (`custom_device`)
| Campo HTML | Columna CSV | Tipo | Notas |
|---|---|---|---|
| `custom_device_name` | `device_name` | texto | Obligatorio |
| `custom_device_type` | `device_type` | select | smartphone/laptop/desktop/tablet/server |
| `custom_device_idle_watts` | `system_idle_watts` | float | Obligatorio |
| `custom_device_cpu_tdp` | `cpu_tdp_watts` | float | Obligatorio |
| `custom_device_cpu_inference_watts` | `inference_cpu_watts` | float | Obligatorio |
| `custom_device_gpu_tdp` | `gpu_tdp_watts` | float | 0 si no aplica |
| `custom_device_gpu_inference_watts` | `inference_gpu_watts` | float | 0 si no aplica |
| `custom_device_has_npu` | `has_npu` | checkbox | En el form |
| `custom_device_npu_inference_watts` | `inference_npu_watts` | float | Visible solo si has_npu ✓ |
| `custom_device_primary_target` | `primary_inference_target` | select cpu/gpu/npu | Usado cuando inference_processor = "auto" |

### Red (`custom_network`)
| Campo HTML | Columna CSV | Tipo | Notas |
|---|---|---|---|
| `custom_network_name` | `network_type` | texto | Obligatorio |
| `custom_network_energy_per_mb` | `energy_kWh_per_MB` | float | Obligatorio |

El backend calcula `energy_kWh_per_GB = energy_kWh_per_MB × 1000`.

---

## 3. Frontend — `getFormParams()`

Si el modo custom está activo, usar `"__custom__"` como ID y enviar solo los campos con valor (filtrar nulls):

```javascript
if (CUSTOM_ACTIVE.model) {
    params.model_id = "__custom__";
    const raw = {
        model_name: get("custom_model_name") || null,
        energy_wh_per_1k_tokens: getNum("custom_model_energy_wh_per_1k"),
        latency_ms_per_token: getNum("custom_model_latency_ms"),
        num_parameters: getNum("custom_model_params_b"),  // backend multiplica × 1e9
        max_output_tokens: getNum("custom_model_max_output_tokens"),
    };
    params.custom_model = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== null)
    );
}
// Igual para dc, device, network
```

**Validación cliente** antes de enviar:
- Modelo: al menos un campo de `energy_wh_per_1k_tokens | latency_ms_per_token | num_parameters`
- DC: `pue ≥ 1.0` y `country_code` no vacío
- Dispositivo: `inference_cpu_watts > 0` y `system_idle_watts ≥ 0`
  - Si `inference_processor` específico (no "auto"): verificar disponibilidad (GPU si `gpu_tdp_watts > 0`; NPU si `has_npu` y `npu_inference_watts > 0`)
- Red: `energy_kWh_per_MB > 0`

Errores via `showError()`. `loadExample()` cierra todos los paneles custom activos.

---

## 4. Autocompletado Inteligente (backend) — Casuísticas en detalle

El principio rector es: **el nivel de estimación debe ser coherente con el nivel de especificidad del usuario**. Si el usuario da un dato concreto, no se le mezclan estimaciones genéricas en los campos relacionados. Es preferible dejar un campo en `null` y avisar al usuario a inventar un número que da falsa sensación de precisión.

---

### 4.1 Modelo — Derivación bidireccional

Los tres campos clave son: `num_parameters` (B), `energy_wh_per_1k_tokens` y `latency_ms_per_token`. Están matemáticamente relacionados:

- Energía = 0,00002 × parámetros_B
- Latencia = máx(5, 0,25 × parámetros_B)

La relación es bidireccional: sabiendo cualquiera de los 3, se pueden calcular los otros dos.

**Caso 1 — El usuario da los 3 campos**
No se toca nada. Se usan exactamente los valores que ha introducido.

**Caso 2 — El usuario da 2 de los 3 campos**
Se usa la pareja disponible para estimar el tercero. Por ejemplo, si da energía y latencia, se promedia la estimación de parámetros derivada de cada uno y se rellena ese campo.

**Caso 3 — El usuario da solo 1 campo**
Se toma ese único valor como punto de partida y se calculan los otros dos con las fórmulas. Por ejemplo, si solo da `num_parameters = 70B`, se estima `energy_wh_per_1k = 0,0014` y `latency_ms_per_token = 17,5`.

**Caso 4 — El usuario no da ningún campo numérico**
Se asume 7B como tamaño de modelo estándar pequeño y se calculan los tres campos. Se marcan los tres como estimados en la respuesta.

---

### 4.2 Data Center — Tres casuísticas con PUE y país

Los dos campos críticos son `country_code` y `pue`. El `carbon_intensity` siempre se deriva del país (via lookup o API), nunca se estima inventado.

**¿Por qué el PUE es especial?**
El PUE (eficiencia energética del centro de datos) varía enormemente dentro de un mismo país. En Francia, por ejemplo, va de 1,08 (centro ultramoderno) a 2,0 (instalación antigua). Un promedio global de 1,58 es útil solo cuando el usuario no ha dado ningún dato concreto. Si el usuario ya especificó un país, está diciendo "quiero algo realista para ese entorno", y darle PUE = 1,58 mezclaría información de distintos niveles de certeza.

**Caso 1 — El usuario no da ni país ni PUE**
Es el modo completamente genérico. Se estiman ambos: país = `ES` y PUE = `1,58`. El carbon intensity se obtiene para un DC en España. Los tres campos se marcan como estimados.

**Caso 2 — El usuario da el país pero no el PUE**
Se obtiene el carbon intensity real del país. El PUE se deja en `null`. **No se estima**. El sistema avisa al usuario de que debe proporcionar el PUE para que el cálculo sea coherente con la especificidad del país que indicó. Mezclar "un DC en Alemania" con "PUE global de 1,58" daría un resultado engañosamente preciso.

**Caso 3 — El usuario da tanto el país como el PUE**
Se mantienen ambos valores. El carbon intensity se obtiene del país. Nada se estima. Es el caso de mayor precisión.

**Nota**: `provider_renewable_pct` (% de renovables declarado) es siempre opcional. Si no se da, simplemente no se incluye en el cálculo de ajuste por renovables (se trata como desconocido, no como 0%).

---

### 4.3 Dispositivo — Estimaciones por procesador primario

El dispositivo tiene tres posibles procesadores (CPU, GPU, NPU), cada uno con su TDP y sus watios de inferencia. La lógica estima **solo para el procesador que va a usarse**, y pone explícitamente a 0 los demás (no es una estimación, es una declaración de ausencia).

**Paso 1: Determinar el procesador primario**

El sistema mira qué procesadores tienen valores especificados (TDP > 0 implica presencia):
- Si el usuario marcó explícitamente `primary_inference_target` → se usa ese.
- Si no lo marcó pero dio valores de GPU → se infiere que el procesador primario es GPU.
- Si no lo marcó pero dio valores de CPU → se infiere CPU.
- Si no lo marcó pero dio valores de NPU → se infiere NPU.
- Si no dio ningún valor de procesador → se asume CPU (el más universal) y se marca como estimado.

**Paso 2: Estimar solo para el procesador primario**

Se aplican defaults únicamente al procesador elegido:
- CPU: TDP = 45 W, inferencia = 35 W
- GPU: TDP = 150 W, inferencia = 100 W
- NPU: TDP = 15 W, inferencia = 10 W

Si el usuario ya aportó alguno de esos valores, se respeta. Solo se rellena lo que falta.

**Paso 3: Los otros procesadores van a 0**

Los procesadores que no son el primario reciben TDP = 0 W e inferencia = 0 W de forma explícita. No es una estimación: se declara que ese hardware no está presente o no se usa.

**Paso 4: system_idle_watts**

Si el usuario no lo especificó, se estima según el procesador primario:
- CPU: 5 W (laptop/desktop convencional)
- GPU: 10 W (sistema con gráfica discreta)
- NPU: 3 W (dispositivo de bajo consumo)

**Casuísticas combinadas del dispositivo (ejemplos prácticos):**

**Ejemplo 1: Usuario solo da el nombre del dispositivo**
- Input: `device_name = "Mi laptop"`
- Lo que pasa: Sistema asume que es un dispositivo convencional con CPU. Procesador primario = CPU.
- Estimaciones: CPU TDP = 45 W, CPU inferencia = 35 W, system idle = 5 W
- Los demás: GPU TDP = 0 W, GPU inferencia = 0 W, NPU TDP = 0 W, NPU inferencia = 0 W
- Output: Laptop simulada como dispositivo CPU sin GPU ni NPU

**Ejemplo 2: Usuario da nombre + especifica que tiene GPU (GPU TDP)**
- Input: `device_name = "Mi PC gaming"`, `gpu_tdp_watts = 350`
- Lo que pasa: Sistema detecta que hay GPU (porque `gpu_tdp_watts > 0`). Procesador primario = GPU.
- Estimaciones: GPU inferencia = 100 W (falta esto), system idle = 10 W (falta esto)
- Mantiene: `gpu_tdp_watts = 350` (lo que el usuario dio)
- Los demás: CPU TDP = 0 W, CPU inferencia = 0 W, NPU TDP = 0 W, NPU inferencia = 0 W
- Output: PC gaming con GPU de 350W, sin CPU ni NPU activos

**Ejemplo 3: Usuario da nombre + GPU TDP + GPU inferencia (muy específico)**
- Input: `device_name = "RTX 4090 rig"`, `gpu_tdp_watts = 450`, `gpu_inference_watts = 380`
- Lo que pasa: Usuario fue muy específico. Procesador primario = GPU.
- Estimaciones: Solo falta system idle = 10 W (se estima)
- Mantiene: `gpu_tdp_watts = 450` y `gpu_inference_watts = 380` (usuario los dio)
- Los demás: CPU TDP = 0, CPU inferencia = 0, NPU TDP = 0, NPU inferencia = 0
- Output: Sistema de usuario con GPU con valores muy precisos, resto a 0

**Ejemplo 4: Usuario marca primary_inference_target = "npu" pero no da watios**
- Input: `device_name = "Smartphone con IA"`, `primary_inference_target = "npu"` (marcado explícitamente), pero **ningún watio de procesador**
- Lo que pasa: Usuario dijo explícitamente "el procesador es NPU". Sistema se lo cree.
- Estimaciones: NPU TDP = 15 W, NPU inferencia = 10 W, system idle = 3 W (para NPU)
- Los demás: CPU TDP = 0, CPU inferencia = 0, GPU TDP = 0, GPU inferencia = 0
- Output: Dispositivo NPU con defaults de bajo consumo

**Ejemplo 5: Usuario da valores de CPU y GPU a la vez (conflicto)**
- Input: `device_name = "Laptop con GPU"`, `cpu_tdp_watts = 45`, `gpu_tdp_watts = 100`
- Lo que pasa: Usuario está indicando que el dispositivo tiene ambos procesadores. Sistema debe decidir cuál es el primario.
  - Si usuario marcó `primary_inference_target = "gpu"` → se usa GPU como primario
  - Si no marcó nada → se elige el que tenga TDP mayor (en este caso GPU = 100 > CPU = 45)
- Resultado si GPU es primario: CPU va a 0 (se ignora lo que el usuario dio de CPU). Sistema estima GPU inferencia e idle para GPU.
- Nota importante: Este es un conflicto. Lo ideal es que si el usuario da CPUno esté en el input, no intente darlo. El sistema debería mostrar un aviso: "Diste valores de CPU y GPU; se usa GPU como primario. Si querías CPU, marca CPU explícitamente."

**Interacción con el selector de procesador del formulario (Paso 5):**

En el formulario principal, el usuario elige en el Paso 5 qué procesador usar: "Auto (detectar óptimo)", "CPU", "GPU", "NPU".

Si el dispositivo es **custom**:

- **Opción "Auto (detectar óptimo)"**: El sistema usa directamente el `primary_inference_target` del dispositivo custom (el que el usuario indicó o el que el sistema inferido). No hay inteligencia extra; es lo que se especificó en el panel custom.
  - Ejemplo: Dispositivo custom con `primary_inference_target = "gpu"`, usuario elige "Auto" → se usará GPU para inferencia.

- **Opción de procesador específico (ej: "GPU")**: El usuario está diciendo "quiero usar GPU específicamente". Sistema valida que GPU esté disponible en el dispositivo custom.
  - Si `gpu_tdp_watts > 0` → ✓ GPU disponible, se procede.
  - Si `gpu_tdp_watts = 0` → ✗ GPU no disponible, se lanza error: "**GPU no disponible en este dispositivo**: los watios de GPU están a 0. ¿Quisiste decir CPU?"
  - Si no hay campo `gpu_tdp_watts` en el custom device (nunca lo especificó) → ✗ Se trata como si fuera 0, error.

- **CPU**: Siempre disponible (es el fallback universal). Si el usuario elige CPU, el sistema usa CPU sin validar nada.

Esta validación garantiza que no se simule "usar GPU" en un dispositivo que no tiene GPU.

---

### 4.4 Red — Sin estimaciones complejas

La red solo tiene un campo clave: `energy_kWh_per_MB`. Es obligatorio; sin él no hay cálculo posible. El campo `energy_kWh_per_GB` se calcula automáticamente multiplicando por 1000. No hay casuísticas de estimación: o el usuario da el valor o se muestra un error de validación.



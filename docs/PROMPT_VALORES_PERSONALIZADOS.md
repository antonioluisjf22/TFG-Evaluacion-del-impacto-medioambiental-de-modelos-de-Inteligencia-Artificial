# Prompt para Claude Opus: Implementar Valores Personalizados en Calculadora de Carbono

Eres un experto senior en desarrollo full-stack con Python (Flask) y JavaScript vanilla. Voy a darte el código completo de un proyecto y debes implementar una funcionalidad específica desde cero.

---

## CONTEXTO DEL PROYECTO

Es una calculadora de emisiones de carbono para inferencia de modelos de Inteligencia Artificial. Está construida con Flask (backend) + HTML/CSS/JS puro (frontend). El usuario configura 8 parámetros en un formulario por pasos y obtiene un cálculo detallado del CO₂ emitido.

Los 4 parámetros principales son:
1. **Modelo de IA** (model_id) – se elige de un `<select>` con 10 modelos del CSV `datasets/raw/models/models.csv`
2. **Data Center** (data_center_id) – se elige de un `<select>` con 71 DCs del CSV `datasets/raw/data_centers/data_centers.csv`
3. **Dispositivo cliente** (device_id) – se elige de un `<select>` con 20 dispositivos del CSV `datasets/raw/devices/devices.csv`
4. **Tipo de red** (network_id) – se elige de un `<select>` con 5 redes del CSV `datasets/raw/network/network_energy_sources_2024.csv`

Los otros 4 (tipo de petición, país, procesador, utilización) ya admiten entrada libre o son genéricos.

---

## FUNCIONALIDAD A IMPLEMENTAR

Añadir la posibilidad de que el usuario introduzca sus **propios valores personalizados** para los 4 parámetros principales, cuando su LLM, data center, dispositivo o tipo de red no esté en el dataset.

### UX/UI esperada

Debajo de cada `<select>` principal (modelo, data center, dispositivo, red), añadir un enlace/botón tipo:

> ¿No encuentras el tuyo? → Introducir valores personalizados

Al hacer clic, se despliega (toggle suave) un panel con inputs numéricos y de texto para los campos que necesitan las fórmulas. Al activar el modo custom para un parámetro concreto, el `<select>` original se deshabilita (no se elimina) y se usa en su lugar el panel custom.

Debe poder activarse de forma independiente para cada parámetro: el usuario podría, por ejemplo, usar un modelo custom + data center del dataset + dispositivo custom + red del dataset.

### Campos por parámetro

#### Modelo custom

Todos visibles, los marcados con * son obligatorios para el cálculo:

- `custom_model_name` – Nombre del modelo (texto) *
- `custom_model_energy_wh_per_1k` – Consumo energético (Wh por cada 1.000 tokens) * → número float, placeholder "ej: 0.0023"
- `custom_model_latency_ms` – Latencia (ms por token de salida) * → número float, placeholder "ej: 20"
- `custom_model_params_b` – Parámetros del modelo (en miles de millones) → número float, placeholder "ej: 70" — opcional, se usa como fallback si no hay `energy_wh_per_1k`
- `custom_model_max_output_tokens` – Máx. tokens de salida → número entero, placeholder "ej: 4096"

#### Data center custom

- `custom_dc_name` – Nombre descriptivo (texto) *
- `custom_dc_pue` – PUE (Power Usage Effectiveness) * → número float ≥ 1.0, placeholder "ej: 1.3 (promedio global)"
- `custom_dc_country_code` – Código de país ISO-2 (texto) * → placeholder "ej: ES, US, DE" — se usa para buscar la intensidad de carbono de la zona
- `custom_dc_renewable_pct` – % de renovables declarado por el proveedor → número 0-100, placeholder "ej: 100"

#### Dispositivo custom

- `custom_device_name` – Nombre del dispositivo (texto) *
- `custom_device_type` – Tipo → select con opciones: smartphone, laptop, desktop, tablet, server
- `custom_device_idle_watts` – Consumo en reposo del sistema (W) * → número float, placeholder "ej: 5"
- `custom_device_cpu_tdp` – TDP de la CPU (W) * → número float, placeholder "ej: 15"
- `custom_device_cpu_inference_watts` – Consumo CPU durante inferencia (W) * → número float, placeholder "ej: 12"
- `custom_device_gpu_tdp` – TDP de la GPU (W) → número float, placeholder "ej: 0 si no tiene GPU"
- `custom_device_gpu_inference_watts` – Consumo GPU durante inferencia (W) → número float
- `custom_device_has_npu` – Tiene NPU → checkbox
- `custom_device_npu_inference_watts` – Consumo NPU durante inferencia (W) → número float, visible solo si `has_npu` está marcado
- `custom_device_primary_target` – Procesador principal recomendado para inferencia * → select: cpu, gpu, npu — **este valor se usará cuando el usuario seleccione "Auto (detectar óptimo)" en el paso 5 (Procesador) del formulario principal**

**Interacción con el selector de Procesador (paso 5)**:
- Si el usuario elige **dispositivo custom** y luego selecciona **"Auto (detectar óptimo)"**: el calculador usará el valor de `custom_device_primary_target` como procesador recomendado
- Si el usuario selecciona un procesador específico (CPU, GPU, NPU) y ese procesador no está disponible en el custom device (ej: GPU pero `gpu_tdp_watts = 0`): mostrar error y revertir a CPU como fallback seguro
- El panel custom debe validar: si `has_npu = false` pero `primary_target = npu`, mostrar advertencia inline

#### Red custom

- `custom_network_name` – Nombre descriptivo (texto) *
- `custom_network_energy_per_mb` – Energía por MB transmitido (kWh/MB) * → número float, placeholder "ej: 0.006 (4G típico), 0.001 (Fiber)"

### Diseño visual del panel custom

Los paneles deben encajar visualmente con el estilo glassmorphism/dark del proyecto (usa variables CSS `--card-bg`, `--border-color`, `--primary`, `--text-secondary`, etc., ya definidas en `styles.css`). El panel debe tener:

- Borde `var(--primary)` con `border-left: 3px solid var(--primary)`
- Fondo `var(--card-bg)` con `border-radius: 10px`, `padding: 16px`
- Etiqueta de "Modo personalizado" en `var(--primary)` en la cabecera del panel
- Transición de apertura/cierre con CSS `max-height` + `overflow: hidden`
- El `<select>` original pasa a tener `opacity: 0.4` y `pointer-events: none` cuando el modo custom está activo (visualmente claro que no se usa)

---

## CAMBIOS DE BACKEND

### 1. `scripts/calculate_emissions.py`

El método `calculate_emissions()` actualmente hace:

```python
model = self.get_model(model_id)   # → pd.Series o None
dc = self.get_data_center(data_center_id)  # → pd.Series o None
device = self.get_device(device_id)  # → pd.Series o None
network = self.get_network(network_id)  # → pd.Series o None
```

Modifica la firma para aceptar objetos de datos custom opcionales:

```python
def calculate_emissions(
    self,
    model_id: str,
    data_center_id: str,
    device_id: str,
    network_id: str,
    # ... resto de params existentes sin cambios ...
    # NUEVOS params:
    custom_model: dict = None,
    custom_dc: dict = None,
    custom_device: dict = None,
    custom_network: dict = None,
) -> EmissionResult:
```

La lógica para resolver cada entidad debe ser:

- Si el ID es `"__custom__"` Y se pasó el dict custom → usar el dict custom como si fuera la `pd.Series` (acceso por `.get()` ya funciona en ambos)
- Si el ID no es `"__custom__"` → comportamiento actual (`get_model()`, etc.)
- Los dicts custom deben mapear a los mismos nombres de columna que el CSV. Incluye la transformación al construir el dict custom en el servicio.

**Especial para dispositivo custom + procesador**:
- Al seleccionar un procesador en el paso 5 (inference_processor), la validación debe verificar que ese procesador está disponible en el dispositivo (custom o no)
- Para dispositivos custom: "disponible" significa que los watts de inferencia para ese procesador son > 0
  - CPU disponible si: `custom_device.cpu_inference_watts > 0`
  - GPU disponible si: `custom_device.gpu_tdp_watts > 0` (indicador de presencia física)
  - NPU disponible si: `custom_device.has_npu == True` y `custom_device.npu_inference_watts > 0`
- Si el usuario selecciona un procesador no disponible → lanzar `ValueError` con mensaje claro (ej: "GPU no disponible en este dispositivo: gpu_tdp_watts = 0")
- Si `inference_processor == "auto"` → usar `custom_device.primary_inference_target` (directamente, sin búsqueda en get_valid_processors)

Para el **nombre del modelo** en `EmissionResult`, usar `custom_model.get('model_name', model_id)` si es custom.

Para el **nombre del data center**, usar `custom_dc.get('region', data_center_id)`.

Para `get_dc_renewable_info()` cuando es custom DC: la función debe también aceptar un `custom_dc` override. Simplifica devolviendo el dict con `provider_renewable_pct` y `renewable_grid_pct=None`, `carbon_intensity=None` cuando es custom.

Para `get_carbon_intensity_for_dc()` cuando es custom DC: usar directamente `self.get_carbon_intensity(custom_dc['country_code'])`.

### 2. `app/services/calculator_service.py`

El método `calculate(params)` actualmente solo pasa los 4 IDs + otros params. Modificar para extraer `custom_model`, `custom_dc`, `custom_device`, `custom_network` del dict `params` y pasarlos a `self.calculator.calculate_emissions()`.

Añade también validación básica: si `model_id == "__custom__"` pero no hay `custom_model` en params, lanzar `ValueError("Se requieren datos del modelo personalizado")`. Igual para los demás.

El método `compare_models()` que itera sobre todos los modelos del dataset debe deshabilitar el modo custom para el modelo (siempre usa IDs del dataset), pero seguir usando `custom_dc`, `custom_device`, `custom_network` si están presentes.

### 3. `app/routes/api.py`

El endpoint `POST /api/calculate` actualmente valida:

```python
required = ["model_id", "data_center_id", "device_id", "network_id"]
```

Cambiar la validación: cada campo es requerido SALVO que se use el modo custom. La nueva lógica:

```python
# Para cada parámetro, es válido si:
# (a) tiene un ID no vacío y no "__custom__", O
# (b) es "__custom__" y existe el dict custom correspondiente en el body
```

Ampliar `_sanitize_params()` para que también procese los campos numéricos dentro de `custom_model`, `custom_dc`, `custom_device`, `custom_network` (convertir strings a float/int donde corresponde). Los campos a convertir:

- `custom_model.energy_wh_per_1k_tokens` → float
- `custom_model.latency_ms_per_token` → float
- `custom_model.num_parameters` → float (en billones, multiplicar × 1e9 para que coincida con el CSV)
- `custom_model.max_output_tokens` → int
- `custom_dc.pue` → float
- `custom_dc.provider_renewable_pct` → float
- `custom_device.system_idle_watts`, `cpu_tdp_watts`, `inference_cpu_watts`, etc. → float
- `custom_network.energy_kWh_per_MB` → float; también calcular `energy_kWh_per_GB = energy_kWh_per_MB * 1000`

---

## CAMBIOS DE FRONTEND

### `app/templates/index.html`

Para cada uno de los 4 parámetros (modelo, data center, dispositivo, red), debajo del `<select>` existente (y de su `<div id="X-info">`), añadir:

```html
<!-- Trigger -->
<button type="button" class="btn-custom-toggle" id="btn-custom-MODEL" data-target="custom-panel-MODEL">
  <svg><!-- icono sliders --></svg>
  ¿No encuentras el tuyo? Introducir valores personalizados
</button>

<!-- Panel custom (inicialmente oculto) -->
<div id="custom-panel-MODEL" class="custom-input-panel" style="display:none;">
  <div class="custom-panel-header">
    <span class="custom-mode-badge">⚙ Modo personalizado</span>
    <button type="button" class="btn-custom-cancel" data-target="custom-panel-MODEL">✕ Cancelar</button>
  </div>
  <!-- inputs específicos del parámetro -->
</div>
```

Usar para el panel la clase `custom-input-panel` con los estilos descritos en el apartado de diseño.

Los `<input>` dentro de los paneles deben tener names con prefijo `custom_` seguido del parámetro, por ejemplo:
- `id="custom_model_name"`, `id="custom_model_energy_wh"`, etc.
- `id="custom_dc_name"`, `id="custom_dc_pue"`, etc.

Para el **campo `custom_dc_country_code`**: añadir un `<datalist>` con las opciones del selector `user_country` (reciclando los datos ya cargados en `OPTIONS.countries`) para que el usuario pueda elegir de la lista o escribir su propio código.

Para el campo **`custom_device_has_npu`** (checkbox): al marcar/desmarcar, mostrar/ocultar el campo `custom_device_npu_inference_watts` con transición.

Para el campo **`custom_device_primary_target`**: un `<select>` con opciones cpu/gpu/npu. Cuando se selecciona npu, verificar que has_npu está marcado y si no, mostrar advertencia inline.

### `app/static/js/app.js`

#### Función `initCustomPanels()`

Nueva función a llamar desde `initForm()`. Para cada botón `.btn-custom-toggle`:

- Al hacer clic → mostrar el panel (toggle `display:block`) + añadir clase `custom-active` al `.input-group` padre + deshabilitar el `<select>` del mismo grupo (opacity 0.4, pointer-events none)
- Al hacer clic en `.btn-custom-cancel` → revierte todo

Mantener en un objeto `CUSTOM_ACTIVE` qué parámetros están en modo custom:

```javascript
const CUSTOM_ACTIVE = { model: false, dc: false, device: false, network: false };
```

#### Modificar `getFormParams()`

Para cada parámetro, antes de leer su `<select>`:

1. Si `CUSTOM_ACTIVE.model` → usar `model_id = "__custom__"` y construir `custom_model = { ... }` con los valores de los inputs custom. Si algún campo obligatorio está vacío → lanzar error con mensaje específico al usuario.
2. Igual para dc, device, network.

El objeto `custom_model` que se envía en el body debe tener los nombres de columna del CSV:

```javascript
custom_model: {
  model_name: ...,
  energy_wh_per_1k_tokens: parseFloat(...),
  latency_ms_per_token: parseFloat(...),
  num_parameters: parseFloat(... * 1e9),  // el CSV usa valores en # absoluto de params, no en B
  max_output_tokens: parseInt(...) || null,
}
```

El objeto `custom_dc`:

```javascript
custom_dc: {
  region: ...,       // nombre descriptivo
  country_code: ...,
  pue: parseFloat(...),
  provider_renewable_pct: parseFloat(...) || null,
}
```

El objeto `custom_device`:

```javascript
custom_device: {
  device_name: ...,
  device_type: ...,
  system_idle_watts: parseFloat(...),
  cpu_tdp_watts: parseFloat(...),
  inference_cpu_watts: parseFloat(...),
  gpu_tdp_watts: parseFloat(...) || 0,
  inference_gpu_watts: parseFloat(...) || 0,
  has_npu: document.getElementById('custom_device_has_npu').checked,
  inference_npu_watts: parseFloat(...) || 0,
  primary_inference_target: ...,
}
```

El objeto `custom_network`:

```javascript
custom_network: {
  network_type: ...,
  energy_kWh_per_MB: parseFloat(...),
  energy_kWh_per_GB: parseFloat(...) * 1000,
}
```

#### Validación cliente

Antes de enviar el POST, en `getFormParams()` verificar:

- Si modelo custom: `energy_wh_per_1k_tokens` > 0 y `latency_ms_per_token` > 0
- Si DC custom: `pue` ≥ 1.0 y `country_code` no vacío
- Si device custom: `inference_cpu_watts` > 0 y `system_idle_watts` ≥ 0
  - **Validación adicional de procesador**: antes de enviar, si el usuario ha elegido un `inference_processor` concreto (no "auto"), verificar que ese procesador esté disponible en el dispositivo custom:
    - CPU: siempre disponible (fallback universal)
    - GPU: solo si `gpu_tdp_watts > 0` → si no, mostrar error "GPU no disponible en este dispositivo"
    - NPU: solo si `has_npu == true` Y `npu_inference_watts > 0` → si no, mostrar error "NPU no disponible en este dispositivo"
  - Si mode auto: detectar automáticamente el procesador disponible (CPU > GPU > NPU según disponibilidad)
- Si network custom: `energy_kWh_per_MB` > 0

Si alguna validación falla → mostrar error con la función existente `showError()` y no enviar la petición.

#### `loadExample()`

La función `loadExample()` ya existente no debe interferir con los paneles custom. Si algún panel custom está activo cuando se carga el ejemplo, cerrarlo y volver al modo selector.

#### `populateSelectors()`

Al final, llamar también a `initCustomPanels()`.

---

## INSTRUCCIONES GENERALES DE IMPLEMENTACIÓN

1. **No romper nada existente**: toda la funcionalidad con selectores del dataset debe seguir funcionando idéntica.

2. **Procesador automático con dispositivo custom**: 
   - Si el usuario selecciona un dispositivo custom Y elige "Auto (detectar óptimo)" en el selector de procesador (paso 5):
     - Backend: usa directamente `custom_device['primary_inference_target']` 
     - Frontend: permite la combinación y valida que el procesador indicado esté disponible en el custom device
   - Si el usuario selecciona procesador específico (CPU/GPU/NPU) y dispositivo custom: validar en cliente que ese procesador tiene watts > 0

3. **Compatibilidad con `/api/compare`**: El endpoint de comparación usa `data_center_id`, `device_id`, `network_id` pero no `model_id`. Si alguno de esos tres está en modo custom, deben pasarse los custom objects. El modelo custom NO aplica al comparador (que por definición compara todos los modelos del dataset).

3. **El endpoint `/api/report/breakdown` y `/api/report/production`** también llaman a `calc.calculate(params)`, así que automáticamente funcionarán si `_sanitize_params` y `calculator_service.calculate` están bien actualizados.

4. **Compatibilidad con el Comparador (What-if)**: El módulo "¿Qué hubiera pasado si...?" en la pestaña de resultados genera recalculos cambiando un parámetro. Si el parámetro original era custom, el what-if para ese parámetro debe mostrar el valor custom como opción seleccionada (no tiene que ofrecer cambiar el parámetro custom; puede simplemente omitir ese parámetro del what-if cuando está en modo custom).

5. **Seguridad**: Sanitizar en el servidor todos los inputs de texto de los paneles custom (no ejecutar como código, solo usar como strings de nombre/etiqueta). Los campos numéricos deben ser validados con `isinstance(v, (int, float))` o conversión segura. El campo `country_code` del DC custom debe validarse contra la lista de codes conocidos o al menos verificar que es una cadena de 2-5 caracteres alfanuméricos.

6. **Retrocompatibilidad JSON**: El campo `to_dict()` en `EmissionResult` ya devuelve `metadata.model`, `metadata.device`, etc. Cuando es custom, estos campos deben mostrar el nombre que introdujo el usuario (ej: "Mi modelo LLaMA custom"), no el ID `"__custom__"`.

7. **Estilos**: añadir los estilos de los paneles custom directamente en `styles.css` usando las variables CSS ya existentes. Nombre de clases: `.custom-input-panel`, `.custom-panel-header`, `.custom-mode-badge`, `.btn-custom-toggle`, `.btn-custom-cancel`, `.custom-input-panel .form-row` (para los inputs en 2 columnas dentro del panel).

---

## ARCHIVOS QUE DEBES MODIFICAR

1. `scripts/calculate_emissions.py` → método `calculate_emissions()` y `get_dc_renewable_info()`
2. `app/services/calculator_service.py` → métodos `calculate()` y `compare_models()`
3. `app/routes/api.py` → `calculate()`, `compare()`, `_sanitize_params()`
4. `app/templates/index.html` → añadir paneles custom bajo cada selector principal
5. `app/static/js/app.js` → `initCustomPanels()`, `getFormParams()`, `loadExample()`
6. `app/static/css/styles.css` → estilos de los paneles custom

---

## DATASETS (estructura de columnas relevantes para la implementación)

```
models.csv:         model_id | model_name | organization | num_parameters | energy_wh_per_1k_tokens | latency_ms_per_token | tokens_per_second | context_window | max_output_tokens | ...
data_centers.csv:   dc_id | provider_name | region | country_code | pue | provider_renewable_pct | ...
devices.csv:        device_id | device_name | device_type | cpu_tdp_watts | gpu_tdp_watts | npu_tdp_watts | inference_cpu_watts | inference_gpu_watts | inference_npu_watts | system_idle_watts | has_npu | primary_inference_target | ...
network.csv:        network_type | energy_kWh_per_MB | energy_kWh_per_GB | ...
```

---

## CRITERIO DE ÉXITO

La implementación estará completa cuando:

- Un usuario pueda hacer clic en "¿No encuentras el tuyo?" bajo el selector de modelo, rellenar `energy_wh_per_1k_tokens` y `latency_ms_per_token`, y obtener un resultado de cálculo correcto.
- Un usuario pueda usar un data center personalizado indicando solo su `pue` y `country_code`.
- Un usuario pueda combinar cualquier mezcla de parámetros del dataset + parámetros custom.
- La pestaña Comparador sigue funcionando con selectors del dataset (no acepta modelo custom, sí acepta DC/device/network custom).
- No hay errores de regresión en el flujo estándar con todos los parámetros del dataset.

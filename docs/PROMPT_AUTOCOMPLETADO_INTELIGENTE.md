# Prompt: Lógica de Autocompletado Inteligente para Valores Personalizados

## Objetivo General
Implementar un sistema de autocompletado bidireccional para los campos personalizados de **Modelo**, **Data Center** y **Dispositivo**. 

**Principio clave**: Si el usuario proporciona **ciertos valores**, el sistema debe derivar los demás valores faltantes de forma coherente **SIN estimar valores por defecto genéricos** para campos que ya tienen datos relacionados.

---

## 1. LÓGICA PARA MODELO (Mejorada)

### Comportamiento actual (mantener + mejorar)
- Si `num_parameters` está PRESENTE → calcular `energy_wh_per_1k_tokens` y `latency_ms_per_token` automáticamente
- Si `num_parameters` está AUSENTE → asumir 7B y calcular el resto

### Mejora requerida
Agregar la derivación inversa:
- Si el usuario da `energy_wh_per_1k_tokens` → estimar `num_parameters` (fórmula inversa)
- Si el usuario da `latency_ms_per_token` → estimar `num_parameters` (fórmula inversa)

### Fórmulas
```
energy_wh_per_1k = 0.00002 × params_B
latency_ms_per_token = max(5, 0.25 × params_B)

Inversas:
params_B = energy_wh_per_1k / 0.00002
params_B = latency_ms_per_token / 0.25
```

### Algoritmo
1. Contar cuántos campos están presentes: `num_parameters`, `energy_wh_per_1k_tokens`, `latency_ms_per_token`
2. **Si todos están preentes**: NO modificar nada (usuario sabe exactamente)
3. **Si 2 están presentes**: Usa los 2 disponibles, estima el 3ro
4. **Si 1 está presente**: Calcula los otros 2 a partir de este
5. **Si ninguno está presente**: Asumir 7B, calcular los otros 2

---

## 2. LÓGICA PARA DATA CENTER

### Agrupación de campos por tipo
```
Grupo A (Identificación):
  - region / dc_name (obligatorio)

Grupo B (Configuración técnica):
  - country_code
  - pue
  - provider_renewable_pct

Grupo C (Derivable):
  - carbon_intensity (derivable si tienes country_code)
```

### Reglas de autocompletado

**Regla 1**: Si `country_code` está PRESENTE
- Obtener `carbon_intensity` automáticamente (llamar API o tabla de búsqueda)
- NO estimar PUE (dejar en None hasta que usuario lo especifique)

**Regla 2**: Si `pue` está PRESENTE
- Mantener como está
- NO reemplazar con 1.58

**Regla 3**: Si `country_code` está AUSENTE
- Asumir 'ES' (pero MARCAR COMO ESTIMADO)
- Usar CI de 'ES'

**Regla 4**: Si `pue` está AUSENTE (y user no lo especificó)
- Aplicar 1.58 SOLO si país_code también está ausente (es decir, todo está vacío)
- Si `country_code` fue especificado pero no `pue` → dejar `pue = None` (el usuario deberá especificarlo)

### Razonamiento Conceptual: ¿Por Qué NO Estimar PUE con País?

**El dilema**: El PUE varía enormemente DENTRO del mismo país. Ejemplo Francia:
- DC antiguos: PUE ~1.8-2.0
- DC modernos: PUE ~1.2-1.3
- DC muy modernos: PUE ~1.08
- Promedio nacional: ~1.4

Cuando el usuario es lo suficientemente consciente como para especificar un **país concreto**, está comunicando: *"Quiero algo realista y específico"*. 

Si entonces estimamos `pue = 1.58` (promedio global), obtenemos:
- **Datos inconsistentes**: "Especifico país francés, pero simulan con PUE global"
- **Falsa especificidad**: El número se ve concreto pero es ficticio
- **Problema de coherencia**: No estamos mejorando la precisión, estamos mezclando información

**Matriz de decisiones**:

| Caso | country | PUE | Acción | Lógica |
|------|---------|-----|--------|--------|
| Totalmente genérico | none | none | Estimar: ES, 1.58 | "No especifico nada → dame defaults" |
| Semi-específico | "FR" | none | NO estimar PUE | "Especifico país → tengo datos reales → debo dar PUE" |
| Totalmente específico | "FR" | 1.45 | Mantener ambos | "Tengo datos verificados" |

**Principio subyacente**: **Forzar consistencia entre el nivel de especificidad del usuario y los datos que estimamos**. Es mejor pedir un dato que mezclar información de diferentes niveles de certeza.

### Algoritmo
```python
def _fill_custom_dc_with_intelligence(d: dict) -> tuple[dict, list[str]]:
    estimated = []
    
    # Paso 1: Validar región/nombre (obligatorio)
    if not d.get('region') and not d.get('dc_name'):
        d['region'] = 'DC personalizado'
    
    # Paso 2: Procesar country_code
    if d.get('country_code'):
        # Usuario lo especificó
        d['carbon_intensity'] = lookup_ci(d['country_code'])
    else:
        # Usuario no lo especificó
        d['country_code'] = 'ES'
        d['carbon_intensity'] = lookup_ci('ES')
        estimated.append('País del DC (estimado: ES)')
    
    # Paso 3: Procesar PUE
    # REGLA: Solo estimar PUE si el usuario NO especificó country_code
    # Si user dio country pero no PUE → dejar None (forzar consistencia)
    user_specified_country = d.get('country_code') in request_params.get('custom_dc', {})
    
    if d.get('pue'):
        # Usuario lo especificó explícitamente → mantener tal cual
        pass
    elif not user_specified_country:
        # Usuario NO especificó país ni PUE → aplicar ambos defaults genéricos
        d['pue'] = 1.58
        estimated.append('PUE del DC (estimado: 1.58)')
    else:
        # Usuario especificó país pero NO PUE → NO estimar
        # Esto fuerza que si quieren especificidad geográfica, también especifiquen PUE
        # Evitar: "DC en Francia" + "PUE genérico global" = incoherencia
        d['pue'] = None  # El usuario debe proporcionar este dato
    
    return d, estimated
```

---

## 3. LÓGICA PARA DISPOSITIVO

### Agrupación de campos por tipo
```
Grupo A (Identificación):
  - device_name (obligatorio)

Grupo B (Procesador primario):
  - primary_inference_target (CPU | GPU | NPU)

Grupo C (Consumos - por procesador):
  CPU:
    - cpu_tdp_watts
    - inference_cpu_watts
  GPU:
    - gpu_tdp_watts
    - inference_gpu_watts
  NPU:
    - npu_tdp_watts
    - inference_npu_watts
  
Grupo D (Común):
  - system_idle_watts
```

### Reglas de autocompletado

**Regla 1**: Si `primary_inference_target` está PRESENTE
- Aplicar defaults SOLO para ese procesador
- Para los otros procesadores, dejar TDP/inference en 0 W

**Regla 2**: Si se especifica valores para un procesador (ej: `cpu_tdp_watts`)
- Mantener ese procesador como `primary_inference_target`
- NO estimar valores para otros procesadores
- SI estimar `system_idle_watts` si falta

**Regla 3**: Si nada está especificado
- Asumir `primary_inference_target = 'cpu'`
- Aplicar defaults de CPU (45 W TDP, 35 W inferencia)
- Aplicar `system_idle_watts = 5 W`

### Algoritmo
```python
def _fill_custom_device_with_intelligence(d: dict) -> tuple[dict, list[str]]:
    estimated = []
    
    # Paso 1: Identificar qué se ha especificado
    cpu_specified = any(d.get(k) for k in ['cpu_tdp_watts', 'inference_cpu_watts'])
    gpu_specified = any(d.get(k) for k in ['gpu_tdp_watts', 'inference_gpu_watts'])
    npu_specified = any(d.get(k) for k in ['npu_tdp_watts', 'inference_npu_watts'])
    target_specified = d.get('primary_inference_target')
    
    # Paso 2: Determinar procesador primario
    if target_specified:
        primary = target_specified.lower()
    elif cpu_specified or (gpu_specified and not cpu_specified and not npu_specified):
        # Si CPU está especificado, o GPU está especificado sin CPU ni NPU
        primary = 'gpu' if gpu_specified else 'cpu'
    elif gpu_specified:
        primary = 'gpu'
    elif npu_specified:
        primary = 'npu'
    else:
        # Nada especificado
        primary = 'cpu'
        estimated.append('Procesador de inferencia (estimado: CPU)')
    
    d['primary_inference_target'] = primary
    
    # Paso 3: Aplicar defaults SOLO para el procesador primario
    defaults_map = {
        'cpu': {
            'cpu_tdp_watts': (45.0, 'CPU TDP'),
            'inference_cpu_watts': (35.0, 'CPU inferencia'),
        },
        'gpu': {
            'gpu_tdp_watts': (150.0, 'GPU TDP'),
            'inference_gpu_watts': (100.0, 'GPU inferencia'),
        },
        'npu': {
            'npu_tdp_watts': (15.0, 'NPU TDP'),
            'inference_npu_watts': (10.0, 'NPU inferencia'),
        }
    }
    
    # SOLO para el procesador primario
    for key, (default_val, label) in defaults_map[primary].items():
        if d.get(key) is None:
            d[key] = default_val
            estimated.append(f'{label} (estimado: {default_val} W)')
    
    # Paso 4: Poner a 0 los otros procesadores (no estimado, sino explícito)
    for proc in ['cpu', 'gpu', 'npu']:
        if proc != primary:
            for key in defaults_map[proc].keys():
                if d.get(key) is None:
                    d[key] = 0.0
    
    # Paso 5: system_idle_watts
    if not d.get('system_idle_watts'):
        # Estimar según el tipo de procesador
        idle_defaults = {
            'cpu': 5.0,
            'gpu': 10.0,
            'npu': 3.0,
        }
        d['system_idle_watts'] = idle_defaults.get(primary, 5.0)
        estimated.append(f'Consumo idle (estimado: {d["system_idle_watts"]} W)')
    
    if not d.get('device_name'):
        d['device_name'] = 'Dispositivo personalizado'
    
    return d, estimated
```

---

## 4. IMPLEMENTACIÓN EN BACKEND

### Cambios en `calculate_emissions.py`

Reemplazar las 3 funciones `_fill_custom_*_defaults()` con las versiones mejoradas que:
1. Detecten qué campos fueron especificados por el usuario vs vacíos
2. Apliquen lógica de autocompletado bidireccional
3. Retornen `(dict_completado, lista_estimados)`

**Desafío técnico**: Distinguir entre:
- Campo NO especificado (None / ausente)
- Campo especificado con valor 0 (p.ej., GPU no disponible = 0 W)

**Solución**: En `app.js`, al construir `custom_device`, SOLO incluir campos que tienen valores > 0 O fueron explícitamente tocados por el usuario. Usar un mapa auxiliar si es necesario.

### Cambios en `app/routes/api.py`

- Obtener del request cuáles fueron los campos tocados (incluir información en `custom_model/custom_dc/custom_device` o en headers auxiliares)
- O bien: Pasar un array `estimated_fields_input` que indique qué campos NÓ fueron tocados

---

## 5. IMPLEMENTACIÓN EN FRONTEND

### Cambios en `app.js` - `getFormParams()`

Modificar para tracear qué campos fueron **realmente modificados** por el usuario:

```javascript
function getFormParams() {
    const get = id => { const el = document.getElementById(id); return el ? el.value : ""; };
    const getNum = id => { const v = get(id); return v !== "" ? parseFloat(v) : null; };
    
    const params = {
        model_id: CUSTOM_ACTIVE.model ? "__custom__" : get("model_id"),
        data_center_id: CUSTOM_ACTIVE.dc ? "__custom__" : get("data_center_id"),
        device_id: CUSTOM_ACTIVE.device ? "__custom__" : get("device_id"),
        network_id: get("network_id"),
        inference_processor: get("inference_processor") || "auto",
        utilization: parseFloat(get("utilization")) / 100,
    };
    
    // ... resto de lógica ...
    
    if (CUSTOM_ACTIVE.model) {
        params.custom_model = {
            model_name: get("custom_model_name") || null,
            num_parameters: getNum("custom_model_num_parameters"),
            energy_wh_per_1k_tokens: getNum("custom_model_energy_wh_per_1k_tokens"),
            latency_ms_per_token: getNum("custom_model_latency_ms_per_token"),
        };
        // IMPORTANTE: Filtrar campos null (no especificados)
        params.custom_model = Object.fromEntries(
            Object.entries(params.custom_model).filter(([k, v]) => v !== null)
        );
    }
    
    // Igual para DC y Device
    
    return params;
}
```

---

## 6. CASOS DE USO ESPERADOS

### Caso 1: Modelo - Solo nombre
```
Input:  { model_name: "GPT-5" }
Output: {
    model_name: "GPT-5",
    num_parameters: 7e9,
    energy_wh_per_1k_tokens: 0.00014,
    latency_ms_per_token: 5.0
}
Estimated: [3 campos]
```

### Caso 2: Modelo - Nombre + parámetros
```
Input:  { model_name: "GPT-5", num_parameters: 200e9 }
Output: {
    model_name: "GPT-5",
    num_parameters: 200e9,
    energy_wh_per_1k_tokens: 0.004,
    latency_ms_per_token: 50.0
}
Estimated: [2 campos]
```

### Caso 3: DC - Solo nombre
```
Input:  { region: "Madrid" }
Output: {
    region: "Madrid",
    country_code: "ES",
    pue: 1.58,
    carbon_intensity: 100 (lookup ES)
}
Estimated: [3 campos]
```

### Caso 4: DC - Nombre + país
```
Input:  { region: "London", country_code: "GB" }
Output: {
    region: "London",
    country_code: "GB",
    pue: null  (NO estimar porque usuario especificó país)
    carbon_intensity: 150 (lookup GB)
}
Estimated: [1 campo - carbon_intensity es derivado, no estimado]
```

### Caso 5: Dispositivo - Solo nombre
```
Input:  { device_name: "Mi laptop" }
Output: {
    device_name: "Mi laptop",
    primary_inference_target: "cpu",
    system_idle_watts: 5.0,
    cpu_tdp_watts: 45.0,
    inference_cpu_watts: 35.0,
    gpu_tdp_watts: 0.0,
    gpu_inference_watts: 0.0,
    npu_tdp_watts: 0.0,
    npu_inference_watts: 0.0
}
Estimated: [7 campos]
```

### Caso 6: Dispositivo - Nombre + GPU TDP
```
Input:  { device_name: "Mi PC gaming", gpu_tdp_watts: 350 }
Output: {
    device_name: "Mi PC gaming",
    primary_inference_target: "gpu",
    system_idle_watts: 10.0,  (estimado para GPU)
    gpu_tdp_watts: 350.0,     (especificado)
    inference_gpu_watts: 100.0,  (estimado para GPU)
    cpu_tdp_watts: 0.0,       (no estimado, explícito a 0)
    cpu_inference_watts: 0.0,
    npu_tdp_watts: 0.0,
    npu_inference_watts: 0.0
}
Estimated: [2 campos - system_idle y GPU_inference]
```

---

## 7. CAMBIOS EN ESTRUCTURA DE DATOS

### `EmissionResult`
La estructura actual es correcta. Solo necesita que `estimated_fields` capture los campos estimados inteligentemente.

### `custom_model`, `custom_dc`, `custom_device` (JSON)
Deben contener SOLO los campos especificados por el usuario (sin null/vacíos), el backend se encarga del resto.

---

## 8. RESUMEN DE ARCHIVOS A MODIFICAR

1. **`scripts/calculate_emissions.py`**
   - Reemplazar `_fill_custom_model_defaults()` (lógica bidireccional para modelo)
   - Reemplazar `_fill_custom_dc_defaults()` (lógica inteligente para DC)
   - Reemplazar `_fill_custom_device_defaults()` (lógica por procesador para dispositivo)

2. **`app/static/js/app.js`**
   - Modificar `getFormParams()` para filtrar campos null/vacíos antes de enviar

3. **`app/routes/api.py`** (sin cambios necesarios, el backend maneja todo)

4. **`app/templates/index.html`** (sin cambios necesarios)

5. **CSS** (sin cambios necesarios)

---

## 9. PRIORIDADES DE IMPLEMENTACIÓN

1. **Alta**: Mejorar lógica de DC (actualmente muy genérica)
2. **Alta**: Mejorar lógica de Dispositivo (discriminar por procesador)
3. **Media**: Mejorar lógica de Modelo (añadir derivación inversa)
4. **Media**: Actualizar frontend (`getFormParams()`) para filtrar campos vacíos
5. **Baja**: Documentación y comentarios en código

---

## Pregunta de validación para el usuario

¿Quieres que se autocompletén basándose SIEMPRE en los datos del usuario, o hay algunos campos que consideras que siempre deben ser estimados (ej: nunca autorrellenar `system_idle_watts` automáticamente)?

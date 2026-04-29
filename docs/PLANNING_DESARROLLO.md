# Plan de Desarrollo e Implementación — TFG Calculadora de Carbono

> **Fecha de inicio**: 18 de marzo de 2026  
> **Borrador completo a tutores**: 6 de mayo de 2026  
> **Entrega final**: 20 de mayo de 2026  
> **Tiempo disponible**: ~9 semanas (7 de desarrollo/escritura + 2 de feedback y correcciones)  

---

## 1. Estado actual del proyecto

### Lo que ya está hecho y es aprovechable directamente

| Componente | Estado | Aprovechable como... |
|---|---|---|
| `calculate_emissions.py` | ✅ Completo (v2.2) | **Motor de cálculo principal** — el backend lo consume tal cual. Las fórmulas, fallbacks, selección de procesador y validación de tokens ya funcionan. |
| `carbon_intensity_api.py` | ✅ Completo | **Servicio de CI en tiempo real** — integrable directamente como módulo del backend. Cache de 15 min incluido. |
| `reports_generator.py` | ✅ Completo | **Generador de reportes** — breakdown, comparativas, etiquetas, equivalencias y producción ya implementados. |
| `environmental_labels.py` | ✅ Completo | **Sistema de etiquetado A+++–F** — los umbrales basados en 426k escenarios están validados. |
| `analyze_percentiles.py` | ✅ Completo | Solo para regenerar umbrales si cambia el dataset. No se necesita en producción. |
| Datasets (CSVs) | ✅ Completos | 10 modelos, 71 DCs, 20+ dispositivos, 15 redes, 7 tipos de petición, 125 zonas CI. Se cargan tal cual. |
| `mockups_interactivos_v2.html` | ✅ Completo | **Referencia de diseño UI completa** — 7 pestañas con lógica JS embebida, Plotly, Leaflet, jsPDF. El HTML/CSS/JS sirve de base directa para el frontend. |
| Scripts de extracción (`extract_*.py`) | ✅ Completos | Solo para regenerar CSVs. No se necesitan en la app final. |
| Scripts demo (`demo_calculadora_reportes.py`, `comparativa_modelos.py`) | ✅ Completos | Sirven como **tests de integración** y referencia de uso de la API. |

### Lo que falta por desarrollar

| Componente | Descripción |
|---|---|
| **Aplicación web (Flask)** | Backend con API REST + frontend HTML/CSS/JS con las 7 pestañas del mockup |
| **Parámetros personalizados del usuario** | Formulario que permita al usuario introducir sus propios valores (tokens, watts, PUE, CI) además de seleccionar del dataset |
| **Generación de PDF** | Exportar reportes comparativos como PDF descargable |
| **Mapa interactivo** | Integrar Leaflet con datos reales de DCs y CI por país |
| **Tests automatizados** | Tests unitarios y de integración para el backend |

### Lo que hay que modificar / adaptar

| Componente | Modificación necesaria |
|---|---|
| `calculate_emissions.py` | Añadir método `calculate_from_custom_params()` que acepte valores directos del usuario (watts, PUE, CI, tokens) en lugar de solo IDs de dataset |
| `reports_generator.py` | Asegurar que `to_dict()` del `EmissionResult` incluye todos los campos necesarios para las 7 pestañas |
| `environmental_labels.py` | Verificar que funciona tanto con resultados del dataset como con parámetros custom |
| Mockup HTML | Descomponer en templates Jinja2 reutilizables; migrar la lógica JS a llamadas a la API |

---

## 2. Arquitectura de la aplicación

```
TFG-Evaluacion.../
├── app/                              ← NUEVA carpeta principal
│   ├── __init__.py                   ← Factory de Flask app
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── main.py                   ← Rutas de páginas (render templates)
│   │   └── api.py                    ← Endpoints REST (/api/calculate, /api/compare, etc.)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── calculator_service.py     ← Wrapper sobre CarbonCalculator + params custom
│   │   └── report_service.py         ← Wrapper sobre ReportGenerator
│   ├── templates/
│   │   ├── base.html                 ← Layout base (nav con 7 tabs)
│   │   ├── index.html                ← Página principal con formulario + resultados
│   │   └── components/               ← Fragmentos reutilizables (cards, charts, label)
│   └── static/
│       ├── css/
│       │   └── styles.css            ← Extraído del mockup
│       ├── js/
│       │   ├── calculator.js         ← Lógica de formulario y llamadas a API
│       │   ├── charts.js             ← Inicialización de Plotly charts
│       │   ├── comparator.js         ← Lógica del comparador
│       │   ├── map.js                ← Lógica del mapa Leaflet
│       │   └── simulation.js         ← Lógica de simulación a producción
│       └── data/                     ← JSONs estáticos si se necesitan en el frontend
├── scripts/                          ← Se mantiene como está (motor de cálculo)
├── datasets/                         ← Se mantiene como está
├── tests/                            ← Tests automatizados
│   ├── test_calculator.py
│   ├── test_api.py
│   └── test_reports.py
└── run.py                            ← Punto de entrada: python run.py
```

### Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend | **Flask** | Ligero, Python nativo, reutiliza todo el código existente en `scripts/` |
| Frontend | **HTML/CSS/JS** (vanilla + Jinja2) | El mockup ya está en HTML/CSS/JS puro; no se necesita framework SPA |
| Gráficas | **Plotly.js** | Ya usado en el mockup, interactivo, exportable |
| Mapa | **Leaflet.js** | Ya usado en el mockup, ligero, open source |
| PDF | **jsPDF** (cliente) | Ya integrado en el mockup |
| Tests | **pytest** | Estándar Python, compatible con los tests existentes |

---

## 3. Planificación semanal

### SEMANA 1 — 18-24 marzo: Estructura Flask + API base

**Objetivo**: Tener la app Flask corriendo con los endpoints de cálculo y el formulario básico.

- [ ] Crear estructura de carpetas `app/`
- [ ] Configurar Flask app factory (`__init__.py`, `run.py`)
- [ ] Implementar `calculator_service.py`: wrapper que expone `CarbonCalculator` como servicio
  - Método `calculate_from_dataset(model_id, dc_id, device_id, network_id, request_type, utilization)`
  - Método `calculate_from_custom(params_dict)` para parámetros del usuario
  - Método `get_available_options()` → listas de modelos, DCs, dispositivos, redes
- [ ] Implementar endpoints API en `api.py`:
  - `POST /api/calculate` → calcula emisiones
  - `GET /api/options` → devuelve datasets disponibles
  - `POST /api/compare` → compara múltiples modelos
- [ ] Crear template base (`base.html`) con la navegación de 7 pestañas

**Entregable**: `python run.py` → servidor en localhost:5000 con API funcional.

---

### SEMANA 2 — 25-31 marzo: Formulario + Pestaña de Resultados

**Objetivo**: El usuario puede seleccionar parámetros y ver los resultados de cálculo.

- [ ] Implementar pestaña **Formulario** (Tab 1):
  - Selectores para modelo, DC, dispositivo, red, tipo petición, país
  - Selector de procesador (Auto/CPU/GPU/NPU)
  - Slider de utilización (0-100%)
  - **Modo avanzado**: inputs para parámetros custom (tokens_input, tokens_output, watts, PUE, CI manual)
  - Botón "Calcular"
- [ ] Implementar pestaña **Resultados** (Tab 2):
  - Total CO₂ con badge de etiqueta ambiental
  - Desglose de fórmulas encadenadas (dispositivo, red, data center)
  - Tabla "What-If" con variaciones
  - Equivalencias intuitivas (búsquedas Google, cargas de móvil, horas LED)
- [ ] Conectar formulario → API → resultados vía JS (fetch)

**Entregable**: Flujo completo formulario → cálculo → resultados visible en navegador.

---

### SEMANA 3 — 1-7 abril: Dashboard + Comparador

**Objetivo**: Pestañas analíticas y comparativas funcionales.

- [ ] Implementar pestaña **Dashboard** (Tab 3):
  - Gráfico de tarta (Plotly) — dispositivo vs red vs DC
  - Gráfico de barras — energía por componente
  - Cards detalladas por componente (energía, CI, CO₂, %)
  - Métricas: CI local, CI datacenter, PUE, latencia
- [ ] Implementar pestaña **Comparador** (Tab 4):
  - Scatter Pareto (Plotly) — CO₂ vs tokens/s por modelo
  - 3 cards de recomendación (más sostenible, mejor ratio, más rápido)
  - Tabla comparativa con barras de emisión y ahorro vs actual
  - Endpoint `POST /api/compare` con todos los modelos

**Entregable**: Dashboard y comparador interactivos con datos reales.

---

### SEMANA 4 — 8-14 abril: Simulación + Etiqueta + Mapa + Parámetros custom

**Objetivo**: Completar las pestañas restantes y el modo avanzado del usuario.

- [ ] Implementar pestaña **Simulación** (Tab 5):
  - Input de queries anuales
  - CO₂ anual total con unidades adaptativas (g/kg/ton)
  - Gráfica de proyección a 5 años (modelo actual vs optimizado)
  - Equivalencias escaladas (vuelos, km coche, % hogar)
- [ ] Implementar pestaña **Etiqueta** (Tab 6):
  - Widget EU-style con clase actual resaltada
  - Escala visual A+++–F con umbrales
  - Explicación de los percentiles
- [ ] Implementar pestaña **Mapa Global** (Tab 7):
  - Mapa Leaflet con 71 marcadores de DCs
  - Coloreado de países por CI
  - Popups con CI, PUE, renovables, CO₂ estimado
  - Endpoint `GET /api/map-data` → JSON con datos geográficos
- [ ] Implementar `calculate_from_custom()` en el backend:
  - El usuario puede sobrescribir: tokens, watts del procesador, PUE, CI del DC, CI local, energía de red
  - Validación de rangos (PUE 1.0–3.0, CI 0–1000, watts > 0)
  - Panel colapsable "Parámetros avanzados" en el formulario
  - Indicadores visuales de qué valores son del dataset vs custom
- [ ] Generación de PDF desde el comparador (jsPDF)

**Entregable**: Las 7 pestañas completas y funcionales + modo parámetros custom.

---

### SEMANA 5 — 15-21 abril: Tests + Pulido UI + Capítulo de Diseño

**Objetivo**: Tests, refinamiento visual y completar el capítulo de diseño de la memoria.

- [ ] Pulido CSS: responsive, colores consistentes, tipografía
- [ ] Feedback visual: loading spinners, tooltips educativos, animaciones
- [ ] Verificar accesibilidad básica (contraste, lectores de pantalla)
- [ ] Tests unitarios (`tests/test_calculator.py`):
  - Cálculos con datos del dataset → valores esperados
  - Cálculos con parámetros custom → validación de fórmulas
  - Selección de procesador (auto, manual, fallback)
  - Validación de tokens (cap a max_output_tokens)
- [ ] Tests de API (`tests/test_api.py`):
  - Cada endpoint responde correctamente
  - Validación de parámetros erróneos (400)
  - Respuestas JSON con estructura correcta
- [ ] Tests de reportes (`tests/test_reports.py`):
  - Etiqueta ambiental asignada correctamente
  - Equivalencias calculadas correctamente
  - Comparativa genera ranking correcto
- [ ] **Memoria — Capítulo de Diseño** (04_diseño.tex):
  - Arquitectura software (diagrama Flask + módulos)
  - Diseño de la interfaz (wireframes → mockup → implementación)
  - Diseño de la API REST (endpoints, request/response)
  - Diagramas de secuencia (flujo usuario → API → cálculo → respuesta)
  - Resolver los TODOs pendientes del capítulo

**Entregable**: Suite de tests verde + capítulo de diseño completado + UI pulida.

---

### SEMANA 6 — 22-28 abril: Cap. Análisis + Implementación + Pruebas

**Objetivo**: Escribir los capítulos centrales de la memoria (los más extensos).

- [ ] **Memoria — Actualizar Capítulo de Análisis** (03_analisis.tex):
  - Revisar RF-01 a RF-11 y actualizar según la implementación real
  - Añadir nuevos requisitos funcionales si han surgido (parámetros custom, PDF, mapa)
  - Actualizar requisitos no funcionales si es necesario
  - Validar la trazabilidad requisito → implementación
- [ ] **Memoria — Capítulo de Implementación** (05_implementacion.tex):
  - Estructura del proyecto y stack tecnológico
  - Implementación del motor de cálculo (fórmulas + código)
  - Implementación de la API REST (rutas, servicios)
  - Implementación del frontend (pestañas, charts, mapa)
  - Modo parámetros personalizados
  - Integración con Electricity Maps API
  - Decisiones técnicas y trade-offs
- [ ] **Memoria — Capítulo de Pruebas** (06_pruebas.tex):
  - Estrategia de testing (unitarios, integración, sistema)
  - Matriz de cobertura: tests ↔ requisitos
  - Resultados de las pruebas (capturas, estadísticas)
  - Validación cruzada con herramientas existentes (CodeCarbon)

**Entregable**: Tres capítulos de la memoria redactados.

---

### SEMANA 7 — 29 abril - 5 mayo: Conclusiones + Despliegue + Revisión integral

**Objetivo**: Cerrar la memoria completa y enviarla a los tutores.

- [ ] **Memoria — Capítulo de Conclusiones** (07_conclusiones.tex):
  - Grado de cumplimiento de objetivos (contrastar con la lista del cap. 1)
  - Contribuciones principales del trabajo
  - Limitaciones conocidas
  - Trabajo futuro (greenwashing profundo, más modelos, API pública, entrenamiento)
  - Reflexión personal
- [ ] **Despliegue** (dentro de cap. 6 o aparte):
  - Instrucciones de instalación y ejecución
  - `requirements.txt` actualizado
  - Configuración de credenciales API
  - Opciones de despliegue (local, Docker, Heroku/Render)
- [ ] Verificar que la app funciona en entorno limpio (fresh install)
- [ ] Capturas de pantalla finales para la memoria
- [ ] Resolver TODOs pendientes en todos los .tex
- [ ] Revisión integral de toda la memoria:
  - Coherencia entre capítulos
  - Referencias cruzadas correctas
  - Figuras y tablas numeradas
  - Bibliografía completa
- [ ] Generar anexos si es necesario (manual de usuario, capturas)

**Entregable**: Borrador completo de la memoria.

---

### 📤 6 DE MAYO — Envío del borrador completo a los tutores

---

### SEMANA 8 — 6-12 mayo: Feedback de tutores + Correcciones

**Objetivo**: Incorporar el feedback de los tutores y pulir la app.

- [ ] Aplicar correcciones de los tutores en la memoria
- [ ] Bug fixes y mejoras menores de la app según observaciones
- [ ] Revisión ortográfica y de estilo
- [ ] Preparar scripts de demo para la defensa
- [ ] Preparar `Dockerfile` básico (opcional pero recomendable para la defensa)

**Entregable**: Memoria revisada + app pulida.

---

### SEMANA 9 — 13-20 mayo: Revisión final + Entrega

- [ ] Incorporar feedback adicional de los tutores (si lo hay)
- [ ] Compilar PDF final de la memoria
- [ ] Preparar presentación (15-20 slides)
- [ ] Ensayar demo en vivo de la aplicación
- [ ] **20 de mayo — Entrega oficial**

---

## 4. Resumen de la memoria — Capítulos y estado

| Capítulo | Archivo | Estado actual | Acción |
|---|---|---|---|
| 1. Introducción + Estado del Arte | `01_Introduccion.tex` | ✅ Completo (3 TODOs menores) | Resolver TODOs, revisión final |
| 2. (¿Estado del Arte?) | No existe | ⚠️ Parece integrado en cap. 1 | Verificar si se necesita separar |
| 3. Análisis | `03_analisis.tex` | ✅ Completo pero desactualizado | **Semana 6**: Actualizar requisitos según implementación |
| 4. Diseño | `04_diseño.tex` | 🟡 Parcial (fórmulas ok, falta arq. software) | **Semana 5**: Completar con arquitectura, UI, API |
| 5. Implementación | No existe | ❌ Por crear | **Semana 6**: Crear desde cero |
| 6. Pruebas y Despliegue | No existe | ❌ Por crear | **Semana 6-7**: Crear desde cero |
| 7. Conclusiones | No existe | ❌ Por crear | **Semana 7**: Crear desde cero |

---

## 5. Prioridades y consejos

### Ruta crítica (lo que no puede retrasarse)

```
Semana 1-4: Implementación completa → sin app no hay memoria de implementación
Semana 5:   Tests + Diseño → valida la app y abre la escritura de memoria
Semana 6:   Análisis + Implementación + Pruebas → los 3 capítulos más extensos
Semana 7:   Conclusiones + Revisión → cerrar borrador ANTES del 6 de mayo
            ⚠️ Fecha dura: 6 mayo = envío a tutores
Semana 8-9: Feedback + correcciones → margen para mejorar con las observaciones
```

### Si se va corto de tiempo, priorizar:

1. **Imprescindible**: Tabs 1-2-3 (Formulario + Resultados + Dashboard) + modo custom
2. **Muy importante**: Tab 4 (Comparador) + Tab 6 (Etiqueta)
3. **Importante**: Tab 5 (Simulación) + PDF
4. **Deseable**: Tab 7 (Mapa) — se puede mostrar el mockup como prototipo

### Lo que ya tienes y NO debes rehacer

- **No reimplementes las fórmulas**: `calculate_emissions.py` ya funciona. Envuélvelo, no lo reescribas.
- **No recrees los gráficos desde cero**: El JS de Plotly del mockup es directamente reutilizable.
- **No regeneres los datasets**: Están validados con 426k combinaciones.
- **No cambies la arquitectura de cálculo**: Dispositivo + Red + DC ya está probado y documentado en la memoria.

### Lo que SÍ debes hacer nuevo

- **Capa de servicio Flask**: Conectar el motor Python existente con endpoints REST.
- **Parámetros custom**: Permitir que el usuario sobreescriba valores del dataset con los suyos propios.
- **Templates Jinja2**: Descomponer el HTML monolítico del mockup en templates reutilizables.
- **Tests reales**: Los tests actuales en `testing/` son más demos que tests. Necesitas pytest con asserts.

---

## 6. Diagrama de Gantt simplificado

```
Marzo 2026
 Sem 1  |████████████|  Estructura Flask + API base              DESARROLLO
 Sem 2  |████████████|  Formulario + Resultados                  DESARROLLO

Abril 2026
 Sem 3  |████████████|  Dashboard + Comparador                  DESARROLLO
 Sem 4  |████████████|  Simul. + Etiqueta + Mapa + Custom        DESARROLLO
 Sem 5  |██████|██████| Tests + Pulido + Cap. Diseño             DEV + MEMORIA
 Sem 6  |██████████████████| Cap. Análisis + Impl. + Pruebas    MEMORIA

Mayo 2026
 Sem 7  |██████████████████| Conclusiones + Despliegue + Rev.   MEMORIA
         ───── 6 mayo: 📤 ENVÍO BORRADOR A TUTORES ─────
 Sem 8  |████████████|  Feedback tutores + Correcciones           CORRECCIONES
 Sem 9  |████████|      Revisión final + Entrega                 CIERRE
         ───── 20 mayo: 📦 ENTREGA FINAL ─────
```

---

*Documento generado el 18/03/2026 — Actualizar semanalmente marcando tareas completadas.*

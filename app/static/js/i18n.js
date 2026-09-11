/* ============================================================
   CarbonAI — Traducciones del frontend (ES por defecto / EN)
   ------------------------------------------------------------
   app.js escribe los textos en español y los pasa por t():
       t('Desglose por componente')            → 'Breakdown by component'
       t('Quedan {d} días', { d: 111 })        → '111 days left'
   El idioma se lee de <html lang="…"> (lo fija Flask, ver app/i18n.py).
   Si una clave no tiene traducción se devuelve el español tal cual.
   ============================================================ */
window.CARBONAI_I18N = (function () {
    "use strict";

    const lang = (document.documentElement.lang || "es").toLowerCase().startsWith("en") ? "en" : "es";

    // Español → inglés. Las claves son literalmente los textos de app.js.
    const EN = {
        // ── Formulario ─────────────────────────────────────────────
        "U = {pct}% — Fórmula: P_real = P_idle + (P_max - P_idle) × <strong>{u}</strong>":
            "U = {pct}% — Formula: P_real = P_idle + (P_max - P_idle) × <strong>{u}</strong>",
        "Espera a que carguen los catálogos antes de cargar el ejemplo.": "Wait for the catalogues to load before loading the example.",
        "Ejemplo cargado": "Example loaded",
        "No se pudieron cargar los catálogos. ¿Está el servidor activo?": "Could not load the catalogues. Is the server running?",
        "Contexto: {n} tokens": "Context: {n} tokens",
        "Proveedor: {p}": "Provider: {p}",
        "País: {c}": "Country: {c}",
        "N/D": "N/A",
        "Primario: <strong>{p}</strong>": "Primary: <strong>{p}</strong>",
        "Auto → <strong>{p}</strong> ({w}W, óptimo para este dispositivo)": "Auto → <strong>{p}</strong> ({w}W, optimal for this device)",
        "Usando <strong>{p}</strong>: {w}W": "Using <strong>{p}</strong>: {w}W",
        "Usando <strong>{p}</strong>: {w}": "Using <strong>{p}</strong>: {w}",
        "↑ Selecciona el procesador principal en el Paso 4.": "↑ Select the primary processor in Step 4.",
        "✓ Procesador definido en el Paso 4: <strong>{p}</strong>. El modo «Auto» lo respetará.":
            "✓ Processor defined in Step 4: <strong>{p}</strong>. “Auto” mode will honour it.",
        "Auto → <strong>{p}</strong> ({w}, procesador principal del dispositivo personalizado)":
            "Auto → <strong>{p}</strong> ({w}, primary processor of the custom device)",
        "⚠ {p} no disponible: TDP = 0 W. Introduce los watios de {p} o selecciona otro procesador.":
            "⚠ {p} not available: TDP = 0 W. Enter the {p} watts or select another processor.",
        "Con un uso típico de <strong>100 queries/día</strong>, supondría ~<strong>{kg} kg CO₂/año</strong>. Equivale a {km} km en coche o {h} horas de bombilla LED.":
            "With a typical usage of <strong>100 queries/day</strong>, that would mean ~<strong>{kg} kg CO₂/year</strong>. Equal to {km} km by car or {h} hours of an LED bulb.",
        "<strong>Datos incompletos</strong> — Este cálculo incluye valores genéricos estimados que pueden diferir significativamente de la realidad.":
            "<strong>Incomplete data</strong> — This calculation includes generic estimated values that may differ significantly from reality.",
        "Para mayor precisión, rellena estos campos en el panel personalizado del formulario.":
            "For greater accuracy, fill in these fields in the form's custom panel.",
        "— Selecciona —": "— Select —",
        "Chat Simple": "Simple chat",
        "Chat Extendido": "Extended chat",
        "Chat Complejo": "Complex chat",
        "Generación corta": "Short generation",
        "Generación larga": "Long generation",
        "Generación de código": "Code generation",
        "Resumen de texto": "Text summarisation",
        "Traducción": "Translation",
        "Análisis de imagen": "Image analysis",
        "Calculando…": "Calculating…",
        "Calcular emisiones": "Calculate emissions",
        "GPU no disponible en el dispositivo personalizado: el campo «GPU TDP (W)» está a 0. Introduce los watios de GPU o cambia el procesador del Paso 5.":
            "GPU not available on the custom device: the “GPU TDP (W)” field is 0. Enter the GPU watts or change the processor in Step 5.",
        "NPU no disponible en el dispositivo personalizado: el campo «NPU TDP (W)» está a 0. Introduce los watios de NPU o cambia el procesador del Paso 5.":
            "NPU not available on the custom device: the “NPU TDP (W)” field is 0. Enter the NPU watts or change the processor in Step 5.",
        "Error en el cálculo": "Calculation error",
        "Dispositivo personalizado": "Custom device",

        // ── Países ─────────────────────────────────────────────────
        "Bélgica": "Belgium", "Brasil": "Brazil", "Canadá": "Canada", "Suiza": "Switzerland",
        "Alemania": "Germany", "Dinamarca": "Denmark", "España": "Spain", "Finlandia": "Finland",
        "Francia": "France", "Reino Unido": "United Kingdom", "Irlanda": "Ireland", "Italia": "Italy",
        "Japón": "Japan", "Corea del Sur": "South Korea", "Países Bajos": "Netherlands", "Noruega": "Norway",
        "Polonia": "Poland", "Suecia": "Sweden", "Singapur": "Singapore", "EEUU": "USA",
        "Chequia": "Czechia", "México": "Mexico", "Nueva Zelanda": "New Zealand", "Taiwán": "Taiwan",
        "Estados Unidos": "United States", "Sudáfrica": "South Africa", "Emiratos Árabes": "United Arab Emirates",
        "Arabia Saudí": "Saudi Arabia", "Malasia": "Malaysia", "Tailandia": "Thailand", "Baréin": "Bahrain",

        // ── Resultados ─────────────────────────────────────────────
        "CO₂ Total": "Total CO₂",
        "Energía Total": "Total energy",
        "Etiqueta": "Label",
        "Dispositivo": "Device",
        "Red": "Network",
        "Data Center": "Data centre",
        "Búsquedas Google": "Google searches",
        "Equivale a {n} búsquedas en Google": "Equal to {n} Google searches",
        "Carga de móvil": "Phone charge",
        "{n}% de una carga completa": "{n}% of a full charge",
        "Bombilla LED (9W)": "LED bulb (9W)",
        "{n} minutos encendida": "{n} minutes switched on",
        "Vuelo NYC–Londres": "NYC–London flight",
        "Necesitarías {n} queries para igualar 1 vuelo": "You would need {n} queries to equal 1 flight",
        "1 km en coche": "1 km by car",
        "{n} queries = 1 km en coche": "{n} queries = 1 km by car",
        "1 día de hogar": "1 day of a household",
        "{n} queries = 1 día de consumo doméstico": "{n} queries = 1 day of household consumption",
        "No hay datos de fórmula disponibles.": "No formula data available.",

        // ── Desglose de fórmulas ───────────────────────────────────
        "Sección 2.1.1 — Emisiones del Dispositivo": "Section 2.1.1 — Device emissions",
        "Paso 1: Selección de procesador": "Step 1: Processor selection",
        "Procesador seleccionado:": "Selected processor:",
        "(óptimo para este dispositivo)": "(optimal for this device)",
        "sistema en reposo": "system idle",
        "inferencia": "inference",
        "Paso 2: Potencia real del dispositivo": "Step 2: Real device power",
        "Paso 3: Energía del dispositivo": "Step 3: Device energy",
        "E<sub>disp</sub> = P<sub>real</sub> × t<sub>inferencia</sub> / 3600": "E<sub>dev</sub> = P<sub>real</sub> × t<sub>inference</sub> / 3600",
        "E<sub>disp</sub> = {a} × {b} / 3600 = {r}": "E<sub>dev</sub> = {a} × {b} / 3600 = {r}",
        "Paso 4: CO₂ del dispositivo": "Step 4: Device CO₂",
        "CO₂<sub>disp</sub> = (E<sub>disp</sub> / 1000) × CI<sub>local</sub>": "CO₂<sub>dev</sub> = (E<sub>dev</sub> / 1000) × CI<sub>local</sub>",
        "CO₂<sub>disp</sub> = ({a} / 1000) × {b} = {r}": "CO₂<sub>dev</sub> = ({a} / 1000) × {b} = {r}",
        "Sección 2.1.2 — Emisiones de la Red": "Section 2.1.2 — Network emissions",
        "Paso 1: Datos transferidos": "Step 1: Data transferred",
        "datos<sub>MB</sub> = (1200 + tokens × 5) / 1.000.000": "data<sub>MB</sub> = (1200 + tokens × 5) / 1,000,000",
        "datos<sub>MB</sub> = (1200 + {tokens} × 5) / 1.000.000 = {r}": "data<sub>MB</sub> = (1200 + {tokens} × 5) / 1,000,000 = {r}",
        "1200 bytes = overhead HTTP fijo &nbsp;|&nbsp; 5 bytes/token = payload UTF-8": "1200 bytes = fixed HTTP overhead &nbsp;|&nbsp; 5 bytes/token = UTF-8 payload",
        "Paso 2: Energía de la red": "Step 2: Network energy",
        "E<sub>red</sub> = energía<sub>kWh/MB</sub> × datos<sub>MB</sub> × 1000": "E<sub>net</sub> = energy<sub>kWh/MB</sub> × data<sub>MB</sub> × 1000",
        "E<sub>red</sub> = {a} × {b} × 1000 = {r}": "E<sub>net</sub> = {a} × {b} × 1000 = {r}",
        "Red: {net} ({e} kWh/GB)": "Network: {net} ({e} kWh/GB)",
        "Paso 3: CO₂ de la red": "Step 3: Network CO₂",
        "CO₂<sub>red</sub> = (energy<sub>kWh/GB</sub> × CI<sub>local</sub> / 1000) × datos<sub>GB</sub> × 1000":
            "CO₂<sub>net</sub> = (energy<sub>kWh/GB</sub> × CI<sub>local</sub> / 1000) × data<sub>GB</sub> × 1000",
        "carbon/GB = {a} × {b} / 1000 = {c} kg CO₂/GB<br>CO₂<sub>red</sub> = {d} GB × {c} × 1000 = {r}":
            "carbon/GB = {a} × {b} / 1000 = {c} kg CO₂/GB<br>CO₂<sub>net</sub> = {d} GB × {c} × 1000 = {r}",
        "Sección 2.2 — Emisiones del Data Center": "Section 2.2 — Data centre emissions",
        "Paso 1: Energía de cómputo (vía energy_wh_per_1k_tokens)": "Step 1: Compute energy (via energy_wh_per_1k_tokens)",
        "Metodología: energy_wh_per_1k_tokens del modelo": "Methodology: the model's energy_wh_per_1k_tokens",
        "Paso 2: Energía total del Data Center (con PUE)": "Step 2: Total data centre energy (with PUE)",
        "PUE = {pue} ({dc}). PUE=1.0 sería perfecto.": "PUE = {pue} ({dc}). PUE=1.0 would be perfect.",
        "Paso 3: CO₂ del Data Center": "Step 3: Data centre CO₂",
        "CI del data center = {ci} gCO₂/kWh": "Data centre CI = {ci} gCO₂/kWh",

        // ── What-if ────────────────────────────────────────────────
        "Otro modelo": "Another model",
        "Otro procesador": "Another processor",
        "Otra red": "Another network",
        "Otro data center": "Another data centre",
        "— Sin cambio —": "— No change —",
        "Resultado actual": "Current result",
        "Selecciona una alternativa arriba para comparar.": "Select an alternative above to compare.",
        "{arrow} {pct}% menos": "{arrow} {pct}% less",
        "{arrow} {pct}% más": "{arrow} {pct}% more",

        // ── Dashboard ──────────────────────────────────────────────
        "Datos técnicos detallados": "Detailed technical data",
        "Componente": "Component",
        "Energía (Wh)": "Energy (Wh)",
        "% del Total": "% of total",
        "CI local ({c})": "Local CI ({c})",
        "CI Data Center": "Data centre CI",
        "Latencia total": "Total latency",
        "ms ({n} tokens output)": "ms ({n} output tokens)",
        "<strong>Posible greenwashing:</strong> El proveedor declara <strong>{claim}% renovables</strong> (vía PPAs y certificados), pero la red eléctrica real de la zona solo tiene <strong>{grid}% renovables</strong>. La diferencia de <strong>{gap} puntos porcentuales</strong> se cubre con certificados de energía renovable, no con energía verde real en la red.":
            "<strong>Possible greenwashing:</strong> the provider declares <strong>{claim}% renewables</strong> (via PPAs and certificates), but the real electricity grid of the zone only has <strong>{grid}% renewables</strong>. The <strong>{gap}-percentage-point</strong> gap is covered with renewable energy certificates, not with real green electricity on the grid.",
        "Los datos del proveedor son coherentes con el mix real de la red eléctrica.": "The provider's figures are consistent with the real grid mix.",
        "Renovables reales en la red": "Real renewables on the grid",
        "Declarado por proveedor": "Declared by provider",
        "No hay datos de renovables disponibles para este data center.": "No renewables data available for this data centre.",
        "Renovables reales vs. declaradas — Greenwashing": "Real vs. declared renewables — Greenwashing",
        "Diferencia entre el porcentaje de renovables en la red eléctrica real de la zona (<code>renewable_grid_pct</code>) y el porcentaje declarado por el proveedor mediante PPAs y certificados (<code>provider_renewable_pct</code>).":
            "Difference between the share of renewables in the real electricity grid of the zone (<code>renewable_grid_pct</code>) and the share declared by the provider through PPAs and certificates (<code>provider_renewable_pct</code>).",
        "¿Qué es el greenwashing energético?": "What is energy greenwashing?",
        "El <strong>greenwashing energético</strong> ocurre cuando una empresa declara consumir más energía renovable de la que realmente existe en la red eléctrica que alimenta sus instalaciones. Esto se logra mediante tres mecanismos principales:":
            "<strong>Energy greenwashing</strong> occurs when a company claims to consume more renewable energy than actually exists on the electricity grid that powers its facilities. This is achieved through three main mechanisms:",
        "<strong>PPAs (Power Purchase Agreements):</strong> contratos a largo plazo con productores de energía renovable que permiten \"reclamar\" esa energía aunque físicamente fluya por la red general, no directamente hacia el data center.":
            "<strong>PPAs (Power Purchase Agreements):</strong> long-term contracts with renewable energy producers that allow that energy to be “claimed” even though it physically flows through the general grid, not directly to the data centre.",
        "<strong>RECs / GOs (Renewable Energy Certificates / Garantías de Origen):</strong> certificados negociables que acreditan que un MWh fue generado de forma renovable. Un proveedor compra estos certificados de otro país o región con más solar/eólica, sin que su mix local cambie en absoluto.":
            "<strong>RECs / GOs (Renewable Energy Certificates / Guarantees of Origin):</strong> tradable certificates attesting that one MWh was generated from renewable sources. A provider buys these certificates from another country or region with more solar/wind, without its local mix changing at all.",
        "<strong>Additionality gap:</strong> la energía renovable contratada puede ser de instalaciones ya existentes, por lo que no supone nueva capacidad verde añadida a la red ni reduce las emisiones reales del sistema eléctrico.":
            "<strong>Additionality gap:</strong> the contracted renewable energy may come from already existing installations, so it adds no new green capacity to the grid and does not reduce the real emissions of the electricity system.",
        "El indicador clave es la diferencia entre <code>renewable_grid_pct</code> (mix real de la red según Electricity Maps) y <code>provider_renewable_pct</code> (declarado en la web del proveedor). Una diferencia elevada no implica fraude, pero sí que <em>el carbono real emitido por la red</em> que alimenta al data center es mayor que el que se contabiliza en las declaraciones de sostenibilidad del proveedor.":
            "The key indicator is the difference between <code>renewable_grid_pct</code> (real grid mix according to Electricity Maps) and <code>provider_renewable_pct</code> (declared on the provider's website). A large gap does not imply fraud, but it does mean that <em>the real carbon emitted by the grid</em> powering the data centre is higher than what is accounted for in the provider's sustainability statements.",

        // ── Comparador ─────────────────────────────────────────────
        "CONFIGURACIÓN ACTIVA": "ACTIVE CONFIGURATION",
        "Modelo seleccionado": "Selected model",
        "Procesador": "Processor",
        "País": "Country",
        "Utilización": "Utilisation",
        "Descargar informe PDF": "Download PDF report",
        "CRITERIOS PARETO": "PARETO CRITERIA",
        "Velocidad": "Speed",
        "Latencia": "Latency",
        "Tamaño modelo": "Model size",
        "Calidad": "Quality",
        "ESCALA": "SCALE",
        "REFERENCIA": "REFERENCE",
        "— Ninguno —": "— None —",
        "🧭 ¿Qué modelo me conviene?": "🧭 Which model suits me?",
        "Calidad (MMLU)": "Quality (MMLU)",
        "<strong>Criterios activos:</strong> {names}. Un modelo ★ debe ser mejor en {which} simultáneamente que cualquier otro. El tamaño del frente depende de los trade-offs reales del conjunto de datos.":
            "<strong>Active criteria:</strong> {names}. A ★ model must be better in {which} simultaneously than any other. The size of the front depends on the real trade-offs of the dataset.",
        "ese criterio": "that criterion",
        "esos {n} criterios": "those {n} criteria",
        "<strong>Referencia activa: {ref}.</strong> Las flechas cian parten de ese modelo hacia cada Pareto-óptimo, mostrando qué alternativas lo mejoran objetivamente en los criterios seleccionados.":
            "<strong>Active reference: {ref}.</strong> The cyan arrows go from that model to each Pareto-optimal one, showing which alternatives objectively improve on it in the selected criteria.",
        "<em>Nota: los criterios activos no coinciden con los ejes del gráfico; la frontera step-after no se dibuja, pero los modelos ★ son correctamente Pareto-óptimos en las dimensiones seleccionadas.</em>":
            "<em>Note: the active criteria do not match the chart axes; the step-after frontier is not drawn, but the ★ models are correctly Pareto-optimal in the selected dimensions.</em>",
        "<em>Sin criterios activos, ningún modelo puede dominar a otro (no hay dimensiones de comparación), por lo que todos se consideran Pareto-óptimos. Activa al menos un criterio para obtener un frente significativo.</em>":
            "<em>With no active criteria, no model can dominate another (there are no comparison dimensions), so all are considered Pareto-optimal. Enable at least one criterion to obtain a meaningful front.</em>",
        "Eje X: velocidad de inferencia (tokens/s). Eje Y: huella de CO₂ por consulta (gCO₂). El modelo ideal se sitúa abajo-derecha (rápido y limpio). Los modelos ★ son <strong>Pareto-óptimos</strong>: ningún otro modelo los supera simultáneamente en todos los criterios activos.":
            "X axis: inference speed (tokens/s). Y axis: CO₂ footprint per query (gCO₂). The ideal model sits bottom-right (fast and clean). ★ models are <strong>Pareto-optimal</strong>: no other model beats them simultaneously on all active criteria.",
        "La zona sombreada en verde representa el <strong>frente de Pareto eficiente</strong>.": "The green shaded area is the <strong>efficient Pareto front</strong>.",
        "Arrastra sobre el gráfico para seleccionar múltiples modelos.": "Drag over the chart to select several models.",
        "Modelo personalizado": "Custom model",
        "MMLU estimado": "Estimated MMLU",
        "Clase": "Class",
        "★ Pareto-óptimo": "★ Pareto-optimal",
        "◆ Tu modelo": "◆ Your model",
        "Modelos": "Models",
        "Velocidad (tokens/s)": "Speed (tokens/s)",
        "Seleccionados ({n}): ": "Selected ({n}): ",
        "🏆 Dominancia Pareto": "🏆 Pareto dominance",
        "Modelos del frente de Pareto ordenados por proximidad al punto utópico ideal (mín CO₂ + máx velocidad).":
            "Pareto-front models ranked by proximity to the ideal utopian point (min CO₂ + max speed).",
        "Dist. utópica: {d}": "Utopian dist.: {d}",
        "Domina a <strong>{n}</strong> modelos": "Dominates <strong>{n}</strong> models",
        "⚖️ Análisis TOPSIS": "⚖️ TOPSIS analysis",
        "Ranking multicriterio — ajusta los pesos para recalcular en tiempo real.": "Multi-criteria ranking — adjust the weights to recalculate in real time.",
        "🥇 Óptimo bajo tus preferencias: <strong>{m}</strong> (score: {s})": "🥇 Optimal under your preferences: <strong>{m}</strong> (score: {s})",
        "Selecciona 2–4 modelos:": "Select 2–4 models:",
        "CO₂ Eficiencia": "CO₂ efficiency",
        "Latencia Efic.": "Latency eff.",
        "Energía Efic.": "Energy eff.",
        "Eficiencia Params": "Params efficiency",
        "Domina": "Dominates",
        "Dominado": "Dominated",
        "¿Cuál es tu prioridad principal?": "What is your main priority?",
        "Elige qué aspecto valoras más al seleccionar un modelo de IA.": "Choose which aspect you value most when selecting an AI model.",
        "Sostenibilidad": "Sustainability",
        "Minimizar emisiones de CO₂": "Minimise CO₂ emissions",
        "Máxima rapidez de inferencia": "Maximum inference speed",
        "Compromiso entre ambos": "Compromise between both",
        "¿Necesitas baja latencia?": "Do you need low latency?",
        "Algunas aplicaciones (chatbots en tiempo real, APIs) requieren baja latencia.": "Some applications (real-time chatbots, APIs) require low latency.",
        "Sí, es crítica": "Yes, it is critical",
        "< 20ms por token": "< 20ms per token",
        "No es prioritaria": "Not a priority",
        "Puedo tolerar latencia alta": "I can tolerate high latency",
        "¿Prefiere modelos con más parámetros?": "Do you prefer models with more parameters?",
        "Modelos más grandes suelen ser más capaces, pero más costosos.": "Larger models are usually more capable, but more costly.",
        "Sí, mayor capacidad": "Yes, more capability",
        "Modelos >100B parámetros": "Models >100B parameters",
        "No, eficiencia primero": "No, efficiency first",
        "Modelos compactos y eficientes": "Compact and efficient models",
        "Paso {n} de 3": "Step {n} of 3",
        "Tu modelo recomendado": "Your recommended model",
        "Basado en tus preferencias: {r}.": "Based on your preferences: {r}.",
        "prioridad en sostenibilidad": "sustainability priority",
        "prioridad en velocidad": "speed priority",
        "balance equilibrado": "balanced trade-off",
        ", baja latencia requerida": ", low latency required",
        ", modelos eficientes preferidos": ", efficient models preferred",
        "Pesos TOPSIS: CO₂ {a}% · Velocidad {b}% · Latencia {c}%": "TOPSIS weights: CO₂ {a}% · Speed {b}% · Latency {c}%",
        "Volver a empezar": "Start over",
        "ACTUAL": "CURRENT",
        "Modelo": "Model",
        "Emisión relativa": "Relative emission",
        "Ahorro vs actual": "Saving vs current",
        "Latencia: {x} ms/tok": "Latency: {x} ms/tok",
        "← Modelo seleccionado": "← Selected model",
        "CO₂ total (gCO₂/query)": "Total CO₂ (gCO₂/query)",

        // ── Informe PDF ────────────────────────────────────────────
        "jsPDF no está cargado todavía, inténtalo de nuevo.": "jsPDF is not loaded yet, please try again.",
        "Informe Comparativo de Modelos de IA": "AI Model Comparison Report",
        "Evaluacion del impacto medioambiental en inferencia": "Environmental impact assessment of inference",
        "CarbonAI  |  Calculadora de Carbono para IA  |  ": "CarbonAI  |  Carbon Calculator for AI  |  ",
        "Antonio Luis Jimenez de la Fuente  |  Universidad de Sevilla": "Antonio Luis Jimenez de la Fuente  |  University of Seville",
        "PREPARADO POR": "PREPARED BY",
        "TFG - Evaluacion del impacto medioambiental de modelos de Inteligencia Artificial": "Bachelor's thesis - Environmental impact assessment of Artificial Intelligence models",
        "Modelos analizados:": "Models analysed:",
        "Modelo mas eficiente:": "Most efficient model:",
        "{m}  (Clase {l})": "{m}  (Class {l})",
        "Modelo menos eficiente:": "Least efficient model:",
        "Diferencia maxima:": "Maximum difference:",
        "{p}% mas emisiones (peor vs mejor)": "{p}% more emissions (worst vs best)",
        "Modelo de referencia:": "Reference model:",
        "{m}  (posicion {r} de {n})": "{m}  (position {r} of {n})",
        "Emisiones referencia:": "Reference emissions:",
        "Media del conjunto:": "Set average:",
        "RESUMEN EJECUTIVO": "EXECUTIVE SUMMARY",
        "ALCANCE: Este informe cubre exclusivamente las emisiones de CO2 en la fase de inferencia de los modelos. No incluye emisiones de entrenamiento, fabricacion de hardware ni ciclo de vida completo.":
            "SCOPE: This report covers exclusively the CO2 emissions of the models' inference phase. It does not include training emissions, hardware manufacturing or the full life cycle.",
        "1. Configuracion del escenario de evaluacion": "1. Evaluation scenario configuration",
        "Los parametros de la siguiente tabla definen el escenario de inferencia fijo bajo el cual se han calculado las emisiones de todos los modelos comparados. Estos valores permanecen constantes entre modelos, de modo que la unica variable es el consumo energetico propio de cada modelo (energy_wh_per_1k_tokens).":
            "The parameters in the following table define the fixed inference scenario under which the emissions of all compared models were calculated. These values remain constant across models, so the only variable is each model's own energy consumption (energy_wh_per_1k_tokens).",
        "Modelo de referencia": "Reference model",
        "Tipo de peticion": "Request type",
        "Tokens entrada / salida": "Input / output tokens",
        "PUE del Data Center": "Data centre PUE",
        "Energia renovable DC": "DC renewable energy",
        "Intensidad carbono DC": "DC carbon intensity",
        "Dispositivo del usuario": "User device",
        "Tipo de red": "Network type",
        "Pais del usuario": "User country",
        "Procesador de inferencia": "Inference processor",
        "Utilizacion del procesador": "Processor utilisation",
        "2. Nota metodologica y alcance": "2. Methodological note and scope",
        "Este comparador evalua exclusivamente las emisiones de CO2 asociadas a los modelos de IA durante el periodo de inferencia. El resto de parametros (dispositivo del usuario, red de datos y data center) se mantienen fijos segun la configuracion indicada, de modo que la unica variable entre modelos es su consumo energetico por cada 1.000 tokens procesados (energy_wh_per_1k_tokens). Esto permite una comparacion directa, equitativa y bajo condiciones identicas.":
            "This comparator evaluates exclusively the CO2 emissions associated with the AI models during the inference phase. The remaining parameters (user device, data network and data centre) are held fixed according to the indicated configuration, so the only variable between models is their energy consumption per 1,000 processed tokens (energy_wh_per_1k_tokens). This allows a direct, fair comparison under identical conditions.",
        "Las etiquetas de eficiencia energetica (A+++ hasta F) se asignan en base a la distribucion de percentiles de emisiones del dataset completo de modelos analizados (~639.000 combinaciones de configuraciones), por lo que representan la posicion relativa de cada modelo frente al universo de uso real.":
            "The energy efficiency labels (A+++ to F) are assigned based on the percentile distribution of emissions across the full dataset of analysed models (~639,000 configuration combinations), so they represent the relative position of each model against the universe of real-world use.",
        "Nota: la metodologia de calculo de emisiones con sus tres componentes (dispositivo de usuario, red de datos y data center) corresponde al flujo general de CarbonAI y no aplica directamente a este informe comparativo. En este analisis, todos los parametros del escenario permanecen fijos; la unica variable entre modelos es su consumo energetico por cada 1.000 tokens procesados (energy_wh_per_1k_tokens), lo que garantiza una comparacion equitativa y directa.":
            "Note: the emissions calculation methodology with its three components (user device, data network and data centre) corresponds to CarbonAI's general workflow and does not apply directly to this comparison report. In this analysis, all scenario parameters remain fixed; the only variable between models is their energy consumption per 1,000 processed tokens (energy_wh_per_1k_tokens), which guarantees a fair and direct comparison.",
        "3. Tabla comparativa detallada de modelos": "3. Detailed model comparison table",
        "La siguiente tabla compara los {n} modelos disponibles bajo el mismo escenario de inferencia. Los modelos se ordenan de menor a mayor emision de CO2 por consulta. La columna \"Ahorro vs ref.\" refleja la diferencia porcentual entre cada modelo y el modelo de referencia (marcado con [ref]): un valor negativo indica que ese modelo emite menos CO2 que la referencia (es decir, es mas eficiente), mientras que un valor positivo indica que emite mas. Las etiquetas energeticas (A+++ a D) reflejan la posicion percentil del modelo frente al dataset completo.":
            "The following table compares the {n} models available under the same inference scenario. Models are sorted from lowest to highest CO2 emission per query. The \"Saving vs ref.\" column reflects the percentage difference between each model and the reference model (marked with [ref]): a negative value means that model emits less CO2 than the reference (i.e. it is more efficient), whereas a positive value means it emits more. The energy labels (A+++ to D) reflect the model's percentile position against the full dataset.",
        "Ahorro vs ref.": "Saving vs ref.",
        "Estadisticas del conjunto:": "Set statistics:",
        "Media: {v} gCO2": "Mean: {v} gCO2",
        "4. Analisis e interpretacion de resultados": "4. Analysis and interpretation of results",
        "4.1 Rango de eficiencia del conjunto": "4.1 Efficiency range of the set",
        "El modelo mas eficiente ({bm}, Clase {bl}) emite {bco2} gCO2/query, mientras que el menos eficiente ({wm}, Clase {wl}) emite {wco2} gCO2/query. Esto supone una diferencia de {spread}x entre extremos, lo que evidencia la enorme variabilidad de huella de carbono segun el modelo elegido para una misma tarea de inferencia.":
            "The most efficient model ({bm}, Class {bl}) emits {bco2} gCO2/query, whereas the least efficient ({wm}, Class {wl}) emits {wco2} gCO2/query. This is a {spread}x difference between extremes, which shows the enormous variability of the carbon footprint depending on the model chosen for the same inference task.",
        "No hay datos suficientes para calcular el rango de eficiencia.": "Not enough data to calculate the efficiency range.",
        "4.2 Posicion del modelo de referencia": "4.2 Position of the reference model",
        "posicionandose entre los modelos mas eficientes del conjunto analizado — una opcion sostenible destacada":
            "ranking among the most efficient models of the analysed set — an outstanding sustainable option",
        "situandose entre los modelos con mayor impacto medioambiental del conjunto. Existen alternativas significativamente mas eficientes disponibles en este analisis que podrian reducir la huella de carbono considerablemente":
            "ranking among the models with the highest environmental impact of the set. There are significantly more efficient alternatives available in this analysis that could reduce the carbon footprint considerably",
        "situandose en la franja intermedia del conjunto en cuanto a eficiencia energetica, con margen de mejora frente a los modelos de la zona superior":
            "sitting in the middle band of the set in terms of energy efficiency, with room for improvement compared with the models in the upper zone",
        "Sus emisiones superan la media del conjunto en un {p}% (media: {avg} gCO2/query), lo que representa una penalizacion ambiental notable frente a la mayoria de alternativas disponibles en este analisis.":
            "Its emissions exceed the set average by {p}% (average: {avg} gCO2/query), which represents a notable environmental penalty compared with most alternatives available in this analysis.",
        "Sus emisiones se situan un {p}% por debajo de la media del conjunto (media: {avg} gCO2/query), lo que confirma su buen posicionamiento ambiental dentro del universo de modelos analizado.":
            "Its emissions are {p}% below the set average (average: {avg} gCO2/query), confirming its good environmental position within the analysed universe of models.",
        "El modelo de referencia seleccionado ({m}) ocupa la posicion {r} de {n} con {co2} gCO2/query (Clase {l}), {assess}. Supera en eficiencia al {p}% de los modelos analizados. {avg}":
            "The selected reference model ({m}) ranks {r} of {n} with {co2} gCO2/query (Class {l}), {assess}. It is more efficient than {p}% of the analysed models. {avg}",
        "No se pudo determinar la posicion del modelo de referencia.": "The position of the reference model could not be determined.",
        "4.3 Alternativas mas eficientes al modelo de referencia": "4.3 More efficient alternatives to the reference model",
        "Los siguientes modelos presentan menor huella de carbono que el modelo de referencia y podrian considerarse como alternativas sostenibles:":
            "The following models have a lower carbon footprint than the reference model and could be considered sustainable alternatives:",
        "{co2} gCO2/query  |  Clase {l}  |  {tps} tok/s  |  Ahorro: {s}%": "{co2} gCO2/query  |  Class {l}  |  {tps} tok/s  |  Saving: {s}%",
        "El modelo de referencia ya es el mas eficiente del conjunto o no hay alternativas con menor emision disponibles.":
            "The reference model is already the most efficient of the set or there are no lower-emission alternatives available.",
        "4.4 Impacto a escala productiva": "4.4 Impact at production scale",
        "A modo de referencia, si el modelo de referencia ({m}) procesase 1 millon de consultas diarias, generaria aproximadamente {kgd} kg de CO2 al dia ({ty} toneladas al año). El modelo mas eficiente ({bm}) reduciria esa cifra a {bkgd} kg/dia ({bty} t/año), un ahorro de {s}%.":
            "For reference, if the reference model ({m}) processed 1 million queries per day, it would generate approximately {kgd} kg of CO2 per day ({ty} tonnes per year). The most efficient model ({bm}) would reduce that figure to {bkgd} kg/day ({bty} t/year), a saving of {s}%.",
        "No hay datos de emision del modelo de referencia para calcular el impacto a escala.": "No emission data for the reference model to calculate the impact at scale.",
        "5. Modelos Pareto-optimos": "5. Pareto-optimal models",
        "La frontera de Pareto identifica los modelos que ofrecen el mejor equilibrio posible entre los criterios activos (emisiones de CO2, velocidad en tokens/s y latencia). Un modelo es Pareto-optimo si ningun otro modelo lo supera en todos los criterios simultaneamente. Son la mejor eleccion objetiva cuando no se quiere sacrificar ningun aspecto del rendimiento o la sostenibilidad.":
            "The Pareto frontier identifies the models that offer the best possible balance between the active criteria (CO2 emissions, speed in tokens/s and latency). A model is Pareto-optimal if no other model beats it on all criteria simultaneously. They are the best objective choice when no aspect of performance or sustainability is to be sacrificed.",
        "A diferencia de simplemente elegir el modelo mas rapido o el de menor CO2, la seleccion Pareto incorpora trade-offs multidimensionales. Los modelos aqui listados representan puntos de la frontera eficiente del espacio de decision.":
            "Unlike simply choosing the fastest or the lowest-CO2 model, Pareto selection incorporates multidimensional trade-offs. The models listed here represent points on the efficient frontier of the decision space.",
        "Clase {l}": "Class {l}",
        "Velocidad: {v} tok/s": "Speed: {v} tok/s",
        "Latencia: {v}": "Latency: {v}",
        "No se identificaron modelos Pareto-optimos con los criterios activos actuales. Prueba a ajustar los pesos de los criterios en la interfaz del comparador.":
            "No Pareto-optimal models were identified with the current active criteria. Try adjusting the criteria weights in the comparator interface.",
        "zona eficiente (esquina inferior derecha: baja emision y alta velocidad)": "efficient zone (bottom-right corner: low emission and high speed)",
        "zona intermedia del grafico": "middle zone of the chart",
        "zona de alta emision (esquina superior izquierda)": "high-emission zone (top-left corner)",
        "Los {n} modelos evaluados bajo el mismo escenario presentan una dispersion de {spread}x entre el mas eficiente y el menos eficiente. ":
            "The {n} models evaluated under the same scenario show a {spread}x spread between the most and the least efficient. ",
        "Se identificaron {c} {models} en la frontera de Pareto — {names}{more} —, que representan los mejores equilibrios posibles entre emision de CO2 y velocidad de inferencia: ningun otro modelo del conjunto los supera simultaneamente en ambos criterios. ":
            "{c} {models} were identified on the Pareto frontier — {names}{more} —, representing the best possible balances between CO2 emission and inference speed: no other model in the set beats them simultaneously on both criteria. ",
        "modelo": "model",
        "modelos": "models",
        " entre otros": " among others",
        "No se identificaron modelos Pareto-optimos con los criterios activos actuales, lo que indica que todos los modelos presentan algun trade-off entre emision y velocidad. ":
            "No Pareto-optimal models were identified with the current active criteria, which indicates that all models present some trade-off between emission and speed. ",
        "El modelo mas sostenible es {bm} ({bco2} gCO2/query), mientras que {wm} registra la mayor huella de carbono con {wco2} gCO2/query. ":
            "The most sustainable model is {bm} ({bco2} gCO2/query), whereas {wm} records the largest carbon footprint with {wco2} gCO2/query. ",
        "El modelo de referencia seleccionado, {m}, se situa en la {zone} con {co2} gCO2/query y {tps}.":
            "The selected reference model, {m}, sits in the {zone} with {co2} gCO2/query and {tps}.",
        "velocidad no disponible": "speed not available",
        "De los {n} modelos analizados, {below} presentan emisiones por debajo de la media del conjunto ({avg} gCO2/query) y {above} la superan. ":
            "Of the {n} models analysed, {below} have emissions below the set average ({avg} gCO2/query) and {above} exceed it. ",
        "{bm} destaca como la opcion mas sostenible ({bco2} gCO2/query, Clase {bl}), mientras que {wm} representa el mayor impacto ambiental ({wco2} gCO2/query, Clase {wl}), con una diferencia de {spread}x entre ambos extremos. ":
            "{bm} stands out as the most sustainable option ({bco2} gCO2/query, Class {bl}), whereas {wm} represents the largest environmental impact ({wco2} gCO2/query, Class {wl}), with a {spread}x difference between both extremes. ",
        "El modelo de referencia, {m}, ocupa la posicion {r} de {n} en este analisis y tiene una huella de carbono por encima de la media del conjunto ({avg} gCO2/query), lo que lo situa como uno de los modelos menos eficientes del conjunto. Existen {k} {alts} con menor impacto ambiental disponibles en este comparador.":
            "The reference model, {m}, ranks {r} of {n} in this analysis and has a carbon footprint above the set average ({avg} gCO2/query), which places it among the least efficient models of the set. This comparator offers {k} {alts} with a lower environmental impact.",
        "alternativa": "alternative",
        "alternativas": "alternatives",
        "El modelo de referencia, {m}, ocupa la posicion {r} de {n} en este analisis y tiene una huella de carbono por debajo de la media del conjunto ({avg} gCO2/query), siendo una opcion eficiente dentro del universo de modelos comparados.":
            "The reference model, {m}, ranks {r} of {n} in this analysis and has a carbon footprint below the set average ({avg} gCO2/query), making it an efficient option within the universe of compared models.",
        "Grafico 6: Rendimiento vs Sostenibilidad": "Chart 6: Performance vs Sustainability",
        "Diagrama de dispersion (Scatter Plot) con escala logaritmica en ambos ejes. El eje X representa la velocidad de inferencia (tokens/s) y el eje Y las emisiones de CO2 por consulta. Los modelos situados en la esquina inferior derecha combinan alta velocidad y baja emision, siendo los mas deseables. Los puntos con anillo de pulso destacan los modelos Pareto-optimos.":
            "Scatter plot with logarithmic scale on both axes. The X axis represents inference speed (tokens/s) and the Y axis CO2 emissions per query. Models located in the bottom-right corner combine high speed and low emission, making them the most desirable. Points with a pulsing ring highlight the Pareto-optimal models.",
        "7. Matriz de dominancia cruzada": "7. Cross-dominance matrix",
        "Grafico 8: Comparativa de emisiones CO2/query": "Chart 8: CO2/query emissions comparison",
        "Grafico de barras con escala logaritmica en el eje Y. Cada barra representa las emisiones de CO2 por consulta de un modelo, coloreada segun su etiqueta de eficiencia energetica (verde = clase A, rojo = clase D). El modelo de referencia aparece resaltado.":
            "Bar chart with logarithmic scale on the Y axis. Each bar represents a model's CO2 emissions per query, coloured according to its energy efficiency label (green = class A, red = class D). The reference model is highlighted.",
        "La siguiente matriz compara cada par de modelos de forma bilateral en tres criterios: emisiones CO2 por consulta, velocidad de inferencia (tokens/s) y latencia. Para cada combinacion (fila i vs. columna j) se contabilizan los criterios ganados por cada modelo, mostrando el resultado como i:j. Las celdas en verde intenso reflejan una ventaja clara o total del modelo de la fila; las rojas indican lo contrario; las grises, un empate. Esta representacion permite identificar rapidamente que modelos dominan al conjunto y cuales presentan trade-offs segun el criterio priorizado.":
            "The following matrix compares each pair of models bilaterally on three criteria: CO2 emissions per query, inference speed (tokens/s) and latency. For each combination (row i vs. column j) the criteria won by each model are counted, showing the result as i:j. Deep green cells reflect a clear or total advantage of the row model; red ones indicate the opposite; grey ones, a tie. This representation makes it easy to identify which models dominate the set and which present trade-offs depending on the prioritised criterion.",
        "Fila vs Columna >": "Row vs Column >",
        "Leyenda de colores:": "Colour legend:",
        "3:0  Dominancia estricta: la fila supera a la columna en TODOS los criterios (CO2 + velocidad + latencia)": "3:0  Strict dominance: the row beats the column on ALL criteria (CO2 + speed + latency)",
        "2:0  Ventaja clara: la fila gana en 2 criterios sin perder ninguno": "2:0  Clear advantage: the row wins 2 criteria without losing any",
        "2:1  Ventaja relativa: la fila gana en la mayoria de criterios": "2:1  Relative advantage: the row wins most criteria",
        "1:1  Empate: misma cantidad de criterios ganados por cada modelo": "1:1  Tie: same number of criteria won by each model",
        "1:2  Desventaja relativa: la columna gana en la mayoria de criterios": "1:2  Relative disadvantage: the column wins most criteria",
        "0:3  Dominancia estricta inversa: la columna supera en TODOS los criterios": "0:3  Inverse strict dominance: the column wins on ALL criteria",
        "Modelo A": "Model A",
        "Modelo B": "Model B",
        "Cómo leer la matriz: cada fila es el modelo \"atacante\" y cada columna el \"defensor\". Por ejemplo, la celda ({a} vs. {b}) muestra {aw}:{bw}, lo que significa que {a} gana en {aw} de los tres criterios frente a {b}. Segun este analisis, {most} acumula el mayor numero de victorias frente al resto de modelos, posicionandose como el mas dominante del subconjunto comparado. {least}La matriz es asimetrica: si la celda (i, j) = 2:1, necesariamente la celda (j, i) = 1:2.":
            "How to read the matrix: each row is the \"attacking\" model and each column the \"defender\". For example, the cell ({a} vs. {b}) shows {aw}:{bw}, meaning that {a} wins {aw} of the three criteria against {b}. According to this analysis, {most} accumulates the most wins against the rest of the models, positioning it as the most dominant of the compared subset. {least}The matrix is asymmetric: if cell (i, j) = 2:1, then cell (j, i) = 1:2 necessarily.",
        "{m} presenta el mayor numero de desventajas. ": "{m} has the most disadvantages. ",
        "Vel. (tok/s)": "Speed (tok/s)",
        "vs. ref. Vel.": "vs. ref. speed",
        "vs. ref. Lat.": "vs. ref. lat.",
        "Tabla de valores exactos — Todos los modelos (criterios activos del frente de Pareto)": "Exact values table — All models (active Pareto-front criteria)",
        "Diferencia % respecto al modelo de menor CO2/query (referencia = {ref}). Estrella = Pareto-optimo.": "% difference with respect to the lowest-CO2/query model (reference = {ref}). Star = Pareto-optimal.",
        "= igual": "= equal",
        "referencia": "reference",
        "(P) = Modelo Pareto-optimo (fondo verde). ": "(P) = Pareto-optimal model (green background). ",
        "[*] = Modelo de referencia seleccionado en el formulario (fondo azul, borde derecho navy). ": "[*] = Reference model selected in the form (blue background, navy right border). ",
        "La columna vs. ref. CO2 y vs. ref. Vel. muestra la diferencia porcentual respecto al modelo de menor CO2/query. Verde = mejor que la referencia; Rojo = peor.":
            "The vs. ref. CO2 and vs. ref. speed columns show the percentage difference with respect to the lowest-CO2/query model. Green = better than the reference; Red = worse.",
        "No se pudo exportar el grafico (canvas inaccesible).": "The chart could not be exported (canvas inaccessible).",
        "9. Glosario de terminos": "9. Glossary of terms",
        "Este glosario define los terminos tecnicos utilizados en este informe comparativo de modelos de IA.": "This glossary defines the technical terms used in this AI model comparison report.",
        "Gramos de CO2 equivalente emitidos por una sola consulta al modelo de IA, considerando exclusivamente la fase de inferencia bajo el escenario configurado. Es la metrica principal de comparacion entre modelos en este informe.":
            "Grams of CO2 equivalent emitted by a single query to the AI model, considering exclusively the inference phase under the configured scenario. It is the main comparison metric between models in this report.",
        "Consumo energetico del modelo por cada 1.000 tokens procesados (entrada + salida). Es el unico parametro que diferencia a los modelos en este comparador: todos los demas factores del escenario permanecen fijos. A mayor valor, mayor huella de carbono por consulta.":
            "The model's energy consumption per 1,000 processed tokens (input + output). It is the only parameter that differentiates the models in this comparator: all other scenario factors remain fixed. The higher the value, the larger the carbon footprint per query.",
        "Etiqueta energetica": "Energy label",
        "Clasificacion de eficiencia basada en percentiles calculados sobre el dataset completo (~639.000 combinaciones). A+++ = top 5% mas eficiente; A++ = 5-15%; A+ = 15-30%; A = 30-50%; B = 50-70%; C = 70-85%; D = 85-95%. Permite ubicar cada modelo en el universo de referencia.":
            "Efficiency classification based on percentiles computed over the full dataset (~639,000 combinations). A+++ = top 5% most efficient; A++ = 5-15%; A+ = 15-30%; A = 30-50%; B = 50-70%; C = 70-85%; D = 85-95%. It places each model within the reference universe.",
        "Tokens/s (velocidad de inferencia)": "Tokens/s (inference speed)",
        "Numero de tokens generados por segundo por el modelo. Un valor mas alto indica mayor rapidez de respuesta. Junto con el CO2/query, define el perfil de eficiencia de cada modelo en el grafico de dispersion.":
            "Number of tokens generated per second by the model. A higher value means a faster response. Together with CO2/query, it defines each model's efficiency profile in the scatter plot.",
        "Latencia (ms)": "Latency (ms)",
        "Tiempo total estimado de respuesta desde el envio de la consulta hasta la recepcion completa de la respuesta. Depende principalmente de la velocidad del modelo y del numero de tokens de salida.":
            "Estimated total response time from sending the query to receiving the complete answer. It depends mainly on the model's speed and the number of output tokens.",
        "Ahorro vs. referencia": "Saving vs. reference",
        "Diferencia porcentual de emisiones entre cada modelo y el modelo de referencia seleccionado. Un valor negativo indica que ese modelo emite menos CO2 (es mas eficiente que la referencia). Un valor positivo indica mayor emision. Se calcula como: (CO2_modelo - CO2_ref) / CO2_ref x 100.":
            "Percentage difference in emissions between each model and the selected reference model. A negative value means that model emits less CO2 (it is more efficient than the reference). A positive value means higher emission. Computed as: (CO2_model - CO2_ref) / CO2_ref x 100.",
        "Pareto-optimo": "Pareto-optimal",
        "Un modelo es Pareto-optimo si ningun otro modelo del conjunto lo supera simultaneamente en todos los criterios activos (CO2, velocidad, latencia). La frontera de Pareto representa el subconjunto de modelos que ofrecen los mejores trade-offs posibles: elegir uno de estos modelos garantiza que no existe ninguna alternativa mejor en todos los criterios a la vez.":
            "A model is Pareto-optimal if no other model in the set beats it simultaneously on all active criteria (CO2, speed, latency). The Pareto frontier is the subset of models offering the best possible trade-offs: choosing one of them guarantees that no alternative is better on every criterion at once.",
        "Dominancia cruzada": "Cross-dominance",
        "Relacion bilateral entre dos modelos: el modelo A domina a B si gana en mas criterios de los que pierde. La matriz de dominancia (seccion 7 de este informe) muestra estas relaciones para todos los pares, permitiendo identificar que modelos son globalmente superiores y cuales presentan debilidades especificas frente a sus competidores.":
            "Bilateral relationship between two models: model A dominates B if it wins more criteria than it loses. The dominance matrix (section 7 of this report) shows these relationships for all pairs, making it possible to identify which models are globally superior and which have specific weaknesses against their competitors.",
        "Technique for Order of Preference by Similarity to Ideal Solution. Metodo de decision multicriterio que ordena los modelos midiendo su distancia euclidea al escenario ideal (mejor en todos los criterios) y al anti-ideal (peor en todos). Nota: el ranking TOPSIS no aparece en ninguna de las secciones ni graficas de este informe PDF; puede consultarse de forma interactiva en la seccion de analisis TOPSIS de la herramienta web.":
            "Technique for Order of Preference by Similarity to Ideal Solution. Multi-criteria decision method that ranks the models by measuring their Euclidean distance to the ideal scenario (best on all criteria) and to the anti-ideal (worst on all). Note: the TOPSIS ranking does not appear in any section or chart of this PDF report; it can be consulted interactively in the TOPSIS analysis section of the web tool.",
        "TFG - Evaluacion del impacto medioambiental de modelos de IA  |  Antonio Luis Jimenez de la Fuente": "Bachelor's thesis - Environmental impact assessment of AI models  |  Antonio Luis Jimenez de la Fuente",
        "Pag. {p} / {n}": "Page {p} / {n}",
        "informe_comparativo_modelos_IA": "AI_model_comparison_report",

        // ── Simulación ─────────────────────────────────────────────
        "Empresa": "Company",
        "Gran escala": "Large scale",
        "toneladas CO₂": "tonnes CO₂",
        "MWh/año": "MWh/year",
        "kWh/año": "kWh/year",
        "Wh/año": "Wh/year",
        "€/año": "€/year",
        "céntimos/año": "cents/year",
        "m€/año": "m€/year",
        "Queries/día": "Queries/day",
        "queries/día": "queries/day",
        "CO₂ anual": "Annual CO₂",
        "Energía anual": "Annual energy",
        "Coste energético": "Energy cost",
        "Proyección 5 años": "5-year projection",
        "Métricas de impacto anual": "Annual impact metrics",
        "Búsquedas en Google": "Google searches",
        "{n} búsquedas en Google": "{n} Google searches",
        "Cargas de móvil": "Phone charges",
        "{n} cargas completas de smartphone": "{n} full smartphone charges",
        "Horas de streaming": "Streaming hours",
        "{n} horas de Netflix": "{n} hours of Netflix",
        "Km en coche": "Km by car",
        "{n} km en coche": "{n} km by car",
        "Litros de gasolina": "Litres of petrol",
        "{n} litros de gasolina quemada": "{n} litres of petrol burned",
        "Árboles para compensar": "Trees to offset",
        "{n} árboles necesarios para absorber": "{n} trees needed to absorb it",
        "Vuelos domésticos": "Domestic flights",
        "{n} vuelos nacionales": "{n} domestic flights",
        "Vuelos transatlánticos": "Transatlantic flights",
        "{n} vuelos NYC–Londres": "{n} NYC–London flights",
        "Años conduciendo": "Years of driving",
        "{n} años con coche medio": "{n} years of an average car",
        "Años de hogar medio": "Years of an average household",
        "{n} años de consumo doméstico": "{n} years of household consumption",
        "Personas europeas/año": "Europeans/year",
        "Equivale a {n} europeos durante 1 año": "Equal to {n} Europeans for 1 year",
        "Equivalencias intuitivas (anual)": "Intuitive equivalences (annual)",
        "Comprende tu impacto en términos cotidianos.": "Understand your impact in everyday terms.",
        "Año {y}": "Year {y}",
        "{n} año": "{n} year",
        "{n} años": "{n} years",
        "Modelo actual ({h})": "Current model ({h})",
        "¿Y si cambias hoy?": "What if you switch today?",
        "Quedan <strong style=\"color:var(--text-primary);\">{d} días</strong> para fin de año. Cambiando ahora a <strong style=\"color:{c};\">{m}</strong> ahorrarías <strong style=\"color:#fbbf24;\">{s}</strong> CO₂ este año <span style=\"color:var(--text-muted);font-size:11px;\">({daily}/día)</span>":
            "<strong style=\"color:var(--text-primary);\">{d} days</strong> left until the end of the year. Switching now to <strong style=\"color:{c};\">{m}</strong> would save <strong style=\"color:#fbbf24;\">{s}</strong> CO₂ this year <span style=\"color:var(--text-muted);font-size:11px;\">({daily}/day)</span>",
        "Ahorro en {h}:": "Saving over {h}:",
        "(+{g}% crec./año)": "(+{g}% growth/year)",
        "MEJOR": "BEST",
        "Ahorra {v}": "Saves {v}",
        "Mejor opción: <strong style=\"color:{c};\">{m}</strong> — ahorra <strong style=\"color:{c};\">{v}</strong> en {h}":
            "Best option: <strong style=\"color:{c};\">{m}</strong> — saves <strong style=\"color:{c};\">{v}</strong> over {h}",
        "Proyección comparativa": "Comparative projection",
        "Un modelo": "Single model",
        "Comparar todos": "Compare all",
        "Modelo eficiente": "Efficient model",
        "Horizonte temporal": "Time horizon",
        "{y}a": "{y}y",
        "Crecimiento anual de uso": "Annual usage growth",
        " (sin crecimiento)": " (no growth)",
        "Modelo actual": "Current model",
        "  Ahorro acumulado: {v}": "  Cumulative saving: {v}",
        "CO₂ acumulado": "Cumulative CO₂",
        "Impacto inmediato — sin overhead de despliegue, el ahorro empieza desde el primer día.": "Immediate impact — with no deployment overhead, savings start from day one.",
        "Punto de equilibrio:": "Break-even point:",
        "{d} días": "{d} days",
        "(~{m} meses)": "(~{m} months)",
        "Tras {d} días compensas los {o} CO₂ del despliegue y empiezas a ahorrar neto.": "After {d} days you offset the {o} CO₂ of the deployment and start saving net.",
        "Hoy": "Today",
        "Mes {m}": "Month {m}",
        "Día {d}": "Day {d}",
        "Break-even ambiental": "Environmental break-even",
        "¿En qué consiste esta sección?": "What is this section about?",
        "Cambiar a un modelo más eficiente no es gratis desde el punto de vista ambiental. Hay un <strong style=\"color:var(--text-primary);\">coste de despliegue</strong>: el CO₂ que se emite al entrenar, transferir o poner en marcha el nuevo modelo. Este coste puede ser pequeño (migración interna) o mayor (reentrenamiento completo).":
            "Switching to a more efficient model is not free from an environmental point of view. There is a <strong style=\"color:var(--text-primary);\">deployment cost</strong>: the CO₂ emitted when training, transferring or launching the new model. This cost can be small (internal migration) or larger (full retraining).",
        "Una vez en producción, el modelo eficiente emite <em>menos</em> CO₂ por consulta que el actual. Esa diferencia diaria va devolviendo la deuda inicial, poco a poco. El <strong style=\"color:var(--text-primary);\">punto de equilibrio</strong> es el día en que la deuda queda saldada: a partir de ahí cada consulta genera un ahorro neto real.":
            "Once in production, the efficient model emits <em>less</em> CO₂ per query than the current one. That daily difference gradually pays back the initial debt. The <strong style=\"color:var(--text-primary);\">break-even point</strong> is the day the debt is settled: from then on every query generates a real net saving.",
        "Línea roja — Sin cambio": "Red line — No change",
        "CO₂ acumulado si sigues con el modelo actual. Crece a ritmo constante.": "Cumulative CO₂ if you keep the current model. It grows at a constant rate.",
        "Línea de color — Con {m}": "Coloured line — With {m}",
        "Empieza más arriba (el overhead), pero crece más despacio. Cuando cruza la roja, empiezas a ganar.": "It starts higher (the overhead) but grows more slowly. When it crosses the red line, you start winning.",
        "Punto amarillo": "Yellow point",
        "El cruce entre ambas líneas: el día exacto en que el modelo eficiente ha compensado su coste de despliegue.": "The crossing of both lines: the exact day on which the efficient model has offset its deployment cost.",
        "Si seleccionas <em>\"Sin overhead\"</em>, significa que el despliegue no tiene coste ambiental asociado (p. ej., un modelo ya disponible vía API) y el ahorro es inmediato desde el primer día.":
            "If you select <em>“No overhead”</em>, it means the deployment has no associated environmental cost (e.g. a model already available via API) and the saving is immediate from day one.",
        "Overhead de despliegue (CO₂ estimado)": "Deployment overhead (estimated CO₂)",
        "Sin overhead": "No overhead",
        "Evolución CO₂ acumulado": "Cumulative CO₂ evolution",
        "Sin cambio": "No change",
        "Con {m}": "With {m}",
        "Modelo: {m}": "Model: {m}",
        "Reducir queries −50%": "Reduce queries −50%",
        "Datacenter 100% renovable": "100% renewable data centre",
        "Reducir utilización −20%": "Reduce utilisation −20%",
        "Mejor modelo + renovable": "Best model + renewable",
        "¿Qué palanca tiene más impacto?": "Which lever has the most impact?",
        "Reducción de CO₂ anual estimada por acción independiente, sobre tu configuración actual.": "Estimated annual CO₂ reduction per independent action, on your current configuration.",
        "Reducción CO₂ (%)": "CO₂ reduction (%)",
        " −{p}% · ahorra {v} CO₂/año": " −{p}% · saves {v} CO₂/year",
        "Proyección detallada (5 años)": "Detailed projection (5 years)",
        "Ver tabla": "Show table",
        "Ocultar tabla": "Hide table",
        "Año": "Year",
        "Queries totales": "Total queries",
        "CO₂ actual": "Current CO₂",
        "Ahorro": "Saving",
        "Calcula emisiones primero.": "Calculate emissions first.",
        "Error en simulación": "Simulation error",
        "1 búsqueda Google": "1 Google search",
        "1 carga de móvil": "1 phone charge",
        "1 hora de streaming": "1 hour of streaming",
        "1 litro de gasolina": "1 litre of petrol",
        "1 árbol absorbe/año": "1 tree absorbs/year",
        "1 vuelo doméstico": "1 domestic flight",
        "1 vuelo transatlántico": "1 transatlantic flight",
        "Límite París per cápita": "Paris limit per capita",
        "1 coche medio/año": "1 average car/year",
        "1 hogar medio/año": "1 average household/year",
        "Europeo medio/año": "Average European/year",
        "Tu modelo (anual)": "Your model (annual)",
        "Tu modelo frente a referencias del mundo real": "Your model against real-world references",
        "CO₂ anual generado por tu modelo de IA comparado con actividades cotidianas.": "Annual CO₂ generated by your AI model compared with everyday activities.",
        " {v} CO₂/año": " {v} CO₂/year",
        "CO₂ / año": "CO₂ / year",

        // ── Etiqueta energética ────────────────────────────────────
        "Etiqueta Energética AI": "AI Energy Label",
        "Excepcional": "Exceptional",
        "Excelente": "Excellent",
        "Muy bueno": "Very good",
        "Bueno": "Good",
        "Aceptable": "Acceptable",
        "Mejorable": "Needs improvement",
        "Ineficiente": "Inefficient",
        "Muy ineficiente": "Very inefficient",
        "No recomendado": "Not recommended",
        "Percentil:": "Percentile:",
        "¿Cómo funciona este sistema de etiquetado?": "How does this labelling system work?",
        "Este sistema se inspira en el <strong>etiquetado energético europeo</strong> regulado por la <strong>Directiva 2017/1369/UE</strong>, que desde 2021 ayuda a los consumidores a identificar la eficiencia energética de electrodomésticos de un vistazo.":
            "This system is inspired by the <strong>European energy labelling</strong> regulated by <strong>Directive 2017/1369/EU</strong>, which since 2021 has helped consumers identify the energy efficiency of appliances at a glance.",
        "Al igual que la UE calibra sus umbrales de eficiencia a partir de cómo se distribuyen realmente los productos en el mercado (usando percentiles), analizamos <strong>639.000 combinaciones</strong> de escenarios reales: 15 modelos LLM × 71 centros de datos × 20 dispositivos × 5 redes × 6 tipos de consulta. Esto nos permite saber dónde se ubica tu consulta dentro del universo completo de posibilidades.":
            "Just as the EU calibrates its efficiency thresholds from how products are actually distributed in the market (using percentiles), we analyse <strong>639,000 combinations</strong> of real scenarios: 15 LLM models × 71 data centres × 20 devices × 5 networks × 6 query types. This tells us where your query sits within the full universe of possibilities.",
        "Componentes de emisión": "Emission components",
        "Las emisiones de tu consulta provienen de tres fuentes principales. El <strong>centro de datos</strong> domina el impacto (típicamente el 70–95%), seguido por la <strong>red</strong> de transmisión y el <strong>dispositivo</strong> del usuario.":
            "Your query's emissions come from three main sources. The <strong>data centre</strong> dominates the impact (typically 70–95%), followed by the transmission <strong>network</strong> and the user's <strong>device</strong>.",
        "Centro de datos": "Data centre",
        "Intensidad del carbono + eficiencia": "Carbon intensity + efficiency",
        "WiFi, 4G, 5G, Fibra…": "WiFi, 4G, 5G, Fibre…",
        "¿Por qué 9 clases y no 7?": "Why 9 classes and not 7?",
        "La UE simplificó su etiqueta de A+++–D a A–G en 2021 porque los electrodomésticos se volvieron cada vez más eficientes y casi todos llegaban a A++. Con los modelos de IA ocurre lo contrario: el rango de emisiones es <strong>extraordinariamente amplio</strong>.":
            "The EU simplified its label from A+++–D to A–G in 2021 because appliances became ever more efficient and almost all reached A++. With AI models the opposite happens: the range of emissions is <strong>extraordinarily wide</strong>.",
        "Un consulta puede consumir desde microgramos de CO₂ hasta gramos enteros. Esa variación requiere más detalle, por eso usamos <strong>9 clases</strong> (A+++ hasta F) con umbrales calibrados según distribuciones reales.":
            "A query can consume from micrograms of CO₂ to whole grams. That variation requires more detail, which is why we use <strong>9 classes</strong> (A+++ to F) with thresholds calibrated on real distributions.",
        "P0 (menor CO₂)": "P0 (lowest CO₂)",
        "P50 (mediana)": "P50 (median)",
        "P100 (mayor CO₂)": "P100 (highest CO₂)",

        // ── Mapa ───────────────────────────────────────────────────
        "< 100 (Muy limpio)": "< 100 (Very clean)",
        "100–200 (Limpio)": "100–200 (Clean)",
        "200–300 (Medio)": "200–300 (Medium)",
        "300–400 (Alto)": "300–400 (High)",
        "400–600 (Muy alto)": "400–600 (Very high)",
        "> 600 (Crítico)": "> 600 (Critical)",
        "{p}% renovable": "{p}% renewable",
        "Intensidad Carbono (gCO₂/kWh)": "Carbon intensity (gCO₂/kWh)",
        "Proveedores": "Providers",
        "Color del país = CI de la red eléctrica<br>Color del icono = proveedor": "Country colour = grid CI<br>Icon colour = provider",
        "Sin datos": "No data",
        " ({n} zonas)": " ({n} zones)",
        "Posible greenwashing": "Possible greenwashing",
        "Intensidad carbono": "Carbon intensity",
        "Renovables declaradas": "Declared renewables",
        "Estimación CO₂/query en este DC:": "Estimated CO₂/query at this DC:",
        "Realiza un cálculo primero para ver la estimación de CO₂/query": "Run a calculation first to see the CO₂/query estimate",
        "Petición": "Request",
        "Resumen del dataset": "Dataset summary",
        "Total Data Centers": "Total data centres",
        "PUE medio": "Average PUE",
        "Mejor PUE": "Best PUE",
        "Peor PUE": "Worst PUE",
        "Recomendaciones": "Recommendations",
        "Elige data centers en países con baja intensidad de carbono (&lt;100 gCO₂/kWh)": "Choose data centres in countries with low carbon intensity (&lt;100 gCO₂/kWh)",
        "Prioriza proveedores con PUE bajo — valores cercanos a 1.0 son ideales": "Prioritise providers with a low PUE — values close to 1.0 are ideal",
        "Desconfía de claims de renovables si el CI del país es alto (greenwashing)": "Be wary of renewable claims if the country's CI is high (greenwashing)",
        "GCP en Nórdicos ofrece la mejor combinación de PUE bajo + grid verde": "GCP in the Nordics offers the best combination of low PUE + green grid",
        "Usa modelos más pequeños y eficientes para consultas simples": "Use smaller, more efficient models for simple queries",
    };

    // Mensajes generados por el backend (campos estimados en entidades personalizadas):
    // llevan valores numéricos, así que se traducen por patrón.
    const BACKEND_PATTERNS = [
        [/^Nº parámetros del modelo \(estimado desde energía: (.+)\)$/, "Model parameter count (estimated from energy: $1)"],
        [/^Nº parámetros del modelo \(estimado desde latencia: (.+)\)$/, "Model parameter count (estimated from latency: $1)"],
        [/^Nº parámetros del modelo \(estimado: (.+)\)$/, "Model parameter count (estimated: $1)"],
        [/^Energía por 1k tokens \(estimado: (.+)\)$/, "Energy per 1k tokens (estimated: $1)"],
        [/^Latencia por token \(estimado: (.+)\)$/, "Latency per token (estimated: $1)"],
        [/^País del DC \(estimado: (.+)\)$/, "DC country (estimated: $1)"],
        [/^PUE del DC \(estimado: 1\.58 — media global IEA 2023\)$/, "DC PUE (estimated: 1.58 — IEA 2023 global average)"],
        [/^PUE del DC \(país especificado sin PUE.*$/, "DC PUE (country given without PUE — global 1.58 used as fallback; specify the PUE for greater accuracy)"],
        [/^Procesador de inferencia \(estimado: (.+)\)$/, "Inference processor (estimated: $1)"],
        [/^(CPU|GPU|NPU) TDP \(estimado: (.+)\)$/, "$1 TDP (estimated: $2)"],
        [/^(CPU|GPU|NPU) inferencia \(estimado: (.+)\)$/, "$1 inference (estimated: $2)"],
        [/^Consumo idle del sistema \(estimado: (.+)\)$/, "System idle power (estimated: $1)"],
    ];

    function interpolate(str, vars) {
        if (!vars) return str;
        return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    }

    /** t('texto en español', { var: valor }) → texto en el idioma activo. */
    function t(key, vars) {
        if (key == null) return "";
        key = String(key);
        const s = (lang === "en" && Object.prototype.hasOwnProperty.call(EN, key)) ? EN[key] : key;
        return interpolate(s, vars);
    }

    /** Traduce un mensaje libre del backend (o lo devuelve tal cual). */
    function tBackend(msg) {
        if (lang !== "en" || !msg) return msg;
        if (Object.prototype.hasOwnProperty.call(EN, msg)) return EN[msg];
        for (const [re, out] of BACKEND_PATTERNS) {
            if (re.test(msg)) return msg.replace(re, out);
        }
        return msg;
    }

    return {
        lang,
        locale: lang === "en" ? "en-US" : "es-ES",
        thousands: lang === "en" ? "," : ".",
        decimal: lang === "en" ? "." : ",",
        t,
        tBackend,
        EN,
    };
})();

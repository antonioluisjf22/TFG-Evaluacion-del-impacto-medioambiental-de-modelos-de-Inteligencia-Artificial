"""
Internacionalización (ES por defecto / EN) de las plantillas HTML.

Las plantillas escriben los textos en español y los envuelven con ``_()``;
en modo inglés se sustituyen por la entrada correspondiente de ``EN``.
Si una cadena no tiene traducción se devuelve tal cual (nunca rompe la página).

Selección del idioma (de mayor a menor prioridad):
    1. ``?lang=en`` / ``?lang=es`` en la URL (se guarda en cookie)
    2. cookie ``carbonai-lang``
    3. cabecera ``Accept-Language`` del navegador
    4. español

El JS del cliente (``static/js/i18n.js``) lee el idioma de ``<html lang>``.
"""

from flask import g, request
from markupsafe import Markup

SUPPORTED_LANGS = ("es", "en")
DEFAULT_LANG = "es"
LANG_COOKIE = "carbonai-lang"
COOKIE_MAX_AGE = 365 * 24 * 3600

# Español → inglés. Las claves son literalmente los textos de las plantillas.
EN: dict[str, str] = {
    # ── base.html ────────────────────────────────────────────────────
    "CarbonAI — Calculadora de Carbono para modelos de IA": "CarbonAI — Carbon Calculator for AI models",
    "Volver al inicio": "Back to home",
    "Impacto medioambiental de modelos de Inteligencia Artificial": "Environmental impact of Artificial Intelligence models",
    "Realizado por Antonio Luis Jiménez de la Fuente": "Developed by Antonio Luis Jiménez de la Fuente",
    "Idioma": "Language",
    "Volver al menú principal": "Back to the main menu",
    "Menú Principal": "Main menu",
    "Formulario": "Form",
    "Resultados": "Results",
    "Dashboard": "Dashboard",
    "Comparador": "Comparator",
    "Simulación": "Simulation",
    "Etiqueta": "Label",
    "Mapa Global": "Global map",
    "Cambiar a modo diurno": "Switch to light mode",
    "Cambiar a modo nocturno": "Switch to dark mode",
    "Cambiar tema": "Toggle theme",

    # ── index.html · formulario ──────────────────────────────────────
    "Modelo": "Model",
    "Petición": "Request",
    "Data Center": "Data centre",
    "Dispositivo": "Device",
    "Procesador": "Processor",
    "Red": "Network",
    "País": "Country",
    "Utilización": "Utilisation",
    "Carga datos de ejemplo en el formulario": "Load example data into the form",
    "Cargar ejemplo": "Load example",
    "Parámetros de entrada": "Input parameters",
    "Configura cada parámetro para obtener el cálculo de emisiones": "Configure each parameter to obtain the emissions calculation",
    "15 modelos de IA con datos de consumo verificados": "15 AI models with verified consumption data",
    "15 modelos": "15 models",
    "71 data centers reales de AWS, GCP, Azure y Deep Green": "71 real data centres from AWS, GCP, Azure and Deep Green",
    "71 data centers": "71 data centres",
    "20 dispositivos: smartphones, portátiles, tablets y PCs": "20 devices: smartphones, laptops, tablets and PCs",
    "20 dispositivos": "20 devices",
    "Infraestructura del servidor": "Server infrastructure",
    "Dónde y cómo se ejecuta el modelo de IA": "Where and how the AI model runs",
    "1. Modelo de IA": "1. AI model",
    "El modelo que procesa tu consulta. Modelos más grandes consumen más energía pero suelen dar mejores respuestas.":
        "The model that processes your query. Larger models consume more energy but usually give better answers.",
    "— Selecciona un modelo —": "— Select a model —",
    "Introducir valores personalizados": "Enter custom values",
    "Modo personalizado": "Custom mode",
    "✕ Cancelar": "✕ Cancel",
    "Solo el nombre es obligatorio. El resto se estima automáticamente si se deja vacío.":
        "Only the name is required. The rest is estimated automatically if left blank.",
    "Nombre del modelo": "Model name",
    "Ej: Mi Modelo LLM": "e.g. My LLM model",
    "Nº parámetros (B)": "No. of parameters (B)",
    "Ej: 70 (= 70B)": "e.g. 70 (= 70B)",
    "Energía por 1k tokens (Wh)": "Energy per 1k tokens (Wh)",
    "Ej: 0.012": "e.g. 0.012",
    "Latencia por token (ms)": "Latency per token (ms)",
    "Ej: 20": "e.g. 20",
    "2. Tipo de petición": "2. Request type",
    "Qué le pides a la IA. Tareas largas (resumir, generar código) procesan más tokens y consumen más energía.":
        "What you ask the AI. Long tasks (summarising, generating code) process more tokens and consume more energy.",
    "— Selecciona tipo —": "— Select a type —",
    "3. Data Center": "3. Data centre",
    "<strong>Puede estar en un país distinto al tuyo.</strong> Su localización determina la huella de la electricidad del servidor. PUE mide la eficiencia (1.0 = perfecto).":
        "<strong>It may be in a different country from yours.</strong> Its location determines the footprint of the server's electricity. PUE measures efficiency (1.0 = perfect).",
    "— Selecciona data center —": "— Select a data centre —",
    "Solo el nombre es obligatorio. País: ES y PUE: 1.58 por defecto si se deja vacío.":
        "Only the name is required. Defaults if left blank: country ES and PUE 1.58.",
    "Nombre / Región": "Name / Region",
    "Ej: Mi DC Madrid": "e.g. My DC Madrid",
    "País (ISO alpha-2)": "Country (ISO alpha-2)",
    "Ej: ES": "e.g. ES",
    "Ej: 1.15": "e.g. 1.15",
    "% Renovable del proveedor": "Provider renewable %",
    "Ej: 80": "e.g. 80",
    "Tu dispositivo y conectividad": "Your device and connectivity",
    "El equipo desde el que realizas la consulta y tu conexión a internet": "The device you query from and your internet connection",
    "4. Dispositivo cliente": "4. Client device",
    "Tu móvil, portátil, etc. Consume energía mientras espera la respuesta del servidor.":
        "Your phone, laptop, etc. It consumes energy while waiting for the server's response.",
    "— Selecciona dispositivo —": "— Select a device —",
    "Solo el nombre es obligatorio. Los consumos se estiman con valores típicos de portátil si se dejan vacíos.":
        "Only the name is required. Power figures are estimated with typical laptop values if left blank.",
    "Nombre del dispositivo": "Device name",
    "Ej: Mi portátil gaming": "e.g. My gaming laptop",
    "Procesador de inferencia principal": "Primary inference processor",
    "— Selecciona procesador —": "— Select a processor —",
    "Consumo idle del sistema (W)": "System idle power (W)",
    "Ej: 5": "e.g. 5",
    "Ej: 45": "e.g. 45",
    "CPU inferencia (W)": "CPU inference (W)",
    "Ej: 35": "e.g. 35",
    "(0 si no tiene)": "(0 if none)",
    "Ej: 150": "e.g. 150",
    "GPU inferencia (W)": "GPU inference (W)",
    "Ej: 100": "e.g. 100",
    "Ej: 15": "e.g. 15",
    "NPU inferencia (W)": "NPU inference (W)",
    "Ej: 10": "e.g. 10",
    "5. Procesador": "5. Processor",
    "auto = usa el chip óptimo del dispositivo": "auto = use the device's optimal chip",
    "Qué chip procesa la espera. La NPU es el más eficiente, si tu dispositivo la tiene.":
        "Which chip handles the wait. The NPU is the most efficient, if your device has one.",
    "Auto (detectar óptimo)": "Auto (detect optimal)",
    "6. Tipo de red": "6. Network type",
    "Cómo te conectas a internet. La fibra óptica es la opción más eficiente energéticamente.":
        "How you connect to the internet. Fibre optics is the most energy-efficient option.",
    "— Selecciona red —": "— Select a network —",
    "7. País del usuario": "7. User country",
    "Tu ubicación física. Determina la intensidad de carbono de la electricidad que alimenta <strong>tu dispositivo</strong>.":
        "Your physical location. It determines the carbon intensity of the electricity that powers <strong>your device</strong>.",
    "— Selecciona país —": "— Select a country —",
    "8. Factor de utilización (U)": "8. Utilisation factor (U)",
    "Cuánto se exige tu dispositivo durante la espera — 70% es el valor típico":
        "How hard your device works while waiting — 70% is the typical value",
    "U = 0% — Mover el slider para configurar": "U = 0% — Move the slider to configure",
    "Calcular emisiones": "Calculate emissions",

    # ── index.html · resultados ──────────────────────────────────────
    "Sin resultados aún": "No results yet",
    "Configura los parámetros en la pestaña <strong>Formulario</strong> y pulsa <em>Calcular emisiones</em>.":
        "Configure the parameters in the <strong>Form</strong> tab and press <em>Calculate emissions</em>.",
    "Desglose por componente": "Breakdown by component",
    "Equivalencias intuitivas": "Intuitive equivalences",
    "Desglose de fórmulas": "Formula breakdown",
    "Cálculo paso a paso de las emisiones de cada componente.": "Step-by-step calculation of each component's emissions.",
    "¿Qué hubiera pasado si...?": "What if...?",
    "Explora cómo cambiarían tus emisiones con diferentes decisiones. Selecciona alternativas y compara en tiempo real.":
        "Explore how your emissions would change with different decisions. Select alternatives and compare in real time.",

    # ── index.html · dashboard ───────────────────────────────────────
    "Se generará automáticamente tras calcular las emisiones.": "It will be generated automatically after calculating the emissions.",
    "Distribución por componente": "Distribution by component",
    "Energía por componente (Wh)": "Energy by component (Wh)",

    # ── index.html · comparador ──────────────────────────────────────
    "Comparador de modelos": "Model comparator",
    "Calcula emisiones primero para comparar todos los modelos con la misma configuración.":
        "Calculate emissions first to compare all models under the same configuration.",
    "Nota metodológica: alcance del comparador": "Methodological note: scope of the comparator",
    "Este comparador evalúa exclusivamente las emisiones de CO₂ asociadas a los <strong>modelos de IA durante el periodo de inferencia</strong>. El resto de parámetros (dispositivo del usuario, red de datos y data center) se mantienen fijos según la configuración del último cálculo, de modo que la única variable entre modelos es su consumo energético por cada 1.000 tokens procesados (<em>energy_wh_per_1k_tokens</em>). Esto permite una comparación directa, equitativa y bajo condiciones idénticas.":
        "This comparator evaluates exclusively the CO₂ emissions associated with the <strong>AI models during the inference phase</strong>. The remaining parameters (user device, data network and data centre) are held fixed according to the configuration of the last calculation, so the only variable between models is their energy consumption per 1,000 processed tokens (<em>energy_wh_per_1k_tokens</em>). This allows a direct, fair comparison under identical conditions.",
    "Rendimiento vs Sostenibilidad — Frente de Pareto": "Performance vs Sustainability — Pareto front",
    "Eje X: velocidad de inferencia (tokens/s). Eje Y: huella de CO₂ por consulta (gCO₂). El modelo ideal se sitúa abajo-derecha (rápido y limpio). Los modelos ★ son <strong>Pareto-óptimos</strong>: ningún otro modelo los supera simultáneamente en todos los criterios seleccionados. La zona sombreada en verde representa el <strong>frente de Pareto eficiente</strong>. Arrastra sobre el gráfico para seleccionar múltiples modelos.":
        "X axis: inference speed (tokens/s). Y axis: CO₂ footprint per query (gCO₂). The ideal model sits bottom-right (fast and clean). ★ models are <strong>Pareto-optimal</strong>: no other model beats them simultaneously on all selected criteria. The green shaded area is the <strong>efficient Pareto front</strong>. Drag over the chart to select several models.",
    "🏆 Dominancia": "🏆 Dominance",
    "Matriz de dominancia cruzada": "Cross-dominance matrix",
    "Celda <span class=\"dom-legend-g\">verde</span> = la fila domina a la columna en todos los criterios. Celda <span class=\"dom-legend-r\">roja</span> = es dominada. Celda <span class=\"dom-legend-y\">gris</span> = trade-off (ninguno domina al otro). Pasa el ratón sobre una celda para resaltar ambos modelos en el scatter plot.":
        "<span class=\"dom-legend-g\">Green</span> cell = the row dominates the column on every criterion. <span class=\"dom-legend-r\">Red</span> cell = it is dominated. <span class=\"dom-legend-y\">Grey</span> cell = trade-off (neither dominates the other). Hover over a cell to highlight both models in the scatter plot.",
    "Comparativa detallada": "Detailed comparison",
    "Ordenados de menor a mayor emisión. La barra muestra el CO₂ relativo al modelo más contaminante. El ahorro es respecto al modelo seleccionado en el formulario.":
        "Sorted from lowest to highest emission. The bar shows CO₂ relative to the most polluting model. The saving is relative to the model selected in the form.",
    "Comparativa de emisiones CO₂/query": "CO₂/query emissions comparison",

    # ── index.html · simulación ──────────────────────────────────────
    "¿Cuánto CO₂ genera tu IA?": "How much CO₂ does your AI generate?",
    "Introduce las consultas diarias que recibirá tu modelo.<br>Verás al instante su huella de carbono anual y cómo se compara con límites reales.":
        "Enter the daily queries your model will receive.<br>You will instantly see its annual carbon footprint and how it compares with real-world limits.",
    "1.000.000": "1,000,000",
    "queries / día": "queries / day",
    "Simular impacto anual": "Simulate annual impact",
    "Ajustar": "Adjust",

    # ── index.html · etiqueta ────────────────────────────────────────
    "Etiqueta energética": "Energy label",

    # ── index.html · mapa ────────────────────────────────────────────
    "Mapa de data centers e intensidad de carbono": "Data centre map and carbon intensity",
    "Qué ves en este mapa": "What you see on this map",
    "Países coloreados (choropleth) según la <span class=\"hl-green\">intensidad de carbono</span> real de su red eléctrica, con datos de Electricity Maps":
        "Countries coloured (choropleth) by the real <span class=\"hl-green\">carbon intensity</span> of their electricity grid, with Electricity Maps data",
    "Marcadores de <span class=\"hl-blue\">data centers</span> con color por proveedor (A=AWS, G=GCP, Z=Azure, D=Deep Green) y borde por CI":
        "<span class=\"hl-blue\">Data centre</span> markers coloured by provider (A=AWS, G=GCP, Z=Azure, D=Deep Green) with a border coloured by CI",
    "Haz clic en un marcador para ver detalles: CI, PUE, renovables y CO₂/query estimado":
        "Click a marker to see details: CI, PUE, renewables and estimated CO₂/query",
    "DCs con <span class=\"hl-green\">posible greenwashing</span> detectado muestran un pulso ámbar":
        "DCs with <span class=\"hl-green\">possible greenwashing</span> detected show an amber pulse",

    # ── landing.html ─────────────────────────────────────────────────
    "CarbonAI — Calculadora de Huella de Carbono para IA": "CarbonAI — Carbon Footprint Calculator for AI",
    "Evaluación del impacto medioambiental de modelos de IA": "Environmental impact assessment of AI models",
    "Impacto visible, futuro sostenible.": "Visible impact, sustainable future.",
    "Modelos de IA": "AI models",
    "Data Centers": "Data centres",
    "Zonas CI": "CI zones",
    "Precisión": "Precision",
    "Empezar a calcular": "Start calculating",
    "Haz clic en cualquier parte para continuar": "Click anywhere to continue",
    "Huella de Carbono": "Carbon footprint",
    "Intensidad de Carbono": "Carbon intensity",
    "Eficiencia Energética": "Energy efficiency",
    "Energías Renovables": "Renewable energy",
    "CO₂ por Query": "CO₂ per query",
    "Etiqueta Energética": "Energy label",
    "Comparativa de Modelos": "Model comparison",
    "Evaluación Medioambiental": "Environmental assessment",
}


def resolve_lang() -> str:
    """Idioma de la petición actual (ver prioridad en la cabecera del módulo)."""
    lang = request.args.get("lang")
    if lang not in SUPPORTED_LANGS:
        lang = request.cookies.get(LANG_COOKIE)
    if lang not in SUPPORTED_LANGS:
        lang = request.accept_languages.best_match(SUPPORTED_LANGS)
    return lang if lang in SUPPORTED_LANGS else DEFAULT_LANG


def translate(text: str, lang: str | None = None) -> Markup:
    """Traduce ``text`` (escrito en español) al idioma activo."""
    if lang is None:
        lang = getattr(g, "lang", DEFAULT_LANG)
    if lang == "en":
        text = EN.get(text, text)
    return Markup(text)


def init_i18n(app) -> None:
    """Registra el idioma por petición, el global ``_`` y la cookie de idioma."""

    @app.before_request
    def _set_lang():
        g.lang = resolve_lang()

    @app.after_request
    def _persist_lang(response):
        # Solo se escribe la cookie cuando el usuario cambia el idioma con ?lang=
        if request.args.get("lang") in SUPPORTED_LANGS:
            response.set_cookie(
                LANG_COOKIE, g.lang, max_age=COOKIE_MAX_AGE, samesite="Lax"
            )
        return response

    @app.context_processor
    def _inject_lang():
        return {"lang": getattr(g, "lang", DEFAULT_LANG)}

    app.jinja_env.globals["_"] = translate

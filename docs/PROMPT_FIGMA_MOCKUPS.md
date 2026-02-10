# 🎨 PROMPT PARA FIGMA - CALCULADORA DE CARBONO DE MODELOS DE IA
---

## 📌 BRIEF GENERAL

Diseña una **aplicación web moderna e interactiva** para calcular y visualizar el impacto ambiental (emisiones de CO2) de modelos de inteligencia artificial. La aplicación debe servir como herramienta educativa y de análisis para desarrolladores, investigadores y responsables de políticas.

**Tipo de proyecto**: SaaS web application  
**Plataforma**: Desktop 
**Tono visual**: Científico pero accesible, moderno, sostenible  
**Audiencia**: Desarrolladores, investigadores, CTO, policy makers  
**Total de pantallas**: 7 (Formulario, Resultados, Dashboard, Comparador, Simulación, Energy Label, Mapa Global)

---

## 🎯 OBJETIVOS DE DISEÑO

1. **Accesibilidad**: Clara visualización de cálculos complejos en formato simple
2. **Educación**: Explicar paso-a-paso cómo se calcula la huella de carbono
3. **Comparación**: Mostrar alternativas y "what-if" scenarios
4. **Sostenibilidad**: Diseño que refleje valores medioambientales
5. **Interactividad**: Feedback inmediato al cambiar parámetros

---

## 🎨 SISTEMA DE DISEÑO

### **PALETA DE COLORES**

```
PRIMARY (Sostenibilidad):
  - Verde Bosque: #2D5016 (botones principales, headers)
  - Verde Claro: #4CAF50 (estado positivo, renovables, NPU)
  - Verde muy claro: #E8F5E9 (backgrounds, highlighting)

SECONDARY (Energía):
  - Azul Eléctrico: #1E88E5 (energía, datos, CPU)
  - Naranja Fuerte: #FF6F00 (GPU, alto consumo, advertencias)
  - Rojo Suave: #E74C3C (datos centros, CO2 alto, error)
  - Amarillo: #FFC107 (NPU, eficiencia, warning)

NEUTRALS:
  - Gris oscuro: #2C3E50 (texto principal)
  - Gris medio: #7F8C8D (texto secundario)
  - Gris claro: #ECF0F1 (borders, dividers)
  - Blanco: #FFFFFF (backgrounds)

GRADIENTES:
  - Carbono: #FF6F00 → #E74C3C (rojo-naranja descendente)
  - Energía: #1E88E5 → #3F51B5 (azul profundo)
  - Sostenibilidad: #2D5016 → #4CAF50 (verde gradual)
```

### **TIPOGRAFÍA**

```
FUENTES:
  - Títulos (H1-H2): "Inter Bold" o "Roboto Bold", 32-24px
  - Subtítulos (H3-H4): "Inter SemiBold", 20-16px
  - Cuerpo (Body): "Inter Regular", 14px
  - Datos/Números: "JetBrains Mono" o "Courier", 12-14px (monoespaciado)
  - Labels/Tags: "Inter SemiBold", 12px

JERARQUÍA:
  - H1: 32px, 2D5016, Bold (títulos página)
  - H2: 24px, 2C3E50, Bold (secciones)
  - H3: 18px, 2C3E50, SemiBold (subsecciones)
  - Body: 14px, 7F8C8D, Regular
  - Small: 12px, 7F8C8D, Regular
```

### **ESPACIADO Y LAYOUT**

```
Grid: 8px base unit
  - Padding componentes: 8px, 16px, 24px
  - Margins entre secciones: 32px
  - Padding cards: 24px
  - Border radius: 8px (componentes), 12px (cards)

Container máximo: 1400px (con 48px padding)
Gap entre columnas: 24px
Breakpoints:
  - Desktop: 1200px+
  - Tablet: 768px - 1199px
  - Mobile: 320px - 767px
```

---

## 📱 ESTRUCTURA DE PANTALLAS

### **PANTALLA 1: FORMULARIO DE ENTRADA** (Landing + Input Form)

**Descripción**: Primera pantalla donde usuario ingresa parámetros. Debe ser clara, progresiva y educativa.

**Layout**: 
- Header superior (logo + nav)
- Sección heroica con explicación breve
- Formulario vertical en 3 columnas en desktop

**Componentes**:

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
│ [Logo: 🌍 Carbon] [Inicio] [Documentación] [Comparador]    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ SECCIÓN HEROICA                                              │
│ "Calcula el impacto ambiental de tu modelo de IA"           │
│ "Comprende exactamente cuánto carbono emites por query"     │
│                                                              │
│ [Botón: "Empezar cálculo"] [Botón: "Ver ejemplos"]         │
└──────────────────────────────────────────────────────────────┘

FORMULARIO PRINCIPAL (3 columnas en desktop):
┌──────────────────┬──────────────────┬──────────────────┐
│ COLUMNA 1        │ COLUMNA 2        │ COLUMNA 3        │
├──────────────────┼──────────────────┼──────────────────┤
│ 1️⃣ MODELO        │ 4️⃣ DISPOSITIVO   │ 7️⃣ PAÍS          │
│ (Dropdown)       │ (Dropdown)       │ (Searchable)     │
│ ├─ GPT-4         │ ├─ MacBook Pro   │ ├─ España        │
│ ├─ Llama-70b     │ ├─ iPhone 15     │ ├─ Francia       │
│ └─ Mistral-7b    │ └─ Google Pixel  │ └─ Alemania      │
│                  │                  │                  │
│ 2️⃣ TIPO PETICIÓN │ 5️⃣ PROCESADOR   │ 8️⃣ UTILIZACIÓN   │
│ (Pills)          │ (Radio group)    │ (Slider)         │
│ ├─ Chat Simple   │ ├─ ⊙ CPU         │ 0% ────●──── 100%│
│ ├─ Clasificación │ ├─ ◯ GPU         │ Actual: 70%      │
│ └─ Análisis      │ ├─ ◯ NPU         │                  │
│                  │ └─ ◯ Auto        │ 9️⃣ ANUAL        │
│ 3️⃣ DATA CENTER   │                  │ (Toggle + Input) │
│ (Searchable)     │ 6️⃣ TIPO RED     │ ◯ Una vez        │
│ ├─ AWS EU-West  │ (Dropdown)       │ ◉ Anual (1M q/d) │
│ ├─ GCP US-Cent  │ ├─ 5G            │ [Input: 1000000] │
│ └─ Azure EU     │ ├─ 4G            │                  │
│                  │ └─ WiFi          │                  │
└──────────────────┴──────────────────┴──────────────────┘

BOTONES:
[Calcular Emisiones] [Limpiar] [Cargar ejemplo]
```

**Elementos adicionales**:
- Tooltips en cada campo con información educativa
- Indicador de progreso (9/9 campos completados)
- Validación en tiempo real (iconos ✓/✗ verdes/rojos)
- Panel lateral: "Aprende sobre cada parámetro"

---

### **PANTALLA 2: RESULTADOS PRINCIPALES** (Results Dashboard)

**Descripción**: Visualización de resultados del cálculo. Debe mostrar claramente el impacto en 3 niveles.

**Layout**: 
- Tarjeta principal grande con CO2 total
- Desglose en 3 tarjetas (Dispositivo, Red, Data Center)
- Gráfico de pastel interactivo
- Equivalencias de impacto

**Componentes**:

```
┌──────────────────────────────────────────────────────────┐
│ MÉTRICA PRINCIPAL (Tarjeta destacada)                    │
│                                                          │
│  📊 EMISIONES TOTALES                                   │
│                                                          │
│  CO2: 0.00413 gCO2 (≈ 4.13 mgCO2)                       │
│       ↑                                                  │
│     Típico para GPT-4 + MacBook + AWS EU-West           │
│     (Chat Simple, 1 consulta)                           │
│                                                          │
│  Equivalente a:                                          │
│  • 🚗 0.005 km en coche                                 │
│  • 📱 Insignificante                                    │
│  • 🔋 0.0000114 kWh de electricidad                    │
│                                                          │
│  ANUAL (si 1M queries/día):                              │
│  • 1,507 kg CO2 (≈ 1.5 toneladas)                       │
│  • 🌳 60 árboles para compensar                          │
│                                                          │
└──────────────────────────────────────────────────────────┘

DESGLOSE (3 tarjetas):
┌────────────────┬────────────────┬────────────────┐
│ 📱 DISPOSITIVO │ 🌐 RED         │ 🏢 DATA CENTER │
├────────────────┼────────────────┼────────────────┤
│ 0.00387 gCO2   │ 0.000145 gCO2  │ 0.000119 gCO2  │
│ 93.7%          │ 3.5%           │ 2.8%           │
│ (MacBook Pro)  │ (4G LTE, 0.5MB)│ (AWS EU)       │
│ 0.0267 Wh      │ 0.001 Wh       │ 0.00072 Wh     │
│                │                │                │
│ Procesador:    │ Latencia red:  │ PUE:           │
│ CPU energía    │ Estándar 4G    │ 1.2x           │
└────────────────┴────────────────┴────────────────┘

PIE CHART INTERACTIVO (Plotly):
     [Imagen circular con 3 colores: azul (94%), verde (3.5%), rojo (2.8%)]
     Al pasar mouse: Aumenta tamaño y muestra detalles
     Al hacer clic: Expande sección en detalle

TABLA DE COMPARATIVA:
┌─────────────────────────────────────────────────────────┐
│ ¿QUÉ HUBIERA PASADO SI...?                              │
├─────────────────────┬──────────────┬───────────────────┤
│ Cambio              │ CO2 Nuevo    │ Diferencia        │
├─────────────────────┼──────────────┼───────────────────┤
│ GPU en lugar de CPU │ 0.0227 gCO2  │ ↑ +5.5x (−)      │
│ NPU en lugar de CPU │ 0.00210 gCO2 │ ↓ −50% (+)       │
│ WiFi en lugar 4G    │ 0.00402 gCO2 │ ↓ −2.7% (+)      │
│ AWS Irlanda (90 CI) │ 0.00275 gCO2 │ ↓ −33% (+)       │
└─────────────────────┴──────────────┴───────────────────┘
```

**Elementos interactivos**:
- Hover en tarjetas: Expande con más detalles
- Clic en pie chart: Aísla sección
- Slider de año: Recalcula si ANUAL está activo
- Botón "Explicar cálculo": Muestra fórmulas paso a paso

---

### **PANTALLA 3: DASHBOARD DETALLADO** (Energy Breakdown)

**Descripción**: Análisis profundo de cada componente de energía y su convertir a CO2.

**Layout**:
- 4 cards mostrando energía (Wh) y CO2 (g) para cada componente
- Gráfica de barras comparativa
- Timeline de intensidad de carbono (gráfico de área)

**Componentes**:

```
ENERGY BREAKDOWN CARDS:
┌─────────────────────────────────────┐
│ ENERGÍA DEL DISPOSITIVO (🔋)       │
│                                     │
│ 0.0267 Wh                           │
│                                     │
│ Detalles:                          │
│ • Modelo: MacBook Pro 16"          │
│ • Procesador: CPU (15W máx)        │
│ • Consumo idle: 5W                 │
│ • Tiempo inferencia: 8 seg         │
│ • Utilización: 70%                 │
│                                     │
│ Cálculo dinamico:                  │
│ • P_real = 5 + (15-5) × 0.7 = 12W │
│ • E = 12W × (8s / 3600) = 0.0267 Wh│
│                                     │
│ Impacto CO2: 0.00387 gCO2          │
│ (Con CI 145 gCO2/kWh - España)    │
└─────────────────────────────────────┘

[Similar cards para RED, DATA CENTER, TOTAL]

GRÁFICO DE BARRAS (Comparativa energía):
 10┤     ┌──┐
  8┤ ┌──┐│  │
  6┤ │  ││  │┌──┐
  4┤ │  ││  ││  │┌──┐
  2┤ │  ││  ││  ││  │
  0┴─┴──┴┴──┴┴──┴┴──┴────
    Dispositivo Red DC Total

TIMELINE - CARBON INTENSITY (Última semana):
  200│                    ┌──────┐
  150│  ┌──────────────┐  │      └─────┐
  100│  │              └──┘            │
   50│  │                              │
    0└──┴──────────────────────────────┴─
      Lun  Mar  Mié  Jue  Vie  Sab  Dom
      (Tu query fue hoy a 145 gCO2/kWh)
```

---

### **PANTALLA 4: COMPARADOR (What-If Scenarios)**

**Descripción**: Análisis interactivo de "qué pasaría si cambio X variable".

**Layout**:
- Controles sliders en columna izquierda
- Visualización de 4 escenarios simultáneamente
- Cambios en tiempo real (animación)

**Componentes**:

```
COLUMNA IZQUIERDA (Controles):
┌─────────────────────────┐
│ COMPARADOR INTERACTIVO  │
│                         │
│ 🎯 MODIFICAR VARIABLES  │
│                         │
│ 1. MODELO               │
│    [Slider: GPT-4 ←→ Llama] │
│                         │
│ 2. DATA CENTER          │
│    [Slider: AWS ←→ Azure] │
│                         │
│ 3. DISPOSITIVO          │
│    [Slider: Mobile ←→ Server] │
│                         │
│ 4. PROCESADOR           │
│    [Slider: CPU ←→ NPU] │
│                         │
│ [Botón: Reset]          │
│ [Botón: Guardar escena] │
└─────────────────────────┘

COLUMNA DERECHA (Resultados):
┌──────────────────────────────────────────────────────────┐
│ ESCENARIO ORIGINAL (Tu selección)                        │
│ Modelo: GPT-4 | DeviceType: MacBook | DC: AWS EU         │
│ CO2: 0.00413 gCO2 [██████████]  ~4.13 mgCO2             │
│ Energía: 0.0284 Wh                                       │
├──────────────────────────────────────────────────────────┤
│ ESCENARIO 1: Cambiar modelo → Mistral-7b                │
│ Modelo: Mistral-7b                                       │
│ CO2: 0.000408 gCO2 [█░░░░░░░░]  ~408 µgCO2              │
│ Impacto: −90% ✓ (EXCELENTE)                             │
├──────────────────────────────────────────────────────────┤
│ ESCENARIO 2: Cambiar procesador → NPU                   │
│ Procesador: NPU (si disponible)                          │
│ CO2: 0.00210 gCO2 [███░░░░░░]  ~2.10 mgCO2              │
│ Impacto: −49% ✓ (BUENO)                                 │
├──────────────────────────────────────────────────────────┤
│ ESCENARIO 3: Cambiar procesador → N │
│ Procesador: NPU                      │
│ CO2: 650 gCO2 [████░░░░░░]          │
│ Impacto: −55% ✓                      │
└──────────────────────────────────────┘

GRÁFICO COMBINADO:
Mostrar barras de los 4 escenarios lado a lado
con diferencias marcadas en colores
```

---

### **PANTALLA 5: SIMULACIÓN ANUAL** (Annual Impact + ROI)

**Descripción**: Proyección del impacto si se ejecuta la query N veces al año.

**Layout**:
- Mostrar impacto escalado
- ROI de reducción (costo-beneficio)
- Proyección a 5 años

**Componentes**:

```
IMPACTO ANUAL:
┌──────────────────────────────────────────┐
│ SI EJECUTAS 1,000,000 QUERIES AL AÑO:  │
│                                          │
│ CO2 ANUAL: 4,130 gCO2                   │
│           = 4.13 kg CO2                 │
│           = Equivalente a:               │
│             • 🚗 32 km en coche         │
│             • 🌳 0.2 árboles/año*       │
│             • ⚡ 28.4 kWh electricidad   │
│                                          │
│ COSTO ENERGÉTICO:                       │
│ Consumo: 28.4 kWh/año                   │
│ Costo: €3.41/año (a €0.12/kWh)          │
└──────────────────────────────────────────┘

IMPACTO DE REDUCCIÓN:
┌────────────────────────────────────────┐
│ SI CAMBIAS A NPU (−50% CO2):           │
│                                        │
│ Reducción CO2: −50%                    │
│ CO2 ahorrado: 2.07 kg/año              │
│ Dinero ahorrado: €1.71/año             │
│ Equivalente a: 0.1 árboles adicionales │
│                                        │
│ ROI en 5 años: €8.55 ahorrados         │
└────────────────────────────────────────┘

PROYECCIÓN 5 AÑOS (Gráfico de área):
CO2 │
 25 │ ┌─────────────────
    │ │  Sin cambios
 20 │ │  (20.7 kg/5años)
    │ │      ┌───────────
 15 │ │      │ Con NPU
    │ │      │ (10.35 kg/5años)
 10 │ │      │
    │ └──────┘
  0 │
    └─────────────────
    Año1 Año2 Año3 Año4 Año5
```

---

### **PANTALLA 6: ENERGY LABEL** (EU Energy Label Style)

**Descripción**: Etiqueta de eficiencia energética estilo UE para facilitar comparación rápida.

**Layout**:
- Tarjeta vertical estilo etiqueta energética
- Clasificación A-F
- Información clave

**Componentes**:

```
┌───────────────────────────┐
│ ETIQUETA ENERGÉTICA       │
│                           │
│  🤖 CONSUMO DE IA         │
│                           │
│  Clase: B                 │
│  ┌─────────────────────┐  │
│  │ A+++  ↑             │  │
│  │ A++   │             │  │
│  │ A+    │             │  │
│  │ A     │             │  │
│  │ B   ●←─┤ TU MODELO  │  │
│  │ C     │             │  │
│  │ D     │             │  │
│  │ E     ↓             │  │
│  │ F                   │  │
│  └─────────────────────┘  │
│                           │
│ Modelo: GPT-4            │
│ Procesador: CPU          │
│ Energía: 1.4 gCO2/query  │
│                           │
│ Comparables:             │
│ 🟩 Llama-70b: A (−50%)  │
│ 🟨 GPT-3.5: B+ (−5%)    │
│ 🟥 GPT-4V: D (+120%)    │
│                           │
│ 💡 Para mejorar:         │
│ ✓ Usar NPU (−55%)        │
│ ✓ Usar WiFi (−10%)       │
│ ✓ Usar Llama (−38%)      │
└───────────────────────────┘
```

---

### **PANTALLA 7️⃣: MAPA MUNDIAL CON HEATMAP** (Global Carbon Intensity Map)

**Descripción**: Visualización interactiva global de intensidad de carbono por región/país/data center. Educativo y geográficamente informativo.

**Layout**:
- Mapa mundial interactivo (Leaflet.js/Mapbox style)
- Países coloreados según CI (color heat)
- Panel lateral con controles y detalles
- Timeline histórico opcional
- Data centers marcados con iconos

**Componentes**:

```
┌──────────────────────────────────────────────────────────────┐
│ ENCABEZADO                                                   │
│ 🌍 IMPACTO POR REGIÓN | [Filtro: Modelos] [Búsqueda: ]    │
│ [Escala de colores: Verde < 100 | Rojo > 600 gCO2/kWh]    │
└──────────────────────────────────────────────────────────────┘

MAPA MUNDIAL (70% del espacio):
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│    Mapa interactivo con países coloreados:                    │
│                                                                │
│    🟢 Verde Oscuro:    Noruega, Suecia, Iceland   (<100)     │
│    🟢 Verde Claro:     Francia, Austria, Chile    (100-200)  │
│    🟡 Amarillo:        España, Alemania, UK       (200-400)  │
│    🟠 Naranja:         USA (Promedio), Brasil     (400-600)  │
│    🔴 Rojo Oscuro:     China, Polonia, India      (>600)     │
│                                                                │
│    • Iconos de data centers:                                 │
│      AWS (cuadrados) • GCP (círculos)                        │
│      Azure (triángulos) • Otros (diamantes)                  │
│                                                                │
│    • Click en país → Panel detalles (derecha)               │
│    • Click en DC → Información específica                    │
│    • Zoom/Pan: Interactivo completo                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘

PANEL LATERAL DERECHO (30% ancho, scrollable):
┌──────────────────────────┐
│ DETALLES                 │
├──────────────────────────┤
│                          │
│ 🇪🇸 ESPAÑA              │
│ ────────────────────────│
│                          │
│ 📊 Intensidad Carbono:  │
│    145 gCO2/kWh         │
│    (Promedio nacional)   │
│    Tendencia: ↓ +29% en 5 años          │
│                          │
│ 🏢 Data Centers:        │
│    • AWS EU-West        │
│      (Irlanda)          │
│      CI: 90 gCO2/kWh    │
│      ✓ 95% renovables   │
│                          │
│    • GCP EU-West        │
│      (Bélgica)          │
│      CI: 195 gCO2/kWh   │
│      ✓ 45% renovables   │
│                          │
│    • Azure (España)     │
│      CI: 165 gCO2/kWh   │
│      ✓ 60% renovables   │
│                          │
│ 📈 Emisiones Query:     │
│    (Con GPT-4)          │
│                          │
│    AWS Irlanda:         │
│      1.23 gCO2 ⭐ (mejor) │
│                          │
│    Azure España:        │
│      1.78 gCO2          │
│                          │
│    GCP Bélgica:         │
│      2.01 gCO2          │
│                          │
│ 💡 Recomendación:       │
│    Usar AWS Irlanda     │
│    ↓ 45% menos CO2      │
│                          │
│ [Ver todos DCs]         │
│ [Comparar países]       │
│ [Exportar datos]        │
│                          │
└──────────────────────────┘

TIMELINE HISTÓRICO (INFERIOR - opcional):
┌────────────────────────────────────────────────────────────────┐
│ TENDENCIA DE CI EN ESPAÑA (últimos 5 años)                    │
│                                                                │
│  250 ├─ ┌─ Rojo (Carbón)                                      │
│  200 ├─┐│  ────────────                                        │
│      │ └┼───────────────────────────────                      │
│  150 ├──┤ 🟢 Renovables (aumentando)                          │
│      │  │ ─────────┐                                          │
│  100 ├──┼──────────┴──────────                                │
│      │  │                                                      │
│   50 ├──┴─────────────────────────                            │
│      │                                                         │
│    0 └────────────────────────────────                        │
│      2019  2020  2021  2022  2023  2024                       │
│                                                                │
│ ✓ Tendencia positiva: −29% en 5 años                         │
│ Predicción 2025: 120 gCO2/kWh (−17%)                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘

FUNCIONALIDADES INTERACTIVAS:
├─ Hover en país: Tooltip con CI
├─ Hover en DC: Nombre + CI + renewables %
├─ Click país: Expande panel detalles
├─ Click DC: Modal con información completa
├─ Dropdown "Modelo": Recalcula emisiones para país
├─ Slider "Queries/día": Actualiza impacto anual
├─ Toggle "Timeline": Muestra/oculta gráfico histórico
└─ Botón "Comparar DCs": Abre vista comparativa
```

**Elementos interactivos clave**:

```
MODAL: Ver Detalles del Data Center
┌──────────────────────────────────────┐
│ AWS EU-WEST-1 (IRLANDA)              │
├──────────────────────────────────────┤
│ Proveedor: Amazon Web Services       │
│ Ubicación: Condado de Meath           │
│ Zonas Electricity Maps: IE            │
│                                       │
│ Carbon Intensity:                    │
│   Actual: 90 gCO2/kWh               │
│   Histórico: 95 (2022) → 90 (2024)  │
│   Tendencia: ↓ Mejorando             │
│                                       │
│ Energía Renovable:                   │
│   95% (98% objetivo 2025)            │
│   Fuentes:                           │
│   • Hidro: 60%                       │
│   • Eólica: 35%                      │
│   • Solar: <1%                       │
│   • Gas backup: 5%                   │
│                                       │
│ Certificaciones:                     │
│   ✓ ISO 14001                        │
│   ✓ RE100 Commitment                 │
│   ✓ Carbon Neutral (2024)            │
│                                       │
│ Impacto de tu query (GPT-4):         │
│   CO2: 1.23 gCO2                    │
│   Energía: 8.4 Wh                   │
│                                       │
│ Comparación vs otros DCs:            │
│   ✓ 8% mejor que promedio global     │
│   ✓ 31% mejor que AWS US-East        │
│   ✓ 58% mejor que AWS China          │
│                                       │
│ [Comparar con otros] [Cerrar]        │
└──────────────────────────────────────┘

COMPARADOR DE PAÍSES (Modal/Nueva pestaña):
┌────────────────────────────────────────────┐
│ COMPARAR REGIONES                          │
├────────────────────────────────────────────┤
│                                             │
│ Selecciona para comparar:                  │
│ [✓] España    (145 gCO2/kWh)              │
│ [✓] Francia   (80 gCO2/kWh)               │
│ [✓] Alemania  (195 gCO2/kWh)              │
│ [ ] Noruega   (20 gCO2/kWh)               │
│ [ ] China     (680 gCO2/kWh)              │
│                                             │
│ TABLA COMPARATIVA:                         │
│ ┌──────────┬──────┬──────┬──────┐         │
│ │País      │ CI   │Renew │DCs   │         │
│ ├──────────┼──────┼──────┼──────┤         │
│ │España    │ 145  │ 45%  │  3   │         │
│ │Francia   │  80  │ 75%  │  5   │ ← Mejor│
│ │Alemania  │ 195  │ 52%  │  2   │         │
│ └──────────┴──────┴──────┴──────┘         │
│                                             │
│ IMPACTO (1M queries/año con GPT-4):       │
│                                             │
│ España:    523 toneladas CO2/año          │
│ Francia:   289 toneladas CO2/año (-45%)   │
│ Alemania:  706 toneladas CO2/año (+35%)   │
│                                             │
│ 💡 Recomendación: Migra a Francia si      │
│    el latency lo permite (45% menos CO2)  │
│                                             │
│ [Aplicar recomendación] [Guardar]         │
└────────────────────────────────────────────┘
```

**Datos mapeados**:
- 195 países/regiones del mundo
- 71 data centers curados manualmente con coordenadas GPS
- CI histórica (últimos 5 años)
- Composición energética por país
- % renovables por proveedor

---

## 🔄 COMPONENTES REUTILIZABLES

### **Card Component**
```
Variantes:
- Default: Blanco con borde gris
- Highlighted: Fondo verde claro, borde verde
- Warning: Fondo naranja claro, borde naranja
- Error: Fondo rojo claro, borde rojo

Estados:
- Normal
- Hover (sombra, ligera elevación)
- Active (borde más oscuro)
- Disabled (opacidad 0.5)
```

### **Button Component**
```
Variantes:
- Primary: Verde bosque, blanco text
- Secondary: Gris, gris oscuro text
- Success: Verde, blanco text
- Warning: Naranja, blanco text
- Danger: Rojo, blanco text

Tamaños:
- Small: 32px altura
- Medium: 40px altura (default)
- Large: 48px altura

Estados:
- Normal
- Hover (oscurecer 10%)
- Active (oscurecer 20%)
- Disabled (opacidad 50%)
- Loading (spinner animado)
```

### **Input Component**
```
Variantes:
- Text
- Number
- Select/Dropdown
- Slider/Range
- Radio group
- Checkbox group

Estados:
- Empty
- Focused (borde verde)
- Filled
- Error (borde rojo)
- Disabled (fondo gris)

Elementos:
- Label superior
- Placeholder text
- Helper text inferior (gris)
- Icons a izquierda/derecha
- Validación icon (✓/✗)
```

### **Chart Components**
```
Tipos:
- Pie Chart (Plotly): Interactivo, colores según categoría
- Bar Chart: Comparativa, animado
- Area Chart: Timeline, gradiente
- Gauge: Indicador circular (0-100%)

Interactividad:
- Hover: Tooltip con valores exactos
- Click: Zoom o expansión
- Drag: En charts de timeline
- Legend: Toggle series on/off
```

### **Tooltip/Badge**
```
Variants:
- Info: Azul
- Success: Verde
- Warning: Amarillo/Naranja
- Error: Rojo

Tamaños:
- Small: 12px, 4px padding
- Medium: 14px, 8px padding
- Large: 16px, 12px padding
```

---

## 🎬 ANIMACIONES Y TRANSICIONES

```
Transiciones:
- Cambios de color: 200ms ease
- Expansión cards: 300ms ease-out
- Fade in/out: 200ms ease
- Slider valores: 100ms ease

Animaciones:
- Carga inicial: Fade in secuencial (200ms stagger)
- Interactividad: Pulse suave en botones (300ms)
- Charts: Animación de "dibujo" al aparecer (800ms)
- Números contadores: Increment animado (1000ms)
- Errores: Shake suave (2 oscilaciones, 400ms)
```

---

## 📐 ESPECIFICACIONES TÉCNICAS DETALLADAS

### **PANTALLA 1: FORMULARIO**

**Sección Header:**
- Logo: 32×32px, SVG
- Nav items: 14px, interlineado
- Altura header: 64px
- Sticky: No

**Sección Heroica:**
- Ancho máximo: 900px, centrado
- Título: 48px, bold, center
- Subtitle: 20px, regular, center
- Botones: 2 en fila (Primary + Secondary)

**Formulario:**
- Grid: 3 columnas (24px gap)
- Tablet: 2 columnas
- Mobile: 1 columna
- Max width per column: 350px

**Campos:**
- Altura input: 40px
- Label: 14px, bold, encima
- Placeholder: gris claro
- Border: 1px, gris
- Padding interno: 12px
- Focus border: 2px, verde

**Descripción educativa:**
- Tamaño: 12px, gris
- Margen superior: 4px
- Iconografía: 16×16px junto a texto

---

### **PANTALLA 2: RESULTADOS**

**Métrica Principal:**
- Ancho: 100%, máximo 600px
- Padding: 32px
- Background: Gradiente verde (E8F5E9 → blanco)
- Border radius: 12px
- Box shadow: 0 4px 6px rgba(0,0,0,0.1)

**CO2 Grande:**
- Tamaño: 56px
- Color: Verde bosque (#2D5016)
- Font: Bold, monoespaciado

**Desglose Cards:**
- 3 en fila (24px gap)
- Ancho individual: calc(33.33% - 16px)
- Altura mínima: 200px
- Número CO2: 32px, bold
- Porcentaje: 20px, regular

**Pie Chart:**
- Tamaño: 300×300px en desktop
- 200×200px en tablet
- 100×100px en mobile
- Responsive, center
- Leyenda: Debajo, horizontal

---

### **PANTALLA 3: DASHBOARD**

**Cards Energía:**
- Grid: 4 columnas
- Tablet: 2 columnas
- Mobile: 1 columna
- Gap: 16px

**Gráficos:**
- Ancho: 100%
- Altura mínima: 300px
- Padding: 16px dentro
- Border: 1px gris claro
- Background: Blanco

---

## 📊 ESPECIFICACIONES DE DATOS Y EJEMPLOS

### **Datos de ejemplo para cada pantalla:**

```json
{
  "input": {
    "model": "GPT-4",
    "request_type": "chat_simple",
    "data_center": "AWS EU-West-1",
    "device": "MacBook Pro 16",
    "processor": "CPU",
    "network_type": "4G LTE",
    "user_country": "ES",
    "utilization": 0.7,
    "annual": true,
    "annual_queries": 1000000
  },
  "results": {
    "co2_total_g": 0.00413,
    "energy_total_wh": 0.0284,
    "processor_used": "CPU",
    "processor_watts": 15,
    "breakdown": {
      "device": {"co2_g": 0.00364, "energy_wh": 0.0267, "percentage": 93.7},
      "network": {"co2_g": 0.000145, "energy_wh": 0.001, "percentage": 3.5},
      "datacenter": {"co2_g": 0.000116, "energy_wh": 0.00072, "percentage": 2.8}
    },
    "processor_alternatives": {
      "GPU": {"wh": 0.227, "co2": 0.0327, "increase": "+680%"},
      "NPU": {"wh": 0.0142, "co2": 0.00206, "reduction": "-50%"}
    },
    "annual": {
      "queries": 1000000,
      "co2_annual_g": 4130,
      "co2_annual_tons": 4.13,
      "energy_annual_kwh": 28.4,
      "cost_annual_eur": 3.41
    },
    "carbon_intensity": 145,
    "energy_label": "B"
  }
}
```

### **Modelos de IA disponibles:**
- GPT-4 (OpenAI)
- GPT-3.5 Turbo
- Llama-70b (Meta)
- Mistral-7b (Mistral AI)
- Claude-2 (Anthropic)
- Gemini Pro (Google)
- Falcon-40b (Technology Innovation Institute)
- MPT-30b (MosaicML)
- Yi-34b (01.AI)
- Koala-13b (Stanford)

### **Dispositivos:**
- iPhone 15 Pro, MacBook Pro 16", Google Pixel 8, iPad Pro, Samsung Galaxy S24, Windows Desktop, Linux Server, etc.

### **Data Centers:**
- AWS EU-West-1 (Irlanda)
- AWS US-East-1 (Virginia)
- GCP us-central1 (Iowa)
- Azure UK-South (Londres)
- Google Cloud europe-west1 (Bélgica)
- Y 66 más...

---

## ✨ CARACTERÍSTICAS ESPECIALES

### **Educación en cada paso:**
- Tooltip explicativo en cada parámetro
- Link a documentación en cada sección
- "¿Por qué importa?" bajo cada métrica
- Comparativas con acciones cotidianas (km en coche, etc.)

### **Accesibilidad:**
- WCAG AA compliant
- Alt text para todas las imágenes
- Colores no solo diferenciadores (también íconos/etiquetas)
- Ratios de contraste: 4.5:1 mínimo

### **Interactividad responsive:**
- Los valores se actualizan en <100ms
- Animaciones suaves sin lag
- Mobile: Touch-friendly (targets mínimo 44×44px)

### **Exportabilidad:**
- Botón "Descargar PDF" en resultados
- Botón "Compartir" con URL generada
- "Copiar JSON de resultados"

---

## 🎯 GUÍA DE ESTILO VISUAL

1. **Usa íconos:** 🌍 (sostenibilidad), ⚡ (energía), 🔧 (config), 📊 (datos), 🚀 (optimización)
2. **Gradientes suaves:** No saturados, máximo 2 colores
3. **Espacios en blanco:** Mínimo 24px entre secciones
4. **Sombras sutiles:** 0 4px 6px rgba(0,0,0,0.1), no dramáticas
5. **Tipografía jerarquizada:** Claramente diferenciada por tamaño y peso
6. **Consistencia visual:** Todos los botones iguales, inputs iguales, etc.

---

## 📋 CHECKLIST FINAL PARA VALIDACIÓN

- [ ] Las 7 pantallas tienen estructura clara y jerarquía visual
- [ ] Colores siguen la paleta especificada
- [ ] Tipografía es consistente y legible
- [ ] Espaciados siguen grid de 8px
- [ ] Componentes son reutilizables
- [ ] Todos los datos están presentes (modelos, DCs, dispositivos)
- [ ] Animaciones son suaves y propositivas
- [ ] Elementos interactivos están claramente marcados
- [ ] Accesibilidad está considerada (contraste, tamaños)
- [ ] Responsive funciona en desktop, tablet, mobile

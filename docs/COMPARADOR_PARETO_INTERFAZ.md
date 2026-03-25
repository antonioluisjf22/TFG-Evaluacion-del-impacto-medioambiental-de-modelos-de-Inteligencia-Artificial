# Comparador de Modelos — Análisis Pareto Multi-criterio

## Concepto clave: ¿qué es un modelo Pareto-óptimo?

Un modelo es **Pareto-óptimo** (o "del frente de Pareto") cuando **ningún otro modelo lo supera en todos los criterios a la vez**. Por ejemplo, si un modelo es muy rápido pero muy contaminante, y otro es limpio pero lento, ninguno de los dos domina al otro: ambos son Pareto-óptimos porque cada uno gana en algo. Solo existiría dominancia si un modelo fuese *a la vez* más rápido *y* más limpio que otro. Estos modelos se marcan con ★ en la interfaz.

---

## 1. Barra de configuración activa (`comp-config-bar`)
Muestra en forma de chips los parámetros de la consulta que generó la comparativa: tipo de petición, tokens de entrada/salida, modelo seleccionado, data center, dispositivo hardware, red, país, procesador y utilización. Es solo informativa; se regenera automáticamente cada vez que se pulsa "Comparar".

![Barra de configuración activa](../images/comparador/01_config_bar.png)
_Ejemplo: chips mostrando GPT-4, Google Cloud (europe-west3), MacBook Air M3, Fiber FTTH, ES, AUTO, 70%._

## 2. Barra de configuración Pareto (`pareto-config-bar`)
Controles que modifican el análisis **en tiempo real** sin necesidad de volver a llamar a la API:

- **Toggles de criterios** — Definen *qué dimensiones* se usan para decidir si un modelo domina a otro. Si solo CO₂ y Velocidad están activos, un modelo ★ es mejor en ambas cosas que cualquier otro. Cada cambio recalcula el frente al instante.

  **⚠️ Nota sobre el tamaño del frente de Pareto:** El número de modelos Pareto-óptimos depende de los **trade-offs reales** en el conjunto de datos, no directamente del número de criterios.

  En teoría, añadir más criterios hace más difícil dominar (hay que ganar en más dimensiones a la vez), lo que *puede* aumentar el frente. Pero esto solo ocurre si existe algún modelo que, aunque pierde en los criterios ya incluidos, gana en la nueva dimensión. Si un modelo es superior en **todas** las dimensiones evaluadas, seguirá siendo el único Pareto-óptimo independientemente de cuántos criterios se añadan.

  En este conjunto de datos, Phi-2 es genuinamente mejor que todos los demás en las 4 dimensiones a la vez (menor CO₂, mayor velocidad, menor latencia y menos parámetros), por lo que el frente se mantiene en 1 modelo con cualquier combinación de criterios.

  | Situación | Efecto en el frente al añadir criterios |
  |---|---|
  | Existen trade-offs en la nueva dimensión | El frente crece (más modelos Pareto-óptimos) |
  | Un modelo domina en todas las dimensiones | El frente no cambia (sigue siendo ese modelo) |
  | Todas las dimensiones están correlacionadas | El frente apenas cambia |

  **Dirección de optimización por criterio:**
  | Criterio | Objetivo | Mejor valor |
  |---|---|---|
  | CO₂ | Minimizar | Más bajo posible |
  | Velocidad | Maximizar | Más alto posible (tok/s) |
  | Latencia | Minimizar | Más bajo posible (ms/tok) |
  | Tamaño del modelo | Minimizar | Más bajo posible |

![Barra Pareto — 2 criterios](../images/comparador/02_pareto_bar_2crit.png)
_Solo CO₂ y Velocidad activos._

![Barra Pareto — 4 criterios](../images/comparador/02_pareto_bar_4crit.png)
_Los 4 criterios activos: CO₂, Velocidad, Latencia y Parámetros._

- **Escala logarítmica / lineal** — Los valores de CO₂ y velocidad varían varios órdenes de magnitud entre modelos (ej. GPT-4 emite ~0.059 gCO₂, Phi-2 ~0.00008 gCO₂, una diferencia de ×700). Con **escala lineal** cada división del eje vale lo mismo (0.01, 0.02, 0.03…): GPT-4 aparece lejos arriba, pero Mistral y Phi-2 se pegan al eje y son casi indistinguibles aunque Mistral emita 4 veces más que Phi-2. Con **escala logarítmica** cada división multiplica por 10 (0.0001 → 0.001 → 0.01 → 0.1): ahora la distancia visual entre Phi-2 y Mistral ocupa el mismo espacio que entre Mistral y GPT-4, porque ambas diferencias son del mismo *orden de magnitud relativo*. En la práctica: usa **log** (opción por defecto) para ver todos los modelos separados y comparar proporciones; usa **lineal** solo si los modelos que quieres comparar tienen valores muy similares y te interesan las diferencias absolutas exactas.
- **Modelo de referencia** — Al elegir un modelo del desplegable, el scatter dibuja flechas discontinuas cian desde ese modelo hacia cada Pareto-óptimo, indicando visualmente "hacia estos deberías migrar si quieres mejorar".
- **Botón "¿Qué modelo me conviene?"** — Abre el asistente wizard (ver §6).

## 3. Scatter plot Pareto mejorado
Eje X = velocidad de inferencia (tok/s), Eje Y = emisiones CO₂ por consulta (gCO₂). El **modelo ideal** estaría en la esquina inferior-derecha (rápido y limpio). Características visuales:

- **Frontera de Pareto** — Línea verde escalonada ("step-after") que delimita el frente eficiente. Todo lo que queda debajo-derecha de esa línea no existe: ningún modelo real llega ahí. El área sombreada en verde suave bajo la línea representa esa zona ideal inalcanzada.
- **Puntos pulsantes** — Los modelos ★ tienen anillos que se expanden y contraen en bucle continuo (animación `requestAnimationFrame`), haciéndolos fácilmente identificables.
- **Tamaño de punto variable** — Cuanto mayor es el score TOPSIS de un modelo (ver §4), mayor es el radio de su punto en el scatter. Así se integra visualmente la valoración multi-criterio en el propio gráfico.
- **Colores** — Cian (#00e5ff) = modelo actualmente seleccionado por el usuario. Dorado (#ffd600) = Pareto-óptimo. El resto usa el color de su clase energética (verde A+++→A, naranja C, rojo D-E).
- **Flechas de referencia** — Solo aparecen cuando se elige un modelo de referencia en la barra de config. Se dibujan como líneas discontinuas con punta de flecha hacia cada Pareto-óptimo.
- **Zoom/pan** — Rueda del ratón con Ctrl pulsado para hacer zoom; arrastra con Ctrl para desplazar la vista.
- **Lasso/brush** — Arrastra sin Ctrl para dibujar un rectángulo de selección sobre varios puntos. Los modelos capturados quedan seleccionados y el Radar (pestaña 3) se actualiza automáticamente para mostrarlos.
- **Tooltip flotante** — Al pasar el cursor sobre un punto aparece una tarjeta con: nombre, organización, CO₂ en notación científica, velocidad, latencia, clase energética, y una mini-barra que muestra su CO₂ relativo al peor del conjunto.

![Scatter plot — escala logarítmica, 2 criterios](../images/comparador/03_scatter_log_2crit.png)
_Scatter con escala Log, criterios CO₂ + Velocidad. Solo Phi-2 es Pareto-óptimo (★)._

![Scatter plot — escala lineal](../images/comparador/03_scatter_linear.png)
_Mismo escenario en escala lineal: los modelos eficientes se comprimen cerca del eje X._

![Scatter plot — con flechas de referencia](../images/comparador/03_scatter_referencia.png)
_Modelo de referencia (GPT-4) seleccionado: flechas cian hacia los Pareto-óptimos._

![Tooltip flotante](../images/comparador/03_tooltip.png)
_Tooltip al hacer hover sobre un punto mostrando métricas detalladas del modelo._

## 4. Panel lateral con 3 pestañas

### 🏆 Pestaña: Dominancia Pareto
Lista **solo los modelos Pareto-óptimos**, ordenados de mejor a peor por su **distancia al punto utópico**. El punto utópico es un punto imaginario con el mínimo CO₂ y la máxima velocidad de todos los modelos del dataset a la vez: ningún modelo real lo alcanza, pero sirve como referencia de "perfección". Cuanto más cerca esté un modelo de ese punto, mejor es su balance general. Para cada modelo se muestra:
- Posición en el ranking (#1, #2…)
- Clase energética con su color
- Métricas clave (CO₂, tok/s)
- Barra de proximidad al punto utópico (barra más larga = más cerca del ideal)
- Cuántos modelos del total domina ese modelo Pareto

![Pestaña Dominancia](../images/comparador/04_tab_dominancia.png)
_Ranking de modelos Pareto-óptimos con distancia utópica y nº de modelos dominados._

### ⚖️ Pestaña: Análisis TOPSIS
**TOPSIS** (*Technique for Order of Preference by Similarity to Ideal Solution*) es un método de decisión multi-criterio: dado un conjunto de alternativas y unos pesos de importancia para cada criterio, calcula una puntuación entre 0 y 1 para cada modelo midiendo simultáneamente su distancia al escenario ideal y al peor posible. Un score de 1 significa "es el mejor en todo"; 0 significa "es el peor en todo".

La pestaña expone **3 sliders de peso** (CO₂, Velocidad, Latencia) que suman siempre 100%. Al mover un slider, el algoritmo recalcula en tiempo real y reordena la lista. Esto permite responder preguntas como "¿cuál es el mejor modelo si me importa sobre todo la velocidad?" sin más que arrastrar el slider de velocidad hacia la derecha.

![Pestaña TOPSIS — balance](../images/comparador/04_tab_topsis_balance.png)
_Pesos equilibrados: CO₂ 40%, Velocidad 35%, Latencia 25%._

![Pestaña TOPSIS — prioridad velocidad](../images/comparador/04_tab_topsis_speed.png)
_Slider de velocidad al máximo: el ranking cambia para favorecer modelos rápidos._

### 📊 Pestaña: Radar comparativo
Gráfico de araña/spider con **5 ejes normalizados** (todos van de 0 a 1). Todos los ejes se orientan de modo que **"más cerca de 1 = mejor"**: los criterios de coste (CO₂, latencia, energía, parámetros) se invierten para que modelos eficientes puntúen alto.

| Eje | Fórmula | Mejor valor |
|---|---|---|
| CO₂ Eficiencia | 1 − (CO₂ del modelo / CO₂ del peor) | Cerca de 1 |
| Velocidad | tok/s del modelo / tok/s del más rápido | Cerca de 1 |
| Latencia Efic. | 1 − (latencia / latencia máxima) | Cerca de 1 |
| Energía Efic. | 1 − (Wh / Wh del más costoso) | Cerca de 1 |
| Eficiencia Params | 1 − (parámetros del modelo / parámetros del mayor) | Cerca de 1 |

**Invertir los ejes de coste: por qué?** Todos los ejes usan el criterio "más cerca de 1 = mejor" para la coherencia visual. Los beneficios (velocidad) son directos: máx tok/s = 1 es bueno. Los costes (CO₂, latencia, energía, parámetros) se invierten: tenemos que hacer `1 - valor` para que un coste bajo puntúe cerca de 1. Por tanto:
- **CO₂**: Phi-2 es 100× más limpio que GPT-4 → cerca de 1 ✓
- **Latencia**: Modelos rápidos → cerca de 1 ✓
- **Parámetros**: Modelos pequeños (más eficientes) → cerca de 1 ✓

Sin invertir, los modelos grandes mostrarían valores altos en el radar (parecería que son "mejores"), lo que sería contra-intuitivo porque queremos modelos pequeños y eficientes, no grandes.

![Radar comparativo](../images/comparador/04_tab_radar.png)
_Comparación radar de 3 modelos: las áreas superpuestas revelan fortalezas y debilidades relativas._

## 5. Matriz de dominancia N×N
Tabla cuadrada donde **filas y columnas son los modelos** y cada celda describe la relación entre ambos según los criterios activos:

| Símbolo | Color | Significado |
|---|---|---|
| ▼ Domina | Verde | La fila es mejor que la columna en **todos** los criterios activos simultáneamente |
| ▲ Dominado | Rojo | La fila es peor que la columna en **todos** los criterios activos |
| ↔ Trade-off | Gris | Ninguno domina al otro: cada uno gana en algo diferente |
| · | — | Misma celda (diagonal) |

**Interacción con el scatter**: al pasar el ratón sobre cualquier celda (excepto la diagonal), los dos modelos implicados se resaltan en el scatter con anillos cian de 18px de radio, permitiendo localizarlos visualmente de inmediato. Al salir, los anillos desaparecen.

Botón **Exportar CSV**: descarga la matriz completa en formato `.csv` para análisis externo.

![Matriz de dominancia — 2 criterios](../images/comparador/05_matriz_2crit.png)
_Matriz con CO₂ + Velocidad: muchas celdas verdes (dominancias claras) porque con pocas dimensiones es fácil dominar._

![Matriz de dominancia — 4 criterios](../images/comparador/05_matriz_4crit.png)
_Misma matriz con 4 criterios: aparecen más trade-offs (gris) porque dominar en todo es más difícil._

## 6. Wizard modal — "¿Qué modelo me conviene?"
Asistente de 3 pasos que traduce preferencias en lenguaje natural a **pesos TOPSIS temporales** y devuelve una recomendación personalizada:

| Paso | Pregunta | Efecto en los pesos temporales |
|---|---|---|
| 1 | Prioridad: Sostenibilidad / Velocidad / Balance | Redistribuye el peso entre CO₂ y velocidad (ej. "Sostenibilidad" → CO₂ = 55%, velocidad = 25%, latencia = 20%) |
| 2 | ¿Baja latencia crítica? Sí / No | Si Sí: +10% al peso de latencia, se descuenta proporcionalmente de CO₂ y velocidad |
| 3 | ¿Modelos grandes o eficientes? | Si "eficientes": filtra del ranking los modelos con >100 mil millones de parámetros |

Con esos pesos ajustados se ejecuta TOPSIS internamente y se muestra el ganador con sus métricas. La elección queda automáticamente fijada como **modelo de referencia** en el scatter, dibujando las flechas hacia los Pareto-óptimos.

**⚠️ Importante:** El wizard **no modifica permanentemente** los sliders de la pestaña TOPSIS del panel lateral. Los pesos generados son temporales y se usan solo para calcular la recomendación del wizard. Los sliders TOPSIS del panel derecho mantienen sus valores independientemente de lo que se responda en el wizard. Lo que sí se actualiza es el **modelo de referencia** en el scatter (aparecen las flechas cian hacia los Pareto-óptimos).

![Wizard paso 1](../images/comparador/06_wizard_paso1.png)
_Paso 1: elección de prioridad principal._

![Wizard resultado](../images/comparador/06_wizard_resultado.png)
_Resultado final del wizard con el modelo recomendado y sus métricas._

## 7. Tabla de comparación detallada y gráfico de barras
Elementos heredados de la versión anterior:
- **Tabla ordenable**: clic en cualquier columna ordena ascendente/descendente. Columnas: modelo, organización, CO₂, energía, tok/s, latencia, parámetros, clase energética, ahorro vs. modelo actual.
- **Gráfico de barras vertical**: emisiones CO₂/query en escala logarítmica, barras coloreadas por clase energética, barra del modelo actual destacada en cian.

![Tabla y barras](../images/comparador/07_tabla_barras.png)
_Tabla ordenable + gráfico de barras CO₂ por modelo._

## 8. Exportación PDF
Genera un informe de varias páginas con jsPDF que incluye:
1. Portada con fecha y configuración activa
2. Resumen de la comparativa (modelo actual, mejor alternativa, ahorro potencial)
3. Tabla de todos los modelos con métricas
4. Modelos Pareto-óptimos (leídos del estado `PS`, no del DOM)
5. Scatter plot exportado como imagen PNG
6. Radar comparativo exportado como imagen PNG
7. Gráfico de barras exportado como imagen PNG
8. Glosario técnico con definiciones de CO₂/query, TOPSIS, Pareto-óptimo, PUE, etc.

---

## Estado compartido `PS`
Todos los componentes de la interfaz (scatter, 3 pestañas, matriz de dominancia, wizard) no son independientes: comparten un único objeto JavaScript `PS` que actúa como fuente de verdad. Contiene los criterios activos, la escala, el modelo de referencia, los modelos seleccionados con lasso, los pesos TOPSIS, el par de modelos resaltado por la matriz, todos los datos de la tabla y la lista de Pareto-óptimos. Cuando cualquier componente modifica `PS`, los demás reaccionan sin necesidad de recargar la página ni de volver a llamar al servidor.

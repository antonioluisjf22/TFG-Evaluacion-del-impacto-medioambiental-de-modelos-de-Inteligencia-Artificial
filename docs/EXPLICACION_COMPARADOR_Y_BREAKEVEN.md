# Comparador de Modelos y Break-Even Ambiental — Explicación funcional

---

## 1. Comparador de Modelos (pestaña "Comparador")

### ¿Qué hace?

Cuando el usuario pulsa la pestaña "Comparador", la aplicación lanza una petición a `/api/compare` con los mismos parámetros de la consulta actual (mismo data center, dispositivo, red, tipo de petición, tokens...) pero **sin fijar el modelo**. El backend recorre todos los modelos del dataset, calcula las emisiones de cada uno bajo esas condiciones, y devuelve una tabla comparativa.

El comparador **no acepta modelo custom** (porque por definición compara todos los modelos del dataset). Sí acepta data center, dispositivo y red custom si el usuario los había configurado.

---

### El gráfico de dispersión (Frente de Pareto)

Es el elemento central. Es un gráfico X-Y donde:

- **Eje X**: velocidad del modelo (tokens por segundo). Cuanto más a la derecha, más rápido.
- **Eje Y**: CO₂ emitido por consulta (gramos). Cuanto más abajo, más limpio.
- **El modelo ideal** estaría en la esquina inferior-derecha: rápido y con poca huella.

Cada modelo aparece como un punto. El color y forma del punto indican su estado:
- **Estrella amarilla (★)**: el modelo es Pareto-óptimo.
- **Punto cian**: el modelo que el usuario tenía seleccionado antes de abrir el comparador.
- **Resto**: modelos normales, coloreados según su etiqueta energética (verde = A, amarillo = B, naranja = C, rojo = D/E).

El tamaño de cada punto también varía según su puntuación TOPSIS (ver más abajo): los modelos más equilibrados aparecen ligeramente más grandes.

---

### ¿Qué es un modelo Pareto-óptimo? (la lógica central)

Un modelo es **Pareto-óptimo** si no existe ningún otro modelo que sea mejor que él en **todos** los criterios activos a la vez. Si para superarlo en un criterio hay que empeorar en otro, ese modelo "vale la pena" y entra en el frente.

Los criterios que el usuario puede activar o desactivar son:
- **CO₂** (minimizar): menor huella por consulta.
- **Velocidad** (maximizar): más tokens por segundo.
- **Latencia** (minimizar): menos milisegundos por token.
- **Tamaño del modelo** (minimizar): menos parámetros (útil para entornos con restricciones de recursos).

Por defecto solo están activos CO₂ y Velocidad — los más relevantes para la mayoría de casos.

**Ejemplo sencillo**: si el modelo A emite 0,01 gCO₂ y va a 30 tok/s, y el modelo B emite 0,02 gCO₂ pero va a 25 tok/s, B no es Pareto-óptimo (A lo supera en los dos criterios). Pero si B fuera a 50 tok/s, entonces ninguno domina al otro: A gana en CO₂, B gana en velocidad → ambos son Pareto-óptimos.

Cuando hay más criterios activos, la condición de dominancia se vuelve más exigente y el frente tiende a incluir más modelos.

---

### La zona sombreada verde (el frente eficiente)

Cuando los criterios "CO₂" y "Velocidad" están ambos activos, el gráfico dibuja una **línea escalonada verde** que conecta los modelos Pareto-óptimos de izquierda a derecha (de menos velocidad a más). La zona bajo esa línea se rellena con un degradado verde semitransparente.

Esta línea es el "frente de Pareto eficiente": representa la frontera real del conjunto de datos. Todo modelo por encima de esa línea (más CO₂ para la misma velocidad) es dominado por algún Pareto-óptimo.

---

### Las flechas de referencia

El usuario puede designar un modelo como "Referencia" en la barra de configuración. Al hacerlo, el gráfico dibuja **flechas de color cian** que parten desde ese modelo hacia cada modelo Pareto-óptimo. Cada flecha representa una alternativa que objetivamente mejora al modelo de referencia en los criterios activos.

Si el modelo de referencia es él mismo Pareto-óptimo, las flechas van a los demás del frente (mostrando los trade-offs entre ellos).

---

### El efecto de pulso animado

Los modelos Pareto-óptimos tienen un anillo animado que pulsa suavemente alrededor de su punto. Es un efecto visual en bucle (requestAnimationFrame) que llama a redibujado del canvas sin recalcular datos, solo cambiando la fase de la animación.

---

### El panel lateral — 4 pestañas

A la derecha del gráfico hay un panel con cuatro análisis complementarios:

**Pestaña 1 — Dominancia**
Lista los modelos Pareto-óptimos ordenados por "distancia al punto utópico" (el modelo hipotético perfecto con mínimo CO₂ y máxima velocidad). El primero de la lista es el modelo que más se acerca al ideal. También muestra cuántos modelos no-Pareto domina cada modelo del frente.

**Pestaña 2 — TOPSIS**
Aplica el algoritmo TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) sobre todos los modelos. Es un método multicriterio de decisión que pondera cada criterio y calcula qué tan cerca está cada modelo del ideal y qué tan lejos está del peor caso. Los pesos por defecto son: CO₂ = 40%, Velocidad = 35%, Latencia = 25%. El resultado es un ranking numérico.

**Pestaña 3 — Radar**
Muestra un gráfico de radar comparando hasta 4 modelos seleccionados. El usuario puede seleccionarlos arrastrando un rectángulo sobre el scatter (lasso selection) o directamente en los controles. Cada eje del radar es un criterio normalizado; el área mayor indica mejor equilibrio general.

**Pestaña 4 — Matriz de dominancia**
Muestra una tabla cuadrada donde la celda (A, B) indica si el modelo A domina al modelo B (según los criterios activos). Al pasar el ratón por una celda, los dos modelos implicados se resaltan en el scatter con un anillo cian.

---

### El wizard "¿Qué modelo me conviene?"

Un modal interactivo que guía al usuario con tres preguntas:
1. ¿Qué importa más: CO₂ mínimo, mayor velocidad, o equilibrio?
2. ¿Tienes restricciones de tamaño de modelo?
3. ¿Es crítica la latencia?

Según las respuestas, ajusta los pesos del TOPSIS y destaca el modelo recomendado.

---

## 2. Break-Even Ambiental (pestaña "Simulación")

### Contexto

La pestaña de Simulación escala los resultados de una consulta individual a producción. Una de sus secciones (Tarea 5) aborda una pregunta concreta: **"Si migro a un modelo más eficiente, ¿cuándo me habrá merecido la pena desde el punto de vista ambiental?"**

El razonamiento es que cambiar de modelo no es gratis: hay un **coste de despliegue** (CO₂ emitido al transferir, desplegar o reentrenar el nuevo modelo). Durante los primeros días, ese coste hace que el sistema nuevo tenga más CO₂ acumulado que si no hubiera cambiado nada. Eventualmente, el ahorro diario por usar el modelo más eficiente compensa la deuda. El día en que eso ocurre es el **break-even (punto de equilibrio)**.

---

### Los datos de partida

- **CO₂ diario con el modelo actual**: `queries_día × CO₂_por_query` (en kg)
- **Factor del modelo eficiente**: un multiplicador < 1 que indica cuánto CO₂ relativo emite el nuevo modelo frente al actual (ej: 0.6 significa que emite un 40% menos)
- **Ahorro diario**: `CO₂_diario × (1 - factor)`
- **Overhead de despliegue**: cuánto CO₂ cuesta la migración en sí. El usuario elige entre 4 presets: sin overhead (0 kg), pequeño (0.5 kg), medio (5 kg), grande (50 kg)

---

### El cálculo del punto de equilibrio

`break_even_días = ceil(overhead / ahorro_diario)`

Si overhead = 0 → el ahorro es inmediato desde el día 1, se muestra un mensaje especial sin gráfico.

Si overhead > 0 → se calcula el día exacto y se muestra el gráfico.

---

### El gráfico de break-even

Es un gráfico de líneas con el tiempo en el eje X (días/meses) y el CO₂ acumulado en el eje Y (kg). Tiene dos líneas:

- **Línea roja** ("Sin cambio"): crece linealmente a ritmo constante = CO₂ diario con el modelo actual. Parte desde 0.
- **Línea de color** ("Con modelo eficiente"): empieza más arriba (el overhead de despliegue) pero crece más despacio (porque el modelo nuevo emite menos por consulta). Su pendiente es `CO₂_diario × factor`.

Las dos líneas se cruzan en el **punto amarillo**, que es el break-even. Antes de ese punto, la línea de color está por encima (la migración todavía "debe" CO₂). Después del cruce, la línea de color queda por debajo — a partir de ahí cada consulta supone un ahorro neto real.

El gráfico siempre muestra al menos hasta 2× el break-even para que el cruce sea visible. Si no hay overhead, no se muestra gráfico.

---

### Qué modelo eficiente se usa

La simulación tiene una lista `MODELOS_EFICIENTES_SIM` (modelos del dataset marcados como opciones de migración, cada uno con su `factor` de reducción de CO₂). El usuario puede seleccionar cuál es el modelo al que migraría en la sección previa (Tarea 4), y ese modelo es el que se usa para calcular el break-even. El color de la línea y del resultado también refleja el color de ese modelo (verde para muy eficiente, amarillo para moderado, etc.).

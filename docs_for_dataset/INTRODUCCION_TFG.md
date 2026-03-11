# Introducción

## Motivación

La Inteligencia Artificial ha experimentado en la última década un crecimiento extraordinario, consolidándose como una tecnología transversal presente en ámbitos que van desde la investigación científica hasta la industria y los servicios. Sin embargo, detrás de cada consulta a un modelo de lenguaje existe un coste que rara vez aparece en pantalla: un **consumo energético significativo y una huella de carbono** que crece al mismo ritmo que la adopción de estas tecnologías. La comunidad científica empieza a señalar que no es posible hablar de progreso tecnológico sin considerar su impacto medioambiental.

En la actualidad, el desarrollo de estos modelos se enfrenta a un problema de **opacidad y falta de estandarización** en el reporte de su impacto ecológico. Mientras que el rendimiento técnico se mide con precisión quirúrgica, el coste ambiental suele quedar relegado a un segundo plano. Este escenario crea una asimetría de información donde los desarrolladores e investigadores carecen de las herramientas necesarias para evaluar si la eficacia de un modelo justifica su gasto energético.

El presente Trabajo de Fin de Grado nace con la vocación de transformar esta realidad mediante el diseño de una **herramienta de evaluación inteligente**. El objetivo fundamental es proporcionar un marco de transparencia que permita contextualizar el impacto ambiental, no como un dato aislado, sino como una variable crítica en el ciclo de vida del modelo de Inteligencia Artificial.

Para facilitar esta comprensión, el proyecto propone un cambio de paradigma inspirado en modelos de consumo cotidiano. Buscamos crear una especie de **"etiquetado de eficiencia energética" para la Inteligencia Artificial**. Del mismo modo que hoy es impensable adquirir un electrodoméstico sin consultar su etiquetado energético mediante clasificación en una escala de eficiencia (A+++, A++, A+, A, B, C, D, E, F), este trabajo pretende que la elección de un modelo de lenguaje se base en un conocimiento profundo de su "clase energética". La herramienta permitirá que un programador deje de ser un consumidor ciego de recursos para convertirse en un decisor consciente, capaz de saber no solo **cuántas emisiones genera cada llamada a un modelo**, sino también **qué tan limpia es la fuente de esa energía**.

Esta distinción es vital, ya que el impacto de un modelo no depende únicamente de su arquitectura, sino también de factores externos como la **eficiencia de la infraestructura** que lo soporta y el **mix energético** del lugar donde se ejecuta. Al integrar datos sobre la ubicación geográfica y la naturaleza de la red eléctrica local, este trabajo ofrece una visión completa y detallada que permite recomendar alternativas más sostenibles sin comprometer la consecución de los objetivos técnicos.

---

## Estado del Arte

### 2.1. Metodología de Cálculo de Huella de Carbono

El proyecto implementa un modelo de cálculo que descompone las emisiones totales de una consulta de IA en **tres componentes independientes**:

$CO_2^{total} = CO_2^{dispositivo} + CO_2^{red} + CO_2^{datacenter}$

Este enfoque permite identificar con precisión el origen de las emisiones y facilita la toma de decisiones informadas sobre optimización.

#### 2.1.1. Emisiones del Dispositivo Cliente

El consumo del dispositivo del usuario se modela mediante un **modelo dinámico de potencia** que considera el estado de reposo y la utilización real del procesador:

$P_{real} = P_{idle} + (P_{max} - P_{idle}) \times U \quad [W]$

Donde:

- **$P_{idle}$**: Potencia en reposo del sistema (típicamente 5–15 W)
- **$P_{max}$**: Potencia máxima del procesador durante inferencia (CPU, GPU o NPU)
- **$U$**: Factor de utilización (0–1, por defecto 0,7)

La energía consumida y las emisiones resultantes se calculan como:

$E_{dispositivo} = P_{real} \times \frac{t_{inferencia}}{3600} \quad [Wh]$

$CO_2^{dispositivo} = \frac{E_{dispositivo}}{1000} \times CI_{local} \quad [gCO_2]$

En estas ecuaciones: el divisor 3600 convierte segundos a horas, y el divisor 1000 convierte vatios-hora a kilovatios-hora (1 kWh = 1000 Wh), que es la unidad en que se expresa la intensidad de carbono.

#### 2.1.2. Emisiones de la Red

El consumo de red se calcula en función de los datos transferidos y la tecnología de conexión (WiFi, 4G, 5G, Fibra, Satélite):

$E_{red} = energia_{kWh/MB} \times datos_{MB} \times 1000 \quad [Wh]$

$CO_2^{red} = datos_{GB} \times \frac{energia_{kWh/GB} \times CI_{local}}{1000} \times 1000 \quad [gCO_2]$

El factor de 1000 en ambas ecuaciones se aplica para realizar conversiones de unidades: en la primera convierte de kilovatios-hora (kWh) a vatios-hora (Wh); en la segunda, el numerador divide por 1000 para convertir Wh a kWh, mientras que el denominador multiplica por 1000 para convertir de kilogramos a gramos de CO<sub>2</sub>.

Los datos transferidos se estiman automáticamente según el número de tokens procesados:

$datos_{MB} = \frac{1200 + (tokens \times 5)}{1.000.000}$

Donde 1200 bytes corresponde al *overhead* HTTP fijo y 5 bytes/token al *payload* promedio. El divisor 1.000.000 realiza la conversión de unidades a Mega Bytes.

#### 2.1.3. Emisiones del Data Center

El cálculo de las emisiones del data center utiliza el parámetro `energy_wh_per_1k_tokens` específico de cada modelo. El cálculo se desglosa en tres variables intermedias:

- **$E_{compute}$**: energía de cómputo puro consumida por el modelo (sin incluir infraestructura auxiliar)
- **$E_{datacenter}$**: energía total del data center, que incluye cómputo más refrigeración, energía auxiliar, UPS e iluminación (representados por el factor PUE)
- **$CO_2^{datacenter}$**: huella de carbono total del data center, resultado de multiplicar la energía por la intensidad de carbono de la zona

Las fórmulas son:

$E_{compute} = \frac{tokens_{procesados}}{1000} \times energy_{wh/1k} \quad [Wh]$

$E_{datacenter} = E_{compute} \times PUE \quad [Wh]$

$CO_2^{datacenter} = \frac{E_{datacenter}}{1000} \times CI_{datacenter} \quad [gCO_2]$

En estas ecuaciones, el divisor 1000 ($E_{compute}$) normaliza los tokens a la unidad estándar de 1000 tokens en la que viene expresado el consumo energético del modelo. En la fórmula $CO_2^{datacenter}$, el divisor 1000 convierte vatios-hora (Wh) a kilovatios-hora (kWh), que es la unidad en que se expresa la intensidad de carbono del data center (gCO<sub>2</sub>/kWh), permitiendo el producto dimensional correcto: $\frac{Wh}{1000} \times \frac{gCO_2}{kWh} = gCO_2$.

---

## 2.2. Derivación del Consumo Energético por Token

El parámetro `energy_wh_per_1k_tokens` representa el consumo energético de cada modelo al procesar 1000 tokens en el *data center*. Su obtención no sigue un único método, pues el *dataset* del proyecto combina **dos variantes metodológicas** en función de la información disponible para cada modelo. La base teórica común parte del **principio fundamental de computación en redes neuronales**: el número de operaciones de coma flotante (FLOPS) requeridas para procesar cada token es directamente proporcional a la cantidad de parámetros del modelo. Durante la fase de inferencia (*forward pass*), cada token atraviesa el modelo una única vez, realizando una multiplicación y una suma en cada neurona.

### 2.2.1. Fórmula teórica base (2N FLOPs)

Para los modelos que carecen de datos empíricos publicados, el consumo se estima mediante la siguiente fórmula:

$$E_{token} = \frac{2 \times N_{params}}{TFLOPS_{GPU} \times \eta \times 10^{12}} \times \frac{TDP_{GPU}}{3600}$$

Donde cada parámetro juega un papel físico específico:

- **$2 \times N_{params}$**: Número total de FLOPS mínimos por token en el *forward pass*. El factor 2 proviene de que en cada neurona se realizan 2 operaciones elementales: una multiplicación y una suma. Este resultado, demostrado por Kaplan et al. (2020), establece que los FLOPS de inferencia son directamente proporcionales al número de parámetros del modelo.

- **$TFLOPS_{GPU} \times 10^{12}$**: Capacidad de cómputo de la GPU expresada en operaciones por segundo (teraflops), obtenida de las especificaciones del fabricante. El factor $10^{12}$ convierte teraflops a flops para mantener la coherencia dimensional con el numerador. La GPU de referencia utilizada para la mayoría de modelos es la NVIDIA A100 SXM4 (312 TFLOPS FP16, 400 W TDP).

- **$\eta$**: Factor de eficiencia de la GPU (entre 0 y 1), que refleja la fracción del rendimiento teórico realmente aprovechada. Los modelos grandes (>100B parámetros) alcanzan mayor utilización ($\eta \approx 0,45$) gracias a un *batching* más eficiente, mientras que los modelos pequeños (<5B) operan con eficiencias más bajas ($\eta \approx 0,15$) al subutilizar el paralelismo de la GPU. Los valores concretos empleados son: 0,45 (>100B), 0,35 (30B–100B), 0,25 (5B–30B) y 0,15 (<5B).

- **$TDP_{GPU}$**: Consumo de potencia máximo de la GPU en vatios, también proporcionado por el fabricante. Representa la potencia que consume el hardware bajo carga computacional total.

- **$3600$**: Conversión de segundos a horas, necesaria para expresar el resultado en vatios-hora (Wh), la unidad de energía utilizada en el resto del modelo.

Aplicando esta fórmula a **PaLM 2** (340B parámetros, $\eta = 0,45$):

- **FLOPS por token**: $2 \times 340 \times 10^{9} = 6,8 \times 10^{11}$
- **TFLOPS efectivos**: $312 \times 0,45 = 140,4$ TFLOPS
- **Tiempo por 1k tokens**: $\frac{6,8 \times 10^{11} \times 1000}{140,4 \times 10^{12}} = 4,843$ s
- **Energía**: $\frac{400 \times 4,843}{3600} = 0,538$ Wh/1k tokens

### 2.2.2. Coexistencia de metodologías

No todos los modelos del *dataset* derivan su consumo de la fórmula anterior de forma idéntica. La siguiente tabla resume las dos variantes que coexisten y los modelos a los que se aplica cada una:

| Metodología | Descripción | Modelos | GPU de referencia |
|---|---|---|---|
| **Fórmula 2N FLOPs** | Cálculo teórico con factor de eficiencia $\eta$ | PaLM 2, OPT-175B, Claude 2, Llama 2-70B, Falcon 40B, MPT 30B, Gemma 7B, Mistral 7B, Phi-2 | NVIDIA A100 (312 TFLOPS, 400 W) |
| **Fórmula 2N FLOPs (MoE)** | Misma fórmula, aplicada sobre los ~280B parámetros activos por token (de 1,7T totales) | GPT-4 | NVIDIA A100 (312 TFLOPS, 400 W) |

El caso de GPT-4 requiere mención especial por su arquitectura **Mixture of Experts (MoE)**. A diferencia de modelos como Llama 2 o PaLM 2, donde todos los parámetros se usan para procesar cada token, GPT-4 divide su capacidad en múltiples subredes especializadas llamadas *expertos*. Para cada token, un componente adicional llamado *router* decide qué expertos son los más adecuados y activa únicamente esos, dejando el resto inactivo.

En términos prácticos: GPT-4 tiene ~1,7 billones de parámetros en total, pero solo activa aproximadamente el 12,5% de ellos por token (~280B parámetros). Esto significa que aunque el modelo es enorme en tamaño, su coste computacional por inferencia es comparable al de un modelo denso de 280B parámetros.

Por ello, en lugar de aplicar la fórmula 2N FLOPs sobre los 1,7T parámetros totales —lo que sobreestimaría el consumo real ~6×—, se aplica sobre los **~280B parámetros activos**, obteniendo 0,443 Wh/1k tokens. Este valor es coherente con el rango esperado para ese tamaño de activación (Claude 2, 100B: 0,204 Wh/1k; PaLM 2, 340B: 0,538 Wh/1k).

### 2.2.3. Overhead operacional

La fórmula 2N FLOPs captura únicamente el cómputo puro de las operaciones del modelo (multiplicaciones y sumas matriciales). En la práctica, el consumo real de la GPU es superior debido a costes operacionales adicionales: gestión de memoria, operaciones de entrada/salida (I/O), *scheduling* de la GPU, y otros procesos internos. Este *overhead*, estimado empíricamente en un factor de entre 2× y 5× sobre el cómputo puro, queda implícitamente incorporado en los factores de eficiencia $\eta$.

---

## 2.3. Métricas de Eficiencia en Centros de Datos

El **PUE (Power Usage Effectiveness)** es la métrica estándar que mide la eficiencia energética de un centro de datos:

$$PUE = \frac{\text{Energía}_{Total}}{\text{Energía}_{IT}}$$

Un PUE perfecto es 1,0, lo que significa que toda la energía se destina al equipamiento de computación. El proyecto incluye un *dataset* de **71 centros de datos** con valores PUE verificados:

| Proveedor | PUE Promedio | Rango |
|---|---|---|
| Google Cloud Platform | 1,10 | 1,08 – 1,12 |
| Deep Green | 1,005 | 1,003 – 1,008 |
| AWS | 1,15 | 1,10 – 1,20 |
| Microsoft Azure | 1,12 | 1,08 – 1,20 |
| Media de la industria | 1,56 | 1,30 – 2,00 |

---

## 2.4. Intensidad de Carbono por Zona Eléctrica

Una innovación clave del proyecto es el uso de la **API de Electricity Maps** para obtener la intensidad de carbono (CI) específica por zona eléctrica, no solo por país. El sistema implementa una arquitectura de **4 niveles de *fallback***:

1. **API nativa del proveedor cloud** (AWS, GCP, Azure reconocidos por Electricity Maps)
2. **Mapeo de zona específica** (113 regiones → 39 zonas de Electricity Maps)
3. ***Fallback* por país** (55 países con valores por defecto)
4. ***Fallback* global** (450 gCO<sub>2</sub>/kWh como último recurso)

Esta granularidad geográfica es fundamental porque la intensidad de carbono varía enormemente entre zonas. La siguiente tabla, construida a partir de los datos que proporciona Electricity Maps, ilustra cómo una misma consulta puede tener un impacto hasta **35 veces mayor** dependiendo de la ubicación del centro de datos:

| Zona | CI (gCO<sub>2</sub>/kWh) | Fuente principal |
|---|---|---|
| NO (Noruega) | 20 | Hidroeléctrica |
| SE (Suecia) | 25 | Nuclear + Hidro |
| FR (Francia) | 50 | Nuclear |
| US-NW-BPAT (Oregon) | 77 | Hidroeléctrica |
| ES (España) | 145 | Mix renovable |
| DE (Alemania) | 380 | Carbón + Renovables |
| US-MIDA-PJM (Virginia) | 498 | Gas + Carbón |
| PL (Polonia) | 650 | Carbón |
| IN (India) | 700 | Carbón |

Este rango (de 20 a 700 gCO<sub>2</sub>/kWh) justifica la necesidad de integrar datos en tiempo real desde Electricity Maps, ya que utilizar únicamente promedios nacionales enmascararía diferencias críticas dentro de un mismo país.

---

## 2.5. El Problema del Greenwashing

El término **greenwashing** hace referencia a prácticas de comunicación corporativa que exageran o distorsionan el compromiso ambiental real de una empresa. En el sector de los centros de datos, esta problemática se manifiesta principalmente en la diferencia entre las emisiones reportadas mediante certificados de energía renovable y el impacto real derivado de la composición de la red eléctrica donde operan físicamente.

Para abordar esta discrepancia, el proyecto distingue entre dos métricas:

- **`renewable_grid_pct`**: Porcentaje real de renovables en la red eléctrica de la zona
- **`provider_renewable_pct`**: Porcentaje declarado por el proveedor mediante PPAs y certificados

Esta distinción permite que los usuarios evalúen el impacto real de sus consultas, no solo el reportado por los proveedores.

---

## Listado de Objetivos

### 3.1. Objetivo Principal

Diseñar y desarrollar una herramienta de evaluación inteligente que permita cuantificar y comparar el impacto medioambiental de diferentes modelos de Inteligencia Artificial, integrando los distintos factores técnicos, geográficos y de infraestructura que intervienen en el consumo energético de una consulta, para proporcionar un marco de transparencia y sostenibilidad.

### 3.2. Objetivos Específicos

**Objetivos de Investigación**

1. **OI-01:** Investigar y documentar las metodologías existentes para el cálculo de la huella de carbono en sistemas de IA, fundamentando la fórmula $2 \times N$ FLOPs como base para estimar el consumo energético por token durante la inferencia `energy_wh_per_1k_tokens`.

2. **OI-02:** Analizar el estado del arte de herramientas existentes (CodeCarbon, ML CO2 Impact, Green Algorithms, Carbontracker) e identificar *gaps* y oportunidades de mejora.

3. **OI-03:** Recopilar y validar datos de eficiencia energética (PUE) de los principales proveedores cloud (AWS, Azure, GCP) desde informes de sostenibilidad oficiales y papers publicados.

4. **OI-04:** Investigar y cuantificar el consumo energético de la transmisión de datos por tecnología de acceso a red (Fibra, 4G, 5G, WiFi), a partir de literatura académica y reportes del sector (Aslan et al., GSMA, Ericsson).

5. **OI-05:** Caracterizar el consumo energético de los dispositivos cliente (*smartphones*, portátiles, PCs de escritorio) en función de su tipo de procesador (CPU, GPU, NPU) y su modelo de potencia dinámica.

**Objetivos de Desarrollo**

6. **OD-01:** Crear un *dataset* consolidado de modelos de IA con características técnicas y energéticas verificadas que sirva como base de conocimiento para la calculadora.

7. **OD-02:** Desarrollar un motor de cálculo (CarbonCalculator) que implemente la fórmula de emisiones desglosada en tres componentes: dispositivo, red y centro de datos. $CO_2^{total} = CO_2^{dispositivo} + CO_2^{red} + CO_2^{datacenter}$.

8. **OD-03:** Integrar la API de Electricity Maps para obtener la intensidad de carbono en tiempo real, con mapeo de los centros de datos del dataset a sus zonas eléctricas correspondientes.

9. **OD-04:** Implementar una arquitectura de 4 niveles de *fallback* para garantizar la disponibilidad de datos de intensidad de carbono en cualquier escenario.

10. **OD-05:** Diseñar e implementar un sistema de etiquetado energético con 9 clases (A+++ a F) basado en percentiles estadísticos calculados sobre el conjunto de combinaciones posibles que generan los datos existentes.

11. **OD-06:** Desarrollar una interfaz web interactiva que permita a los usuarios seleccionar distintas combinaciones de modelo, centro de datos, dispositivo y tipo de red, comparar sus emisiones estimadas y consultar la etiqueta de eficiencia asignada a cada escenario.

**Objetivos de Validación**

12. **OV-01:** Validar los cálculos de la herramienta comparándolos con valores reportados en literatura académica y herramientas de referencia del sector.

13. **OV-02:** Verificar que los umbrales del sistema de etiquetado son significativos, es decir, que los escenarios clasificados en clases superiores (A+++, A++) presentan emisiones realmente inferiores a los de clases más bajas (D, E, F) y que las fronteras entre clases no son arbitrarias.

**Objetivos de Documentación y Despliegue**

14. **ODD-01:** Documentar exhaustivamente las fuentes de datos, fórmulas y metodología empleada para garantizar la reproducibilidad del trabajo.

15. **ODD-02:** Desplegar la aplicación en Render para acceso público.

---

## Aplicaciones Similares: Análisis Comparativo

A continuación, se presenta un análisis de las principales herramientas existentes para la evaluación del impacto medioambiental en sistemas de IA, identificando sus fortalezas y debilidades frente al proyecto propuesto.

### CodeCarbon

Se trata de una librería Python de código abierto que rastrea las emisiones de CO<sub>2</sub> de código de *machine learning*. Monitoriza el consumo energético del hardware durante la ejecución mediante RAPL (CPU) y `nvidia-smi` (GPU).

Su principal fortaleza reside en la facilidad de integración con código Python existente (mediante decoradores y context managers), lo que permite obtener mediciones en tiempo real del consumo de CPU y GPU sin modificar sustancialmente el flujo de trabajo. Además, cuenta con una comunidad activa y documentación extensa.

Sin embargo, esta aproximación tiene limitaciones importantes. Al depender de la monitorización directa del hardware, no es capaz de estimar emisiones de modelos accedidos vía API (como GPT-4 o Claude), quedando restringida a modelos entrenados o ejecutados localmente. Tampoco incorpora el PUE específico de cada centro de datos ni integra datos de composición energética por zona eléctrica.

Frente a estas carencias, el proyecto propuesto permite estimar emisiones de cualquier modelo (incluidos los propietarios) a partir de las características recogidas en su dataset, y vincula cada centro de datos con su zona eléctrica real en Electricity Maps.

### ML CO2 Impact (Machine Learning Emissions Calculator)

ML CO2 Impact consiste en una calculadora web que estima las emisiones de CO<sub>2</sub> del entrenamiento de modelos de *machine learning* basándose en el hardware utilizado, las horas de ejecución y la región geográfica.

Entre sus puntos fuertes destaca que ofrece una interfaz web accesible sin necesidad de instalación y que tiene en cuenta la región geográfica al calcular las emisiones, apoyándose en una base de datos de intensidad de carbono por país.

No obstante, se centra exclusivamente en la fase de entrenamiento, ignorando la inferencia —que es precisamente la fase en la que los usuarios finales toman decisiones—. Sus datos de intensidad de carbono son estáticos y potencialmente desactualizados, y no diferencia entre zonas eléctricas dentro de un mismo país.

Por ejemplo, US-NW-BPAT y US-MIDA-PJM pueden diferir hasta 6× en intensidad de carbono dentro de Estados Unidos. Tampoco proporciona un sistema de etiquetado o ranking comparativo entre modelos.

El proyecto propuesto aborda estas limitaciones centrándose en el impacto por consulta (inferencia) y trabajando con datos de intensidad de carbono a nivel de zona eléctrica, con más de 350 zonas disponibles a través de Electricity Maps.

### Green Algorithms

Se trata de una herramienta web para estimar la huella de carbono de algoritmos computacionales en general.

Ofrece una interfaz intuitiva con visualizaciones de impacto y equivalencias tangibles (árboles necesarios para compensar, kilómetros conducidos), además de considerar distintos tipos de hardware (CPU, GPU, TPU). Estos elementos hacen que los resultados sean inmediatamente comprensibles para un público no técnico.

Su principal limitación es que no está diseñado específicamente para modelos de IA, sino para cómputo genérico. Esto obliga al usuario a conocer de antemano el tiempo de ejecución y el hardware exacto, y la herramienta no incluye una base de datos de modelos pre-configurados ni integra APIs de composición energética en tiempo real.

El proyecto propuesto resuelve esta barrera con un dataset específico de modelos de IA cuyos parámetros de consumo energético y latencia ya están pre-calculados. El usuario solo necesita seleccionar el modelo, el centro de datos, el dispositivo y el tipo de red; la calculadora obtiene todos los parámetros automáticamente.

### Carbontracker

Carbontracker es la herramienta de línea de comandos para predecir y rastrear el consumo energético durante el entrenamiento de modelos de *deep learning*.

Su aportación más notable es la capacidad de predecir el consumo energético total a partir de las primeras épocas (epochs) de entrenamiento, ofreciendo un rastreo detallado por GPU individual y una integración directa con PyTorch.

Como contrapartida, comparte las mismas restricciones estructurales que CodeCarbon, esto es, solamente opera durante el entrenamiento, requiere acceso directo al hardware y no ofrece comparativas entre distintos modelos. Además, carece de interfaz gráfica, funcionando exclusivamente por línea de comandos.

El proyecto propuesto se diferencia al adoptar un enfoque comparativo, en el que el usuario puede evaluar múltiples modelos antes de elegir cuál usar, y ofreciendo una interfaz web con sistema de etiquetado medioambiental (A+++ a F), además de diversos reportes para comparar rendimiento frente a sostenibilidad entre distintos modelos y observar un desglose detallado de la energía consumida y las emisiones generadas por modelo y consulta.

---

## 4.5. Propuesta de Valor Diferencial

El proyecto propuesto se posiciona como la **primera herramienta que integra todas estas características**:

1. **Análisis de emisiones desglosado:** Separación clara de las tres fuentes principales de emisión (dispositivo, red y centro de datos), permitiendo identificar cuál domina en cada escenario concreto.

2. **Granularidad Geográfica:** Mapeo de cada centro de datos a su zona eléctrica específica en Electricity Maps, capturando diferencias que pueden llegar a 6× dentro del mismo país.

3. **Sistema de Etiquetado Estadístico:** Nueve clases (A+++ a F) con umbrales calculados sobre la distribución completa de escenarios posibles, basados en percentiles reales.

4. **Transparencia sobre Greenwashing:** Confronta la composición energética real de cada zona eléctrica con la que declaran los proveedores a través de certificados de energía renovable, exponiendo discrepancias entre ambas.

5. **Cobertura de Modelos Propietarios:** *Dataset* con parámetros verificados tanto de modelos accedidos vía API (GPT-4, Claude, PaLM 2) como de modelos de código abierto (Llama 2, Mistral, Gemma, Phi-2, Falcon, MPT, OPT-175B).

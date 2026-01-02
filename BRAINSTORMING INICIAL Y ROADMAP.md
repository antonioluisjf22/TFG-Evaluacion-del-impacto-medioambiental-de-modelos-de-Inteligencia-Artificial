# Brainstorming Inicial - TFG: Evaluación del Impacto Medioambiental de Modelos de IA

## 1. ENFOQUE DEL PROYECTO

Se propone un enfoque **híbrido "Investigación + Herramienta Práctica"** que combina:

- **Investigación rigurosa** sobre metodologías de cálculo de emisiones (CO2 equivalent, PUE, CI, FLOPS) y estándares de sostenibilidad en IA. La principal fórmula para obtener la cantidad de C02 emitida por los modelos es la siguiente: tCO2eq=(MWh del entrenamiento) ×PUE×CI (parámetros explicados con mayor detalle en memoria)
- **Herramienta real y usable** que permita comparar modelos de IA según su impacto ambiental y rendimiento técnico
- **Validación con datos reales** de centros de datos (AWS, Azure) y mix energético por regiones. 

El proyecto se posiciona como la **primera herramienta que integra localización geográfica y mix energético real** en la evaluación de sostenibilidad de modelos de IA, permitiendo que desarrolladores e investigadores tomen decisiones informadas y responsables.

Combinación de los siguientes enfoques: 


**A.**  ***Enfoque "Herramienta Práctica"***
Tu proyecto debería ser una herramienta real y usable que resuelva un problema tangible. El concepto del "etiquetado de eficiencia energética para IA" (como en los electrodomésticos) es excelente, pero necesita concretarse en:

* Una comparativa de modelos que permita a un desarrollador elegir entre varias opciones (GPT-4, Llama, Claude, etc.) basándose en impacto ambiental + rendimiento dependiendo de la tarea a desempeñar y de las características de su dispositivo.
* Se desea emplear un ranking o scoring similar a las etiquetas energéticas (A+++, A+, A, B, C, etc.)
* Recomendaciones contextualizadas según la tarea específica (clasificación, generación de texto, visión, etc.)

**B.** ***Enfoque "Investigación + Herramienta" (Más ambicioso)***
Combina investigación académica rigurosa con prototipo funcional:

* Investigar las fórmulas de cálculo de emisiones consumidas por los modelos de IA (CO2 equivalent, PUE, CI, FLOPS)
* Comparar metodologías existentes de evaluación de impacto medioambiental y extraer datos existentes al respecto (seguramente se utilice técnicas de ML para determinar el impacto de CO2 de los sistemas).
* Validar con datos reales de centros de datos y hosting en distintas regiones.
* Proponer mejoras o estándares nuevos.
---

## 2. IDEAS CLAVE PARA MAXIMIZAR POTENCIAL DEL PROYECTO

### A. Diferenciación: Factor Geográfico + Mix Energético (Recopilación de Datos y ML)

Este es el mayor diferenciador del proyecto. La herramienta debe mostrar cómo el mismo modelo tiene diferentes impactos según la ubicación geográfica y el centro de datos:

- Por ejemplo: *"Un modelo en Noruega (92% renovable) emite 0.5 kg CO2, pero en Polonia (80% carbón) emite 3.2 kg CO2"*
- **Integración de datos reales:** Electricity Map API para obtener mix energético por región en tiempo real.
- **Aplicación de ML:** Desarrollar modelos predictivos que estimen impacto según características del modelo (parámetros, FLOPS) y ubicación geográfica.
- **Análisis de tendencias:** Visualizar cómo cambia el impacto a lo largo del tiempo según transición energética de cada país y centro de datos.
- **Variación en base al tiempo de ejecución**: Tener en cuenta también el impacto acumulativo en base al tiempo de empleo.

**Potencial:** Este factor diferencial es revolucionario en herramientas de sostenibilidad existentes. Será el punto clave en la defensa del proyecto.

### C. Personalización mediante Interfaces Inteligentes

Diseñar interfaces que adapten recomendaciones según restricciones específicas del usuario:

- **Modo Rendimiento:** Busca el modelo más preciso sin importar impacto ambiental
- **Modo Sostenible:** Busca el modelo con menor huella de carbono manteniendo precisión mínima
- **Modo Balanceado:** Encuentra el equilibrio óptimo entre rendimiento y sostenibilidad
- **Modo Personalizado:** El usuario define pesos específicos para cada criterio (precio, latencia, consumo energético, precisión, etc.)
- **Visualización de Trade-offs:** Mostrar frontera de Pareto en interfaz interactiva, permitiendo explorar qué ganas y qué pierdes al cambiar de modelo

**Ejemplos**:
Restricciones técnicas: "Necesito modelo con latencia <100ms"
Restricciones presupuestarias: "Mi presupuesto es limitado"
Restricciones ambientales: "Quiero minimizar carbono"
Combinaciones: "Mejor modelo para balance rendimiento-carbono"

**Potencial:** Demuestra UX inteligente y pensamiento sistémico. Los usuarios pueden ver inmediatamente cómo sus decisiones impactan en sostenibilidad.

---

## 3. ESTRUCTURA LÓGICA DEL PROYECTO (4 Capas)

### Capa 1: Recopilación y Gestión de Datos
- **Características de modelos:** Parámetros, FLOPS, consumo energético reportado (papers, benchmarks públicos)
- **Mix energético por región:** Electricity Map API, datos históricos de operadores energéticos.
> [!TIP]
> BUSCAR TAMBIÉN DATOS ESPECÍFICOS DE LOS CENTROS DE DATOS (AWS, AZURE...)

- **Especificaciones de infraestructura:** PUE (Power Usage Effectiveness) de diferentes data centers, eficiencia de GPUs/CPUs, etc.
- **Métricas de referencia de rendimiento:** Precisión, latencia, throughput según tarea específica
- **Fuentes de datos:** Mantener trazabilidad de dónde proviene cada dato para reproducibilidad

### Capa 2: Motor de Cálculo
- **Fórmulas de conversión:** FLOPS → Watts → kg CO2 según mix energético regional
- **Factor de localización:** Aplicar PUE de data center + intensidad de carbono de la región
- **Métricas extendidas:** No solo CO2, sino también huella hídrica, eficiencia de recursos (OPCIONAL, de momento centralizado en huella de carbono)
- **Normalización:** Permitir comparación equitativa entre modelos de diferentes tipos (LLMs, visión, clásicos)
- **Validación:** Comparar resultados con ML CO2 Impact, DeepGreen y otras herramientas existentes.

> [!TIP]
> BUSCAR MÁS INFORMACIÓN SOBRE DEEPGREEN Y CODECARBON

### Capa 3: Motor de Recomendación con IA
- **Análisis multi-criterio:** Combina rendimiento, impacto ambiental, costo económico, latencia
- **Algoritmo de scoring:** Genera ranking dinámico siguiendo el modelo de etiquetas medioambientales de electrodomésticos, a partir de las consideraciones indicadas por el usuario.
- **Explicabilidad:** El sistema debe mostrar **por qué** recomienda cada modelo (qué criterios pesaron más). MUY EXPLICATIVO.
- **Personalización:** Adapta recomendaciones según perfil del usuario (investigador, productor, startup) **(DE MOMENTO OPCIONAL)**
- **Aprendizaje:** Registrar elecciones de usuarios para mejorar recomendaciones futuras **(DE MOMENTO OPCIONAL)**

### Capa 4: Visualización e Interfaz
- **Etiquetas energéticas visuales:** Similar a electrodomésticos (A+++, A+, A, B, C, etc.)
- **Comparativas interactivas:** Seleccionar N modelos y visualizar diferencias lado a lado
- **Mapas de impacto geográfico:** Mostrar cómo cambia el impacto según región seleccionada
- **Generador de reportes:** Exportar análisis en formato PDF/HTML para documentación
- **Dashboard de contexto:** Mostrar información sobre la tarea específica (clasificación, generación de texto, etc.)
- **Visualización de Trade-offs:** Mostrar frontera de Pareto en interfaz interactiva, permitiendo explorar qué ganas y qué pierdes al cambiar de modelo
- **Métricas comparativas:** Mostrar impacto también en términos intuitivos (ej: "equivalente a X árboles" o "como usar X focos LED un año")

---

## 4. OPORTUNIDADES DE INNOVACIÓN

### Idea 1: Calculadora de Trade-offs Interactiva
Permitir al usuario visualizar la **frontera de Pareto (Pareto frontier)** entre rendimiento y sostenibilidad:

- **Eje X:** Precisión/Rendimiento del modelo
- **Eje Y:** Emisiones de CO2 totales o por predicción
- **Puntos de datos:** Cada modelo representado como punto en el gráfico
- **Visualización:** Resaltar modelos "eficientes" (aquellos que no son dominados por ningún otro)
- **Interactividad:** Pasar el ratón sobre un modelo muestra detalles, clic para ver análisis completo. **(PUEDE SER COMPLEJO)**

**Valor:** El usuario ve inmediatamente cuáles son las opciones sensatas. Algunos modelos son "malos en todo" (baja precisión + alto carbono), otros ofrecen buenos trade-offs.

### Idea 2: Simulador de Escenarios de Producción
Estimar el **impacto acumulativo real** de usar un modelo en producción:

*"Si mi aplicación ejecuta el modelo 1M de veces al día, ¿cuál es la diferencia anual de CO2 entre usar GPT-4 vs Llama 2? ¿Cuánto es en $ de energía?"*

- **Inputs:** Modelo A, frecuencia de ejecución (queries/día), días operativo/año, región de ejecución
- **Outputs:** 
  - Kg de CO2 por año
  - Equivalente en árboles necesarios para compensar (1 árbol adulto absorbe ~20-25 kg CO2/año)
  - Costo energético anual en $
  - Comparativa visual con modelos con mayor rentabilidad
- **Variabilidad:** Mostrar cómo cambia el impacto si cambias región geográfica
- **Sensibilidad:** Ajustar parámetros en tiempo real y ver cambios instantáneos

**Valor:** Conecta el problema teórico con la realidad empresarial. Un CTO ve claramente "cambiar a este modelo nos ahorra 50 toneladas de CO2 al año (equivalente a 2,000-2,500 árboles)". Métrica más tangible para stakeholders no técnicos.

### Idea 3: Certificación y Estándar de Sostenibilidad para Modelos
Proponer un **badge/certificación que modelos pueden obtener** si cumplen ciertos criterios de eficiencia energética:

- **Criterios de certificación:**
  - Clase A: Consumo inferior al percentil 25 (modelos más eficientes)
  - Clase B: Entre percentil 25-50
  - Clase C: Entre percentil 50-75
  - Clase D: Superior al percentil 75 (menos eficientes)
  
- **Variante por tarea:** Un modelo puede ser Clase A en clasificación de imágenes pero Clase B en generación de texto
- **Transparencia:** Publicar lista de modelos certificados con sus métricas
- **Incentivos:** Fomentar que desarrolladores optimicen por sostenibilidad

**Valor:** Crea estándar compartido similar a etiquetas energéticas reales. Incentiva la industria a desarrollar modelos más sostenibles.

---

## 5. ESTRATEGIA DE PRESENTACIÓN Y DEFENSA

### En la Memoria Académica:
- **Posicionamiento claro:** "Análisis detallado y cuantitativo del impacto medioambiental de modelos de IA, según características del dispositivo, tarea a desempeñar, tiempo de uso, localización geográfica y centro de datos"
- **Impacto demostrableable:** Presentar casos de uso donde tu enfoque **cambia la decisión** de un desarrollador (ej: elegir modelo diferente al considerar región geográfica + CO2)
- **Rigor científico:** Citar papers fundamentales sobre sostenibilidad en ML, demostrar comprensión profunda de las fórmulas de cálculo
- **Validación:** Comparar tus cálculos con resultados de herramientas existentes (ML CO2 Impact, DeepGreen, CodeCarbon)
- **Visión futura:** Proponer cómo podría evolucionar el proyecto (integración con CI/CD, APIs, estándares industria)

### Argumentos Clave a Destacar:
1. **Novedad:** Mix energético + localización real no existen en competencia directa 
> [!TIP]
> BUSCAR MÁS INFORMACIÓN SOBRE MLCO2, DEEPGREEN Y CODECARBON.
2. **Practicidad:** No es solo investigación, es una herramienta que alguien puede usar hoy
3. **Escalabilidad:** Arquitectura diseñada para agregar nuevos modelos, regiones, métricas
4. **Educación:** Contribuye a crear conciencia sobre sostenibilidad en IA

---

## 6. PREGUNTAS ESTRATÉGICAS A RESPONDER

1. **¿Cuál es mi audiencia principal?** ¿Desarrolladores? ¿Investigadores? ¿CTOs de empresas? Esto define prioritarios de la interfaz y funcionalidades core.

2. **¿Qué modelos incluyo en V1?** Mejor 5-10 modelos bien documentados que 50 modelos imprecisos. Propuesta: GPT-3.5, GPT-4, Llama 2, Mistral, Claude 2, BERT, ViT.

3. **¿Qué nivel de precisión necesito?** ¿Exacto al kg de CO2 ± 5%? ¿O es suficiente orden de magnitud? La precisión define complejidad.

4. **¿Quién mantiene los datos?** Los datos cambian constantemente (nuevas versiones de modelos, transición energética por país). Define si es prototipo estático o sistema dinámico.

5. **¿Cuál es mi "momento eureka"?** ¿Qué insight único genera tu TFG que no exista en el arte anterior? (Respuesta: La localización geográfica + recomendación personalizada).

---

## 7. ROADMAP DE DESARROLLO

| Fase | Objetivo | Resultado/Entregables | Duración Aprox. |
|------|----------|---|---|
| **Investigación & Research** | Entender fórmulas (FLOPS→Watts→CO2), metodologías, estado del arte. Buscar información sobre ML CO2 Impact, DeepGreen, CodeCarbon. Investigar características y consumo energético de 5-10 modelos base | Documento técnico de 15-20 pgs, comparativa análisis de herramientas existentes, papers referenciados, tabla con características de modelos (parámetros, FLOPS, consumo energético) | 2-3 semanas |
| **Recopilación de Datos** | Identificar y validar fuentes de datos confiables: mix energético por región (Electricity Map API), PUE de data centers (AWS, Azure), métricas de rendimiento por modelo y tarea | Dataset consolidado con fuentes documentadas y trazables, validación de precisión de datos | 1-2 semanas |
| **Prototipo V1** | Comparador básico funcional: 5-10 modelos + 3-5 regiones geográficas. Motor de cálculo básico (MWh × PUE × CI) | Dashboard simple pero preciso, cálculos de CO2 validados contra otras herramientas, integración con Electricity Map API, tabla comparativa de modelos | 3-4 semanas |
| **Prototipo V2** | Agregar visualizaciones avanzadas y etiquetado energético. Implementar sistema de scoring (A+++, A+, A, B, C, etc.). Personalización según restricciones del usuario | Sistema de scoring como electrodomésticos, gráficos interactivos, modos de visualización (Rendimiento/Sostenible/Balanceado), primera versión de interfaces personalizadas | 3-4 semanas |
| **Feature: Trade-offs** | Implementar calculadora interactiva de Pareto. Visualizar frontera de eficiencia entre rendimiento y sostenibilidad | Gráfico interactivo de frontera de Pareto, interactividad al pasar ratón sobre modelos (de momento opcional), análisis de qué se gana/pierde al cambiar de modelo | 1-2 semanas |
| **Feature: Simulador** | Implementar escenarios de producción con impacto acumulativo. Inputs: modelo, frecuencia ejecución, días operativo, región | Calculadora avanzada, outputs en kg CO2/año, equivalente en árboles, costo en $, comparativas visuales, cálculo de impacto según tiempo de uso | 1-2 semanas |
| **Feature: Certificación** | Implementar badge/certificación de sostenibilidad. Lógica de clasificación por percentiles (A: <p25, B: p25-p50, etc.). Permitir variantes por tarea | Lógica de clasificación funcional, página pública con modelos certificados, badges visuales | 1 semana |
| **Motor IA & Recomendación** | Implementar algoritmo de recomendación multi-criterio. Análisis de restricciones técnicas (latencia, presupuesto, carbono). Sistema de explicabilidad | Algoritmo de scoring que combina criterios, explicación clara de por qué se recomienda cada modelo, ranking dinámico según restricciones | 2-3 semanas |
| **Validación Cruzada** | Comparar cálculos de tu herramienta con ML CO2 Impact, CodeCarbon, DeepGreen. Testear con modelos reales en diferentes regiones | Informe de validación, margen de error documentado, ajustes en fórmulas si es necesario | 1-2 semanas |
| **Testing & UX** | Testear con usuarios potenciales (desarrolladores, investigadores). Recolectar feedback. Ajustar interfaces | Feedback recolectado, lista de mejoras priorizadas, interfaces refinadas | 1 semana |
| **Documentación Final** | Preparar memoria académica completa, presentación de defensa, documentación técnica del código | Memoria completa (50-80 pgs aprox), presentación visual, código documentado y comentado, guía de uso | 2-3 semanas |

**Nota:** Los tiempos son aproximados y pueden variar según complejidad técnica elegida. Se recomienda hacer iteraciones cortas y validar con tutora frecuentemente. Las fases de investigación y recopilación de datos son críticas para la precisión del proyecto.

---

## Resumen Ejecutivo

Este proyecto es una **convergencia entre necesidad social (sostenibilidad) y oportunidad técnica (localización geográfica)**. El diferenciador clave es que integra datos reales de mix energético por región, permitiendo que un desarrollador en Madrid tenga una recomendación diferente a uno en Dublín.

**Puntos fuertes:**
- ✅ Novedad y diferenciación clara
- ✅ Impacto potencial real (empresas pueden usarlo)
- ✅ Viable en tiempo de TFG (no es investigación pura)
- ✅ Extensible (permite futuras mejoras)
- ✅ Educativo (enseña sobre sostenibilidad en IA)

**Próximos pasos:** Validar con tutora, empezar fase de investigación, identificar fuentes de datos confiables.

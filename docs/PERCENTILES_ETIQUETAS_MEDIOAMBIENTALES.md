# 🏷️ DEFINICIÓN DE PERCENTILES PARA ETIQUETAS MEDIOAMBIENTALES

**Documento**: Sistema de clasificación medioambiental para modelos de IA  
**Fecha**: 2026-02-22  
**Autor**: Sistema de análisis de emisiones TFG  
**Basado en**: 426,000 combinaciones de escenarios calculados

---

## 📋 RESUMEN EJECUTIVO

Este documento define los umbrales de percentiles para las etiquetas de eficiencia medioambiental de modelos de IA, inspiradas en el etiquetado energético de la UE para electrodomésticos. Los umbrales se han calculado a partir de un análisis exhaustivo de 426,000 combinaciones de:

- **10 modelos de IA** (desde BERT hasta GPT-4 y PaLM 2)
- **71 data centers** (Google Cloud, AWS, Azure, Deep Green)
- **20 dispositivos cliente** (smartphones, laptops, desktops, edge devices)
- **5 tipos de red** (WiFi, 4G, 5G, Fiber, Satellite)
- **6 tipos de petición** (chat simple, generación larga, código, etc.)

---

## 📊 DISTRIBUCIÓN ESTADÍSTICA OBSERVADA

### Percentiles de Emisiones (gCO2/query)

| Percentil | Valor (gCO2) | Interpretación |
|-----------|--------------|----------------|
| P0 (Min)  | 0.000076     | Caso más eficiente |
| P5        | 0.000164     | Ultra eficiente |
| P10       | 0.000303     | Muy eficiente |
| P20       | 0.001036     | Eficiente |
| P30       | 0.001969     | Moderadamente eficiente |
| P40       | 0.003674     | Ligeramente eficiente |
| **P50 (Mediana)** | **0.006326** | **Referencia** |
| P60       | 0.013090     | Ligeramente alto |
| P70       | 0.023881     | Alto |
| P80       | 0.042188     | Muy alto |
| P90       | 0.102343     | Extremo |
| P95       | 0.198659     | Muy extremo |
| P99       | 0.579410     | Outlier |
| P100 (Max)| 1.072966     | Peor caso |

### Estadísticas Globales

| Métrica | Valor |
|---------|-------|
| Media | 0.039427 gCO2 |
| Mediana | 0.006326 gCO2 |
| Desviación estándar | 0.094173 gCO2 |
| Coef. de variación | 239% |

> **Nota**: La alta desviación estándar y coeficiente de variación indican una distribución muy sesgada, donde la mayoría de escenarios son eficientes pero existe una "cola larga" de casos muy ineficientes.

---

## 🏷️ SISTEMA DE ETIQUETAS PROPUESTO

> **✅ OPCIÓN SELECCIONADA: Opción B (Sistema europeo A+++ a F)**

### Opción A: Sistema de 6 Clases (A-F) - *No seleccionada*

Basado en percentiles de la distribución observada:

| Etiqueta | Rango (gCO2/query) | Percentil | Color | Descripción |
|----------|-------------------|-----------|-------|-------------|
| **A** | < 0.000303 | P0-P10 | 🟢 Verde oscuro | Muy eficiente |
| **B** | 0.000303 - 0.001969 | P10-P30 | 🟢 Verde | Eficiente |
| **C** | 0.001969 - 0.006326 | P30-P50 | 🟡 Amarillo | Moderado |
| **D** | 0.006326 - 0.023881 | P50-P70 | 🟠 Naranja | Alto |
| **E** | 0.023881 - 0.102343 | P70-P90 | 🔴 Rojo claro | Muy alto |
| **F** | ≥ 0.102343 | P90+ | 🔴 Rojo | Extremo |

### Opción B: Sistema de 9 Clases con A+++ - **✅ SELECCIONADA**

Para alinearse con el etiquetado europeo de electrodomésticos. Umbrales basados en percentiles exactos de las 426,000 combinaciones:

| Etiqueta | Rango (gCO2/query) | Percentil | Descripción |
|----------|-------------------|-----------|-------------|
| **A+++** | < 0.000105 | P0-P2 | 🌟 Excepcional |
| **A++**  | 0.000105 - 0.000303 | P2-P10 | 🟢 Excelente |
| **A+**   | 0.000303 - 0.001036 | P10-P20 | 🟢 Muy bueno |
| **A**    | 0.001036 - 0.001969 | P20-P30 | 🟢 Bueno |
| **B**    | 0.001969 - 0.006326 | P30-P50 | 🟡 Aceptable |
| **C**    | 0.006326 - 0.023881 | P50-P70 | 🟡 Mejorable |
| **D**    | 0.023881 - 0.102343 | P70-P90 | 🟠 Ineficiente |
| **E**    | 0.102343 - 0.251990 | P90-P97 | 🔴 Muy ineficiente |
| **F**    | ≥ 0.251990 | P97+ | 🔴 No recomendado |

---

## 📈 UMBRALES POR TIPO DE USO

Dado que diferentes tipos de petición tienen distribuciones distintas, se proponen umbrales específicos:

### Para Peticiones de Chat Simple (tokens típicos: 70+215)

| Etiqueta | Rango (gCO2) | Ejemplos de escenarios |
|----------|--------------|------------------------|
| A | < 0.002 | BERT/ViT + NPU + WiFi |
| B | 0.002 - 0.008 | Mistral-7B + cualquier red |
| C | 0.008 - 0.020 | Llama 2 70B + DC eficiente |
| D | 0.020 - 0.050 | GPT-4 + DC medio |
| E | 0.050 - 0.150 | Claude-2 + DC promedio |
| F | ≥ 0.150 | PaLM 2 + DC alto carbono |

### Para Generación de Código (tokens típicos: 100+300)

| Etiqueta | Rango (gCO2) | Notas |
|----------|--------------|-------|
| A | < 0.005 | Modelos pequeños optimizados |
| B | 0.005 - 0.015 | Mistral/Llama en DC verde |
| C | 0.015 - 0.040 | GPT-4 en DC eficiente |
| D | 0.040 - 0.100 | Modelos grandes, DC medio |
| E | 0.100 - 0.250 | Claude-2, PaLM 2 |
| F | ≥ 0.250 | Peores combinaciones |

### Para Generación de Texto Largo (tokens típicos: 50+2048)

| Etiqueta | Rango (gCO2) | Notas |
|----------|--------------|-------|
| A | < 0.020 | Excepcional |
| B | 0.020 - 0.050 | Muy eficiente |
| C | 0.050 - 0.120 | Bueno |
| D | 0.120 - 0.300 | Aceptable |
| E | 0.300 - 0.500 | Ineficiente |
| F | ≥ 0.500 | Muy ineficiente |

---

## 🔬 DESGLOSE POR COMPONENTE

Los datos muestran la siguiente contribución promedio por componente:

| Componente | Contribución Media |
|------------|-------------------|
| **Data Center** | 42.8% |
| **Red de transmisión** | 34.1% |
| **Dispositivo cliente** | 23.1% |

### Implicaciones para la clasificación

1. **El Data Center es el factor más determinante**: La elección del proveedor cloud y la región geográfica tiene el mayor impacto.

2. **La red importa más de lo esperado**: El tipo de conexión (WiFi vs 4G vs Satélite) puede duplicar las emisiones.

3. **El dispositivo tiene impacto moderado**: Aunque NPU > CPU > GPU en eficiencia, el efecto es menor que DC y red.

---

## 📱 EMISIONES POR MODELO DE IA

### Ranking de Eficiencia (menor = mejor)

| Posición | Modelo | Media (gCO2) | Clasificación Típica |
|----------|--------|--------------|---------------------|
| 1 | BERT Base | 0.000796 | **A** |
| 2 | ViT Base | 0.000853 | **A** |
| 3 | Mistral 7B | 0.007706 | **C-D** |
| 4 | Llama 2 70B | 0.022160 | **D** |
| 5 | GPT-4 | 0.027947 | **D-E** |
| 6 | Falcon 40B | 0.028697 | **D-E** |
| 7 | MPT 30B | 0.029979 | **D-E** |
| 8 | OPT 175B | 0.034625 | **D-E** |
| 9 | Claude 2 | 0.067086 | **E** |
| 10 | PaLM 2 | 0.174418 | **F** |

### Observaciones

- **Modelos especializados** (BERT, ViT) son ~100x más eficientes que modelos generativos grandes
- **Llama 2 y Mistral** ofrecen el mejor balance eficiencia/capacidad para LLMs
- **GPT-4** tiene eficiencia similar a Llama 2 70B (sorprendente dado su tamaño estimado)
- **PaLM 2** es el menos eficiente por su alta energía por token

---

## 🌍 EMISIONES POR DATA CENTER

### Top 5 Más Eficientes

| Data Center | Región | CI Estimado | Impacto |
|-------------|--------|-------------|---------|
| Deep Green UK | Exmouth | ~50 gCO2/kWh | ✅ Mínimo |
| GCP us-west1 | Oregon | ~77 gCO2/kWh | ✅ Bajo |
| AWS eu-north-1 | Estocolmo | ~40 gCO2/kWh | ✅ Bajo |
| GCP europe-north1 | Finlandia | ~70 gCO2/kWh | ✅ Bajo |
| Azure swedencentral | Suecia | ~40 gCO2/kWh | ✅ Bajo |

### Factores de Penalización por Región

Para ajustar la clasificación según la región del DC:

| Tipo de Región | Factor | Ajuste |
|----------------|--------|--------|
| Nórdicos (NO, SE, FI) | 0.8x | +1 clase |
| Europa Verde (FR, ES) | 0.9x | - |
| USA Verde (OR, CA) | 0.9x | - |
| Europa Central (DE, NL) | 1.0x | Base |
| USA Este (VA, OH) | 1.2x | -1 clase |
| Asia (SG, JP) | 1.3x | -1 clase |
| Alto Carbono (CN, IN, PL) | 1.5x | -2 clases |

---

## 🖥️ EMISIONES POR DISPOSITIVO

### Ranking de Eficiencia

| Categoría | Dispositivos | Impacto Relativo |
|-----------|--------------|------------------|
| **Más eficientes** | iPhone 15 Pro, Pixel 8 Pro, tablets | ~0.025 gCO2 |
| **Eficientes** | MacBook Air M3, smartphones budget | ~0.026 gCO2 |
| **Moderados** | ThinkPad X1, Desktop oficina | ~0.026-0.027 gCO2 |
| **Ineficientes** | Laptop budget, Raspberry Pi 5 | ~0.027-0.028 gCO2 |
| **Muy ineficientes** | Jetson Orin, MacBook Pro M3 Max | ~0.032-0.035 gCO2 |

### Consideraciones sobre Procesadores

| Procesador | Eficiencia | Caso de Uso Recomendado |
|------------|------------|------------------------|
| **NPU** | Alta | Modelos pequeños optimizados |
| **CPU** | Media | Modelos medianos, uso general |
| **GPU** | Baja | Modelos grandes, baja latencia necesaria |

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### Código para Asignar Etiqueta

```python
def get_environmental_label(co2_grams: float, request_type: str = "general") -> dict:
    """
    Asigna una etiqueta medioambiental basada en las emisiones de CO2.
    
    Args:
        co2_grams: Emisiones en gramos de CO2
        request_type: Tipo de petición (general, chat_simple, code_generation, generation_long)
    
    Returns:
        dict con label, description, color, percentile
    """
    
    # Umbrales para tipo general (basados en análisis de 426,000 combinaciones)
    thresholds = {
        "general": {
            "A": 0.000303,    # P10
            "B": 0.001969,    # P30
            "C": 0.006326,    # P50
            "D": 0.023881,    # P70
            "E": 0.102343,    # P90
            "F": float('inf')
        },
        "chat_simple": {
            "A": 0.002, "B": 0.008, "C": 0.020, "D": 0.050, "E": 0.150, "F": float('inf')
        },
        "code_generation": {
            "A": 0.005, "B": 0.015, "C": 0.040, "D": 0.100, "E": 0.250, "F": float('inf')
        },
        "generation_long": {
            "A": 0.020, "B": 0.050, "C": 0.120, "D": 0.300, "E": 0.500, "F": float('inf')
        }
    }
    
    colors = {
        "A": "#2D5016",  # Verde oscuro
        "B": "#4CAF50",  # Verde
        "C": "#FFC107",  # Amarillo
        "D": "#FF9800",  # Naranja
        "E": "#F44336",  # Rojo claro
        "F": "#B71C1C"   # Rojo oscuro
    }
    
    descriptions = {
        "A": "Muy eficiente",
        "B": "Eficiente",
        "C": "Moderado",
        "D": "Alto impacto",
        "E": "Muy alto impacto",
        "F": "Impacto extremo"
    }
    
    # Usar umbrales específicos o generales
    req_thresholds = thresholds.get(request_type, thresholds["general"])
    
    # Determinar etiqueta
    for label, threshold in req_thresholds.items():
        if co2_grams < threshold:
            return {
                "label": label,
                "description": descriptions[label],
                "color": colors[label],
                "co2_grams": round(co2_grams, 6),
                "threshold_upper": threshold,
                "request_type": request_type
            }
    
    return {
        "label": "F",
        "description": descriptions["F"],
        "color": colors["F"],
        "co2_grams": round(co2_grams, 6),
        "threshold_upper": float('inf'),
        "request_type": request_type
    }


# Constantes para uso en la calculadora
ENVIRONMENTAL_THRESHOLDS = {
    # Basados en percentiles P10, P30, P50, P70, P90
    "general": {
        "A": {"max": 0.000303, "percentile": 10, "description": "Muy eficiente (Top 10%)"},
        "B": {"max": 0.001969, "percentile": 30, "description": "Eficiente (Top 30%)"},
        "C": {"max": 0.006326, "percentile": 50, "description": "Moderado (Mediana)"},
        "D": {"max": 0.023881, "percentile": 70, "description": "Alto (Top 70%)"},
        "E": {"max": 0.102343, "percentile": 90, "description": "Muy alto (Top 90%)"},
        "F": {"max": float('inf'), "percentile": 100, "description": "Extremo (Peor 10%)"}
    }
}
```

---

## 📈 VISUALIZACIÓN PROPUESTA

### Etiqueta de Eficiencia Estilo UE

```
╔════════════════════════════════════╗
║     🤖 GPT-4 + AWS EU-West        ║
║     Chat Simple (285 tokens)       ║
╠════════════════════════════════════╣
║  EFICIENCIA MEDIOAMBIENTAL         ║
║                                    ║
║  ████████████████░░░░░  [C]        ║
║                                    ║
║  A ████  < 0.0003 gCO2   Excelente ║
║  B ██████  0.0003-0.0015  Bueno    ║
║  C ████████► 0.0015-0.0044 ◄TU USO ║
║  D ██████████  0.0044-0.015        ║
║  E ████████████  0.015-0.077       ║
║  F ██████████████  > 0.077  Malo   ║
║                                    ║
║  📊 Tu emisión: 0.0032 gCO2        ║
║  📈 Percentil: 45%                 ║
║  🌳 Equivale a: 0.00014 g papel    ║
║                                    ║
╚════════════════════════════════════╝
```

---

## 🎯 RECOMENDACIONES DE USO

### Para el Frontend

1. **Mostrar siempre la etiqueta con código de color**
2. **Incluir el percentil** para dar contexto
3. **Ofrecer comparativas** con alternativas más eficientes
4. **Permitir filtrar por clase** en comparadores

### Para la Documentación del TFG

1. **Justificar los umbrales** con los datos estadísticos
2. **Explicar la metodología** de cálculo de percentiles
3. **Reconocer limitaciones** (modelos específicos, datos estimados)
4. **Proponer actualizaciones futuras** conforme se añadan modelos

### Para APIs/Exportaciones

```json
{
  "environmental_rating": {
    "label": "C",
    "score": 3.5,
    "percentile": 45,
    "co2_grams": 0.0032,
    "threshold_type": "chat_simple",
    "comparison": {
      "vs_best": "+960%",
      "vs_worst": "-95%",
      "vs_median": "-28%"
    }
  }
}
```

---

## 📚 REFERENCIAS Y METODOLOGÍA

### Fuentes de Datos

1. **Modelos**: Parámetros y energía por token calculados según fórmula 2N FLOPs
2. **Data Centers**: PUE y renovables de informes oficiales 2024-2025
3. **Carbon Intensity**: Electricity Maps API + fallbacks por zona
4. **Dispositivos**: TDP de especificaciones oficiales de fabricantes

### Parámetros del Análisis

- **Utilización**: 70% (valor típico para inferencia)
- **País usuario**: España (CI ~145 gCO2/kWh)
- **Red típica**: Mix de WiFi, 4G, 5G, Fiber
- **Tipos de petición**: 6 categorías representativas

### Limitaciones

1. Los valores son **estimaciones** basadas en modelos teóricos
2. No incluyen **entrenamiento** del modelo (solo inferencia)
3. La intensidad de carbono **varía en tiempo real**
4. Algunos modelos tienen **datos de energía calculados**, no medidos

---

## 🔄 PLAN DE ACTUALIZACIÓN

| Frecuencia | Acción |
|------------|--------|
| Mensual | Actualizar CI por zonas |
| Trimestral | Revisar umbrales si se añaden modelos |
| Anual | Recalcular percentiles completos |

---

**Documento generado automáticamente por el sistema de análisis de emisiones.**  
**Última actualización**: 2026-02-22

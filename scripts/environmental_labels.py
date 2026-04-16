#!/usr/bin/env python3
"""
Sistema de Etiquetas Medioambientales para Modelos de IA
========================================================

Este módulo define los umbrales y funciones para asignar etiquetas de
eficiencia medioambiental basadas en las emisiones de CO2 por query.

Los umbrales fueron calculados a partir de un análisis de 639,000 combinaciones
de modelos, data centers, dispositivos, redes y tipos de petición.

Sistema de etiquetado: Opción B - Escala europea A+++ a F (9 clases)

Uso:
    from environmental_labels import get_environmental_label, THRESHOLDS
    
    result = get_environmental_label(co2_grams=0.005)
    print(result['label'])  # 'B'
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class EnvironmentalClass(Enum):
    """Clases de eficiencia medioambiental - Escala europea A+++ a F (9 clases)"""
    A_PLUS_PLUS_PLUS = "A+++"  # Excepcional (P0-P2)
    A_PLUS_PLUS = "A++"       # Excelente (P2-P10)
    A_PLUS = "A+"             # Muy bueno (P10-P20)
    A = "A"                   # Bueno (P20-P30)
    B = "B"                   # Aceptable (P30-P50)
    C = "C"                   # Mejorable (P50-P70)
    D = "D"                   # Ineficiente (P70-P90)
    E = "E"                   # Muy ineficiente (P90-P97)
    F = "F"                   # No recomendado (P97+)


@dataclass
class LabelThreshold:
    """Define un umbral para una clase de eficiencia"""
    max_co2_g: float
    percentile_upper: int
    description: str
    color_hex: str
    emoji: str


# ============================================================================
# UMBRALES DE PERCENTILES - OPCIÓN B (Escala europea A+++ a F)
# ============================================================================

# Basados en análisis de 639,000 combinaciones (v4.0 — 15 LLMs)
# Percentiles: P2, P10, P20, P30, P50, P70, P90, P97

THRESHOLDS_GENERAL: Dict[str, LabelThreshold] = {
    "A+++": LabelThreshold(
        max_co2_g=0.000711,
        percentile_upper=2,
        description="Excepcional",
        color_hex="#1B5E20",
        emoji="🌟"
    ),
    "A++": LabelThreshold(
        max_co2_g=0.002052,
        percentile_upper=10,
        description="Excelente",
        color_hex="#2D5016",
        emoji="🟢"
    ),
    "A+": LabelThreshold(
        max_co2_g=0.003877,
        percentile_upper=20,
        description="Muy bueno",
        color_hex="#388E3C",
        emoji="🟢"
    ),
    "A": LabelThreshold(
        max_co2_g=0.006066,
        percentile_upper=30,
        description="Bueno",
        color_hex="#4CAF50",
        emoji="🟢"
    ),
    "B": LabelThreshold(
        max_co2_g=0.013359,
        percentile_upper=50,
        description="Aceptable",
        color_hex="#8BC34A",
        emoji="🟡"
    ),
    "C": LabelThreshold(
        max_co2_g=0.032327,
        percentile_upper=70,
        description="Mejorable",
        color_hex="#FFC107",
        emoji="🟡"
    ),
    "D": LabelThreshold(
        max_co2_g=0.108598,
        percentile_upper=90,
        description="Ineficiente",
        color_hex="#FF9800",
        emoji="🟠"
    ),
    "E": LabelThreshold(
        max_co2_g=0.241226,
        percentile_upper=97,
        description="Muy ineficiente",
        color_hex="#F44336",
        emoji="🔴"
    ),
    "F": LabelThreshold(
        max_co2_g=float('inf'),
        percentile_upper=100,
        description="No recomendado",
        color_hex="#B71C1C",
        emoji="🔴"
    )
}

# Umbrales específicos por tipo de petición
THRESHOLDS_BY_REQUEST_TYPE: Dict[str, Dict[str, float]] = {
    "chat_simple": {
        "A": 0.004228,
        "B": 0.007965,
        "C": 0.017661,
        "D": 0.050416,
        "E": 0.083804,
        "F": float('inf')
    },
    "chat_extended": {
        "A": 0.009837,
        "B": 0.019189,
        "C": 0.044431,
        "D": 0.124572,
        "E": 0.204833,
        "F": float('inf')
    },
    "generation_short": {
        "A": 0.001622,
        "B": 0.002725,
        "C": 0.005511,
        "D": 0.015426,
        "E": 0.025522,
        "F": float('inf')
    },
    "generation_long": {
        "A": 0.026857,
        "B": 0.050241,
        "C": 0.118836,
        "D": 0.336546,
        "E": 0.624827,
        "F": float('inf')
    },
    "code_generation": {
        "A": 0.005722,
        "B": 0.010970,
        "C": 0.024650,
        "D": 0.070460,
        "E": 0.117227,
        "F": float('inf')
    },
    "summarization": {
        "A": 0.009755,
        "B": 0.019031,
        "C": 0.044419,
        "D": 0.122715,
        "E": 0.197554,
        "F": float('inf')
    }
}

# Estadísticas de referencia del análisis
REFERENCE_STATISTICS = {
    "sample_size": 639000,
    "analysis_version": "v4.0 — 15 LLMs",
    "percentiles": {
        "p0_min": 0.000118,
        "p2": 0.000711,
        "p5": 0.001239,
        "p10": 0.002052,
        "p20": 0.003877,
        "p30": 0.006066,
        "p40": 0.009016,
        "p50_median": 0.013359,
        "p60": 0.020521,
        "p70": 0.032327,
        "p80": 0.054113,
        "p90": 0.108598,
        "p95": 0.179234,
        "p97": 0.241226,
        "p99": 0.471856,
        "p100_max": 1.518459
    },
    "mean": 0.043043,
    "std_dev": 0.087758,
    "component_contribution": {
        "device_pct": 10.8,
        "network_pct": 14.3,
        "datacenter_pct": 74.9
    }
}

# Orden de etiquetas para la escala europea A+++ a F
LABEL_ORDER = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F"]


# ============================================================================
# FUNCIONES PRINCIPALES
# ============================================================================

def get_environmental_label(
    co2_grams: float,
    request_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Asigna una etiqueta de eficiencia medioambiental basada en emisiones CO2.
    
    Args:
        co2_grams: Emisiones en gramos de CO2 por query
        request_type: Tipo de petición para umbrales específicos.
                     Si es None, usa umbrales generales.
    
    Returns:
        Dict con:
            - label: Clasificación (A+++ a F)
            - description: Descripción en español
            - color_hex: Color hexadecimal para UI
            - emoji: Emoji representativo
            - co2_grams: Valor de entrada
            - threshold_max: Umbral máximo de la clase
            - percentile: Percentil aproximado
            - request_type: Tipo de petición usado
    
    Examples:
        >>> get_environmental_label(0.0005)['label']
        'A+++'
        >>> get_environmental_label(0.015)['label']
        'C'
        >>> get_environmental_label(0.003, request_type="chat_simple")['label']
        'A'
    """
    # Lista ordenada de clases (Opción B: escala europea)
    LABEL_ORDER = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F"]
    
    # Determinar qué umbrales usar
    if request_type and request_type in THRESHOLDS_BY_REQUEST_TYPE:
        thresholds = THRESHOLDS_BY_REQUEST_TYPE[request_type]
        use_general = False
        # Los umbrales por tipo de petición solo tienen A-F
        labels_to_check = ["A", "B", "C", "D", "E", "F"]
    else:
        thresholds = {k: v.max_co2_g for k, v in THRESHOLDS_GENERAL.items()}
        use_general = True
        labels_to_check = LABEL_ORDER
    
    # Encontrar la clase correspondiente
    for label in labels_to_check:
        if co2_grams < thresholds[label]:
            if use_general:
                threshold_info = THRESHOLDS_GENERAL[label]
                return {
                    "label": label,
                    "description": threshold_info.description,
                    "color_hex": threshold_info.color_hex,
                    "emoji": threshold_info.emoji,
                    "co2_grams": round(co2_grams, 6),
                    "threshold_max": threshold_info.max_co2_g,
                    "percentile": threshold_info.percentile_upper,
                    "request_type": request_type or "general"
                }
            else:
                # Usar valores genéricos para umbrales específicos por request_type
                # Mapear A del request_type a la clase general correspondiente
                general_info = THRESHOLDS_GENERAL.get(label, THRESHOLDS_GENERAL["A"])
                return {
                    "label": label,
                    "description": general_info.description,
                    "color_hex": general_info.color_hex,
                    "emoji": general_info.emoji,
                    "co2_grams": round(co2_grams, 6),
                    "threshold_max": thresholds[label],
                    "percentile": general_info.percentile_upper,
                    "request_type": request_type
                }
    
    # Si no matchea ninguno (no debería ocurrir), devolver F
    info = THRESHOLDS_GENERAL["F"]
    return {
        "label": "F",
        "description": info.description,
        "color_hex": info.color_hex,
        "emoji": info.emoji,
        "co2_grams": round(co2_grams, 6),
        "threshold_max": float('inf'),
        "percentile": 100,
        "request_type": request_type or "general"
    }


def get_percentile(co2_grams: float) -> float:
    """
    Estima el percentil de una emisión basándose en la distribución conocida.
    
    Args:
        co2_grams: Emisiones en gramos de CO2
    
    Returns:
        Percentil estimado (0-100)

    Examples:
        >>> get_percentile(0.013359)
        50.0
        >>> 20 < get_percentile(0.005) < 30
        True
    """
    percentiles = REFERENCE_STATISTICS["percentiles"]
    
    # Lista de (percentil, valor)
    breakpoints = [
        (0, percentiles["p0_min"]),
        (5, percentiles["p5"]),
        (10, percentiles["p10"]),
        (20, percentiles["p20"]),
        (30, percentiles["p30"]),
        (40, percentiles["p40"]),
        (50, percentiles["p50_median"]),
        (60, percentiles["p60"]),
        (70, percentiles["p70"]),
        (80, percentiles["p80"]),
        (90, percentiles["p90"]),
        (95, percentiles["p95"]),
        (99, percentiles["p99"]),
        (100, percentiles["p100_max"])
    ]
    
    # Interpolación lineal
    for i in range(len(breakpoints) - 1):
        p1, v1 = breakpoints[i]
        p2, v2 = breakpoints[i + 1]
        
        if v1 <= co2_grams < v2:
            # Interpolación lineal entre los dos percentiles
            if v2 - v1 == 0:
                return p1
            ratio = (co2_grams - v1) / (v2 - v1)
            return p1 + ratio * (p2 - p1)
    
    # Si es mayor que el máximo
    if co2_grams >= breakpoints[-1][1]:
        return 100.0
    
    return 0.0


def compare_to_reference(co2_grams: float) -> Dict[str, Any]:
    """
    Compara una emisión con las estadísticas de referencia.
    
    Args:
        co2_grams: Emisiones en gramos de CO2
    
    Returns:
        Dict con comparaciones vs media, mediana, mejor y peor caso
    """
    stats = REFERENCE_STATISTICS
    
    mean = stats["mean"]
    median = stats["percentiles"]["p50_median"]
    best = stats["percentiles"]["p0_min"]
    worst = stats["percentiles"]["p100_max"]
    
    return {
        "input_co2_grams": round(co2_grams, 6),
        "estimated_percentile": round(get_percentile(co2_grams), 1),
        "vs_mean": {
            "difference_grams": round(co2_grams - mean, 6),
            "ratio": round(co2_grams / mean, 2) if mean > 0 else None,
            "percent_difference": round((co2_grams - mean) / mean * 100, 1) if mean > 0 else None
        },
        "vs_median": {
            "difference_grams": round(co2_grams - median, 6),
            "ratio": round(co2_grams / median, 2) if median > 0 else None,
            "percent_difference": round((co2_grams - median) / median * 100, 1) if median > 0 else None
        },
        "vs_best": {
            "difference_grams": round(co2_grams - best, 6),
            "ratio": round(co2_grams / best, 2) if best > 0 else None
        },
        "vs_worst": {
            "difference_grams": round(co2_grams - worst, 6),
            "ratio": round(co2_grams / worst, 2) if worst > 0 else None
        },
        "reference_stats": {
            "mean": mean,
            "median": median,
            "best": best,
            "worst": worst
        }
    }


def get_label_scale() -> Dict[str, Dict[str, Any]]:
    """
    Devuelve la escala completa de etiquetas para mostrar en UI.
    
    Returns:
        Dict con información de cada clase (A+++ a F)

    Examples:
        >>> scale = get_label_scale()
        >>> len(scale)
        9
        >>> scale['A+++']['description']
        'Excepcional'
    """
    LABEL_ORDER = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F"]
    scale = {}
    prev_max = 0.0
    prev_percentile = 0
    
    for label in LABEL_ORDER:
        threshold = THRESHOLDS_GENERAL[label]
        scale[label] = {
            "label": label,
            "min_co2_g": prev_max,
            "max_co2_g": threshold.max_co2_g,
            "description": threshold.description,
            "color_hex": threshold.color_hex,
            "emoji": threshold.emoji,
            "percentile_range": f"P{prev_percentile}-P{threshold.percentile_upper}"
        }
        prev_max = threshold.max_co2_g
        prev_percentile = threshold.percentile_upper
    
    return scale


def format_label_for_display(result: Dict[str, Any]) -> str:
    """
    Formatea el resultado de get_environmental_label para mostrar en consola.
    
    Args:
        result: Resultado de get_environmental_label()
    
    Returns:
        String formateado para display
    """
    return (
        f"{result['emoji']} Clase {result['label']}: {result['description']}\n"
        f"   CO2: {result['co2_grams']:.6f} gCO2/query\n"
        f"   Percentil: ~{result['percentile']}%\n"
        f"   Umbral máximo: {result['threshold_max']:.6f} gCO2"
    )


# ============================================================================
# DEMO
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("SISTEMA DE ETIQUETAS MEDIOAMBIENTALES - DEMO")
    print("Opción B: Escala europea A+++ a F (9 clases)")
    print("=" * 60)
    
    # Ejemplos de uso - valores que prueban cada clase
    test_values = [
        0.0005,    # A+++ (< P2)
        0.002,     # A++  (P2-P10)
        0.004,     # A+   (P10-P20)
        0.007,     # A    (P20-P30)
        0.015,     # B    (P30-P50)
        0.040,     # C    (P50-P70)
        0.12,      # D    (P70-P90)
        0.25,      # E    (P90-P97)
        0.5        # F    (P97+)
    ]
    
    print("\n--- Clasificación General ---\n")
    for co2 in test_values:
        result = get_environmental_label(co2)
        print(format_label_for_display(result))
        print()
    
    print("\n--- Con Tipo de Petición Específico ---\n")
    test_cases = [
        (0.003, "chat_simple"),
        (0.003, "generation_long"),
        (0.015, "code_generation")
    ]
    
    for co2, req_type in test_cases:
        result = get_environmental_label(co2, request_type=req_type)
        print(f"CO2: {co2} gCO2, Tipo: {req_type}")
        print(f"  -> {result['emoji']} Clase {result['label']} ({result['description']})")
        print()
    
    print("\n--- Escala Completa ---\n")
    scale = get_label_scale()
    for label, info in scale.items():
        max_str = f"{info['max_co2_g']:.4f}" if info['max_co2_g'] != float('inf') else "∞"
        print(f"  {info['emoji']} {label}: {info['min_co2_g']:.4f} - {max_str} gCO2 ({info['description']})")
    
    print("\n--- Comparación con Referencia ---\n")
    comparison = compare_to_reference(0.01)
    print(f"CO2: {comparison['input_co2_grams']} gCO2")
    print(f"Percentil estimado: {comparison['estimated_percentile']}%")
    print(f"vs Media: {comparison['vs_mean']['percent_difference']:+.1f}%")
    print(f"vs Mediana: {comparison['vs_median']['percent_difference']:+.1f}%")

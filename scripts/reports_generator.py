#!/usr/bin/env python3
"""
Generador de Reportes y Visualizaciones
========================================

Transforma EmissionResult en reportes JSON listos para visualización:
- Pie charts (breakdown porcentual)
- Tablas comparativas (múltiples escenarios)
- Etiquetas energéticas (A+++/A++/A/B/C/etc.)
- Equivalencias intuitivas (árboles, vuelos, km en coche)
- Tablas por región geográfica

Versión: 1.0 (Marzo 2026)
"""

import pandas as pd
import json
from dataclasses import dataclass
from typing import Dict, List, Any, Optional
from datetime import datetime


@dataclass
class BreakdownData:
    """Datos estructurados para pie chart"""
    device_pct: float
    network_pct: float
    datacenter_pct: float
    device_gco2: float
    network_gco2: float
    datacenter_gco2: float
    total_gco2: float
    timestamp: str


class ReportGenerator:
    """
    Genera reportes profesionales a partir de EmissionResult
    
    Uso básico:
        generator = ReportGenerator()
        breakdown = generator.generate_breakdown_data(result)
        print(json.dumps(breakdown.__dict__, indent=2))
    """
    
    def __init__(self, models_df: Optional[pd.DataFrame] = None):
        """
        Inicializa el generador de reportes.
        
        Args:
            models_df: DataFrame de modelos para comparativas y benchmarking (opcional)
        """
        self.models_df = models_df
        self.timestamp = datetime.now().isoformat()
        
        # Umbrales para etiquetas energéticas (percentiles)
        self.efficiency_thresholds = {
            "A+++": 0.4,   # Top 10% más eficientes
            "A++":  0.6,   # 10-20%
            "A+":   0.8,   # 20-30%
            "A":    1.0,   # 30-40%
            "B":    1.3,   # 40-60%
            "C":    1.7,   # 60-75%
            "D":    2.2,   # 75-90%
            "E":    float('inf')  # 90-100%
        }
        
        # Factores de equivalencia
        self.equivalencies = {
            "tree_kg_co2_per_year": 22.5,           # 1 árbol absorbe 22.5 kg CO2/año
            "transatlantic_flight_kg_co2": 700,     # 1 vuelo ~700 kg
            "car_annual_kg_co2": 474,               # 1 coche/año ~474 kg
            "household_annual_kwh": 8760,           # Hogar promedio ~8.76 MWh/año
            "household_annual_kg_co2": 4380         # ~4.38 toneladas CO2/año promedio
        }
    
    def generate_breakdown_data(self, result: Any) -> Dict[str, Any]:
        """
        Genera datos para pie chart / breakdown porcentual.
        
        Args:
            result: EmissionResult de la calculadora
            
        Returns:
            Dict con estructura lista para visualización
        """
        total = result.co2_total_g
        
        return {
            "breakdown": {
                "device_pct": round(result.co2_device_g / total * 100, 1),
                "network_pct": round(result.co2_network_g / total * 100, 1),
                "datacenter_pct": round(result.co2_datacenter_g / total * 100, 1),
            },
            "breakdown_gco2": {
                "device": round(result.co2_device_g, 4),
                "network": round(result.co2_network_g, 4),
                "datacenter": round(result.co2_datacenter_g, 4),
                "total": round(result.co2_total_g, 4),
            },
            "energy_breakdown_wh": {
                "device": round(result.energy_device_wh, 6),
                "network": round(result.energy_network_wh, 6),
                "datacenter": round(result.energy_datacenter_wh, 6),
                "total": round(result.energy_total_wh, 6),
            },
            "metadata": {
                "model": result.model_name,
                "device": result.device_name,
                "datacenter": result.data_center_name,
                "network_type": result.network_type,
                "inference_time_sec": round(result.inference_time_sec, 3),
                "tokens_processed": result.tokens_processed
            },
            "timestamp": self.timestamp,
            "chart_colors": ["#FF6B6B", "#4ECDC4", "#45B7D1"]  # Para Plotly/Chart.js
        }
    
    def generate_comparative_table(self, results: List[Any]) -> Dict[str, Any]:
        """
        Genera tabla comparativa de múltiples escenarios.
        
        Args:
            results: Lista de EmissionResult para comparar
            
        Returns:
            Dict con tabla comparativa y análisis
        """
        # Build a lookup from models_df for extra metadata
        model_meta = {}
        if self.models_df is not None:
            for _, mrow in self.models_df.iterrows():
                model_meta[mrow.get("model_name", "")] = {
                    "organization": mrow.get("organization", ""),
                    "tokens_per_second": float(mrow["tokens_per_second"]) if pd.notna(mrow.get("tokens_per_second")) else None,
                    "latency_ms_per_token": float(mrow["latency_ms_per_token"]) if pd.notna(mrow.get("latency_ms_per_token")) else None,
                    "num_parameters": float(mrow["num_parameters"]) if pd.notna(mrow.get("num_parameters")) else None,
                }

        rows = []
        for r in results:
            meta = model_meta.get(r.model_name, {})
            rows.append({
                "model": r.model_name,
                "organization": meta.get("organization", ""),
                "data_center": r.data_center_name,
                "device": r.device_name,
                "co2_gCO2": round(r.co2_total_g, 4),
                "energy_Wh": round(r.energy_total_wh, 6),
                "renewable_pct": round(r.dc_renewable_grid_pct or 0, 1) if r.dc_renewable_grid_pct else None,
                "carbon_intensity": round(r.dc_carbon_intensity or 0, 1) if r.dc_carbon_intensity else None,
                "inference_time_sec": round(r.inference_time_sec, 3),
                "tokens_processed": r.tokens_processed,
                "tokens_per_second": meta.get("tokens_per_second"),
                "latency_ms_per_token": meta.get("latency_ms_per_token"),
                "num_parameters": meta.get("num_parameters"),
            })
        
        df = pd.DataFrame(rows)
        
        if len(df) == 0:
            return {"error": "No hay datos para comparar"}
        
        # Calcular diferencias vs. el primero
        baseline_co2 = df.iloc[0]['co2_gCO2']
        df['delta_vs_baseline_gCO2'] = df['co2_gCO2'] - baseline_co2
        df['delta_pct'] = ((df['co2_gCO2'] / baseline_co2 - 1) * 100).round(1)
        
        # Reemplazar NaN por None para JSON serializable
        df = df.where(pd.notnull(df), None)
        
        return {
            "comparative_table": df.to_dict(orient='records'),
            "summary": {
                "best_option": df.loc[df['co2_gCO2'].idxmin()].to_dict(),
                "worst_option": df.loc[df['co2_gCO2'].idxmax()].to_dict(),
                "avg_co2": round(df['co2_gCO2'].mean(), 4),
                "max_savings_vs_worst": {
                    "gco2": round(df['co2_gCO2'].max() - df['co2_gCO2'].min(), 4),
                    "pct": round((df['co2_gCO2'].max() / df['co2_gCO2'].min() - 1) * 100, 1)
                },
                "range": {
                    "min": round(df['co2_gCO2'].min(), 4),
                    "max": round(df['co2_gCO2'].max(), 4),
                    "spread": round(df['co2_gCO2'].max() - df['co2_gCO2'].min(), 4)
                },
                "count": len(df)
            },
            "timestamp": self.timestamp
        }
    
    def generate_energy_label(self, result: Any, benchmark_avg: Optional[float] = None) -> Dict[str, Any]:
        """
        Genera etiqueta energética estilo EU Energy Label.
        
        Args:
            result: EmissionResult
            benchmark_avg: Valor promedio para comparación (ej: promedio de 10 modelos).
                          Si None, se asume como benchmark.
            
        Returns:
            Dict con clasificación de eficiencia (A+++/A++/etc.)
        """
        if benchmark_avg is None:
            benchmark_avg = result.energy_total_wh  # Sin comparación
        
        # Calcular ratio de eficiencia
        efficiency_ratio = result.energy_total_wh / benchmark_avg
        
        # Asignar clase
        energy_class = "E"
        rating = 1.0
        
        n_classes = len(self.efficiency_thresholds)  # 8 clases
        step = 4.0 / (n_classes - 1)  # 4.0 / 7 ≈ 0.571 → A+++ = 5.0, E = 1.0
        for class_name, threshold in self.efficiency_thresholds.items():
            if efficiency_ratio < threshold:
                energy_class = class_name
                # Calcular rating (5.0 = A+++, 1.0 = E)
                idx = list(self.efficiency_thresholds.keys()).index(class_name)
                rating = round(max(1.0, 5.0 - idx * step), 1)
                break
        
        return {
            "energy_label": {
                "class": energy_class,
                "rating": round(rating, 1),
                "emissions_gCO2": round(result.co2_total_g, 4),
                "energy_Wh": round(result.energy_total_wh, 6),
                "renewable_pct": float(result.dc_renewable_grid_pct) if result.dc_renewable_grid_pct else None,
                "efficiency_vs_benchmark": {
                    "ratio": round(efficiency_ratio, 2),
                    "interpretation": "Más eficiente" if efficiency_ratio < 1 else "Menos eficiente",
                    "benchmark_avg_wh": round(benchmark_avg, 6)
                }
            },
            "metadata": {
                "model": result.model_name,
                "datacenter": result.data_center_name,
                "timestamp": self.timestamp
            }
        }
    
    def generate_equivalencies(self, co2_grams: float, scale: int = 1) -> Dict[str, Any]:
        """
        Convierte emisiones en equivalencias intuitivas.
        
        Args:
            co2_grams: Gramos de CO2 por query
            scale: Número de queries sobre el que calcular las equivalencias.
                   Por defecto 1 (query individual), pero las equivalencias de
                   una sola query son tan pequeñas que se recomienda usar 1000
                   o 1_000_000 para que sean significativas.
            
        Returns:
            Dict con equivalencias escaladas a `scale` queries
        """
        co2_kg_per_query = co2_grams / 1000
        co2_kg = co2_kg_per_query * scale
        
        def _fmt(value: float) -> float:
            """Elige la precisión adecuada según el orden de magnitud"""
            if value == 0:
                return 0.0
            if value >= 0.01:
                return round(value, 4)
            # Para valores muy pequeños usar notación científica como string
            return float(f"{value:.2e}")
        
        trees = co2_kg / self.equivalencies["tree_kg_co2_per_year"]
        flights = co2_kg / self.equivalencies["transatlantic_flight_kg_co2"]
        car_days = co2_kg / (self.equivalencies["car_annual_kg_co2"] / 365)
        household_pct = co2_kg / self.equivalencies["household_annual_kg_co2"] * 100
        
        return {
            "scale_queries": scale,
            "emissions_kg_co2": _fmt(co2_kg),
            "equivalencies": {
                "trees_needed": {
                    "value": _fmt(trees),
                    "unit": "árboles/año para absorber todo el CO2",
                    "interpretation": f"Equivalente a {_fmt(trees)} árboles (para {scale:,} queries)"
                },
                "transatlantic_flights": {
                    "value": _fmt(flights),
                    "unit": "vuelos transatlánticos",
                    "interpretation": f"Igual a {_fmt(flights)} vuelos NYC-LDN (para {scale:,} queries)"
                },
                "car_driving_days": {
                    "value": _fmt(car_days),
                    "unit": "días conduciendo un coche promedio",
                    "interpretation": f"Igual a {_fmt(car_days)} días de conducción (para {scale:,} queries)"
                },
                "household_annual_fraction": {
                    "value": _fmt(household_pct),
                    "unit": "% de emisiones anuales de un hogar promedio",
                    "interpretation": f"{_fmt(household_pct)}% de la huella de un hogar/año (para {scale:,} queries)"
                }
            },
            "timestamp": self.timestamp
        }
    
    def generate_regional_impact(self, result: Any, dc_list: pd.DataFrame) -> Dict[str, Any]:
        """
        Muestra cómo cambia el impacto si usas el modelo en diferentes regiones.
        
        Args:
            result: EmissionResult original
            dc_list: DataFrame con lista de data centers
            
        Returns:
            Dict con tabla de impacto por región
        """
        if dc_list is None or len(dc_list) == 0:
            return {"error": "No hay data centers disponibles para comparar"}
        
        # Recalcular emisiones usando el mismo modelo/dispositivo/red pero diferentes DCs
        # Para esto necesitaríamos acceso a la calculadora.
        # Por ahora devolvemos una estructura de ejemplo
        
        rows = []
        for idx, dc in dc_list.iterrows():
            # La CI del nuevo DC se aplica SOLO al componente del datacenter;
            # dispositivo y red conservan su CI original (no cambian con el DC).
            ci_dc_new = dc.get('carbon_intensity_gCO2_kWh', 400) or 400
            co2_dc_adjusted = (result.energy_datacenter_wh / 1000) * ci_dc_new  # gCO2
            co2_adjusted = result.co2_device_g + result.co2_network_g + co2_dc_adjusted
            
            rows.append({
                "region": dc.get('region', dc.get('dc_id', 'Unknown')),
                "datacenter": dc.get('dc_id', 'Unknown'),
                "carbon_intensity_gco2_kwh": dc.get('carbon_intensity_gCO2_kWh', None),
                "estimated_co2_gco2": round(co2_adjusted, 4),
                "renewable_pct": dc.get('renewable_pct', None),
                "provider_renewable_pct": dc.get('provider_renewable_pct', None),
                "pue": dc.get('pue', None)
            })
        
        df = pd.DataFrame(rows)
        df = df.where(pd.notnull(df), None)
        
        # Ordenar por CO2 (mejor primero)
        df = df.sort_values('estimated_co2_gco2')
        
        return {
            "regional_impact": df.to_dict(orient='records'),
            "best_region": df.iloc[0].to_dict() if len(df) > 0 else None,
            "worst_region": df.iloc[-1].to_dict() if len(df) > 0 else None,
            "max_difference": {
                "gco2": round(df['estimated_co2_gco2'].max() - df['estimated_co2_gco2'].min(), 4),
                "ratio": round(df['estimated_co2_gco2'].max() / df['estimated_co2_gco2'].min(), 1)
            },
            "timestamp": self.timestamp
        }
    
    def generate_production_impact(self, result: Any, queries_per_day: int = 1000000, 
                                  days_per_year: int = 365) -> Dict[str, Any]:
        """
        Simula impacto anual si el modelo se ejecuta X veces al día.
        
        Args:
            result: EmissionResult
            queries_per_day: Consultas por día
            days_per_year: Días operativos por año
            
        Returns:
            Dict con impacto escalado a producción
        """
        queries_per_year = queries_per_day * days_per_year
        
        # Escalar emisiones
        co2_annual_kg = (result.co2_total_g / 1000) * queries_per_year
        co2_annual_tons = co2_annual_kg / 1000
        energy_annual_mwh = (result.energy_total_wh / 1_000_000) * queries_per_year
        
        # Costo (asumiendo $0.10/kWh promedio)
        cost_usd = energy_annual_mwh * 1000 * 0.10
        
        # Equivalencias anuales
        trees = co2_annual_kg / self.equivalencies["tree_kg_co2_per_year"]
        flights = co2_annual_kg / self.equivalencies["transatlantic_flight_kg_co2"]
        cars_years = co2_annual_kg / self.equivalencies["car_annual_kg_co2"]
        households_years = co2_annual_kg / self.equivalencies["household_annual_kg_co2"]
        
        return {
            "production_impact": {
                "input": {
                    "queries_per_day": queries_per_day,
                    "days_per_year": days_per_year,
                    "total_queries_per_year": queries_per_year
                },
                "emissions": {
                    "kg_co2_annual": round(co2_annual_kg, 2),
                    "tons_co2_annual": round(co2_annual_tons, 2)
                },
                "energy": {
                    "mwh_annual": round(energy_annual_mwh, 2),
                    "cost_usd_annual": round(cost_usd, 2)
                },
                "equivalencies": {
                    "trees_needed": round(trees, 0),
                    "transatlantic_flights": round(flights, 0),
                    "car_years_driving": round(cars_years, 1),
                    "household_years": round(households_years, 1)
                }
            },
            "metadata": {
                "model": result.model_name,
                "datacenter": result.data_center_name,
                "cost_assumption": "$0.10/kWh promedio global",
                "timestamp": self.timestamp
            }
        }


# Ejemplo de uso
if __name__ == "__main__":
    print("✅ Módulo reports_generator.py cargado correctamente")
    print("\nClase disponible: ReportGenerator")
    print("\nMétodos disponibles:")
    print("  - generate_breakdown_data(result)")
    print("  - generate_comparative_table([result1, result2, ...])")
    print("  - generate_energy_label(result, benchmark_avg)")
    print("  - generate_equivalencies(co2_grams)")
    print("  - generate_regional_impact(result, dc_list)")
    print("  - generate_production_impact(result, queries_per_day, days_per_year)")

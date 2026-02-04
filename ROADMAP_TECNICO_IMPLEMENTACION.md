# 🗺️ ROADMAP TÉCNICO DE IMPLEMENTACIÓN

**Documento**: Guía paso a paso para implementar reportes y gráficas  
**Público**: Desarrollador (tú)  
**Período**: 3 meses

---

## 📌 ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────┐
│ calculate_emissions.py (Motor existente)                │
│ - Calcula: CO2, energía, breakdown %                   │
│ - Output: EmissionResult (dataclass)                    │
└────────────────────────┬────────────────────────────────┘
                         │
                    ┌────▼─────────┐
                    │ NUEVA CAPA   │
                    │ REPORTES     │
                    └────┬─────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌────────┐      ┌─────────┐      ┌────────┐
   │ Gráficas│      │ Tabular │      │Descargas│
   │ (JSON) │      │ (JSON) │      │(PDF,PNG)│
   └────────┘      └─────────┘      └────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                    ┌────▼──────────┐
                    │ API/Frontend  │
                    │ (HTML/React)  │
                    └───────────────┘
```

---

## 📂 ESTRUCTURA DE ARCHIVOS PROPUESTA

```
scripts/
├── calculate_emissions.py         (Existente)
├── carbon_intensity_api.py        (Existente)
├── extract_*.py                  (Existente)
│
├── NEW: reports_generator.py      ← Motor de reportes
│   ├── class ReportGenerator
│   ├── def generate_pie_chart()
│   ├── def generate_energy_label()
│   └── ...
│
├── NEW: statistics_calculator.py  ← Estadísticas
│   ├── def calculate_percentiles()
│   ├── def calculate_equivalencies()
│   └── def get_efficiency_class()
│
├── NEW: scenario_simulator.py     ← Production impact
│   ├── class ProductionSimulator
│   └── def simulate_annual_impact()
│
└── NEW: visualizations.py         ← Mapas interactivos
    ├── def create_interactive_map()
    ├── def create_pareto_frontier()
    └── def create_sensitivity_tornado()

web_frontend/                      (Nuevo directorio)
├── app.py                         (Flask/FastAPI)
├── templates/
│   ├── dashboard.html
│   ├── report.html
│   └── comparator.html
└── static/
    ├── css/
    ├── js/
    └── data/

docs/
├── LLUVIA_DE_IDEAS_REPORTES_Y_GRAFICAS.md  (Este)
└── ROADMAP_TECNICO_IMPLEMENTACION.md       (Este)
```

---

## 🔧 FASE 1: INFRAESTRUCTURA BASE (5-7 días)

### 1.1 Crear módulo `reports_generator.py`

**Objetivo**: Centralizar toda la lógica de generación de reportes

```python
# scripts/reports_generator.py

from dataclasses import dataclass
from typing import Dict, List, Any, Optional
import json
import pandas as pd
from datetime import datetime

@dataclass
class ReportConfig:
    """Configuración de reportes"""
    output_format: str = "json"  # json, html, pdf, png
    include_metadata: bool = True
    include_equivalencies: bool = True
    include_recommendations: bool = True
    decimals: int = 4
    theme: str = "light"  # light, dark

class ReportGenerator:
    """
    Genera reportes en múltiples formatos a partir de EmissionResult
    """
    
    def __init__(self, calculator):
        """
        Args:
            calculator: Instancia de CarbonCalculator
        """
        self.calculator = calculator
        self.models_df = calculator.models_df
        self.dc_df = calculator.data_centers_df
        
    def generate_breakdown_data(self, result) -> Dict[str, Any]:
        """
        Retorna datos para pie chart / breakdown
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
            "timestamp": datetime.now().isoformat()
        }
    
    def generate_energy_label(self, result) -> Dict[str, Any]:
        """
        Genera datos para etiqueta energética al estilo EU
        """
        # Obtener percentil del modelo
        model_data = self.calculator.get_model(result.model_name)
        
        # Comparar con benchmark (promedio de todos los modelos)
        all_models = self.models_df
        avg_energy = all_models['energy_wh_per_1k_tokens'].mean()
        
        # Asignar clase energética
        efficiency_ratio = result.energy_total_wh / avg_energy
        
        if efficiency_ratio < 0.4:
            energy_class = "A+++"
            rating = 5
        elif efficiency_ratio < 0.6:
            energy_class = "A++"
            rating = 4.5
        elif efficiency_ratio < 0.8:
            energy_class = "A+"
            rating = 4
        elif efficiency_ratio < 1.0:
            energy_class = "A"
            rating = 3.5
        elif efficiency_ratio < 1.3:
            energy_class = "B"
            rating = 3
        elif efficiency_ratio < 1.7:
            energy_class = "C"
            rating = 2.5
        elif efficiency_ratio < 2.2:
            energy_class = "D"
            rating = 2
        else:
            energy_class = "E"
            rating = 1
        
        return {
            "energy_label": {
                "class": energy_class,
                "rating": rating,
                "emissions_gCO2": round(result.co2_total_g, 4),
                "energy_Wh": round(result.energy_total_wh, 6),
                "renewable_pct": float(result.dc_renewable_grid_pct or 0),
                "efficiency_vs_benchmark": {
                    "ratio": round(efficiency_ratio, 2),
                    "interpretation": "More efficient" if efficiency_ratio < 1 else "Less efficient",
                    "benchmark_avg_wh": round(avg_energy, 6)
                }
            }
        }
    
    def generate_comparative_table(self, results: List) -> Dict[str, Any]:
        """
        Genera tabla comparativa de múltiples escenarios
        
        Args:
            results: Lista de EmissionResult
        """
        rows = []
        for r in results:
            rows.append({
                "model": r.model_name,
                "data_center": r.data_center_name,
                "device": r.device_name,
                "co2_gCO2": round(r.co2_total_g, 4),
                "energy_Wh": round(r.energy_total_wh, 6),
                "renewable_pct": round(r.dc_renewable_grid_pct or 0, 1),
                "carbon_intensity": round(r.dc_carbon_intensity or 0, 1),
                "inference_time_sec": round(r.inference_time_sec, 3),
                "tokens_processed": r.tokens_processed
            })
        
        df = pd.DataFrame(rows)
        
        # Calcular diferencias vs. el primero
        baseline_co2 = df.iloc[0]['co2_gCO2']
        df['delta_vs_baseline_gCO2'] = df['co2_gCO2'] - baseline_co2
        df['delta_pct'] = (df['delta_vs_baseline_gCO2'] / baseline_co2 * 100).round(1)
        
        return {
            "comparative_table": df.to_dict(orient='records'),
            "summary": {
                "best_option": df.loc[df['co2_gCO2'].idxmin()].to_dict(),
                "worst_option": df.loc[df['co2_gCO2'].idxmax()].to_dict(),
                "avg_co2": round(df['co2_gCO2'].mean(), 4),
                "range": {
                    "min": round(df['co2_gCO2'].min(), 4),
                    "max": round(df['co2_gCO2'].max(), 4),
                    "spread": round(df['co2_gCO2'].max() - df['co2_gCO2'].min(), 4)
                }
            }
        }

# Uso:
# gen = ReportGenerator(calculator)
# breakdown = gen.generate_breakdown_data(result)
# label = gen.generate_energy_label(result)
# comp = gen.generate_comparative_table([result1, result2, result3])
```

**Tiempo estimado**: 2-3 días  
**Testing**: Unitarios con pytest

---

### 1.2 Crear módulo `statistics_calculator.py`

**Objetivo**: Cálculos estadísticos y equivalencias

```python
# scripts/statistics_calculator.py

class StatisticsCalculator:
    """
    Calcula estadísticas y equivalencias para reportes
    """
    
    # Factores de equivalencia
    EQUIVALENCIES = {
        "tree_kg_co2_per_year": 22.5,          # 1 árbol absorbe 22.5 kg CO2/año
        "transatlantic_flight_kg_co2": 700,    # 1 vuelo ~700 kg
        "car_annual_kg_co2": 474,              # 1 coche/año ~474 kg
        "led_bulb_annual_wh": 43800,           # 1 foco LED ~365 días * 120W/h
        "household_annual_kwh": 8760,          # Hogar promedio ~8760 kWh/año
        "renewable_tree_percent": 0.025        # 1 árbol = 2.5% de renewable energy offset
    }
    
    @staticmethod
    def co2_to_trees(co2_g: float) -> Dict[str, float]:
        """Convierte gramos de CO2 a árboles necesarios"""
        co2_kg = co2_g / 1000
        trees_needed = co2_kg / StatisticsCalculator.EQUIVALENCIES["tree_kg_co2_per_year"]
        return {
            "co2_kg": round(co2_kg, 4),
            "trees_needed": round(trees_needed, 1),
            "trees_range_min": round(trees_needed * 0.88, 1),  # Variabilidad ±12%
            "trees_range_max": round(trees_needed * 1.12, 1)
        }
    
    @staticmethod
    def co2_to_flights(co2_g: float) -> Dict[str, float]:
        """Convierte a vuelos transatlánticos"""
        co2_kg = co2_g / 1000
        flights = co2_kg / StatisticsCalculator.EQUIVALENCIES["transatlantic_flight_kg_co2"]
        return {
            "flights_equivalent": round(flights, 2),
            "co2_kg": round(co2_kg, 4)
        }
    
    @staticmethod
    def co2_to_cars(co2_g: float) -> Dict[str, float]:
        """Convierte a años de conducción de coche"""
        co2_kg = co2_g / 1000
        car_years = co2_kg / StatisticsCalculator.EQUIVALENCIES["car_annual_kg_co2"]
        return {
            "car_years": round(car_years, 2),
            "co2_kg": round(co2_kg, 4)
        }
    
    @staticmethod
    def get_all_equivalencies(co2_g: float) -> Dict[str, Any]:
        """Retorna todas las equivalencias"""
        return {
            "original_gCO2": round(co2_g, 4),
            "trees": StatisticsCalculator.co2_to_trees(co2_g),
            "flights": StatisticsCalculator.co2_to_flights(co2_g),
            "cars": StatisticsCalculator.co2_to_cars(co2_g),
            "narrative": f"""
            {round(co2_g, 4)}g of CO2 is equivalent to:
            - {StatisticsCalculator.co2_to_trees(co2_g)['trees_needed']} trees needed to offset
            - {StatisticsCalculator.co2_to_flights(co2_g)['flights_equivalent']} transatlantic flights
            - {StatisticsCalculator.co2_to_cars(co2_g)['car_years']} years of car driving
            """
        }
    
    @staticmethod
    def get_efficiency_class(energy_wh: float, avg_energy_wh: float) -> str:
        """
        Asigna clase energética A-E basada en percentil
        
        Args:
            energy_wh: Energía del modelo
            avg_energy_wh: Promedio del benchmark
        """
        ratio = energy_wh / avg_energy_wh
        
        if ratio < 0.4:
            return "A+++"
        elif ratio < 0.6:
            return "A++"
        elif ratio < 0.8:
            return "A+"
        elif ratio < 1.0:
            return "A"
        elif ratio < 1.3:
            return "B"
        elif ratio < 1.7:
            return "C"
        elif ratio < 2.2:
            return "D"
        else:
            return "E"
    
    @staticmethod
    def calculate_percentile_position(value: float, dataset: List[float]) -> float:
        """Retorna percentil (0-100)"""
        import statistics
        sorted_data = sorted(dataset)
        position = sorted_data.index(min(sorted_data, key=lambda x: abs(x - value)))
        return round(position / len(sorted_data) * 100, 1)

# Uso:
# stats = StatisticsCalculator()
# equiv = stats.get_all_equivalencies(12.34)
# print(equiv['narrative'])
```

**Tiempo estimado**: 1-2 días  
**Testing**: Validar cálculos con datos publicados

---

### 1.3 Crear `scenario_simulator.py`

**Objetivo**: Simulación de production impact (el reportaje más importante)

```python
# scripts/scenario_simulator.py

from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class ProductionScenario:
    """Configuración de escenario de producción"""
    model_id: str
    data_center_id: str
    device_id: str
    network_id: str
    queries_per_day: int
    days_per_year: int = 365
    request_type: str = "chat_simple"
    electricity_cost_per_kwh: float = 0.10  # USD

class ProductionSimulator:
    """
    Simula impacto acumulativo en producción
    """
    
    def __init__(self, calculator):
        self.calculator = calculator
        self.stats = StatisticsCalculator()
    
    def simulate(self, scenario: ProductionScenario) -> Dict[str, Any]:
        """
        Simula escenario de producción anual
        """
        
        # Calcular una consulta
        single_result = self.calculator.calculate_emissions(
            model_id=scenario.model_id,
            data_center_id=scenario.data_center_id,
            device_id=scenario.device_id,
            network_id=scenario.network_id,
            request_type=scenario.request_type
        )
        
        # Escalar
        queries_per_year = scenario.queries_per_day * scenario.days_per_year
        total_co2_g = single_result.co2_total_g * queries_per_year
        total_energy_wh = single_result.energy_total_wh * queries_per_year
        
        # Conversiones
        total_co2_kg = total_co2_g / 1000
        total_co2_tonnes = total_co2_kg / 1000
        total_energy_kwh = total_energy_wh / 1000
        total_energy_mwh = total_energy_kwh / 1000
        
        # Costo
        electricity_cost = total_energy_kwh * scenario.electricity_cost_per_kwh
        
        # Equivalencias
        trees_needed = self.stats.co2_to_trees(total_co2_g)
        flights_equiv = self.stats.co2_to_flights(total_co2_g)
        cars_equiv = self.stats.co2_to_cars(total_co2_g)
        
        return {
            "scenario": {
                "model": scenario.model_id,
                "data_center": scenario.data_center_id,
                "queries_per_day": scenario.queries_per_day,
                "days_per_year": scenario.days_per_year,
                "queries_per_year": queries_per_year
            },
            "annual_impact": {
                "emissions": {
                    "gCO2": round(total_co2_g, 1),
                    "kgCO2": round(total_co2_kg, 1),
                    "tonnesCO2": round(total_co2_tonnes, 1)
                },
                "energy": {
                    "Wh": round(total_energy_wh, 0),
                    "kWh": round(total_energy_kwh, 1),
                    "MWh": round(total_energy_mwh, 2)
                },
                "cost": {
                    "USD": round(electricity_cost, 2),
                    "currency": "USD",
                    "rate_per_kwh": scenario.electricity_cost_per_kwh
                }
            },
            "equivalencies": {
                "trees": trees_needed['trees_needed'],
                "trees_range": f"{trees_needed['trees_range_min']}-{trees_needed['trees_range_max']}",
                "flights": flights_equiv['flights_equivalent'],
                "car_years": cars_equiv['car_years']
            },
            "per_query_metrics": {
                "co2_mg": round(single_result.co2_total_g * 1000, 1),
                "energy_wh": round(single_result.energy_total_wh, 6)
            }
        }

# Uso:
# sim = ProductionSimulator(calculator)
# scenario = ProductionScenario(
#     model_id="gpt-4",
#     data_center_id="aws-eu-west-1",
#     device_id="laptop-macbook-air-m3",
#     network_id="wifi-5",
#     queries_per_day=1_000_000
# )
# result = sim.simulate(scenario)
```

**Tiempo estimado**: 2-3 días

---

## 🎨 FASE 2: GENERACIÓN DE GRÁFICAS (15-20 días)

### 2.1 Crear `visualizations.py`

Usa matplotlib + plotly para JSON/PNG + HTML interactivo

```python
# scripts/visualizations.py

import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
import json

class ChartGenerator:
    """
    Genera gráficas en múltiples formatos
    """
    
    @staticmethod
    def pie_chart_breakdown(result, output_format='json') -> Dict or str:
        """Pie chart de breakdown"""
        
        labels = ['Device', 'Network', 'Data Center']
        sizes = [
            result.co2_device_g,
            result.co2_network_g,
            result.co2_datacenter_g
        ]
        colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']
        
        if output_format == 'json':
            return {
                "type": "pie",
                "labels": labels,
                "values": [round(s, 4) for s in sizes],
                "colors": colors,
                "total_gCO2": round(result.co2_total_g, 4)
            }
        
        elif output_format == 'html':
            fig = go.Figure(
                data=[go.Pie(
                    labels=labels,
                    values=sizes,
                    marker=dict(colors=colors),
                    textposition="inside",
                    textinfo="label+percent"
                )]
            )
            fig.update_layout(
                title=f"CO2 Breakdown: {result.model_name}",
                height=500
            )
            return fig.to_html()
        
        elif output_format == 'png':
            fig, ax = plt.subplots(figsize=(8, 6))
            ax.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%')
            ax.set_title(f'CO2 Breakdown: {result.model_name}')
            
            output_file = f"/tmp/pie_chart_{result.model_name}.png"
            fig.savefig(output_file, dpi=150, bbox_inches='tight')
            return output_file
    
    @staticmethod
    def comparison_bar_chart(results: List, output_format='json'):
        """Bar chart comparativa"""
        
        models = [r.model_name for r in results]
        co2_values = [r.co2_total_g for r in results]
        
        if output_format == 'json':
            return {
                "type": "bar",
                "x": models,
                "y": [round(c, 4) for c in co2_values],
                "title": "Model Comparison - CO2 Emissions"
            }
        
        elif output_format == 'html':
            fig = go.Figure(
                data=[go.Bar(x=models, y=co2_values)]
            )
            fig.update_layout(
                title="Model Comparison - CO2 Emissions",
                xaxis_title="Model",
                yaxis_title="gCO2"
            )
            return fig.to_html()
    
    @staticmethod
    def geographic_heatmap(dcs_with_emissions: Dict, output_format='json'):
        """
        Heatmap geográfico de DCs
        
        Args:
            dcs_with_emissions: {
                'dc_id': {..., 'carbon_intensity', 'emissions_g'},
                ...
            }
        """
        
        if output_format == 'json':
            return {
                "type": "geo_heatmap",
                "data": dcs_with_emissions,
                "map_center": [20, 0],
                "zoom": 2
            }
        
        elif output_format == 'html':
            # Preparar datos para Folium/Plotly
            df = pd.DataFrame([
                {
                    'dc_id': dc_id,
                    'lat': data.get('latitude', 0),
                    'lon': data.get('longitude', 0),
                    'carbon_intensity': data.get('carbon_intensity', 0),
                    'emissions': data.get('emissions_g', 0)
                }
                for dc_id, data in dcs_with_emissions.items()
            ])
            
            fig = px.scatter_geo(
                df,
                lat='lat',
                lon='lon',
                hover_name='dc_id',
                size='emissions',
                color='carbon_intensity',
                title="Data Centers: Carbon Intensity & Emissions Heatmap"
            )
            return fig.to_html()

# Uso:
# gen = ChartGenerator()
# pie_json = gen.pie_chart_breakdown(result, output_format='json')
# pie_html = gen.pie_chart_breakdown(result, output_format='html')
# pie_png = gen.pie_chart_breakdown(result, output_format='png')
```

**Tiempo estimado**: 5-7 días (una para cada tipo)

---

## 🌐 FASE 3: FRONTEND WEB (20-30 días)

### 3.1 Setup básico Flask/FastAPI

```python
# web_frontend/app.py

from flask import Flask, render_template, request, jsonify, send_file
from scripts.calculate_emissions import CarbonCalculator
from scripts.reports_generator import ReportGenerator
from scripts.scenario_simulator import ProductionSimulator
import json

app = Flask(__name__)
calculator = CarbonCalculator(use_realtime_carbon_intensity=True)
report_gen = ReportGenerator(calculator)
simulator = ProductionSimulator(calculator)

@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/api/calculate', methods=['POST'])
def calculate():
    """Endpoint para calcular emisiones"""
    data = request.json
    
    result = calculator.calculate_emissions(
        model_id=data['model_id'],
        data_center_id=data['data_center_id'],
        device_id=data['device_id'],
        network_id=data['network_id'],
        request_type=data.get('request_type', 'chat_simple'),
        utilization=data.get('utilization', 0.7)
    )
    
    return jsonify(result.to_dict())

@app.route('/api/report/breakdown', methods=['POST'])
def report_breakdown():
    """Genera breakdown para pie chart"""
    data = request.json
    # ... calcular ...
    breakdown = report_gen.generate_breakdown_data(result)
    return jsonify(breakdown)

@app.route('/api/scenario/production', methods=['POST'])
def scenario_production():
    """Simula escenario de producción"""
    data = request.json
    scenario = ProductionScenario(**data)
    result = simulator.simulate(scenario)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**Tiempo estimado**: 10-15 días

---

## 📋 CRONOGRAMA PROPUESTO

```
SEMANA 1 (Feb 3-7)
├─ Día 1-2: reports_generator.py
├─ Día 3: statistics_calculator.py
├─ Día 4-5: scenario_simulator.py + testing
└─ Hito: Módulos core funcionales

SEMANA 2-3 (Feb 10-21)
├─ Día 1-2: visualizations.py (pie, bar)
├─ Día 3-4: visualizations.py (maps, advanced)
├─ Día 5-7: Flask setup + 3 endpoints
└─ Hito: Web básico funcionando

SEMANA 4-6 (Feb 24 - Mar 7)
├─ Dashboards HTML/CSS
├─ Gráficas interactivas
├─ Testing y bug fixes
└─ Hito: Prototipo funcional

SEMANA 7-12 (Mar 10 - Apr 18)
├─ Polish y optimización
├─ Features adicionales (Tier 2)
├─ Documentación
└─ Hito: Producto listo para defensa
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Tier 1 (Prioritario)
- [ ] 1.1 Pie chart JSON
- [ ] 1.2 Energy label JSON
- [ ] 1.3 Tabla comparativa
- [ ] 1.4 Impacto por región
- [ ] 1.5 Desglose energía

### Tier 2 (Importante)
- [ ] 2.1 Simulador Production (★★★)
- [ ] 2.3 Energy badges
- [ ] 2.4 Mapa interactivo
- [ ] 2.5 Benchmark vs competencia

### Tier 3 (Bonus)
- [ ] 3.1 Frontera Pareto
- [ ] 3.2 Recomendador
- [ ] 3.3 Dashboard temporal

### Infraestructura
- [ ] Módulo reports_generator.py
- [ ] Módulo statistics_calculator.py
- [ ] Módulo scenario_simulator.py
- [ ] Módulo visualizations.py
- [ ] Flask app básico
- [ ] HTML templates
- [ ] CSS styling
- [ ] Testing

---

## 🎓 ANEXO: Validación de Cálculos

Después de implementar cada componente, valida contra:

1. **CodeCarbon**: `pip install codecarbon`
2. **ML CO2 Impact**: https://ml-co2-impact.herokuapp.com/
3. **Papers publicados**: Strubell et al.

Ejemplo validación:

```python
# scripts/tests/test_accuracy.py

from scripts.calculate_emissions import CarbonCalculator

def test_gpt4_baseline():
    """Validar que GPT-4 produce ~12-15 gCO2 en escenario estándar"""
    calc = CarbonCalculator()
    result = calc.calculate_emissions(
        model_id="gpt-4",
        data_center_id="aws-us-east-1",
        device_id="laptop-macbook-air-m3",
        network_id="wifi-5",
        request_type="chat_simple"
    )
    
    # Comparar con valores conocidos
    assert 10 < result.co2_total_g < 15, "GPT-4 baseline fuera de rango esperado"
    assert result.co2_total_g > result.co2_device_g, "DC debería ser dominante"
```


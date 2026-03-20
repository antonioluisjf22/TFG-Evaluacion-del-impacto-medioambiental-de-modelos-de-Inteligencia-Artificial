"""
Servicio de generación de reportes.
Envuelve ReportGenerator y environmental_labels para la API.
"""

from typing import Any

from reports_generator import ReportGenerator
from environmental_labels import get_environmental_label, get_label_scale, get_percentile
from calculate_emissions import EmissionResult


class ReportService:
    """Genera reportes JSON a partir de EmissionResult."""

    def __init__(self, models_df=None):
        self.generator = ReportGenerator(models_df=models_df)

    def breakdown(self, result: EmissionResult) -> dict:
        """Datos para gráfico de tarta / desglose porcentual."""
        return self.generator.generate_breakdown_data(result)

    def energy_label(self, result: EmissionResult) -> dict:
        """Etiqueta ambiental A+++–F basada en percentiles."""
        label_info = get_environmental_label(result.co2_total_g)
        scale = get_label_scale()
        percentile = get_percentile(result.co2_total_g)
        return {
            "label": label_info,
            "scale": scale,
            "percentile": round(percentile, 2),
            "co2_total_g": round(result.co2_total_g, 6),
        }

    def equivalencies(self, co2_grams: float, scale: int = 1) -> dict:
        """Equivalencias intuitivas (árboles, vuelos, km coche…)."""
        return self.generator.generate_equivalencies(co2_grams, scale=scale)

    def comparative(self, results: list[EmissionResult]) -> dict:
        """Tabla comparativa de múltiples escenarios."""
        return self.generator.generate_comparative_table(results)

    def production_impact(
        self, result: EmissionResult, queries_per_day: int = 1_000_000, days_per_year: int = 365
    ) -> dict:
        """Impacto a escala de producción."""
        return self.generator.generate_production_impact(result, queries_per_day, days_per_year)

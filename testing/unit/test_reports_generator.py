"""
Tests unitarios del generador de reportes (ReportGenerator).

Verifica breakdown, tabla comparativa, equivalencias y producción.
"""

import pytest
from scripts.reports_generator import ReportGenerator


@pytest.mark.unit
class TestBreakdown:
    """Verifica el desglose porcentual para pie chart."""

    def test_breakdown_percentages_sum_100(self, report_generator, sample_result):
        """Los tres porcentajes del breakdown deben sumar ~100%."""
        bd = report_generator.generate_breakdown_data(sample_result)
        total_pct = (
            bd['breakdown']['device_pct']
            + bd['breakdown']['network_pct']
            + bd['breakdown']['datacenter_pct']
        )
        assert total_pct == pytest.approx(100.0, abs=0.5)

    def test_breakdown_matches_absolute_values(self, report_generator, sample_result):
        """Los gCO2 absolutos deben coincidir con el EmissionResult."""
        bd = report_generator.generate_breakdown_data(sample_result)
        assert bd['breakdown_gco2']['total'] == pytest.approx(sample_result.co2_total_g, rel=0.01)

    def test_breakdown_contains_chart_data(self, report_generator, sample_result):
        """Debe retornar colores para Chart.js."""
        bd = report_generator.generate_breakdown_data(sample_result)
        assert 'chart_colors' in bd
        assert len(bd['chart_colors']) == 3


@pytest.mark.unit
class TestComparative:
    """Verifica la tabla comparativa de múltiples escenarios."""

    def test_comparative_table_contains_all_models(self, report_generator, calculator):
        """La tabla debe tener tantas entradas como resultados pasados."""
        results = []
        for mid in ["gpt-4", "phi-2", "mistral-7b"]:
            r = calculator.calculate_emissions(
                model_id=mid, data_center_id="aws-us-east-1",
                device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
                user_country="ES", request_type="chat_simple",
            )
            results.append(r)
        comp = report_generator.generate_comparative_table(results)
        assert len(comp['comparative_table']) == 3

    def test_comparative_table_includes_deltas(self, report_generator, calculator):
        """Debe tener campo delta_vs_baseline_gCO2."""
        results = []
        for mid in ["gpt-4", "phi-2"]:
            r = calculator.calculate_emissions(
                model_id=mid, data_center_id="aws-us-east-1",
                device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
                user_country="ES", request_type="chat_simple",
            )
            results.append(r)
        comp = report_generator.generate_comparative_table(results)
        assert 'delta_vs_baseline_gCO2' in comp['comparative_table'][0]

    def test_comparative_summary_has_best_and_worst(self, report_generator, calculator):
        """El summary debe tener best_option y worst_option."""
        results = []
        for mid in ["gpt-4", "phi-2"]:
            r = calculator.calculate_emissions(
                model_id=mid, data_center_id="aws-us-east-1",
                device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
                user_country="ES", request_type="chat_simple",
            )
            results.append(r)
        comp = report_generator.generate_comparative_table(results)
        assert 'best_option' in comp['summary']
        assert 'worst_option' in comp['summary']


@pytest.mark.unit
class TestEquivalencies:
    """Verifica las equivalencias intuitivas."""

    def test_equivalencies_trees_positive(self, report_generator):
        """Árboles necesarios > 0 para co2 > 0."""
        eq = report_generator.generate_equivalencies(10.0)
        assert eq['equivalencies']['trees_needed']['value'] > 0

    def test_equivalencies_scale_factor(self, report_generator):
        """Con scale=1000, emisiones_kg crecen ~1000x."""
        eq1 = report_generator.generate_equivalencies(1.0, scale=1)
        eq1000 = report_generator.generate_equivalencies(1.0, scale=1000)
        assert eq1000['emissions_kg_co2'] == pytest.approx(
            eq1['emissions_kg_co2'] * 1000, rel=0.01
        )

    def test_equivalencies_zero_co2(self, report_generator):
        """Para 0 gCO2, retorna valores cero."""
        eq = report_generator.generate_equivalencies(0.0)
        assert eq['equivalencies']['trees_needed']['value'] == 0


@pytest.mark.unit
class TestProductionImpact:
    """Verifica el impacto a escala de producción."""

    def test_production_impact_annual_totals(self, report_generator, sample_result):
        """Emisiones anuales = single × queries/day × days/year."""
        prod = report_generator.generate_production_impact(
            sample_result, queries_per_day=1000, days_per_year=365
        )
        expected_kg = (sample_result.co2_total_g / 1000) * 1000 * 365
        assert prod['production_impact']['emissions']['kg_co2_annual'] == pytest.approx(
            expected_kg, rel=0.01
        )

    def test_production_impact_default_million_queries(self, report_generator, sample_result):
        """Con 1M queries/day, valores deben ser significativamente grandes."""
        prod = report_generator.generate_production_impact(sample_result)
        assert prod['production_impact']['emissions']['kg_co2_annual'] > 0
        assert prod['production_impact']['equivalencies']['trees_needed'] > 0

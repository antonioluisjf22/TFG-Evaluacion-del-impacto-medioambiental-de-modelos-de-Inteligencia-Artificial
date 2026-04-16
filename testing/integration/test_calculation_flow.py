"""
Tests de integración del flujo de cálculo completo.

Verifica el flujo end-to-end: CarbonCalculator → EmissionResult → ReportGenerator,
sin HTTP, solo llamadas Python internas.
"""

import pytest
from scripts.calculate_emissions import CarbonCalculator, EmissionResult
from scripts.environmental_labels import get_environmental_label, get_percentile
from scripts.reports_generator import ReportGenerator


@pytest.mark.integration
class TestFlowCalculatorToReport:
    """Flujo CarbonCalculator → ReportGenerator."""

    def test_flow_calculator_to_report_breakdown(self, calculator, sample_result, report_generator):
        """CarbonCalculator → EmissionResult → ReportGenerator.breakdown."""
        bd = report_generator.generate_breakdown_data(sample_result)
        assert bd['breakdown_gco2']['total'] > 0
        assert 'device_pct' in bd['breakdown']

    def test_flow_calculator_to_environmental_label(self, sample_result):
        """EmissionResult.co2_total_g → get_environmental_label → label válido."""
        label = get_environmental_label(sample_result.co2_total_g)
        assert label['label'] in ("A+++", "A++", "A+", "A", "B", "C", "D", "E", "F")

    def test_flow_compare_all_models_and_rank(self, calculator):
        """Calcular para varios modelos → ordenar por emisiones → ranking correcto."""
        results = []
        for mid in ["phi-2", "mistral-7b", "gpt-4"]:
            r = calculator.calculate_emissions(
                model_id=mid, data_center_id="aws-us-east-1",
                device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
                user_country="ES", request_type="chat_simple",
            )
            results.append((mid, r.co2_total_g))
        sorted_results = sorted(results, key=lambda x: x[1])
        # Phi-2 debería ser el más eficiente
        assert sorted_results[0][0] == "phi-2"

    def test_flow_equivalencies_after_calculation(self, calculator, report_generator, sample_result):
        """Calcular → equivalencias → árboles y vuelos coherentes."""
        eq = report_generator.generate_equivalencies(sample_result.co2_total_g, scale=1000000)
        assert eq['equivalencies']['trees_needed']['value'] > 0
        assert eq['equivalencies']['transatlantic_flights']['value'] > 0

    def test_flow_production_impact_coherent(self, report_generator, sample_result):
        """Impacto producción = single × scale."""
        prod = report_generator.generate_production_impact(
            sample_result, queries_per_day=1000, days_per_year=365
        )
        expected = (sample_result.co2_total_g / 1000) * 1000 * 365
        assert prod['production_impact']['emissions']['kg_co2_annual'] == pytest.approx(
            expected, rel=0.01
        )


@pytest.mark.integration
class TestCrossModuleConsistency:
    """Verifica la consistencia entre módulos."""

    def test_report_breakdown_matches_result(self, report_generator, sample_result):
        """Los gCO2 del breakdown deben coincidir con EmissionResult (con redondeo a 4 dec)."""
        bd = report_generator.generate_breakdown_data(sample_result)
        assert bd['breakdown_gco2']['device'] == pytest.approx(round(sample_result.co2_device_g, 4), abs=1e-4)
        assert bd['breakdown_gco2']['network'] == pytest.approx(round(sample_result.co2_network_g, 4), abs=1e-4)
        assert bd['breakdown_gco2']['datacenter'] == pytest.approx(round(sample_result.co2_datacenter_g, 4), abs=1e-4)

    def test_label_consistent_with_percentile(self, sample_result):
        """Label y percentil deben concordar (A+++ → bajo percentil, F → alto)."""
        label = get_environmental_label(sample_result.co2_total_g)
        percentile = get_percentile(sample_result.co2_total_g)
        if label['label'] == "A+++":
            assert percentile < 5
        elif label['label'] == "F":
            assert percentile > 95

    def test_comparative_table_sorted_correctly(self, calculator, report_generator):
        """La tabla comparativa debe tener best y worst correctos."""
        results = []
        for mid in ["phi-2", "gpt-4", "mistral-7b"]:
            r = calculator.calculate_emissions(
                model_id=mid, data_center_id="aws-us-east-1",
                device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
                user_country="ES", request_type="chat_simple",
            )
            results.append(r)
        comp = report_generator.generate_comparative_table(results)
        best = comp['summary']['best_option']['co2_gCO2']
        worst = comp['summary']['worst_option']['co2_gCO2']
        assert best <= worst

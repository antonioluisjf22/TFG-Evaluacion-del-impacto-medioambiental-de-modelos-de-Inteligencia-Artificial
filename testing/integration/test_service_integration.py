"""
Tests de integración de CalculatorService y ReportService.

Verifican el comportamiento de los servicios singleton
que envuelven los módulos de cálculo y reportes.
"""

import pytest
from app.services.calculator_service import CalculatorService
from app.services.report_service import ReportService


@pytest.mark.integration
class TestCalculatorService:
    """Verifica el servicio de cálculo (singleton wrapper)."""

    def test_calculator_service_get_options_structure(self):
        """get_options() debe retornar dict con todos los catálogos."""
        service = CalculatorService()
        options = service.get_options()
        assert 'models' in options
        assert 'data_centers' in options
        assert 'devices' in options
        assert 'networks' in options
        assert 'request_types' in options
        assert 'countries' in options

    def test_calculator_service_calculate_returns_result(self):
        """calculate() debe retornar EmissionResult válido."""
        service = CalculatorService()
        params = {
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "user_country": "ES",
            "request_type": "chat_simple",
        }
        result = service.calculate(params)
        # Duck-type check (module identity may differ due to PYTHONPATH)
        assert hasattr(result, 'co2_total_g')
        assert hasattr(result, 'co2_device_g')
        assert result.co2_total_g > 0

    def test_calculator_service_compare_models_returns_list(self):
        """compare_models() debe retornar lista de EmissionResult."""
        service = CalculatorService()
        params = {
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "user_country": "ES",
            "request_type": "chat_simple",
        }
        results = service.compare_models(params)
        assert isinstance(results, list)
        assert len(results) > 0


@pytest.mark.integration
class TestReportService:
    """Verifica el servicio de reportes."""

    def _get_sample_result(self):
        """Obtiene un EmissionResult de ejemplo."""
        service = CalculatorService()
        return service.calculate({
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "user_country": "ES",
            "request_type": "chat_simple",
        })

    def test_report_service_breakdown_valid(self):
        """breakdown() debe retornar porcentajes válidos."""
        calc_service = CalculatorService()
        report = ReportService(models_df=calc_service.calculator.models_df)
        result = self._get_sample_result()
        bd = report.breakdown(result)
        assert 'breakdown' in bd
        assert 'breakdown_gco2' in bd

    def test_report_service_label_valid_class(self):
        """energy_label() debe retornar clase A+++ a F."""
        calc_service = CalculatorService()
        report = ReportService(models_df=calc_service.calculator.models_df)
        result = self._get_sample_result()
        label_data = report.energy_label(result)
        assert label_data['label']['label'] in ("A+++", "A++", "A+", "A", "B", "C", "D", "E", "F")

    def test_report_service_equivalencies_positive(self):
        """equivalencies() debe retornar valores >= 0."""
        calc_service = CalculatorService()
        report = ReportService(models_df=calc_service.calculator.models_df)
        eq = report.equivalencies(10.0, scale=1)
        assert eq['emissions_kg_co2'] >= 0

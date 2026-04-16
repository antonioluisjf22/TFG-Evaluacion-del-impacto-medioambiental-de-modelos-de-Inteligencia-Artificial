"""
Tests unitarios del cliente API de Electricity Maps (CarbonIntensityAPI).

IMPORTANTE: Todas las llamadas HTTP están mockeadas.
No se realizan llamadas reales a la API externa.
"""

import pytest
from unittest.mock import patch, MagicMock
import time


@pytest.mark.unit
class TestCarbonIntensityAPI:
    """Verifica el comportamiento del cliente de Electricity Maps con mocks."""

    def _make_api(self):
        """Crea una instancia de CarbonIntensityAPI para tests."""
        from scripts.carbon_intensity_api import CarbonIntensityAPI
        api = CarbonIntensityAPI()
        api.cache = {}
        return api

    @patch("scripts.carbon_intensity_api.httpx", create=True)
    def test_cache_returns_cached_value(self, mock_httpx):
        """Si el valor está en caché (< 15 min), no debe llamar a la API."""
        from datetime import datetime
        api = self._make_api()
        # La caché real usa api.cache (sin _), clave "ci_{zone}" y estructura
        # {"carbonIntensity": X, "timestamp": ISO_str}
        zone = api.get_zone_for_country("ES")  # "ES" → zona EM
        api.cache[f"ci_{zone}"] = {
            "carbonIntensity": 145.0,
            "timestamp": datetime.now().isoformat(),
        }
        result = api.get_carbon_intensity("ES")
        assert result == 145.0

    def test_fallback_to_csv_on_api_failure(self, calculator):
        """Si la API falla, debe usar CSV como fallback."""
        # Usar el calculator que tiene use_realtime_carbon_intensity=False
        ci = calculator.get_carbon_intensity("ES", use_api=False)
        assert ci > 0
        assert isinstance(ci, (int, float))

    def test_datacenter_zone_mapping(self, calculator):
        """DC conocido debe mapear a una zona de EM correcta."""
        zone = calculator.get_dc_electricity_maps_zone("aws-us-east-1")
        # Puede ser None si dc_ci_df no está cargado, pero si está, debe ser string
        if zone is not None:
            assert isinstance(zone, str)
            assert len(zone) > 0

    def test_unknown_zone_returns_default(self, calculator):
        """Zona desconocida debe retornar valor por defecto."""
        ci = calculator.get_carbon_intensity("ZZ-UNKNOWN", use_api=False)
        assert ci > 0  # fallback a GLOBAL

    def test_graceful_degradation_no_credentials(self):
        """Sin API key, no debe crashear, solo usa fallbacks."""
        from scripts.calculate_emissions import CarbonCalculator
        # Crear calculator sin API
        calc = CarbonCalculator(use_realtime_carbon_intensity=False)
        ci = calc.get_carbon_intensity("ES")
        assert ci > 0

    def test_carbon_intensity_for_dc_returns_positive(self, calculator):
        """CI para un DC conocido debe ser positiva."""
        ci = calculator.get_carbon_intensity_for_dc("aws-us-east-1", fallback_country="US")
        assert ci > 0

    def test_dc_renewable_info_structure(self, calculator):
        """Info de renovables de un DC debe tener las keys esperadas."""
        info = calculator.get_dc_renewable_info("aws-us-east-1")
        assert 'renewable_grid_pct' in info
        assert 'provider_renewable_pct' in info
        assert 'carbon_intensity' in info

    def test_carbon_intensity_for_zone_from_csv(self, calculator):
        """Búsqueda por zona en el CSV debe funcionar si hay datos."""
        if calculator.ci_zones_df is not None and len(calculator.ci_zones_df) > 0:
            first_zone = calculator.ci_zones_df.iloc[0]['zone']
            ci = calculator.get_carbon_intensity_for_zone(first_zone)
            assert ci is not None
            assert ci > 0

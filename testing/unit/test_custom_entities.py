"""
Tests unitarios de entidades personalizadas (__custom__).

Verifica _fill_custom_model_defaults, _fill_custom_dc_defaults,
_fill_custom_device_defaults y el flujo completo con entidades custom.
"""

import pytest
from scripts.calculate_emissions import (
    _fill_custom_model_defaults,
    _fill_custom_dc_defaults,
    _fill_custom_device_defaults,
    CarbonCalculator,
)


@pytest.mark.unit
class TestCustomModel:
    """Verifica el relleno de campos para modelos personalizados."""

    def test_fill_custom_model_from_parameters(self):
        """Si se da num_parameters, debe estimar energy y latency."""
        d, estimated = _fill_custom_model_defaults({"num_parameters": 13e9})
        assert d['energy_wh_per_1k_tokens'] > 0
        assert d['latency_ms_per_token'] > 0

    def test_fill_custom_model_from_energy(self):
        """Si se da energy_wh_per_1k_tokens, debe estimar parámetros."""
        d, estimated = _fill_custom_model_defaults({"energy_wh_per_1k_tokens": 0.001})
        assert d['num_parameters'] > 0
        assert any('parámetros' in e.lower() or 'parametros' in e.lower() for e in estimated)

    def test_fill_custom_model_default_7b(self):
        """Sin datos, debe asumir 7B parámetros."""
        d, estimated = _fill_custom_model_defaults({})
        assert d['num_parameters'] == 7e9

    def test_fill_custom_model_returns_estimated_fields(self):
        """El segundo retorno debe listar los campos estimados."""
        d, estimated = _fill_custom_model_defaults({})
        assert isinstance(estimated, list)
        assert len(estimated) > 0


@pytest.mark.unit
class TestCustomDataCenter:
    """Verifica el relleno de campos para data centers personalizados."""

    def test_fill_custom_dc_default_country_es(self):
        """Sin country, debe asignar ES."""
        d, estimated = _fill_custom_dc_defaults({})
        assert d['country_code'] == 'ES'

    def test_fill_custom_dc_derives_ci_from_country(self):
        """CI debe calcularse a partir del country_code."""
        d, estimated = _fill_custom_dc_defaults({"country_code": "FR"})
        assert 'carbon_intensity' in d
        assert d['carbon_intensity'] > 0

    def test_fill_custom_dc_preserves_explicit_pue(self):
        """Si el usuario da PUE, no debe sobrescribirlo."""
        d, estimated = _fill_custom_dc_defaults({"country_code": "DE", "pue": 1.2})
        assert d['pue'] == 1.2


@pytest.mark.unit
class TestCustomDevice:
    """Verifica el relleno de campos para dispositivos personalizados."""

    def test_fill_custom_device_detects_primary_processor(self):
        """Debe detectar GPU como primario si solo tiene gpu watts."""
        d, estimated = _fill_custom_device_defaults({"inference_gpu_watts": 150.0})
        assert d['primary_inference_target'] == 'gpu'

    def test_fill_custom_device_zeroes_unspecified_processors(self):
        """Procesadores no primarios deben tener 0W."""
        d, estimated = _fill_custom_device_defaults({"inference_cpu_watts": 45.0})
        assert d.get('inference_gpu_watts', 0) == 0.0
        assert d.get('inference_npu_watts', 0) == 0.0

    def test_fill_custom_device_default_cpu(self):
        """Sin especificar procesador, debe asumir CPU."""
        d, estimated = _fill_custom_device_defaults({})
        assert d['primary_inference_target'] == 'cpu'


@pytest.mark.unit
class TestCustomEntityFlow:
    """Verifica el flujo completo de cálculo con entidades custom."""

    def test_calculate_with_custom_model(self, calculator, sample_custom_model):
        """model_id='__custom__' + custom_model dict debe producir EmissionResult válido."""
        result = calculator.calculate_emissions(
            model_id="__custom__",
            data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3",
            network_id="WiFi 6 802.11ax",
            user_country="ES",
            request_type="chat_simple",
            custom_model=sample_custom_model,
        )
        assert result.co2_total_g > 0
        assert result.model_name == "Custom Test Model"

    def test_calculate_with_custom_dc(self, calculator, sample_custom_dc):
        """data_center_id='__custom__' con custom_dc debe funcionar."""
        result = calculator.calculate_emissions(
            model_id="phi-2",
            data_center_id="__custom__",
            device_id="laptop-macbook-air-m3",
            network_id="WiFi 6 802.11ax",
            user_country="ES",
            request_type="chat_simple",
            custom_dc=sample_custom_dc,
        )
        assert result.co2_total_g > 0

    def test_calculate_with_custom_device(self, calculator, sample_custom_device):
        """device_id='__custom__' con custom_device debe funcionar."""
        result = calculator.calculate_emissions(
            model_id="phi-2",
            data_center_id="aws-us-east-1",
            device_id="__custom__",
            network_id="WiFi 6 802.11ax",
            user_country="ES",
            request_type="chat_simple",
            custom_device=sample_custom_device,
        )
        assert result.co2_total_g > 0
        assert result.device_name == "Custom Device"

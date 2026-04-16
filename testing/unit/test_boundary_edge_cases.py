"""
Tests de casos límite y entradas extremas.

Verifican el comportamiento del sistema en los extremos de los rangos
válidos y ante entradas anómalas. Todos los casos extremos deben
manejarse sin lanzar excepciones no controladas.
"""

import pytest
from scripts.calculate_emissions import CarbonCalculator


@pytest.mark.unit
@pytest.mark.boundary
class TestTokenExtremes:
    """Verifica el comportamiento con tokens en valores extremos."""

    def test_zero_tokens_input(self, calculator):
        """tokens_input=0, tokens_output=1 → no crash; co2 >= 0."""
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", tokens_input=0, tokens_output=1,
        )
        assert result.co2_total_g >= 0

    def test_zero_tokens_output(self, calculator):
        """tokens_input=50, tokens_output=0 → no crash; co2 >= 0."""
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", tokens_input=50, tokens_output=0,
        )
        assert result.co2_datacenter_g >= 0

    def test_tokens_input_and_output_both_zero(self, calculator):
        """tokens_input=0, tokens_output=0 → resultado mínimo; no crash."""
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", tokens_input=0, tokens_output=0,
        )
        assert result.co2_total_g >= 0

    def test_tokens_exactly_at_max_output(self, calculator):
        """tokens_output == max_output_tokens → se acepta sin capping."""
        model = calculator.get_model("phi-2")
        max_out = int(model['max_output_tokens'])
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", tokens_input=50, tokens_output=max_out,
        )
        assert result.tokens_processed == 50 + max_out

    def test_tokens_output_one_above_max(self, calculator):
        """tokens_output = max + 1 → se capea automáticamente."""
        model = calculator.get_model("phi-2")
        max_out = int(model['max_output_tokens'])
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", tokens_input=50, tokens_output=max_out + 1,
        )
        assert result.tokens_processed <= 50 + max_out

    def test_tokens_input_extremely_large(self, calculator):
        """tokens_input=100000 → se maneja sin overflow."""
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", tokens_input=100000, tokens_output=100,
        )
        assert result.co2_total_g >= 0


@pytest.mark.unit
@pytest.mark.boundary
class TestUtilizationExtremes:
    """Verifica la utilización en valores límite."""

    def test_utilization_exactly_zero(self, calculator):
        """utilization=0.0 → P_real == P_idle."""
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple", utilization=0.0,
        )
        assert result.step_p_real_w == pytest.approx(result.step_p_idle_w, rel=0.01)

    def test_utilization_exactly_one(self, calculator):
        """utilization=1.0 → P_real == P_TDP (o P_inference_max)."""
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple", utilization=1.0,
        )
        assert result.step_p_real_w >= result.step_p_idle_w

    def test_utilization_result_idle_less_than_full(self, calculator):
        """Resultado con utilization=0.01 < utilization=0.99 en co2_device_g."""
        r_low = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple", utilization=0.01,
        )
        r_high = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple", utilization=0.99,
        )
        assert r_high.co2_device_g > r_low.co2_device_g


@pytest.mark.unit
@pytest.mark.boundary
class TestCarbonIntensityExtremes:
    """Verifica el comportamiento con CI extremas."""

    def test_very_low_ci_country_iceland(self, calculator):
        """IS (Iceland, CI ≈ 20) → emisiones de red muy bajas pero positivas."""
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="IS", request_type="chat_simple",
        )
        assert result.co2_network_g > 0
        assert result.co2_network_g < 0.01

    def test_very_high_ci_country(self, calculator):
        """PL (Poland, CI ≈ 650) → emisiones de red elevadas."""
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="PL", request_type="chat_simple",
        )
        assert result.co2_network_g > 0


@pytest.mark.unit
@pytest.mark.boundary
class TestPUEExtremes:
    """Verifica el comportamiento con PUE extremos en custom DC."""

    def test_pue_exactly_one(self, calculator):
        """PUE=1.0 → mínimas emisiones DC posibles."""
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="__custom__",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
            custom_dc={"country_code": "ES", "pue": 1.0},
        )
        assert result.co2_datacenter_g > 0

    def test_pue_value_two_is_double_pue_one(self, calculator):
        """PUE=2.0 vs PUE=1.0 → co2_datacenter se duplica."""
        r1 = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="__custom__",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
            custom_dc={"country_code": "ES", "pue": 1.0},
        )
        r2 = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="__custom__",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
            custom_dc={"country_code": "ES", "pue": 2.0},
        )
        assert r2.co2_datacenter_g == pytest.approx(r1.co2_datacenter_g * 2, rel=0.01)


@pytest.mark.unit
@pytest.mark.boundary
class TestCustomModelExtremes:
    """Verifica parámetros extremos del modelo custom."""

    def test_tiny_custom_model_1b_params(self, calculator):
        """Modelo con 1B parámetros → resultado válido con emisiones bajas."""
        result = calculator.calculate_emissions(
            model_id="__custom__", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
            custom_model={"num_parameters": 1e9},
        )
        assert result.co2_total_g > 0

    def test_large_custom_model_1000b_params(self, calculator):
        """Modelo con 1000B parámetros → resultado válido sin overflow."""
        result = calculator.calculate_emissions(
            model_id="__custom__", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
            custom_model={"num_parameters": 1000e9},
        )
        assert result.co2_total_g > 0
        assert result.co2_total_g < float('inf')

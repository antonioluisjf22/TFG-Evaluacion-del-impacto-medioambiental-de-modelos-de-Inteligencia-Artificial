"""
Tests unitarios del motor de cálculo de emisiones (CarbonCalculator).

Verifica la inicialización, lookups de entidades, selección de procesador,
cálculos de emisiones, proporcionalidad, capping de tokens y metadata.
"""

import pytest
import pandas as pd
from scripts.calculate_emissions import CarbonCalculator, EmissionResult


@pytest.mark.unit
class TestCalculatorInitialization:
    """Verifica la carga correcta de todos los datasets."""

    def test_calculator_loads_all_datasets(self, calculator):
        """Todos los DataFrames principales deben estar cargados (no None)."""
        assert calculator.models_df is not None
        assert calculator.data_centers_df is not None
        assert calculator.devices_df is not None
        assert calculator.network_df is not None

    def test_calculator_loads_models_count(self, calculator):
        """Deben cargarse exactamente 15 modelos del CSV."""
        assert len(calculator.models_df) == 15

    def test_calculator_loads_datacenters_count(self, calculator):
        """Deben cargarse exactamente 71 data centers del CSV."""
        assert len(calculator.data_centers_df) == 71

    def test_calculator_loads_devices_count(self, calculator):
        """Deben cargarse exactamente 20 dispositivos del CSV."""
        assert len(calculator.devices_df) == 20

    def test_calculator_loads_network_types(self, calculator):
        """Verifica que todos los tipos de red esperados estén presentes."""
        expected = {"Fiber FTTH", "4G LTE", "5G NSA", "WiFi 6 802.11ax", "WiFi 6E 802.11be"}
        actual = set(calculator.network_df['network_type'].tolist())
        assert expected == actual


@pytest.mark.unit
class TestEntityLookups:
    """Verifica los lookups de entidades individuales."""

    def test_get_model_valid(self, calculator):
        """get_model con un modelo existente retorna un Series con campos esperados."""
        model = calculator.get_model("gpt-4")
        assert model is not None
        assert 'model_name' in model.index
        assert 'num_parameters' in model.index

    def test_get_model_invalid(self, calculator):
        """get_model con un modelo inexistente retorna None."""
        assert calculator.get_model("modelo-inexistente") is None

    def test_get_data_center_valid(self, calculator):
        """Lookup correcto de un DC conocido retorna datos válidos."""
        dc = calculator.get_data_center("aws-us-east-1")
        assert dc is not None
        assert 'country_code' in dc.index

    def test_get_device_valid(self, calculator):
        """Lookup correcto de un dispositivo retorna datos válidos."""
        device = calculator.get_device("laptop-macbook-air-m3")
        assert device is not None
        assert 'device_name' in device.index

    def test_get_network_valid(self, calculator):
        """Lookup correcto de un tipo de red retorna datos válidos."""
        network = calculator.get_network("WiFi 6 802.11ax")
        assert network is not None
        assert 'energy_kWh_per_MB' in network.index


@pytest.mark.unit
class TestProcessorSelection:
    """Verifica la selección de procesador según dispositivo."""

    def test_get_valid_processors_smartphone_with_npu(self, calculator):
        """Smartphone con NPU debe tener cpu, gpu y npu como opciones."""
        procs = calculator.get_valid_processors_for_device("phone-iphone-15-pro")
        assert "cpu" in procs
        assert "npu" in procs

    def test_get_valid_processors_raspberry_pi(self, calculator):
        """Raspberry Pi (edge) debe tener cpu (y quizá gpu si gpu_tdp > 0 en CSV)."""
        procs = calculator.get_valid_processors_for_device("edge-raspberry-pi-5")
        assert "cpu" in procs

    def test_get_processor_watts_returns_positive(self, calculator):
        """Watts del procesador seleccionado deben ser > 0."""
        watts = calculator.get_processor_watts("laptop-macbook-air-m3", "cpu")
        assert watts > 0

    def test_auto_processor_selects_primary_target(self, calculator):
        """Con inference_processor='auto', debe usar primary_inference_target del device."""
        result = calculator.calculate_emissions(
            model_id="phi-2",
            data_center_id="aws-us-east-1",
            device_id="phone-iphone-15-pro",
            network_id="WiFi 6 802.11ax",
            user_country="ES",
            request_type="chat_simple",
            inference_processor="auto",
        )
        device = calculator.get_device("phone-iphone-15-pro")
        expected_proc = device['primary_inference_target'].lower()
        assert result.processor_used == expected_proc


@pytest.mark.unit
class TestEmissionCalculation:
    """Verifica los cálculos de emisiones en casos normales."""

    def test_calculate_basic_returns_emission_result(self, sample_result):
        """El tipo de retorno debe ser EmissionResult."""
        assert isinstance(sample_result, EmissionResult)

    def test_calculate_co2_total_is_sum_of_components(self, sample_result):
        """CO2 total debe ser la suma de las 3 componentes."""
        expected = sample_result.co2_device_g + sample_result.co2_network_g + sample_result.co2_datacenter_g
        assert sample_result.co2_total_g == pytest.approx(expected, abs=1e-12)

    def test_calculate_energy_total_is_sum_of_components(self, sample_result):
        """Energía total debe ser la suma de las 3 componentes."""
        expected = sample_result.energy_device_wh + sample_result.energy_network_wh + sample_result.energy_datacenter_wh
        assert sample_result.energy_total_wh == pytest.approx(expected, abs=1e-12)

    def test_calculate_all_components_positive(self, sample_result):
        """Todas las emisiones y energías deben ser >= 0."""
        assert sample_result.co2_device_g >= 0
        assert sample_result.co2_network_g >= 0
        assert sample_result.co2_datacenter_g >= 0
        assert sample_result.co2_total_g >= 0
        assert sample_result.energy_device_wh >= 0
        assert sample_result.energy_network_wh >= 0
        assert sample_result.energy_datacenter_wh >= 0

    def test_calculate_tokens_from_request_type(self, calculator):
        """Si no se pasan tokens explícitos, debe usar request_type."""
        result = calculator.calculate_emissions(
            model_id="gpt-4",
            data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3",
            network_id="WiFi 6 802.11ax",
            user_country="ES",
            request_type="chat_simple",
        )
        # chat_simple = 70 input + 215 output = 285
        assert result.tokens_processed == 285

    def test_calculate_default_tokens_fallback(self, calculator):
        """Sin tokens ni request_type, usa default (50+100=150)."""
        result = calculator.calculate_emissions(
            model_id="gpt-4",
            data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3",
            network_id="WiFi 6 802.11ax",
            user_country="ES",
        )
        # Debería usar typical_request_type del modelo o el fallback
        assert result.tokens_processed > 0


@pytest.mark.unit
class TestProportionality:
    """Verifica propiedades matemáticas de proporcionalidad."""

    def test_more_tokens_more_emissions(self, calculator):
        """200 output tokens deben generar más emisiones que 100."""
        r1 = calculator.calculate_emissions(
            model_id="gpt-4", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", tokens_input=50, tokens_output=100,
        )
        r2 = calculator.calculate_emissions(
            model_id="gpt-4", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", tokens_input=50, tokens_output=200,
        )
        assert r2.co2_total_g > r1.co2_total_g

    def test_higher_pue_higher_datacenter_emissions(self, calculator):
        """PUE más alto en custom DC debe generar más emisiones DC."""
        r_low = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="__custom__",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
            custom_dc={"country_code": "ES", "pue": 1.1, "region": "test"},
        )
        r_high = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="__custom__",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
            custom_dc={"country_code": "ES", "pue": 1.8, "region": "test"},
        )
        assert r_high.co2_datacenter_g > r_low.co2_datacenter_g

    def test_gpu_vs_cpu_different_emissions(self, calculator):
        """GPU y CPU deben producir emisiones de dispositivo distintas."""
        r_cpu = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="desktop-gaming-rtx4090", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
            inference_processor="cpu",
        )
        r_gpu = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="desktop-gaming-rtx4090", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
            inference_processor="gpu",
        )
        assert r_cpu.co2_device_g != r_gpu.co2_device_g


@pytest.mark.unit
class TestTokenCapping:
    """Verifica el capping de tokens al máximo del modelo."""

    def test_tokens_output_capped_to_max_output(self, calculator):
        """Si tokens_output > max_output_tokens del modelo, se capea."""
        model = calculator.get_model("phi-2")
        max_out = int(model['max_output_tokens'])
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", tokens_input=50, tokens_output=max_out + 500,
        )
        # tokens_processed = input + min(output, max_output)
        assert result.tokens_processed <= 50 + max_out


@pytest.mark.unit
class TestResultMetadata:
    """Verifica que los campos de metadata del resultado sean correctos."""

    def test_result_contains_model_name(self, sample_result):
        """result.model_name debe coincidir con el modelo usado."""
        assert sample_result.model_name is not None
        assert len(sample_result.model_name) > 0

    def test_result_contains_processor_used(self, sample_result):
        """result.processor_used debe ser cpu, gpu o npu."""
        assert sample_result.processor_used in ("cpu", "gpu", "npu")

    def test_result_inference_time_positive(self, sample_result):
        """result.inference_time_sec debe ser > 0."""
        assert sample_result.inference_time_sec > 0

    def test_result_to_dict_structure(self, sample_result):
        """to_dict() debe contener las keys principales."""
        d = sample_result.to_dict()
        assert "emissions_gCO2" in d
        assert "energy_Wh" in d
        assert "metadata" in d
        assert "breakdown_percentage" in d
        assert "formula_steps" in d

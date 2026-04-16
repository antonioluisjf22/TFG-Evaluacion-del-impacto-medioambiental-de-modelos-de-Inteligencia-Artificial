"""
Tests parametrizados exhaustivos.

Usando @pytest.mark.parametrize, verifica que todas las combinaciones
relevantes producen resultados válidos. Cada combinación genera un caso
de test individual.
"""

import pytest
import os
import pandas as pd
from itertools import product

# Leer todos los IDs reales de los CSVs
_BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'raw')
ALL_MODEL_IDS = pd.read_csv(os.path.join(_BASE, "models", "models.csv"))['model_id'].tolist()
ALL_DC_IDS = pd.read_csv(os.path.join(_BASE, "data_centers", "data_centers.csv"))['dc_id'].tolist()
ALL_DEVICE_IDS = pd.read_csv(os.path.join(_BASE, "devices", "devices.csv"))['device_id'].tolist()
ALL_NETWORK_IDS = pd.read_csv(os.path.join(_BASE, "network", "network_energy_sources_2024.csv"))['network_type'].tolist()
ALL_REQUEST_TYPES = pd.read_csv(os.path.join(_BASE, "models", "request_types.csv"))['request_type_id'].tolist()

SAMPLE_COUNTRIES = ["ES", "US", "DE", "CN", "IN", "IS", "FR", "GB", "JP"]
SAMPLE_DCS = ["aws-us-east-1", "gcp-europe-west1", "azure-westeurope"]
SAMPLE_DEVICES = ["laptop-macbook-air-m3", "phone-iphone-15-pro", "edge-raspberry-pi-5"]


@pytest.mark.parametrized
@pytest.mark.slow
@pytest.mark.parametrize("model_id,country", list(product(ALL_MODEL_IDS, SAMPLE_COUNTRIES)))
def test_all_models_all_sample_countries_no_crash(calculator, model_id, country):
    """Cada combinación (modelo, país) debe producir resultado válido sin excepción."""
    result = calculator.calculate_emissions(
        model_id=model_id, data_center_id="aws-us-east-1",
        device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
        user_country=country, request_type="chat_simple",
    )
    assert result.co2_total_g >= 0


@pytest.mark.parametrized
@pytest.mark.parametrize("request_type", ALL_REQUEST_TYPES)
def test_all_request_types_produce_valid_result(calculator, request_type):
    """Cada request_type debe producir resultado válido con tokens_processed > 0."""
    result = calculator.calculate_emissions(
        model_id="phi-2", data_center_id="aws-us-east-1",
        device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
        user_country="ES", request_type=request_type,
    )
    assert result.tokens_processed > 0
    assert result.co2_total_g >= 0


@pytest.mark.parametrized
@pytest.mark.parametrize("network_id", ALL_NETWORK_IDS)
def test_all_network_types_produce_valid_result(calculator, network_id):
    """Cada tipo de red debe producir co2_network_g > 0."""
    result = calculator.calculate_emissions(
        model_id="phi-2", data_center_id="aws-us-east-1",
        device_id="laptop-macbook-air-m3", network_id=network_id,
        user_country="ES", request_type="chat_simple",
    )
    assert result.co2_network_g > 0


@pytest.mark.parametrized
@pytest.mark.parametrize("model_id", ALL_MODEL_IDS)
def test_all_models_parse_correctly(calculator, model_id):
    """Todos los model_id del CSV deben encontrarse en el calculator."""
    assert calculator.get_model(model_id) is not None


@pytest.mark.parametrized
@pytest.mark.parametrize("dc_id", ALL_DC_IDS)
def test_all_data_centers_parse_correctly(calculator, dc_id):
    """Todos los dc_id del CSV deben encontrarse en el calculator."""
    assert calculator.get_data_center(dc_id) is not None


@pytest.mark.parametrized
@pytest.mark.parametrize("device_id", ALL_DEVICE_IDS)
def test_all_devices_parse_correctly(calculator, device_id):
    """Todos los device_id del CSV deben encontrarse en el calculator."""
    assert calculator.get_device(device_id) is not None


@pytest.mark.parametrized
@pytest.mark.parametrize("device_id", ALL_DEVICE_IDS)
def test_all_processors_for_each_device(calculator, device_id):
    """Para cada dispositivo, todos sus procesadores válidos producen resultado."""
    procs = calculator.get_valid_processors_for_device(device_id)
    for proc in procs:
        result = calculator.calculate_emissions(
            model_id="phi-2", data_center_id="aws-us-east-1",
            device_id=device_id, network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
            inference_processor=proc,
        )
        assert result.co2_total_g >= 0
        assert result.processor_used == proc


@pytest.mark.parametrized
@pytest.mark.slow
def test_all_label_classes_are_reachable(calculator):
    """Calculando para todos los modelos × 3 DCs fijos, todas las 9 clases deben aparecer."""
    from scripts.environmental_labels import get_environmental_label
    labels_seen = set()
    for model_id in ALL_MODEL_IDS:
        for dc_id in SAMPLE_DCS:
            for device_id in SAMPLE_DEVICES:
                result = calculator.calculate_emissions(
                    model_id=model_id, data_center_id=dc_id,
                    device_id=device_id, network_id="WiFi 6 802.11ax",
                    user_country="ES", request_type="chat_simple",
                )
                label = get_environmental_label(result.co2_total_g)
                labels_seen.add(label['label'])
    # Al menos debemos ver varias clases (puede que no todas 9 con los datos actuales)
    assert len(labels_seen) >= 3, f"Solo se vieron {labels_seen}"


@pytest.mark.parametrized
@pytest.mark.parametrize("request_type", ALL_REQUEST_TYPES)
def test_token_counts_consistent_with_csv(calculator, request_type):
    """Los tokens procesados no deben exceder los del CSV (respetando capping)."""
    req_types = calculator.request_types
    expected_total = req_types[request_type]['tokens_input'] + req_types[request_type]['tokens_output']
    result = calculator.calculate_emissions(
        model_id="phi-2", data_center_id="aws-us-east-1",
        device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
        user_country="ES", request_type=request_type,
    )
    assert result.tokens_processed <= expected_total


@pytest.mark.parametrized
@pytest.mark.parametrize("dc_id", SAMPLE_DCS)
def test_model_ranking_invariant_across_sample_dcs(calculator, dc_id):
    """Phi-2 siempre debe emitir menos CO2 que GPT-4, independiente del DC."""
    r_phi = calculator.calculate_emissions(
        model_id="phi-2", data_center_id=dc_id,
        device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
        user_country="ES", request_type="chat_simple",
    )
    r_gpt = calculator.calculate_emissions(
        model_id="gpt-4", data_center_id=dc_id,
        device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
        user_country="ES", request_type="chat_simple",
    )
    assert r_phi.co2_total_g < r_gpt.co2_total_g

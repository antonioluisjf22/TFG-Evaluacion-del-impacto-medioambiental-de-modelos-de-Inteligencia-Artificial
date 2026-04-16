import pytest
import sys
import os

# Ajustar paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from app import create_app
from scripts.calculate_emissions import CarbonCalculator, EmissionResult
from scripts.environmental_labels import get_environmental_label, get_label_scale, get_percentile
from scripts.reports_generator import ReportGenerator
from app.services.calculator_service import CalculatorService
from app.services.report_service import ReportService


@pytest.fixture(scope="session")
def app():
    """Crea la aplicación Flask para testing."""
    app = create_app()
    app.config['TESTING'] = True
    return app


@pytest.fixture(scope="session")
def client(app):
    """Cliente de test Flask."""
    return app.test_client()


@pytest.fixture(scope="session")
def calculator():
    """Instancia del motor de cálculo (carga datasets una sola vez)."""
    return CarbonCalculator(use_realtime_carbon_intensity=False)


@pytest.fixture
def sample_params():
    """Parámetros de ejemplo para una consulta típica."""
    return {
        "model_id": "gpt-4",
        "data_center_id": "aws-us-east-1",
        "device_id": "laptop-macbook-air-m3",
        "network_id": "WiFi 6 802.11ax",
        "user_country": "ES",
        "request_type": "chat_simple",
        "inference_processor": "auto",
        "utilization": 0.7,
    }


@pytest.fixture
def sample_result(calculator, sample_params):
    """Resultado precalculado para reutilizar en tests."""
    return calculator.calculate_emissions(**sample_params)


@pytest.fixture
def report_generator(calculator):
    """Generador de reportes con datos del calculator."""
    return ReportGenerator(models_df=calculator.models_df)


@pytest.fixture(scope="session")
def all_model_ids(calculator):
    """Lista de todos los model_id del dataset real."""
    return calculator.models_df['model_id'].tolist()


@pytest.fixture(scope="session")
def all_dc_ids(calculator):
    """Lista de todos los dc_id del dataset real."""
    return calculator.data_centers_df['dc_id'].tolist()


@pytest.fixture(scope="session")
def all_device_ids(calculator):
    """Lista de todos los device_id del dataset real."""
    return calculator.devices_df['device_id'].tolist()


@pytest.fixture(scope="session")
def all_network_ids(calculator):
    """Lista de todos los network_type del dataset real."""
    return calculator.network_df['network_type'].tolist()


@pytest.fixture
def sample_custom_model():
    """Modelo personalizado mínimo para tests de entidades custom."""
    return {
        "model_name": "Custom Test Model",
        "num_parameters": 7e9,
        "energy_wh_per_1k_tokens": 0.05,
        "latency_ms_per_token": 10.0,
        "context_window": 4096,
        "max_output_tokens": 1024,
        "typical_request_type": "chat_simple",
    }


@pytest.fixture
def sample_custom_dc():
    """Datacenter personalizado mínimo para tests de custom DC."""
    return {
        "provider_name": "Custom DC",
        "region": "eu-test",
        "country_code": "ES",
        "pue": 1.3,
        "provider_renewable_pct": 50.0,
    }


@pytest.fixture
def sample_custom_device():
    """Dispositivo personalizado mínimo para tests de custom device."""
    return {
        "device_name": "Custom Device",
        "device_type": "laptop",
        "cpu_tdp_watts": 65.0,
        "inference_cpu_watts": 45.0,
        "gpu_tdp_watts": 0.0,
        "inference_gpu_watts": 0.0,
        "npu_tdp_watts": 0.0,
        "inference_npu_watts": 0.0,
        "system_idle_watts": 10.0,
        "has_npu": False,
        "primary_inference_target": "cpu",
    }


@pytest.fixture
def boundary_params_base(sample_params):
    """Copia de sample_params para modificar en tests de casos límite."""
    return dict(sample_params)

"""
Tests de rendimiento — Tiempos de respuesta.

Verifica que las operaciones clave se completan dentro de
umbrales aceptables. Si `pytest-benchmark` está instalado,
se usa; si no, se mide con `time.perf_counter`.
"""

import time
import pytest
from scripts.calculate_emissions import CarbonCalculator
from scripts.environmental_labels import get_environmental_label

try:
    import pytest_benchmark  # noqa: F401
    HAS_BENCHMARK = True
except ImportError:
    HAS_BENCHMARK = False


@pytest.fixture(scope="module")
def calc():
    return CarbonCalculator(use_realtime_carbon_intensity=False)


def _simple_timer(func, max_seconds, iterations=1):
    """Mide tiempo de ejecución sin pytest-benchmark."""
    start = time.perf_counter()
    for _ in range(iterations):
        func()
    elapsed = time.perf_counter() - start
    assert elapsed < max_seconds, f"Tardó {elapsed:.3f}s (máx {max_seconds}s)"
    return elapsed


@pytest.mark.performance
class TestCalculationTiming:

    def test_single_calculation_under_500ms(self, calc):
        """Una llamada a calculate_emissions < 500ms."""
        def run():
            calc.calculate_emissions(
                model_id="gpt-4", data_center_id="aws-us-east-1",
                device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
                user_country="ES", request_type="chat_simple",
            )
        _simple_timer(run, max_seconds=0.5)

    def test_100_calculations_under_5s(self, calc):
        """100 cálculos secuenciales < 5s (50ms/cálculo promedio)."""
        def run():
            calc.calculate_emissions(
                model_id="gpt-4", data_center_id="aws-us-east-1",
                device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
                user_country="ES", request_type="chat_simple",
            )
        _simple_timer(run, max_seconds=5.0, iterations=100)

    def test_label_lookup_1000_under_100ms(self):
        """1000 clasificaciones de etiquetas < 100ms."""
        import random
        random.seed(42)
        values = [random.uniform(0.0001, 1.0) for _ in range(1000)]

        def run():
            for v in values:
                get_environmental_label(v)
        _simple_timer(run, max_seconds=0.1)


@pytest.mark.performance
class TestInitializationTiming:

    def test_calculator_init_under_5s(self):
        """Inicialización del CarbonCalculator < 5s."""
        def run():
            CarbonCalculator(use_realtime_carbon_intensity=False)
        _simple_timer(run, max_seconds=5.0)


@pytest.mark.performance
class TestCompareAllTiming:

    @pytest.mark.slow
    def test_compare_all_models_under_10s(self, calc):
        """Calcular TODOS los modelos × 1 config < 10s."""
        available = calc.list_available()
        models = available.get('models', [])

        def run():
            for m in models:
                try:
                    calc.calculate_emissions(
                        model_id=m, data_center_id="aws-us-east-1",
                        device_id="laptop-macbook-air-m3",
                        network_id="WiFi 6 802.11ax",
                        user_country="ES", request_type="chat_simple",
                    )
                except (ValueError, KeyError):
                    pass
        _simple_timer(run, max_seconds=10.0)


@pytest.mark.performance
class TestAPIEndpointTiming:
    """Tiempos de respuesta de los endpoints HTTP (usando Flask test client)."""

    @pytest.fixture(scope="class")
    def client(self):
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
        from app import create_app
        app = create_app()
        app.config['TESTING'] = True
        return app.test_client()

    def test_options_endpoint_under_200ms(self, client):
        """GET /api/options < 200ms."""
        start = time.perf_counter()
        resp = client.get("/api/options")
        elapsed_ms = (time.perf_counter() - start) * 1000
        assert resp.status_code == 200
        assert elapsed_ms < 200, f"Tardó {elapsed_ms:.1f}ms (máx 200ms)"

    def test_calculate_endpoint_under_300ms(self, client):
        """POST /api/calculate < 300ms (modelo ya cargado)."""
        # Primer llamado carga los datos (warmup)
        client.post("/api/calculate", json={
            "model_id": "phi-2", "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3", "network_id": "WiFi 6 802.11ax",
        })
        # Medición real
        start = time.perf_counter()
        resp = client.post("/api/calculate", json={
            "model_id": "phi-2", "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3", "network_id": "WiFi 6 802.11ax",
            "request_type": "chat_simple",
        })
        elapsed_ms = (time.perf_counter() - start) * 1000
        assert resp.status_code == 200
        assert elapsed_ms < 300, f"Tardó {elapsed_ms:.1f}ms (máx 300ms)"

    def test_compare_endpoint_under_2s(self, client):
        """POST /api/compare (todos los modelos) < 2s."""
        # Warmup
        client.post("/api/compare", json={
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
        })
        start = time.perf_counter()
        resp = client.post("/api/compare", json={
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "request_type": "chat_simple",
        })
        elapsed = time.perf_counter() - start
        assert resp.status_code == 200
        assert elapsed < 2.0, f"Tardó {elapsed:.3f}s (máx 2s)"

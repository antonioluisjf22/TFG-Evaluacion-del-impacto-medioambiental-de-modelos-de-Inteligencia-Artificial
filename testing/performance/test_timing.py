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

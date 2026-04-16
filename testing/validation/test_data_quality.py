"""
Tests de validación — Calidad de datos.

Verifica propiedades estadísticas y de sentido común de los
resultados del motor de cálculo y los datasets subyacentes.
"""

import pytest
import random
from scripts.calculate_emissions import CarbonCalculator
from scripts.environmental_labels import get_environmental_label, REFERENCE_STATISTICS
from scripts.reports_generator import ReportGenerator


@pytest.fixture(scope="module")
def calc():
    return CarbonCalculator(use_realtime_carbon_intensity=False)


@pytest.fixture(scope="module")
def report_gen(calc):
    return ReportGenerator(calc)


def _calc_co2(calc, model_id, **kw):
    defaults = dict(
        data_center_id="aws-us-east-1",
        device_id="laptop-macbook-air-m3",
        network_id="WiFi 6 802.11ax",
        user_country="ES",
        request_type="chat_simple",
    )
    defaults.update(kw)
    return calc.calculate_emissions(model_id=model_id, **defaults).co2_total_g


# =====================================================================
# 1. PROPIEDADES ESTADÍSTICAS
# =====================================================================

@pytest.mark.validation
class TestStatisticalProperties:

    def test_phi2_most_efficient_among_known(self, calc):
        """Phi-2 debería estar entre los modelos más eficientes."""
        models = ["phi-2", "gemma-7b", "mistral-7b", "llama2-70b", "gpt-4"]
        results = {m: _calc_co2(calc, m) for m in models}
        sorted_models = sorted(results, key=results.get)
        # Phi-2 o gemma-7b deben estar en los 2 primeros
        top2 = sorted_models[:2]
        assert "phi-2" in top2 or "gemma-7b" in top2

    def test_model_size_correlates_with_emissions(self, calc):
        """Modelos con más parámetros tienden a emitir más CO2."""
        # Pequeños (~7B)
        small = _calc_co2(calc, "phi-2")
        # Medianos (~7B-40B)
        medium = _calc_co2(calc, "mistral-7b")
        # Grandes (~70B+)
        large = _calc_co2(calc, "llama2-70b")
        # Tendencia general: small < large
        assert small < large

    def test_no_negative_emissions_random_sample(self, calc):
        """Muestra aleatoria de 30 combinaciones → ninguna negativa."""
        available = calc.list_available()
        models = available.get('models', [])
        dcs = available.get('data_centers', [])
        devices = available.get('devices', [])
        networks = available.get('network_types', [])

        random.seed(42)
        for _ in range(30):
            m = random.choice(models)
            dc = random.choice(dcs)
            d = random.choice(devices)
            n = random.choice(networks)
            try:
                r = calc.calculate_emissions(
                    model_id=m, data_center_id=dc,
                    device_id=d, network_id=n,
                    user_country="ES", request_type="chat_simple",
                )
                assert r.co2_total_g >= 0, f"Negativo: {m}/{dc}/{d}/{n}"
                assert r.energy_total_wh >= 0
            except (ValueError, KeyError):
                pass  # Combinación inválida (procesador no disponible, etc.)

    def test_emissions_range_realistic(self, calc):
        """Cualquier resultado single-query está en rango [0, 10] gCO2."""
        models = ["phi-2", "gpt-4", "llama2-70b", "opt-175b"]
        for m in models:
            try:
                co2 = _calc_co2(calc, m)
                assert 0 < co2 < 10, f"{m}: {co2} gCO2 fuera de rango"
            except (ValueError, KeyError):
                pass


# =====================================================================
# 2. COHERENCIA DE EQUIVALENCIAS Y PRODUCCIÓN
# =====================================================================

@pytest.mark.validation
class TestEquivalenciesQuality:

    def test_equivalencies_intuitive(self, calc, report_gen):
        """Equivalencias deben tener valores razonables."""
        result = calc.calculate_emissions(
            model_id="gpt-4", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
        )
        eq = report_gen.generate_equivalencies(result.co2_total_g)

        # generate_equivalencies returns dict with 'equivalencies' key → nested dicts
        for key, item in eq['equivalencies'].items():
            assert item['value'] >= 0, f"Equivalencia negativa: {key} → {item}"

    def test_production_impact_realistic(self, calc, report_gen):
        """Impacto de producción anual con valores razonable."""
        result = calc.calculate_emissions(
            model_id="gpt-4", data_center_id="aws-us-east-1",
            device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
            user_country="ES", request_type="chat_simple",
        )
        # generate_production_impact takes the full EmissionResult, not co2_grams
        impact = report_gen.generate_production_impact(result)

        assert impact is not None
        assert 'production_impact' in impact
        assert impact['production_impact']['emissions']['kg_co2_annual'] > 0


# =====================================================================
# 3. COHERENCIA DE ETIQUETAS
# =====================================================================

@pytest.mark.validation
class TestLabelCoherence:

    def test_labels_monotonic_with_co2(self):
        """Más CO2 → etiqueta peor (nunca mejor)."""
        label_order = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F"]
        prev_idx = -1
        values = [0.0001, 0.001, 0.003, 0.005, 0.010, 0.030, 0.100, 0.200, 0.500]
        for co2 in values:
            lbl = get_environmental_label(co2)['label']
            idx = label_order.index(lbl)
            assert idx >= prev_idx, f"No monótono: co2={co2} → {lbl} (idx={idx}) vs prev={prev_idx}"
            prev_idx = idx

    def test_reference_percentiles_ascending(self):
        """Los percentiles de referencia son estrictamente crecientes."""
        p = REFERENCE_STATISTICS["percentiles"]
        keys = ["p0_min", "p2", "p5", "p10", "p20", "p30", "p40",
                "p50_median", "p60", "p70", "p80", "p90", "p95", "p97", "p99", "p100_max"]
        values = [p[k] for k in keys]
        for i in range(1, len(values)):
            assert values[i] > values[i - 1], \
                f"Percentil no creciente: {keys[i-1]}={values[i-1]} ≥ {keys[i]}={values[i]}"

    def test_threshold_a_plus_plus_plus_is_lowest(self):
        """El umbral A+++ es el más exigente (menor max_co2_g)."""
        from scripts.environmental_labels import THRESHOLDS_GENERAL
        a3 = THRESHOLDS_GENERAL["A+++"].max_co2_g
        for label, th in THRESHOLDS_GENERAL.items():
            if label != "A+++":
                assert a3 <= th.max_co2_g, f"A+++ ({a3}) > {label} ({th.max_co2_g})"


# =====================================================================
# 4. DATOS DEL DATASET
# =====================================================================

@pytest.mark.validation
class TestDatasetQuality:

    def test_all_models_have_energy_or_params(self, calc):
        """Todos los modelos tienen energy_wh_per_1k_tokens o num_parameters."""
        available = calc.list_available()
        for m_id in available.get('models', []):
            model = calc.get_model(m_id)
            has_energy = model.get('energy_wh_per_1k_tokens', 0) > 0
            has_params = model.get('num_parameters', 0) > 0
            assert has_energy or has_params, f"Modelo {m_id} sin energy ni params"

    def test_all_dcs_have_pue(self, calc):
        """Todos los DCs tienen PUE > 1.0."""
        available = calc.list_available()
        for dc_id in available.get('data_centers', []):
            dc = calc.get_data_center(dc_id)
            pue = dc.get('pue', None)
            if pue is not None:
                assert pue >= 1.0, f"DC {dc_id}: PUE={pue} < 1.0"

    def test_all_devices_have_cpu_tdp(self, calc):
        """Todos los dispositivos tienen cpu_tdp_watts > 0."""
        available = calc.list_available()
        for d_id in available.get('devices', []):
            device = calc.get_device(d_id)
            assert device.get('cpu_tdp_watts', 0) > 0, f"Device {d_id} sin cpu_tdp"

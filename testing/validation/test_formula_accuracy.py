"""
Tests de validación — Exactitud de fórmulas.

Reproduce manualmente cada fórmula del modelo de cálculo y compara
el resultado con el valor devuelto por la calculadora. Cada test
documenta en su docstring el cálculo paso a paso.

FÓRMULAS CLAVE:
  - Dispositivo: P_real = P_idle + (P_inference - P_idle) × U
  - Red: CO2_red = (data_GB) × (energy_kWh_per_GB × CI / 1000) × 1000
  - DC: E_dc = (tokens/1000) × energy_wh_per_1k × PUE
  - Tokens→MB: data_mb = (1200 + tokens × 5) / 1_000_000
"""

import pytest
from scripts.calculate_emissions import CarbonCalculator, DEFAULT_CARBON_INTENSITY


@pytest.fixture(scope="module")
def calc():
    return CarbonCalculator(use_realtime_carbon_intensity=False)


def _get_result(calc, **overrides):
    """Helper: calcula con parámetros base + overrides."""
    base = dict(
        model_id="gpt-4", data_center_id="aws-us-east-1",
        device_id="laptop-macbook-air-m3", network_id="WiFi 6 802.11ax",
        user_country="ES", request_type="chat_simple",
        inference_processor="auto", utilization=0.7,
    )
    base.update(overrides)
    return calc.calculate_emissions(**base)


# =====================================================================
# 1. FÓRMULA DEL DISPOSITIVO
# =====================================================================

@pytest.mark.validation
class TestDeviceFormula:
    """Verifica:  P_real = P_idle + (P_inf_max - P_idle) × U
                  E_device_wh = P_real × (t / 3600)
                  CO2_device = (E_device_wh / 1000) × CI_local
    """

    def test_dynamic_power_formula(self, calc):
        """
        P_real = P_idle + (P_inference - P_idle) × U

        Usando laptop-macbook-air-m3:
          P_idle, P_inference, cpu_tdp se leen del dispositivo real.
          P_real se calcula y se verifica contra step_p_real_w.
        """
        r = _get_result(calc, utilization=0.7)
        p_idle = r.step_p_idle_w
        p_inf = r.processor_watts  # P_inference_max del procesador seleccionado
        expected_p_real = p_idle + (p_inf - p_idle) * r.step_utilization

        # device_watts se clamp a [p_idle, cpu_tdp]
        device = calc.get_device("laptop-macbook-air-m3")
        processor = device.get('primary_inference_target', 'cpu').lower()
        if processor == "gpu":
            tdp = device.get('gpu_tdp_watts', 50)
        elif processor == "npu":
            tdp = device.get('npu_tdp_watts', 50)
        else:
            tdp = device.get('cpu_tdp_watts', 50)
        clamped = max(p_idle, min(tdp, expected_p_real))

        assert r.step_p_real_w == pytest.approx(clamped, rel=1e-6)

    def test_device_energy_wh(self, calc):
        """E_device = P_real(W) × t(s) / 3600  →  Wh"""
        r = _get_result(calc)
        expected_wh = r.step_p_real_w * (r.inference_time_sec / 3600)
        assert r.energy_device_wh == pytest.approx(expected_wh, rel=1e-6)

    def test_device_co2_g(self, calc):
        """CO2_device = (E_device_wh / 1000) × CI_local(gCO2/kWh)"""
        r = _get_result(calc, user_country="ES")
        ci_es = DEFAULT_CARBON_INTENSITY["ES"]  # 145
        expected_co2 = (r.energy_device_wh / 1000) * ci_es
        assert r.co2_device_g == pytest.approx(expected_co2, rel=1e-3)

    def test_utilization_zero_equals_idle(self, calc):
        """U=0 → P_real ≈ P_idle"""
        r = _get_result(calc, utilization=0.0)
        assert r.step_p_real_w == pytest.approx(r.step_p_idle_w, rel=1e-6)

    def test_utilization_one_equals_max(self, calc):
        """U=1 → P_real = min(P_inference_max, TDP)"""
        r = _get_result(calc, utilization=1.0)
        assert r.step_p_real_w >= r.step_p_idle_w
        assert r.step_p_real_w <= r.processor_watts + 1.0  # margin for float


# =====================================================================
# 2. FÓRMULA DE TOKENS → MB
# =====================================================================

@pytest.mark.validation
class TestTokensToMB:
    """Verifica: data_mb = (1200 + tokens_total × 5) / 1_000_000"""

    def test_chat_simple_tokens_to_mb(self, calc):
        """chat_simple = 70+215 = 285 tokens → (1200 + 285×5)/1e6"""
        r = _get_result(calc, request_type="chat_simple")
        total_tokens = 70 + 215  # chat_simple
        expected_mb = (1200 + total_tokens * 5) / 1_000_000
        assert r.step_data_mb == pytest.approx(expected_mb, rel=1e-6)

    def test_generation_long_tokens_to_mb(self, calc):
        """generation_long = 50+2048 = 2098 tokens → (1200+2098×5)/1e6"""
        r = _get_result(calc, request_type="generation_long")
        total_tokens = 50 + 2048
        expected_mb = (1200 + total_tokens * 5) / 1_000_000
        assert r.step_data_mb == pytest.approx(expected_mb, rel=1e-6)

    def test_explicit_tokens_to_mb(self, calc):
        """tokens_input=100, tokens_output=900 → 1000 tokens."""
        r = _get_result(calc, tokens_input=100, tokens_output=900, request_type=None)
        expected_mb = (1200 + 1000 * 5) / 1_000_000
        assert r.step_data_mb == pytest.approx(expected_mb, rel=1e-6)


# =====================================================================
# 3. FÓRMULA DE RED
# =====================================================================

@pytest.mark.validation
class TestNetworkFormula:
    """Verifica:
       energy_network_wh = energy_kWh_per_MB × data_mb × 1000
       data_gb = data_mb / 1000
       co2_network_g = data_gb × (energy_kWh_per_GB × CI / 1000) × 1000
    """

    def test_network_energy_wh(self, calc):
        """E_net = energy_kWh_per_MB × data_MB × 1000  →  Wh"""
        r = _get_result(calc)
        expected_wh = r.step_net_kWh_per_mb * r.step_data_mb * 1000
        assert r.energy_network_wh == pytest.approx(expected_wh, rel=1e-6)

    def test_network_co2_g(self, calc):
        """CO2_net = (data_mb/1000) × (energy_kWh_per_GB × CI/1000) × 1000"""
        r = _get_result(calc, user_country="ES")
        ci = DEFAULT_CARBON_INTENSITY["ES"]
        data_gb = r.step_data_mb / 1000
        carbon_per_gb = r.step_net_kWh_per_gb * ci / 1000  # kg CO2/GB
        expected_co2 = data_gb * carbon_per_gb * 1000  # g CO2
        assert r.co2_network_g == pytest.approx(expected_co2, rel=1e-3)

    def test_fiber_vs_4g_energy_factor(self, calc):
        """Fiber kWh/MB < 4G kWh/MB (propiedad física)."""
        r_fiber = _get_result(calc, network_id="Fiber FTTH")
        r_4g = _get_result(calc, network_id="4G LTE")
        assert r_fiber.step_net_kWh_per_mb < r_4g.step_net_kWh_per_mb


# =====================================================================
# 4. FÓRMULA DEL DATA CENTER
# =====================================================================

@pytest.mark.validation
class TestDataCenterFormula:
    """Verifica:
       E_compute = (tokens/1000) × energy_wh_per_1k_tokens
       E_dc = E_compute × PUE
       CO2_dc = (E_dc / 1000) × CI_dc
    """

    def test_energy_compute_from_model(self, calc):
        """
        E_compute = (tokens / 1000) × energy_wh_per_1k_tokens
        Usando gpt-4 con chat_simple (285 tokens).
        """
        r = _get_result(calc, request_type="chat_simple")
        model = calc.get_model("gpt-4")
        ewh_per_1k = model.get('energy_wh_per_1k_tokens', 0)
        total_tokens = 70 + 215  # chat_simple
        expected_compute = (total_tokens / 1000) * ewh_per_1k
        assert r.step_energy_compute_wh == pytest.approx(expected_compute, rel=1e-4)

    def test_pue_multiplier(self, calc):
        """E_dc_total = E_compute × PUE"""
        r = _get_result(calc)
        expected_dc_wh = r.step_energy_compute_wh * r.step_pue
        assert r.energy_datacenter_wh == pytest.approx(expected_dc_wh, rel=1e-6)

    def test_datacenter_co2_g(self, calc):
        """CO2_dc = (E_dc / 1000) × CI_dc"""
        r = _get_result(calc)
        expected_co2 = (r.energy_datacenter_wh / 1000) * r.dc_carbon_intensity
        assert r.co2_datacenter_g == pytest.approx(expected_co2, rel=1e-3)


# =====================================================================
# 5. IDENTIDAD TOTAL
# =====================================================================

@pytest.mark.validation
class TestTotalIdentity:
    """Verifica: CO2_total = CO2_device + CO2_network + CO2_datacenter"""

    def test_co2_total_is_sum_of_components(self, calc):
        """La suma de componentes iguala el total."""
        r = _get_result(calc)
        expected = r.co2_device_g + r.co2_network_g + r.co2_datacenter_g
        assert r.co2_total_g == pytest.approx(expected, rel=1e-9)

    def test_energy_total_is_sum_of_components(self, calc):
        """La suma de energías iguala energy_total_wh."""
        r = _get_result(calc)
        expected = r.energy_device_wh + r.energy_network_wh + r.energy_datacenter_wh
        assert r.energy_total_wh == pytest.approx(expected, rel=1e-9)

    def test_total_identity_across_request_types(self, calc):
        """Identidad válida para todos los request types."""
        for rt in ["chat_simple", "chat_extended", "generation_short",
                    "generation_long", "summarization", "code_generation", "translation"]:
            r = _get_result(calc, request_type=rt)
            expected = r.co2_device_g + r.co2_network_g + r.co2_datacenter_g
            assert r.co2_total_g == pytest.approx(expected, rel=1e-9), \
                f"Identidad rota para request_type={rt}"


# =====================================================================
# 6. FÓRMULA DE TIEMPO DE INFERENCIA
# =====================================================================

@pytest.mark.validation
class TestInferenceTimeFormula:
    """Verifica: t_inf = latency_ms_per_token × tokens_output / 1000"""

    def test_auto_inference_time(self, calc):
        """Tiempo inferido = latency_per_token × tokens_output."""
        model = calc.get_model("gpt-4")
        latency_ms = model.get('latency_ms_per_token', 20)
        tokens_out = 215  # chat_simple
        expected_sec = (latency_ms * tokens_out) / 1000

        r = _get_result(calc, request_type="chat_simple")
        assert r.inference_time_sec == pytest.approx(expected_sec, rel=1e-6)

    def test_explicit_time_overrides_auto(self, calc):
        """inference_time_sec explícito prevalece sobre el automático."""
        r = _get_result(calc, inference_time_sec=5.0)
        assert r.inference_time_sec == 5.0

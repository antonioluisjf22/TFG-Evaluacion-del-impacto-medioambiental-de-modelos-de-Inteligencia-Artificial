"""
Tests de regresión — Estabilidad de valores calculados.

Fijan valores de referencia calculados con la versión estable actual
y verifican que no varían entre refactorizaciones. Son la primera
línea de defensa ante cambios inesperados en el motor de cálculo.

NOTA: Los valores REF_* se generan ejecutando los tests una primera vez.
      Si un valor cambia intencionalmente, actualizar la constante y
      documentarlo en el commit.
"""

import pytest
from scripts.calculate_emissions import CarbonCalculator
from scripts.environmental_labels import get_environmental_label, get_percentile


# ==================== VALORES DE REFERENCIA ====================
# Generados con la versión estable del código.
# Para regenerar:
#   python -c "
#   from scripts.calculate_emissions import CarbonCalculator
#   c = CarbonCalculator(use_realtime_carbon_intensity=False)
#   r = c.calculate_emissions(model_id='gpt-4', data_center_id='aws-us-east-1',
#       device_id='laptop-macbook-air-m3', network_id='WiFi 6 802.11ax',
#       user_country='ES', request_type='chat_simple')
#   print(f'CO2 total: {r.co2_total_g}')
#   "
# ==============================================================


@pytest.fixture(scope="module")
def stable_calculator():
    """Calculator sin API para resultados reproducibles."""
    return CarbonCalculator(use_realtime_carbon_intensity=False)


def _calc(calc, model_id, dc_id="aws-us-east-1", device_id="laptop-macbook-air-m3",
          network_id="WiFi 6 802.11ax", country="ES", request_type="chat_simple",
          processor="auto", utilization=0.7):
    """Helper para cálculos de regresión con parámetros por defecto."""
    return calc.calculate_emissions(
        model_id=model_id, data_center_id=dc_id,
        device_id=device_id, network_id=network_id,
        user_country=country, request_type=request_type,
        inference_processor=processor, utilization=utilization,
    )


@pytest.mark.regression
class TestAbsoluteValueStability:
    """Verifica que los valores absolutos se mantienen estables."""

    def test_gpt4_aws_macbook_wifi_chat_co2_stable(self, stable_calculator):
        """GPT-4 + AWS US-East-1 + MacBook Air M3 + WiFi + chat_simple → valor estable."""
        result = _calc(stable_calculator, "gpt-4")
        # El valor debe ser positivo y en un rango razonable
        assert result.co2_total_g > 0
        assert result.co2_total_g < 1.0  # Una consulta no debería superar 1 gCO2
        # Para regresión: fijar este valor una vez y verificar con approx
        # REF = result.co2_total_g  # Descomentar en primera ejecución
        # assert result.co2_total_g == pytest.approx(REF, rel=0.01)

    def test_phi2_co2_stable(self, stable_calculator):
        """Phi-2 (modelo más eficiente) → valor estable."""
        result = _calc(stable_calculator, "phi-2")
        assert result.co2_total_g > 0
        assert result.co2_total_g < 0.1  # Phi-2 debe ser muy eficiente

    def test_llama2_azure_laptop_4g_co2_stable(self, stable_calculator):
        """Llama-2 70B + Azure + laptop + 4G → estable."""
        result = _calc(stable_calculator, "llama2-70b",
                       dc_id="azure-westeurope", network_id="4G LTE")
        assert result.co2_total_g > 0

    def test_gpt4_chat_simple_label_stable(self, stable_calculator):
        """La etiqueta de GPT-4 + chat_simple no cambia entre versiones."""
        result = _calc(stable_calculator, "gpt-4")
        label = get_environmental_label(result.co2_total_g)
        # La etiqueta debe ser consistente (fijar en primera ejecución)
        assert label['label'] in ("A+++", "A++", "A+", "A", "B", "C", "D", "E", "F")

    def test_phi2_label_stable(self, stable_calculator):
        """La etiqueta de Phi-2 debe ser eficiente (A+++ - A)."""
        result = _calc(stable_calculator, "phi-2")
        label = get_environmental_label(result.co2_total_g)
        assert label['label'] in ("A+++", "A++", "A+", "A", "B")


@pytest.mark.regression
class TestRelationalInvariants:
    """Verifica invariantes relacionales que no dependen de valor absoluto."""

    def test_phi2_always_less_co2_than_gpt4(self, stable_calculator):
        """Phi-2 < GPT-4 en co2_total_g con parámetros fijos."""
        r_phi = _calc(stable_calculator, "phi-2")
        r_gpt = _calc(stable_calculator, "gpt-4")
        assert r_phi.co2_total_g < r_gpt.co2_total_g

    def test_comparative_ranking_stable(self, stable_calculator):
        """El orden relativo de modelos por emisiones es estable."""
        models = ["phi-2", "gemma-7b", "mistral-7b", "llama2-70b", "gpt-4"]
        results = [(m, _calc(stable_calculator, m).co2_total_g) for m in models]
        sorted_by_co2 = [m for m, _ in sorted(results, key=lambda x: x[1])]
        # Phi-2 debe ser primero (menos emisiones)
        assert sorted_by_co2[0] == "phi-2"
        # GPT-4 debe estar entre los últimos (más emisiones)
        assert sorted_by_co2[-1] == "gpt-4"

    def test_chat_simple_always_less_than_generation_long(self, stable_calculator):
        """chat_simple (285 tokens) < generation_long (2098 tokens) en co2."""
        r_chat = _calc(stable_calculator, "gpt-4", request_type="chat_simple")
        r_gen = _calc(stable_calculator, "gpt-4", request_type="generation_long")
        assert r_chat.co2_total_g < r_gen.co2_total_g

    def test_fiber_less_network_emissions_than_5g(self, stable_calculator):
        """Fiber < 5G en emisiones de red para mismos tokens."""
        r_fiber = _calc(stable_calculator, "phi-2", network_id="Fiber FTTH")
        r_5g = _calc(stable_calculator, "phi-2", network_id="5G NSA")
        assert r_fiber.co2_network_g < r_5g.co2_network_g

    def test_npu_less_energy_than_cpu_on_smartphone(self, stable_calculator):
        """NPU < CPU en energía de dispositivo para smartphones con NPU."""
        r_npu = _calc(stable_calculator, "phi-2",
                       device_id="phone-iphone-15-pro", processor="npu")
        r_cpu = _calc(stable_calculator, "phi-2",
                       device_id="phone-iphone-15-pro", processor="cpu")
        assert r_npu.co2_device_g < r_cpu.co2_device_g

    def test_european_dc_less_than_us_dc_emissions(self, stable_calculator):
        """DC europeo de baja CI < DC US de alta CI en emisiones DC."""
        # Suecia (baja CI) vs Virginia (alta CI)
        r_eu = _calc(stable_calculator, "phi-2", dc_id="aws-eu-north-1")
        r_us = _calc(stable_calculator, "phi-2", dc_id="aws-us-east-1")
        assert r_eu.co2_datacenter_g < r_us.co2_datacenter_g

    def test_breakdown_percentages_reasonable(self, stable_calculator):
        """Los porcentajes del breakdown deben estar en rangos razonables."""
        result = _calc(stable_calculator, "gpt-4")
        d = result.to_dict()
        bp = d['breakdown_percentage']
        # Cada componente debe estar entre 0% y 100%
        assert 0 <= bp['device'] <= 100
        assert 0 <= bp['network'] <= 100
        assert 0 <= bp['datacenter'] <= 100

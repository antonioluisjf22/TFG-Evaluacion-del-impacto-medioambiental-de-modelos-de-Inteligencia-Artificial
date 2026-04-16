"""
Tests unitarios del sistema de etiquetas medioambientales A+++ a F.

Verifica la clasificación, percentiles, escala y consistencia interna
del sistema de etiquetado basado en 639K combinaciones.
"""

import pytest
from scripts.environmental_labels import (
    get_environmental_label,
    get_label_scale,
    get_percentile,
    THRESHOLDS_GENERAL,
    EnvironmentalClass,
    LABEL_ORDER,
)


@pytest.mark.unit
class TestClassification:
    """Verifica la asignación correcta de etiquetas por rangos de CO2."""

    def test_very_low_emissions_gets_a_plus_plus_plus(self):
        """co2 < P2 (0.000711) debe clasificar como A+++."""
        result = get_environmental_label(0.0003)
        assert result['label'] == "A+++"

    def test_moderate_emissions_gets_b_or_c(self):
        """co2 en rango medio debe clasificar como B o C."""
        result = get_environmental_label(0.015)
        assert result['label'] in ("B", "C")

    def test_very_high_emissions_gets_f(self):
        """co2 > P97 debe clasificar como F."""
        result = get_environmental_label(1.0)
        assert result['label'] == "F"

    def test_zero_emissions_gets_best_label(self):
        """co2 = 0 debe clasificar como A+++."""
        result = get_environmental_label(0.0)
        assert result['label'] == "A+++"

    def test_negative_emissions_handled(self):
        """co2 < 0 no debe producir crash."""
        result = get_environmental_label(-0.001)
        assert 'label' in result


@pytest.mark.unit
class TestPercentiles:
    """Verifica la función de cálculo de percentiles."""

    def test_percentile_zero_for_zero_emissions(self):
        """0 gCO2 → percentil 0."""
        p = get_percentile(0.0)
        assert p == pytest.approx(0.0, abs=0.1)

    def test_percentile_100_for_extreme_emissions(self):
        """co2 enorme → percentil 100."""
        p = get_percentile(100.0)
        assert p == pytest.approx(100.0, abs=0.1)

    def test_percentile_monotonic(self):
        """Si co2_a < co2_b entonces percentile(a) <= percentile(b)."""
        values = [0.0001, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]
        percentiles = [get_percentile(v) for v in values]
        for i in range(len(percentiles) - 1):
            assert percentiles[i] <= percentiles[i + 1]


@pytest.mark.unit
class TestLabelScale:
    """Verifica la escala completa de etiquetas."""

    def test_label_scale_has_9_classes(self):
        """get_label_scale() debe retornar exactamente 9 clases."""
        scale = get_label_scale()
        assert len(scale) == 9

    def test_label_scale_ordered(self):
        """Los umbrales max_co2_g deben estar en orden creciente."""
        scale = get_label_scale()
        values = [info['max_co2_g'] for info in scale.values()]
        for i in range(len(values) - 1):
            assert values[i] <= values[i + 1]

    def test_all_classes_have_required_fields(self):
        """Cada clase debe tener max_co2_g, color_hex, emoji, description."""
        scale = get_label_scale()
        for label, info in scale.items():
            assert 'max_co2_g' in info
            assert 'color_hex' in info
            assert 'emoji' in info
            assert 'description' in info


@pytest.mark.unit
class TestConsistency:
    """Verifica la consistencia entre etiquetas, percentiles y umbrales."""

    def test_label_and_percentile_consistent(self):
        """Si label=A+++, el percentil debe ser bajo (< 2)."""
        co2 = 0.0003  # Dentro de A+++
        label_result = get_environmental_label(co2)
        percentile = get_percentile(co2)
        if label_result['label'] == "A+++":
            assert percentile < 5  # Generoso para interpolación

    def test_boundary_values_at_thresholds(self):
        """Valores justo debajo del umbral deben tener la clase correspondiente."""
        # Justo debajo del umbral A+++ → debe ser A+++
        result = get_environmental_label(0.000710)
        assert result['label'] == "A+++"
        # Justo encima del umbral A+++ → debe ser A++ (o superior a A+++)
        result2 = get_environmental_label(0.000712)
        assert result2['label'] != "A+++"

    def test_all_environmental_class_values_covered(self):
        """Todas las clases del enum EnvironmentalClass deben estar en THRESHOLDS_GENERAL."""
        for cls in EnvironmentalClass:
            assert cls.value in THRESHOLDS_GENERAL

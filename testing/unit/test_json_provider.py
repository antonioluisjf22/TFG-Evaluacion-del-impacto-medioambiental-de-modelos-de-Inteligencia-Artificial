"""
Tests unitarios de _SafeJSONProvider.

Verifica la sanitización de Infinity y NaN en respuestas JSON de Flask.
"""

import pytest
import math
import json


@pytest.mark.unit
class TestSafeJSONProvider:
    """Verifica que _SafeJSONProvider sanitiza valores no-JSON correctamente."""

    def test_infinity_serialized_as_null(self, app):
        """float('inf') debe convertirse a null en JSON."""
        from app import _SafeJSONProvider
        result = _SafeJSONProvider._sanitize(float('inf'))
        assert result is None

    def test_nan_serialized_as_null(self, app):
        """float('nan') debe convertirse a null en JSON."""
        from app import _SafeJSONProvider
        result = _SafeJSONProvider._sanitize(float('nan'))
        assert result is None

    def test_normal_floats_preserved(self, app):
        """Floats normales no deben cambiar."""
        from app import _SafeJSONProvider
        assert _SafeJSONProvider._sanitize(3.14) == 3.14

    def test_nested_infinity_sanitized(self, app):
        """Dict anidado con Infinity debe sanitizarse recursivamente."""
        from app import _SafeJSONProvider
        data = {"a": 1.0, "b": {"c": float('inf'), "d": 2.0}}
        result = _SafeJSONProvider._sanitize(data)
        assert result['b']['c'] is None
        assert result['b']['d'] == 2.0

    def test_list_with_nan_sanitized(self, app):
        """Lista con NaN debe tener cada NaN reemplazado por None."""
        from app import _SafeJSONProvider
        data = [1.0, float('nan'), 3.0]
        result = _SafeJSONProvider._sanitize(data)
        assert result[0] == 1.0
        assert result[1] is None
        assert result[2] == 3.0

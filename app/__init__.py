"""
Aplicación web Flask — Calculadora de Carbono para Inferencia de IA
"""

import math
import os
import sys
from flask import Flask
from flask.json.provider import DefaultJSONProvider

# Añadir directorio scripts/ al path para importar módulos existentes
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)


class _SafeJSONProvider(DefaultJSONProvider):
    """JSON provider que convierte Infinity y NaN a null (JSON válido)."""

    @staticmethod
    def _sanitize(obj):
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return None
            return obj
        if isinstance(obj, dict):
            return {k: _SafeJSONProvider._sanitize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_SafeJSONProvider._sanitize(v) for v in obj]
        return obj

    def dumps(self, obj, **kwargs):
        return super().dumps(self._sanitize(obj), **kwargs)


def create_app():
    """Factory de la aplicación Flask."""
    app = Flask(__name__)
    app.json_provider_class = _SafeJSONProvider
    app.json = _SafeJSONProvider(app)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "tfg-carbon-calculator-dev")

    # Registrar blueprints
    from app.routes.main import main_bp
    from app.routes.api import api_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    return app

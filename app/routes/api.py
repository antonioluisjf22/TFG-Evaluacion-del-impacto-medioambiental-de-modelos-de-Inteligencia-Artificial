"""
Endpoints REST de la API (/api/...).
"""

from flask import Blueprint, jsonify, request

from app.services.calculator_service import CalculatorService
from app.services.report_service import ReportService

api_bp = Blueprint("api", __name__)

# Instancias de servicios (se crean una sola vez al arrancar)
_calc_service: CalculatorService | None = None
_report_service: ReportService | None = None


def _get_services():
    global _calc_service, _report_service
    if _calc_service is None:
        _calc_service = CalculatorService()
        _report_service = ReportService(models_df=_calc_service.calculator.models_df)
    return _calc_service, _report_service


# ------------------------------------------------------------------
# GET /api/options — catálogos para el formulario
# ------------------------------------------------------------------

@api_bp.route("/options", methods=["GET"])
def options():
    """Devuelve los catálogos de modelos, DCs, dispositivos, redes, etc."""
    calc, _ = _get_services()
    return jsonify(calc.get_options())


# ------------------------------------------------------------------
# POST /api/calculate — cálculo de emisiones
# ------------------------------------------------------------------

@api_bp.route("/calculate", methods=["POST"])
def calculate():
    """
    Calcula emisiones para un escenario concreto.

    Body JSON esperado:
        {
            "model_id": "gpt-4",
            "data_center_id": "aws-eu-west-1",
            "device_id": "phone-iphone-15-pro",
            "network_id": "WiFi 6 802.11ax",
            "user_country": "ES",                 // opcional, default "ES"
            "request_type": "chat_simple",         // opcional
            "tokens_input": 70,                    // opcional (prioridad sobre request_type)
            "tokens_output": 215,                  // opcional
            "inference_processor": "auto",         // opcional
            "utilization": 0.7                     // opcional
        }

    Respuesta JSON: EmissionResult.to_dict() + etiqueta ambiental.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Se requiere un body JSON"}), 400

    required = ["model_id", "data_center_id", "device_id", "network_id"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Campos obligatorios faltantes: {missing}"}), 400

    # Convertir tipos numéricos que pueden llegar como string desde el front
    params = _sanitize_params(data)

    calc, reports = _get_services()

    try:
        result = calc.calculate(params)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    response = result.to_dict()

    # Añadir etiqueta ambiental al resultado
    label_data = reports.energy_label(result)
    response["environmental_label"] = label_data

    # Equivalencias para una sola query
    response["equivalencies"] = reports.equivalencies(result.co2_total_g, scale=1)

    return jsonify(response)


# ------------------------------------------------------------------
# POST /api/compare — comparativa de todos los modelos
# ------------------------------------------------------------------

@api_bp.route("/compare", methods=["POST"])
def compare():
    """
    Compara TODOS los modelos manteniendo el resto de parámetros fijos.

    Body JSON: mismos campos que /api/calculate (sin model_id).
    Respuesta: tabla comparativa + label por modelo.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Se requiere un body JSON"}), 400

    required = ["data_center_id", "device_id", "network_id"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Campos obligatorios faltantes: {missing}"}), 400

    params = _sanitize_params(data)
    calc, reports = _get_services()

    results = calc.compare_models(params)
    if not results:
        return jsonify({"error": "No se pudieron calcular emisiones para ningún modelo"}), 500

    comparative = reports.comparative(results)

    # Añadir etiqueta ambiental a cada fila
    for row, result in zip(comparative.get("comparative_table", []), results):
        label_data = reports.energy_label(result)
        row["environmental_label"] = label_data.get("label", {})

    return jsonify(comparative)


# ------------------------------------------------------------------
# POST /api/report/breakdown — desglose para gráficos
# ------------------------------------------------------------------

@api_bp.route("/report/breakdown", methods=["POST"])
def report_breakdown():
    """Genera datos de desglose a partir de un cálculo previo."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Se requiere un body JSON"}), 400

    params = _sanitize_params(data)
    calc, reports = _get_services()

    try:
        result = calc.calculate(params)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(reports.breakdown(result))


# ------------------------------------------------------------------
# POST /api/report/production — impacto a escala
# ------------------------------------------------------------------

@api_bp.route("/report/production", methods=["POST"])
def report_production():
    """
    Estima impacto a escala de producción.

    Body JSON adicional:
        "queries_per_day": 1000000,   // opcional
        "days_per_year": 365          // opcional
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Se requiere un body JSON"}), 400

    params = _sanitize_params(data)
    queries_per_day = int(data.get("queries_per_day", 1_000_000))
    days_per_year = int(data.get("days_per_year", 365))

    calc, reports = _get_services()

    try:
        result = calc.calculate(params)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(reports.production_impact(result, queries_per_day, days_per_year))


# ------------------------------------------------------------------
# GET /api/map-data — datos geográficos para el mapa
# ------------------------------------------------------------------

@api_bp.route("/map-data", methods=["GET"])
def map_data():
    """
    Devuelve datos de data centers con coordenadas para el mapa Leaflet.
    """
    calc, _ = _get_services()
    dc_df = calc.calculator.data_centers_df
    ci_df = calc.calculator.dc_ci_df

    if dc_df is None:
        return jsonify({"data_centers": [], "countries": []})

    # Data centers con CI si está disponible
    dcs = []
    for _, row in dc_df.iterrows():
        dc_id = row["dc_id"]
        dc_entry = {
            "dc_id": dc_id,
            "provider": row.get("provider_name", ""),
            "region": row.get("region", ""),
            "country_code": row.get("country_code", ""),
            "pue": float(row.get("pue", 1.15)),
            "provider_renewable_pct": _safe_float(row.get("provider_renewable_pct")),
        }
        # Añadir CI si disponible
        if ci_df is not None:
            ci_match = ci_df[ci_df["dc_id"] == dc_id]
            if len(ci_match) > 0:
                ci_row = ci_match.iloc[0]
                dc_entry["carbon_intensity"] = _safe_float(ci_row.get("carbon_intensity_gCO2_kWh"))
                dc_entry["renewable_pct"] = _safe_float(ci_row.get("renewable_pct"))
                dc_entry["latitude"] = _safe_float(ci_row.get("latitude"))
                dc_entry["longitude"] = _safe_float(ci_row.get("longitude"))

        dcs.append(dc_entry)

    # Países con CI
    countries = sorted(calc._get_countries_list(), key=lambda x: x["code"])

    return jsonify({"data_centers": dcs, "countries": countries})


# ------------------------------------------------------------------
# Utilidades
# ------------------------------------------------------------------

def _sanitize_params(data: dict) -> dict:
    """Normaliza tipos del JSON del frontend."""
    params = dict(data)
    # Tokens: convertir a int si vienen como string
    for key in ("tokens_input", "tokens_output"):
        if key in params and params[key] is not None:
            params[key] = int(params[key])
    # Utilización: float
    if "utilization" in params and params["utilization"] is not None:
        params["utilization"] = float(params["utilization"])
    return params


def _safe_float(value) -> float | None:
    """Convierte a float o devuelve None si no es posible."""
    if value is None:
        return None
    try:
        import math
        f = float(value)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None

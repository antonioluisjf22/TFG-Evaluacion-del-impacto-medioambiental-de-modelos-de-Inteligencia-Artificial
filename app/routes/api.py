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
# GET /api/health — estado interno del servicio
# ------------------------------------------------------------------

@api_bp.route("/health", methods=["GET"])
def health():
    """Healthcheck con estado de los servicios internos."""
    import os
    status = {"status": "ok", "services": {}}

    # Verificar que los servicios de dominio están cargados
    try:
        calc, _ = _get_services()
        n_models = len(calc.calculator.models_df)
        status["services"]["calculator"] = {"status": "ok", "models_loaded": n_models}
    except Exception as exc:  # noqa: BLE001
        status["status"] = "degraded"
        status["services"]["calculator"] = {"status": "error", "detail": str(exc)}

    # Verificar disponibilidad de la API de Electricity Maps
    api_key = os.environ.get("ELECTRICITY_MAPS_API_KEY", "")
    status["services"]["electricity_maps_api"] = {
        "status": "configured" if api_key else "offline",
        "mode": "realtime" if api_key else "fallback_csv",
    }

    http_status = 200 if status["status"] == "ok" else 503
    return jsonify(status), http_status


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

    # Validar que los IDs __custom__ vengan acompañados de su dict
    _CUSTOM_COMPANION = {
        "model_id": "custom_model",
        "data_center_id": "custom_dc",
        "device_id": "custom_device",
        "network_id": "custom_network",
    }
    for id_field, dict_field in _CUSTOM_COMPANION.items():
        if data.get(id_field) == "__custom__" and not data.get(dict_field):
            return jsonify({"error": f"'{id_field}' es '__custom__' pero falta '{dict_field}'"}), 400

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

    # Validar custom companions para compare
    _COMPARE_COMPANIONS = {
        "data_center_id": "custom_dc",
        "device_id": "custom_device",
        "network_id": "custom_network",
    }
    for id_field, dict_field in _COMPARE_COMPANIONS.items():
        if data.get(id_field) == "__custom__" and not data.get(dict_field):
            return jsonify({"error": f"'{id_field}' es '__custom__' pero falta '{dict_field}'"}), 400

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

    # Propagar num_parameters del custom_model si estaba en la solicitud
    custom_model = params.get("custom_model")
    if custom_model and custom_model.get("num_parameters"):
        for row in comparative.get("comparative_table", []):
            if row.get("is_custom"):
                row["num_parameters"] = custom_model["num_parameters"]

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

# Coordenadas aproximadas de regiones de data centers (lat, lng)
_DC_COORDINATES: dict[str, tuple[float, float]] = {
    # Deep Green
    "deepgreen-uk-exmouth": (50.63, -3.41),
    # GCP — US
    "gcp-us-west1": (45.59, -122.59), "gcp-us-or1-a": (45.59, -122.79),
    "gcp-us-east5": (39.96, -83.00), "gcp-us-oh1": (40.10, -83.10),
    "gcp-us-central1": (41.88, -93.10), "gcp-us-ia1-b": (41.70, -93.30),
    "gcp-us-east4": (39.04, -77.49), "gcp-us-va1-a": (38.90, -77.50),
    "gcp-us-va1-b": (38.95, -77.55), "gcp-us-nv1": (36.17, -115.14),
    "gcp-us-nv2": (36.10, -115.20), "gcp-us-ne1": (41.25, -96.00),
    "gcp-us-ga1": (33.75, -84.39), "gcp-us-west4": (36.27, -115.00),
    "gcp-us-al1": (33.45, -86.80), "gcp-us-east1": (33.85, -81.16),
    "gcp-us-tx1": (32.78, -96.80), "gcp-us-tn1": (35.95, -86.78),
    "gcp-us-south1": (29.76, -95.37), "gcp-us-ok1": (35.47, -97.52),
    "gcp-us-nc1": (35.60, -78.85),
    # GCP — Europe
    "gcp-europe-west3": (55.68, 12.57), "gcp-europe-west4": (52.37, 4.90),
    "gcp-europe-west2": (53.35, -6.26), "gcp-europe-west1": (50.85, 4.35),
    "gcp-europe-north1": (60.22, 24.93),
    # GCP — Other
    "gcp-au-sy1": (-33.87, 151.21), "gcp-au-mel1": (-37.81, 144.96),
    "gcp-southamerica-west1": (-33.45, -70.67),
    "gcp-asia-east1": (25.03, 121.57), "gcp-asia-southeast1": (1.35, 103.82),
    "gcp-asia-southeast1-b": (1.30, 103.85),
    "gcp-global": (37.42, -122.08),
    # AWS — US
    "aws-us-east-1": (38.95, -77.45), "aws-us-east-2": (40.00, -83.00),
    "aws-us-west-1": (37.35, -121.96), "aws-us-west-2": (45.85, -119.70),
    # AWS — Europe
    "aws-eu-north-1": (59.33, 18.07), "aws-eu-west-1": (53.35, -6.26),
    "aws-eu-south-2": (40.42, -3.70), "aws-eu-central-1": (50.11, 8.68),
    # AWS — Other
    "aws-ca-west-1": (51.05, -114.07), "aws-ca-central-1": (45.50, -73.57),
    "aws-sa-east-1": (-23.55, -46.63), "aws-ap-southeast-2": (-33.87, 151.21),
    "aws-ap-northeast-1": (35.68, 139.69), "aws-ap-southeast-1": (1.35, 103.82),
    "aws-ap-south-1": (19.08, 72.88), "aws-ap-south-2": (17.39, 78.49),
    "aws-af-south-1": (-33.93, 18.42), "aws-cn-north-1": (37.50, 106.23),
    "aws-me-central-1": (24.45, 54.65), "aws-me-south-1": (26.07, 50.56),
    "aws-global": (38.95, -77.45),
    # Azure — US
    "azure-eastus": (37.55, -78.85), "azure-centralus": (41.60, -93.61),
    "azure-westus2": (47.60, -122.33), "azure-southcentralus": (29.42, -98.49),
    "azure-wyoming": (43.08, -107.29), "azure-arizona": (33.45, -112.07),
    "azure-washington": (47.60, -120.51), "azure-iowa": (41.70, -93.60),
    "azure-illinois": (41.88, -87.63), "azure-texas": (32.78, -96.80),
    # Azure — Europe
    "azure-westeurope": (52.37, 4.90), "azure-northeurope": (53.35, -6.26),
    "azure-sweden-central": (59.33, 18.07), "azure-poland-central": (52.23, 21.01),
    # Azure — Other
    "azure-southeastasia": (1.35, 103.82),
    "azure-global": (47.60, -122.33),
}


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

        # Coordenadas desde el mapeo estático
        coords = _DC_COORDINATES.get(dc_id)
        if coords:
            dc_entry["latitude"] = coords[0]
            dc_entry["longitude"] = coords[1]

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

    # Sanitizar dicts custom (valores numéricos llegan como string desde el front)
    _CUSTOM_FLOAT_KEYS = {
        "custom_model": [
            "num_parameters", "energy_wh_per_1k_tokens",
            "latency_ms_per_token", "tokens_per_second",
            "context_window", "max_output_tokens",
        ],
        "custom_dc": [
            "pue", "provider_renewable_pct",
        ],
        "custom_device": [
            "cpu_tdp_watts", "inference_cpu_watts",
            "gpu_tdp_watts", "inference_gpu_watts",
            "npu_tdp_watts", "inference_npu_watts",
            "system_idle_watts",
        ],
        "custom_network": [
            "energy_kWh_per_MB", "energy_kWh_per_GB",
        ],
    }
    for dict_key, float_keys in _CUSTOM_FLOAT_KEYS.items():
        cd = params.get(dict_key)
        if cd and isinstance(cd, dict):
            for fk in float_keys:
                if fk in cd and cd[fk] is not None:
                    try:
                        cd[fk] = float(cd[fk])
                    except (ValueError, TypeError):
                        pass

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

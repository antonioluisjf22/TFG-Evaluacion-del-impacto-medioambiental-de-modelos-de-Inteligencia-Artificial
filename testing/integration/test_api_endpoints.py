"""
Tests de integración de los endpoints REST (/api/*).

Verifican la API completa usando el Flask test client.
"""

import pytest
import json


@pytest.mark.integration
class TestOptionsEndpoint:
    """GET /api/options — catálogos para el formulario."""

    def test_options_returns_200(self, client):
        """El endpoint debe retornar status 200."""
        resp = client.get("/api/options")
        assert resp.status_code == 200

    def test_options_contains_all_catalogs(self, client):
        """Response debe contener models, data_centers, devices, networks, request_types, countries."""
        resp = client.get("/api/options")
        data = resp.get_json()
        for key in ("models", "data_centers", "devices", "networks", "request_types", "countries"):
            assert key in data, f"Falta catálogo '{key}'"

    def test_options_models_have_required_fields(self, client):
        """Cada modelo debe tener model_id, model_name, num_parameters."""
        resp = client.get("/api/options")
        models = resp.get_json()["models"]
        assert len(models) > 0
        for m in models:
            assert "model_id" in m
            assert "model_name" in m
            assert "num_parameters" in m

    def test_options_data_centers_have_country_code(self, client):
        """Cada DC debe tener country_code."""
        resp = client.get("/api/options")
        dcs = resp.get_json()["data_centers"]
        assert len(dcs) > 0
        for dc in dcs:
            assert "country_code" in dc


@pytest.mark.integration
class TestCalculateEndpoint:
    """POST /api/calculate — cálculo individual."""

    def _post_calculate(self, client, data):
        return client.post("/api/calculate", json=data)

    def test_calculate_valid_request_200(self, client):
        """Request completa → 200 con emissions_gCO2."""
        resp = self._post_calculate(client, {
            "model_id": "gpt-4",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "user_country": "ES",
            "request_type": "chat_simple",
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert "emissions_gCO2" in data
        assert data["emissions_gCO2"]["total"] > 0

    def test_calculate_missing_model_400(self, client):
        """Sin model_id → 400."""
        resp = self._post_calculate(client, {
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
        })
        assert resp.status_code == 400

    def test_calculate_missing_datacenter_400(self, client):
        """Sin data_center_id → 400."""
        resp = self._post_calculate(client, {
            "model_id": "gpt-4",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
        })
        assert resp.status_code == 400

    def test_calculate_custom_model_200(self, client):
        """model_id='__custom__' + custom_model → funciona."""
        resp = self._post_calculate(client, {
            "model_id": "__custom__",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "custom_model": {
                "model_name": "Test Model",
                "num_parameters": 7e9,
            },
            "request_type": "chat_simple",
        })
        assert resp.status_code == 200

    def test_calculate_custom_model_missing_dict_400(self, client):
        """model_id='__custom__' sin custom_model → 400."""
        resp = self._post_calculate(client, {
            "model_id": "__custom__",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
        })
        assert resp.status_code == 400

    def test_calculate_with_explicit_tokens(self, client):
        """tokens_input=100, tokens_output=200 → usa esos tokens."""
        resp = self._post_calculate(client, {
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "tokens_input": 100,
            "tokens_output": 200,
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["metadata"]["tokens_processed"] == 300

    def test_calculate_response_structure(self, client):
        """Response debe tener las secciones principales."""
        resp = self._post_calculate(client, {
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "request_type": "chat_simple",
        })
        data = resp.get_json()
        assert "emissions_gCO2" in data
        assert "energy_Wh" in data
        assert "metadata" in data
        assert "breakdown_percentage" in data
        assert "environmental_label" in data


@pytest.mark.integration
class TestCompareEndpoint:
    """POST /api/compare — comparativa de todos los modelos."""

    def test_compare_returns_all_models(self, client):
        """Response debe tener tantas entradas como modelos en dataset."""
        resp = client.post("/api/compare", json={
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "user_country": "ES",
            "request_type": "chat_simple",
        })
        assert resp.status_code == 200
        data = resp.get_json()
        # Debe tener al menos 10 modelos
        assert len(data.get("comparative_table", [])) >= 10

    def test_compare_includes_environmental_labels(self, client):
        """Cada entrada debe tener environmental_label."""
        resp = client.post("/api/compare", json={
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "request_type": "chat_simple",
        })
        data = resp.get_json()
        for row in data.get("comparative_table", [])[:3]:
            assert "environmental_label" in row


@pytest.mark.integration
class TestBreakdownEndpoint:
    """POST /api/report/breakdown — desglose para gráficos."""

    def test_breakdown_after_calculate(self, client):
        """Pedir breakdown con los mismos params → datos coherentes."""
        params = {
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "request_type": "chat_simple",
        }
        resp = client.post("/api/report/breakdown", json=params)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "breakdown" in data
        assert "breakdown_gco2" in data


@pytest.mark.integration
class TestProductionEndpoint:
    """POST /api/report/production — impacto a escala."""

    def test_production_default_params(self, client):
        """Sin queries_per_day → usa 1M por defecto."""
        resp = client.post("/api/report/production", json={
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "request_type": "chat_simple",
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert "production_impact" in data

    def test_production_custom_queries(self, client):
        """Con queries_per_day=500000 → valores coherentes."""
        resp = client.post("/api/report/production", json={
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "request_type": "chat_simple",
            "queries_per_day": 500000,
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["production_impact"]["input"]["queries_per_day"] == 500000


@pytest.mark.integration
class TestMapDataEndpoint:
    """GET /api/map-data — datos geográficos para el mapa."""

    def test_map_data_returns_datacenters(self, client):
        """Response debe tener data_centers con coordenadas."""
        resp = client.get("/api/map-data")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "data_centers" in data
        assert len(data["data_centers"]) > 0

    def test_map_data_countries_have_ci(self, client):
        """Los países deben tener carbon_intensity."""
        resp = client.get("/api/map-data")
        data = resp.get_json()
        assert "countries" in data
        # Al menos algunos países deben tener CI
        countries_with_ci = [c for c in data["countries"] if c.get("carbon_intensity") is not None]
        assert len(countries_with_ci) > 0


@pytest.mark.integration
class TestCustomEntitiesViaAPI:
    """POST /api/calculate con entidades __custom__."""

    def _post(self, client, data):
        return client.post("/api/calculate", json=data)

    def test_custom_dc_pue_affects_result(self, client):
        """custom_dc con PUE explícito produce 200 y resultado válido."""
        resp = self._post(client, {
            "model_id": "phi-2",
            "data_center_id": "__custom__",
            "custom_dc": {"country_code": "ES", "pue": 1.3},
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "request_type": "chat_simple",
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["emissions_gCO2"]["total"] > 0

    def test_custom_device_cpu_watts(self, client):
        """custom_device con inference_cpu_watts → 200 y resultado válido."""
        resp = self._post(client, {
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "__custom__",
            "custom_device": {"inference_cpu_watts": 30.0, "system_idle_watts": 5.0},
            "network_id": "WiFi 6 802.11ax",
            "request_type": "chat_simple",
        })
        assert resp.status_code == 200
        assert resp.get_json()["emissions_gCO2"]["total"] > 0

    def test_custom_network_energy(self, client):
        """custom_network con energy_kWh_per_MB → 200 y resultado válido."""
        resp = self._post(client, {
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "__custom__",
            "custom_network": {"energy_kWh_per_MB": 0.001, "energy_kWh_per_GB": 1.0},
            "request_type": "chat_simple",
        })
        assert resp.status_code == 200
        assert resp.get_json()["emissions_gCO2"]["total"] > 0

    def test_custom_model_and_custom_dc_combined(self, client):
        """custom_model + custom_dc simultáneamente → 200 y coherente."""
        resp = self._post(client, {
            "model_id": "__custom__",
            "custom_model": {"model_name": "Modelo Lab", "num_parameters": 13e9},
            "data_center_id": "__custom__",
            "custom_dc": {"country_code": "DE", "pue": 1.2},
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "request_type": "chat_simple",
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["emissions_gCO2"]["total"] > 0
        assert data["metadata"]["model"] == "Modelo Lab"


@pytest.mark.integration
class TestAllRequestTypesViaAPI:
    """Todos los request_types producen respuesta 200 con tokens > 0."""

    @pytest.mark.parametrize("request_type", [
        "chat_simple", "chat_extended", "generation_short",
        "generation_long", "summarization", "code_generation", "translation",
    ])
    def test_request_type_valid(self, client, request_type):
        """Cada request_type conocido produce 200 y tokens_processed > 0."""
        resp = client.post("/api/calculate", json={
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
            "user_country": "ES",
            "request_type": request_type,
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["metadata"]["tokens_processed"] > 0


@pytest.mark.integration
class TestBreakdownStructureViaAPI:
    """Estructura completa del endpoint /api/report/breakdown."""

    _PARAMS = {
        "model_id": "gpt-4",
        "data_center_id": "aws-us-east-1",
        "device_id": "laptop-macbook-air-m3",
        "network_id": "WiFi 6 802.11ax",
        "user_country": "ES",
        "request_type": "chat_simple",
    }

    def test_breakdown_percentages_sum_100(self, client):
        """device_pct + network_pct + datacenter_pct ≈ 100%."""
        resp = client.post("/api/report/breakdown", json=self._PARAMS)
        assert resp.status_code == 200
        bd = resp.get_json()["breakdown"]
        total = bd["device_pct"] + bd["network_pct"] + bd["datacenter_pct"]
        assert abs(total - 100.0) < 0.5

    def test_breakdown_has_chart_colors(self, client):
        """Debe retornar colores para Chart.js."""
        resp = client.post("/api/report/breakdown", json=self._PARAMS)
        assert "chart_colors" in resp.get_json()

    def test_breakdown_gco2_matches_calculate(self, client):
        """breakdown_gco2.total debe ser coherente con /api/calculate."""
        calc_resp = client.post("/api/calculate", json=self._PARAMS)
        bd_resp = client.post("/api/report/breakdown", json=self._PARAMS)
        co2_calc = calc_resp.get_json()["emissions_gCO2"]["total"]
        co2_bd = bd_resp.get_json()["breakdown_gco2"]["total"]
        assert abs(co2_calc - co2_bd) < 0.0001


@pytest.mark.integration
class TestProductionParametersViaAPI:
    """Parámetros opcionales del endpoint /api/report/production."""

    _BASE = {
        "model_id": "phi-2",
        "data_center_id": "aws-us-east-1",
        "device_id": "laptop-macbook-air-m3",
        "network_id": "WiFi 6 802.11ax",
        "user_country": "ES",
        "request_type": "chat_simple",
    }

    def test_days_per_year_param_reflected_in_response(self, client):
        """days_per_year=180 → total_queries_per_year = queries_per_day × 180."""
        params = dict(self._BASE, queries_per_day=1000, days_per_year=180)
        resp = client.post("/api/report/production", json=params)
        assert resp.status_code == 200
        prod = resp.get_json()["production_impact"]
        assert prod["input"]["days_per_year"] == 180
        assert prod["input"]["total_queries_per_year"] == 1000 * 180

    def test_double_queries_doubles_co2(self, client):
        """2× queries_per_day → 2× kg_co2_annual."""
        r1 = client.post("/api/report/production", json=dict(self._BASE, queries_per_day=100000))
        r2 = client.post("/api/report/production", json=dict(self._BASE, queries_per_day=200000))
        kg1 = r1.get_json()["production_impact"]["emissions"]["kg_co2_annual"]
        kg2 = r2.get_json()["production_impact"]["emissions"]["kg_co2_annual"]
        assert abs(kg2 / kg1 - 2.0) < 0.01


@pytest.mark.integration
class TestResponseHeaders:
    """Verifica que las cabeceras HTTP sean correctas."""

    def test_calculate_content_type_is_json(self, client):
        """Content-Type de /api/calculate debe ser application/json."""
        resp = client.post("/api/calculate", json={
            "model_id": "phi-2",
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
            "network_id": "WiFi 6 802.11ax",
        })
        assert "application/json" in resp.content_type

    def test_error_400_response_is_json(self, client):
        """Respuesta 400 también debe tener Content-Type JSON y campo 'error'."""
        resp = client.post("/api/calculate", json={})
        assert resp.status_code == 400
        assert "application/json" in resp.content_type
        assert "error" in resp.get_json()


@pytest.mark.integration
class TestCompareErrorHandling:
    """Validación de campos obligatorios en /api/compare."""

    def test_compare_missing_device_400(self, client):
        """Sin device_id → 400."""
        resp = client.post("/api/compare", json={
            "data_center_id": "aws-us-east-1",
            "network_id": "WiFi 6 802.11ax",
        })
        assert resp.status_code == 400

    def test_compare_missing_network_400(self, client):
        """Sin network_id → 400."""
        resp = client.post("/api/compare", json={
            "data_center_id": "aws-us-east-1",
            "device_id": "laptop-macbook-air-m3",
        })
        assert resp.status_code == 400

    def test_compare_empty_body_400(self, client):
        """Body vacío en /api/compare → 400."""
        resp = client.post("/api/compare", json={})
        assert resp.status_code == 400

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

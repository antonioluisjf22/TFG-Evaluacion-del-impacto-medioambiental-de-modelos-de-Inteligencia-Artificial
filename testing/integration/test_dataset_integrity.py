"""
Tests de integridad de los datasets CSV.

Verifican que los CSVs tienen la estructura correcta,
valores válidos y coherencia entre datasets.
"""

import pytest
import os
import pandas as pd

_BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'raw')


@pytest.mark.integration
class TestCSVStructure:
    """Verifica las columnas requeridas en cada CSV."""

    def test_models_csv_required_columns(self):
        """models.csv debe tener todas las columnas necesarias."""
        df = pd.read_csv(os.path.join(_BASE, "models", "models.csv"))
        required = {"model_id", "model_name", "num_parameters",
                     "energy_wh_per_1k_tokens", "latency_ms_per_token",
                     "context_window", "max_output_tokens"}
        assert required.issubset(set(df.columns))

    def test_datacenters_csv_required_columns(self):
        """data_centers.csv debe tener dc_id, pue, country_code, etc."""
        df = pd.read_csv(os.path.join(_BASE, "data_centers", "data_centers.csv"))
        required = {"dc_id", "provider_name", "country_code", "pue"}
        assert required.issubset(set(df.columns))

    def test_devices_csv_required_columns(self):
        """devices.csv debe tener device_id, inference_cpu_watts, etc."""
        df = pd.read_csv(os.path.join(_BASE, "devices", "devices.csv"))
        required = {"device_id", "device_name", "inference_cpu_watts",
                     "system_idle_watts", "primary_inference_target"}
        assert required.issubset(set(df.columns))

    def test_network_csv_required_columns(self):
        """network CSV debe tener energy_kWh_per_MB, energy_kWh_per_GB."""
        df = pd.read_csv(os.path.join(_BASE, "network", "network_energy_sources_2024.csv"))
        required = {"network_type", "energy_kWh_per_MB", "energy_kWh_per_GB"}
        assert required.issubset(set(df.columns))


@pytest.mark.integration
class TestDataValidity:
    """Verifica que los valores de datos estén en rangos lógicos."""

    def test_all_pue_values_valid_range(self):
        """PUE debe estar entre 1.0 y 3.0."""
        df = pd.read_csv(os.path.join(_BASE, "data_centers", "data_centers.csv"))
        for _, row in df.iterrows():
            pue = row['pue']
            assert 1.0 <= pue <= 3.0, f"PUE fuera de rango: {pue} en {row['dc_id']}"

    def test_all_energy_per_1k_tokens_positive(self):
        """energy_wh_per_1k_tokens > 0 para todos los modelos."""
        df = pd.read_csv(os.path.join(_BASE, "models", "models.csv"))
        for _, row in df.iterrows():
            assert row['energy_wh_per_1k_tokens'] > 0, f"Energía <= 0 en {row['model_id']}"

    def test_all_device_watts_non_negative(self):
        """Watts >= 0 para todos los procesadores."""
        df = pd.read_csv(os.path.join(_BASE, "devices", "devices.csv"))
        for _, row in df.iterrows():
            assert row['inference_cpu_watts'] >= 0, f"CPU watts < 0 en {row['device_id']}"
            assert row.get('inference_gpu_watts', 0) >= 0, f"GPU watts < 0 en {row['device_id']}"
            assert row.get('inference_npu_watts', 0) >= 0, f"NPU watts < 0 en {row['device_id']}"

    def test_network_energy_positive(self):
        """Energía por MB > 0 para tipos de red."""
        df = pd.read_csv(os.path.join(_BASE, "network", "network_energy_sources_2024.csv"))
        for _, row in df.iterrows():
            assert row['energy_kWh_per_MB'] > 0, f"Energía <= 0 en {row['network_type']}"

    def test_carbon_intensity_positive(self):
        """CI > 0 para todas las zonas del CSV."""
        ci_path = os.path.join(_BASE, "carbon_intensity", "carbon_intensity.csv")
        if os.path.exists(ci_path):
            df = pd.read_csv(ci_path)
            for _, row in df.iterrows():
                ci = row.get('carbon_intensity_gCO2_kWh')
                if pd.notna(ci):
                    assert ci > 0, f"CI <= 0 en zona {row.get('zone')}"


@pytest.mark.integration
class TestCrossDatasetCoherence:
    """Verifica coherencia entre datasets."""

    def test_no_duplicate_model_ids(self):
        """Sin IDs duplicados en models.csv."""
        df = pd.read_csv(os.path.join(_BASE, "models", "models.csv"))
        assert df['model_id'].is_unique

    def test_no_duplicate_dc_ids(self):
        """Sin IDs duplicados en data_centers.csv."""
        df = pd.read_csv(os.path.join(_BASE, "data_centers", "data_centers.csv"))
        assert df['dc_id'].is_unique

    def test_no_duplicate_device_ids(self):
        """Sin IDs duplicados en devices.csv."""
        df = pd.read_csv(os.path.join(_BASE, "devices", "devices.csv"))
        assert df['device_id'].is_unique

    def test_request_types_csv_matches_code(self):
        """Los request_type_ids del CSV deben coincidir con los esperados."""
        df = pd.read_csv(os.path.join(_BASE, "models", "request_types.csv"))
        expected = {"chat_simple", "chat_extended", "generation_short", "generation_long",
                    "summarization", "code_generation", "translation"}
        actual = set(df['request_type_id'].tolist())
        assert expected == actual

    def test_datacenter_countries_have_ci(self, calculator):
        """Todos los country_code de DCs deben tener algún CI disponible."""
        dc_df = calculator.data_centers_df
        for _, row in dc_df.iterrows():
            cc = row['country_code']
            ci = calculator.get_carbon_intensity(cc, use_api=False)
            assert ci > 0, f"No hay CI para country_code={cc}"

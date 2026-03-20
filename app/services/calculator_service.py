"""
Servicio de cálculo de emisiones.
Envuelve CarbonCalculator y expone métodos para la API.
"""

import pandas as pd
from calculate_emissions import CarbonCalculator, EmissionResult, DEFAULT_CARBON_INTENSITY


class CalculatorService:
    """Singleton que gestiona el CarbonCalculator y expone datos del dataset."""

    def __init__(self):
        self.calculator = CarbonCalculator(use_realtime_carbon_intensity=True)

    # ------------------------------------------------------------------
    # Opciones disponibles (para poblar los selectores del formulario)
    # ------------------------------------------------------------------

    def get_options(self) -> dict:
        """Devuelve todos los catálogos necesarios para el formulario."""
        return {
            "models": self._get_models_list(),
            "data_centers": self._get_data_centers_list(),
            "devices": self._get_devices_list(),
            "networks": self._get_networks_list(),
            "request_types": self._get_request_types_list(),
            "countries": self._get_countries_list(),
        }

    def _get_models_list(self) -> list[dict]:
        df = self.calculator.models_df
        if df is None:
            return []
        cols = [
            "model_id", "model_name", "organization", "num_parameters",
            "energy_wh_per_1k_tokens", "latency_ms_per_token",
            "tokens_per_second", "context_window", "max_output_tokens",
        ]
        return _df_to_records(df, cols)

    def _get_data_centers_list(self) -> list[dict]:
        df = self.calculator.data_centers_df
        if df is None:
            return []
        cols = ["dc_id", "provider_name", "region", "country_code", "pue"]
        return _df_to_records(df, cols)

    def _get_devices_list(self) -> list[dict]:
        df = self.calculator.devices_df
        if df is None:
            return []
        cols = [
            "device_id", "device_name", "device_type", "manufacturer",
            "cpu_model", "inference_cpu_watts",
            "gpu_model", "inference_gpu_watts",
            "npu_model", "inference_npu_watts",
            "has_npu", "primary_inference_target",
        ]
        return _df_to_records(df, cols)

    def _get_networks_list(self) -> list[dict]:
        df = self.calculator.network_df
        if df is None:
            return []
        cols = ["network_type", "energy_kWh_per_MB", "energy_kWh_per_GB"]
        return _df_to_records(df, cols)

    def _get_request_types_list(self) -> list[dict]:
        return [
            {"id": k, "tokens_input": v["tokens_input"], "tokens_output": v["tokens_output"]}
            for k, v in self.calculator.request_types.items()
        ]

    @staticmethod
    def _get_countries_list() -> list[dict]:
        return [
            {"code": code, "carbon_intensity": ci}
            for code, ci in DEFAULT_CARBON_INTENSITY.items()
            if code != "GLOBAL"
        ]

    # ------------------------------------------------------------------
    # Cálculo de emisiones
    # ------------------------------------------------------------------

    def calculate(self, params: dict) -> EmissionResult:
        """
        Calcula emisiones con parámetros del formulario.

        params esperados (todos opcionales salvo los 4 IDs):
            model_id, data_center_id, device_id, network_id,
            user_country, request_type,
            tokens_input, tokens_output,
            inference_processor, utilization
        """
        return self.calculator.calculate_emissions(
            model_id=params["model_id"],
            data_center_id=params["data_center_id"],
            device_id=params["device_id"],
            network_id=params["network_id"],
            user_country=params.get("user_country", "ES"),
            request_type=params.get("request_type"),
            tokens_input=params.get("tokens_input"),
            tokens_output=params.get("tokens_output"),
            inference_processor=params.get("inference_processor", "auto"),
            utilization=params.get("utilization", 0.7),
        )

    def compare_models(self, params: dict) -> list[EmissionResult]:
        """
        Calcula emisiones para TODOS los modelos manteniendo el resto
        de parámetros fijos.  Devuelve lista de EmissionResult.

        params: mismos que calculate() pero sin model_id.
        """
        models = self.calculator.models_df
        if models is None:
            return []

        results: list[EmissionResult] = []
        for model_id in models["model_id"]:
            try:
                p = {**params, "model_id": model_id}
                results.append(self.calculate(p))
            except Exception:
                continue
        return results


# ------------------------------------------------------------------
# Utilidades internas
# ------------------------------------------------------------------

def _df_to_records(df: pd.DataFrame, cols: list[str]) -> list[dict]:
    """Convierte un DataFrame a lista de dicts con las columnas indicadas."""
    available = [c for c in cols if c in df.columns]
    subset = df[available].copy()
    # Reemplazar NaN por None para serialización JSON correcta
    subset = subset.where(pd.notnull(subset), None)
    return subset.to_dict(orient="records")

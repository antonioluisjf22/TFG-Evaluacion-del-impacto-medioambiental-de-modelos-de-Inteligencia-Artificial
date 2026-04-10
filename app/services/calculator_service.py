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
            "model_id", "model_name", "organization",
            "num_parameters", "energy_wh_per_1k_tokens", "latency_ms_per_token",
            "tokens_per_second", "context_window", "max_output_tokens",
        ]
        return _df_to_records(df, cols)

    def _get_data_centers_list(self) -> list[dict]:
        df = self.calculator.data_centers_df
        if df is None:
            return []
        cols = [
            "dc_id", "provider_name", "region", "country_code", "pue",
        ]
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
        cols = [
            "network_type", "energy_kWh_per_MB", "energy_kWh_per_GB",
        ]
        return _df_to_records(df, cols)

    def _get_request_types_list(self) -> list[dict]:
        return [
            {
                "id": k,
                "tokens_input": v["tokens_input"],
                "tokens_output": v["tokens_output"],
            }
            for k, v in self.calculator.request_types.items()
        ]

    # ISO-alpha2 → nombre legible (para tooltips del mapa)
    _COUNTRY_NAMES: dict[str, str] = {
        "AT": "Austria", "AU": "Australia", "BE": "Bélgica", "BR": "Brasil",
        "CA": "Canadá", "CH": "Suiza", "CL": "Chile", "CO": "Colombia",
        "CZ": "Chequia", "DE": "Alemania", "DK": "Dinamarca", "ES": "España",
        "FI": "Finlandia", "FR": "Francia", "GB": "Reino Unido", "IE": "Irlanda",
        "IN": "India", "IT": "Italia", "JP": "Japón", "KR": "Corea del Sur",
        "MX": "México", "NL": "Países Bajos", "NO": "Noruega", "NZ": "Nueva Zelanda",
        "PL": "Polonia", "PT": "Portugal", "SE": "Suecia", "SG": "Singapur",
        "TW": "Taiwán", "US": "Estados Unidos", "ZA": "Sudáfrica", "AR": "Argentina",
        "IL": "Israel", "AE": "Emiratos Árabes", "SA": "Arabia Saudí",
        "HK": "Hong Kong", "MY": "Malasia", "ID": "Indonesia", "TH": "Tailandia",
        "CN": "China", "BH": "Baréin",
    }

    def _get_countries_list(self) -> list[dict]:
        """Devuelve todas las zonas del CSV carbon_intensity.csv (125+ zonas),
        más los países de data centers que no aparecen en ese CSV pero sí
        tienen CI en carbon_intensity_datacenters.csv (TW, ZA, CN, AE, BH)."""
        df = self.calculator.ci_zones_df
        if df is None or df.empty:
            # Fallback to hardcoded defaults
            return [
                {"code": code, "carbon_intensity": ci}
                for code, ci in DEFAULT_CARBON_INTENSITY.items()
                if code != "GLOBAL"
            ]
        result = []
        for _, row in df.iterrows():
            zone = str(row.get("zone", "")).strip()
            if not zone:
                continue
            ci_val = row.get("carbon_intensity_gCO2_kWh")
            try:
                ci_int = int(float(ci_val)) if ci_val is not None and str(ci_val) != "" else None
            except (ValueError, TypeError):
                ci_int = None
            # Extraer código de país ISO-alpha2 del código de zona
            iso = zone.split("-")[0] if "-" in zone else zone
            country_name = self._COUNTRY_NAMES.get(iso, "")
            result.append({"code": zone, "carbon_intensity": ci_int, "country_name": country_name})

        # Augment with DC countries not covered by the general CI zones file
        # (TW, ZA, CN, AE, BH have CI in carbon_intensity_datacenters.csv but not in carbon_intensity.csv)
        dc_ci_df = self.calculator.dc_ci_df
        if dc_ci_df is not None and not dc_ci_df.empty:
            import pandas as _pd
            existing_isos = set(
                z["code"].split("-")[0] if "-" in z["code"] else z["code"]
                for z in result
            )
            for raw_cc, group in dc_ci_df.groupby("country_code"):
                if str(raw_cc).upper() == "GLOBAL":
                    continue
                # Normalise legacy 'UK' to standard ISO-2 'GB'
                iso = "GB" if str(raw_cc) == "UK" else str(raw_cc)
                if iso not in existing_isos:
                    ci_vals = group["carbon_intensity_gCO2_kWh"].dropna()
                    if ci_vals.empty:
                        continue
                    avg_ci = int(round(ci_vals.mean()))
                    country_name = self._COUNTRY_NAMES.get(iso, iso)
                    result.append({"code": iso, "carbon_intensity": avg_ci, "country_name": country_name})
                    existing_isos.add(iso)

        return sorted(result, key=lambda x: x["code"])

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
            inference_processor, utilization,
            custom_model, custom_dc, custom_device, custom_network
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
            custom_model=params.get("custom_model"),
            custom_dc=params.get("custom_dc"),
            custom_device=params.get("custom_device"),
            custom_network=params.get("custom_network"),
        )

    def compare_models(self, params: dict) -> list[EmissionResult]:
        """
        Calcula emisiones para TODOS los modelos manteniendo el resto
        de parámetros fijos.  Devuelve lista de EmissionResult.

        params: mismos que calculate() pero sin model_id.
        custom_dc/custom_device/custom_network se propagan;
        custom_model se añade al final si estaba presente en params.
        """
        models = self.calculator.models_df
        if models is None:
            return []

        custom_model_data = params.get("custom_model")

        results: list[EmissionResult] = []
        for model_id in models["model_id"]:
            try:
                p = {**params, "model_id": model_id}
                p.pop("custom_model", None)  # no custom model para modelos del dataset
                results.append(self.calculate(p))
            except Exception:
                continue

        # Incluir modelo personalizado si se proporcionó
        if custom_model_data:
            try:
                p = {**params, "model_id": "__custom__"}
                results.append(self.calculate(p))
            except Exception:
                pass

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

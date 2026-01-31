#!/usr/bin/env python3
"""
Calculadora de Emisiones de Carbono para Inferencia de IA (v2.0)
================================================================

Calcula el impacto medioambiental total de una consulta a un modelo de IA,
considerando:
1. Consumo del dispositivo cliente (hardware local)
2. Consumo de la red (transmisión de datos)
3. Consumo del data center (ejecución del modelo)

Fórmula principal:
    CO2_TOTAL = CO2_DISPOSITIVO + CO2_RED + CO2_DATA_CENTER

FÓRMULAS DETALLADAS:
====================

1. DISPOSITIVO (v2.0 - Con distinción CPU/GPU/NPU):
   E_dispositivo = P_procesador × t_inferencia
   CO2_dispositivo = E_dispositivo × CI_local
   
   Donde P_procesador se selecciona según inference_processor:
   - "cpu" → inference_cpu_watts
   - "gpu" → inference_gpu_watts
   - "npu" → inference_npu_watts
   - "auto" → usa primary_inference_target del dispositivo
   
   Eficiencia típica por procesador (TOPS/W):
   - CPU: 0.5 - 2 TOPS/W (menos eficiente pero más flexible)
   - GPU: 2 - 10 TOPS/W (bueno para modelos grandes, CUDA)
   - NPU: 10 - 50 TOPS/W (optimizado para inferencia)

2. RED:
   E_red = energía_por_MB × MBs × carbon_multiplier
   CO2_red = E_red × CI_local

3. DATA CENTER:
   FLOPS_inferencia = 2 × parámetros × tokens
   E_compute = TFLOPS × W_por_TFLOP × t_inferencia
   E_datacenter = E_compute × PUE / eficiencia_GPU
   CO2_datacenter = E_datacenter × CI_datacenter

NOTA: La intensidad de carbono (CI) se obtiene de Electricity Maps API
      cuando está disponible, o de valores por defecto como fallback.
"""

import pandas as pd
import os
from dataclasses import dataclass
from typing import Optional, Dict, Any
import json

# Importar módulo de Carbon Intensity API
try:
    from carbon_intensity_api import CarbonIntensityAPI
    CARBON_API_AVAILABLE = True
except ImportError:
    CARBON_API_AVAILABLE = False

# ===== CONFIGURACIÓN DE RUTAS =====
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets", "raw")

# Rutas a los datasets
MODELS_CSV = os.path.join(DATASETS_DIR, "models", "models.csv")
DATA_CENTERS_CSV = os.path.join(DATASETS_DIR, "data_centers", "data_centers.csv")
DEVICES_CSV = os.path.join(DATASETS_DIR, "devices", "devices.csv")
NETWORK_CSV = os.path.join(DATASETS_DIR, "network", "network_types.csv")
CI_DATACENTERS_CSV = os.path.join(DATASETS_DIR, "carbon_intensity", "carbon_intensity_datacenters.csv")


# ===== CONSTANTES =====
# Carbon Intensity por defecto (gCO2/kWh) - Valores promedio por región
# Fuente: Electricity Maps, IEA
DEFAULT_CARBON_INTENSITY = {
    "ES": 145,    # España
    "IE": 350,    # Irlanda
    "DE": 380,    # Alemania
    "FR": 50,     # Francia (nuclear)
    "US": 380,    # USA promedio
    "US-CA": 180, # California
    "US-VA": 320, # Virginia
    "US-OR": 80,  # Oregon (hydro)
    "UK": 230,    # Reino Unido
    "NO": 20,     # Noruega (hydro)
    "SE": 25,     # Suecia
    "PL": 650,    # Polonia (carbón)
    "IN": 700,    # India
    "CN": 550,    # China
    "AU": 500,    # Australia
    "JP": 450,    # Japón
    "GLOBAL": 450 # Promedio global
}

# Eficiencia de GPU en data centers (FLOPS útiles / FLOPS totales)
GPU_EFFICIENCY = 0.35  # ~35% de eficiencia típica en inferencia

# Consumo energético por TFLOP/s (Wh)
# Basado en NVIDIA A100: 400W TDP, 312 TFLOPS FP16 = 1.28 W/TFLOP
WATTS_PER_TFLOP = 1.5  # Conservador, incluye overhead


@dataclass
class EmissionResult:
    """Resultado del cálculo de emisiones"""
    # Emisiones en gramos de CO2
    co2_device_g: float
    co2_network_g: float
    co2_datacenter_g: float
    co2_total_g: float
    
    # Energía en Wh
    energy_device_wh: float
    energy_network_wh: float
    energy_datacenter_wh: float
    energy_total_wh: float
    
    # Metadatos
    model_name: str
    device_name: str
    network_type: str
    data_center_name: str
    inference_time_sec: float
    tokens_processed: int
    
    # Información de renovables (nuevo v2.3)
    dc_renewable_grid_pct: float = None       # % renovables de la red eléctrica
    dc_renewable_provider_pct: float = None   # % renovables declarado por proveedor
    dc_carbon_intensity: float = None         # gCO2/kWh de la zona
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "emissions_gCO2": {
                "device": round(self.co2_device_g, 4),
                "network": round(self.co2_network_g, 4),
                "datacenter": round(self.co2_datacenter_g, 4),
                "total": round(self.co2_total_g, 4)
            },
            "energy_Wh": {
                "device": round(self.energy_device_wh, 6),
                "network": round(self.energy_network_wh, 6),
                "datacenter": round(self.energy_datacenter_wh, 6),
                "total": round(self.energy_total_wh, 6)
            },
            "metadata": {
                "model": self.model_name,
                "device": self.device_name,
                "network": self.network_type,
                "data_center": self.data_center_name,
                "inference_time_sec": self.inference_time_sec,
                "tokens_processed": self.tokens_processed
            },
            "breakdown_percentage": {
                "device": round(self.co2_device_g / self.co2_total_g * 100, 1) if self.co2_total_g > 0 else 0,
                "network": round(self.co2_network_g / self.co2_total_g * 100, 1) if self.co2_total_g > 0 else 0,
                "datacenter": round(self.co2_datacenter_g / self.co2_total_g * 100, 1) if self.co2_total_g > 0 else 0
            },
            "datacenter_renewable_info": {
                "grid_renewable_pct": float(self.dc_renewable_grid_pct) if self.dc_renewable_grid_pct is not None else None,
                "provider_claimed_pct": int(self.dc_renewable_provider_pct) if self.dc_renewable_provider_pct is not None else None,
                "carbon_intensity_gCO2_kWh": float(self.dc_carbon_intensity) if self.dc_carbon_intensity is not None else None,
                "note": "grid_renewable_pct = mix real de red; provider_claimed_pct = declarado por proveedor (PPAs)"
            }
        }
        return result
    
    def __str__(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


class CarbonCalculator:
    """Calculadora de emisiones de carbono para inferencia de IA"""
    
    def __init__(self, use_realtime_carbon_intensity: bool = True):
        """
        Carga los datasets necesarios e inicializa la API de Carbon Intensity.
        
        Args:
            use_realtime_carbon_intensity: Si True, usa Electricity Maps API para
                obtener intensidad de carbono en tiempo real. Si False, usa valores
                por defecto (más rápido pero menos preciso).
        """
        self.models_df = None
        self.data_centers_df = None
        self.devices_df = None
        self.network_df = None
        self.dc_ci_df = None  # CSV con electricity_maps_zone por DC
        self.carbon_api = None
        self.use_realtime_ci = use_realtime_carbon_intensity
        
        self._load_datasets()
        self._init_carbon_api()
    
    def _init_carbon_api(self):
        """Inicializa la API de Carbon Intensity si está disponible"""
        if self.use_realtime_ci and CARBON_API_AVAILABLE:
            try:
                self.carbon_api = CarbonIntensityAPI()
            except Exception as e:
                print(f"[WARN] No se pudo inicializar Carbon Intensity API: {e}")
                self.carbon_api = None
        else:
            if not CARBON_API_AVAILABLE:
                print("[INFO] Carbon Intensity API no disponible. Usando valores por defecto.")
    
    def _load_datasets(self):
        """Carga todos los datasets CSV"""
        try:
            if os.path.exists(MODELS_CSV):
                self.models_df = pd.read_csv(MODELS_CSV)
                print(f"[OK] Modelos: {len(self.models_df)} cargados")
            else:
                print(f"[WARN] No se encontro: {MODELS_CSV}")
            
            if os.path.exists(DATA_CENTERS_CSV):
                self.data_centers_df = pd.read_csv(DATA_CENTERS_CSV)
                print(f"[OK] Data Centers: {len(self.data_centers_df)} cargados")
            else:
                print(f"[WARN] No se encontro: {DATA_CENTERS_CSV}")
            
            if os.path.exists(DEVICES_CSV):
                self.devices_df = pd.read_csv(DEVICES_CSV)
                print(f"[OK] Dispositivos: {len(self.devices_df)} cargados")
            else:
                print(f"[WARN] No se encontro: {DEVICES_CSV}")
            
            if os.path.exists(NETWORK_CSV):
                self.network_df = pd.read_csv(NETWORK_CSV)
                print(f"[OK] Tipos de Red: {len(self.network_df)} cargados")
            else:
                print(f"[WARN] No se encontro: {NETWORK_CSV}")
            
            # Cargar CSV con zonas de Electricity Maps por data center
            if os.path.exists(CI_DATACENTERS_CSV):
                self.dc_ci_df = pd.read_csv(CI_DATACENTERS_CSV)
                print(f"[OK] CI por DC: {len(self.dc_ci_df)} con zonas de Electricity Maps")
            else:
                print(f"[INFO] No se encontro CI por DC: {CI_DATACENTERS_CSV}")
                
        except Exception as e:
            print(f"[ERROR] Error cargando datasets: {e}")
    
    def get_model(self, model_id: str) -> Optional[pd.Series]:
        """Obtiene datos de un modelo por ID"""
        if self.models_df is None:
            return None
        matches = self.models_df[self.models_df['model_id'] == model_id]
        return matches.iloc[0] if len(matches) > 0 else None
    
    def get_data_center(self, dc_id: str) -> Optional[pd.Series]:
        """Obtiene datos de un data center por ID"""
        if self.data_centers_df is None:
            return None
        matches = self.data_centers_df[self.data_centers_df['dc_id'] == dc_id]
        return matches.iloc[0] if len(matches) > 0 else None
    
    def get_device(self, device_id: str) -> Optional[pd.Series]:
        """Obtiene datos de un dispositivo por ID"""
        if self.devices_df is None:
            return None
        matches = self.devices_df[self.devices_df['device_id'] == device_id]
        return matches.iloc[0] if len(matches) > 0 else None
    
    def get_network(self, network_id: str) -> Optional[pd.Series]:
        """Obtiene datos de un tipo de red por ID"""
        if self.network_df is None:
            return None
        matches = self.network_df[self.network_df['network_id'] == network_id]
        return matches.iloc[0] if len(matches) > 0 else None
    
    def get_dc_electricity_maps_zone(self, dc_id: str) -> Optional[str]:
        """
        Obtiene la zona exacta de Electricity Maps para un data center.
        
        Esto permite usar la CI específica de la red eléctrica del DC,
        no solo el país genérico (ej: US-NW-BPAT en lugar de US).
        
        Returns:
            Código de zona de Electricity Maps (ej: 'US-NW-BPAT', 'IE', 'SE')
            o None si no se encuentra.
        """
        if self.dc_ci_df is None:
            return None
        matches = self.dc_ci_df[self.dc_ci_df['dc_id'] == dc_id]
        if len(matches) > 0:
            return matches.iloc[0].get('electricity_maps_zone', None)
        return None
    
    def get_dc_renewable_info(self, dc_id: str) -> Dict[str, Any]:
        """
        Obtiene información de renovables para un data center.
        
        Returns:
            Dict con:
            - renewable_grid_pct: % renovables de la red eléctrica (real)
            - provider_renewable_pct: % declarado por el proveedor (PPAs)
            - carbon_intensity: gCO2/kWh de la zona
        """
        result = {
            'renewable_grid_pct': None,
            'provider_renewable_pct': None,
            'carbon_intensity': None
        }
        
        if self.dc_ci_df is None:
            return result
        
        matches = self.dc_ci_df[self.dc_ci_df['dc_id'] == dc_id]
        if len(matches) > 0:
            row = matches.iloc[0]
            result['renewable_grid_pct'] = row.get('renewable_pct', None)
            result['provider_renewable_pct'] = row.get('provider_renewable_pct', None)
            result['carbon_intensity'] = row.get('carbon_intensity_gCO2_kWh', None)
        
        return result
    
    def get_carbon_intensity_for_dc(self, dc_id: str, fallback_country: str = None) -> float:
        """
        Obtiene la intensidad de carbono específica para un data center.
        
        PRIORIDAD:
        1. Zona específica de Electricity Maps para el DC (ej: US-NW-BPAT)
        2. País del DC (fallback)
        3. Valor global por defecto
        
        Esta mejora permite precisión mucho mayor. Por ejemplo:
        - aws-us-west-2 → US-NW-BPAT → 77 gCO2/kWh (Oregon hydro)
        - aws-us-east-1 → US-MIDA-PJM → 498 gCO2/kWh (Virginia coal/gas)
        
        En lugar de usar 'US' genérico (380 gCO2/kWh) para ambos.
        """
        # Intentar obtener zona específica del DC
        em_zone = self.get_dc_electricity_maps_zone(dc_id)
        
        if em_zone and self.carbon_api is not None:
            try:
                ci = self.carbon_api.get_carbon_intensity(em_zone)
                return ci
            except Exception:
                pass
        
        # Fallback a país
        if fallback_country:
            return self.get_carbon_intensity(fallback_country)
        
        return DEFAULT_CARBON_INTENSITY["GLOBAL"]
    
    def get_carbon_intensity(self, country_code: str, use_api: bool = True) -> float:
        """
        Obtiene la intensidad de carbono para un país/región.
        
        Prioridad:
        1. Electricity Maps API (tiempo real) si está disponible
        2. Valores por defecto (promedios anuales)
        
        Args:
            country_code: Código de país (ES, DE, US-CA, etc.)
            use_api: Si True, intenta usar la API. Si False, usa valores por defecto.
        
        Returns:
            Intensidad de carbono en gCO2/kWh
        """
        # Intentar API si está disponible
        if use_api and self.carbon_api is not None:
            try:
                return self.carbon_api.get_carbon_intensity(country_code)
            except Exception:
                pass  # Fallback a valores por defecto
        
        # Fallback a valores por defecto
        return DEFAULT_CARBON_INTENSITY.get(country_code, DEFAULT_CARBON_INTENSITY["GLOBAL"])
    
    def get_carbon_intensity_details(self, country_code: str) -> Dict[str, Any]:
        """
        Obtiene intensidad de carbono con detalles adicionales.
        
        Returns:
            Dict con carbonIntensity, source, renewablePercentage, etc.
        """
        if self.carbon_api is not None:
            try:
                return self.carbon_api.get_carbon_intensity_with_details(country_code)
            except Exception:
                pass
        
        return {
            'carbonIntensity': DEFAULT_CARBON_INTENSITY.get(country_code, 450),
            'source': 'default_values',
            'zone': country_code
        }
    
    def calculate_emissions(
        self,
        model_id: str,
        data_center_id: str,
        device_id: str,
        network_id: str,
        user_country: str = "ES",
        inference_time_sec: float = None,  # Ahora se puede calcular automáticamente
        tokens_input: int = None,
        tokens_output: int = None,
        request_type: str = None,  # NUEVO: Tipo de petición
        data_transferred_mb: float = 0.5,
        inference_processor: str = "auto",
        utilization: float = 0.7
    ) -> EmissionResult:
        """
        Calcula las emisiones totales de una consulta de IA.
        
        Args:
            model_id: ID del modelo (ej: 'gpt-4', 'llama-2-70b')
            data_center_id: ID del data center (ej: 'aws-eu-west-1')
            device_id: ID del dispositivo cliente (ej: 'laptop-macbook-air-m3')
            network_id: ID del tipo de red (ej: 'wifi-5', '4g-lte')
            user_country: Código de país del usuario (para carbon intensity local)
            inference_time_sec: Tiempo de inferencia en segundos (si None, se calcula)
            tokens_input: Tokens del prompt (si None, usa request_type)
            tokens_output: Tokens generados (si None, usa request_type)
            request_type: Tipo de petición. Opciones para LLM:
                - "chat_simple": Pregunta-respuesta corta (50+100 tokens)
                - "chat_extended": Conversación extendida (200+500 tokens)
                - "generation_short": Texto corto (20+256 tokens)
                - "generation_long": Texto largo (50+2048 tokens)
                - "summarization": Resumen (1000+200 tokens)
                - "code_generation": Código (100+300 tokens)
                - "translation": Traducción (200+220 tokens)
            data_transferred_mb: MB transferidos en la consulta
            inference_processor: Procesador para inferencia local (cpu/gpu/npu/auto)
            utilization: Factor de utilización del procesador (0.0-1.0)
        
        Returns:
            EmissionResult con el desglose de emisiones
        """
        
        # Obtener datos de cada componente
        model = self.get_model(model_id)
        dc = self.get_data_center(data_center_id)
        device = self.get_device(device_id)
        network = self.get_network(network_id)
        
        # ===== LÓGICA DE TOKENS Y TIEMPO v2.0 =====
        # Ahora usamos los datos del modelo para calcular automáticamente
        
        # Diccionario de tipos de petición (sincronizado con request_types.csv)
        REQUEST_TYPES = {
            "chat_simple": {"tokens_input": 50, "tokens_output": 100},
            "chat_extended": {"tokens_input": 200, "tokens_output": 500},
            "generation_short": {"tokens_input": 20, "tokens_output": 256},
            "generation_long": {"tokens_input": 50, "tokens_output": 2048},
            "summarization": {"tokens_input": 1000, "tokens_output": 200},
            "code_generation": {"tokens_input": 100, "tokens_output": 300},
            "translation": {"tokens_input": 200, "tokens_output": 220},
            "image_classification": {"tokens_input": 196, "tokens_output": 10},
            "image_captioning": {"tokens_input": 196, "tokens_output": 50},
            "visual_qa": {"tokens_input": 250, "tokens_output": 100},
            "text_classification": {"tokens_input": 128, "tokens_output": 1},
            "sentiment_analysis": {"tokens_input": 64, "tokens_output": 1},
            "ner": {"tokens_input": 100, "tokens_output": 50}
        }
        
        # Determinar tokens según prioridad:
        # 1. Si se especifican tokens_input/output explícitamente, usarlos
        # 2. Si se especifica request_type, usar sus valores
        # 3. Si hay modelo, usar su typical_request_type
        # 4. Default: chat_simple
        
        if tokens_input is not None and tokens_output is not None:
            # Tokens explícitos
            pass
        elif request_type is not None and request_type in REQUEST_TYPES:
            # Usar tipo de petición especificado
            tokens_input = REQUEST_TYPES[request_type]["tokens_input"]
            tokens_output = REQUEST_TYPES[request_type]["tokens_output"]
        elif model is not None:
            # Usar petición típica del modelo
            typical_type = model.get('typical_request_type', 'chat_simple')
            if typical_type in REQUEST_TYPES:
                tokens_input = REQUEST_TYPES[typical_type]["tokens_input"]
                tokens_output = REQUEST_TYPES[typical_type]["tokens_output"]
            else:
                tokens_input = 50
                tokens_output = 100
        else:
            # Default
            tokens_input = 50
            tokens_output = 100
        
        # VALIDACIÓN v2.1: Verificar que no se exceda max_output_tokens del modelo
        if model is not None:
            max_output = model.get('max_output_tokens', None)
            if max_output is not None and max_output > 0:
                if tokens_output > max_output:
                    print(f"[WARN] tokens_output ({tokens_output}) excede max_output_tokens ({max_output}) del modelo. Limitando.")
                    tokens_output = int(max_output)
        
        tokens_processed = tokens_input + tokens_output
        
        # Calcular tiempo de inferencia si no se especifica
        if inference_time_sec is None:
            if model is not None:
                # Usar latencia del modelo
                latency_ms = model.get('latency_ms_per_token', 20)
                # El tiempo de inferencia depende principalmente de tokens de salida
                inference_time_sec = (latency_ms * tokens_output) / 1000
            else:
                # Estimación por defecto: 20ms por token
                inference_time_sec = (20 * tokens_output) / 1000
        
        # Carbon Intensity
        # MEJORA v2.2: Usar zona específica de Electricity Maps para el DC
        ci_local = self.get_carbon_intensity(user_country)  # gCO2/kWh
        
        # Para el DC, usar la zona específica de Electricity Maps (más preciso)
        if dc is not None:
            ci_dc = self.get_carbon_intensity_for_dc(data_center_id, dc['country_code'])
        else:
            ci_dc = ci_local
        
        # ===== 1. EMISIONES DEL DISPOSITIVO =====
        # MODELO DE CONSUMO DINÁMICO v2.0
        # Fórmula: P_real = P_idle + (P_TDP - P_idle) × U
        # Donde U = factor de utilización (0-1)
        # 
        # DIFERENCIA CON OTRAS HERRAMIENTAS:
        # - CodeCarbon, ML CO2 Impact: Asumen U=1.0 (100% carga siempre)
        # - Esta calculadora: Permite especificar U según la carga real
        # - Resultado: Estimaciones más precisas del consumo real
        
        # Validar factor de utilización
        utilization = max(0.0, min(1.0, utilization))  # Clamp entre 0 y 1
        
        if device is not None:
            # Determinar qué procesador se usa para la inferencia
            if inference_processor == "auto":
                processor = device.get('primary_inference_target', 'cpu').lower()
            else:
                processor = inference_processor.lower()
            
            # Obtener P_idle (consumo en reposo del sistema)
            p_idle = device.get('system_idle_watts', 5.0)
            
            # Seleccionar P_TDP según el procesador
            if processor == "gpu":
                p_tdp = device.get('gpu_tdp_watts', 0)
                p_inference_max = device.get('inference_gpu_watts', 0)
                # Fallback a CPU si no hay GPU
                if p_tdp == 0:
                    processor = "cpu"
                    p_tdp = device.get('cpu_tdp_watts', 50)
                    p_inference_max = device.get('inference_cpu_watts', 50)
            elif processor == "npu":
                p_tdp = device.get('npu_tdp_watts', 0)
                p_inference_max = device.get('inference_npu_watts', 0)
                # Fallback a CPU si no hay NPU
                if p_tdp == 0:
                    processor = "cpu"
                    p_tdp = device.get('cpu_tdp_watts', 50)
                    p_inference_max = device.get('inference_cpu_watts', 50)
            else:  # CPU por defecto
                p_tdp = device.get('cpu_tdp_watts', 50)
                p_inference_max = device.get('inference_cpu_watts', 50)
            
            # MODELO DE CONSUMO DINÁMICO:
            # P_real = P_idle + (P_max_inference - P_idle) × U
            # Usamos inference_X_watts como P_max para ese procesador
            # porque representa el consumo máximo típico durante inferencia
            device_watts = p_idle + (p_inference_max - p_idle) * utilization
            
            # Asegurar que no sea menor que idle ni mayor que TDP
            device_watts = max(p_idle, min(p_tdp, device_watts))
        else:
            device_watts = 50 * utilization  # Valor por defecto escalado
            processor = "cpu"
            p_idle = 5.0
        
        # Energía del dispositivo (Wh)
        # E = P × t, donde P está en W y t en horas
        energy_device_wh = device_watts * (inference_time_sec / 3600)
        
        # CO2 del dispositivo (gCO2)
        # CO2 = E(kWh) × CI(gCO2/kWh)
        co2_device_g = (energy_device_wh / 1000) * ci_local
        
        # ===== 2. EMISIONES DE LA RED =====
        if network is not None:
            energy_per_mb = network['energy_per_mb_wh']  # Wh/MB
            carbon_multiplier = network.get('carbon_multiplier', 1.0)
        else:
            energy_per_mb = 0.00025  # 4G LTE por defecto
            carbon_multiplier = 1.3
        
        # Energía de red (Wh)
        energy_network_wh = energy_per_mb * data_transferred_mb * 1000  # Convertir a Wh
        
        # CO2 de red (gCO2)
        co2_network_g = (energy_network_wh / 1000) * ci_local * carbon_multiplier
        
        # ===== 3. EMISIONES DEL DATA CENTER =====
        # NUEVA LÓGICA v2.0: Usar energy_wh_per_1k_tokens del modelo si está disponible
        
        if dc is not None:
            pue = dc['pue']
        else:
            pue = 1.15  # Promedio global
        
        if model is not None:
            # PRIORIDAD 1: Usar energy_wh_per_1k_tokens del modelo (v2.0)
            energy_per_1k = model.get('energy_wh_per_1k_tokens', None)
            
            if energy_per_1k is not None and energy_per_1k > 0:
                # Cálculo directo basado en datos del modelo
                # E_compute = (tokens / 1000) × energy_wh_per_1k_tokens
                energy_compute_wh = (tokens_processed / 1000) * energy_per_1k
            else:
                # FALLBACK: Calcular basado en FLOPS (método anterior)
                try:
                    params = model.get('num_parameters', 1e9)
                    if isinstance(params, str):
                        params = float(params.replace('B', 'e9').replace('M', 'e6'))
                except:
                    params = 1e9
                
                flops_inference = 2 * params * tokens_processed
                tflops = flops_inference / 1e12
                energy_compute_wh = tflops * WATTS_PER_TFLOP * (inference_time_sec / 3600) / GPU_EFFICIENCY
        else:
            # Sin modelo: usar estimación por defecto
            energy_compute_wh = (tokens_processed / 1000) * 0.002  # 2 mWh/1k tokens (modelo medio)
        
        # Energía total del data center con PUE (Wh)
        # El PUE incluye refrigeración, pérdidas, etc.
        energy_datacenter_wh = energy_compute_wh * pue
        
        # CO2 del data center (gCO2)
        co2_datacenter_g = (energy_datacenter_wh / 1000) * ci_dc
        
        # ===== TOTALES =====
        co2_total_g = co2_device_g + co2_network_g + co2_datacenter_g
        energy_total_wh = energy_device_wh + energy_network_wh + energy_datacenter_wh
        
        # Obtener información de renovables del DC
        dc_renewable_info = self.get_dc_renewable_info(data_center_id)
        
        return EmissionResult(
            co2_device_g=co2_device_g,
            co2_network_g=co2_network_g,
            co2_datacenter_g=co2_datacenter_g,
            co2_total_g=co2_total_g,
            energy_device_wh=energy_device_wh,
            energy_network_wh=energy_network_wh,
            energy_datacenter_wh=energy_datacenter_wh,
            energy_total_wh=energy_total_wh,
            model_name=model['model_name'] if model is not None else model_id,
            device_name=device['device_name'] if device is not None else device_id,
            network_type=network['network_name'] if network is not None else network_id,
            data_center_name=dc['region'] if dc is not None else data_center_id,
            inference_time_sec=inference_time_sec,
            tokens_processed=tokens_processed,
            dc_renewable_grid_pct=dc_renewable_info['renewable_grid_pct'],
            dc_renewable_provider_pct=dc_renewable_info['provider_renewable_pct'],
            dc_carbon_intensity=ci_dc
        )
    
    def list_available(self) -> Dict[str, list]:
        """Lista todos los IDs disponibles en cada dataset"""
        result = {}
        
        if self.models_df is not None:
            result['models'] = self.models_df['model_id'].tolist()
        
        if self.data_centers_df is not None:
            result['data_centers'] = self.data_centers_df['dc_id'].tolist()
        
        if self.devices_df is not None:
            result['devices'] = self.devices_df['device_id'].tolist()
        
        if self.network_df is not None:
            result['network_types'] = self.network_df['network_id'].tolist()
        
        return result


def main():
    """Ejemplo de uso de la calculadora"""
    print("=" * 70)
    print("CALCULADORA DE EMISIONES DE CARBONO - INFERENCIA IA")
    print("=" * 70)
    print()
    
    # Inicializar calculadora
    calc = CarbonCalculator()
    print()
    
    # Mostrar IDs disponibles
    available = calc.list_available()
    print("IDs disponibles:")
    for category, ids in available.items():
        print(f"  {category}: {len(ids)} items")
        if len(ids) <= 10:
            for id_ in ids[:5]:
                print(f"    - {id_}")
            if len(ids) > 5:
                print(f"    ... y {len(ids) - 5} mas")
    print()
    
    # Ejemplo de calculo
    print("=" * 70)
    print("EJEMPLO DE CALCULO v2.0 - CON TIPOS DE PETICIÓN")
    print("=" * 70)
    
    # Escenario 1: Chat simple con GPT-4 (tiempo y tokens automáticos)
    result1 = calc.calculate_emissions(
        model_id="gpt-4",
        data_center_id="aws-eu-west-1",
        device_id="phone-iphone-15-pro",
        network_id="4g-lte",
        user_country="ES",
        request_type="chat_simple",  # 50+100 tokens, tiempo automático
        inference_processor="auto"
    )
    
    print("\nEscenario 1: GPT-4 + iPhone 15 Pro + Chat Simple")
    print("          [request_type=chat_simple → 150 tokens, tiempo auto]")
    print("-" * 50)
    print(result1)
    
    # Escenario 2: Generación de código larga con Llama 2
    result2 = calc.calculate_emissions(
        model_id="llama2-70b",
        data_center_id="gcp-us-central1",
        device_id="laptop-macbook-air-m3",
        network_id="wifi-5",
        user_country="US-CA",
        request_type="code_generation",  # 100+300 tokens
        inference_processor="cpu"
    )
    
    print("\nEscenario 2: Llama 2 70B + MacBook Air M3 + Generación Código")
    print("          [request_type=code_generation → 400 tokens]")
    print("-" * 50)
    print(result2)
    
    # Escenario 3: Generación de texto largo con Mistral (especificando tokens)
    result3 = calc.calculate_emissions(
        model_id="mistral-7b",
        data_center_id="gcp-europe-west1",
        device_id="desktop-gaming-rtx4090",
        network_id="fiber-ftth",
        user_country="DE",
        tokens_input=100,
        tokens_output=2000,  # Generación larga personalizada
        inference_processor="gpu"
    )
    
    print("\nEscenario 3: Mistral 7B + RTX 4090 + 2000 tokens output")
    print("          [tokens personalizados: 100 in + 2000 out]")
    print("-" * 50)
    print(result3)
    
    # Escenario 4: Comparación CPU vs GPU en mismo dispositivo
    print("\n" + "=" * 70)
    print("COMPARACION CPU vs GPU vs NPU (MacBook Pro M3 Max)")
    print("=" * 70)
    
    for proc in ["cpu", "gpu", "npu"]:
        r = calc.calculate_emissions(
            model_id="gpt-4",
            data_center_id="azure-west-europe",
            device_id="laptop-macbook-pro-m3-max",
            network_id="fiber-home",
            user_country="ES",
            request_type="chat_simple",
            inference_processor=proc,
            utilization=0.7
        )
        print(f"  {proc.upper():3s}: Dispositivo={r.energy_device_wh*1000:.1f}mWh, CO2={r.co2_device_g*1000:.2f}mgCO2")
    
    # Escenario 5: COMPARACIÓN DE TIPOS DE PETICIÓN
    print("\n" + "=" * 70)
    print("EFECTO DEL TIPO DE PETICIÓN (GPT-4 en mismo hardware)")
    print("=" * 70)
    
    for req_type in ["chat_simple", "chat_extended", "generation_long", "summarization"]:
        r = calc.calculate_emissions(
            model_id="gpt-4",
            data_center_id="aws-eu-west-1",
            device_id="laptop-macbook-pro-m3-max",
            network_id="wifi-5",
            user_country="ES",
            request_type=req_type
        )
        print(f"  {req_type:20s}: Tokens={r.tokens_processed:4d}, Tiempo={r.inference_time_sec:.1f}s, CO2={r.co2_total_g:.4f}gCO2")
    
    # Escenario 6: COMPARACIÓN DE MODELOS (misma petición)
    print("\n" + "=" * 70)
    print("COMPARACIÓN DE MODELOS (misma petición: chat_simple)")
    print("=" * 70)
    
    for model_id in ["gpt-4", "llama2-70b", "mistral-7b", "bert-base-uncased"]:
        r = calc.calculate_emissions(
            model_id=model_id,
            data_center_id="gcp-europe-west1",
            device_id="laptop-macbook-pro-m3-max",
            network_id="wifi-5",
            user_country="DE",
            request_type="chat_simple"
        )
        print(f"  {model_id:20s}: E_DC={r.energy_datacenter_wh*1000:.2f}mWh, CO2_DC={r.co2_datacenter_g*1000:.2f}mgCO2, Tiempo={r.inference_time_sec:.2f}s")
    
    # Escenario 7: EFECTO DEL FACTOR DE UTILIZACIÓN
    print("\n" + "=" * 70)
    print("EFECTO DEL FACTOR DE UTILIZACION (Desktop RTX 4090)")
    print("Fórmula: P_real = P_idle + (P_max - P_idle) × U")
    print("=" * 70)
    print("  NOTA: Otras herramientas (CodeCarbon, ML CO2 Impact) asumen U=1.0\n")
    
    for util in [0.3, 0.5, 0.7, 1.0]:
        r = calc.calculate_emissions(
            model_id="llama2-70b",
            data_center_id="gcp-europe-west1",
            device_id="desktop-gaming-rtx4090",
            network_id="fiber-ftth",
            user_country="DE",
            request_type="generation_long",
            inference_processor="gpu",
            utilization=util
        )
        util_label = "100% (otras herram.)" if util == 1.0 else f"{int(util*100)}%"
        print(f"  U={util_label:18s}: E_disp={r.energy_device_wh:.4f}Wh, CO2_disp={r.co2_device_g:.4f}gCO2")
    
    print()
    print("=" * 70)
    print("Resumen de escenarios:")
    print(f"  Escenario 1 (GPT-4 chat):       {result1.co2_total_g:.4f} gCO2")
    print(f"  Escenario 2 (Llama 2 código):   {result2.co2_total_g:.4f} gCO2")
    print(f"  Escenario 3 (Mistral gen larga):{result3.co2_total_g:.4f} gCO2")
    print("=" * 70)


if __name__ == "__main__":
    main()

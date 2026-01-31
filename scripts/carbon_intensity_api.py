#!/usr/bin/env python3
"""
Módulo de Carbon Intensity API v2.3
===================================

Integración con Electricity Maps API para obtener intensidad de carbono
en tiempo real por zona/región.

FUNCIONALIDADES v2.3:
- Obtención DINÁMICA de todas las zonas (~350+) desde la API
- Mapeo automático de data centers a zonas de Electricity Maps
- Caché local para reducir llamadas API
- Fallback a valores por defecto
- Generación de carbon_intensity_datacenters.csv (PRINCIPAL)
  * Con CI específica de cada DC
  * Con % renovables de red (fossil_free_pct, renewable_pct)
  * Con % renovables declarado por proveedor (provider_renewable_pct)
  * Con efectos PUE incluidos
- Mapeo de 71 data centers a sus zonas específicas
- Obtención de porcentajes renovables vía endpoint power-breakdown

API Endpoints usados:
- GET /v3/carbon-intensity/latest?zone={zone}
- GET /v3/power-breakdown/latest?zone={zone} (para porcentajes renovables)
- GET /v3/zones (lista todas las zonas disponibles)

Documentación: https://static.electricitymaps.com/api/docs/index.html
"""

import json
import os
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import pandas as pd

# Intentar importar httpx, si no está disponible usar requests
try:
    import httpx
    HTTP_CLIENT = "httpx"
except ImportError:
    try:
        import requests
        HTTP_CLIENT = "requests"
    except ImportError:
        HTTP_CLIENT = None
        print("[WARN] Ni httpx ni requests disponibles. Instala uno: pip install httpx")

# ===== CONFIGURACIÓN =====
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")
CACHE_FILE = os.path.join(BASE_DIR, "datasets", "raw", "carbon_intensity", "carbon_intensity_cache.json")
CSV_OUTPUT = os.path.join(BASE_DIR, "datasets", "raw", "carbon_intensity", "carbon_intensity.csv")
CSV_DATACENTER_OUTPUT = os.path.join(BASE_DIR, "datasets", "raw", "carbon_intensity", "carbon_intensity_datacenters.csv")
DATA_CENTERS_FILE = os.path.join(BASE_DIR, "datasets", "raw", "data_centers", "data_centers.csv")

# Electricity Maps API
API_BASE_URL = "https://api.electricitymap.org/v3"
CACHE_TTL_SECONDS = 900  # 15 minutos de caché

# Archivo JSON con las zonas de Electricity Maps (fallback cuando API rate-limited)
ZONES_JSON_FILE = os.path.join(BASE_DIR, "datasets", "raw", "carbon_intensity", "electricity_maps_zones.json")


def load_electricity_maps_zones() -> List[str]:
    """
    Carga la lista de zonas de Electricity Maps desde archivo JSON.
    Se usa como fallback cuando la API tiene rate limiting.
    
    Returns:
        Lista de códigos de zona (352 zonas)
    """
    try:
        if os.path.exists(ZONES_JSON_FILE):
            with open(ZONES_JSON_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                zones = data.get('zones', [])
                if zones:
                    return zones
    except Exception as e:
        print(f"[WARN] Error cargando {ZONES_JSON_FILE}: {e}")
    
    # Fallback mínimo si el archivo no existe o está corrupto
    print("[WARN] Usando lista mínima de zonas de fallback")
    return ['ES', 'FR', 'DE', 'GB', 'IT', 'US', 'CA', 'AU', 'JP', 'BR']


# Cargar zonas al inicio del módulo
ALL_ELECTRICITY_MAPS_ZONES = load_electricity_maps_zones()

# ========================================================================
# MAPEO COMPLETO DE DATA CENTERS A ZONAS DE ELECTRICITY MAPS
# ========================================================================
# Este mapeo conecta cada data center (por región/ubicación) con la zona
# específica de Electricity Maps para obtener CI preciso.
#
# Formato: "region_keyword": "electricity_maps_zone"
# ========================================================================

DATACENTER_REGION_TO_ZONE = {
    # ===== USA - Zonas específicas por estado/región =====
    # Oregon
    "oregon": "US-NW-BPAT",
    "us-west1": "US-NW-BPAT",
    "us-west-2": "US-NW-BPAT",
    "us-or1": "US-NW-BPAT",
    
    # California
    "california": "US-CAL-CISO",
    "us-west-1": "US-CAL-CISO",  # N. California
    "us-cal": "US-CAL-CISO",
    
    # Virginia / East Coast
    "virginia": "US-MIDA-PJM",
    "us-east-1": "US-MIDA-PJM",
    "us-east4": "US-MIDA-PJM",
    "us-va1": "US-MIDA-PJM",
    "eastus": "US-MIDA-PJM",
    
    # Ohio
    "ohio": "US-MIDW-MISO",
    "us-east-2": "US-MIDW-MISO",
    "us-east5": "US-MIDW-MISO",
    "us-oh1": "US-MIDW-MISO",
    
    # Iowa
    "iowa": "US-MIDW-MISO",
    "us-central1": "US-MIDW-MISO",
    "us-ia1": "US-MIDW-MISO",
    "centralus": "US-MIDW-MISO",
    
    # Texas
    "texas": "US-TEX-ERCO",
    "us-south1": "US-TEX-ERCO",
    "us-tx1": "US-TEX-ERCO",
    "southcentralus": "US-TEX-ERCO",
    
    # Nevada
    "nevada": "US-SW-NEVP",
    "us-west4": "US-SW-NEVP",
    "us-nv1": "US-SW-NEVP",
    "us-nv2": "US-SW-NEVP",
    
    # Georgia
    "georgia": "US-SE-SOCO",
    "us-ga1": "US-SE-SOCO",
    
    # South Carolina
    "south carolina": "US-CAR-DUK",
    "us-east1": "US-CAR-DUK",
    
    # North Carolina
    "north carolina": "US-CAR-DUK",
    "us-nc1": "US-CAR-DUK",
    
    # Alabama
    "alabama": "US-SE-SOCO",
    "us-al1": "US-SE-SOCO",
    
    # Tennessee
    "tennessee": "US-TEN-TVA",
    "us-tn1": "US-TEN-TVA",
    
    # Oklahoma
    "oklahoma": "US-CENT-SWPP",
    "us-ok1": "US-CENT-SWPP",
    
    # Nebraska
    "nebraska": "US-CENT-SWPP",
    "us-ne1": "US-CENT-SWPP",
    
    # New York
    "new york": "US-NY-NYIS",
    "us-ny": "US-NY-NYIS",
    
    # Washington
    "washington": "US-NW-PSEI",
    "westus2": "US-NW-PSEI",
    
    # Wyoming
    "wyoming": "US-NW-PACE",
    
    # Arizona
    "arizona": "US-SW-AZPS",
    
    # Illinois
    "illinois": "US-MIDW-MISO",
    
    # ===== EUROPA =====
    # Irlanda
    "ireland": "IE",
    "eu-west-1": "IE",
    "europe-west2": "IE",
    "northeurope": "IE",
    
    # Reino Unido
    "uk": "GB",
    "exmouth": "GB",
    
    # Países Bajos
    "netherlands": "NL",
    "europe-west4": "NL",
    "westeurope": "NL",
    
    # Bélgica
    "belgium": "BE",
    "europe-west1": "BE",
    
    # Alemania / Frankfurt
    "frankfurt": "DE",
    "germany": "DE",
    "eu-central-1": "DE",
    
    # España
    "spain": "ES",
    "eu-south-2": "ES",
    
    # Suecia / Estocolmo
    "sweden": "SE",
    "stockholm": "SE",
    "eu-north-1": "SE",
    "swedencentral": "SE",
    
    # Finlandia
    "finland": "FI",
    "europe-north1": "FI",
    
    # Dinamarca
    "denmark": "DK-DK1",
    "europe-west3": "DK-DK1",
    
    # Polonia
    "poland": "PL",
    "polandcentral": "PL",
    
    # ===== ASIA-PACÍFICO =====
    # Singapur
    "singapore": "SG",
    "asia-southeast1": "SG",
    "ap-southeast-1": "SG",
    "southeastasia": "SG",
    
    # Japón / Tokyo
    "tokyo": "JP-TK",
    "japan": "JP-TK",
    "ap-northeast-1": "JP-TK",
    
    # Australia / Sydney
    "sydney": "AU-NSW",
    "australia": "AU-NSW",
    "ap-southeast-2": "AU-NSW",
    "au-sy1": "AU-NSW",
    
    # Melbourne
    "melbourne": "AU-VIC",
    "au-mel1": "AU-VIC",
    
    # India / Mumbai
    "mumbai": "IN-WE",
    "india": "IN-WE",
    "ap-south-1": "IN-WE",
    
    # Hyderabad
    "hyderabad": "IN-SO",
    "ap-south-2": "IN-SO",
    
    # Taiwan
    "taiwan": "TW",
    "asia-east1": "TW",
    
    # China
    "china": "CN",
    "ningxia": "CN",
    "cn-north-1": "CN",
    
    # ===== AMÉRICA LATINA =====
    # Brasil / Sao Paulo
    "brazil": "BR-S",
    "sao paulo": "BR-S",
    "sa-east-1": "BR-S",
    
    # Chile
    "chile": "CL-SEN",
    "southamerica-west1": "CL-SEN",
    
    # ===== CANADÁ =====
    "canada": "CA-ON",
    "ca-central-1": "CA-ON",
    "ca-west-1": "CA-AB",
    
    # ===== MEDIO ORIENTE / ÁFRICA =====
    "uae": "AE",
    "me-central-1": "AE",
    
    "bahrain": "BH",
    "me-south-1": "BH",
    
    "cape town": "ZA",
    "south africa": "ZA",
    "af-south-1": "ZA",
}

# Mapeo simple de códigos de país a zonas principales
COUNTRY_TO_ZONE = {
    # Europa
    "ES": "ES", "FR": "FR", "DE": "DE", "UK": "GB", "GB": "GB",
    "IE": "IE", "NL": "NL", "BE": "BE", "IT": "IT-NO", "PT": "PT",
    "NO": "NO-NO1", "SE": "SE", "DK": "DK-DK1", "FI": "FI",
    "PL": "PL", "AT": "AT", "CH": "CH", "CZ": "CZ", "HU": "HU",
    "RO": "RO", "GR": "GR", "BG": "BG", "HR": "HR", "SK": "SK",
    "SI": "SI", "EE": "EE", "LV": "LV", "LT": "LT",
    
    # América
    "US": "US-MIDA-PJM", "CA": "CA-ON", "MX": "MX", "BR": "BR-S",
    "AR": "AR", "CL": "CL-SEN", "CO": "CO",
    
    # Asia-Pacífico
    "JP": "JP-TK", "CN": "CN", "IN": "IN-WE", "AU": "AU-NSW",
    "KR": "KR", "SG": "SG", "TW": "TW", "HK": "HK",
    "TH": "TH", "MY": "MY-WM", "ID": "ID", "PH": "PH",
    "VN": "VN", "NZ": "NZ-NZN",
    
    # Medio Oriente / África
    "AE": "AE", "SA": "SA", "ZA": "ZA", "BH": "BH", "IL": "IL",
    
    # Otros
    "GLOBAL": "DE",  # Alemania como referencia global
}

# Valores por defecto (fallback si API no disponible)
# Fuente: Electricity Maps promedios 2024-2025
DEFAULT_CARBON_INTENSITY = {
    # Europa
    "ES": 145, "IE": 350, "DE": 380, "FR": 50, "GB": 230, "UK": 230,
    "NL": 280, "BE": 150, "IT": 330, "PT": 180, "NO": 20, "SE": 25,
    "DK": 150, "FI": 100, "PL": 650, "AT": 100, "CH": 30, "CZ": 400,
    
    # USA por zona
    "US": 380, "US-MIDA-PJM": 350, "US-CAL-CISO": 180, "US-NW-BPAT": 80,
    "US-TEX-ERCO": 400, "US-NY-NYIS": 250, "US-MIDW-MISO": 450,
    "US-SE-SOCO": 400, "US-CAR-DUK": 350, "US-TEN-TVA": 380,
    
    # Asia-Pacífico
    "JP": 450, "JP-TK": 450, "CN": 550, "IN": 700, "IN-WE": 700, "IN-SO": 750,
    "AU": 500, "AU-NSW": 520, "AU-VIC": 480, "KR": 450, "SG": 400,
    "TW": 500, "HK": 450, "TH": 450, "MY": 550, "ID": 700, "NZ": 100,
    
    # América
    "CA": 120, "CA-ON": 40, "CA-AB": 500, "MX": 400, "BR": 80, "BR-S": 100,
    "AR": 350, "CL": 300, "CL-SEN": 280, "CO": 150,
    
    # Medio Oriente / África
    "AE": 450, "SA": 550, "ZA": 700, "BH": 500, "IL": 450,
    
    "GLOBAL": 450
}


class CarbonIntensityAPI:
    """
    Cliente para Electricity Maps API v2.0.
    
    Proporciona intensidad de carbono en tiempo real con:
    - Obtención dinámica de TODAS las zonas disponibles
    - Mapeo automático de data centers a zonas
    - Caché local con TTL configurable
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Inicializa el cliente de API.
        
        Args:
            api_key: API key de Electricity Maps. Si None, intenta cargar de credentials.json
        """
        self.api_key = api_key or self._load_api_key()
        self.cache = self._load_cache()
        self.available_zones: Optional[Dict] = None
        self.all_zone_codes: Optional[List[str]] = None
        
        if self.api_key:
            print(f"[OK] Carbon Intensity API v2.0 inicializada (key: ...{self.api_key[-4:]})")
        else:
            print("[WARN] API key no encontrada. Usando valores por defecto.")
    
    def _load_api_key(self) -> Optional[str]:
        """Carga la API key desde credentials.json"""
        try:
            if os.path.exists(CREDENTIALS_FILE):
                with open(CREDENTIALS_FILE, 'r') as f:
                    creds = json.load(f)
                
                # Formato simple (api_key directamente)
                if 'api_key' in creds:
                    return creds.get('api_key')
                
                # Buscar en el formato con credentials array
                if 'credentials' in creds:
                    for cred in creds['credentials']:
                        if cred.get('service') == 'electricity_maps':
                            return cred.get('api_key')
                
                # Formato alternativo
                return creds.get('electricity_maps_api_key')
        except Exception as e:
            print(f"[WARN] Error cargando credentials: {e}")
        
        return None
    
    def _load_cache(self) -> Dict[str, Any]:
        """Carga el caché de intensidades de carbono"""
        try:
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, 'r') as f:
                    return json.load(f)
        except Exception:
            pass
        return {}
    
    def _save_cache(self):
        """Guarda el caché a disco"""
        try:
            os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
            with open(CACHE_FILE, 'w') as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            print(f"[WARN] Error guardando caché: {e}")
    
    def _make_request(self, endpoint: str, params: Dict = None, retry_count: int = 0) -> Optional[Dict]:
        """
        Realiza una petición a la API con reintentos automáticos.
        
        La API de Electricity Maps tiene rate limiting. Si devuelve {} vacío,
        esperamos y reintentamos.
        """
        if not self.api_key:
            return None
        
        if HTTP_CLIENT is None:
            return None
        
        url = f"{API_BASE_URL}/{endpoint}"
        headers = {"auth-token": self.api_key}
        
        MAX_RETRIES = 3
        
        try:
            if HTTP_CLIENT == "httpx":
                response = httpx.get(url, headers=headers, params=params, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    # Verificar si la API devolvió {} vacío por rate limiting
                    if data == {} and endpoint == "zones" and retry_count < MAX_RETRIES:
                        print(f"[INFO] Rate limiting detectado, reintentando ({retry_count + 1}/{MAX_RETRIES})...")
                        time.sleep(2 * (retry_count + 1))  # Backoff exponencial
                        return self._make_request(endpoint, params, retry_count + 1)
                    return data
                elif response.status_code != 404:
                    pass  # Silenciar errores 404 (zona no encontrada)
            else:  # requests
                response = requests.get(url, headers=headers, params=params, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    if data == {} and endpoint == "zones" and retry_count < MAX_RETRIES:
                        print(f"[INFO] Rate limiting detectado, reintentando ({retry_count + 1}/{MAX_RETRIES})...")
                        time.sleep(2 * (retry_count + 1))
                        return self._make_request(endpoint, params, retry_count + 1)
                    return data
        except Exception:
            pass
        
        return None
    
    # ========================================================================
    # MÉTODOS DE ZONAS DINÁMICAS
    # ========================================================================
    
    def get_all_zones(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Obtiene TODAS las zonas disponibles desde la API.
        
        Returns:
            Dict con información de cada zona {zone_code: {zoneName, countryName, ...}}
        """
        cache_key = "all_zones"
        
        # Verificar caché (las zonas cambian raramente)
        if not force_refresh and cache_key in self.cache:
            cached = self.cache[cache_key]
            cached_time = datetime.fromisoformat(cached.get('timestamp', '2000-01-01'))
            # Caché de zonas: 24 horas
            if datetime.now() - cached_time < timedelta(hours=24):
                self.available_zones = cached.get('zones', {})
                self.all_zone_codes = list(self.available_zones.keys())
                return self.available_zones
        
        # Consultar API
        data = self._make_request("zones")
        
        if data:
            self.available_zones = data
            self.all_zone_codes = list(data.keys())
            
            # Guardar en caché
            self.cache[cache_key] = {
                'zones': data,
                'timestamp': datetime.now().isoformat(),
                'count': len(data)
            }
            self._save_cache()
            
            print(f"[OK] {len(data)} zonas disponibles cargadas desde API")
            return data
        
        # Fallback: usar lista hardcodeada de 352 zonas
        print("[INFO] API rate-limited o sin respuesta. Usando lista de zonas hardcodeada (352 zonas).")
        self.all_zone_codes = ALL_ELECTRICITY_MAPS_ZONES.copy()
        # Crear diccionario básico de zonas (sin metadatos, solo códigos)
        fallback_zones = {zone: {'zoneName': zone} for zone in ALL_ELECTRICITY_MAPS_ZONES}
        self.available_zones = fallback_zones
        
        # Guardar en caché para evitar llamadas repetidas
        self.cache[cache_key] = {
            'zones': fallback_zones,
            'timestamp': datetime.now().isoformat(),
            'count': len(fallback_zones),
            'source': 'hardcoded_fallback'
        }
        self._save_cache()
        
        return fallback_zones
    
    def get_zone_codes(self) -> List[str]:
        """Obtiene lista de todos los códigos de zona disponibles"""
        if self.all_zone_codes is None:
            self.get_all_zones()
        return self.all_zone_codes or []
    
    def get_zone_for_country(self, country_code: str) -> str:
        """Convierte código de país a zona de Electricity Maps"""
        return COUNTRY_TO_ZONE.get(country_code.upper(), country_code.upper())
    
    def get_zone_for_datacenter(self, dc_region: str, country_code: str = None) -> str:
        """
        Obtiene la zona de Electricity Maps para un data center específico.
        
        Args:
            dc_region: Región del data center (ej: "us-west-2", "eu-west-1", "oregon")
            country_code: Código de país opcional para fallback
        
        Returns:
            Zona de Electricity Maps (ej: "US-NW-BPAT", "IE")
        """
        region_lower = dc_region.lower()
        
        # Buscar en el mapeo de regiones de data center
        for keyword, zone in DATACENTER_REGION_TO_ZONE.items():
            if keyword in region_lower:
                return zone
        
        # Fallback a código de país
        if country_code:
            return self.get_zone_for_country(country_code)
        
        # Último recurso
        return "GLOBAL"
    
    # ========================================================================
    # MÉTODOS DE CARBON INTENSITY
    # ========================================================================
    
    def get_carbon_intensity(self, zone_or_country: str, use_cache: bool = True) -> float:
        """
        Obtiene la intensidad de carbono para una zona o país.
        
        Args:
            zone_or_country: Zona de EM (US-CAL-CISO) o código de país (ES, DE)
            use_cache: Si True, usa caché si está disponible y no ha expirado
        
        Returns:
            Intensidad de carbono en gCO2/kWh
        """
        # Si parece un código de país simple, convertir a zona
        if len(zone_or_country) <= 3 and not zone_or_country.startswith("US-"):
            zone = self.get_zone_for_country(zone_or_country)
        else:
            zone = zone_or_country
        
        cache_key = f"ci_{zone}"
        
        # Verificar caché
        if use_cache and cache_key in self.cache:
            cached = self.cache[cache_key]
            try:
                cached_time = datetime.fromisoformat(cached['timestamp'].replace('Z', '+00:00').replace('+00:00', ''))
            except:
                cached_time = datetime.now() - timedelta(hours=1)
            
            if datetime.now() - cached_time < timedelta(seconds=CACHE_TTL_SECONDS):
                return cached['carbonIntensity']
        
        # Consultar API
        data = self._make_request("carbon-intensity/latest", params={"zone": zone})
        
        if data and 'carbonIntensity' in data:
            ci = data['carbonIntensity']
            
            # Guardar en caché
            self.cache[cache_key] = {
                'carbonIntensity': ci,
                'zone': zone,
                'timestamp': datetime.now().isoformat(),
                'source': 'electricity_maps_api',
                'fossilFreePercentage': data.get('fossilFreePercentage'),
                'renewablePercentage': data.get('renewablePercentage')
            }
            self._save_cache()
            
            return ci
        
        # Fallback a valores por defecto
        return DEFAULT_CARBON_INTENSITY.get(
            zone, 
            DEFAULT_CARBON_INTENSITY.get(zone_or_country.upper(), 450)
        )
    
    def get_power_breakdown(self, zone: str) -> Dict[str, Any]:
        """
        Obtiene el desglose de fuentes de energía para una zona.
        
        Endpoint: /v3/power-breakdown/latest
        
        Returns:
            Dict con fossilFreePercentage, renewablePercentage, powerProductionBreakdown, etc.
        """
        data = self._make_request("power-breakdown/latest", params={"zone": zone})
        
        if data:
            return {
                'fossilFreePercentage': data.get('fossilFreePercentage'),
                'renewablePercentage': data.get('renewablePercentage'),
                'powerConsumptionTotal': data.get('powerConsumptionTotal'),
                'powerProductionTotal': data.get('powerProductionTotal'),
                'isEstimated': data.get('isEstimated', True),
                'datetime': data.get('datetime'),
                'source': 'electricity_maps_api'
            }
        
        return {
            'fossilFreePercentage': None,
            'renewablePercentage': None,
            'source': 'not_available'
        }
    
    def get_carbon_intensity_with_details(self, zone_or_country: str, 
                                           include_power_breakdown: bool = True) -> Dict[str, Any]:
        """
        Obtiene la intensidad de carbono con información detallada.
        
        Args:
            zone_or_country: Zona de EM o código de país
            include_power_breakdown: Si True, consulta también el endpoint power-breakdown
                                     para obtener fossilFreePercentage y renewablePercentage
        
        Returns:
            Dict con carbonIntensity, zone, source, fossilFreePercentage, renewablePercentage, etc.
        """
        # Determinar zona
        if len(zone_or_country) <= 3 and not zone_or_country.startswith("US-"):
            zone = self.get_zone_for_country(zone_or_country)
        else:
            zone = zone_or_country
        
        data = self._make_request("carbon-intensity/latest", params={"zone": zone})
        
        if data and 'carbonIntensity' in data:
            result = {
                'carbonIntensity': data.get('carbonIntensity', 450),
                'zone': zone,
                'datetime': data.get('datetime'),
                'source': 'electricity_maps_api',
                'fossilFreePercentage': data.get('fossilFreePercentage'),
                'renewablePercentage': data.get('renewablePercentage'),
                'isEstimated': data.get('isEstimated', False)
            }
            
            # Si no vienen los porcentajes y se solicita, consultar power-breakdown
            if include_power_breakdown and (result['fossilFreePercentage'] is None 
                                             or result['renewablePercentage'] is None):
                breakdown = self.get_power_breakdown(zone)
                if breakdown.get('fossilFreePercentage') is not None:
                    result['fossilFreePercentage'] = breakdown['fossilFreePercentage']
                if breakdown.get('renewablePercentage') is not None:
                    result['renewablePercentage'] = breakdown['renewablePercentage']
            
            return result
        
        # Fallback
        default_ci = DEFAULT_CARBON_INTENSITY.get(zone, 
                     DEFAULT_CARBON_INTENSITY.get(zone_or_country.upper(), 450))
        return {
            'carbonIntensity': default_ci,
            'zone': zone,
            'datetime': datetime.now().isoformat(),
            'source': 'default_values',
            'fossilFreePercentage': None,
            'renewablePercentage': None,
            'isEstimated': True
        }
    
    # ========================================================================
    # GENERACIÓN DE CSV
    # ========================================================================
    
    def generate_all_zones_csv(self, limit: int = None, 
                                regions: List[str] = None) -> pd.DataFrame:
        """
        Genera un CSV con intensidades de carbono para TODAS las zonas disponibles.
        
        Args:
            limit: Número máximo de zonas a consultar (None = todas)
            regions: Lista de prefijos de región a incluir (ej: ["US-", "ES", "FR"])
                     Si None, incluye todas las zonas
        
        Returns:
            DataFrame con los datos
        """
        # Obtener todas las zonas
        all_zones = self.get_all_zones()
        
        if not all_zones:
            print("[WARN] No se obtuvieron zonas. Usando mapeo por defecto.")
            return self.generate_csv()
        
        zone_codes = list(all_zones.keys())
        
        # Filtrar por región si se especifica
        if regions:
            zone_codes = [z for z in zone_codes 
                         if any(z.startswith(r) for r in regions)]
        
        # Aplicar límite si se especifica
        if limit:
            zone_codes = zone_codes[:limit]
        
        print(f"\n📊 Obteniendo CI para {len(zone_codes)} zonas...")
        
        results = []
        errors = 0
        
        for i, zone in enumerate(zone_codes):
            zone_info = all_zones.get(zone, {})
            details = self.get_carbon_intensity_with_details(zone)
            
            results.append({
                'zone': zone,
                'zone_name': zone_info.get('zoneName', ''),
                'country_name': zone_info.get('countryName', ''),
                'carbon_intensity_gCO2_kWh': details['carbonIntensity'],
                'fossil_free_pct': details.get('fossilFreePercentage'),
                'renewable_pct': details.get('renewablePercentage'),
                'source': details['source'],
                'is_estimated': details.get('isEstimated', True),
                'timestamp': details.get('datetime', datetime.now().isoformat())
            })
            
            if details['source'] == 'default_values':
                errors += 1
            
            # Progreso cada 50 zonas
            if (i + 1) % 50 == 0:
                print(f"   Procesadas {i + 1}/{len(zone_codes)} zonas...")
            
            # Rate limiting - más conservador para muchas zonas
            time.sleep(0.3)
        
        df = pd.DataFrame(results)
        
        # Guardar CSV
        os.makedirs(os.path.dirname(CSV_OUTPUT), exist_ok=True)
        df.to_csv(CSV_OUTPUT, index=False)
        print(f"\n✅ CSV guardado: {CSV_OUTPUT}")
        print(f"   - Zonas procesadas: {len(df)}")
        print(f"   - Con datos API: {len(df) - errors}")
        print(f"   - Con fallback: {errors}")
        
        return df
    
    def generate_datacenter_csv(self) -> pd.DataFrame:
        """
        Genera un CSV con intensidades de carbono específicas para cada data center
        del dataset data_centers.csv.
        
        Returns:
            DataFrame con DC ID, zona asignada, y CI actual
        """
        if not os.path.exists(DATA_CENTERS_FILE):
            print(f"[WARN] No se encontró {DATA_CENTERS_FILE}")
            return pd.DataFrame()
        
        # Cargar data centers
        dc_df = pd.read_csv(DATA_CENTERS_FILE)
        print(f"\n🏢 Procesando {len(dc_df)} data centers...")
        
        results = []
        
        for _, row in dc_df.iterrows():
            dc_id = row['dc_id']
            region = row['region']
            country = row['country_code']
            
            # Obtener zona de Electricity Maps
            zone = self.get_zone_for_datacenter(region, country)
            
            # Obtener CI
            details = self.get_carbon_intensity_with_details(zone)
            
            results.append({
                'dc_id': dc_id,
                'provider': row['provider_name'],
                'region': region,
                'country_code': country,
                'electricity_maps_zone': zone,
                'carbon_intensity_gCO2_kWh': details['carbonIntensity'],
                'fossil_free_pct': details.get('fossilFreePercentage'),
                'renewable_pct': details.get('renewablePercentage'),
                'provider_renewable_pct': row.get('provider_renewable_pct', None),  # % declarado por proveedor
                'ci_source': details['source'],
                'pue': row['pue'],
                'effective_ci': details['carbonIntensity'] * row['pue'],  # CI × PUE
                'timestamp': details.get('datetime', datetime.now().isoformat())
            })
            
            # Rate limiting
            time.sleep(0.2)
        
        df = pd.DataFrame(results)
        
        # Guardar CSV
        os.makedirs(os.path.dirname(CSV_DATACENTER_OUTPUT), exist_ok=True)
        df.to_csv(CSV_DATACENTER_OUTPUT, index=False)
        print(f"\n✅ CSV guardado: {CSV_DATACENTER_OUTPUT}")
        
        return df
    
    def generate_csv(self, zones: list = None) -> pd.DataFrame:
        """
        Genera un CSV con intensidades de carbono (método legacy compatible).
        
        Args:
            zones: Lista de códigos de zona. Si None, usa COUNTRY_TO_ZONE.
        
        Returns:
            DataFrame con los datos
        """
        if zones is None:
            zones = list(COUNTRY_TO_ZONE.keys())
        
        results = []
        print(f"\nObteniendo CI para {len(zones)} zonas...")
        
        for country in zones:
            details = self.get_carbon_intensity_with_details(country)
            results.append({
                'country_code': country,
                'zone': details['zone'],
                'carbon_intensity_gCO2_kWh': details['carbonIntensity'],
                'fossil_free_pct': details.get('fossilFreePercentage'),
                'renewable_pct': details.get('renewablePercentage'),
                'source': details['source'],
                'is_estimated': details.get('isEstimated', True),
                'timestamp': details.get('datetime', datetime.now().isoformat())
            })
            
            # Rate limiting
            time.sleep(0.3)
        
        df = pd.DataFrame(results)
        
        # Guardar CSV
        os.makedirs(os.path.dirname(CSV_OUTPUT), exist_ok=True)
        df.to_csv(CSV_OUTPUT, index=False)
        print(f"\n✅ CSV guardado: {CSV_OUTPUT}")
        
        return df


# ============================================================================
# FUNCIÓN PRINCIPAL
# ============================================================================

def main():
    """Función principal para testing y generación de CSVs completos"""
    print("=" * 70)
    print("CARBON INTENSITY API v2.0 - Electricity Maps Integration")
    print("=" * 70)
    
    api = CarbonIntensityAPI()
    
    # 1. Obtener todas las zonas disponibles
    print("\n📡 Obteniendo zonas disponibles...")
    all_zones = api.get_all_zones()
    
    if all_zones:
        # Estadísticas por región
        usa_zones = [z for z in all_zones if z.startswith("US-")]
        eu_zones = [z for z in all_zones if any(z.startswith(x) for x in 
                   ["ES", "FR", "DE", "IT", "GB", "IE", "PL", "NL", "BE", "PT", 
                    "NO", "SE", "DK", "FI", "AT", "CH", "CZ", "HU", "RO", "GR"])]
        asia_zones = [z for z in all_zones if any(z.startswith(x) for x in 
                     ["JP", "CN", "IN", "KR", "SG", "TW", "HK", "TH", "MY", "AU", "NZ"])]
        latam_zones = [z for z in all_zones if any(z.startswith(x) for x in 
                      ["BR", "MX", "AR", "CL", "CO", "PE"])]
        
        print(f"\n📊 Zonas disponibles por región:")
        print(f"   - Total: {len(all_zones)}")
        print(f"   - USA: {len(usa_zones)}")
        print(f"   - Europa: {len(eu_zones)}")
        print(f"   - Asia-Pacífico: {len(asia_zones)}")
        print(f"   - Latinoamérica: {len(latam_zones)}")
    
    # 2. Test de algunas zonas
    print("\n🌍 Test de zonas seleccionadas:")
    print("-" * 60)
    
    test_zones = [
        ("ES", "España"),
        ("DE", "Alemania"),
        ("FR", "Francia"),
        ("US-CAL-CISO", "California"),
        ("US-NW-BPAT", "Oregon/Washington"),
        ("US-TEX-ERCO", "Texas"),
        ("NO-NO1", "Noruega"),
        ("PL", "Polonia"),
        ("AU-NSW", "Australia (NSW)"),
        ("BR-S", "Brasil (Sur)"),
    ]
    
    for zone, name in test_zones:
        details = api.get_carbon_intensity_with_details(zone)
        ci = details['carbonIntensity']
        source = details['source'][:12]
        
        if ci < 100:
            emoji = "🟢"
        elif ci < 300:
            emoji = "🟡"
        else:
            emoji = "🔴"
        
        print(f"  {emoji} {zone:15s} ({name:20s}): {ci:5.0f} gCO2/kWh [{source}]")
    
    print("-" * 60)
    
    # 3. Generar CSV de data centers
    print("\n🏢 Generando carbon_intensity_datacenters.csv...")
    dc_df = api.generate_datacenter_csv()
    
    if len(dc_df) > 0:
        print(f"\n📋 Resumen Data Centers:")
        print(f"   - Total DCs: {len(dc_df)}")
        print(f"   - CI mínimo: {dc_df['carbon_intensity_gCO2_kWh'].min():.0f} gCO2/kWh")
        print(f"   - CI máximo: {dc_df['carbon_intensity_gCO2_kWh'].max():.0f} gCO2/kWh")
        print(f"   - CI promedio: {dc_df['carbon_intensity_gCO2_kWh'].mean():.0f} gCO2/kWh")
        
        # Top 5 más limpios (sin duplicados por CI)
        print(f"\n   🌱 Top 5 DCs más limpios:")
        top_clean = dc_df.nsmallest(5, 'carbon_intensity_gCO2_kWh').drop_duplicates(subset=['dc_id'])
        for _, row in top_clean.iterrows():
            print(f"      - {row['dc_id']}: {row['carbon_intensity_gCO2_kWh']:.0f} gCO2/kWh")
        
        # Top 5 más contaminantes (sin duplicados)
        print(f"\n   🏭 Top 5 DCs con mayor CI:")
        top_dirty = dc_df.nlargest(5, 'carbon_intensity_gCO2_kWh').drop_duplicates(subset=['dc_id'])
        for _, row in top_dirty.iterrows():
            print(f"      - {row['dc_id']}: {row['carbon_intensity_gCO2_kWh']:.0f} gCO2/kWh")
    
    # 4. Generar CSV completo de todas las zonas (opcional, limitado)
    print("\n📁 Generando carbon_intensity.csv con zonas principales...")
    
    # Seleccionar zonas principales (evitar sobrecarga de API)
    main_regions = ["ES", "FR", "DE", "GB", "IE", "NL", "BE", "IT", "PT", 
                    "NO", "SE", "DK", "FI", "PL", "AT", "CH",
                    "US-CAL", "US-NW", "US-TEX", "US-NY", "US-MIDA", "US-MIDW",
                    "CA-", "BR-", "CL-", "AU-", "JP-", "IN-", "SG", "KR"]
    
    zones_df = api.generate_all_zones_csv(regions=main_regions)
    
    print(f"\n📋 Resumen Zonas:")
    print(f"   - Total zonas: {len(zones_df)}")
    print(f"   - CI mínimo: {zones_df['carbon_intensity_gCO2_kWh'].min():.0f} gCO2/kWh")
    print(f"   - CI máximo: {zones_df['carbon_intensity_gCO2_kWh'].max():.0f} gCO2/kWh")
    print(f"   - CI promedio: {zones_df['carbon_intensity_gCO2_kWh'].mean():.0f} gCO2/kWh")
    
    print("\n" + "=" * 70)
    print("✅ Generación completada")
    print("=" * 70)
    
    return api


if __name__ == "__main__":
    main()

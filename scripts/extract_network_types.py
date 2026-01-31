#!/usr/bin/env python3
"""
Script para generar el dataset de tipos de conexión de red
Genera: datasets/raw/network/network_types.csv

Fuentes:
- "The carbon footprint of streaming video: fact-checking the headlines" - IEA
- "Energy consumption of ICT" - European Commission JRC
- "Mobile Networks Energy Efficiency" - GSMA
"""

import pandas as pd
from datetime import datetime
import os

# Crear directorio si no existe
output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "datasets/raw/network")
os.makedirs(output_dir, exist_ok=True)

# ===== DATOS DE TIPOS DE RED =====
# Energía por MB basada en estudios de IEA, GSMA y papers académicos
# Valores en Wh (Watt-hours) por MB transferido

network_data = [
    # ==========================================
    # CONEXIONES FIJAS (Hogar/Oficina)
    # ==========================================
    {
        "network_id": "fiber-ftth",
        "network_name": "Fibra Óptica FTTH",
        "network_type": "Fixed",
        "technology": "Fiber to the Home",
        "energy_per_mb_wh": 0.00006,
        "energy_per_gb_wh": 0.06,
        "typical_latency_ms": 5,
        "bandwidth_mbps": 1000,
        "carbon_multiplier": 1.0,
        "availability": "Urban/Suburban",
        "source_url": "https://www.iea.org/commentaries/the-carbon-footprint-of-streaming-video-fact-checking-the-headlines",
        "confidence": 0.90,
        "notes": "Más eficiente. ~0.06 kWh/GB según IEA 2020."
    },
    {
        "network_id": "cable-docsis",
        "network_name": "Cable Coaxial DOCSIS 3.1",
        "network_type": "Fixed",
        "technology": "HFC (Hybrid Fiber Coax)",
        "energy_per_mb_wh": 0.00010,
        "energy_per_gb_wh": 0.10,
        "typical_latency_ms": 15,
        "bandwidth_mbps": 500,
        "carbon_multiplier": 1.0,
        "availability": "Urban/Suburban",
        "source_url": "https://www.iea.org/reports/data-centres-and-data-transmission-networks",
        "confidence": 0.85,
        "notes": "Cable tradicional. Menos eficiente que fibra."
    },
    {
        "network_id": "dsl-vdsl",
        "network_name": "DSL/VDSL",
        "network_type": "Fixed",
        "technology": "Digital Subscriber Line",
        "energy_per_mb_wh": 0.00015,
        "energy_per_gb_wh": 0.15,
        "typical_latency_ms": 25,
        "bandwidth_mbps": 100,
        "carbon_multiplier": 1.0,
        "availability": "Widespread",
        "source_url": "https://www.iea.org/reports/data-centres-and-data-transmission-networks",
        "confidence": 0.80,
        "notes": "Tecnología legacy. Mayor consumo por MB."
    },
    # ==========================================
    # WIFI
    # ==========================================
    {
        "network_id": "wifi-6e",
        "network_name": "WiFi 6E (802.11ax)",
        "network_type": "Wireless-Local",
        "technology": "WiFi 6E",
        "energy_per_mb_wh": 0.00004,
        "energy_per_gb_wh": 0.04,
        "typical_latency_ms": 5,
        "bandwidth_mbps": 2400,
        "carbon_multiplier": 1.0,
        "availability": "Home/Office",
        "source_url": "https://www.wi-fi.org/discover-wi-fi/wi-fi-certified-6e",
        "confidence": 0.85,
        "notes": "Más eficiente que WiFi 5. Banda 6GHz."
    },
    {
        "network_id": "wifi-5",
        "network_name": "WiFi 5 (802.11ac)",
        "network_type": "Wireless-Local",
        "technology": "WiFi 5",
        "energy_per_mb_wh": 0.00006,
        "energy_per_gb_wh": 0.06,
        "typical_latency_ms": 10,
        "bandwidth_mbps": 1300,
        "carbon_multiplier": 1.0,
        "availability": "Home/Office",
        "source_url": "https://www.wi-fi.org/",
        "confidence": 0.88,
        "notes": "Estándar común. Buena eficiencia."
    },
    {
        "network_id": "wifi-4",
        "network_name": "WiFi 4 (802.11n)",
        "network_type": "Wireless-Local",
        "technology": "WiFi 4",
        "energy_per_mb_wh": 0.00010,
        "energy_per_gb_wh": 0.10,
        "typical_latency_ms": 20,
        "bandwidth_mbps": 300,
        "carbon_multiplier": 1.0,
        "availability": "Legacy",
        "source_url": "https://www.wi-fi.org/",
        "confidence": 0.80,
        "notes": "Legacy. Menos eficiente."
    },
    # ==========================================
    # MÓVIL - 5G
    # ==========================================
    {
        "network_id": "5g-sa",
        "network_name": "5G Standalone",
        "network_type": "Mobile",
        "technology": "5G NR Standalone",
        "energy_per_mb_wh": 0.00008,
        "energy_per_gb_wh": 0.08,
        "typical_latency_ms": 10,
        "bandwidth_mbps": 1000,
        "carbon_multiplier": 1.1,
        "availability": "Urban",
        "source_url": "https://www.gsma.com/futurenetworks/resources/5g-energy-efficiency/",
        "confidence": 0.82,
        "notes": "5G puro. 90% más eficiente que 4G según GSMA."
    },
    {
        "network_id": "5g-nsa",
        "network_name": "5G Non-Standalone",
        "network_type": "Mobile",
        "technology": "5G NR NSA (LTE anchor)",
        "energy_per_mb_wh": 0.00012,
        "energy_per_gb_wh": 0.12,
        "typical_latency_ms": 20,
        "bandwidth_mbps": 500,
        "carbon_multiplier": 1.15,
        "availability": "Urban/Suburban",
        "source_url": "https://www.gsma.com/futurenetworks/",
        "confidence": 0.80,
        "notes": "5G con ancla LTE. Menos eficiente que SA."
    },
    # ==========================================
    # MÓVIL - 4G
    # ==========================================
    {
        "network_id": "4g-lte-advanced",
        "network_name": "4G LTE-Advanced",
        "network_type": "Mobile",
        "technology": "LTE-A (Cat 12+)",
        "energy_per_mb_wh": 0.00025,
        "energy_per_gb_wh": 0.25,
        "typical_latency_ms": 35,
        "bandwidth_mbps": 300,
        "carbon_multiplier": 1.25,
        "availability": "Widespread",
        "source_url": "https://www.gsma.com/",
        "confidence": 0.88,
        "notes": "4G avanzado. Carrier Aggregation."
    },
    {
        "network_id": "4g-lte",
        "network_name": "4G LTE",
        "network_type": "Mobile",
        "technology": "LTE (Cat 4-6)",
        "energy_per_mb_wh": 0.00035,
        "energy_per_gb_wh": 0.35,
        "typical_latency_ms": 50,
        "bandwidth_mbps": 150,
        "carbon_multiplier": 1.30,
        "availability": "Widespread",
        "source_url": "https://www.iea.org/reports/data-centres-and-data-transmission-networks",
        "confidence": 0.90,
        "notes": "LTE estándar. ~0.35 kWh/GB según IEA."
    },
    # ==========================================
    # MÓVIL - 3G (Legacy)
    # ==========================================
    {
        "network_id": "3g-hspa",
        "network_name": "3G HSPA+",
        "network_type": "Mobile",
        "technology": "HSPA+",
        "energy_per_mb_wh": 0.00080,
        "energy_per_gb_wh": 0.80,
        "typical_latency_ms": 100,
        "bandwidth_mbps": 42,
        "carbon_multiplier": 1.50,
        "availability": "Decreasing",
        "source_url": "https://www.iea.org/",
        "confidence": 0.85,
        "notes": "Legacy 3G. Mucho menos eficiente que 4G/5G."
    },
    # ==========================================
    # SATELITAL
    # ==========================================
    {
        "network_id": "satellite-leo",
        "network_name": "Satélite LEO (Starlink)",
        "network_type": "Satellite",
        "technology": "Low Earth Orbit",
        "energy_per_mb_wh": 0.00150,
        "energy_per_gb_wh": 1.50,
        "typical_latency_ms": 40,
        "bandwidth_mbps": 200,
        "carbon_multiplier": 1.80,
        "availability": "Global",
        "source_url": "https://www.starlink.com/",
        "confidence": 0.70,
        "notes": "LEO mejor que GEO. Estimación incluye ground stations."
    },
    {
        "network_id": "satellite-geo",
        "network_name": "Satélite GEO (Tradicional)",
        "network_type": "Satellite",
        "technology": "Geostationary Orbit",
        "energy_per_mb_wh": 0.00300,
        "energy_per_gb_wh": 3.00,
        "typical_latency_ms": 600,
        "bandwidth_mbps": 50,
        "carbon_multiplier": 2.00,
        "availability": "Global",
        "source_url": "https://www.esa.int/",
        "confidence": 0.65,
        "notes": "Alta latencia. Alto consumo energético."
    },
    # ==========================================
    # ETHERNET (Referencia - conexión directa)
    # ==========================================
    {
        "network_id": "ethernet-1g",
        "network_name": "Ethernet 1 Gbps",
        "network_type": "Wired-Local",
        "technology": "1000BASE-T",
        "energy_per_mb_wh": 0.00002,
        "energy_per_gb_wh": 0.02,
        "typical_latency_ms": 1,
        "bandwidth_mbps": 1000,
        "carbon_multiplier": 1.0,
        "availability": "Office/Home",
        "source_url": "https://www.ieee.org/",
        "confidence": 0.95,
        "notes": "Referencia mínima. Conexión directa cableada."
    },
    {
        "network_id": "ethernet-10g",
        "network_name": "Ethernet 10 Gbps",
        "network_type": "Wired-Local",
        "technology": "10GBASE-T",
        "energy_per_mb_wh": 0.00003,
        "energy_per_gb_wh": 0.03,
        "typical_latency_ms": 1,
        "bandwidth_mbps": 10000,
        "carbon_multiplier": 1.0,
        "availability": "Enterprise/Datacenter",
        "source_url": "https://www.ieee.org/",
        "confidence": 0.95,
        "notes": "Conexión empresarial de alta velocidad."
    }
]

# Crear DataFrame
df = pd.DataFrame(network_data)

# Agregar fecha de recopilación
df['data_collected_date'] = datetime.now().strftime('%Y-%m-%d')

# Ordenar por energía por MB (más eficiente primero)
df = df.sort_values('energy_per_mb_wh', ascending=True)

# Definir columnas de salida
output_columns = [
    'network_id', 'network_name', 'network_type', 'technology',
    'energy_per_mb_wh', 'energy_per_gb_wh', 'typical_latency_ms',
    'bandwidth_mbps', 'carbon_multiplier', 'availability',
    'source_url', 'confidence', 'notes', 'data_collected_date'
]
df = df[output_columns]

# Guardar CSV
output_file = os.path.join(output_dir, "network_types.csv")
df.to_csv(output_file, index=False, encoding='utf-8')

# Mostrar resumen
print("=" * 60)
print("DATASET DE TIPOS DE RED GENERADO")
print("=" * 60)
print(f"Ubicacion: {output_file}")
print(f"Total tipos de red: {len(df)}")
print()

# Resumen por tipo
print("Por tipo de red:")
for net_type in df['network_type'].unique():
    count = len(df[df['network_type'] == net_type])
    avg_energy = df[df['network_type'] == net_type]['energy_per_gb_wh'].mean()
    print(f"  - {net_type}: {count} tipos, energia promedio: {avg_energy:.3f} Wh/GB")

print()
print(f"Rango energia: {df['energy_per_gb_wh'].min():.3f} - {df['energy_per_gb_wh'].max():.3f} Wh/GB")
print(f"Confianza promedio: {df['confidence'].mean()*100:.1f}%")
print("=" * 60)

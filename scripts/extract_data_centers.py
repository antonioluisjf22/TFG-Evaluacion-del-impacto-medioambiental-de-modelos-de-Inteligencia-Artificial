#!/usr/bin/env python3
"""
Script para extraer información de Data Centers (Solo PUE, sin % Renovables)
Genera: datasets/raw/data_centers/data_centers.csv
"""

import pandas as pd
from datetime import datetime
import os

# Crear directorio si no existe
output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "datasets/raw/data_centers")
os.makedirs(output_dir, exist_ok=True)

# ===== DATOS DE DATA CENTERS =====
data_centers_data = [
    # ==========================================
    # AWS (Amazon Web Services) - DATOS 2024
    # Fuente: aws-wue-pue.csv (Official 2024 Report)
    # ==========================================
    {
        "dc_id": "aws-global",
        "provider_name": "AWS",
        "region": "Global Average",
        "country_code": "GLOBAL",
        "pue": 1.15,
        "cooling_type": "Mixed",
        "notes": "Global average PUE 2024.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-eu-south-2",
        "provider_name": "AWS",
        "region": "eu-south-2 (Spain)",
        "country_code": "ES",
        "pue": 1.09,
        "cooling_type": "Direct Evaporative",
        "notes": "New region with highly efficient design (Aragon).",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-eu-north-1",
        "provider_name": "AWS",
        "region": "eu-north-1 (Stockholm)",
        "country_code": "SE",
        "pue": 1.10,
        "cooling_type": "Free Cooling (Air)",
        "notes": "Benefits from cold nordic climate.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-eu-west-1",
        "provider_name": "AWS",
        "region": "eu-west-1 (Ireland)",
        "country_code": "IE",
        "pue": 1.11,
        "cooling_type": "Direct Evaporative",
        "notes": "Major hub. Efficiency slightly lower than best-case due to scale.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-eu-central-1",
        "provider_name": "AWS",
        "region": "eu-central-1 (Frankfurt)",
        "country_code": "DE",
        "pue": 1.35,
        "cooling_type": "Traditional Chiller",
        "notes": "Older infrastructure affects efficiency (Higher PUE).",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-us-east-1",
        "provider_name": "AWS",
        "region": "us-east-1 (N. Virginia)",
        "country_code": "US",
        "pue": 1.15,
        "cooling_type": "Central Chiller Plant",
        "notes": "Largest AWS region globally.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-us-east-2",
        "provider_name": "AWS",
        "region": "us-east-2 (Ohio)",
        "country_code": "US",
        "pue": 1.13,
        "cooling_type": "Evaporative",
        "notes": "Modern design standard for US regions.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-us-west-2",
        "provider_name": "AWS",
        "region": "us-west-2 (Oregon)",
        "country_code": "US",
        "pue": 1.12,
        "cooling_type": "Evaporative Cooling",
        "notes": "Efficient region in Pacific NW.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-ca-central-1",
        "provider_name": "AWS",
        "region": "ca-central-1 (Canada Central)",
        "country_code": "CA",
        "pue": 1.19,
        "cooling_type": "Free Cooling",
        "notes": "Montreal area data centers.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-sa-east-1",
        "provider_name": "AWS",
        "region": "sa-east-1 (Sao Paulo)",
        "country_code": "BR",
        "pue": 1.17,
        "cooling_type": "Water Cooled",
        "notes": "South American hub.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-ap-northeast-1",
        "provider_name": "AWS",
        "region": "ap-northeast-1 (Tokyo)",
        "country_code": "JP",
        "pue": 1.27,
        "cooling_type": "Traditional Chiller",
        "notes": "Higher PUE due to dense urban constraints.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-ap-southeast-1",
        "provider_name": "AWS",
        "region": "ap-southeast-1 (Singapore)",
        "country_code": "SG",
        "pue": 1.32,
        "cooling_type": "Liquid/Chiller Hybrid",
        "notes": "Tropical climate significantly impacts cooling efficiency.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-ap-south-1",
        "provider_name": "AWS",
        "region": "ap-south-1 (Mumbai)",
        "country_code": "IN",
        "pue": 1.42,
        "cooling_type": "Chiller",
        "notes": "High PUE due to hot climate.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-me-central-1",
        "provider_name": "AWS",
        "region": "me-central-1 (UAE)",
        "country_code": "AE",
        "pue": 1.27,
        "cooling_type": "Chiller",
        "notes": "Middle East region.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-af-south-1",
        "provider_name": "AWS",
        "region": "af-south-1 (Cape Town)",
        "country_code": "ZA",
        "pue": 1.24,
        "cooling_type": "Chiller",
        "notes": "African continent hub.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-ap-south-2",
        "provider_name": "AWS",
        "region": "ap-south-2 (Hyderabad)",
        "country_code": "IN",
        "pue": 1.46,
        "cooling_type": "Chiller",
        "notes": "Asia-Pacific Hyderabad. Very high PUE due to hot climate.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-ap-southeast-2",
        "provider_name": "AWS",
        "region": "ap-southeast-2 (Sydney)",
        "country_code": "AU",
        "pue": 1.15,
        "cooling_type": "Chiller",
        "notes": "Sydney, Australia. No PUE data available; using regional average.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 0.85,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-me-south-1",
        "provider_name": "AWS",
        "region": "me-south-1 (Bahrain)",
        "country_code": "BH",
        "pue": 1.33,
        "cooling_type": "Chiller",
        "notes": "Middle East Bahrain region.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-ca-west-1",
        "provider_name": "AWS",
        "region": "ca-west-1 (Canada West)",
        "country_code": "CA",
        "pue": 1.17,
        "cooling_type": "Air Cooling",
        "notes": "Western Canada region.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-us-west-1",
        "provider_name": "AWS",
        "region": "us-west-1 (Northern California)",
        "country_code": "US",
        "pue": 1.18,
        "cooling_type": "Evaporative",
        "notes": "US West (N. California).",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "aws-cn-north-1",
        "provider_name": "AWS",
        "region": "cn-north-1 (Ningxia)",
        "country_code": "CN",
        "pue": 1.25,
        "cooling_type": "Chiller",
        "notes": "China Ningxia region.",
        "source_url": "aws-wue-pue.csv",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },

    # ==========================================
    # MICROSOFT AZURE
    # Fuente: https://datacenters.microsoft.com/sustainability/efficiency/
    # ==========================================
    {
        "dc_id": "azure-global",
        "provider_name": "Microsoft Azure",
        "region": "Global Average",
        "country_code": "GLOBAL",
        "pue": 1.16,
        "cooling_type": "Mixed",
        "notes": "Official Global PUE. WUE is 0.30 L/kWh.",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-northeurope",
        "provider_name": "Microsoft Azure",
        "region": "northeurope (Ireland)",
        "country_code": "IE",
        "pue": 1.18,
        "cooling_type": "Adiabatic Air",
        "notes": "Uses free cooling but PUE is higher than AWS (1.11). WUE is very low (0.02).",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-westeurope",
        "provider_name": "Microsoft Azure",
        "region": "westeurope (Netherlands)",
        "country_code": "NL",
        "pue": 1.14,
        "cooling_type": "Adiabatic Air",
        "notes": "Efficient region. WUE is 0.04 L/kWh.",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-sweden-central",
        "provider_name": "Microsoft Azure",
        "region": "swedencentral (Sweden)",
        "country_code": "SE",
        "pue": 1.16,
        "cooling_type": "Free Cooling",
        "notes": "Nordic region. PUE is good but surprisingly higher than AWS Stockholm (1.10).",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-poland-central",
        "provider_name": "Microsoft Azure",
        "region": "polandcentral (Poland)",
        "country_code": "PL",
        "pue": 1.19,
        "cooling_type": "Chiller",
        "notes": "New region. WUE is relatively high (0.44 L/kWh).",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-eastus",
        "provider_name": "Microsoft Azure",
        "region": "eastus (Virginia)",
        "country_code": "US",
        "pue": 1.14,
        "cooling_type": "Adiabatic",
        "notes": "Official Virginia PUE. Better than AWS Virginia (1.15).",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-centralus",
        "provider_name": "Microsoft Azure",
        "region": "centralus (Iowa)",
        "country_code": "US",
        "pue": 1.16,
        "cooling_type": "Adiabatic",
        "notes": "Official Iowa PUE. WUE is low (0.10).",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-westus2",
        "provider_name": "Microsoft Azure",
        "region": "westus2 (Washington)",
        "country_code": "US",
        "pue": 1.16,
        "cooling_type": "Evaporative",
        "notes": "Official Washington state PUE. Higher water usage (0.7 L/kWh).",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-southcentralus",
        "provider_name": "Microsoft Azure",
        "region": "southcentralus (Texas)",
        "country_code": "US",
        "pue": 1.28,
        "cooling_type": "Chiller/Mechanical",
        "notes": "High PUE due to Texas heat. One of the least efficient US regions.",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-southeastasia",
        "provider_name": "Microsoft Azure",
        "region": "southeastasia (Singapore)",
        "country_code": "SG",
        "pue": 1.30,
        "cooling_type": "Recycled Water Cooling",
        "notes": "Tropical climate. Uses reclaimed NEWater for cooling.",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-arizona",
        "provider_name": "Microsoft Azure",
        "region": "arizona (Arizona)",
        "country_code": "US",
        "pue": 1.13,
        "cooling_type": "Evaporative",
        "notes": "Arizona region.",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-illinois",
        "provider_name": "Microsoft Azure",
        "region": "illinois (Illinois)",
        "country_code": "US",
        "pue": 1.25,
        "cooling_type": "Traditional Chiller",
        "notes": "Illinois region.",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-iowa",
        "provider_name": "Microsoft Azure",
        "region": "iowa (Iowa)",
        "country_code": "US",
        "pue": 1.16,
        "cooling_type": "Adiabatic",
        "notes": "Iowa region.",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-texas",
        "provider_name": "Microsoft Azure",
        "region": "texas (Texas)",
        "country_code": "US",
        "pue": 1.28,
        "cooling_type": "Chiller",
        "notes": "Texas region. High PUE due to heat.",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-washington",
        "provider_name": "Microsoft Azure",
        "region": "washington (Washington)",
        "country_code": "US",
        "pue": 1.16,
        "cooling_type": "Evaporative",
        "notes": "Washington state region.",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },
    {
        "dc_id": "azure-wyoming",
        "provider_name": "Microsoft Azure",
        "region": "wyoming (Wyoming)",
        "country_code": "US",
        "pue": 1.12,
        "cooling_type": "Free Cooling",
        "notes": "Wyoming region. Efficient due to cool climate.",
        "source_url": "https://datacenters.microsoft.com/sustainability/efficiency/",
        "confidence": 1.00,
        "data_type": "Official Website"
    },


    # ==========================================
    # GOOGLE CLOUD (GCP)
    # Fuente: Google 2025 Environmental Report (PUE 2024 Data)
    # ==========================================
    {
        "dc_id": "gcp-global",
        "provider_name": "Google Cloud",
        "region": "Global Average",
        "country_code": "GLOBAL",
        "pue": 1.09,
        "cooling_type": "AI Optimized",
        "notes": "Lowest global average among hyperscalers (Official 2024).",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-europe-west1",
        "provider_name": "Google Cloud",
        "region": "europe-west1 (Belgium)",
        "country_code": "BE",
        "pue": 1.08,
        "cooling_type": "Evaporative",
        "notes": "St. Ghislain campus. Highly efficient.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-europe-north1",
        "provider_name": "Google Cloud",
        "region": "europe-north1 (Finland)",
        "country_code": "FI",
        "pue": 1.10,
        "cooling_type": "Seawater Cooling",
        "notes": "Hamina campus. Slight increase from previous years (was 1.09).",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-europe-west4",
        "provider_name": "Google Cloud",
        "region": "europe-west4 (Netherlands)",
        "country_code": "NL",
        "pue": 1.08,
        "cooling_type": "Adiabatic",
        "notes": "Eemshaven campus. Excellent efficiency.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-europe-west3",
        "provider_name": "Google Cloud",
        "region": "europe-west3 (Denmark)",
        "country_code": "DK",
        "pue": 1.07,
        "cooling_type": "Free Cooling",
        "notes": "Fredericia campus. One of the best PUEs globally.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-europe-west2",
        "provider_name": "Google Cloud",
        "region": "europe-west2 (Ireland)",
        "country_code": "IE",
        "pue": 1.08,
        "cooling_type": "Air Cooling",
        "notes": "Dublin campus. Consistently efficient (1.08).",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-southamerica-west1",
        "provider_name": "Google Cloud",
        "region": "southamerica-west1 (Chile)",
        "country_code": "CL",
        "pue": 1.09,
        "cooling_type": "Adiabatic",
        "notes": "Quilicura campus. Very efficient for the region.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-asia-east1",
        "provider_name": "Google Cloud",
        "region": "asia-east1 (Taiwan)",
        "country_code": "TW",
        "pue": 1.13,
        "cooling_type": "Thermal Energy Storage",
        "notes": "Changhua County. Uses thermal storage to manage cooling.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-asia-southeast1",
        "provider_name": "Google Cloud",
        "region": "asia-southeast1 (Singapore)",
        "country_code": "SG",
        "pue": 1.13,
        "cooling_type": "Recycled Water / Chiller",
        "notes": "1st Facility. Excellent for tropics (compare to AWS 1.32, Azure 1.30).",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-asia-southeast1-b",
        "provider_name": "Google Cloud",
        "region": "asia-southeast1 (Singapore 2)",
        "country_code": "SG",
        "pue": 1.15,
        "cooling_type": "Multi-story Chiller",
        "notes": "2nd Facility. Slightly higher PUE due to vertical density.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-central1",
        "provider_name": "Google Cloud",
        "region": "us-central1 (Iowa)",
        "country_code": "US",
        "pue": 1.07,
        "cooling_type": "Adiabatic",
        "notes": "Council Bluffs (2nd facility). Highly optimized.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-west1",
        "provider_name": "Google Cloud",
        "region": "us-west1 (Oregon)",
        "country_code": "US",
        "pue": 1.06,
        "cooling_type": "Evaporative",
        "notes": "The Dalles (2nd facility). Tied for best US efficiency.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-east1",
        "provider_name": "Google Cloud",
        "region": "us-east1 (South Carolina)",
        "country_code": "US",
        "pue": 1.10,
        "cooling_type": "Chiller",
        "notes": "Berkeley County. Consistent performance.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-east4",
        "provider_name": "Google Cloud",
        "region": "us-east4 (Virginia)",
        "country_code": "US",
        "pue": 1.08,
        "cooling_type": "Adiabatic",
        "notes": "Loudoun County (2nd facility). Better than AWS/Azure in same region.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-south1",
        "provider_name": "Google Cloud",
        "region": "us-south1 (Texas)",
        "country_code": "US",
        "pue": 1.10,
        "cooling_type": "Adiabatic",
        "notes": "Midlothian. Excellent efficiency for Texas heat (Azure is 1.28).",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-west4",
        "provider_name": "Google Cloud",
        "region": "us-west4 (Nevada)",
        "country_code": "US",
        "pue": 1.09,
        "cooling_type": "Adiabatic",
        "notes": "Henderson. Very efficient for desert climate.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-east5",
        "provider_name": "Google Cloud",
        "region": "us-east5 (Ohio)",
        "country_code": "US",
        "pue": 1.06,
        "cooling_type": "Adiabatic",
        "notes": "Columbus / New Albany. One of the newest and most efficient.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-ga1",
        "provider_name": "Google Cloud",
        "region": "us-ga1 (Georgia)",
        "country_code": "US",
        "pue": 1.09,
        "cooling_type": "Adiabatic",
        "notes": "Douglas County, Georgia.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-nv1",
        "provider_name": "Google Cloud",
        "region": "us-nv1 (Nevada)",
        "country_code": "US",
        "pue": 1.09,
        "cooling_type": "Adiabatic",
        "notes": "Henderson, Nevada.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-al1",
        "provider_name": "Google Cloud",
        "region": "us-al1 (Alabama)",
        "country_code": "US",
        "pue": 1.10,
        "cooling_type": "Adiabatic",
        "notes": "Jackson County, Alabama.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-nc1",
        "provider_name": "Google Cloud",
        "region": "us-nc1 (North Carolina)",
        "country_code": "US",
        "pue": 1.13,
        "cooling_type": "Air Cooling",
        "notes": "Lenoir, North Carolina.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-va1-a",
        "provider_name": "Google Cloud",
        "region": "us-va1 (Virginia, Facility A)",
        "country_code": "US",
        "pue": 1.09,
        "cooling_type": "Adiabatic",
        "notes": "Loudoun County, Virginia (1st facility).",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-va1-b",
        "provider_name": "Google Cloud",
        "region": "us-va1 (Virginia, Facility B)",
        "country_code": "US",
        "pue": 1.08,
        "cooling_type": "Adiabatic",
        "notes": "Loudoun County, Virginia (2nd facility).",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-tx1",
        "provider_name": "Google Cloud",
        "region": "us-tx1 (Texas)",
        "country_code": "US",
        "pue": 1.10,
        "cooling_type": "Adiabatic",
        "notes": "Midlothian, Texas.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-ok1",
        "provider_name": "Google Cloud",
        "region": "us-ok1 (Oklahoma)",
        "country_code": "US",
        "pue": 1.11,
        "cooling_type": "Adiabatic",
        "notes": "Mayes County, Oklahoma.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-tn1",
        "provider_name": "Google Cloud",
        "region": "us-tn1 (Tennessee)",
        "country_code": "US",
        "pue": 1.10,
        "cooling_type": "Adiabatic",
        "notes": "Montgomery County, Tennessee.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-oh1",
        "provider_name": "Google Cloud",
        "region": "us-oh1 (Ohio)",
        "country_code": "US",
        "pue": 1.07,
        "cooling_type": "Adiabatic",
        "notes": "New Albany, Ohio.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-ne1",
        "provider_name": "Google Cloud",
        "region": "us-ne1 (Nebraska)",
        "country_code": "US",
        "pue": 1.09,
        "cooling_type": "Adiabatic",
        "notes": "Papillion, Nebraska.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-nv2",
        "provider_name": "Google Cloud",
        "region": "us-nv2 (Nevada, Facility 2)",
        "country_code": "US",
        "pue": 1.16,
        "cooling_type": "Adiabatic",
        "notes": "Storey County, Nevada.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-or1-a",
        "provider_name": "Google Cloud",
        "region": "us-or1 (Oregon, Facility 2)",
        "country_code": "US",
        "pue": 1.06,
        "cooling_type": "Evaporative",
        "notes": "The Dalles, Oregon (2nd facility). Tied for best US efficiency.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-us-ia1-b",
        "provider_name": "Google Cloud",
        "region": "us-ia1 (Iowa, Facility 2)",
        "country_code": "US",
        "pue": 1.07,
        "cooling_type": "Adiabatic",
        "notes": "Council Bluffs, Iowa (2nd facility).",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-au-sy1",
        "provider_name": "Google Cloud",
        "region": "au-sy1 (Sydney)",
        "country_code": "AU",
        "pue": 1.07,
        "cooling_type": "Adiabatic",
        "notes": "Sydney, Australia.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    {
        "dc_id": "gcp-au-mel1",
        "provider_name": "Google Cloud",
        "region": "au-mel1 (Melbourne)",
        "country_code": "AU",
        "pue": 1.08,
        "cooling_type": "Adiabatic",
        "notes": "Melbourne, Australia.",
        "source_url": "Google 2025 Environmental Report",
        "confidence": 1.00,
        "data_type": "Official Report 2024"
    },
    # ==========================================
    # DEEP GREEN
    # NOTA: Se incluyen solo datos de Exmouth Leisure Centre.
    # Es la única ubicación con métricas de PUE verificadas públicamente.
    # Otros sitios (Manchester, York) se omiten por falta de datos oficiales.
    # ==========================================
    {
        "dc_id": "deepgreen-uk-exmouth",
        "provider_name": "Deep Green",
        "region": "Exmouth (UK)",
        "country_code": "UK",
        "pue": 1.005,  # Dato exacto del reporte DCS Awards
        "cooling_type": "Immersion (Digital Boiler)",
        "notes": "Exmouth Leisure Centre. Achieves PUE 1.005 by donating 96% of heat to pool.",
        "source_url": "https://dcsawards.com/frontend/assets/uploads/1689850853-DCS%20Awards%202023%20Winners.pdf",
        "confidence": 1.00,
        "data_type": "Official Case Study"
    }
]

# Crear DataFrame
df = pd.DataFrame(data_centers_data)

# Ordenar por PUE
df = df.sort_values('pue').reset_index(drop=True)

# Agregar columna de timestamp
df['data_collected_date'] = datetime.now().strftime('%Y-%m-%d')

# Seleccionar columnas finales (SIN RENEWABLES)
output_columns = [
    'dc_id', 'provider_name', 'region', 'country_code',
    'pue', 'cooling_type', 'notes',
    'source_url', 'confidence', 'data_type', 'data_collected_date'
]
df = df[output_columns]

# Guardar como CSV
output_file = os.path.join(output_dir, "data_centers.csv")
df.to_csv(output_file, index=False, encoding='utf-8')

print("✅ Archivo generado exitosamente!")
print(f"📁 Ubicación: {output_file}")
print(f"\n📊 Resumen de data centers extraídos:")
print(f"   - Total: {len(df)} data centers")
print(f"   - Rango PUE: {df['pue'].min():.2f} a {df['pue'].max():.2f}")
print(f"   - Proveedores: {df['provider_name'].nunique()} únicos")
print(f"   - Confianza promedio: {df['confidence'].mean():.1%}")
print(f"\n📋 Tabla resumen:\n")
print(df[['dc_id', 'provider_name', 'region', 'pue', 'cooling_type', 'confidence']].to_string(index=False))

# Vista detallada
print(f"\n\n✨ Vista detallada:\n")
for idx, row in df.iterrows():
    print(f"{idx + 1}. {row['dc_id']}")
    print(f"   Proveedor: {row['provider_name']}")
    print(f"   Región: {row['region']}")
    print(f"   PUE: {row['pue']:.2f} (Eficiencia: {'⭐⭐⭐⭐⭐' if row['pue'] < 1.1 else '⭐⭐⭐⭐' if row['pue'] < 1.2 else '⭐⭐⭐'})")
    print(f"   Cooling: {row['cooling_type']}")
    print(f"   Confianza: {row['confidence']:.0%}")
    print(f"   Fuente: {row['data_type']}")
    print()

print(f"✅ CSV guardado en: {output_file}")

# Estadísticas
print("\n📊 ESTADÍSTICAS")
print(f"   PUE Promedio: {df['pue'].mean():.2f}")
print(f"   PUE Mediana: {df['pue'].median():.2f}")
print(f"   Confianza Promedio: {df['confidence'].mean():.1%}")
print(f"\n   Mejor PUE: {df['pue'].min():.2f} → {df.loc[df['pue'].idxmin(), 'dc_id']}")
print(f"   Peor PUE: {df['pue'].max():.2f} → {df.loc[df['pue'].idxmax(), 'dc_id']}")
print(f"   Cooling types: {df['cooling_type'].nunique()} únicos")

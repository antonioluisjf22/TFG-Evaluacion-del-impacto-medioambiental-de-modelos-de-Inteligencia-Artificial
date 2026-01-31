#!/usr/bin/env python3
"""
Script para generar el dataset de dispositivos cliente (v2.0)
Genera: datasets/raw/devices/devices.csv

VERSIÓN 2.0: Distinción clara entre CPU, GPU y NPU
- TDP separado para cada procesador
- Consumo de inferencia separado por procesador
- Campo primary_inference_target para indicar procesador por defecto

Fuentes:
- TechPowerUp GPU Database: https://www.techpowerup.com/gpu-specs/
- Intel ARK: https://ark.intel.com/
- Apple Silicon specs: https://www.apple.com/
- NVIDIA specs: https://www.nvidia.com/
- Qualcomm specs: https://www.qualcomm.com/

FÓRMULAS UTILIZADAS:
==================

1. Energía consumida durante inferencia:
   E_inferencia = P_procesador × t_inferencia (Wh)
   
   Donde P_procesador se selecciona según inference_processor:
   - "cpu" → inference_cpu_watts
   - "gpu" → inference_gpu_watts  
   - "npu" → inference_npu_watts
   - "auto" → inference_{primary_inference_target}_watts

2. Modelo de consumo dinámico:
   P_total = P_idle + (P_TDP - P_idle) × U
   
   Donde U = factor de utilización (0-1)

3. Eficiencia energética (TOPS/W):
   - CPU: 0.5 - 2 TOPS/W
   - GPU: 2 - 10 TOPS/W
   - NPU/TPU: 10 - 50 TOPS/W
"""

import pandas as pd
from datetime import datetime
import os

# Crear directorio si no existe
output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "datasets/raw/devices")
os.makedirs(output_dir, exist_ok=True)

# ===== DATOS DE DISPOSITIVOS (v2.0 - CPU/GPU/NPU separados) =====
# Cada dispositivo tiene TDP y consumo de inferencia separado por procesador
# Esto permite calcular emisiones según dónde se ejecuta la inferencia

devices_data = [
    # ==========================================
    # SMARTPHONES
    # En móviles, CPU/GPU/NPU están en el mismo SoC
    # Los valores son estimaciones basadas en benchmarks de ML
    # ==========================================
    {
        "device_id": "phone-iphone-15-pro",
        "device_name": "iPhone 15 Pro Max",
        "device_type": "Smartphone",
        "manufacturer": "Apple",
        # === CPU ===
        "cpu_model": "Apple A17 Pro (6-core)",
        "cpu_tdp_watts": 6.0,
        "cpu_cores": 6,
        "cpu_architecture": "ARM Cortex custom",
        # === GPU ===
        "gpu_model": "Apple A17 Pro GPU (6-core)",
        "gpu_tdp_watts": 8.0,
        "gpu_compute_units": 6,
        "gpu_tflops": 2.15,
        # === NPU ===
        "npu_model": "Apple Neural Engine 16-core",
        "npu_tdp_watts": 2.0,
        "npu_tops": 35.0,
        "has_npu": True,
        # === Consumo durante inferencia (SEPARADO) ===
        "inference_cpu_watts": 3.5,
        "inference_gpu_watts": 5.0,
        "inference_npu_watts": 1.5,
        # === Sistema ===
        "system_idle_watts": 0.5,
        "system_tdp_watts": 8.5,
        "memory_gb": 8,
        "memory_bandwidth_gbps": 51.2,
        "year_released": 2023,
        "primary_inference_target": "npu",
        "source_url": "https://www.apple.com/iphone-15-pro/specs/",
        "confidence": 0.88,
        "notes": "A17 Pro optimizado para Core ML. NPU preferido para inferencia."
    },
    {
        "device_id": "phone-samsung-s24-ultra",
        "device_name": "Samsung Galaxy S24 Ultra",
        "device_type": "Smartphone",
        "manufacturer": "Samsung",
        # === CPU ===
        "cpu_model": "Snapdragon 8 Gen 3 (8-core)",
        "cpu_tdp_watts": 7.0,
        "cpu_cores": 8,
        "cpu_architecture": "ARM Cortex-X4 + A720 + A520",
        # === GPU ===
        "gpu_model": "Adreno 750",
        "gpu_tdp_watts": 9.0,
        "gpu_compute_units": 6,
        "gpu_tflops": 3.8,
        # === NPU ===
        "npu_model": "Hexagon NPU",
        "npu_tdp_watts": 3.0,
        "npu_tops": 45.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 4.0,
        "inference_gpu_watts": 6.0,
        "inference_npu_watts": 2.0,
        # === Sistema ===
        "system_idle_watts": 0.6,
        "system_tdp_watts": 10.0,
        "memory_gb": 12,
        "memory_bandwidth_gbps": 51.2,
        "year_released": 2024,
        "primary_inference_target": "npu",
        "source_url": "https://www.qualcomm.com/snapdragon-8-gen-3",
        "confidence": 0.85,
        "notes": "Snapdragon 8 Gen 3 con Hexagon NPU optimizado para LLMs on-device."
    },
    {
        "device_id": "phone-pixel-8-pro",
        "device_name": "Google Pixel 8 Pro",
        "device_type": "Smartphone",
        "manufacturer": "Google",
        # === CPU ===
        "cpu_model": "Google Tensor G3 (9-core)",
        "cpu_tdp_watts": 5.5,
        "cpu_cores": 9,
        "cpu_architecture": "ARM Cortex-X3 + A715 + A510",
        # === GPU ===
        "gpu_model": "Mali-G715 MC10",
        "gpu_tdp_watts": 7.0,
        "gpu_compute_units": 10,
        "gpu_tflops": 2.1,
        # === NPU ===
        "npu_model": "Google Tensor TPU",
        "npu_tdp_watts": 2.5,
        "npu_tops": 30.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 3.0,
        "inference_gpu_watts": 4.5,
        "inference_npu_watts": 1.8,
        # === Sistema ===
        "system_idle_watts": 0.4,
        "system_tdp_watts": 7.5,
        "memory_gb": 12,
        "memory_bandwidth_gbps": 44.0,
        "year_released": 2023,
        "primary_inference_target": "npu",
        "source_url": "https://store.google.com/product/pixel_8_pro_specs",
        "confidence": 0.88,
        "notes": "Tensor G3 optimizado para Gemini Nano on-device."
    },
    {
        "device_id": "phone-budget-average",
        "device_name": "Smartphone Budget Promedio",
        "device_type": "Smartphone",
        "manufacturer": "Generic",
        # === CPU ===
        "cpu_model": "Snapdragon 6 Gen 1",
        "cpu_tdp_watts": 4.0,
        "cpu_cores": 8,
        "cpu_architecture": "ARM Cortex-A78 + A55",
        # === GPU ===
        "gpu_model": "Adreno 710",
        "gpu_tdp_watts": 3.5,
        "gpu_compute_units": 4,
        "gpu_tflops": 0.8,
        # === NPU ===
        "npu_model": "Hexagon (limited)",
        "npu_tdp_watts": 1.5,
        "npu_tops": 8.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 2.5,
        "inference_gpu_watts": 2.0,
        "inference_npu_watts": 1.0,
        # === Sistema ===
        "system_idle_watts": 0.3,
        "system_tdp_watts": 6.0,
        "memory_gb": 6,
        "memory_bandwidth_gbps": 25.6,
        "year_released": 2023,
        "primary_inference_target": "cpu",
        "source_url": "https://www.qualcomm.com/snapdragon-6-gen-1",
        "confidence": 0.75,
        "notes": "Promedio gama media. NPU limitado, inferencia típicamente en CPU."
    },
    # ==========================================
    # TABLETS
    # ==========================================
    {
        "device_id": "tablet-ipad-pro-m4",
        "device_name": "iPad Pro M4",
        "device_type": "Tablet",
        "manufacturer": "Apple",
        # === CPU ===
        "cpu_model": "Apple M4 (10-core)",
        "cpu_tdp_watts": 10.0,
        "cpu_cores": 10,
        "cpu_architecture": "ARM Apple Silicon",
        # === GPU ===
        "gpu_model": "Apple M4 GPU (10-core)",
        "gpu_tdp_watts": 15.0,
        "gpu_compute_units": 10,
        "gpu_tflops": 4.3,
        # === NPU ===
        "npu_model": "Apple Neural Engine 16-core",
        "npu_tdp_watts": 4.0,
        "npu_tops": 38.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 7.0,
        "inference_gpu_watts": 10.0,
        "inference_npu_watts": 3.0,
        # === Sistema ===
        "system_idle_watts": 1.5,
        "system_tdp_watts": 22.0,
        "memory_gb": 16,
        "memory_bandwidth_gbps": 120.0,
        "year_released": 2024,
        "primary_inference_target": "npu",
        "source_url": "https://www.apple.com/ipad-pro/specs/",
        "confidence": 0.92,
        "notes": "M4 con 38 TOPS Neural Engine. Muy eficiente."
    },
    {
        "device_id": "tablet-android-average",
        "device_name": "Tablet Android Promedio",
        "device_type": "Tablet",
        "manufacturer": "Generic",
        # === CPU ===
        "cpu_model": "Snapdragon 870",
        "cpu_tdp_watts": 8.0,
        "cpu_cores": 8,
        "cpu_architecture": "ARM Cortex-A77 + A55",
        # === GPU ===
        "gpu_model": "Adreno 650",
        "gpu_tdp_watts": 7.0,
        "gpu_compute_units": 4,
        "gpu_tflops": 1.5,
        # === NPU ===
        "npu_model": "Hexagon 698",
        "npu_tdp_watts": 2.0,
        "npu_tops": 15.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 5.0,
        "inference_gpu_watts": 5.0,
        "inference_npu_watts": 1.5,
        # === Sistema ===
        "system_idle_watts": 1.0,
        "system_tdp_watts": 15.0,
        "memory_gb": 8,
        "memory_bandwidth_gbps": 34.1,
        "year_released": 2023,
        "primary_inference_target": "npu",
        "source_url": "https://www.qualcomm.com/snapdragon-870",
        "confidence": 0.70,
        "notes": "Promedio tablets Android gama media-alta."
    },
    # ==========================================
    # LAPTOPS - APPLE SILICON
    # ==========================================
    {
        "device_id": "laptop-macbook-air-m3",
        "device_name": "MacBook Air M3",
        "device_type": "Laptop",
        "manufacturer": "Apple",
        # === CPU ===
        "cpu_model": "Apple M3 (8-core)",
        "cpu_tdp_watts": 12.0,
        "cpu_cores": 8,
        "cpu_architecture": "ARM Apple Silicon",
        # === GPU ===
        "gpu_model": "Apple M3 GPU (10-core)",
        "gpu_tdp_watts": 15.0,
        "gpu_compute_units": 10,
        "gpu_tflops": 4.1,
        # === NPU ===
        "npu_model": "Apple Neural Engine 16-core",
        "npu_tdp_watts": 5.0,
        "npu_tops": 18.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 8.0,
        "inference_gpu_watts": 12.0,
        "inference_npu_watts": 4.0,
        # === Sistema ===
        "system_idle_watts": 3.0,
        "system_tdp_watts": 24.0,
        "memory_gb": 16,
        "memory_bandwidth_gbps": 100.0,
        "year_released": 2024,
        "primary_inference_target": "npu",
        "source_url": "https://www.apple.com/macbook-air-m3/specs/",
        "confidence": 0.92,
        "notes": "M3 fanless. Neural Engine para Core ML, GPU para Metal."
    },
    {
        "device_id": "laptop-macbook-pro-m3-max",
        "device_name": "MacBook Pro M3 Max",
        "device_type": "Laptop",
        "manufacturer": "Apple",
        # === CPU ===
        "cpu_model": "Apple M3 Max (16-core)",
        "cpu_tdp_watts": 40.0,
        "cpu_cores": 16,
        "cpu_architecture": "ARM Apple Silicon",
        # === GPU ===
        "gpu_model": "Apple M3 Max GPU (40-core)",
        "gpu_tdp_watts": 60.0,
        "gpu_compute_units": 40,
        "gpu_tflops": 14.2,
        # === NPU ===
        "npu_model": "Apple Neural Engine 16-core",
        "npu_tdp_watts": 8.0,
        "npu_tops": 18.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 25.0,
        "inference_gpu_watts": 45.0,
        "inference_npu_watts": 6.0,
        # === Sistema ===
        "system_idle_watts": 8.0,
        "system_tdp_watts": 92.0,
        "memory_gb": 64,
        "memory_bandwidth_gbps": 400.0,
        "year_released": 2023,
        "primary_inference_target": "gpu",
        "source_url": "https://www.apple.com/macbook-pro/specs/",
        "confidence": 0.92,
        "notes": "M3 Max: GPU potente para LLMs locales grandes vía mlx."
    },
    # ==========================================
    # LAPTOPS - INTEL/NVIDIA
    # ==========================================
    {
        "device_id": "laptop-dell-xps-15",
        "device_name": "Dell XPS 15 (2024)",
        "device_type": "Laptop",
        "manufacturer": "Dell",
        # === CPU ===
        "cpu_model": "Intel Core Ultra 9 185H",
        "cpu_tdp_watts": 45.0,
        "cpu_cores": 16,
        "cpu_architecture": "Intel Meteor Lake (x86-64)",
        # === GPU ===
        "gpu_model": "NVIDIA RTX 4070 Mobile",
        "gpu_tdp_watts": 115.0,
        "gpu_compute_units": 4608,  # CUDA cores
        "gpu_tflops": 23.0,
        # === NPU ===
        "npu_model": "Intel AI Boost NPU",
        "npu_tdp_watts": 5.0,
        "npu_tops": 10.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 35.0,
        "inference_gpu_watts": 85.0,
        "inference_npu_watts": 4.0,
        # === Sistema ===
        "system_idle_watts": 12.0,
        "system_tdp_watts": 157.0,
        "memory_gb": 32,
        "memory_bandwidth_gbps": 89.6,
        "year_released": 2024,
        "primary_inference_target": "gpu",
        "source_url": "https://www.dell.com/xps-15",
        "confidence": 0.88,
        "notes": "RTX 4070 para CUDA/TensorRT. NPU para modelos pequeños."
    },
    {
        "device_id": "laptop-thinkpad-x1-carbon",
        "device_name": "Lenovo ThinkPad X1 Carbon Gen 12",
        "device_type": "Laptop",
        "manufacturer": "Lenovo",
        # === CPU ===
        "cpu_model": "Intel Core Ultra 7 165U",
        "cpu_tdp_watts": 15.0,
        "cpu_cores": 12,
        "cpu_architecture": "Intel Meteor Lake (x86-64)",
        # === GPU ===
        "gpu_model": "Intel Arc Graphics (integrated)",
        "gpu_tdp_watts": 12.0,
        "gpu_compute_units": 128,  # Xe cores
        "gpu_tflops": 3.6,
        # === NPU ===
        "npu_model": "Intel AI Boost NPU",
        "npu_tdp_watts": 4.0,
        "npu_tops": 10.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 12.0,
        "inference_gpu_watts": 10.0,
        "inference_npu_watts": 3.0,
        # === Sistema ===
        "system_idle_watts": 5.0,
        "system_tdp_watts": 28.0,
        "memory_gb": 32,
        "memory_bandwidth_gbps": 76.8,
        "year_released": 2024,
        "primary_inference_target": "npu",
        "source_url": "https://www.lenovo.com/thinkpad-x1-carbon",
        "confidence": 0.88,
        "notes": "Ultrabook empresarial. NPU para Copilot+ PC features."
    },
    {
        "device_id": "laptop-budget-average",
        "device_name": "Laptop Budget Promedio",
        "device_type": "Laptop",
        "manufacturer": "Generic",
        # === CPU ===
        "cpu_model": "Intel Core i5-1335U",
        "cpu_tdp_watts": 15.0,
        "cpu_cores": 10,
        "cpu_architecture": "Intel Raptor Lake (x86-64)",
        # === GPU ===
        "gpu_model": "Intel Iris Xe",
        "gpu_tdp_watts": 10.0,
        "gpu_compute_units": 80,
        "gpu_tflops": 1.8,
        # === NPU ===
        "npu_model": "None",
        "npu_tdp_watts": 0.0,
        "npu_tops": 0.0,
        "has_npu": False,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 12.0,
        "inference_gpu_watts": 8.0,
        "inference_npu_watts": 0.0,
        # === Sistema ===
        "system_idle_watts": 6.0,
        "system_tdp_watts": 45.0,
        "memory_gb": 8,
        "memory_bandwidth_gbps": 51.2,
        "year_released": 2023,
        "primary_inference_target": "cpu",
        "source_url": "https://ark.intel.com/content/www/us/en/ark.html",
        "confidence": 0.70,
        "notes": "Promedio laptops gama baja. Sin NPU, inferencia en CPU."
    },
    # ==========================================
    # LAPTOPS - GAMING/WORKSTATION
    # ==========================================
    {
        "device_id": "laptop-gaming-rtx4090",
        "device_name": "Laptop Gaming RTX 4090",
        "device_type": "Laptop",
        "manufacturer": "Various",
        # === CPU ===
        "cpu_model": "Intel Core i9-14900HX",
        "cpu_tdp_watts": 55.0,
        "cpu_cores": 24,
        "cpu_architecture": "Intel Raptor Lake (x86-64)",
        # === GPU ===
        "gpu_model": "NVIDIA RTX 4090 Mobile",
        "gpu_tdp_watts": 175.0,
        "gpu_compute_units": 9728,  # CUDA cores
        "gpu_tflops": 56.0,
        # === NPU ===
        "npu_model": "None",
        "npu_tdp_watts": 0.0,
        "npu_tops": 0.0,
        "has_npu": False,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 40.0,
        "inference_gpu_watts": 150.0,
        "inference_npu_watts": 0.0,
        # === Sistema ===
        "system_idle_watts": 25.0,
        "system_tdp_watts": 230.0,
        "memory_gb": 64,
        "memory_bandwidth_gbps": 89.6,
        "year_released": 2024,
        "primary_inference_target": "gpu",
        "source_url": "https://www.nvidia.com/geforce/laptops/",
        "confidence": 0.85,
        "notes": "RTX 4090 Mobile. Alto consumo pero máximo rendimiento CUDA."
    },
    # ==========================================
    # DESKTOPS
    # ==========================================
    {
        "device_id": "desktop-mac-studio-m2-ultra",
        "device_name": "Mac Studio M2 Ultra",
        "device_type": "Desktop",
        "manufacturer": "Apple",
        # === CPU ===
        "cpu_model": "Apple M2 Ultra (24-core)",
        "cpu_tdp_watts": 80.0,
        "cpu_cores": 24,
        "cpu_architecture": "ARM Apple Silicon",
        # === GPU ===
        "gpu_model": "Apple M2 Ultra GPU (76-core)",
        "gpu_tdp_watts": 150.0,
        "gpu_compute_units": 76,
        "gpu_tflops": 27.2,
        # === NPU ===
        "npu_model": "Apple Neural Engine 32-core",
        "npu_tdp_watts": 25.0,
        "npu_tops": 31.6,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 50.0,
        "inference_gpu_watts": 120.0,
        "inference_npu_watts": 18.0,
        # === Sistema ===
        "system_idle_watts": 30.0,
        "system_tdp_watts": 370.0,
        "memory_gb": 192,
        "memory_bandwidth_gbps": 800.0,
        "year_released": 2023,
        "primary_inference_target": "gpu",
        "source_url": "https://www.apple.com/mac-studio/specs/",
        "confidence": 0.92,
        "notes": "M2 Ultra workstation. GPU preferido para LLMs grandes vía mlx."
    },
    {
        "device_id": "desktop-gaming-rtx4090",
        "device_name": "Desktop Gaming RTX 4090",
        "device_type": "Desktop",
        "manufacturer": "Custom",
        # === CPU ===
        "cpu_model": "AMD Ryzen 9 7950X",
        "cpu_tdp_watts": 170.0,
        "cpu_cores": 16,
        "cpu_architecture": "AMD Zen 4 (x86-64)",
        # === GPU ===
        "gpu_model": "NVIDIA RTX 4090 (24GB)",
        "gpu_tdp_watts": 450.0,
        "gpu_compute_units": 16384,  # CUDA cores
        "gpu_tflops": 82.6,
        # === NPU ===
        "npu_model": "None",
        "npu_tdp_watts": 0.0,
        "npu_tops": 0.0,
        "has_npu": False,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 85.0,
        "inference_gpu_watts": 350.0,
        "inference_npu_watts": 0.0,
        # === Sistema ===
        "system_idle_watts": 65.0,
        "system_tdp_watts": 620.0,
        "memory_gb": 64,
        "memory_bandwidth_gbps": 76.8,
        "year_released": 2023,
        "primary_inference_target": "gpu",
        "source_url": "https://www.nvidia.com/geforce/rtx-4090/",
        "confidence": 0.90,
        "notes": "RTX 4090 desktop. 82.6 TFLOPS FP32, 24GB VRAM para LLMs."
    },
    {
        "device_id": "desktop-office-average",
        "device_name": "Desktop Oficina Promedio",
        "device_type": "Desktop",
        "manufacturer": "Generic",
        # === CPU ===
        "cpu_model": "Intel Core i5-13400",
        "cpu_tdp_watts": 65.0,
        "cpu_cores": 10,
        "cpu_architecture": "Intel Raptor Lake (x86-64)",
        # === GPU ===
        "gpu_model": "Intel UHD 730 (integrated)",
        "gpu_tdp_watts": 15.0,
        "gpu_compute_units": 24,
        "gpu_tflops": 0.5,
        # === NPU ===
        "npu_model": "None",
        "npu_tdp_watts": 0.0,
        "npu_tops": 0.0,
        "has_npu": False,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 45.0,
        "inference_gpu_watts": 12.0,
        "inference_npu_watts": 0.0,
        # === Sistema ===
        "system_idle_watts": 35.0,
        "system_tdp_watts": 120.0,
        "memory_gb": 16,
        "memory_bandwidth_gbps": 51.2,
        "year_released": 2023,
        "primary_inference_target": "cpu",
        "source_url": "https://ark.intel.com/content/www/us/en/ark.html",
        "confidence": 0.75,
        "notes": "PC oficina típico. Sin GPU dedicada, inferencia en CPU."
    },
    # ==========================================
    # SMART HOME / IOT
    # ==========================================
    {
        "device_id": "smart-speaker-echo",
        "device_name": "Amazon Echo (4th Gen)",
        "device_type": "Smart Speaker",
        "manufacturer": "Amazon",
        # === CPU ===
        "cpu_model": "Amazon AZ2 Neural Edge",
        "cpu_tdp_watts": 2.5,
        "cpu_cores": 4,
        "cpu_architecture": "ARM Cortex custom",
        # === GPU ===
        "gpu_model": "None",
        "gpu_tdp_watts": 0.0,
        "gpu_compute_units": 0,
        "gpu_tflops": 0.0,
        # === NPU ===
        "npu_model": "AZ2 Neural Edge Processor",
        "npu_tdp_watts": 1.0,
        "npu_tops": 1.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 2.0,
        "inference_gpu_watts": 0.0,
        "inference_npu_watts": 0.8,
        # === Sistema ===
        "system_idle_watts": 2.0,
        "system_tdp_watts": 4.0,
        "memory_gb": 1,
        "memory_bandwidth_gbps": 8.5,
        "year_released": 2023,
        "primary_inference_target": "npu",
        "source_url": "https://www.amazon.com/echo",
        "confidence": 0.80,
        "notes": "Procesamiento local limitado. Mayoría en cloud."
    },
    {
        "device_id": "smart-speaker-homepod",
        "device_name": "Apple HomePod (2nd Gen)",
        "device_type": "Smart Speaker",
        "manufacturer": "Apple",
        # === CPU ===
        "cpu_model": "Apple S7",
        "cpu_tdp_watts": 3.0,
        "cpu_cores": 2,
        "cpu_architecture": "ARM Apple Silicon",
        # === GPU ===
        "gpu_model": "Apple S7 GPU",
        "gpu_tdp_watts": 1.0,
        "gpu_compute_units": 2,
        "gpu_tflops": 0.1,
        # === NPU ===
        "npu_model": "Apple Neural Engine (limited)",
        "npu_tdp_watts": 1.0,
        "npu_tops": 0.6,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 2.5,
        "inference_gpu_watts": 0.8,
        "inference_npu_watts": 0.6,
        # === Sistema ===
        "system_idle_watts": 2.5,
        "system_tdp_watts": 5.0,
        "memory_gb": 1,
        "memory_bandwidth_gbps": 8.5,
        "year_released": 2023,
        "primary_inference_target": "npu",
        "source_url": "https://www.apple.com/homepod/specs/",
        "confidence": 0.80,
        "notes": "Siri on-device para comandos básicos."
    },
    # ==========================================
    # EDGE DEVICES
    # ==========================================
    {
        "device_id": "edge-raspberry-pi-5",
        "device_name": "Raspberry Pi 5",
        "device_type": "Edge Device",
        "manufacturer": "Raspberry Pi Foundation",
        # === CPU ===
        "cpu_model": "Broadcom BCM2712 (Cortex-A76)",
        "cpu_tdp_watts": 8.0,
        "cpu_cores": 4,
        "cpu_architecture": "ARM Cortex-A76",
        # === GPU ===
        "gpu_model": "VideoCore VII",
        "gpu_tdp_watts": 4.0,
        "gpu_compute_units": 12,
        "gpu_tflops": 0.1,
        # === NPU ===
        "npu_model": "None (external via HAT)",
        "npu_tdp_watts": 0.0,
        "npu_tops": 0.0,
        "has_npu": False,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 6.0,
        "inference_gpu_watts": 3.0,
        "inference_npu_watts": 0.0,
        # === Sistema ===
        "system_idle_watts": 3.0,
        "system_tdp_watts": 12.0,
        "memory_gb": 8,
        "memory_bandwidth_gbps": 34.0,
        "year_released": 2023,
        "primary_inference_target": "cpu",
        "source_url": "https://www.raspberrypi.com/products/raspberry-pi-5/",
        "confidence": 0.92,
        "notes": "Edge inference típicamente en CPU. Puede añadir Coral TPU."
    },
    {
        "device_id": "edge-nvidia-jetson-orin",
        "device_name": "NVIDIA Jetson AGX Orin",
        "device_type": "Edge Device",
        "manufacturer": "NVIDIA",
        # === CPU ===
        "cpu_model": "ARM Cortex-A78AE (12-core)",
        "cpu_tdp_watts": 15.0,
        "cpu_cores": 12,
        "cpu_architecture": "ARM Cortex-A78AE",
        # === GPU ===
        "gpu_model": "NVIDIA Ampere (2048 CUDA cores)",
        "gpu_tdp_watts": 40.0,
        "gpu_compute_units": 2048,
        "gpu_tflops": 5.3,
        # === NPU ===
        "npu_model": "2x NVDLA",
        "npu_tdp_watts": 10.0,
        "npu_tops": 275.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 10.0,
        "inference_gpu_watts": 30.0,
        "inference_npu_watts": 8.0,
        # === Sistema ===
        "system_idle_watts": 15.0,
        "system_tdp_watts": 60.0,
        "memory_gb": 64,
        "memory_bandwidth_gbps": 204.8,
        "year_released": 2022,
        "primary_inference_target": "gpu",
        "source_url": "https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/",
        "confidence": 0.95,
        "notes": "275 TOPS AI. DLA para inferencia eficiente, GPU para flexibilidad."
    },
    {
        "device_id": "edge-coral-tpu",
        "device_name": "Google Coral Dev Board",
        "device_type": "Edge Device",
        "manufacturer": "Google",
        # === CPU ===
        "cpu_model": "NXP i.MX 8M (Cortex-A53)",
        "cpu_tdp_watts": 3.0,
        "cpu_cores": 4,
        "cpu_architecture": "ARM Cortex-A53",
        # === GPU ===
        "gpu_model": "Vivante GC7000Lite",
        "gpu_tdp_watts": 1.0,
        "gpu_compute_units": 4,
        "gpu_tflops": 0.05,
        # === NPU ===
        "npu_model": "Google Edge TPU",
        "npu_tdp_watts": 2.0,
        "npu_tops": 4.0,
        "has_npu": True,
        # === Consumo durante inferencia ===
        "inference_cpu_watts": 2.0,
        "inference_gpu_watts": 0.5,
        "inference_npu_watts": 1.5,
        # === Sistema ===
        "system_idle_watts": 2.0,
        "system_tdp_watts": 6.0,
        "memory_gb": 4,
        "memory_bandwidth_gbps": 12.8,
        "year_released": 2019,
        "primary_inference_target": "npu",
        "source_url": "https://coral.ai/products/dev-board/",
        "confidence": 0.92,
        "notes": "Edge TPU para modelos TFLite cuantizados. 2 TOPS/W eficiencia."
    }
]

# Crear DataFrame
df = pd.DataFrame(devices_data)

# Agregar fecha de recopilación
df['data_collected_date'] = datetime.now().strftime('%Y-%m-%d')

# Ordenar por system_tdp_watts (menor a mayor = más eficiente primero)
df = df.sort_values('system_tdp_watts', ascending=True)

# Definir columnas de salida (agrupadas lógicamente)
output_columns = [
    # Identificación
    'device_id', 'device_name', 'device_type', 'manufacturer',
    # CPU
    'cpu_model', 'cpu_tdp_watts', 'cpu_cores', 'cpu_architecture',
    # GPU
    'gpu_model', 'gpu_tdp_watts', 'gpu_compute_units', 'gpu_tflops',
    # NPU
    'npu_model', 'npu_tdp_watts', 'npu_tops', 'has_npu',
    # Consumo durante inferencia (SEPARADO por componente)
    'inference_cpu_watts', 'inference_gpu_watts', 'inference_npu_watts',
    # Sistema
    'system_idle_watts', 'system_tdp_watts', 'memory_gb', 'memory_bandwidth_gbps',
    # Metadata
    'year_released', 'primary_inference_target', 'source_url', 'confidence', 'notes',
    'data_collected_date'
]
df = df[output_columns]

# Guardar CSV
output_file = os.path.join(output_dir, "devices.csv")
df.to_csv(output_file, index=False, encoding='utf-8')

# Mostrar resumen
print("=" * 70)
print("DATASET DE DISPOSITIVOS v2.0 - CON DISTINCION CPU/GPU/NPU")
print("=" * 70)
print(f"Ubicacion: {output_file}")
print(f"Total dispositivos: {len(df)}")
print()

# Resumen por tipo
print("Por tipo de dispositivo:")
for device_type in df['device_type'].unique():
    subset = df[df['device_type'] == device_type]
    count = len(subset)
    avg_cpu = subset['cpu_tdp_watts'].mean()
    avg_gpu = subset['gpu_tdp_watts'].mean()
    avg_npu = subset['npu_tdp_watts'].mean()
    print(f"  {device_type}:")
    print(f"    Cantidad: {count}")
    print(f"    CPU TDP promedio: {avg_cpu:.1f}W")
    print(f"    GPU TDP promedio: {avg_gpu:.1f}W")
    print(f"    NPU TDP promedio: {avg_npu:.1f}W")

print()
print("Por target de inferencia primario:")
for target in df['primary_inference_target'].unique():
    count = len(df[df['primary_inference_target'] == target])
    print(f"  {target}: {count} dispositivos")

print()
print(f"Dispositivos con NPU: {df['has_npu'].sum()} de {len(df)}")
print(f"Confianza promedio: {df['confidence'].mean()*100:.1f}%")
print("=" * 70)

#!/usr/bin/env python3
"""
Análisis de Percentiles para Etiquetas Medioambientales
======================================================

Este script genera la distribución de emisiones de CO2 para todas las
combinaciones posibles de modelos, data centers, dispositivos, redes
y tipos de petición, para determinar los percentiles adecuados para
el sistema de etiquetado medioambiental.
"""

import pandas as pd
import numpy as np
import sys
import os

# Añadir directorio de scripts al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from calculate_emissions import CarbonCalculator


def analyze_emissions_distribution():
    """
    Analiza la distribución de emisiones para todas las combinaciones posibles.
    """
    print("=" * 70)
    print("ANÁLISIS DE PERCENTILES PARA ETIQUETAS MEDIOAMBIENTALES")
    print("=" * 70)
    print()
    
    # Inicializar calculador (sin API en tiempo real para rapidez)
    # El constructor ya carga los datasets automáticamente
    calc = CarbonCalculator(use_realtime_carbon_intensity=False)
    
    # Obtener IDs disponibles
    available = calc.list_available()
    print("Datasets cargados:")
    for k, v in available.items():
        print(f"  {k}: {len(v)} items")
    
    # Definir combinaciones a evaluar (TODAS las combinaciones)
    models = available['models']
    data_centers = available['data_centers']  # TODOS los 71 DCs
    devices = available['devices']  # TODOS los 20 dispositivos
    networks = available['network_types']  # TODAS las redes
    request_types = ['chat_simple', 'chat_extended', 'generation_short', 
                     'generation_long', 'code_generation', 'summarization']
    
    total_combos = len(models) * len(data_centers) * len(devices) * len(networks) * len(request_types)
    print(f"\nTotal combinaciones teóricas: {total_combos}")
    print("Generando datos...")
    
    # Generar todas las combinaciones
    results = []
    count = 0
    errors = 0
    
    for model in models:
        model_count = 0
        for dc in data_centers:
            for device in devices:
                for net in networks:
                    for req_type in request_types:
                        try:
                            r = calc.calculate_emissions(
                                model_id=model,
                                data_center_id=dc,
                                device_id=device,
                                network_id=net,
                                user_country='ES',
                                request_type=req_type,
                                utilization=0.7
                            )
                            results.append({
                                'model': model,
                                'data_center': dc,
                                'device': device,
                                'network': net,
                                'request_type': req_type,
                                'co2_total_g': r.co2_total_g,
                                'co2_device_g': r.co2_device_g,
                                'co2_network_g': r.co2_network_g,
                                'co2_datacenter_g': r.co2_datacenter_g,
                                'energy_total_wh': r.energy_total_wh,
                                'tokens': r.tokens_processed,
                                'inference_time_sec': r.inference_time_sec
                            })
                            count += 1
                            model_count += 1
                        except Exception as e:
                            errors += 1
        print(f"  Procesado modelo: {model} ({model_count} combinaciones)")
    
    print(f"\nCombinaciones evaluadas: {count}")
    print(f"Errores: {errors}")
    
    # Crear DataFrame
    df = pd.DataFrame(results)
    
    # ===== ANÁLISIS DE DISTRIBUCIÓN =====
    print("\n" + "=" * 70)
    print("DISTRIBUCIÓN DE EMISIONES (gCO2/query)")
    print("=" * 70)
    
    # Percentiles clave
    percentiles = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 
                   55, 60, 65, 70, 75, 80, 85, 90, 95, 99, 100]
    
    print("\n--- Percentiles CO2 Total ---")
    for p in percentiles:
        if p == 0:
            val = df['co2_total_g'].min()
        elif p == 100:
            val = df['co2_total_g'].max()
        else:
            val = df['co2_total_g'].quantile(p/100)
        print(f"  P{p:3d}: {val:12.6f} gCO2")
    
    print(f"\n  Media:    {df['co2_total_g'].mean():12.6f} gCO2")
    print(f"  Mediana:  {df['co2_total_g'].median():12.6f} gCO2")
    print(f"  Std Dev:  {df['co2_total_g'].std():12.6f} gCO2")
    
    # ===== ANÁLISIS POR COMPONENTE =====
    print("\n" + "=" * 70)
    print("CONTRIBUCIÓN POR COMPONENTE (% del total)")
    print("=" * 70)
    
    df['pct_device'] = df['co2_device_g'] / df['co2_total_g'] * 100
    df['pct_network'] = df['co2_network_g'] / df['co2_total_g'] * 100
    df['pct_datacenter'] = df['co2_datacenter_g'] / df['co2_total_g'] * 100
    
    print(f"\n  Dispositivo:  {df['pct_device'].mean():.1f}% (media)")
    print(f"  Red:          {df['pct_network'].mean():.1f}% (media)")
    print(f"  Data Center:  {df['pct_datacenter'].mean():.1f}% (media)")
    
    # ===== ANÁLISIS POR MODELO =====
    print("\n" + "=" * 70)
    print("EMISIONES POR MODELO (gCO2/query promedio)")
    print("=" * 70)
    
    model_stats = df.groupby('model')['co2_total_g'].agg(['mean', 'min', 'max', 'std']).sort_values('mean')
    print()
    for model, row in model_stats.iterrows():
        print(f"  {model:25s}: mean={row['mean']:.6f}, min={row['min']:.6f}, max={row['max']:.6f}")
    
    # ===== ANÁLISIS POR TIPO DE PETICIÓN =====
    print("\n" + "=" * 70)
    print("EMISIONES POR TIPO DE PETICIÓN")
    print("=" * 70)
    
    req_stats = df.groupby('request_type')['co2_total_g'].agg(['mean', 'min', 'max']).sort_values('mean')
    print()
    for req, row in req_stats.iterrows():
        print(f"  {req:20s}: mean={row['mean']:.6f}")
    
    # ===== ANÁLISIS POR DISPOSITIVO =====
    print("\n" + "=" * 70)
    print("EMISIONES POR DISPOSITIVO (top 10 y bottom 5)")
    print("=" * 70)
    
    device_stats = df.groupby('device')['co2_total_g'].agg(['mean']).sort_values('mean')
    print("\n  Más eficientes:")
    for device, row in device_stats.head(5).iterrows():
        print(f"    {device:35s}: {row['mean']:.6f} gCO2")
    print("\n  Menos eficientes:")
    for device, row in device_stats.tail(5).iterrows():
        print(f"    {device:35s}: {row['mean']:.6f} gCO2")
    
    # ===== RECOMENDACIONES DE PERCENTILES =====
    print("\n" + "=" * 70)
    print("PROPUESTA DE UMBRALES PARA ETIQUETAS")
    print("=" * 70)
    
    p10 = df['co2_total_g'].quantile(0.10)
    p30 = df['co2_total_g'].quantile(0.30)
    p50 = df['co2_total_g'].quantile(0.50)
    p70 = df['co2_total_g'].quantile(0.70)
    p90 = df['co2_total_g'].quantile(0.90)
    
    print(f"""
    Basado en la distribución de {count} combinaciones:
    
    ETIQUETA A (Muy Eficiente)  : CO2 < {p10:.4f} gCO2  (P10)
    ETIQUETA B (Eficiente)      : {p10:.4f} <= CO2 < {p30:.4f} gCO2  (P10-P30)
    ETIQUETA C (Moderado)       : {p30:.4f} <= CO2 < {p50:.4f} gCO2  (P30-P50)
    ETIQUETA D (Alto)           : {p50:.4f} <= CO2 < {p70:.4f} gCO2  (P50-P70)
    ETIQUETA E (Muy Alto)       : {p70:.4f} <= CO2 < {p90:.4f} gCO2  (P70-P90)
    ETIQUETA F (Extremo)        : CO2 >= {p90:.4f} gCO2 (P90+)
    """)
    
    # Guardar datos para análisis posterior
    output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                               'datasets', 'processed', 'emissions_distribution.csv')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"\nDatos guardados en: {output_path}")
    
    return df, model_stats, req_stats


if __name__ == "__main__":
    analyze_emissions_distribution()

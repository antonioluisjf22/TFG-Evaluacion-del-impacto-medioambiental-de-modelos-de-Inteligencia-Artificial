#!/usr/bin/env python3
"""
Script de visualización: Mostrar los 10 modelos extraídos en formato elegante
"""

import pandas as pd
import os

# Cargar CSV
csv_path = "datasets/raw/models/models.csv"
df = pd.read_csv(csv_path)

print("\n" + "="*120)
print(" 🤖 DATASET DE MODELOS DE IA - VISUALIZACIÓN COMPLETA".center(120))
print("="*120 + "\n")

# Tabla 1: Resumen General
print("📊 RESUMEN GENERAL")
print("-" * 120)
print(f"  Total de modelos: {len(df)}")
print(f"  Rango de parámetros: {df['num_parameters'].min():,.0f} - {df['num_parameters'].max():,.0f}")
print(f"  Rango de FLOPS: {df['flops_training'].min():.2e} - {df['flops_training'].max():.2e}")
print(f"  Confianza promedio: {df['confidence'].mean():.1%}")
print(f"  Modelos con URL HF: {df['hf_url'].notna().sum()} de {len(df)}")
print()

# Tabla 2: Desglose por tipo
print("📈 DESGLOSE POR TIPO")
print("-" * 120)
type_counts = df['model_type'].value_counts()
for model_type, count in type_counts.items():
    pct = count / len(df) * 100
    print(f"  {model_type:<20} : {count:2d} modelos ({pct:5.1f}%)")
print()

# Tabla 3: Top organizaciones
print("🏢 ORGANIZACIONES REPRESENTADAS")
print("-" * 120)
org_counts = df['organization'].value_counts()
for org, count in org_counts.items():
    print(f"  {org:<40} : {count} modelo(s)")
print()

# Tabla 4: Matriz de modelos detallada
print("📋 MATRIZ DETALLADA DE MODELOS")
print("-" * 120)
print()

for idx, row in df.iterrows():
    rank = idx + 1
    print(f"  {rank}. {row['model_name']:<30} │ {row['model_type']:<15}")
    print(f"     ├─ Organización: {row['organization']}")
    print(f"     ├─ Parámetros: {row['num_parameters']:,} ({row['num_parameters']/1e9:.1f}B)")
    print(f"     ├─ FLOPS: {row['flops_training']:.2e}")
    print(f"     ├─ Release: {row['release_date']}")
    print(f"     ├─ Confianza: {row['confidence']:.0%}")
    print(f"     ├─ HF: {'✓ Disponible' if pd.notna(row['hf_url']) else '✗ No disponible'}")
    print(f"     └─ Nota: {row['notes']}")
    print()

# Tabla 5: Ranking por confianza
print("=" * 120)
print("⭐ RANKING POR CONFIANZA DE DATOS")
print("-" * 120)
df_sorted_conf = df.sort_values('confidence', ascending=False)
for idx, (_, row) in enumerate(df_sorted_conf.iterrows(), 1):
    confidence_bar = "█" * int(row['confidence'] * 20) + "░" * (20 - int(row['confidence'] * 20))
    print(f"  {idx:2d}. [{confidence_bar}] {row['confidence']:>5.0%}  →  {row['model_name']}")
print()

# Tabla 6: Ranking por tamaño
print("=" * 120)
print("💾 RANKING POR TAMAÑO (PARÁMETROS)")
print("-" * 120)
df_sorted_size = df.sort_values('num_parameters', ascending=False)
for idx, (_, row) in enumerate(df_sorted_size.iterrows(), 1):
    # Crear barra visual de tamaño relativo
    size_pct = row['num_parameters'] / df['num_parameters'].max() * 100
    size_bar = "■" * int(size_pct / 5) + "□" * (20 - int(size_pct / 5))
    params_display = f"{row['num_parameters']/1e12:.2f}T" if row['num_parameters'] >= 1e12 else f"{row['num_parameters']/1e9:.1f}B"
    print(f"  {idx:2d}. [{size_bar}] {params_display:>6}  →  {row['model_name']}")
print()

# Tabla 7: Estadísticas
print("=" * 120)
print("📊 ESTADÍSTICAS DESCRIPTIVAS")
print("-" * 120)

stats_data = {
    'num_parameters': df['num_parameters'].astype(float),
    'flops_training': df['flops_training'].astype(float),
    'confidence': df['confidence'].astype(float)
}

for metric, data in stats_data.items():
    print(f"\n  {metric.upper()}")
    print(f"    Media: {data.mean():.2e}")
    print(f"    Mediana: {data.median():.2e}")
    print(f"    Min: {data.min():.2e}")
    print(f"    Max: {data.max():.2e}")
    print(f"    Std Dev: {data.std():.2e}")

print("\n" + "=" * 120)
print(" ✅ VISUALIZACIÓN COMPLETADA".center(120))
print("=" * 120 + "\n")

print(f"📁 Archivo CSV: {csv_path}")
print(f"📅 Fecha de extracción: {df['data_collected_date'].iloc[0]}")
print()

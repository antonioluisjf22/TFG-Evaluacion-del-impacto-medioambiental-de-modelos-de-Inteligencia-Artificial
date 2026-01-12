#!/usr/bin/env python3
"""
Script para extraer información de 10 modelos de IA (Hugging Face + fuentes externas)
Genera: datasets/raw/models/models.csv

Modelos a extraer:
1. GPT-4 (OpenAI) - No en HF
2. Llama 2 70B (Meta) - En HF
3. Mistral 7B (Mistral AI) - En HF
4. Claude 2 (Anthropic) - No en HF
5. BERT (Google) - En HF
6. ViT (Google DeepMind) - En HF
7. PaLM 2 (Google) - No en HF
8. Falcon 40B (TII) - En HF
9. MPT 30B (MosaicML) - En HF
10. OPT 175B (Meta) - En HF
"""

import pandas as pd
from datetime import datetime
import os

# Crear directorio si no existe
output_dir = "datasets/raw/models"
os.makedirs(output_dir, exist_ok=True)

# ===== DATOS MANUALES Y DE HUGGING FACE =====
# Combinamos datos de múltiples fuentes

models_data = [
    {
        # BIEN
        "model_id": "gpt-4",
        "model_name": "GPT-4",
        "organization": "OpenAI",
        "model_type": "LLM",
        "num_parameters": 1700000000000,  # 1.7 Trillion
        "flops_training": 2.1e25,  # Estimated from OpenAI report
        "release_date": "2024-03-14",
        "source_url": "https://openai.com/research/gpt-4",
        "hf_url": None,
        "confidence": 0.95,
        "notes": "OpenAI Technical Report - exact FLOPS estimated"
    },
    {
        # BIEN
        "model_id": "llama2-70b",
        "model_name": "Llama 2 (70B)",
        "organization": "Meta",
        "model_type": "LLM",
        "num_parameters": 70000000000,  # 70 Billion
        "flops_training": 8.4e23,  # Estimated in documentation
        "release_date": "2023-07-18",
        "source_url": "https://arxiv.org/abs/2307.09288",
        "hf_url": "https://huggingface.co/meta-llama/Llama-2-70b",
        "confidence": 0.92,
        "notes": "Meta Research Paper - Table 3"
    },
    {
        # BIEN
        "model_id": "mistral-7b",
        "model_name": "Mistral 7B",
        "organization": "Mistral AI",
        "model_type": "LLM",
        "num_parameters": 7300000000,  # Although named 7B, actually 7.3B. Explained in documentation
        "flops_training": 8.7e22, # Estimated in documentation.
        "release_date": "2023-10-10",
        "source_url": "https://arxiv.org/abs/2310.06825",
        "hf_url": "https://huggingface.co/mistralai/Mistral-7B-v0.1",
        "confidence": 0.85,
        "notes": "Mistral Research Paper"
    },
    {
        # BIEN
        "model_id": "claude-2",
        "model_name": "Claude 2",
        "organization": "Anthropic",
        "model_type": "LLM",
        "num_parameters": 100000000000,  # ~100 Billion estimated
        "flops_training": 2.0e23,  # Estimated based on scale
        "release_date": "2023-07-11",
        "source_url": "https://www.anthropic.com/index/claude-2",
        "hf_url": None,
        "confidence": 0.65,
        "notes": "Anthropic official - FLOPS estimated from model scale"
    },
    {
        # BIEN
        "model_id": "bert-base-uncased",
        "model_name": "BERT Base",
        "organization": "Google",
        "model_type": "Classification",
        "num_parameters": 110000000,  # 110 Million
        "flops_training": 2.0e19,  # From original paper
        "release_date": "2018-10-11",
        "source_url": "https://arxiv.org/abs/1810.04805",
        "hf_url": "https://huggingface.co/google-bert/bert-base-uncased",
        "confidence": 0.95,
        "notes": "Google BERT Paper - Table 1"
    },
    {
        # BIEN
        "model_id": "vit-base-patch16-224",
        "model_name": "Vision Transformer (ViT)",
        "organization": "Google DeepMind",
        "model_type": "Vision",
        "num_parameters": 86000000,  # 86 Million
        "flops_training": 1.7e19,  # From paper
        "release_date": "2020-10-22",
        "source_url": "https://arxiv.org/abs/2010.11929",
        "hf_url": "https://huggingface.co/google/vit-base-patch16-224",
        "confidence": 0.93,
        "notes": "ViT Original Paper - Appendix A"
    },
    {
        # BIEN
        "model_id": "palm2",
        "model_name": "PaLM 2",
        "organization": "Google",
        "model_type": "LLM",
        "num_parameters": 340000000000,  # ~340 Billion estimated
        "flops_training": 7.3e24,  # Estimated from compute budget
        "release_date": "2023-05-10",
        "source_url": "https://ai.google/static/documents/palm2techreport.pdf",
        "hf_url": None,
        "confidence": 0.70,
        "notes": "Google PaLM 2 Technical Report - FLOPS estimated"
    },
    {
        # BIEN
        "model_id": "falcon-40b",
        "model_name": "Falcon 40B",
        "organization": "Technology Innovation Institute (TII)",
        "model_type": "LLM",
        "num_parameters": 40000000000,  # 40 Billion
        "flops_training": 2.40e23,  # from https://www.databricks.com/blog/mpt-30b
        "release_date": "2023-06-07",
        "source_url": "https://huggingface.co/tiiuae/falcon-40b",
        "hf_url": "https://huggingface.co/tiiuae/falcon-40b",
        "confidence": 0.80,
        "notes": "Model card en HF - FLOPS estimated from scale"
    },
    {
        # BIEN
        "model_id": "mpt-30b",
        "model_name": "MPT 30B",
        "organization": "MosaicML",
        "model_type": "LLM",
        "num_parameters": 30000000000,  # 30 Billion
        "flops_training": 1.89e23,  # from https://www.databricks.com/blog/mpt-30b
        "release_date": "2023-03-28",
        "source_url": "https://huggingface.co/Abzu/mpt-30b-q8",
        "hf_url": "https://huggingface.co/Abzu/mpt-30b-q8",
        "confidence": 0.82,
        "notes": "MosaicML documentation"
    },
    {
        # BIEN
        "model_id": "opt-175b",
        "model_name": "OPT 175B",
        "organization": "Meta AI",
        "model_type": "LLM",
        "num_parameters": 175000000000,  # 175 Billion
        "flops_training": 3.15e23,  # From Meta paper
        "release_date": "2022-05-18",
        "source_url": "https://arxiv.org/abs/2205.01068",
        "hf_url": "https://huggingface.co/intlsy/opt-175b-hyperparam",
        "confidence": 0.92,
        "notes": "Meta OPT Paper - Table 2"
    },
]

# Crear DataFrame
df = pd.DataFrame(models_data)

# Ordenar por número de parámetros (descendente)
df = df.sort_values('num_parameters', ascending=False).reset_index(drop=True)

# Agregar columna de timestamp
df['data_collected_date'] = datetime.now().strftime('%Y-%m-%d')

# Seleccionar columnas finales
output_columns = [
    'model_id',
    'model_name',
    'organization',
    'model_type',
    'num_parameters',
    'flops_training',
    'release_date',
    'source_url',
    'hf_url',
    'confidence',
    'notes',
    'data_collected_date'
]

df = df[output_columns]

# Guardar como CSV
output_file = os.path.join(output_dir, "models.csv")
df.to_csv(output_file, index=False, encoding='utf-8')

print("✅ Archivo generado exitosamente!")
print(f"📁 Ubicación: {output_file}")
print(f"\n📊 Resumen de modelos extraídos:")
print(f"   - Total: {len(df)} modelos")
print(f"   - Rango de parámetros: {df['num_parameters'].min():.0e} a {df['num_parameters'].max():.0e}")
print(f"   - Tipos: {', '.join(df['model_type'].unique())}")
print(f"\n📋 Tabla completa:\n")
print(df.to_string(index=False))

# También guardar en formato más legible
print(f"\n\n✨ Vista previa formateada:\n")
for idx, row in df.iterrows():
    print(f"\n{idx + 1}. {row['model_name']}")
    print(f"   Organización: {row['organization']}")
    print(f"   Tipo: {row['model_type']}")
    print(f"   Parámetros: {row['num_parameters']:,}")
    print(f"   FLOPS: {row['flops_training']:.2e}")
    print(f"   Release: {row['release_date']}")
    print(f"   Confianza: {row['confidence']:.0%}")
    print(f"   HuggingFace: {'✓ Sí' if row['hf_url'] else '✗ No'}")

print(f"\n\n✅ CSV guardado en: {output_file}")

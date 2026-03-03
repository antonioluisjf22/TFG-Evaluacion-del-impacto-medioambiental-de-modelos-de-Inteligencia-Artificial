#!/usr/bin/env python3
"""
Script para extraer información de modelos de IA v2.0
=====================================================
Genera: datasets/raw/models/models.csv

MEJORAS v2.0:
- Campos de consumo energético por inferencia
- Estimación de tiempo de inferencia automática
- Tipos de petición (chat, generación, visión)
- Energía por 1000 tokens (Wh/1k tokens)
- Latencia promedio por token

FÓRMULAS USADAS:
================

1. FLOPS de inferencia por token:
   FLOPS_token = 2 × num_parameters
   (Una multiplicación y una suma por parámetro)

2. Energía por inferencia (Joules):
   E_inference = (FLOPS_token × tokens) / (GPU_TFLOPS × 10^12) × GPU_TDP
   
3. Latencia por token:
   latency_ms = 1000 / (tokens_per_second)
   
4. Energía por 1000 tokens (Wh):
   E_1k_tokens = (2 × params × 1000) / (GPU_TFLOPS × 10^12) × GPU_TDP / 3600

Modelos incluidos:
1. GPT-4 (OpenAI) - 1.7T params
2. PaLM 2 (Google) - 340B params
3. OPT 175B (Meta) - 175B params
4. Claude 2 (Anthropic) - 100B params
5. Llama 2 70B (Meta) - 70B params
6. Falcon 40B (TII) - 40B params
7. MPT 30B (MosaicML) - 30B params
8. Mistral 7B (Mistral AI) - 7.3B params
9. BERT Base (Google) - 110M params
10. ViT Base (Google) - 86M params
"""

import pandas as pd
from datetime import datetime
import os
import math

# Crear directorio si no existe
output_dir = "datasets/raw/models"
os.makedirs(output_dir, exist_ok=True)

# ===== CONSTANTES PARA CÁLCULOS ENERGÉTICOS =====
# GPU de referencia para cálculos: NVIDIA A100 (más usada en inference)
REF_GPU_TFLOPS = 312  # A100 FP16 TFLOPS
REF_GPU_TDP_W = 400   # A100 TDP en Watts

# Factores de eficiencia según tamaño del modelo
# Modelos más grandes tienen mejor utilización de GPU
def get_gpu_efficiency(params_billions):
    """Eficiencia de GPU según tamaño del modelo (0-1)"""
    if params_billions > 100:
        return 0.45  # Modelos muy grandes: mejor batching
    elif params_billions > 30:
        return 0.35  # Modelos grandes
    elif params_billions > 5:
        return 0.25  # Modelos medianos
    else:
        return 0.15  # Modelos pequeños: menos eficientes en GPU

def estimate_energy_per_1k_tokens(params, model_type="LLM"):
    """
    Estima energía en Wh por 1000 tokens de inferencia.

    """
    params_b = params / 1e9  # Convertir a billones
    efficiency = get_gpu_efficiency(params_b)
    
    # FLOPS por token = 2 × parámetros (forward pass)
    flops_per_token = 2 * params
    flops_per_1k = flops_per_token * 1000
    
    # Tiempo en segundos para 1000 tokens
    effective_tflops = REF_GPU_TFLOPS * efficiency
    seconds_per_1k = flops_per_1k / (effective_tflops * 1e12)
    
    # Energía = Potencia × Tiempo
    energy_wh = (REF_GPU_TDP_W * seconds_per_1k) / 3600
    
    # Ajustar por tipo de modelo
    if model_type == "Vision":
        energy_wh *= 1.5  # Visión requiere más compute
    elif model_type == "Classification":
        energy_wh *= 0.5  # Solo forward, sin generación
    
    return round(energy_wh, 6)

def estimate_latency_per_token_ms(params, model_type="LLM"):
    """
    Estima latencia promedio por token en milisegundos.
    
    Basado en benchmarks públicos y papers.
    """
    params_b = params / 1e9
    efficiency = get_gpu_efficiency(params_b)
    
    # FLOPS por token
    flops_per_token = 2 * params
    
    # Tiempo por token
    effective_tflops = REF_GPU_TFLOPS * efficiency
    seconds_per_token = flops_per_token / (effective_tflops * 1e12)
    ms_per_token = seconds_per_token * 1000
    
    # Añadir overhead de comunicación/batching
    overhead_ms = 5 if params_b > 100 else 2 if params_b > 10 else 1
    
    return round(ms_per_token + overhead_ms, 2)

def estimate_tokens_per_second(params, model_type="LLM"):
    """Estima tokens por segundo que puede generar el modelo."""
    latency_ms = estimate_latency_per_token_ms(params, model_type)
    return round(1000 / latency_ms, 1)

def get_request_types(model_type):
    """
    Define tipos de petición soportados por cada tipo de modelo.
    
    Valores basados en datasets académicos:
    - chat_simple: LMSYS-Chat-1M (Zheng et al., 2024) https://arxiv.org/abs/2309.11998
    - chat_extended: WildChat (Zhao et al., 2024) https://arxiv.org/abs/2405.01470
    - summarization: CNN/DailyMail (See et al., 2017) https://arxiv.org/abs/1704.04368
    - image_*: ViT (Dosovitskiy et al., 2020) https://arxiv.org/abs/2010.11929
    - text_classification: BERT (Devlin et al., 2018) https://arxiv.org/abs/1810.04805
    """
    if model_type == "LLM":
        return {
            "chat_simple": {"tokens_input": 70, "tokens_output": 215, "description": "Pregunta-respuesta corta"},
            "chat_extended": {"tokens_input": 296, "tokens_output": 441, "description": "Conversación extendida"},
            "generation_short": {"tokens_input": 20, "tokens_output": 65, "description": "Generación de texto corto"},
            "generation_long": {"tokens_input": 50, "tokens_output": 2048, "description": "Generación de texto largo"},
            "summarization": {"tokens_input": 781, "tokens_output": 56, "description": "Resumen de documento"},
            "code_generation": {"tokens_input": 100, "tokens_output": 300, "description": "Generación de código"},
            "translation": {"tokens_input": 200, "tokens_output": 220, "description": "Traducción de texto"}
        }
    elif model_type == "Vision":
        return {
            "image_classification": {"tokens_input": 196, "tokens_output": 10, "description": "Clasificación de imagen"},
            "image_captioning": {"tokens_input": 196, "tokens_output": 15, "description": "Descripción de imagen"},
            "visual_qa": {"tokens_input": 196, "tokens_output": 100, "description": "Pregunta sobre imagen"}
        }
    elif model_type == "Classification":
        return {
            "text_classification": {"tokens_input": 128, "tokens_output": 1, "description": "Clasificación de texto"},
            "sentiment_analysis": {"tokens_input": 64, "tokens_output": 1, "description": "Análisis de sentimiento"},
            "ner": {"tokens_input": 100, "tokens_output": 50, "description": "Reconocimiento de entidades"}
        }
    else:
        return {
            "default": {"tokens_input": 100, "tokens_output": 100, "description": "Petición genérica"}
        }

# ===== DATOS DE MODELOS =====
models_data = [
    {
        "model_id": "gpt-4",
        "model_name": "GPT-4",
        "organization": "OpenAI",
        "model_type": "LLM",
        "num_parameters": 1700000000000,  # 1.7 Trillion (MoE total)
        "active_parameters_inference": 280000000000,  # ~280B activos por token (MoE: ~16% de expertos activos)
        "flops_training": 2.1e25,
        "release_date": "2024-03-14",
        "source_url": "https://openai.com/research/gpt-4",
        "hf_url": None,
        "confidence": 0.80,
        "notes": "MoE architecture (~1.7T total, ~280B active per token). Calculated using 2N FLOPs formula with active parameters",
        "energy_methodology": "Theoretical 2N FLOPs formula (MoE active params ~280B, GPU efficiency 0.45)",
        "empirical_latency_ms_per_token": 35,
        "context_window": 128000,
        "max_output_tokens": 4096
    },
    {
        "model_id": "palm2",
        "model_name": "PaLM 2",
        "organization": "Google",
        "model_type": "LLM",
        "num_parameters": 340000000000,  # 340B
        "flops_training": 7.3e24,
        "release_date": "2023-05-10",
        "source_url": "https://ai.google/static/documents/palm2techreport.pdf",
        "hf_url": None,
        "confidence": 0.70,
        "notes": "Google PaLM 2 Technical Report",
        "empirical_energy_wh_per_1k": None,  # Se calculará
        "empirical_latency_ms_per_token": None,
        "energy_methodology": "Theoretical 2N FLOPs formula scaled by efficiency",
        "context_window": 32000,
        "max_output_tokens": 8192
    },
    {
        "model_id": "opt-175b",
        "model_name": "OPT 175B",
        "organization": "Meta AI",
        "model_type": "LLM",
        "num_parameters": 175000000000,  # 175B
        "flops_training": 3.15e23,
        "release_date": "2022-05-18",
        "source_url": "https://arxiv.org/abs/2205.01068",
        "hf_url": "https://huggingface.co/intlsy/opt-175b-hyperparam",
        "confidence": 0.85,
        "notes": "Meta OPT Paper. Paper solo reporta entrenamiento, no consumo inferencia",
        "energy_methodology": "Theoretical 2N FLOPs formula scaled by efficiency",
        "empirical_latency_ms_per_token": 45,
        "context_window": 2048,
        "max_output_tokens": 2048
    },
    {
        "model_id": "claude-2",
        "model_name": "Claude 2",
        "organization": "Anthropic",
        "model_type": "LLM",
        "num_parameters": 100000000000,  # ~100B estimado
        "flops_training": 2.0e23,
        "release_date": "2023-07-11",
        "source_url": "https://www.anthropic.com/index/claude-2",
        "hf_url": None,
        "confidence": 0.65,
        "notes": "Anthropic - parámetros estimados",
        "empirical_energy_wh_per_1k": None,
        "energy_methodology": "Theoretical 2N FLOPs formula scaled by efficiency",
        "empirical_latency_ms_per_token": None,
        "context_window": 100000,
        "max_output_tokens": 4096
    },
    {
        "model_id": "llama2-70b",
        "model_name": "Llama 2 (70B)",
        "organization": "Meta",
        "model_type": "LLM",
        "num_parameters": 70000000000,  # 70B
        "flops_training": 8.4e23,
        "release_date": "2023-07-18",
        "source_url": "https://arxiv.org/abs/2307.09288",
        "hf_url": "https://huggingface.co/meta-llama/Llama-2-70b",
        "confidence": 0.80,
        "notes": "Meta no publica consumo inferencia. Calculado con fórmula 2N FLOPs",
        "energy_methodology": "Theoretical 2N FLOPs formula scaled by efficiency",
        "empirical_latency_ms_per_token": 28,
        "context_window": 4096,
        "max_output_tokens": 4096
    },
    {
        "model_id": "falcon-40b",
        "model_name": "Falcon 40B",
        "organization": "Technology Innovation Institute (TII)",
        "model_type": "LLM",
        "num_parameters": 40000000000,  # 40B
        "flops_training": 2.40e23,
        "release_date": "2023-06-07",
        "source_url": "https://huggingface.co/tiiuae/falcon-40b",
        "hf_url": "https://huggingface.co/tiiuae/falcon-40b",
        "confidence": 0.80,
        "notes": "Model card en HF",
        "energy_methodology": "Theoretical 2N FLOPs formula scaled by efficiency",
        "empirical_energy_wh_per_1k": None,
        "empirical_latency_ms_per_token": None,
        "context_window": 2048,
        "max_output_tokens": 2048
    },
    {
        "model_id": "mpt-30b",
        "model_name": "MPT 30B",
        "organization": "MosaicML",
        "model_type": "LLM",
        "num_parameters": 30000000000,  # 30B
        "flops_training": 1.89e23,
        "release_date": "2023-03-28",
        "source_url": "https://www.databricks.com/blog/mpt-30b",
        "hf_url": "https://huggingface.co/Abzu/mpt-30b-q8",
        "confidence": 0.82,
        "energy_methodology": "Theoretical 2N FLOPs formula scaled by efficiency",
        "notes": "MosaicML documentation",
        "empirical_energy_wh_per_1k": None,
        "empirical_latency_ms_per_token": None,
        "context_window": 8192,
        "max_output_tokens": 8192
    },
    {
        "model_id": "mistral-7b",
        "model_name": "Mistral 7B",
        "organization": "Mistral AI",
        "model_type": "LLM",
        "num_parameters": 7300000000,  # 7.3B
        "flops_training": 8.7e22,
        "release_date": "2023-10-10",
        "source_url": "https://arxiv.org/abs/2310.06825",
        "hf_url": "https://huggingface.co/mistralai/Mistral-7B-v0.1",
        "confidence": 0.85,
        "notes": "Empirical value discrepancy with published papers. Calculado con fórmula 2N FLOPs",
        "empirical_latency_ms_per_token": 8,  # Mantener latency empírica para referencia
        "energy_methodology": "Theoretical 2N FLOPs formula scaled by efficiency",
        "context_window": 32000,
        "max_output_tokens": 8192
    },
    {
        "model_id": "bert-base-uncased",
        "model_name": "BERT Base",
        "organization": "Google",
        "model_type": "Classification",
        "num_parameters": 110000000,  # 110M
        "flops_training": 2.0e19,
        "release_date": "2018-10-11",
        "source_url": "https://arxiv.org/abs/1810.04805",
        "hf_url": "https://huggingface.co/google-bert/bert-base-uncased",
        "energy_methodology": "Hardware power measurement (CodeCarbon)",
        "confidence": 0.85,
        "notes": "Mediciones empíricas verificables (Cao et al. 2020 ACL SustaiNLP)",
        "empirical_energy_wh_per_1k": 0.000012,  # Cao et al. 2020 - medición directa
        "empirical_latency_ms_per_token": 0.5,
        "context_window": 512,
        "max_output_tokens": 1  # Solo clasificación
    },
    {
        "model_id": "vit-base-patch16-224",
        "model_name": "Vision Transformer (ViT)",
        "organization": "Google DeepMind",
        "model_type": "Vision",
        "num_parameters": 86000000,  # 86M
        "flops_training": 1.7e19,
        "release_date": "2020-10-22",
        "source_url": "https://arxiv.org/abs/2010.11929",
        "hf_url": "https://huggingface.co/google/vit-base-patch16-224",
        "confidence": 0.85,
        "notes": "Paper arXiv:2511.23166 does not measure ViT-base (86M params). Calculado con fórmula 2N FLOPs",
        "empirical_latency_ms_per_token": 0.3,  # Mantener latency empírica para referencia
        "energy_methodology": "Theoretical 2N FLOPs formula scaled by efficiency (vision model)",
        "context_window": 196,  # Patches de imagen
        "max_output_tokens": 10  # Clasificación
    },
]

# ===== PROCESAR Y ENRIQUECER DATOS =====
print("=" * 70)
print("EXTRACCIÓN DE MODELOS DE IA v2.0")
print("=" * 70)
print("\nCalculando métricas energéticas...\n")

for model in models_data:
    # Usar active_parameters_inference si existe (para MoE como GPT-4)
    params = model.get('active_parameters_inference', model['num_parameters'])
    model_type = model['model_type']
    
    # Calcular valores de energía
    # Prioridad: preset_energy > empirical_energy > calculado
    if model.get('preset_energy_wh_per_1k') is not None:
        # Valor preestablecido (puede ser teórico o empírico)
        model['energy_wh_per_1k_tokens'] = model['preset_energy_wh_per_1k']
        model['energy_source'] = model.get('energy_source_override', 'calculated')
    elif model.get('empirical_energy_wh_per_1k') is not None:
        # Valor empírico medido
        model['energy_wh_per_1k_tokens'] = model['empirical_energy_wh_per_1k']
        model['energy_source'] = 'empirical'
    else:
        # Calcular usando fórmula 2N FLOPs
        model['energy_wh_per_1k_tokens'] = estimate_energy_per_1k_tokens(params, model_type)
        model['energy_source'] = 'calculated'
    
    if model.get('empirical_latency_ms_per_token') is None:
        model['latency_ms_per_token'] = estimate_latency_per_token_ms(params, model_type)
        model['latency_source'] = 'calculated'
    else:
        model['latency_ms_per_token'] = model['empirical_latency_ms_per_token']
        model['latency_source'] = 'empirical'
    
    # Tokens por segundo
    model['tokens_per_second'] = round(1000 / model['latency_ms_per_token'], 1)
    
    # Tipos de petición soportados
    request_types = get_request_types(model_type)
    model['supported_request_types'] = ",".join(request_types.keys())
    
    # Petición típica (la más común)
    if model_type == "LLM":
        model['typical_request_type'] = 'chat_simple'
        typical = request_types['chat_simple']
    elif model_type == "Vision":
        model['typical_request_type'] = 'image_classification'
        typical = request_types['image_classification']
    else:
        model['typical_request_type'] = 'text_classification'
        typical = request_types['text_classification']
    
    # Estimación para petición típica
    total_tokens = typical['tokens_input'] + typical['tokens_output']
    model['typical_tokens_total'] = total_tokens
    model['typical_energy_wh'] = round(
        model['energy_wh_per_1k_tokens'] * (total_tokens / 1000), 8
    )
    model['typical_latency_sec'] = round(
        (model['latency_ms_per_token'] * total_tokens) / 1000, 3
    )
    
    # Preservar energy_methodology si existe
    if 'energy_methodology' not in model:
        # Inferir la metodología según la fuente de energía
        if model['energy_source'] == 'empirical':
            model['energy_methodology'] = 'Empirical measurement'
        else:
            model['energy_methodology'] = 'Calculated or estimated'
    
    # Limpiar campos temporales (pueden no existir en todos los modelos)
    model.pop('empirical_energy_wh_per_1k', None)
    model.pop('preset_energy_wh_per_1k', None)
    model.pop('energy_source_override', None)
    model.pop('empirical_latency_ms_per_token', None)
    model.pop('active_parameters_inference', None)

# Crear DataFrame
df = pd.DataFrame(models_data)

# Ordenar por número de parámetros (descendente)
df = df.sort_values('num_parameters', ascending=False).reset_index(drop=True)

# Agregar timestamp
df['data_collected_date'] = datetime.now().strftime('%Y-%m-%d')

# Columnas finales v2.0
output_columns = [
    # Identificación
    'model_id',
    'model_name',
    'organization',
    'model_type',
    
    # Arquitectura
    'num_parameters',
    'flops_training',
    'context_window',
    'max_output_tokens',
    
    # Consumo energético (NUEVOS)
    'energy_wh_per_1k_tokens',
    'energy_source',
    'latency_ms_per_token',
    'latency_source',
    'tokens_per_second',
    
    # Tipos de petición (NUEVOS)
    'supported_request_types',
    'typical_request_type',
    'typical_tokens_total',
    'typical_energy_wh',
    'typical_latency_sec',
    
    # Metadatos
    'release_date',
    'source_url',
    'hf_url',
    'confidence',
    'notes',
    'data_collected_date',
    'energy_methodology'
]

df = df[output_columns]

# Guardar CSV
output_file = os.path.join(output_dir, "models.csv")
df.to_csv(output_file, index=False, encoding='utf-8')

# ===== GENERAR ARCHIVO DE TIPOS DE PETICIÓN =====
request_types_data = []
for model_type in ["LLM", "Vision", "Classification"]:
    types = get_request_types(model_type)
    for req_id, req_data in types.items():
        request_types_data.append({
            "request_type_id": req_id,
            "model_type": model_type,
            "tokens_input_avg": req_data['tokens_input'],
            "tokens_output_avg": req_data['tokens_output'],
            "description": req_data['description']
        })

req_df = pd.DataFrame(request_types_data)
req_output = os.path.join(output_dir, "request_types.csv")
req_df.to_csv(req_output, index=False, encoding='utf-8')

# ===== RESUMEN =====
print("✅ Archivos generados exitosamente!")
print(f"\n📁 Archivos creados:")
print(f"   - {output_file}")
print(f"   - {req_output}")

print(f"\n📊 Resumen de modelos:")
print(f"   - Total: {len(df)} modelos")
print(f"   - Rango de parámetros: {df['num_parameters'].min():.0e} a {df['num_parameters'].max():.0e}")
print(f"   - Tipos: {', '.join(df['model_type'].unique())}")
print(f"   - Datos empíricos: {len(df[df['energy_source'] == 'empirical'])} modelos")
print(f"   - Datos calculados: {len(df[df['energy_source'] == 'calculated'])} modelos")

print(f"\n📋 Nuevos campos v2.0:")
print("   - energy_wh_per_1k_tokens: Energía por 1000 tokens")
print("   - latency_ms_per_token: Latencia por token")
print("   - tokens_per_second: Velocidad de generación")
print("   - supported_request_types: Tipos de petición soportados")
print("   - typical_energy_wh: Energía de petición típica")

print(f"\n📋 Tabla de energía por modelo:\n")
print("-" * 90)
print(f"{'Modelo':<25} {'Params':<12} {'E/1k tok (Wh)':<15} {'Latency(ms)':<12} {'Tok/s':<10} {'Fuente':<10}")
print("-" * 90)
for _, row in df.iterrows():
    params_str = f"{row['num_parameters']/1e9:.1f}B" if row['num_parameters'] >= 1e9 else f"{row['num_parameters']/1e6:.0f}M"
    print(f"{row['model_name']:<25} {params_str:<12} {row['energy_wh_per_1k_tokens']:<15.6f} {row['latency_ms_per_token']:<12.2f} {row['tokens_per_second']:<10.1f} {row['energy_source']:<10}")
print("-" * 90)

print(f"\n📋 Tipos de petición generados: {len(req_df)}")
print(req_df.to_string(index=False))

print(f"\n\n✅ CSV guardado en: {output_file}")

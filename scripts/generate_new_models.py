"""Utility to generate CSV rows for new models using the 2N FLOPs formula."""

REF_GPU_TFLOPS = 312
REF_GPU_TDP_W = 400

def get_gpu_efficiency(params_billions):
    if params_billions > 100: return 0.45
    elif params_billions > 30: return 0.35
    elif params_billions > 5: return 0.25
    else: return 0.15

def estimate_energy_per_1k_tokens(params):
    params_b = params / 1e9
    efficiency = get_gpu_efficiency(params_b)
    flops_per_1k = 2 * params * 1000
    seconds_per_1k = flops_per_1k / (REF_GPU_TFLOPS * efficiency * 1e12)
    energy_wh = (REF_GPU_TDP_W * seconds_per_1k) / 3600
    return round(energy_wh, 6)

def estimate_latency_ms(params):
    params_b = params / 1e9
    efficiency = get_gpu_efficiency(params_b)
    flops = 2 * params
    seconds = flops / (REF_GPU_TFLOPS * efficiency * 1e12)
    ms = seconds * 1000
    overhead = 5 if params_b > 100 else 2 if params_b > 10 else 1
    return round(ms + overhead, 2)

def estimate_tps(params):
    lat = estimate_latency_ms(params)
    return round(1000 / lat, 1)

models = [
    ('gpt-4o', 'GPT-4o', 'OpenAI', 200_000_000_000, 200_000_000_000, 128000, 4096, '2024-05-13', 'https://openai.com/index/hello-gpt-4o/', '', 0.7, 'MoE ~200B active params estimado. Multimodal'),
    ('claude-3-sonnet', 'Claude 3 Sonnet', 'Anthropic', 70_000_000_000, 70_000_000_000, 200000, 4096, '2024-03-04', 'https://www.anthropic.com/news/claude-3-family', '', 0.65, 'Params estimados ~70B. Anthropic no publica'),
    ('claude-3-haiku', 'Claude 3 Haiku', 'Anthropic', 20_000_000_000, 20_000_000_000, 200000, 4096, '2024-03-04', 'https://www.anthropic.com/news/claude-3-family', '', 0.65, 'Params estimados ~20B. Modelo eficiente'),
    ('llama-3-8b', 'Llama 3 8B', 'Meta', 8_030_000_000, 8_030_000_000, 8192, 4096, '2024-04-18', 'https://arxiv.org/abs/2407.21783', 'https://huggingface.co/meta-llama/Meta-Llama-3-8B', 0.85, 'Meta Llama 3 paper. Dense model'),
    ('llama-3-70b', 'Llama 3 70B', 'Meta', 70_554_000_000, 70_554_000_000, 8192, 4096, '2024-04-18', 'https://arxiv.org/abs/2407.21783', 'https://huggingface.co/meta-llama/Meta-Llama-3-70B', 0.85, 'Meta Llama 3 paper. Dense model'),
    ('mixtral-8x7b', 'Mixtral 8x7B', 'Mistral AI', 46_700_000_000, 12_900_000_000, 32768, 4096, '2024-01-08', 'https://arxiv.org/abs/2401.04088', 'https://huggingface.co/mistralai/Mixtral-8x7B-v0.1', 0.85, 'MoE: 46.7B total ~12.9B active per token (2 of 8 experts)'),
    ('mixtral-8x22b', 'Mixtral 8x22B', 'Mistral AI', 141_000_000_000, 39_000_000_000, 65536, 4096, '2024-04-17', 'https://mistral.ai/news/mixtral-8x22b', 'https://huggingface.co/mistralai/Mixtral-8x22B-v0.1', 0.8, 'MoE: 141B total ~39B active per token'),
    ('phi-3-mini', 'Phi-3 Mini', 'Microsoft Research', 3_800_000_000, 3_800_000_000, 128000, 4096, '2024-04-23', 'https://arxiv.org/abs/2404.14219', 'https://huggingface.co/microsoft/Phi-3-mini-128k-instruct', 0.85, 'Small Language Model. Extraordinaria calidad para su tamano'),
    ('phi-3-medium', 'Phi-3 Medium', 'Microsoft Research', 14_000_000_000, 14_000_000_000, 128000, 4096, '2024-05-21', 'https://arxiv.org/abs/2404.14219', 'https://huggingface.co/microsoft/Phi-3-medium-128k-instruct', 0.85, 'Phi-3 medium 14B params'),
    ('gemma-2-9b', 'Gemma 2 9B', 'Google DeepMind', 9_240_000_000, 9_240_000_000, 8192, 4096, '2024-06-27', 'https://arxiv.org/abs/2408.00118', 'https://huggingface.co/google/gemma-2-9b', 0.85, 'Google DeepMind Gemma 2. Distillation-trained'),
    ('gemma-2-27b', 'Gemma 2 27B', 'Google DeepMind', 27_200_000_000, 27_200_000_000, 8192, 4096, '2024-06-27', 'https://arxiv.org/abs/2408.00118', 'https://huggingface.co/google/gemma-2-27b', 0.85, 'Google DeepMind Gemma 2 27B'),
    ('mistral-nemo-12b', 'Mistral Nemo 12B', 'Mistral AI', 12_200_000_000, 12_200_000_000, 128000, 4096, '2024-07-18', 'https://mistral.ai/news/mistral-nemo', 'https://huggingface.co/mistralai/Mistral-Nemo-Instruct-2407', 0.85, 'Colaboracion Mistral AI + NVIDIA'),
    ('qwen2-7b', 'Qwen2 7B', 'Alibaba Cloud', 7_070_000_000, 7_070_000_000, 131072, 4096, '2024-06-07', 'https://arxiv.org/abs/2407.10671', 'https://huggingface.co/Qwen/Qwen2-7B', 0.8, 'Alibaba Qwen2 series'),
    ('command-r', 'Command R', 'Cohere', 35_000_000_000, 35_000_000_000, 128000, 4096, '2024-03-11', 'https://cohere.com/blog/command-r', 'https://huggingface.co/CohereForAI/c4ai-command-r-v01', 0.8, 'Cohere Command R. RAG-oriented'),
    ('yi-1.5-34b', 'Yi 1.5 34B', '01.AI', 34_000_000_000, 34_000_000_000, 4096, 4096, '2024-05-13', 'https://arxiv.org/abs/2403.04652', 'https://huggingface.co/01-ai/Yi-1.5-34B', 0.8, '01.AI Yi 1.5 series'),
]

typical_tokens = 285

for m in models:
    mid, name, org, total, active, ctx, maxout, rel, url, hf, conf, notes = m
    e = estimate_energy_per_1k_tokens(active)
    l = estimate_latency_ms(active)
    t = estimate_tps(active)
    flops_train = 6 * total * 1e12
    typical_e = round(e * typical_tokens / 1000, 8)
    typical_lat = round(l * typical_tokens / 1000, 3)

    params_b = active / 1e9
    eff_str = f'GPU efficiency {get_gpu_efficiency(params_b)}'
    if total != active:
        moe_note = f'MoE active params ~{active/1e9:.0f}B, {eff_str}'
    else:
        moe_note = eff_str

    supported = 'chat_simple,chat_extended,generation_short,generation_long,summarization,code_generation,translation'

    # Escape notes that might contain commas
    notes_safe = f'"{notes}"' if ',' in notes else notes

    print(f'{mid},{name},{org},LLM,{total},{flops_train:.2e},{ctx},{maxout},{e},calculated,{l},calculated,{t},"{supported}",chat_simple,{typical_tokens},{typical_e},{typical_lat},{rel},{url},{hf},{conf},{notes_safe},2026-04-10,Theoretical 2N FLOPs formula ({moe_note})')

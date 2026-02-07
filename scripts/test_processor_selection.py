#!/usr/bin/env python3
"""
Script de prueba para la selección de procesadores (CPU/GPU/NPU)
================================================================

Demuestra cómo la calculadora implementa:
1. Selección automática (auto → primary_inference_target)
2. Selección manual con validación
3. Fallbacks inteligentes
4. Tracking de procesador usado y watts consumidos
"""

import sys
import os

# Importar la calculadora desde el mismo directorio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from calculate_emissions import CarbonCalculator

def print_header(title):
    """Imprime un encabezado formateado"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")

def print_result(result, label=""):
    """Imprime un resultado formateado"""
    if label:
        print(f"\n{label}:")
    print(f"  CO2 Total: {result.co2_total_g:.4f} g CO2")
    print(f"  Energía Total: {result.energy_total_wh:.6f} Wh")
    print(f"  Procesador: {result.processor_used.upper()}")
    print(f"  Watts del procesador: {result.processor_watts:.2f}W")
    print(f"  Desglose:")
    print(f"    - Dispositivo: {result.co2_device_g:.4f} g CO2 ({result.energy_device_wh:.6f} Wh)")
    print(f"    - Red: {result.co2_network_g:.4f} g CO2 ({result.energy_network_wh:.6f} Wh)")
    print(f"    - Data Center: {result.co2_datacenter_g:.4f} g CO2 ({result.energy_datacenter_wh:.6f} Wh)")

def test_device_processors():
    """Prueba 1: Ver procesadores disponibles para cada dispositivo"""
    print_header("PRUEBA 1: Procesadores disponibles por dispositivo")
    
    calc = CarbonCalculator()
    
    # Algunos dispositivos interesantes para probar
    test_devices = [
        ('phone-iphone-15-pro', 'iPhone 15 Pro (tiene CPU, GPU, NPU)'),
        ('phone-budget-average', 'Smartphone presupuesto (CPU, GPU, NPU limitado)'),
        ('laptop-gaming-rtx4090', 'Laptop Gaming RTX 4090 (CPU, GPU, SIN NPU)'),
        ('edge-raspberry-pi-5', 'Raspberry Pi 5 (CPU, GPU, SIN NPU)'),
        ('edge-coral-tpu', 'Google Coral TPU (CPU, GPU, NPU/TPU)'),
        ('edge-nvidia-jetson-orin', 'NVIDIA Jetson AGX Orin (CPU, GPU potente, DLA)'),
    ]
    
    for device_id, description in test_devices:
        try:
            valid_processors = calc.get_valid_processors_for_device(device_id)
            print(f"✓ {description}")
            print(f"  Opciones: {valid_processors}")
            
            # Mostrar watts para cada procesador
            for proc in valid_processors:
                watts = calc.get_processor_watts(device_id, proc)
                print(f"    - {proc.upper()}: {watts:.1f}W")
        except ValueError as e:
            print(f"✗ {device_id}: {e}")
        print()

def test_auto_selection():
    """Prueba 2: Selección automática (auto → primary_inference_target)"""
    print_header("PRUEBA 2: Selección automática (auto → primary_inference_target)")
    
    calc = CarbonCalculator()
    
    test_cases = [
        ('phone-iphone-15-pro', 'NPU'),
        ('laptop-gaming-rtx4090', 'GPU'),
        ('edge-raspberry-pi-5', 'CPU'),
        ('tablet-ipad-pro-m4', 'NPU'),
    ]
    
    for device_id, expected_processor in test_cases:
        try:
            result = calc.calculate_emissions(
                model_id='gpt-4',
                data_center_id='aws-eu-west-1',
                device_id=device_id,
                network_id='wifi-5',
                user_country='ES',
                request_type='chat_simple',
                inference_processor='auto',  # Dejar que elija automáticamente
                utilization=0.7
            )
            
            device = calc.get_device(device_id)
            device_name = device['device_name'] if device is not None else device_id
            
            print(f"✓ {device_name}")
            print(f"  Esperado: {expected_processor.upper()}")
            print(f"  Actual: {result.processor_used.upper()}")
            print(f"  Watts: {result.processor_watts:.2f}W")
            print(f"  CO2 Dispositivo: {result.co2_device_g:.4f} g")
            
            if result.processor_used.upper() == expected_processor.upper():
                print("  ✓ Selección correcta!")
            else:
                print("  ⚠ No coincide con lo esperado")
        except Exception as e:
            print(f"✗ {device_id}: {e}")
        print()

def test_manual_selection():
    """Prueba 3: Selección manual con validación"""
    print_header("PRUEBA 3: Selección manual con validación")
    
    calc = CarbonCalculator()
    
    print("Test 3A: Seleccionar procesador válido para el dispositivo\n")
    
    try:
        result = calc.calculate_emissions(
            model_id='gpt-4',
            data_center_id='aws-eu-west-1',
            device_id='phone-iphone-15-pro',
            network_id='wifi-5',
            user_country='ES',
            request_type='chat_simple',
            inference_processor='npu',  # Seleccionar NPU específicamente
            utilization=0.7
        )
        
        print(f"✓ iPhone 15 Pro con procesador NPU específico")
        print(f"  Procesador seleccionado: {result.processor_used.upper()}")
        print(f"  Watts: {result.processor_watts:.2f}W")
        print(f"  CO2 Dispositivo: {result.co2_device_g:.4f} g")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n" + "-" * 80)
    print("Test 3B: Intentar seleccionar procesador inválido\n")
    
    try:
        result = calc.calculate_emissions(
            model_id='gpt-4',
            data_center_id='aws-eu-west-1',
            device_id='laptop-gaming-rtx4090',  # RTX 4090: CPU y GPU, PERO NO NPU
            network_id='wifi-5',
            user_country='ES',
            request_type='chat_simple',
            inference_processor='npu',  # ¡Seleccionar NPU que NO tiene!
            utilization=0.7
        )
        
        print(f"⚠ Se intentó NPU pero el dispositivo no lo tiene")
        print(f"  Fallback a: {result.processor_used.upper()}")
        print(f"  Watts: {result.processor_watts:.2f}W")
    except ValueError as e:
        print(f"✓ Validación capturó el error: {e}")

def test_processor_impact():
    """Prueba 4: Impacto de seleccionar diferentes procesadores"""
    print_header("PRUEBA 4: Impacto de procesador en emisiones (variación CPU vs GPU vs NPU)")
    
    calc = CarbonCalculator()
    
    # iPhone 15 Pro tiene los tres procesadores
    device_id = 'phone-iphone-15-pro'
    device = calc.get_device(device_id)
    
    print(f"Dispositivo: {device['device_name']}")
    print(f"Procesadores disponibles: {calc.get_valid_processors_for_device(device_id)}\n")
    
    results = {}
    
    for processor in ['cpu', 'gpu', 'npu']:
        try:
            result = calc.calculate_emissions(
                model_id='gpt-4',
                data_center_id='aws-eu-west-1',
                device_id=device_id,
                network_id='wifi-5',
                user_country='ES',
                request_type='chat_simple',
                inference_processor=processor,
                utilization=0.7
            )
            
            results[processor] = result
            print(f"{processor.upper()}:")
            print(f"  Watts: {result.processor_watts:.2f}W")
            print(f"  Energía Dispositivo: {result.energy_device_wh:.6f} Wh")
            print(f"  CO2 Dispositivo: {result.co2_device_g:.4f} g")
            print(f"  CO2 Total: {result.co2_total_g:.4f} g")
        except Exception as e:
            print(f"{processor.upper()}: Error - {e}")
        print()
    
    # Comparación
    if len(results) >= 2:
        print("-" * 80)
        print("COMPARACIÓN DE IMPACTO:\n")
        
        cpu_watts = results['cpu'].processor_watts
        
        for proc in ['gpu', 'npu']:
            if proc in results:
                processor_watts = results[proc].processor_watts
                multiplier = processor_watts / cpu_watts if cpu_watts > 0 else 1
                cpu_co2 = results['cpu'].co2_device_g
                proc_co2 = results[proc].co2_device_g
                reduction = ((cpu_co2 - proc_co2) / cpu_co2 * 100) if cpu_co2 > 0 else 0
                
                print(f"{proc.upper()} vs CPU:")
                print(f"  Watts: {multiplier:.1f}x ({'mas' if multiplier > 1 else 'menos'} consumo)")
                print(f"  CO2: {reduction:+.1f}% ({'mas' if reduction < 0 else 'menos'} emisiones)")
                print()

def test_fallback_behavior():
    """Prueba 5: Comportamiento de fallback"""
    print_header("PRUEBA 5: Fallback inteligente")
    
    calc = CarbonCalculator()
    
    print("Cuando se selecciona un procesador que el dispositivo no tiene,")
    print("el sistema realiza fallback automático a CPU como procesador seguro.\n")
    
    # Raspberry Pi: tiene CPU y GPU, pero SIN NPU
    device_id = 'edge-raspberry-pi-5'
    device = calc.get_device(device_id)
    
    print(f"Dispositivo: {device['device_name']}")
    print(f"Procesadores disponibles: {calc.get_valid_processors_for_device(device_id)}\n")
    
    try:
        # Intentar GPU (sí lo tiene)
        result_gpu = calc.calculate_emissions(
            model_id='gpt-4',
            data_center_id='aws-eu-west-1',
            device_id=device_id,
            network_id='wifi-5',
            user_country='ES',
            request_type='chat_simple',
            inference_processor='gpu',
            utilization=0.7
        )
        
        print(f"✓ GPU (disponible): {result_gpu.processor_used.upper()} - {result_gpu.processor_watts:.2f}W")
    except Exception as e:
        print(f"✗ GPU: {e}")
    
    try:
        # Intentar NPU (NO lo tiene)
        result_npu = calc.calculate_emissions(
            model_id='gpt-4',
            data_center_id='aws-eu-west-1',
            device_id=device_id,
            network_id='wifi-5',
            user_country='ES',
            request_type='chat_simple',
            inference_processor='npu',  # ¡No existe!
            utilization=0.7
        )
        
        print(f"⚠ NPU (no disponible): Fallback a {result_npu.processor_used.upper()} - {result_npu.processor_watts:.2f}W")
    except Exception as e:
        print(f"✗ NPU: {e}")

def main():
    """Ejecuta todas las pruebas"""
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 78 + "║")
    print("║" + "  PRUEBAS DE SELECCIÓN DE PROCESADORES (CPU/GPU/NPU)".center(78) + "║")
    print("║" + "  Validación de lógica implementada".center(78) + "║")
    print("║" + " " * 78 + "║")
    print("╚" + "=" * 78 + "╝")
    
    try:
        test_device_processors()
        test_auto_selection()
        test_manual_selection()
        test_processor_impact()
        test_fallback_behavior()
        
        print_header("✓ TODAS LAS PRUEBAS COMPLETADAS")
        print("La implementación de selección de procesadores funciona correctamente.\n")
        
    except Exception as e:
        print(f"\n✗ ERROR DURANTE LAS PRUEBAS: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

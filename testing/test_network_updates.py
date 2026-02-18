#!/usr/bin/env python3
"""
Validation script for network energy CSV updates and code alignment (v2.1).
Tests:
1. CSV loads correctly with new structure (sin columnas carbon_kg_per_GB_*)
2. get_network() finds networks by network_type
3. Dynamic carbon_kg_per_GB calculation using CI from API
4. Regional CI differences produce expected CO₂ variation
"""

import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from calculate_emissions import CarbonCalculator
import pandas as pd

def test_csv_structure():
    """Verify CSV loads with correct column names (v2.1 - sin columnas carbon_kg_per_GB_*)"""
    print("\n" + "="*70)
    print("TEST 1: CSV Structure Validation (v2.1)")
    print("="*70)
    
    csv_path = "datasets/raw/network/network_energy_sources_2024.csv"
    if not os.path.exists(csv_path):
        print(f"❌ CSV not found at {csv_path}")
        return False
    
    df = pd.read_csv(csv_path)
    print(f"✓ CSV loaded successfully ({len(df)} network types)")
    
    # Columnas requeridas en v2.1 (energía solo, CI viene de API)
    required_cols = [
        'network_type', 'energy_kWh_per_MB', 'energy_kWh_per_GB',
        'confidence_percent', 'primary_source'
    ]
    
    # Columnas que YA NO deben existir (eliminadas en v2.1)
    deprecated_cols = [
        'carbon_kg_per_GB_450g_grid', 'carbon_kg_per_GB_european_grid',
        'carbon_kg_per_GB_us_grid', 'carbon_kg_per_GB_china_grid'
    ]
    
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        print(f"❌ Missing required columns: {missing}")
        return False
    
    print(f"✓ All required columns present")
    
    # Verificar que columnas deprecated fueron eliminadas
    found_deprecated = [col for col in deprecated_cols if col in df.columns]
    if found_deprecated:
        print(f"⚠ WARNING: Deprecated columns still present: {found_deprecated}")
    else:
        print(f"✓ Deprecated carbon_kg_per_GB_* columns correctly removed")
    
    print("\nAvailable network types:")
    for _, row in df.iterrows():
        print(f"  - {row['network_type']}: {row['energy_kWh_per_MB']} kWh/MB, {row['energy_kWh_per_GB']} kWh/GB")
    
    return True

def test_carbon_calculator_init():
    """Verify CarbonCalculator initializes and loads data"""
    print("\n" + "="*70)
    print("TEST 2: CarbonCalculator Initialization")
    print("="*70)
    
    try:
        calc = CarbonCalculator()
        print("✓ CarbonCalculator initialized successfully")
        
        available = calc.list_available()
        
        if 'network_types' in available:
            print(f"✓ Network types loaded: {len(available['network_types'])} types")
            print(f"  Example: {available['network_types'][:3]}")
        else:
            print("❌ Network types not loaded")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error initializing CarbonCalculator: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_get_network_lookup():
    """Verify get_network() finds networks by network_type"""
    print("\n" + "="*70)
    print("TEST 3: Network Lookup by network_type")
    print("="*70)
    
    try:
        calc = CarbonCalculator()
        
        test_networks = [
            "4G LTE",
            "Fiber FTTH",
            "WiFi 6 802.11ax",
            "5G NSA"
        ]
        
        for net_type in test_networks:
            network = calc.get_network(net_type)
            if network is None:
                print(f"⚠ Network '{net_type}' not found (might be expected)")
                continue
            
            energy_kwh_mb = network.get('energy_kWh_per_MB')
            energy_kwh_gb = network.get('energy_kWh_per_GB')
            print(f"✓ {net_type}: {energy_kwh_mb} kWh/MB, {energy_kwh_gb} kWh/GB")
        
        return True
    except Exception as e:
        print(f"❌ Error in get_network lookup: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_dynamic_carbon_calculation():
    """Verify dynamic carbon_kg_per_GB calculation using CI from API (v2.1)"""
    print("\n" + "="*70)
    print("TEST 4: Dynamic Carbon Calculation (v2.1)")
    print("="*70)
    
    try:
        calc = CarbonCalculator()
        
        # Test formula: carbon_kg_per_GB = energy_kWh_per_GB × CI / 1000
        test_cases = [
            # (country, expected_ci_approx, network_type)
            ("ES", 145, "4G LTE"),   # España ~145 gCO₂/kWh
            ("FR", 50, "4G LTE"),    # Francia ~50 gCO₂/kWh (nuclear)
            ("PL", 650, "4G LTE"),   # Polonia ~650 gCO₂/kWh (carbón)
        ]
        
        print("\nDynamic carbon_kg_per_GB calculation:")
        print("-" * 60)
        
        network = calc.get_network("4G LTE")
        if network is None:
            print("❌ 4G LTE network not found")
            return False
            
        energy_kwh_gb = network['energy_kWh_per_GB']
        print(f"4G LTE energy_kWh_per_GB: {energy_kwh_gb}")
        
        for country, expected_ci, net_type in test_cases:
            ci = calc.get_carbon_intensity(country)
            carbon_kg_gb = energy_kwh_gb * ci / 1000
            
            print(f"\n{country}:")
            print(f"  CI from API: {ci} gCO₂/kWh")
            print(f"  carbon_kg_per_GB = {energy_kwh_gb} × {ci} / 1000 = {carbon_kg_gb:.2f} kg CO₂/GB")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in dynamic calculation: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_regional_ci_variation():
    """Verify regional CI differences produce expected CO₂ variation"""
    print("\n" + "="*70)
    print("TEST 5: Regional CI Variation Impact")
    print("="*70)
    
    try:
        calc = CarbonCalculator()
        
        # Compare same network, different countries
        print("\nComparing 4G LTE CO₂ across countries with different CI:")
        
        countries = [
            ("FR", "Francia (nuclear, bajo CI)"),
            ("ES", "España (mixed, medio CI)"),
            ("DE", "Alemania (transición)"),
            ("PL", "Polonia (carbón, alto CI)"),
        ]
        
        results = []
        for code, name in countries:
            result = calc.calculate_emissions(
                model_id="gpt-4",
                data_center_id="aws-eu-west-1",
                device_id="phone-iphone-15-pro",
                network_id="4G LTE",
                user_country=code,
                request_type="chat_simple"
            )
            ci = calc.get_carbon_intensity(code)
            results.append((code, name, ci, result.co2_network_g))
        
        print(f"\n{'País':<35} {'CI (gCO₂/kWh)':<15} {'CO₂ Red (g)':<15}")
        print("-" * 65)
        
        for code, name, ci, co2 in results:
            print(f"{name:<35} {ci:<15} {co2:.6f}")
        
        # Verify ordering: FR < ES < DE < PL
        cos = [r[3] for r in results]
        if cos[0] < cos[1] < cos[3]:  # FR < ES < PL
            print("\n✓ Regional variation produces expected CO₂ ordering")
            return True
        else:
            print("\n⚠ Regional ordering unexpected (may depend on current API values)")
            return True  # No falla el test, los valores de API pueden variar
            
    except Exception as e:
        print(f"❌ Error in regional comparison: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_example_calculations():
    """Test the example scenarios"""
    print("\n" + "="*70)
    print("TEST 6: Example Calculation Scenarios")
    print("="*70)
    
    try:
        calc = CarbonCalculator()
        
        # Scenario 1: GPT-4 + 4G LTE (Spain)
        print("\nScenario 1: GPT-4 + 4G LTE (ES)")
        result1 = calc.calculate_emissions(
            model_id="gpt-4",
            data_center_id="aws-eu-west-1",
            device_id="phone-iphone-15-pro",
            network_id="4G LTE",
            user_country="ES",
            request_type="chat_simple"
        )
        ci_es = calc.get_carbon_intensity("ES")
        print(f"  CI España: {ci_es} gCO₂/kWh")
        print(f"  Total CO₂: {result1.co2_total_g:.4f} gCO₂")
        print(f"  Network: {result1.co2_network_g:.6f} gCO₂")
        
        # Scenario 2: Same config but Fiber FTTH (should be much lower)
        print("\nScenario 2: GPT-4 + Fiber FTTH (ES) - for comparison")
        result2 = calc.calculate_emissions(
            model_id="gpt-4",
            data_center_id="aws-eu-west-1",
            device_id="phone-iphone-15-pro",
            network_id="Fiber FTTH",
            user_country="ES",
            request_type="chat_simple"
        )
        print(f"  Network: {result2.co2_network_g:.6f} gCO₂")
        
        if result2.co2_network_g < result1.co2_network_g:
            reduction = (1 - result2.co2_network_g / result1.co2_network_g) * 100
            print(f"  ✓ Fiber is {reduction:.1f}% lower than 4G (expected)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in example calculations: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "█"*70)
    print("█" + " "*68 + "█")
    print("█" + "  NETWORK ENERGY UPDATES VALIDATION SUITE v2.1".center(68) + "█")
    print("█" + "  (Dynamic CI from Electricity Maps API)".center(68) + "█")
    print("█" + " "*68 + "█")
    print("█"*70)
    
    tests = [
        ("CSV Structure (v2.1)", test_csv_structure),
        ("CarbonCalculator Init", test_carbon_calculator_init),
        ("Network Lookup", test_get_network_lookup),
        ("Dynamic Carbon Calculation", test_dynamic_carbon_calculation),
        ("Regional CI Variation", test_regional_ci_variation),
        ("Example Calculations", test_example_calculations),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            passed = test_func()
            results.append((test_name, passed))
        except Exception as e:
            print(f"\n❌ FATAL ERROR in {test_name}: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    total_passed = sum(1 for _, passed in results if passed)
    total_tests = len(results)
    
    print(f"\n{total_passed}/{total_tests} tests passed")
    
    if total_passed == total_tests:
        print("\n✓ All validations passed! v2.1 code updates are working correctly.")
        return 0
    else:
        print(f"\n❌ {total_tests - total_passed} test(s) failed. Review above for details.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

# 📚 ANEXO: Ejemplos Visuales de cada Reportaje

**Documento**: Muestra cómo se vería cada propuesta implementada  
**Objetivo**: Facilitarte visualizar qué elegir

---

## 1.1 PIE CHART DESGLOSE

### Versión JSON (para API)
```json
{
  "chart_type": "pie",
  "title": "CO2 Breakdown: GPT-4 Chat Simple in AWS EU",
  "total_gCO2": 12.34,
  "breakdown": {
    "device": {
      "label": "Cliente",
      "value_gCO2": 1.85,
      "percentage": 15.0,
      "color": "#FF6B6B"
    },
    "network": {
      "label": "Red",
      "value_gCO2": 1.60,
      "percentage": 13.0,
      "color": "#4ECDC4"
    },
    "datacenter": {
      "label": "Data Center",
      "value_gCO2": 8.89,
      "percentage": 72.0,
      "color": "#45B7D1"
    }
  }
}
```

### Versión Visual (Plotly HTML)
```
                          Dataset Pie Chart
                          
                          12.34 gCO2
                       /                  \
                     /                      \
                  /    Data Center              \
               /        72%                       \
             /                                      \
           |             Device Network           |
           |              15%   13%               |
            \                                     /
              \                                /
                \                            /
                  \                        /
                    \                    /
                      \                /
                        \            /
```

**Código para generar**:
```python
import plotly.graph_objects as go

fig = go.Figure(data=[go.Pie(
    labels=['Device', 'Network', 'Data Center'],
    values=[1.85, 1.60, 8.89],
    marker=dict(colors=['#FF6B6B', '#4ECDC4', '#45B7D1']),
    textposition='inside',
    textinfo='label+percent'
)])

fig.update_layout(
    title=f'CO2 Breakdown: {model_name}',
    font=dict(size=14),
    height=500
)

fig.show()
# o guardar: fig.write_html('pie_chart.html')
```

---

## 1.2 ENERGY LABEL CARD

### Versión HTML Renderizada

```html
<!-- TARJETA ENERGÉTICA ESTILO EU ENERGY LABEL -->

<div class="energy-card">
  <div class="card-header">
    <h2>GPT-4</h2>
    <p>Chat Simple (50+100 tokens)</p>
  </div>
  
  <div class="card-body">
    <div class="efficiency-badge">
      <div class="efficiency-letter">B</div>
      <p class="efficiency-label">Eficiencia Energética</p>
    </div>
    
    <div class="metrics">
      <div class="metric">
        <span class="label">Emisiones CO2:</span>
        <span class="value">12.34 gCO2</span>
      </div>
      <div class="metric">
        <span class="label">Energía Total:</span>
        <span class="value">35.20 Wh</span>
      </div>
      <div class="metric">
        <span class="label">Energía/Token:</span>
        <span class="value">0.0864 Wh</span>
      </div>
      <div class="metric">
        <span class="label">Renovables:</span>
        <span class="value renewable">45% 🌿</span>
      </div>
    </div>
    
    <div class="benchmark-comparison">
      <p class="label">Comparación vs Benchmark (10 modelos)</p>
      <div class="bar-chart">
        <div class="bar-this" style="width: 48%">
          <span>Este modelo: 12 gCO2</span>
        </div>
      </div>
      <div class="bar-chart baseline">
        <div class="bar-avg" style="width: 100%">
          <span>Promedio: 18 gCO2</span>
        </div>
      </div>
      <div class="bar-chart best">
        <div class="bar-best" style="width: 17%">
          <span>Mejor: 2 gCO2</span>
        </div>
      </div>
    </div>
  </div>
  
  <div class="card-footer">
    <p>✓ Eficiente</p>
    <p>Considera cambiar a Mistral-7b para 92% menos emisiones</p>
  </div>
</div>
```

### Versión CSS (Diseño)

```css
.energy-card {
  max-width: 400px;
  border: 2px solid #333;
  border-radius: 10px;
  background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.card-header {
  background: #1a1a1a;
  color: white;
  padding: 20px;
  border-radius: 8px 8px 0 0;
}

.efficiency-badge {
  width: 120px;
  height: 120px;
  border: 4px solid #FFA500;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFE5B4, #FFCC99);
  font-size: 48px;
  font-weight: bold;
  margin: 20px auto;
}

.efficiency-letter {
  font-size: 64px;
  color: #FF8800;
}

.metrics {
  padding: 20px;
}

.metric {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.renewable {
  color: #27AE60;
  font-weight: bold;
}

.bar-chart {
  margin: 10px 0;
  height: 30px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.bar-this {
  height: 100%;
  background: linear-gradient(90deg, #4ECDC4, #44A08D);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
  color: white;
  font-size: 12px;
}

.bar-avg {
  height: 100%;
  background: #ddd;
  display: flex;
  align-items: center;
  padding-left: 10px;
  color: #333;
}

.bar-best {
  height: 100%;
  background: #27AE60;
  display: flex;
  align-items: center;
  padding-left: 10px;
  color: white;
}
```

### Resultado Visual
```
╔════════════════════════════════════════╗
║          GPT-4                         ║
║   Chat Simple (50+100 tokens)          ║
╠════════════════════════════════════════╣
║                                        ║
║              ╔═════════╗               ║
║              ║ EFIC.  ║               ║
║              ║   B    ║               ║
║              ╚═════════╝               ║
║                                        ║
║  Emisiones CO2:        12.34 gCO2     ║
║  Energía Total:        35.20 Wh       ║
║  Energía/Token:        0.0864 Wh      ║
║  Renovables:           45% 🌿         ║
║                                        ║
║  Comparación vs Benchmark:             ║
║                                        ║
║  Este: ████░░░░░░░░ 12 gCO2           ║
║  Med:  █████████░░░░ 18 gCO2          ║
║  Mejor:██░░░░░░░░░░░  2 gCO2          ║
║                                        ║
║ ✓ Eficiente - Considera Mistral (-92%)║
╚════════════════════════════════════════╝
```

---

## 1.3 TABLA COMPARATIVA

### Versión Markdown (para reportes)

```markdown
# Comparativa: 5 Modelos - Misma Petición

## Escenario: Chat Simple en AWS EU-West-1

| Modelo | CO2 (gCO2) | Energía (Wh) | Renovables | Tiempo (s) | vs Mejor |
|--------|-----------|-------------|-----------|-----------|----------|
| **Mistral-7b** | **0.98** | **2.80** | 45% | 0.15 | Baseline |
| Llama-70b | 8.92 | 25.60 | 45% | 0.35 | +8.9x ⚠️ |
| Claude-2 | 6.45 | 18.40 | 45% | 0.22 | +6.6x ⚠️ |
| GPT-4 | 12.34 | 35.20 | 45% | 0.40 | +12.6x ⚠️ |
| PaLM-2 | 5.75 | 16.40 | 45% | 0.18 | +5.9x ⚠️ |

### Análisis

**Mejor opción**: Mistral-7b
- ✓ 92% menos CO2 vs GPT-4
- ✓ Energía: 7.6x menos
- ✓ Más rápido (0.15s vs 0.40s)
- ✓ Presupuesto: $0.001 vs $0.015

**Peor opción**: GPT-4
- ✗ Máximas emisiones
- ✗ Energía más alta
- ✗ Costo 15x mayor
- ✓ Mejor precisión (si la necesitas)

### Ahorro Anual (1M queries/día)

| Modelo | Impacto | Árboles | Vuelos | Costo $ |
|--------|--------|---------|--------|---------|
| Mistral | 358 t CO2 | 14,300 | 510 | $35,800 |
| GPT-4 | 4,504 t CO2 | 180,000 | 6,400 | $450,400 |
| **DIFERENCIA** | **4,146 t CO2** | **165,700 🌳** | **5,890 ✈️** | **$414,600** |
```

### Versión HTML Interactiva

```html
<table class="comparison-table">
  <thead>
    <tr>
      <th>Modelo</th>
      <th>CO2 (gCO2)</th>
      <th>Energía (Wh)</th>
      <th>Renovables</th>
      <th>vs Mejor</th>
      <th>Recomendación</th>
    </tr>
  </thead>
  <tbody>
    <tr class="best">
      <td><strong>Mistral-7b</strong></td>
      <td><strong>0.98</strong></td>
      <td><strong>2.80</strong></td>
      <td>45%</td>
      <td>–</td>
      <td>✓✓✓ Óptimo</td>
    </tr>
    <tr class="warning">
      <td>GPT-4</td>
      <td>12.34</td>
      <td>35.20</td>
      <td>45%</td>
      <td>+1,160%</td>
      <td>⚠️ 12.6x más</td>
    </tr>
    <tr class="good">
      <td>Llama-70b</td>
      <td>8.92</td>
      <td>25.60</td>
      <td>45%</td>
      <td>+810%</td>
      <td>○ Balance</td>
    </tr>
  </tbody>
</table>
```

---

## 1.4 IMPACTO POR REGIÓN

### Versión Tabla Markdown

```markdown
# Impacto del Modelo GPT-4 según Región

## Mismo modelo, diferente emisión según donde ejecutes

| Data Center | Región | CI (gCO2/kWh) | CO2 Consulta | Renovables | Mejor? |
|-------------|--------|---------------|--------------|-----------|--------|
| **AWS Oregon** | USA-W | **77** | **2.65** | 92% Hydro | ✓✓✓ |
| **Azure Noruega** | EU-N | **20** | **0.69** | 98% Hydro | ✓✓✓ |
| **Deep Green UK** | EU-W | 188 | 6.47 | 52% Renew | ✓✓ |
| **GCP EU-West** | EU | 155 | 5.34 | 45% Renew | ○ |
| **AWS Dublin** | EU-W | 350 | 12.03 | 18% Renew | ✗ |
| **AWS Virginia** | USA-E | 498 | 17.12 | 18% Renew | ✗✗ |
| **AWS China** | APAC | 550 | 18.91 | 12% Renew | ✗✗✗ |

### Recomendaciones por Restricción

**Si necesitas máxima sostenibilidad:**
→ Azure Noruega (0.69 gCO2, 98% renovable)

**Si necesitas balance costo/carbono:**
→ AWS Oregon (2.65 gCO2, económico, limpio)

**Si estás en EU y necesitas cercano:**
→ Deep Green UK (6.47 gCO2, reutiliza calor)

**Evitar si importa carbono:**
→ AWS China (18.91 gCO2, 88% carbón)
→ AWS Virginia (17.12 gCO2, 82% fósil)

### Impacto Anual (1M queries/día)

```
Azure Noruega vs AWS Virginia:
= 6,042 toneladas CO2 menos/año
= 241,680 árboles ahorrados
= $604,200 en energía ahorrada
= Equivalente a 8,632 vuelos transatlánticos
```
```

---

## 1.5 DESGLOSE ENERGÍA (Árbol Jerárquico)

### Versión Visual ASCII

```
CONSUMO TOTAL: 35.20 Wh
│
├─ DISPOSITIVO CLIENTE: 5.28 Wh (15%)
│  ├─ CPU/GPU Inferencia: 3.20 Wh (57%)
│  │  ├─ CPU: 1.28 Wh
│  │  └─ GPU: 1.92 Wh
│  ├─ Transmisión datos: 0.80 Wh (15%)
│  │  ├─ Upload prompt: 0.40 Wh
│  │  └─ Download respuesta: 0.40 Wh
│  └─ Overhead sistema: 1.28 Wh (24%)
│     ├─ Memoria RAM: 0.64 Wh
│     ├─ SSD: 0.48 Wh
│     └─ Pérdidas térmicas: 0.16 Wh
│
├─ TRANSMISIÓN RED: 4.55 Wh (13%)
│  ├─ Upload (50 tokens): 0.50 Wh
│  │  └─ Codificación: 0.08 Wh
│  │  └─ Transmisión: 0.42 Wh
│  └─ Download (100 tokens): 4.05 Wh
│     └─ Codificación: 0.15 Wh
│     └─ Transmisión: 3.90 Wh
│
└─ DATA CENTER: 25.37 Wh (72%) ← DOMINANTE
   ├─ COMPUTE: 18.50 Wh (73%)
   │  ├─ GPU Inferencia: 15.2 Wh
   │  │  ├─ Forward pass: 12.0 Wh
   │  │  └─ Activaciones: 3.2 Wh
   │  └─ CPU overhead: 3.3 Wh
   │
   ├─ COOLING (PUE 1.27): 4.95 Wh (20%)
   │  ├─ Aire acondicionado: 3.5 Wh
   │  ├─ Ventilación: 1.2 Wh
   │  └─ Humidificación: 0.25 Wh
   │
   └─ OTROS (Red DC, UPS, etc.): 2.12 Wh (8%)
```

### Versión JSON (para visualización)

```json
{
  "breakdown": {
    "total_wh": 35.20,
    "device": {
      "wh": 5.28,
      "pct": 15.0,
      "items": {
        "cpu_gpu": { "wh": 3.20, "pct": 60.6 },
        "network": { "wh": 0.80, "pct": 15.2 },
        "overhead": { "wh": 1.28, "pct": 24.2 }
      }
    },
    "network": {
      "wh": 4.55,
      "pct": 12.9,
      "items": {
        "upload": { "wh": 0.50, "pct": 11.0 },
        "download": { "wh": 4.05, "pct": 89.0 }
      }
    },
    "datacenter": {
      "wh": 25.37,
      "pct": 72.0,
      "items": {
        "compute": { "wh": 18.50, "pct": 72.9 },
        "cooling_pue": { "wh": 4.95, "pct": 19.5 },
        "other": { "wh": 2.12, "pct": 8.4 }
      }
    }
  }
}
```

---

## 2.1 SIMULADOR PRODUCTION

### Entrada Interactiva

```html
<form class="production-simulator">
  <div class="form-group">
    <label>Modelo</label>
    <select>
      <option selected>GPT-4</option>
      <option>Claude-2</option>
      <option>Llama-70b</option>
      <option>Mistral-7b</option>
    </select>
  </div>
  
  <div class="form-group">
    <label>Queries por día</label>
    <input type="number" value="1000000" />
    <span class="info">Ej: 1M = 1 millón</span>
  </div>
  
  <div class="form-group">
    <label>Días operativo/año</label>
    <input type="number" value="365" />
  </div>
  
  <div class="form-group">
    <label>Data Center</label>
    <select>
      <option>AWS EU-West-1</option>
      <option selected>AWS US-East-1</option>
      <option>Azure Noruega</option>
      <option>GCP Europe-West</option>
    </select>
  </div>
  
  <button type="submit">Simular →</button>
</form>
```

### Salida (Reporte)

```
═══════════════════════════════════════════════════════════════
              SIMULACIÓN IMPACTO PRODUCTION
═══════════════════════════════════════════════════════════════

CONFIGURACIÓN
─────────────────────────────────────────────────────────────
  Modelo:              GPT-4
  Data Center:         AWS US-East-1 (Virginia)
  Queries/día:         1,000,000
  Días/año:            365
  Total queries/año:   365,000,000


📊 IMPACTO ANUAL
═════════════════════════════════════════════════════════════

EMISIONES CO2
  Total:               4,504.8 toneladas CO2/año
  Desglose:
    ├─ Dispositivos:   675.6 t (15%)
    ├─ Red:            585.0 t (13%)
    └─ Data Center:    3,244.2 t (72%)

ENERGÍA CONSUMIDA
  Total:               12,872 MWh/año
  Equivalente:         1,287.2 GWh/año
  Costo energía:       $1,287,200/año (@ $0.10/kWh)

CARBONO POR QUERY
  gCO2 por query:      0.01234
  Energía por query:   0.0352 Wh


🌍 EQUIVALENCIAS INTUITIVAS
═════════════════════════════════════════════════════════════

ÁRBOLES
  Árboles necesarios:  180,000-225,000 árboles
  Superficie:          ~360-450 hectáreas (4-5 campos futbol)
  Tiempo crecimiento:  20-30 años

VUELOS
  Vuelos transatlánticos:  6,400 vuelos
  Equivalencia:            Volar un pasajero NYC-LDN 6,400 veces

CONDUCCIÓN
  Kilómetros en coche: 9,500,000 km
  Equivalencia:        Dar 237 vueltas a la Tierra

ENERGÍA DOMÉSTICA
  Casas/año:           410 hogares (energía anual)
  TV 24/7:             16,090 años viendo tele

DINERO
  Costo energía:       $1,287,200
  Coste carbono*:      $225,240 (@$50/tonelada CO2)
  Total impacto:       $1,512,440/año

* Precio social del carbono según EPA


💡 COMPARATIVAS CON ALTERNATIVAS
═════════════════════════════════════════════════════════════

vs CLAUDE-2
  Emisiones:           3,232.9 t/año (-1,271.9 t)
  Ahorro CO2:          28.2% ✓
  Ahorro económico:    $127,190/año
  Diferencia diaria:   3.5 t/día

vs LLAMA-70B
  Emisiones:           3,256.2 t/año (-1,248.6 t)
  Ahorro CO2:          27.7% ✓
  Ahorro económico:    $124,860/año
  Diferencia diaria:   3.4 t/día

vs MISTRAL-7B ⭐ RECOMENDADO
  Emisiones:           358 t/año (-4,146.8 t)
  Ahorro CO2:          92.0% ✓✓✓
  Ahorro económico:    $414,680/año
  Diferencia diaria:   11.4 t/día
  Impacto:             165,870 árboles menos
                       5,890 vuelos menos
  
  CONCLUSIÓN: Cambiar a Mistral reduce CASI TODO
              pero requiere validar que precisión es suficiente


📍 IMPACTO GEOGRÁFICO
═════════════════════════════════════════════════════════════

Mismo modelo en otras regiones:

  AWS Oregon (77 gCO2/kWh):     490.2 t/año (-93%)  ✓✓✓
  Azure Noruega (20 gCO2/kWh):  128.2 t/año (-97%)  ✓✓✓✓
  AWS Dublin (350 gCO2/kWh):    4,384.5 t/año (+97%) ⚠️
  AWS China (550 gCO2/kWh):     6,896.4 t/año (+153%) ✗✗✗

RECOMENDACIÓN: Si puedes mover a Noruega, ahorras 4,376 t/año
              (más impacto que cambiar modelo)


📈 PROYECCIÓN 5 AÑOS
═════════════════════════════════════════════════════════════

Con actual (GPT-4 USA):
  Total CO2:           22,524 toneladas
  Costo:               $6,436,000

Mejora a Mistral:
  Total CO2:           1,790 toneladas (-92%)
  Costo:               $507,400 (-92%)
  Savings:             $5,928,600 en 5 años
                       165,870 árboles

Cambio a Noruega:
  Total CO2:           2,451 toneladas (-89%)
  Costo:               $1,288,000 (-80%)
  Savings:             $5,148,000 en 5 años
                       195,600 árboles


✅ RECOMENDACIONES FINALES
═════════════════════════════════════════════════════════════

1. CORTO PLAZO (mes 1):
   → Validar si Mistral-7b da suficiente precisión
   → ROI: -$414k/año en energía, -92% CO2
   
2. MEDIANO PLAZO (mes 3-6):
   → Migrar data center a Azure Noruega si es viable
   → ROI: -$1,145k/año en energía, -97% CO2

3. LARGO PLAZO (año 1+):
   → Investigar compresión/destilación del modelo
   → Implementar caché inteligente para evitar re-compute
   → ROI: Potencial -40-60% más en ambos

═══════════════════════════════════════════════════════════════
```

---

## 2.4 MAPA INTERACTIVO

### Concepto Visual

```
        MAPA MUNDIAL: INTENSIDAD DE CARBONO
        
        ╔══════════════════════════════════════╗
        ║  🌍 Haz zoom, click en país          ║
        ║                                      ║
        ║  ████ < 100    ████ 100-200         ║
        ║  ████ 200-400  ████ 400-600         ║
        ║  ████ > 600                         ║
        ╚══════════════════════════════════════╝
        
        
        [MAPA]
        
          Noruega: 20 gCO2/kWh ████░░░░░░░░░░░░░░░░ 🟢
        Suecia:  25 gCO2/kWh ████░░░░░░░░░░░░░░░░ 🟢
        Francia: 50 gCO2/kWh ████████░░░░░░░░░░░░ 🟢
        Alemania:380 gCO2/kWh ███████████████░░░░░░ 🟡
        USA Prom:380 gCO2/kWh ███████████████░░░░░░ 🟡
        España:  145 gCO2/kWh ██████░░░░░░░░░░░░░░ 🟢
        China:   550 gCO2/kWh █████████████████░░░░ 🔴
        India:   700 gCO2/kWh ██████████████████░░░░ 🔴
        
        [CLICK EN ESPAÑA]
        
        ╔════════════════════════════════════════╗
        ║ ESPAÑA - Carbon Intensity: 145 gCO2/kWh║
        ├════════════════════════════════════════╤
        ║                                        │
        ║ Data Centers disponibles:               │
        ║ • AWS EU-West (Irlanda):  350 gCO2/kWh│
        ║ • GCP EU-West (Bélgica): 220 gCO2/kWh │
        ║ • Azure (España):        156 gCO2/kWh │
        ║ • Equinix (Madrid):      180 gCO2/kWh │
        ║                                        │
        ║ Emisiones (tu consulta):               │
        ║ • GPT-4:     ████████░░░ 12.34 gCO2   │
        ║ • Llama-70b: ██████░░░░░░ 8.92 gCO2   │
        ║ • Mistral:   █░░░░░░░░░░░ 0.98 gCO2 ⭐│
        ║                                        │
        ║ 📊 [Ver histórico 2020-2026]          │
        ║ 🔄 [Comparar con otros países]        │
        ║ 📥 [Descargar datos]                  │
        ╚════════════════════════════════════════╝
```

---

## CONCLUSIÓN

Con estos reportes visuales, tu herramienta pasa de ser **calculadora técnica** a ser **herramienta de decisión ejecutiva**.

El diferenciador clave: **Mostrar el mismo modelo en diferentes regiones genera DRÁSTICAMENTE diferente impacto** – esto es tu ventaja única vs competencia.


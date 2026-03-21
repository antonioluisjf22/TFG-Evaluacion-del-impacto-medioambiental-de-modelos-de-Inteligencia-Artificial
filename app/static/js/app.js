/* ============================================================
   Calculadora de Carbono de IA — Frontend v2
   Chart.js · CountUp · Lucide · Glassmorphism
   ============================================================ */

(function () {
    "use strict";

    // ------------------------------------------------------------------
    // Estado global
    // ------------------------------------------------------------------
    let OPTIONS = {};
    let LAST_RESULT = null;
    let LAST_PARAMS = null;
    let pieChart = null, barChart = null, compChart = null, projChart = null;

    // CountUp helper — lazy because script is deferred
    function getCountUp() {
        return window.countUp ? window.countUp.CountUp : null;
    }

    function animateValue(el, end, decimals, duration) {
        if (!el) return;
        const CU = getCountUp();
        if (CU) {
            const cu = new CU(el, end, { duration: duration || 2, decimalPlaces: decimals || 0, separator: '.', decimal: ',' });
            cu.start();
        } else {
            el.textContent = typeof end === 'number' ? end.toFixed(decimals || 0) : end;
        }
    }

    // ------------------------------------------------------------------
    // Chart.js global config (lazy — Chart.js is deferred)
    // ------------------------------------------------------------------
    function initChartDefaults() {
        if (!window.Chart) return;
        Chart.defaults.color = '#94a3b1';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.92)';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 13 };
        Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
    }

    // ------------------------------------------------------------------
    // Init
    // ------------------------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        initTabs();
        initForm();
        loadOptions();
        initMap();
        if (window.lucide) lucide.createIcons();

        // Wire up "Cargar ejemplo" button
        const btnEx = document.getElementById("btn-load-example");
        if (btnEx) btnEx.addEventListener("click", loadExample);
    });

    // ------------------------------------------------------------------
    // TABS
    // ------------------------------------------------------------------
    function initTabs() {
        document.querySelectorAll(".tab-button").forEach(btn => {
            btn.addEventListener("click", () => {
                const tabId = btn.dataset.tab;
                document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
                document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
                btn.classList.add("active");
                const target = document.getElementById("tab-" + tabId);
                if (target) target.classList.add("active");
                // Scroll to the top of the tab
                window.scrollTo({ top: 0, behavior: "instant" });
                // Re-render icons in newly visible tab
                if (window.lucide) setTimeout(() => lucide.createIcons(), 50);
            });
        });
    }

    // ------------------------------------------------------------------
    // FORM
    // ------------------------------------------------------------------
    function initForm() {
        const slider = document.getElementById("utilization");
        if (slider) {
            slider.addEventListener("input", () => {
                const pct = slider.value;
                const displayDiv = document.getElementById("utilization-display");
                if (displayDiv) displayDiv.textContent = pct;
                const formulaDiv = document.getElementById("utilization-formula");
                if (formulaDiv) {
                    formulaDiv.innerHTML = `U = ${pct}% — Fórmula: P_real = P_idle + (P_max - P_idle) × <strong>${pct / 100}</strong>`;
                }
            });
        }

        const form = document.getElementById("calc-form");
        if (form) form.addEventListener("submit", e => { e.preventDefault(); doCalculate(); });

        const btnSim = document.getElementById("btn-simulate");
        if (btnSim) btnSim.addEventListener("click", doSimulate);

        // Thousands formatting for queries input
        const qInput = document.getElementById("queries_per_day");
        if (qInput) {
            qInput.addEventListener("input", () => {
                const raw = qInput.value.replace(/\./g, '').replace(/[^\d]/g, '');
                if (raw) qInput.value = parseInt(raw).toLocaleString('es-ES');
            });
        }

        // Stepper logic
        initStepper();
    }

    function initStepper() {
        // 8-step stepper: each step maps to a field via data-field attribute
        const steps = document.querySelectorAll('.stepper-step[data-field]');
        const lines = document.querySelectorAll('.stepper-line');
        if (!steps.length) return;

        function updateStepper() {
            steps.forEach((step, i) => {
                const fieldId = step.dataset.field;
                const el = document.getElementById(fieldId);
                if (!el) return;
                const filled = fieldId === 'utilization'
                    ? parseInt(el.value) > 0
                    : el.value !== '';
                step.classList.toggle('done', filled);
                // Fill the line BEFORE this step (line index = step index - 1)
                if (i > 0 && lines[i - 1]) {
                    lines[i - 1].classList.toggle('filled', filled);
                }
            });
            // Mark focused field step as active
            steps.forEach(s => s.classList.remove('active'));
            const focused = document.activeElement;
            if (focused) {
                const fieldId = focused.id;
                const matchStep = document.querySelector(`.stepper-step[data-field="${fieldId}"]`);
                if (matchStep) matchStep.classList.add('active');
            }
        }

        document.querySelectorAll('#calc-form select, #calc-form input').forEach(el => {
            el.addEventListener('change', updateStepper);
            el.addEventListener('focus', updateStepper);
            el.addEventListener('input', updateStepper);
        });

        // Initial state
        updateStepper();
    }

    // ------------------------------------------------------------------
    // Load example data
    // ------------------------------------------------------------------
    function loadExample() {
        if (!OPTIONS.models || !OPTIONS.models.length) {
            showError("Espera a que carguen los catálogos antes de cargar el ejemplo.");
            return;
        }

        // Pick example values
        const exModel = OPTIONS.models.find(m => /claude.*3.*5.*sonnet/i.test(m.model_name || m.model_id))
            || OPTIONS.models.find(m => /gpt.*4o.*mini/i.test(m.model_name || m.model_id))
            || OPTIONS.models[0];
        const exRT = (OPTIONS.request_types || []).find(r => r.id === 'code_generation')
            || (OPTIONS.request_types || [])[0];
        const exDC = (OPTIONS.data_centers || []).find(d => /gcp.*europe/i.test(d.dc_id))
            || (OPTIONS.data_centers || [])[0];
        const exDev = (OPTIONS.devices || []).find(d => /macbook/i.test(d.device_name || ''))
            || (OPTIONS.devices || [])[0];
        const exNet = (OPTIONS.networks || []).find(n => n.network_type.toLowerCase().includes('fiber'))
            || (OPTIONS.networks || [])[0];
        const exCountry = (OPTIONS.countries || []).find(c => c.code === 'ES')
            || (OPTIONS.countries || [])[0];

        function setVal(id, val) {
            const el = document.getElementById(id);
            if (el && val != null) { el.value = val; el.dispatchEvent(new Event('change', {bubbles: true})); }
        }

        setVal('model_id', exModel?.model_id);
        setVal('request_type', exRT?.id);
        setVal('data_center_id', exDC?.dc_id);
        setVal('device_id', exDev?.device_id);
        setVal('inference_processor', 'auto');
        setVal('network_id', exNet?.network_type);
        setVal('user_country', exCountry?.code);

        // Set utilization slider to 70%
        const slider = document.getElementById('utilization');
        if (slider) { slider.value = 70; slider.dispatchEvent(new Event('input', {bubbles: true})); }

        // Visual feedback on button
        const btn = document.getElementById('btn-load-example');
        if (btn) {
            btn.classList.add('loaded');
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Ejemplo cargado';
            setTimeout(() => {
                btn.classList.remove('loaded');
                btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Cargar ejemplo';
            }, 2500);
        }
    }

    // ------------------------------------------------------------------
    // Load options
    // ------------------------------------------------------------------
    async function loadOptions() {
        try {
            const resp = await fetch("/api/options");
            if (!resp.ok) throw new Error("Error cargando opciones");
            OPTIONS = await resp.json();
            populateSelectors();
            // Remover clase shimmer del botón de calcular una vez cargado
            const btn = document.getElementById("btn-calculate");
            if (btn) btn.classList.remove("shimmer");
        } catch (err) {
            console.error("Error cargando opciones:", err);
            showError("No se pudieron cargar los catálogos. ¿Está el servidor activo?");
        }
    }

    function populateSelectors() {
        fillSelect("model_id", OPTIONS.models || [], item =>
            `${item.model_name || item.model_id} (${item.organization || "?"})`,
            item => item.model_id
        );
        document.getElementById("model_id")?.addEventListener("change", e => {
            const m = (OPTIONS.models || []).find(x => x.model_id === e.target.value);
            showInfo("model-info", m ? [
                `<strong>${fmtVal(m.num_parameters)}T params</strong>`,
                `${fmtVal(m.energy_wh_per_1k_tokens)} Wh/1k tokens`,
                m.tokens_per_second ? `${fmtVal(m.tokens_per_second)} tok/s` : null,
                m.context_window ? `Contexto: ${Number(m.context_window).toLocaleString("es-ES")} tokens` : null,
            ] : null);
        });

        fillSelect("request_type", OPTIONS.request_types || [], item =>
            `${formatRequestType(item.id)} (${item.tokens_input}+${item.tokens_output} tokens)`,
            item => item.id, true
        );
        document.getElementById("request_type")?.addEventListener("change", e => {
            const rt = (OPTIONS.request_types || []).find(x => x.id === e.target.value);
            showInfo("tokens-info", rt ? [
                `Input: <strong>${rt.tokens_input}</strong> tokens`,
                `Output: <strong>${rt.tokens_output}</strong> tokens`,
                `Total: <strong>${rt.tokens_input + rt.tokens_output}</strong> tokens`,
            ] : null);
        });

        fillSelect("data_center_id", OPTIONS.data_centers || [], item =>
            `${item.provider_name || ""} — ${item.region || ""} (PUE ${fmtVal(item.pue) || "?"})`,
            item => item.dc_id
        );
        document.getElementById("data_center_id")?.addEventListener("change", e => {
            const dc = (OPTIONS.data_centers || []).find(x => x.dc_id === e.target.value);
            showInfo("dc-info", dc ? [
                `PUE: <strong>${fmtVal(dc.pue)}</strong>`,
                `Proveedor: ${dc.provider_name || "?"}`,
                `País: ${dc.country_code || "?"}`,
            ] : null);
        });

        fillSelect("device_id", OPTIONS.devices || [], item =>
            `${item.device_name || item.device_id} [${item.device_type || ""}]`,
            item => item.device_id
        );
        document.getElementById("device_id")?.addEventListener("change", e => {
            updateDeviceInfo(e.target.value);
        });

        document.getElementById("inference_processor")?.addEventListener("change", () => {
            const devId = document.getElementById("device_id")?.value;
            updateDeviceInfo(devId);
        });

        fillSelect("network_id", OPTIONS.networks || [], item =>
            `${item.network_type}`,
            item => item.network_type
        );

        fillSelect("user_country", OPTIONS.countries || [], item =>
            `${countryName(item.code)} — ${item.carbon_intensity != null ? item.carbon_intensity + ' gCO₂/kWh' : 'N/D'}`,
            item => item.code, true
        );

        // Do NOT auto-select first items — fields start empty
    }

    function updateDeviceInfo(devId) {
        const dev = (OPTIONS.devices || []).find(x => x.device_id === devId);
        if (!dev) { showInfo("device-info", null); showInfo("proc-info", null); return; }
        const procSel = document.getElementById("inference_processor")?.value || "auto";
        const parts = [];
        if (dev.inference_cpu_watts) parts.push(`CPU: ${fmtVal(dev.inference_cpu_watts)}W`);
        if (dev.inference_gpu_watts) parts.push(`GPU: ${fmtVal(dev.inference_gpu_watts)}W`);
        if (dev.inference_npu_watts) parts.push(`NPU: ${fmtVal(dev.inference_npu_watts)}W`);
        if (dev.primary_inference_target) parts.push(`Primario: <strong>${dev.primary_inference_target.toUpperCase()}</strong>`);
        showInfo("device-info", parts.length ? parts : null);
        const target = procSel === "auto" ? (dev.primary_inference_target || "cpu") : procSel;
        const wattsMap = { cpu: dev.inference_cpu_watts, gpu: dev.inference_gpu_watts, npu: dev.inference_npu_watts };
        const watts = wattsMap[target];
        const isAuto = procSel === "auto";
        showInfo("proc-info", [
            isAuto
                ? `Auto → <strong>${target.toUpperCase()}</strong> (${fmtVal(watts) || "?"}W, óptimo para este dispositivo)`
                : `Usando <strong>${target.toUpperCase()}</strong>: ${fmtVal(watts) || "?"}W`,
        ]);
    }

    // CO₂ estimator — inline in results tab (called after calculation)
    function renderCO2Estimator(data) {
        const panel = document.getElementById("co2-estimator-inline");
        if (!panel) return;
        const em = data.emissions_gCO2 || {};
        const co2 = em.total || 0;
        const valEl = document.getElementById("co2-est-val");
        if (valEl) animateValue(valEl, co2, co2 < 0.01 ? 4 : 3, 1.5);
        // Context text
        const ctxEl = document.getElementById("co2-est-context");
        if (ctxEl) {
            const dailyG = co2 * 100; // ~100 queries/day typical user
            const yearlyKg = (dailyG * 365 / 1000);
            ctxEl.innerHTML = `Con un uso típico de <strong>100 queries/día</strong>, supondría ~<strong>${yearlyKg.toFixed(2)} kg CO₂/año</strong>. `
                + `Equivale a ${(yearlyKg / 0.21).toFixed(0)} km en coche o ${(yearlyKg * 5.7).toFixed(0)} horas de bombilla LED.`;
        }
        panel.style.display = "block";
    }

    function showInfo(divId, parts) {
        const div = document.getElementById(divId);
        if (!div) return;
        const filtered = (parts || []).filter(Boolean);
        if (!filtered.length) { div.style.display = "none"; div.innerHTML = ""; return; }
        div.innerHTML = filtered.join(" | ");
        div.style.display = "block";
    }

    function fillSelect(selectId, items, labelFn, valueFn, optional) {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        // Preserve existing placeholder (first empty-value option)
        const placeholder = sel.querySelector('option[value=""]');
        sel.innerHTML = "";
        if (placeholder) {
            sel.appendChild(placeholder);
        } else {
            const opt = document.createElement("option");
            opt.value = ""; opt.textContent = "— Selecciona —";
            sel.appendChild(opt);
        }
        items.forEach(item => {
            const opt = document.createElement("option");
            opt.value = valueFn(item); opt.textContent = labelFn(item);
            sel.appendChild(opt);
        });
    }

    function fmtVal(v) {
        if (v == null) return null;
        const n = parseFloat(v);
        if (isNaN(n)) return v;
        if (Math.abs(n) >= 100) return n.toFixed(0);
        if (Math.abs(n) >= 1) return n.toFixed(2);
        return n.toFixed(4);
    }

    function formatRequestType(id) {
        const names = {
            chat_simple: "Chat Simple",
            chat_extended: "Chat Extendido",
            chat_complex: "Chat Complejo",
            generation_short: "Generación corta",
            generation_long: "Generación larga",
            code_generation: "Generación de código",
            summarization: "Resumen de texto",
            translation: "Traducción",
            image_analysis: "Análisis de imagen",
            embedding: "Embedding",
        };
        return names[id] || id;
    }

    function countryName(code) {
        // Full name for top-level codes; sub-zones get "Country · subzone"
        const countries = {
            AT: "Austria", AU: "Australia", BE: "Bélgica", BR: "Brasil",
            CA: "Canadá", CH: "Suiza", CL: "Chile", DE: "Alemania",
            DK: "Dinamarca", ES: "España", FI: "Finlandia", FR: "Francia",
            GB: "Reino Unido", IE: "Irlanda", IN: "India", IT: "Italia",
            JP: "Japón", KR: "Corea del Sur", NL: "Países Bajos", NO: "Noruega",
            PL: "Polonia", PT: "Portugal", SE: "Suecia", SG: "Singapur",
            US: "EEUU",
        };
        const prefix = code.split("-")[0];
        const country = countries[prefix] || prefix;
        if (code === prefix) return country;
        return `${country} · ${code.substring(prefix.length + 1)}`;
    }

    // ------------------------------------------------------------------
    // Calculate
    // ------------------------------------------------------------------
    async function doCalculate() {
        const btn = document.getElementById("btn-calculate");
        btn.disabled = true;
        btn.innerHTML = '<svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg> Calculando…';

        const params = getFormParams();
        LAST_PARAMS = params;

        try {
            const resp = await fetch("/api/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            });
            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.error || "Error en el cálculo");
            }
            LAST_RESULT = await resp.json();
            renderResults(LAST_RESULT);
            switchToTab("resultados");
        } catch (err) {
            showError(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Calcular emisiones';
        }
    }

    function getFormParams() {
        const get = id => { const el = document.getElementById(id); return el ? el.value : ""; };
        const params = {
            model_id: get("model_id"),
            data_center_id: get("data_center_id"),
            device_id: get("device_id"),
            network_id: get("network_id"),
            inference_processor: get("inference_processor") || "auto",
            utilization: parseFloat(get("utilization")) / 100,
        };
        const rt = get("request_type");
        if (rt) params.request_type = rt;
        const country = get("user_country");
        if (country) params.user_country = country;
        return params;
    }

    // ------------------------------------------------------------------
    // Results (Tab 2)
    // ------------------------------------------------------------------
    function renderResults(data) {
        document.getElementById("results-placeholder").style.display = "none";
        document.getElementById("results-content").style.display = "block";

        const em = data.emissions_gCO2 || {};
        const en = data.energy_Wh || {};
        const labelInfo = data.environmental_label || {};
        const ts = new Date();

        // Timestamp
        const formattedDate = new Intl.DateTimeFormat('es-ES', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(ts);

        // Metrics with countup (3 boxes — no percentil)
        const metricsGrid = document.getElementById("results-metrics");
        metricsGrid.innerHTML = `
            ${metricBox("leaf", "CO₂ Total", em.total, "gCO₂", "co2-counter")}
            ${metricBox("zap", "Energía Total", en.total, "Wh", "energy-counter")}
            ${metricBox("tag", "Etiqueta", null, labelInfo.label?.description || "", null, labelInfo.label?.label || "?")}
        `;

        // Animate counters
        setTimeout(() => {
            animateValue(document.getElementById("co2-counter"), em.total || 0, em.total < 1 ? 4 : 2, 2);
            animateValue(document.getElementById("energy-counter"), en.total || 0, en.total < 1 ? 4 : 2, 2);
        }, 100);

        if (window.lucide) lucide.createIcons();

        // Breakdown with mini progress bars
        const breakdown = document.getElementById("results-breakdown");
        const total = em.total || 1;
        breakdown.innerHTML = `
            ${breakdownCard("monitor", "Dispositivo", em.device, total)}
            ${breakdownCard("wifi", "Red", em.network, total)}
            ${breakdownCard("server", "Data Center", em.datacenter, total)}
        `;

        // Animate progress bars
        setTimeout(() => {
            breakdown.querySelectorAll('.mini-progress-fill').forEach(bar => {
                bar.style.width = bar.dataset.pct + '%';
            });
        }, 200);

        // Equivalencies — client-side computed
        renderEquivalencies(em.total || 0, en.total || 0);

        if (window.lucide) lucide.createIcons();

        // What-if interactive section
        renderWhatIf(data);

        // Formula breakdown
        renderFormulaBreakdown(data);

        // Render dependent tabs
        initChartDefaults();
        renderDashboard(data);
        renderEnergyLabel(labelInfo);

        document.getElementById("dashboard-placeholder").style.display = "none";
        document.getElementById("dashboard-content").style.display = "block";
        document.getElementById("label-placeholder").style.display = "none";
        document.getElementById("label-content").style.display = "block";
        document.getElementById("comparador-placeholder").style.display = "none";
        document.getElementById("comparador-content").style.display = "block";
        document.getElementById("simulacion-placeholder").style.display = "none";
        document.getElementById("simulacion-content").style.display = "block";

        doCompare();
    }

    function metricBox(icon, label, numValue, unit, countId, textValue) {
        const display = textValue != null ? textValue : '0';
        return `<div class="metric-box">
            <div class="metric-box-icon"><i data-lucide="${icon}"></i></div>
            <div class="metric-label">${label}</div>
            <div class="metric-value" ${countId ? `id="${countId}"` : ''}>${display}</div>
            <div class="metric-unit">${unit}</div>
        </div>`;
    }

    function breakdownCard(icon, label, value, total) {
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        return `<div class="breakdown-card">
            <div class="breakdown-icon"><i data-lucide="${icon}"></i></div>
            <div class="breakdown-label">${label}</div>
            <div class="breakdown-value">${formatNum(value)} g</div>
            <div class="breakdown-percentage">${pct}%</div>
            <div class="mini-progress"><div class="mini-progress-fill" data-pct="${pct}" style="width:0%"></div></div>
        </div>`;
    }

    function equivIconLucide(key) {
        const map = {
            km_coche: "car", horas_bombilla_led: "lightbulb", litros_agua: "droplets",
            smartphones_carga: "smartphone", gramos_carbon: "circle", arboles_minutos: "tree-pine",
        };
        return map[key] || "bar-chart-2";
    }

    // ------------------------------------------------------------------
    // Equivalencies — client-side computation
    // ------------------------------------------------------------------
    const EQUIV = {
        google_search_g: 0.2,
        phone_charge_g: 8.0,
        led_9w_wh: 9.0,
        flight_nyc_london_kg: 700,
        car_km_g: 120,
        household_day_kg: 12,
    };

    function renderEquivalencies(co2g, energyWh) {
        const div = document.getElementById("results-equivalencies");
        if (!div) return;

        const googleSearches = co2g / EQUIV.google_search_g;
        const phonePct = (co2g / EQUIV.phone_charge_g) * 100;
        const ledMinutes = (energyWh / EQUIV.led_9w_wh) * 60;

        // Inverse: how many queries to equal big things
        const queriesPerFlight = co2g > 0 ? (EQUIV.flight_nyc_london_kg * 1000) / co2g : Infinity;
        const queriesPerCarKm = co2g > 0 ? EQUIV.car_km_g / co2g : Infinity;
        const queriesPerHouseholdDay = co2g > 0 ? (EQUIV.household_day_kg * 1000) / co2g : Infinity;

        const cards = [
            { icon: "search", label: "Búsquedas Google", value: fmtEquiv(googleSearches), detail: `Equivale a ${fmtEquiv(googleSearches)} búsquedas en Google` },
            { icon: "smartphone", label: "Carga de móvil", value: fmtEquiv(phonePct) + "%", detail: `${fmtEquiv(phonePct)}% de una carga completa` },
            { icon: "lightbulb", label: "Bombilla LED (9W)", value: fmtEquiv(ledMinutes) + " min", detail: `${fmtEquiv(ledMinutes)} minutos encendida` },
            { icon: "plane", label: "Vuelo NYC–Londres", value: fmtBigNum(queriesPerFlight) + " queries", detail: `Necesitarías ${fmtBigNum(queriesPerFlight)} queries para igualar 1 vuelo` },
            { icon: "car", label: "1 km en coche", value: fmtBigNum(queriesPerCarKm) + " queries", detail: `${fmtBigNum(queriesPerCarKm)} queries = 1 km en coche` },
            { icon: "home", label: "1 día de hogar", value: fmtBigNum(queriesPerHouseholdDay) + " queries", detail: `${fmtBigNum(queriesPerHouseholdDay)} queries = 1 día de consumo doméstico` },
        ];

        div.innerHTML = cards.map(c => `
            <div class="breakdown-card equiv-card" title="${c.detail}">
                <div class="breakdown-icon"><i data-lucide="${c.icon}"></i></div>
                <div class="breakdown-label">${c.label}</div>
                <div class="breakdown-value">${c.value}</div>
                <div class="equiv-detail">${c.detail}</div>
            </div>
        `).join("");

        if (window.lucide) lucide.createIcons();
    }

    function fmtEquiv(n) {
        if (!isFinite(n) || isNaN(n)) return "∞";
        if (n >= 1000) return Math.round(n).toLocaleString("es-ES");
        if (n >= 10) return n.toFixed(1);
        if (n >= 1) return n.toFixed(2);
        return n.toFixed(4);
    }

    function fmtBigNum(n) {
        if (!isFinite(n) || isNaN(n)) return "∞";
        if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
        if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
        if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
        return Math.round(n).toLocaleString("es-ES");
    }

    // ------------------------------------------------------------------
    // Formula Breakdown
    // ------------------------------------------------------------------
    function renderFormulaBreakdown(data) {
        const container = document.getElementById("results-formula");
        if (!container) return;
        const fs = data.formula_steps;
        if (!fs) { container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No hay datos de fórmula disponibles.</p>'; return; }

        const d = fs.device || {};
        const n = fs.network || {};
        const dc = fs.datacenter || {};
        const meta = data.metadata || {};

        function fv(v, dec) {
            if (v == null || isNaN(v)) return "?";
            const val = parseFloat(v);
            if (dec !== undefined) return val.toFixed(dec);
            if (Math.abs(val) < 0.0001) return val.toExponential(3);
            if (Math.abs(val) < 0.1) return val.toFixed(6);
            if (Math.abs(val) < 10) return val.toFixed(4);
            return val.toFixed(2);
        }
        function hi(v, unit) {
            return `<span class="fs-highlight">${fv(v)}</span><span class="fs-unit"> ${unit}</span>`;
        }
        function hiRes(v, unit) {
            return `<span class="fs-result">${fv(v)}</span><span class="fs-unit"> ${unit}</span>`;
        }

        const procLabel = (d.processor || "cpu").toUpperCase();
        const isAuto = meta.device_processor === d.processor;

        const sections = [
            {
                title: "Sección 2.1.1 — Emisiones del Dispositivo",
                steps: [
                    {
                        label: "Paso 1: Selección de procesador",
                        lines: [
                            `Procesador seleccionado: <span class="fs-highlight">${procLabel}</span>${isAuto ? ' <span class="fs-note">(óptimo para este dispositivo)</span>' : ''}`,
                            `P<sub>idle</sub> (sistema en reposo) = ${hi(d.p_idle_w, "W")}`,
                            `P<sub>max</sub> (inferencia ${procLabel}) = ${hi(d.p_max_w, "W")}`,
                        ]
                    },
                    {
                        label: "Paso 2: Potencia real del dispositivo",
                        formula: "P<sub>real</sub> = P<sub>idle</sub> + (P<sub>max</sub> − P<sub>idle</sub>) × U",
                        computed: `P<sub>real</sub> = ${fv(d.p_idle_w)} + (${fv(d.p_max_w)} − ${fv(d.p_idle_w)}) × ${fv(d.utilization, 2)} = ${hiRes(d.p_real_w, "W")}`
                    },
                    {
                        label: "Paso 3: Energía del dispositivo",
                        formula: "E<sub>disp</sub> = P<sub>real</sub> × t<sub>inferencia</sub> / 3600",
                        computed: `E<sub>disp</sub> = ${fv(d.p_real_w)} × ${fv(d.inference_time_s, 3)} / 3600 = ${hiRes(d.energy_wh, "Wh")}`
                    },
                    {
                        label: "Paso 4: CO₂ del dispositivo",
                        formula: "CO₂<sub>disp</sub> = (E<sub>disp</sub> / 1000) × CI<sub>local</sub>",
                        computed: `CO₂<sub>disp</sub> = (${fv(d.energy_wh)} / 1000) × ${fv(d.ci_gCO2_kWh, 0)} = ${hiRes(d.co2_g, "gCO₂")}`,
                        note: `CI<sub>local</sub> = ${fv(d.ci_gCO2_kWh, 0)} gCO₂/kWh`
                    },
                ]
            },
            {
                title: "Sección 2.1.2 — Emisiones de la Red",
                steps: [
                    {
                        label: "Paso 1: Datos transferidos",
                        formula: "datos<sub>MB</sub> = (1200 + tokens × 5) / 1.000.000",
                        computed: `datos<sub>MB</sub> = (1200 + ${n.tokens} × 5) / 1.000.000 = ${hiRes(n.data_mb, "MB")}`,
                        note: "1200 bytes = overhead HTTP fijo &nbsp;|&nbsp; 5 bytes/token = payload UTF-8"
                    },
                    {
                        label: "Paso 2: Energía de la red",
                        formula: "E<sub>red</sub> = energía<sub>kWh/MB</sub> × datos<sub>MB</sub> × 1000",
                        computed: `E<sub>red</sub> = ${hi(n.energy_kWh_per_mb)} × ${fv(n.data_mb)} × 1000 = ${hiRes(n.energy_wh, "Wh")}`,
                        note: `Red: ${meta.network} (${fv(n.energy_kWh_per_gb, 4)} kWh/GB)`
                    },
                    {
                        label: "Paso 3: CO₂ de la red",
                        formula: "CO₂<sub>red</sub> = (energy<sub>kWh/GB</sub> × CI<sub>local</sub> / 1000) × datos<sub>GB</sub> × 1000",
                        computed: `carbon/GB = ${fv(n.energy_kWh_per_gb)} × ${fv(n.ci_gCO2_kWh, 0)} / 1000 = ${fv(n.energy_kWh_per_gb * n.ci_gCO2_kWh / 1000, 6)} kg CO₂/GB<br>
                                   CO₂<sub>red</sub> = ${fv(n.data_mb / 1000, 9)} GB × ${fv(n.energy_kWh_per_gb * n.ci_gCO2_kWh / 1000, 6)} × 1000 = ${hiRes(n.co2_g, "gCO₂")}`,
                    },
                ]
            },
            {
                title: "Sección 2.2 — Emisiones del Data Center",
                steps: [
                    {
                        label: "Paso 1: Energía de cómputo (vía energy_wh_per_1k_tokens)",
                        formula: "E<sub>compute</sub> = (tokens / 1000) × energy<sub>wh_per_1k</sub>",
                        computed: `E<sub>compute</sub> = (${dc.tokens} / 1000) × ${hi(dc.model_wh_per_1k)} = ${hiRes(dc.energy_compute_wh, "Wh")}`,
                        note: `Metodología: energy_wh_per_1k_tokens del modelo`
                    },
                    {
                        label: "Paso 2: Energía total del Data Center (con PUE)",
                        formula: "E<sub>dc</sub> = E<sub>compute</sub> × PUE",
                        computed: `E<sub>dc</sub> = ${fv(dc.energy_compute_wh)} × ${hi(dc.pue)} = ${hiRes(dc.energy_dc_wh, "Wh")}`,
                        note: `PUE = ${fv(dc.pue)} (${meta.data_center}). PUE=1.0 sería perfecto.`
                    },
                    {
                        label: "Paso 3: CO₂ del Data Center",
                        formula: "CO₂<sub>dc</sub> = (E<sub>dc</sub> / 1000) × CI<sub>datacenter</sub>",
                        computed: `CO₂<sub>dc</sub> = (${fv(dc.energy_dc_wh)} / 1000) × ${hi(dc.ci_gCO2_kWh, 0)} = ${hiRes(dc.co2_g, "gCO₂")}`,
                        note: `CI del data center = ${fv(dc.ci_gCO2_kWh, 0)} gCO₂/kWh`
                    },
                ]
            }
        ];

        container.innerHTML = sections.map(sec => `
            <div class="fs-section">
                <div class="fs-section-title">${sec.title}</div>
                ${sec.steps.map(step => `
                    <div class="fs-step">
                        <div class="fs-step-label">${step.label}</div>
                        ${step.formula ? `<div class="fs-formula">${step.formula}</div>` : ''}
                        ${step.lines ? step.lines.map(l => `<div class="fs-line">${l}</div>`).join('') : ''}
                        ${step.computed ? `<div class="fs-computed">${step.computed}</div>` : ''}
                        ${step.note ? `<div class="fs-note-line">${step.note}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    // ------------------------------------------------------------------
    // What-If Interactive Section
    // ------------------------------------------------------------------
    let _whatIfAbort = null;

    function renderWhatIf(data) {
        const controls = document.getElementById("whatif-controls");
        const results = document.getElementById("whatif-results");
        if (!controls || !results || !LAST_PARAMS) return;

        const currentParams = { ...LAST_PARAMS };
        const opts = OPTIONS;

        // Build selectors for alternative scenarios
        const selectors = [];

        // Alternative model
        if (opts.models?.length > 1) {
            selectors.push({
                id: "whatif-model", label: "Otro modelo", param: "model_id",
                icon: "cpu",
                options: opts.models.map(m => ({ value: m.model_id, label: m.model_name || m.model_id })),
                current: currentParams.model_id
            });
        }

        // Alternative processor
        const procOptions = [
            { value: "cpu", label: "CPU" },
            { value: "gpu", label: "GPU" },
            { value: "npu", label: "NPU" },
        ];
        selectors.push({
            id: "whatif-proc", label: "Otro procesador", param: "inference_processor",
            icon: "chip",
            options: procOptions,
            current: currentParams.inference_processor || "auto"
        });

        // Alternative network
        if (opts.networks?.length > 1) {
            selectors.push({
                id: "whatif-network", label: "Otra red", param: "network_id",
                icon: "wifi",
                options: opts.networks.map(n => ({ value: n.network_type, label: n.network_type })),
                current: currentParams.network_id
            });
        }

        // Alternative data center
        if (opts.data_centers?.length > 1) {
            selectors.push({
                id: "whatif-dc", label: "Otro data center", param: "data_center_id",
                icon: "server",
                options: opts.data_centers.map(d => ({ value: d.dc_id, label: `${d.provider_name} — ${d.region}` })),
                current: currentParams.data_center_id
            });
        }

        controls.innerHTML = selectors.map(s => `
            <div class="whatif-control">
                <label for="${s.id}"><i data-lucide="${s.icon}" style="width:14px;height:14px;"></i> ${s.label}</label>
                <select id="${s.id}" class="whatif-select" data-param="${s.param}">
                    <option value="">— Sin cambio —</option>
                    ${s.options.map(o => `<option value="${o.value}" ${o.value === s.current ? 'disabled' : ''}>${o.label}</option>`).join("")}
                </select>
            </div>
        `).join("");

        // Show current baseline
        results.innerHTML = `
            <div class="whatif-baseline">
                <div class="whatif-baseline-label">Resultado actual</div>
                <div class="whatif-baseline-value">${formatNum(data.emissions_gCO2?.total)} gCO₂</div>
            </div>
            <div id="whatif-scenarios"></div>
        `;

        if (window.lucide) lucide.createIcons();

        // Attach event listeners
        controls.querySelectorAll(".whatif-select").forEach(sel => {
            sel.addEventListener("change", () => runWhatIfScenarios(data));
        });
    }

    async function runWhatIfScenarios(originalData) {
        // Cancel any pending request
        if (_whatIfAbort) _whatIfAbort.abort();
        _whatIfAbort = new AbortController();

        const container = document.getElementById("whatif-scenarios");
        if (!container || !LAST_PARAMS) return;

        // Gather all selected alternatives
        const selects = document.querySelectorAll(".whatif-select");
        const scenarios = [];
        selects.forEach(sel => {
            if (sel.value) {
                scenarios.push({
                    param: sel.dataset.param,
                    value: sel.value,
                    label: sel.previousElementSibling?.textContent?.trim() || sel.dataset.param,
                    displayValue: sel.options[sel.selectedIndex].text
                });
            }
        });

        if (scenarios.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:20px;">Selecciona una alternativa arriba para comparar.</p>';
            return;
        }

        // Show loading
        container.innerHTML = scenarios.map(s => `
            <div class="whatif-scenario-card whatif-loading">
                <div class="whatif-scenario-header">
                    <span class="whatif-scenario-label">${s.label}: <strong>${s.displayValue}</strong></span>
                    <span class="whatif-scenario-loading"><svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg></span>
                </div>
            </div>
        `).join("");

        const originalCO2 = originalData.emissions_gCO2?.total || 0;

        // Fire all scenario requests in parallel
        const promises = scenarios.map(async (scenario) => {
            const altParams = { ...LAST_PARAMS, [scenario.param]: scenario.value };
            try {
                const resp = await fetch("/api/calculate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(altParams),
                    signal: _whatIfAbort.signal,
                });
                if (!resp.ok) throw new Error("API error");
                const result = await resp.json();
                return { ...scenario, result, error: null };
            } catch (err) {
                if (err.name === "AbortError") return null;
                return { ...scenario, result: null, error: err.message };
            }
        });

        const results = (await Promise.all(promises)).filter(Boolean);

        // Render results with animated transitions
        container.innerHTML = results.map(s => {
            if (s.error) {
                return `<div class="whatif-scenario-card error">
                    <div class="whatif-scenario-header">
                        <span class="whatif-scenario-label">${s.label}: <strong>${s.displayValue}</strong></span>
                        <span class="whatif-badge badge-neutral">Error</span>
                    </div>
                </div>`;
            }
            const newCO2 = s.result.emissions_gCO2?.total || 0;
            const diff = originalCO2 > 0 ? ((newCO2 - originalCO2) / originalCO2) * 100 : 0;
            const isBetter = diff < -0.5;
            const isWorse = diff > 0.5;
            const badge = isBetter ? "badge-better" : isWorse ? "badge-worse" : "badge-neutral";
            const arrow = isBetter ? "↓" : isWorse ? "↑" : "≈";
            const badgeText = isBetter ? `${arrow} ${Math.abs(diff).toFixed(1)}% menos` : isWorse ? `${arrow} ${Math.abs(diff).toFixed(1)}% más` : "≈ Similar";

            return `<div class="whatif-scenario-card ${isBetter ? 'better' : isWorse ? 'worse' : 'neutral'}">
                <div class="whatif-scenario-header">
                    <span class="whatif-scenario-label">${s.label}: <strong>${s.displayValue}</strong></span>
                    <span class="whatif-badge ${badge}">${badgeText}</span>
                </div>
                <div class="whatif-scenario-body">
                    <div class="whatif-bar-container">
                        <div class="whatif-bar whatif-bar-original" style="width:${Math.min(100, 100).toFixed(0)}%">
                            <span>${formatNum(originalCO2)} gCO₂</span>
                        </div>
                        <div class="whatif-bar whatif-bar-alt ${isBetter ? 'bar-better' : isWorse ? 'bar-worse' : 'bar-neutral'}" style="width:0%" data-target-width="${Math.min(100, originalCO2 > 0 ? (newCO2 / originalCO2 * 100).toFixed(0) : 100)}%">
                            <span>${formatNum(newCO2)} gCO₂</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join("");

        // Animate bars
        requestAnimationFrame(() => {
            container.querySelectorAll('.whatif-bar-alt').forEach(bar => {
                const target = bar.dataset.targetWidth;
                requestAnimationFrame(() => { bar.style.width = target; });
            });
        });

        if (window.lucide) lucide.createIcons();
    }

    // ------------------------------------------------------------------
    // Dashboard (Tab 3) — Chart.js
    // ------------------------------------------------------------------
    function renderDashboard(data) {
        const em = data.emissions_gCO2 || {};
        const en = data.energy_Wh || {};

        // Destroy old charts
        if (pieChart) pieChart.destroy();
        if (barChart) barChart.destroy();

        const pieCtx = document.getElementById("pie-chart")?.getContext("2d");
        const barCtx = document.getElementById("bar-chart")?.getContext("2d");
        if (!pieCtx || !barCtx) return;

        pieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Dispositivo', 'Red', 'Data Center'],
                datasets: [{
                    data: [em.device, em.network, em.datacenter],
                    backgroundColor: ['#38bdf8', '#f97316', '#4ade80'],
                    borderColor: 'rgba(6,13,10,0.8)',
                    borderWidth: 2,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                animation: { animateRotate: true, duration: 1200 },
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16 } },
                }
            }
        });

        barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Dispositivo', 'Red', 'Data Center'],
                datasets: [{
                    label: 'Wh',
                    data: [en.device, en.network, en.datacenter],
                    backgroundColor: ['rgba(56,189,248,0.7)', 'rgba(249,115,22,0.7)', 'rgba(74,222,128,0.7)'],
                    borderRadius: { topLeft: 4, topRight: 4 },
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000 },
                plugins: {
                    legend: { display: false },
                    tooltip: {},
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b1' } },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#5a7a64' },
                        title: { display: true, text: 'Wh', color: '#5a7a64' }
                    }
                }
            },
            plugins: [{
                id: 'valueLabels',
                afterDatasetsDraw(chart) {
                    const ctx = chart.ctx;
                    chart.data.datasets.forEach((ds, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((bar, j) => {
                            const val = ds.data[j];
                            ctx.save();
                            ctx.fillStyle = '#e8f0eb';
                            ctx.font = '600 11px JetBrains Mono';
                            ctx.textAlign = 'center';
                            ctx.fillText(val != null ? formatNum(val) : '', bar.x, bar.y - 6);
                            ctx.restore();
                        });
                    });
                }
            }]
        });
    }

    // ------------------------------------------------------------------
    // Comparator (Tab 4)
    // ------------------------------------------------------------------
    async function doCompare() {
        if (!LAST_PARAMS) return;
        const params = { ...LAST_PARAMS };
        delete params.model_id;

        try {
            const resp = await fetch("/api/compare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            });
            if (!resp.ok) return;
            const data = await resp.json();
            renderComparison(data);
        } catch (err) {
            console.error("Error en comparación:", err);
        }
    }

    function getBarColor(label) {
        if (!label) return 'rgba(74,222,128,0.6)';
        const l = label.toUpperCase();
        if (l.includes('A')) return 'rgba(74,222,128,0.7)';
        if (l === 'B' || l === 'C') return 'rgba(251,191,36,0.7)';
        return 'rgba(239,68,68,0.7)';
    }

    function getLabelBadge(labelObj) {
        if (!labelObj) return '<span class="label-badge" style="background:rgba(100,100,100,.2);color:#999">?</span>';
        const color = labelObj.color_hex || '#999';
        return `<span class="label-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${labelObj.label || '?'}</span>`;
    }

    function renderComparison(data) {
        const table = data.comparative_table || [];
        if (table.length === 0) return;

        const sorted = [...table].sort((a, b) => a.co2_gCO2 - b.co2_gCO2);

        // Horizontal bar chart
        if (compChart) compChart.destroy();
        const ctx = document.getElementById("comparison-chart")?.getContext("2d");
        if (!ctx) return;

        compChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(r => r.model),
                datasets: [{
                    label: 'gCO₂',
                    data: sorted.map(r => r.co2_gCO2),
                    backgroundColor: sorted.map(r => getBarColor(r.environmental_label?.label)),
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1200 },
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#5a7a64' },
                        title: { display: true, text: 'gCO₂', color: '#5a7a64' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#94a3b1', font: { size: 11 } },
                    }
                }
            },
            plugins: [{
                id: 'barValueLabels',
                afterDatasetsDraw(chart) {
                    const ctx = chart.ctx;
                    chart.getDatasetMeta(0).data.forEach((bar, j) => {
                        const val = chart.data.datasets[0].data[j];
                        ctx.save();
                        ctx.fillStyle = '#e8f0eb';
                        ctx.font = '600 10px JetBrains Mono';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(formatNum(val), bar.x + 6, bar.y);
                        ctx.restore();
                    });
                }
            }]
        });

        // Table with sort
        const tableDiv = document.getElementById("comparison-table");
        const arrowSvg = '<span class="sort-icon"><svg viewBox="0 0 24 24"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" stroke="currentColor" fill="none" stroke-width="2"/></svg></span>';

        tableDiv.innerHTML = `
            <table id="comp-table">
                <thead>
                    <tr>
                        <th data-sort="model">Modelo ${arrowSvg}</th>
                        <th data-sort="co2_gCO2">CO₂ Total (g) ${arrowSvg}</th>
                        <th data-sort="energy_Wh">Energía (Wh) ${arrowSvg}</th>
                        <th data-sort="label">Etiqueta ${arrowSvg}</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(r => `
                        <tr>
                            <td style="font-weight:600;color:var(--text-primary)">${r.model}</td>
                            <td class="font-mono">${formatNum(r.co2_gCO2)}</td>
                            <td class="font-mono">${formatNum(r.energy_Wh)}</td>
                            <td>${getLabelBadge(r.environmental_label)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;

        // Column sort
        let sortAsc = {};
        tableDiv.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                sortAsc[key] = !sortAsc[key];
                const dir = sortAsc[key] ? 1 : -1;
                const rows = [...sorted].sort((a, b) => {
                    if (key === 'model') return dir * a.model.localeCompare(b.model);
                    if (key === 'label') return dir * ((a.environmental_label?.label || 'Z').localeCompare(b.environmental_label?.label || 'Z'));
                    return dir * ((a[key] || 0) - (b[key] || 0));
                });
                const tbody = tableDiv.querySelector('tbody');
                tbody.innerHTML = rows.map(r => `
                    <tr>
                        <td style="font-weight:600;color:var(--text-primary)">${r.model}</td>
                        <td class="font-mono">${formatNum(r.co2_gCO2)}</td>
                        <td class="font-mono">${formatNum(r.energy_Wh)}</td>
                        <td>${getLabelBadge(r.environmental_label)}</td>
                    </tr>
                `).join("");
            });
        });
    }

    // ------------------------------------------------------------------
    // Simulation (Tab 5)
    // ------------------------------------------------------------------
    async function doSimulate() {
        if (!LAST_PARAMS) { showError("Calcula emisiones primero."); return; }

        const rawVal = document.getElementById("queries_per_day")?.value || "1000000";
        const qpd = parseInt(rawVal.replace(/\./g, '').replace(/[^\d]/g, '')) || 1000000;
        const params = { ...LAST_PARAMS, queries_per_day: qpd, days_per_year: 365 };

        try {
            const resp = await fetch("/api/report/production", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            });
            if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || "Error en simulación"); }
            const data = await resp.json();
            renderSimulation(data, qpd);
        } catch (err) {
            showError(err.message);
        }
    }

    function renderSimulation(data, qpd) {
        const div = document.getElementById("simulation-results");
        const impact = data.production_impact || {};
        const emissions = impact.emissions || {};
        const energy = impact.energy || {};
        const equivs = impact.equivalencies || {};

        div.innerHTML = `
            <div class="sim-metrics" id="sim-metrics">
                ${metricBox("hash", "Queries/día", null, "", null, qpd.toLocaleString("es-ES"))}
                ${metricBox("leaf", "CO₂ anual", null, "kg CO₂", "sim-co2", "0")}
                ${metricBox("zap", "Energía anual", null, "MWh", "sim-energy", "0")}
                ${metricBox("dollar-sign", "Coste energético", null, "/año", "sim-cost", "0")}
            </div>
            <div class="chart-container">
                <div class="card-title"><i data-lucide="trending-up"></i> Proyección CO₂ mensual</div>
                <div class="chart-wrapper"><canvas id="projection-chart"></canvas></div>
            </div>
            <div class="card">
                <div class="card-title"><i data-lucide="globe"></i> Equivalencias a escala</div>
                <div class="breakdown-grid">
                    ${equivCard("car", "Años conduciendo", equivs.car_years_driving)}
                    ${equivCard("home", "Años de hogar", equivs.household_years)}
                    ${equivCard("plane", "Vuelos transatlánticos", equivs.transatlantic_flights)}
                    ${equivCard("tree-pine", "Árboles necesarios", equivs.trees_needed)}
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();

        // Animate counters
        setTimeout(() => {
            animateValue(document.getElementById("sim-co2"), emissions.kg_co2_annual || 0, 0, 2);
            animateValue(document.getElementById("sim-energy"), energy.mwh_annual || 0, 1, 2);
            animateValue(document.getElementById("sim-cost"), energy.cost_usd_annual || 0, 0, 2);
        }, 100);

        // Projection area chart
        renderProjectionChart(emissions.kg_co2_annual || 0);
    }

    function renderProjectionChart(annualKg) {
        if (projChart) projChart.destroy();
        const ctx = document.getElementById("projection-chart")?.getContext("2d");
        if (!ctx) return;

        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const monthlyKg = annualKg / 12;
        const cumulative = months.map((_, i) => +((i + 1) * monthlyKg).toFixed(1));

        projChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'CO₂ acumulado (kg)',
                    data: cumulative,
                    fill: true,
                    backgroundColor: 'rgba(74,222,128,0.08)',
                    borderColor: '#4ade80',
                    borderWidth: 2,
                    pointBackgroundColor: '#4ade80',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1200 },
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b1' } },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#5a7a64' },
                        title: { display: true, text: 'kg CO₂', color: '#5a7a64' }
                    }
                }
            }
        });
    }

    function equivCard(icon, label, value) {
        return `<div class="breakdown-card">
            <div class="breakdown-icon"><i data-lucide="${icon}"></i></div>
            <div class="breakdown-label">${label}</div>
            <div class="breakdown-value">${value != null ? formatNum(value) : "N/D"}</div>
        </div>`;
    }

    // ------------------------------------------------------------------
    // Energy Label (Tab 6)
    // ------------------------------------------------------------------
    function renderEnergyLabel(labelData) {
        const widget = document.getElementById("energy-label-widget");
        if (!widget) return;

        const label = labelData.label || {};
        const scaleObj = labelData.scale || {};
        const scaleOrder = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F"];
        const scale = scaleOrder.filter(l => scaleObj[l]).map(l => scaleObj[l]);
        const color = label.color_hex || '#4ade80';

        widget.innerHTML = `
            <div class="energy-label">
                <div class="energy-label-header">
                    <i data-lucide="tag" style="width:16px;height:16px;display:inline;vertical-align:middle;margin-right:6px"></i>
                    Etiqueta Energética AI
                </div>
                <div class="energy-label-content">
                    <div style="text-align:center;margin-bottom:16px;">
                        <div class="energy-label-glow" style="background:${color}15;">
                            <div class="energy-label-big" style="color:${color};text-shadow:0 0 30px ${color}60;position:relative;z-index:1;">
                                ${label.label || "?"}
                            </div>
                        </div>
                        <div style="font-size:14px;color:#94a3b1;">${label.description || ""}</div>
                    </div>
                    <div class="energy-label-scale">
                        ${scale.map(s => `
                            <div class="energy-label-item${s.label === label.label ? " current" : ""}">
                                <div class="energy-label-letter" style="background:${s.color_hex || '#999'};">
                                    ${s.label}
                                </div>
                                <div style="flex:1;font-size:12px;color:#94a3b1;">
                                    ${s.description || ""}
                                </div>
                                <div style="font-size:11px;color:#5a7a64;font-family:'JetBrains Mono',monospace;">
                                    ${s.max_co2_g !== undefined ? "≤" + formatNum(s.max_co2_g) + "g" : ""}
                                </div>
                            </div>
                        `).join("")}
                    </div>
                    <div style="text-align:center;margin-top:16px;font-size:13px;color:#94a3b1;">
                        Percentil: <strong style="color:var(--primary)">${formatNum(labelData.percentile) ?? "?"}%</strong>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    }

    // ------------------------------------------------------------------
    // Map (Tab 7)
    // ------------------------------------------------------------------
    let map = null;

    const providerColors = {
        'AWS': '#f97316', 'GCP': '#4ade80', 'Azure': '#38bdf8', 'Deep Green': '#a78bfa',
    };

    const ciColorRanges = [
        { max: 100,  color: 'rgba(74, 222, 128, 0.25)' },
        { max: 200,  color: 'rgba(74, 222, 128, 0.15)' },
        { max: 300,  color: 'rgba(251, 191, 36, 0.20)' },
        { max: 400,  color: 'rgba(249, 115, 22, 0.25)' },
        { max: 600,  color: 'rgba(239, 68, 68, 0.25)' },
        { max: 99999,color: 'rgba(185, 28, 28, 0.35)' },
    ];

    function ciColor(ci) {
        if (ci == null) return '#666';
        for (const r of ciColorRanges) { if (ci < r.max) return r.color; }
        return 'rgba(185, 28, 28, 0.35)';
    }

    function ciColorSolid(ci) {
        if (ci == null) return '#666';
        if (ci < 100) return '#4ade80';
        if (ci < 200) return '#86efac';
        if (ci < 300) return '#fbbf24';
        if (ci < 400) return '#f97316';
        if (ci < 600) return '#ef4444';
        return '#b91c1c';
    }

    function getProviderColor(provider) {
        if (!provider) return '#666';
        for (const [key, color] of Object.entries(providerColors)) {
            if (provider.toLowerCase().includes(key.toLowerCase())) return color;
        }
        return '#666';
    }

    function renewableBadge(pct) {
        if (pct == null) return '';
        if (pct >= 80) return `<span class="popup-badge popup-badge-green">${pct.toFixed(0)}% renovable</span>`;
        if (pct >= 50) return `<span class="popup-badge popup-badge-amber">${pct.toFixed(0)}% renovable</span>`;
        return `<span class="popup-badge popup-badge-red">${pct.toFixed(0)}% renovable</span>`;
    }

    function detectGreenwash(dc) {
        // If provider claims high renewable but country CI is high
        const pRenew = dc.provider_renewable_pct;
        const ci = dc.carbon_intensity;
        if (pRenew != null && ci != null && pRenew > 80 && ci > 300) return true;
        return false;
    }

    function initMap() {
        const mapEl = document.getElementById("map");
        if (!mapEl) return;
        document.querySelectorAll(".tab-button").forEach(btn => {
            if (btn.dataset.tab === "mapa") {
                btn.addEventListener("click", () => {
                    setTimeout(() => {
                        if (!map) createMap();
                        else map.invalidateSize();
                    }, 200);
                });
            }
        });
    }

    async function createMap() {
        map = L.map("map", { zoomControl: true }).setView([30, 0], 2);

        L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
            maxZoom: 18,
        }).addTo(map);

        // Legend
        const legendDiv = document.createElement('div');
        legendDiv.className = 'map-legend';
        legendDiv.innerHTML = `
            <h4>Intensidad Carbono</h4>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#4ade80"></div> &lt;100 gCO₂/kWh</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#86efac"></div> 100–200</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#fbbf24"></div> 200–300</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#f97316"></div> 300–400</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#ef4444"></div> 400–600</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#b91c1c"></div> &gt;600</div>
            <hr class="map-legend-divider">
            <h4>Proveedores</h4>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#f97316"></div> AWS</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#4ade80"></div> GCP</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#38bdf8"></div> Azure</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#a78bfa"></div> Deep Green</div>
            <p class="map-legend-note">Color borde = CI del país · Color icono = proveedor</p>
        `;
        document.getElementById("map").appendChild(legendDiv);

        try {
            const resp = await fetch("/api/map-data");
            if (!resp.ok) return;
            const data = await resp.json();
            const dcs = data.data_centers || [];

            // Stats for bottom panels
            let totalDCs = dcs.length;
            let providers = {};
            let pueSum = 0, pueCount = 0, bestPUE = 99, worstPUE = 0, bestPUE_name = '', worstPUE_name = '';

            dcs.forEach(dc => {
                if (dc.latitude == null || dc.longitude == null) return;

                const ci = dc.carbon_intensity;
                const provColor = getProviderColor(dc.provider);
                const borderColor = ciColorSolid(ci);
                const isGreenwash = detectGreenwash(dc);

                // Provider stats
                if (dc.provider) providers[dc.provider] = (providers[dc.provider] || 0) + 1;
                if (dc.pue) {
                    pueSum += dc.pue; pueCount++;
                    if (dc.pue < bestPUE) { bestPUE = dc.pue; bestPUE_name = `${dc.provider} ${dc.region}`; }
                    if (dc.pue > worstPUE) { worstPUE = dc.pue; worstPUE_name = `${dc.provider} ${dc.region}`; }
                }

                // Create divIcon marker
                const size = 14;
                const extraClass = isGreenwash ? ' greenwash' : '';
                const icon = L.divIcon({
                    className: '',
                    html: `<div class="dc-marker${extraClass}" style="width:${size}px;height:${size}px;background:${provColor};border:2px solid ${borderColor};"></div>`,
                    iconSize: [size, size],
                    iconAnchor: [size/2, size/2],
                });

                // Popup content
                const renewPct = dc.renewable_pct ?? dc.provider_renewable_pct;
                const gwBadge = isGreenwash
                    ? `<div style="margin-top:6px"><span class="popup-badge popup-badge-amber popup-badge-pulse"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Posible greenwashing</span></div>`
                    : '';

                const co2Estimate = ci != null && LAST_RESULT
                    ? ((LAST_RESULT.emissions_gCO2?.total || 0) * (ci / 400) * (dc.pue || 1.15) / 1.15).toFixed(4)
                    : null;

                const popupHtml = `
                    <div class="popup-header">
                        <div class="popup-name">${dc.provider || ''} — ${dc.region || ''}</div>
                        <div class="popup-region">${dc.country_code || ''} · ${dc.dc_id || ''}</div>
                    </div>
                    <div class="popup-body">
                        <div class="popup-row">
                            <span class="popup-row-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Intens. carbono</span>
                            <span class="popup-row-value" style="color:${ciColorSolid(ci)}">${ci != null ? ci.toFixed(0) + ' gCO₂/kWh' : 'N/D'}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-row-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> PUE</span>
                            <span class="popup-row-value">${dc.pue ? dc.pue.toFixed(2) : 'N/D'}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-row-label">Renovables</span>
                            <span>${renewableBadge(renewPct)}</span>
                        </div>
                        ${gwBadge}
                        ${co2Estimate ? `
                        <hr class="popup-divider">
                        <div class="popup-co2">
                            <div class="popup-co2-value">${co2Estimate} gCO₂</div>
                            <div class="popup-co2-label">Estimación CO₂/query${LAST_PARAMS?.model_id ? ' · ' + LAST_PARAMS.model_id : ''}</div>
                        </div>` : ''}
                    </div>
                `;

                L.marker([dc.latitude, dc.longitude], { icon })
                    .addTo(map)
                    .bindPopup(popupHtml, { maxWidth: 320 });
            });

            // Bottom panels
            renderMapPanels(totalDCs, providers, pueSum / (pueCount || 1), bestPUE, bestPUE_name, worstPUE, worstPUE_name);

        } catch (err) {
            console.error("Error cargando datos del mapa:", err);
        }
    }

    function renderMapPanels(totalDCs, providers, avgPUE, bestPUE, bestName, worstPUE, worstName) {
        const panels = document.getElementById("map-panels");
        if (!panels) return;

        const provBadges = Object.entries(providers).map(([p, count]) => {
            const c = getProviderColor(p);
            return `<span class="provider-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${p} (${count})</span>`;
        }).join(' ');

        const puePct = Math.max(0, Math.min(100, ((2.0 - avgPUE) / (2.0 - 1.0)) * 100));

        panels.innerHTML = `
            <div class="map-panel">
                <h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> Resumen del dataset</h3>
                <div class="map-stat">
                    <span class="map-stat-label">Total Data Centers</span>
                    <span class="map-stat-value">${totalDCs}</span>
                </div>
                <div class="map-stat">
                    <span class="map-stat-label">Proveedores</span>
                    <span>${provBadges}</span>
                </div>
                <div class="map-stat">
                    <span class="map-stat-label">PUE medio</span>
                    <span class="map-stat-value">${avgPUE.toFixed(2)}</span>
                </div>
                <div class="pue-bar"><div class="pue-bar-fill" style="width:${puePct}%;background:var(--primary)"></div></div>
                <div class="map-stat">
                    <span class="map-stat-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg> Mejor PUE</span>
                    <span class="map-stat-value" style="color:#4ade80">${bestPUE.toFixed(2)} <span style="font-size:10px;color:#5a7a64">${bestName}</span></span>
                </div>
                <div class="map-stat">
                    <span class="map-stat-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> Peor PUE</span>
                    <span class="map-stat-value" style="color:#ef4444">${worstPUE.toFixed(2)} <span style="font-size:10px;color:#5a7a64">${worstName}</span></span>
                </div>
            </div>
            <div class="map-panel">
                <h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> Recomendaciones</h3>
                <div class="map-rec"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> Elige data centers en países con baja intensidad de carbono (&lt;100 gCO₂/kWh)</div>
                <div class="map-rec"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> Prioriza proveedores con PUE bajo — valores cercanos a 1.0 son ideales</div>
                <div class="map-rec"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> Desconfía de claims de renovables si el CI del país es alto (greenwashing)</div>
                <div class="map-rec"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> GCP en Nórdicos ofrece la mejor combinación de PUE bajo + grid verde</div>
                <div class="map-rec"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> Usa modelos más pequeños y eficientes para consultas simples</div>
            </div>
        `;
    }

    // ------------------------------------------------------------------
    // Utilities
    // ------------------------------------------------------------------
    function switchToTab(tabId) {
        const btn = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (btn) btn.click();
    }

    function formatNum(n) {
        if (n == null) return "0";
        if (typeof n !== "number") n = parseFloat(n);
        if (isNaN(n)) return "0";
        if (Math.abs(n) < 0.001) return n.toExponential(2);
        if (Math.abs(n) < 1) return n.toFixed(4);
        if (Math.abs(n) < 100) return n.toFixed(2);
        return n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
    }

    function showError(msg) {
        let existing = document.querySelector(".error-msg");
        if (existing) existing.remove();
        const div = document.createElement("div");
        div.className = "error-msg";
        div.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:6px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${msg}`;
        document.querySelector(".container").prepend(div);
        setTimeout(() => div.remove(), 8000);
    }

})();

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
    let pieChart = null, barChart = null, projChart = null;

    // Custom panel state — tracks which custom panels are active
    const CUSTOM_ACTIVE = { model: false, dc: false, device: false };

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
        initCustomPanels();
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
                // When comparador tab becomes visible, resize charts so they
                // fill the now-visible container (fixes blurry canvas + tooltip offset)
                if (tabId === 'comparador') {
                    requestAnimationFrame(() => {
                        if (scatterChart) scatterChart.resize();
                        if (radarChart) radarChart.resize();
                        if (vertBarChart) vertBarChart.resize();
                    });
                }
                if (tabId === 'simulacion') {
                    initSimulacionPresets();
                }
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
    // Custom value panels
    // ------------------------------------------------------------------
    function initCustomPanels() {
        // Mapping: panelId → { stateKey, selectId }
        const PANELS = {
            "custom-model-panel":  { stateKey: "model",  selectId: "model_id" },
            "custom-dc-panel":     { stateKey: "dc",     selectId: "data_center_id" },
            "custom-device-panel": { stateKey: "device", selectId: "device_id" },
        };

        // Toggle buttons: open panel → disable select, set __custom__
        document.querySelectorAll(".btn-custom-toggle").forEach(btn => {
            btn.addEventListener("click", () => {
                const panelId = btn.dataset.target;
                const cfg = PANELS[panelId];
                if (!cfg) return;
                const panel = document.getElementById(panelId);
                const sel = document.getElementById(cfg.selectId);
                if (!panel || !sel) return;

                CUSTOM_ACTIVE[cfg.stateKey] = true;
                panel.style.display = "block";
                sel.disabled = true;
                sel.value = "";  // clear dataset selection
                btn.style.display = "none";
                if (window.lucide) lucide.createIcons();
                // Si es el panel de dispositivo: resetear el Paso 5 a "auto"
                // para que quede sincronizado con el primary_inference_target
                // que el usuario defina en el panel custom. El usuario puede
                // cambiarlo conscientemente después.
                if (cfg.stateKey === "device") {
                    const procSel = document.getElementById("inference_processor");
                    if (procSel) { procSel.value = "auto"; procSel.style.display = "none"; }
                    updateCustomDeviceProcInfo();
                }
            });
        });

        // Cancel buttons: close panel → re-enable select
        document.querySelectorAll(".btn-custom-cancel").forEach(btn => {
            btn.addEventListener("click", () => {
                const panelId = btn.dataset.target;
                const cfg = PANELS[panelId];
                if (!cfg) return;

                closeCustomPanel(panelId, cfg);
            });
        });
    }

    function closeCustomPanel(panelId, cfg) {
        if (!cfg) {
            const PANELS = {
                "custom-model-panel":  { stateKey: "model",  selectId: "model_id" },
                "custom-dc-panel":     { stateKey: "dc",     selectId: "data_center_id" },
                "custom-device-panel": { stateKey: "device", selectId: "device_id" },
            };
            cfg = PANELS[panelId];
        }
        if (!cfg) return;
        const panel = document.getElementById(panelId);
        const sel = document.getElementById(cfg.selectId);
        const toggleBtn = document.querySelector(`.btn-custom-toggle[data-target="${panelId}"]`);

        CUSTOM_ACTIVE[cfg.stateKey] = false;
        if (panel) panel.style.display = "none";
        if (sel) { sel.disabled = false; }
        if (toggleBtn) toggleBtn.style.display = "";
        // Si era el panel de dispositivo, restaurar opciones del Paso 5 y limpiar proc-info
        if (cfg && cfg.stateKey === "device") {
            _resetProcSelectOptions();
            // Mostrar de nuevo el select del Paso 5
            const procSelect = document.getElementById("inference_processor");
            if (procSelect) procSelect.style.display = "";
            showInfo("device-info", null);
            showInfo("proc-info", null);
            const hintEl = document.getElementById("proc-custom-hint");
            if (hintEl) { hintEl.style.display = "none"; hintEl.innerHTML = ""; }
        }
    }

    function closeAllCustomPanels() {
        ["custom-model-panel", "custom-dc-panel", "custom-device-panel"].forEach(id => {
            closeCustomPanel(id);
        });
    }

    // ------------------------------------------------------------------
    // Load example data
    // ------------------------------------------------------------------
    function loadExample() {
        if (!OPTIONS.models || !OPTIONS.models.length) {
            showError("Espera a que carguen los catálogos antes de cargar el ejemplo.");
            return;
        }

        // Close any open custom panels first
        closeAllCustomPanels();

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

        // Visual feedback on button — disable to prevent re-loading
        const btn = document.getElementById('btn-load-example');
        if (btn) {
            btn.classList.add('loaded');
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Ejemplo cargado';
            btn.disabled = true;
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

        // Paso 5 listener unificado: cubre modo normal y modo custom
        document.getElementById("inference_processor")?.addEventListener("change", () => {
            if (CUSTOM_ACTIVE.device) {
                // Paso 5 → Paso 4: sincronizar primary_inference_target con lo seleccionado
                const procSel = document.getElementById("inference_processor")?.value || "auto";
                if (procSel !== "auto" && procSel !== "") {
                    const primarySel = document.getElementById("custom_device_primary_inference_target");
                    if (primarySel) primarySel.value = procSel;
                }
                updateCustomDeviceProcInfo();
            } else {
                const devId = document.getElementById("device_id")?.value;
                updateDeviceInfo(devId);
            }
        });

        // Listeners para actualizar proc-info en tiempo real cuando se editan
        // los campos del dispositivo personalizado (Paso 4 → repercute en Paso 5)
        const CUSTOM_DEVICE_PROC_FIELDS = [
            "custom_device_primary_inference_target",
            "custom_device_gpu_tdp_watts",
            "custom_device_npu_tdp_watts",
            "custom_device_inference_cpu_watts",
            "custom_device_inference_gpu_watts",
            "custom_device_inference_npu_watts",
        ];
        CUSTOM_DEVICE_PROC_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const handler = () => {
                if (!CUSTOM_ACTIVE.device) return;
                // Paso 4 → Paso 5: si cambia el procesador primario, resetear Paso 5 a
                // "auto" para que ambos queden sincronizados. El usuario puede luego
                // escoger un procesador específico en Paso 5 conscientemente.
                if (id === "custom_device_primary_inference_target") {
                    const procSel = document.getElementById("inference_processor");
                    if (procSel) procSel.value = "auto";
                }
                updateCustomDeviceProcInfo();
            };
            el.addEventListener("change", handler);
            el.addEventListener("input",  handler);
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
        // If custom device panel is active, delegate to custom logic
        if (CUSTOM_ACTIVE.device) {
            updateCustomDeviceProcInfo();
            return;
        }
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
        // Restore all options (in case they were disabled by a previous custom session)
        _resetProcSelectOptions();
        showInfo("proc-info", [
            isAuto
                ? `Auto → <strong>${target.toUpperCase()}</strong> (${fmtVal(watts) || "?"}W, óptimo para este dispositivo)`
                : `Usando <strong>${target.toUpperCase()}</strong>: ${fmtVal(watts) || "?"}W`,
        ]);
    }

    /** Actualiza proc-info y deshabilita/habilita opciones del Paso 5
     *  en función de los datos introducidos en el panel personalizado (Paso 4). */
    function updateCustomDeviceProcInfo() {
        const getN = id => { const v = document.getElementById(id)?.value; return v !== "" && v != null ? parseFloat(v) : 0; };
        const getS = id => document.getElementById(id)?.value || "";

        // primaryRaw = "" si aún no ha seleccionado nada; primary = valor para cálculos
        const primaryRaw = document.getElementById("custom_device_primary_inference_target")?.value || "";
        const primary = primaryRaw || "cpu";
        const gpuTdp  = getN("custom_device_gpu_tdp_watts");
        const npuTdp  = getN("custom_device_npu_tdp_watts");
        const cpuInf  = getN("custom_device_inference_cpu_watts");
        const gpuInf  = getN("custom_device_inference_gpu_watts");
        const npuInf  = getN("custom_device_inference_npu_watts");

        // Procesadores disponibles: CPU siempre, GPU/NPU si TDP > 0 O si son el primario
        // (si son el primario el backend estimará el TDP)
        const available = ["cpu"];
        if (gpuTdp > 0 || primary === "gpu") available.push("gpu");
        if (npuTdp > 0 || primary === "npu") available.push("npu");

        // Actualizar opciones del select Paso 5: deshabilitar las no disponibles
        const procSelect = document.getElementById("inference_processor");
        if (procSelect) {
            procSelect.querySelectorAll("option").forEach(opt => {
                if (opt.value === "" || opt.value === "auto" || opt.value === "cpu") {
                    opt.disabled = false;
                } else {
                    opt.disabled = !available.includes(opt.value);
                    if (opt.disabled && procSelect.value === opt.value) {
                        // Si la opción actualmente seleccionada queda deshabilitada → resetear a auto
                        procSelect.value = "auto";
                    }
                }
            });
        }

        const procSel = procSelect?.value || "auto";
        const effective = procSel === "auto" ? primary : procSel;
        const wattsMap = { cpu: cpuInf, gpu: gpuInf, npu: npuInf };
        const watts = wattsMap[effective] || null;

        // Aviso contextual en Paso 5 (el select ya esta oculto desde que se abrio el panel)
        const hintEl = document.getElementById("proc-custom-hint");
        if (hintEl) {
            if (!primaryRaw) {
                // Paso 4 aún no tiene procesador seleccionado
                hintEl.innerHTML = `<span class="proc-hint-pending">↑ Selecciona el procesador principal en el Paso 4.</span>`;
                hintEl.style.display = "block";
            } else {
                // Paso 4 ya tiene procesador – el select queda oculto
                hintEl.innerHTML = `<span class="proc-hint-ok">✓ Procesador definido en el Paso 4: <strong>${primary.toUpperCase()}</strong>. El modo «Auto» lo respetará.</span>`;
                hintEl.style.display = "block";
            }
        }

        if (procSel === "auto") {
            showInfo("proc-info", primary
                ? [`Auto → <strong>${effective.toUpperCase()}</strong> (${watts ? fmtVal(watts) + "W" : "?W"}, procesador principal del dispositivo personalizado)`]
                : null
            );
        } else if (!available.includes(effective)) {
            showInfo("proc-info", [
                `<span style="color:var(--secondary)">⚠ ${effective.toUpperCase()} no disponible: TDP = 0 W. Introduce los watios de ${effective.toUpperCase()} o selecciona otro procesador.</span>`,
            ]);
        } else {
            showInfo("proc-info", [
                `Usando <strong>${effective.toUpperCase()}</strong>: ${watts ? fmtVal(watts) + "W" : "?W"}`,
            ]);
        }
    }

    /** Restaura todas las opciones del select de procesador (las que pudieran haber
     *  quedado deshabilitadas al volver del modo personalizado). */
    function _resetProcSelectOptions() {
        const procSelect = document.getElementById("inference_processor");
        if (procSelect) {
            procSelect.querySelectorAll("option").forEach(opt => { opt.disabled = false; });
        }
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

    function renderEstimatedBanner(fields) {
        const banner = document.getElementById("estimated-fields-banner");
        if (!banner) return;
        if (!fields || !fields.length) {
            banner.style.display = "none";
            return;
        }
        const items = fields.map(f => `<li>${f}</li>`).join("");
        banner.innerHTML = `
            <div class="estimated-banner-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <strong>Datos incompletos</strong> — Este cálculo incluye valores genéricos estimados que pueden diferir significativamente de la realidad.
            </div>
            <ul class="estimated-banner-list">${items}</ul>
            <p class="estimated-banner-tip">Para mayor precisión, rellena estos campos en el panel personalizado del formulario.</p>
        `;
        banner.style.display = "block";
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

        // Validación cruzada Paso 4 (dispositivo custom) ↔ Paso 5 (procesador)
        if (CUSTOM_ACTIVE.device) {
            const procSel = document.getElementById("inference_processor")?.value || "auto";
            if (procSel !== "auto" && procSel !== "cpu") {
                const gpuTdp = parseFloat(document.getElementById("custom_device_gpu_tdp_watts")?.value) || 0;
                const npuTdp = parseFloat(document.getElementById("custom_device_npu_tdp_watts")?.value) || 0;
                if (procSel === "gpu" && gpuTdp <= 0) {
                    showError("GPU no disponible en el dispositivo personalizado: el campo «GPU TDP (W)» está a 0. Introduce los watios de GPU o cambia el procesador del Paso 5.");
                    btn.disabled = false;
                    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Calcular emisiones';
                    return;
                }
                if (procSel === "npu" && npuTdp <= 0) {
                    showError("NPU no disponible en el dispositivo personalizado: el campo «NPU TDP (W)» está a 0. Introduce los watios de NPU o cambia el procesador del Paso 5.");
                    btn.disabled = false;
                    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Calcular emisiones';
                    return;
                }
            }
        }

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
        const getNum = id => { const v = get(id); return v !== "" ? parseFloat(v) : null; };
        const params = {
            model_id: CUSTOM_ACTIVE.model ? "__custom__" : get("model_id"),
            data_center_id: CUSTOM_ACTIVE.dc ? "__custom__" : get("data_center_id"),
            device_id: CUSTOM_ACTIVE.device ? "__custom__" : get("device_id"),
            network_id: get("network_id"),
            inference_processor: get("inference_processor") || "auto",
            utilization: parseFloat(get("utilization")) / 100,
        };
        const rt = get("request_type");
        if (rt) params.request_type = rt;
        const country = get("user_country");
        if (country) params.user_country = country;

        // Attach custom dicts when active.
        // IMPORTANTE: solo enviar campos con valor real; el backend se encarga
        // de estimar los restantes de forma inteligente (autocompletado bidireccional).
        const filterNulls = obj => Object.fromEntries(
            Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "")
        );

        if (CUSTOM_ACTIVE.model) {
            const raw = {
                model_name: get("custom_model_name") || null,
                num_parameters: getNum("custom_model_num_parameters"),
                energy_wh_per_1k_tokens: getNum("custom_model_energy_wh_per_1k_tokens"),
                latency_ms_per_token: getNum("custom_model_latency_ms_per_token"),
            };
            // Convertir parámetros de B → número raw antes de filtrar
            if (raw.num_parameters != null) {
                raw.num_parameters = raw.num_parameters * 1e9;
            }
            params.custom_model = filterNulls(raw);
        }
        if (CUSTOM_ACTIVE.dc) {
            const raw = {
                dc_name: get("custom_dc_region") || null,
                region: get("custom_dc_region") || null,
                country_code: get("custom_dc_country_code") || null,
                pue: getNum("custom_dc_pue"),
                provider_renewable_pct: getNum("custom_dc_provider_renewable_pct"),
            };
            params.custom_dc = filterNulls(raw);
        }
        if (CUSTOM_ACTIVE.device) {
            const raw = {
                device_name: get("custom_device_name") || null,
                primary_inference_target: get("custom_device_primary_inference_target") || null,
                system_idle_watts: getNum("custom_device_system_idle_watts"),
                cpu_tdp_watts: getNum("custom_device_cpu_tdp_watts"),
                inference_cpu_watts: getNum("custom_device_inference_cpu_watts"),
                gpu_tdp_watts: getNum("custom_device_gpu_tdp_watts"),
                inference_gpu_watts: getNum("custom_device_inference_gpu_watts"),
                npu_tdp_watts: getNum("custom_device_npu_tdp_watts"),
                inference_npu_watts: getNum("custom_device_inference_npu_watts"),
            };
            params.custom_device = filterNulls(raw);
        }
        return params;
    }

    // ------------------------------------------------------------------
    // Results (Tab 2)
    // ------------------------------------------------------------------
    function renderResults(data) {
        document.getElementById("results-placeholder").style.display = "none";
        document.getElementById("results-content").style.display = "block";

        // Mostrar banner si hay campos estimados
        renderEstimatedBanner(data.estimated_fields || null);

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
        // La simulación se activa explícitamente desde renderSimulation(); no tocar su estado aquí.

        doCompare();
        updateMapPopups();
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
            icon: "cpu",
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
        const fs = data.formula_steps || {};
        const meta = data.metadata || {};
        const dcRen = data.datacenter_renewable_info || {};

        // Destroy old charts
        if (pieChart) pieChart.destroy();
        if (barChart) barChart.destroy();

        const pieCtx = document.getElementById("pie-chart")?.getContext("2d");
        const barCtx = document.getElementById("bar-chart")?.getContext("2d");
        if (!pieCtx || !barCtx) return;

        const _lm = document.body.classList.contains('light-mode');
        const _legendClr = _lm ? '#1e3a28' : '#86efac';
        const _pieBorder = _lm ? 'rgba(240,247,241,0.9)' : 'rgba(255,255,255,0.25)';

        pieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Dispositivo', 'Red', 'Data Center'],
                datasets: [{
                    data: [em.device, em.network, em.datacenter],
                    backgroundColor: ['#38bdf8', '#f97316', '#4ade80'],
                    borderColor: _pieBorder,
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
                    legend: { position: 'bottom', labels: { padding: 16, color: _legendClr } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.parsed;
                                if (val == null) return '';
                                // Find the minimum number of decimal places to show a non-zero value
                                let decimals = 4;
                                while (decimals < 10 && parseFloat(val.toFixed(decimals)) === 0) decimals++;
                                return ` ${ctx.label}: ${val.toFixed(decimals)} gCO₂`;
                            }
                        }
                    }
                }
            }
        });

        const _tickClr = _lm ? '#1e3a28' : '#94a3b1';
        const _axisClr = _lm ? '#14532d' : '#7a9e88';
        const _gridClr = _lm ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.12)';

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
                    x: { grid: { display: false }, ticks: { color: _tickClr } },
                    y: {
                        grid: { color: _gridClr },
                        ticks: { color: _axisClr },
                        title: { display: true, text: 'Wh', color: _axisClr }
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
                            ctx.fillStyle = document.body.classList.contains('light-mode') ? '#0f2714' : '#e8f0eb';
                            ctx.font = '600 11px JetBrains Mono';
                            ctx.textAlign = 'center';
                            ctx.fillText(val != null ? formatNum(val) : '', bar.x, bar.y - 6);
                            ctx.restore();
                        });
                    });
                }
            }]
        });

        // ── Detailed breakdown table + key metrics ──────────────────
        const detailCards = document.getElementById("dashboard-detail-cards");
        if (detailCards) {
            const ciLocal = fs.device?.ci_gCO2_kWh ?? 0;
            const ciDC = fs.datacenter?.ci_gCO2_kWh ?? dcRen.carbon_intensity_gCO2_kWh ?? 0;
            const pue = fs.datacenter?.pue ?? 1.15;
            const latencyMs = meta.inference_time_sec ? (meta.inference_time_sec * 1000).toFixed(0) : '?';
            const tokensOut = meta.tokens_processed ? meta.tokens_processed : '?';
            const dcName = meta.data_center || '';

            const rows = [
                { label: 'Dispositivo', energy: en.device, ci: ciLocal, co2: em.device, pct: (em.device / (em.total||1) * 100) },
                { label: 'Red',         energy: en.network, ci: ciLocal, co2: em.network, pct: (em.network / (em.total||1) * 100) },
                { label: 'Data Center', energy: en.datacenter, ci: ciDC, co2: em.datacenter, pct: (em.datacenter / (em.total||1) * 100) },
            ];

            detailCards.innerHTML = `
                <div class="card-title"><i data-lucide="table-2"></i> Datos técnicos detallados</div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead><tr>
                            <th>Componente</th>
                            <th>Energía (Wh)</th>
                            <th>CI (gCO₂/kWh)</th>
                            <th>CO₂ (gCO₂)</th>
                            <th>% del Total</th>
                        </tr></thead>
                        <tbody>
                            ${rows.map(r => `<tr>
                                <td>${r.label}</td>
                                <td class="mono">${formatNum(r.energy)}</td>
                                <td class="mono">${r.ci ? Math.round(r.ci) : '—'}</td>
                                <td class="mono">${formatNum(r.co2)}</td>
                                <td><span class="pct-bar-wrap"><span class="pct-bar-fill" style="width:${Math.min(100,r.pct).toFixed(1)}%"></span></span> ${r.pct.toFixed(1)}%</td>
                            </tr>`).join('')}
                        </tbody>
                        <tfoot><tr>
                            <td><strong>TOTAL</strong></td>
                            <td class="mono"><strong>${formatNum(en.total)}</strong></td>
                            <td class="mono">—</td>
                            <td class="mono"><strong>${formatNum(em.total)}</strong></td>
                            <td><strong>100%</strong></td>
                        </tr></tfoot>
                    </table>
                </div>
                <div class="dash-kpi-grid">
                    ${dashKpi('CI local (' + (LAST_PARAMS?.user_country || 'ES') + ')', Math.round(ciLocal), 'gCO₂/kWh', 'zap')}
                    ${dashKpi('CI Data Center', Math.round(ciDC), 'gCO₂/kWh', 'server')}
                    ${dashKpi('PUE', pue.toFixed(4), dcName, 'activity')}
                    ${dashKpi('Latencia total', latencyMs, 'ms (' + tokensOut + ' tokens output)', 'timer')}
                </div>
            `;
            if (window.lucide) setTimeout(() => lucide.createIcons(), 50);
        }

        // ── Greenwashing section ──────────────────────────────────────
        const gwDiv = document.getElementById("dashboard-greenwashing");
        if (gwDiv) {
            const gridPct   = dcRen.grid_renewable_pct   != null ? Math.round(dcRen.grid_renewable_pct)   : null;
            const claimPct  = dcRen.provider_claimed_pct != null ? Math.round(dcRen.provider_claimed_pct) : null;
            const hasBoth   = gridPct != null && claimPct != null;
            const gap       = hasBoth ? claimPct - gridPct : 0;
            const isGW      = gap > 5;

            const gwAlert = isGW
                ? `<div class="gw-alert gw-alert-warn">
                    <strong>Posible greenwashing:</strong> El proveedor declara <strong>${claimPct}% renovables</strong> (vía PPAs y certificados),
                    pero la red eléctrica real de la zona solo tiene <strong>${gridPct}% renovables</strong>.
                    La diferencia de <strong>${gap} puntos porcentuales</strong> se cubre con certificados de energía renovable,
                    no con energía verde real en la red.
                   </div>`
                : gridPct != null
                    ? `<div class="gw-alert gw-alert-ok">Los datos del proveedor son coherentes con el mix real de la red eléctrica.</div>`
                    : '';

            const barsHtml = hasBoth ? `
                <div class="gw-bars">
                    <div class="gw-bar-label">Renovables reales en la red <span class="gw-tag gw-tag-grid">(renewable_grid_pct)</span></div>
                    <div class="gw-bar-track"><div class="gw-bar-fill gw-bar-grid" style="width:${gridPct}%"></div></div>
                    <div class="gw-bar-pct">${gridPct}%</div>
                    <div class="gw-bar-label" style="margin-top:10px">Declarado por proveedor <span class="gw-tag gw-tag-claim">(provider_renewable_pct)</span></div>
                    <div class="gw-bar-track"><div class="gw-bar-fill gw-bar-claim" style="width:${claimPct}%"></div></div>
                    <div class="gw-bar-pct gw-pct-claim">${claimPct}%</div>
                </div>` : `<p class="gw-na">No hay datos de renovables disponibles para este data center.</p>`;

            gwDiv.innerHTML = `
                <div class="card-title"><i data-lucide="leaf"></i> Renovables reales vs. declaradas — Greenwashing</div>
                <p class="gw-intro">Diferencia entre el porcentaje de renovables en la red eléctrica real de la zona
                    (<code>renewable_grid_pct</code>) y el porcentaje declarado por el proveedor mediante PPAs y certificados
                    (<code>provider_renewable_pct</code>).</p>

                ${barsHtml}
                ${gwAlert}

                <details class="gw-explainer">
                    <summary><strong>¿Qué es el greenwashing energético?</strong></summary>
                    <div class="gw-explainer-body">
                        <p>El <strong>greenwashing energético</strong> ocurre cuando una empresa declara consumir más energía
                        renovable de la que realmente existe en la red eléctrica que alimenta sus instalaciones.
                        Esto se logra mediante tres mecanismos principales:</p>
                        <ol>
                            <li><strong>PPAs (Power Purchase Agreements):</strong> contratos a largo plazo con productores
                            de energía renovable que permiten "reclamar" esa energía aunque físicamente fluya por la red
                            general, no directamente hacia el data center.</li>
                            <li><strong>RECs / GOs (Renewable Energy Certificates / Garantías de Origen):</strong> certificados
                            negociables que acreditan que un MWh fue generado de forma renovable. Un proveedor compra estos
                            certificados de otro país o región con más solar/eólica, sin que su mix local cambie en absoluto.</li>
                            <li><strong>Additionality gap:</strong> la energía renovable contratada puede ser de instalaciones
                            ya existentes, por lo que no supone nueva capacidad verde añadida a la red ni reduce las emisiones
                            reales del sistema eléctrico.</li>
                        </ol>
                        <p>El indicador clave es la diferencia entre <code>renewable_grid_pct</code> (mix real de la red
                        según Electricity Maps) y <code>provider_renewable_pct</code> (declarado en la web del proveedor).
                        Una diferencia elevada no implica fraude, pero sí que <em>el carbono real emitido
                        por la red</em> que alimenta al data center es mayor que el que se contabiliza en las
                        declaraciones de sostenibilidad del proveedor.</p>
                    </div>
                </details>
            `;
            if (window.lucide) setTimeout(() => lucide.createIcons(), 50);
        }
    }

    function dashKpi(label, value, unit, icon) {
        return `<div class="dash-kpi">
            <div class="dash-kpi-icon"><i data-lucide="${icon}"></i></div>
            <div class="dash-kpi-label">${label}</div>
            <div class="dash-kpi-value">${value}</div>
            <div class="dash-kpi-unit">${unit}</div>
        </div>`;
    }

    // ------------------------------------------------------------------
    // Comparator (Tab 4) — Multi-criteria Pareto Analysis
    // ------------------------------------------------------------------

    // Lookup table de MMLU scores (fuente: papers publicados / Open LLM Leaderboard)
    // Escala 0.0–1.0. null = sin dato conocido (se usará fallback por parámetros)
    const MODEL_QUALITY_SCORES = {
        'GPT-4':            0.864,
        'PaLM 2':           0.780,
        'OPT 175B':         0.260,
        'Claude 2':         0.785,
        'Llama 2 (70B)':    0.685,
        'Falcon 40B':       0.551,
        'MPT 30B':          0.460,
        'Gemma 7B':         0.643,
        'Mistral 7B':       0.628,
        'Phi-2':            0.570,
        'Claude 3 Haiku':   0.752,
        'Llama 3 70B':      0.820,
        'Mixtral 8x7B':     0.706,
        'Phi-3 Mini':       0.688,
        'Gemma 2 9B':       0.715,
    };

    function getQualityScore(modelName, numParameters) {
        if (MODEL_QUALITY_SCORES[modelName] != null) return MODEL_QUALITY_SCORES[modelName];
        // Fallback estimado por tamaño de modelo cuando no hay dato conocido
        if (!numParameters) return null;
        const paramsB = numParameters / 1e9;
        return Math.min(0.90, 0.25 + 0.35 * Math.log10(Math.max(paramsB, 0.1)) / Math.log10(1700));
    }

    let scatterChart = null, vertBarChart = null, radarChart = null;

    // Centralized energy class theme
    const ENERGY_CLASSES = {
        'A+++': { color: '#00e676', bg: 'rgba(0,230,118,0.15)' },
        'A++':  { color: '#00e676', bg: 'rgba(0,230,118,0.12)' },
        'A+':   { color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
        'A':    { color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
        'B':    { color: '#ffd600', bg: 'rgba(255,214,0,0.10)' },
        'C':    { color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
        'D':    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
        'E':    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
    };

    // Pareto state (shared across scatter, tabs, matrix)
    const PS = {
        criteria: { co2: true, speed: true, latency: false, params: false, quality: false },
        scaleLog: true,
        referenceModel: null,
        selectedModels: [],
        topsisWeights: { co2: 0.35, speed: 0.30, latency: 0.20, quality: 0.15 },
        highlightPair: null,
        table: [],
        paretoModels: [],
        currentModel: '',
        pulsePhase: 0,
        pulseRAF: null,
    };

    async function doCompare() {
        if (!LAST_PARAMS) return;
        const params = { ...LAST_PARAMS };
        // Mantener custom_model si estaba presente (modelo personalizado)
        if (params.model_id !== '__custom__') {
            delete params.custom_model;
        }
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
        } catch (err) { console.error("Error en comparación:", err); }
    }

    // ── Color helpers ──
    function getBarColor(label) {
        if (!label) return 'rgba(0,230,118,0.6)';
        const l = (typeof label === 'string' ? label : '').toUpperCase();
        if (l.includes('A')) return 'rgba(0,230,118,0.7)';
        if (l === 'B') return 'rgba(255,214,0,0.7)';
        if (l === 'C') return 'rgba(249,115,22,0.7)';
        return 'rgba(239,68,68,0.7)';
    }
    function getBarColorSolid(label) {
        if (!label) return '#00e676';
        const l = (typeof label === 'string' ? label : '').toUpperCase();
        if (l.includes('A')) return '#00e676';
        if (l === 'B') return '#ffd600';
        if (l === 'C') return '#f97316';
        return '#ef4444';
    }
    function getLabelBadge(labelObj) {
        if (!labelObj) return '<span class="label-badge" style="background:rgba(100,100,100,.2);color:#999">?</span>';
        const color = labelObj.color_hex || '#999';
        return `<span class="label-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${labelObj.label || '?'}</span>`;
    }
    function sciNotation(n) {
        if (n == null || isNaN(n)) return '—';
        if (n === 0) return '0';
        if (Math.abs(n) >= 0.01 && Math.abs(n) < 1000) return formatNum(n);
        const exp = Math.floor(Math.log10(Math.abs(n)));
        const mantissa = (n / Math.pow(10, exp)).toFixed(2);
        return `<span class="sci-mantissa">${mantissa}</span><span class="sci-exp">×10<sup>${exp}</sup></span>`;
    }
    function formatParams(n) {
        if (!n) return '—';
        if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
        if (n >= 1e9) return (n / 1e9).toFixed(0) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
        return n.toLocaleString('es-ES');
    }

    // ── Flexible Pareto detection (multi-criteria) ──
    function findParetoOptimal(rows) {
        const c = PS.criteria;
        const pareto = [];
        for (const r of rows) {
            const dominated = rows.some(other => {
                if (other === r) return false;
                let dominated_all = true, better_one = false;
                if (c.co2) {
                    if (other.co2_gCO2 > r.co2_gCO2) dominated_all = false;
                    if (other.co2_gCO2 < r.co2_gCO2) better_one = true;
                }
                if (c.speed) {
                    const ot = other.tokens_per_second || 0, rt = r.tokens_per_second || 0;
                    if (ot < rt) dominated_all = false;
                    if (ot > rt) better_one = true;
                }
                if (c.latency) {
                    const ol = other.latency_ms_per_token || Infinity, rl = r.latency_ms_per_token || Infinity;
                    if (ol > rl) dominated_all = false;
                    if (ol < rl) better_one = true;
                }
                if (c.params) {
                    const op = other.num_parameters || 0, rp = r.num_parameters || 0;
                    if (op > rp) dominated_all = false;
                    if (op < rp) better_one = true;
                }
                if (c.quality) {
                    const oq = other.benchmark_score || 0, rq = r.benchmark_score || 0;
                    if (oq < rq) dominated_all = false;
                    if (oq > rq) better_one = true;
                }
                return dominated_all && better_one;
            });
            if (!dominated) pareto.push(r.model);
        }
        return pareto;
    }

    // ── TOPSIS algorithm ──
    function calculateTOPSIS(models, weights) {
        const criteria = [
            { key: 'co2_gCO2', w: weights.co2, benefit: false },
            { key: 'tokens_per_second', w: weights.speed, benefit: true },
            { key: 'latency_ms_per_token', w: weights.latency, benefit: false },
            { key: 'benchmark_score', w: weights.quality || 0, benefit: true },
        ].filter(c => c.w > 0);
        const n = models.length, m = criteria.length;
        // Decision matrix
        const matrix = models.map(mdl => criteria.map(c => mdl[c.key] || 0));
        // Vector normalization
        const norm = matrix.map(row => [...row]);
        for (let j = 0; j < m; j++) {
            const sq = Math.sqrt(matrix.reduce((s, r) => s + r[j] * r[j], 0));
            if (sq > 0) for (let i = 0; i < n; i++) norm[i][j] = matrix[i][j] / sq;
        }
        // Weighted
        const w = norm.map(row => row.map((v, j) => v * criteria[j].w));
        // Ideal / anti-ideal
        const ideal = criteria.map((c, j) => {
            const col = w.map(r => r[j]);
            return c.benefit ? Math.max(...col) : Math.min(...col);
        });
        const anti = criteria.map((c, j) => {
            const col = w.map(r => r[j]);
            return c.benefit ? Math.min(...col) : Math.max(...col);
        });
        // Distances & closeness
        return w.map(row => {
            const dI = Math.sqrt(row.reduce((s, v, j) => s + (v - ideal[j]) ** 2, 0));
            const dA = Math.sqrt(row.reduce((s, v, j) => s + (v - anti[j]) ** 2, 0));
            return (dI + dA) > 0 ? dA / (dI + dA) : 0;
        });
    }

    // ── Dominance check (does A dominate B?) ──
    function dominates(a, b) {
        const c = PS.criteria;
        let dominated_all = true, better_one = false;
        if (c.co2) {
            if (a.co2_gCO2 > b.co2_gCO2) dominated_all = false;
            if (a.co2_gCO2 < b.co2_gCO2) better_one = true;
        }
        if (c.speed) {
            const at = a.tokens_per_second || 0, bt = b.tokens_per_second || 0;
            if (at < bt) dominated_all = false;
            if (at > bt) better_one = true;
        }
        if (c.latency) {
            const al = a.latency_ms_per_token || Infinity, bl = b.latency_ms_per_token || Infinity;
            if (al > bl) dominated_all = false;
            if (al < bl) better_one = true;
        }
        if (c.params) {
            const ap = a.num_parameters || 0, bp = b.num_parameters || 0;
            if (ap > bp) dominated_all = false;
            if (ap < bp) better_one = true;
        }
        if (c.quality) {
            const aq = a.benchmark_score || 0, bq = b.benchmark_score || 0;
            if (aq < bq) dominated_all = false;
            if (aq > bq) better_one = true;
        }
        return dominated_all && better_one;
    }

    // ══════════════════════════════════════════════════════════════════
    // MAIN ORCHESTRATOR
    // ══════════════════════════════════════════════════════════════════
    function renderComparison(data) {
        const table = data.comparative_table || [];
        if (table.length === 0) return;

        // Enriquecer cada fila con benchmark_score (calidad MMLU)
        table.forEach(row => {
            row.benchmark_score = getQualityScore(row.model, row.num_parameters);
        });

        PS.currentModel = LAST_PARAMS?.model_id || '';
        PS.table = table;
        PS.paretoModels = findParetoOptimal(table);
        // Resetear selección si los modelos previos ya no están en la tabla
        const tableNames = new Set(table.map(r => r.model));
        const validSelected = PS.selectedModels.filter(m => tableNames.has(m));
        PS.selectedModels = validSelected.length > 0 ? validSelected : table.slice(0, 3).map(r => r.model);

        // Actualizar modelos eficientes para la simulación
        MODELOS_EFICIENTES_SIM = buildModelosEficientes();
        if (MODELOS_EFICIENTES_SIM.length > 0) {
            SIM_STATE.modelo_eficiente = MODELOS_EFICIENTES_SIM[0].nombre;
            SIM_STATE.factor_eficiente = MODELOS_EFICIENTES_SIM[0].factor;
        }

        const sorted = [...table].sort((a, b) => a.co2_gCO2 - b.co2_gCO2);
        const maxCo2 = Math.max(...sorted.map(r => r.co2_gCO2));

        renderConfigBar(PS.currentModel);
        renderParetoConfigBar();
        renderParetoScatter();
        initParetoTabs();
        renderDominanceTab();
        renderTopsisTab();
        renderRadarTab();
        renderDominanceMatrix();
        renderDetailedTable(sorted, maxCo2, PS.currentModel);
        renderVerticalBarChart(sorted, PS.currentModel);

        if (window.lucide) lucide.createIcons();
    }

    // ══════════════════════════════════════════════════════════════════
    // CONFIG BAR (parameters + PDF)
    // ══════════════════════════════════════════════════════════════════
    function renderConfigBar(currentModel) {
        const bar = document.getElementById('comp-config-bar');
        if (!bar) return;
        const p = LAST_PARAMS || {};
        const modelObj = (OPTIONS.models || []).find(m => m.model_id === currentModel);
        const modelName = modelObj?.model_name || currentModel || '—';
        const dcObj = (OPTIONS.data_centers || []).find(d => d.dc_id === p.data_center_id);
        const dcLabel = dcObj ? `${dcObj.provider_name} (${dcObj.region || dcObj.dc_id})` : p.data_center_id || '—';
        const deviceName = (OPTIONS.devices || []).find(d => d.device_id === p.device_id)?.device_name || p.device_id || '—';

        bar.innerHTML = `
            <div class="comp-config-chips">
                <span class="comp-config-label">CONFIGURACIÓN ACTIVA</span>
                <span class="comp-chip"><strong>${formatRequestType(p.request_type || 'chat_simple')}</strong> ${p.tokens_input || '—'}+${p.tokens_output || '—'} tok</span>
                <span class="comp-chip" title="Modelo seleccionado">${modelName}</span>
                <span class="comp-chip" title="Data Center">${dcLabel}</span>
                <span class="comp-chip" title="Dispositivo">${deviceName}</span>
                <span class="comp-chip" title="Red">${p.network_id || '—'}</span>
                <span class="comp-chip" title="País">${p.user_country || 'ES'}</span>
                <span class="comp-chip" title="Procesador">${(p.inference_processor || 'auto').toUpperCase()}</span>
                <span class="comp-chip" title="Utilización">${p.utilization != null ? Math.round(p.utilization * 100) + '%' : '70%'}</span>
            </div>
            <button class="comp-btn-pdf" id="btn-comp-pdf" title="Descargar informe PDF">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                PDF
            </button>`;
        document.getElementById('btn-comp-pdf')?.addEventListener('click', () => exportComparatorPDF());
    }

    // ══════════════════════════════════════════════════════════════════
    // PARETO CONFIG BAR (criteria toggles, scale, reference, wizard)
    // ══════════════════════════════════════════════════════════════════
    function renderParetoConfigBar() {
        const bar = document.getElementById('pareto-config-bar');
        if (!bar) return;

        const models = PS.table;
        const currentModelName = (OPTIONS.models || []).find(m => m.model_id === PS.currentModel)?.model_name || '';

        bar.innerHTML = `
            <div class="pcfg-group">
                <span class="pcfg-label">CRITERIOS PARETO</span>
                <label class="pcfg-toggle"><input type="checkbox" id="pcrit-co2" ${PS.criteria.co2 ? 'checked' : ''}><span class="pcfg-check"></span> CO₂</label>
                <label class="pcfg-toggle"><input type="checkbox" id="pcrit-speed" ${PS.criteria.speed ? 'checked' : ''}><span class="pcfg-check"></span> Velocidad</label>
                <label class="pcfg-toggle"><input type="checkbox" id="pcrit-latency" ${PS.criteria.latency ? 'checked' : ''}><span class="pcfg-check"></span> Latencia</label>
                <label class="pcfg-toggle"><input type="checkbox" id="pcrit-params" ${PS.criteria.params ? 'checked' : ''}><span class="pcfg-check"></span> Tamaño modelo</label>
                <label class="pcfg-toggle"><input type="checkbox" id="pcrit-quality" ${PS.criteria.quality ? 'checked' : ''}><span class="pcfg-check"></span> Calidad</label>
            </div>
            <div class="pcfg-group">
                <span class="pcfg-label">ESCALA</span>
                <button class="pcfg-scale-btn ${PS.scaleLog ? 'active' : ''}" id="pcfg-log">Log</button>
                <button class="pcfg-scale-btn ${!PS.scaleLog ? 'active' : ''}" id="pcfg-lin">Linear</button>
            </div>
            <div class="pcfg-group">
                <span class="pcfg-label">REFERENCIA</span>
                <select class="pcfg-select" id="pcfg-ref">
                    <option value="">— Ninguno —</option>
                    ${models.map(m => `<option value="${m.model}" ${m.model === currentModelName ? 'selected' : ''}>${m.model}</option>`).join('')}
                </select>
            </div>
            <button class="pcfg-wizard-btn" id="pcfg-wizard">🧭 ¿Qué modelo me conviene?</button>
        `;

        // Criteria toggles
        ['co2', 'speed', 'latency', 'params', 'quality'].forEach(k => {
            document.getElementById(`pcrit-${k}`)?.addEventListener('change', e => {
                PS.criteria[k] = e.target.checked;
                PS.paretoModels = findParetoOptimal(PS.table);
                renderParetoScatter();
                renderDominanceTab();
                renderDominanceMatrix();
            });
        });
        // Scale toggle
        document.getElementById('pcfg-log')?.addEventListener('click', () => {
            PS.scaleLog = true;
            bar.querySelector('.pcfg-scale-btn.active')?.classList.remove('active');
            document.getElementById('pcfg-log').classList.add('active');
            renderParetoScatter();
        });
        document.getElementById('pcfg-lin')?.addEventListener('click', () => {
            PS.scaleLog = false;
            bar.querySelector('.pcfg-scale-btn.active')?.classList.remove('active');
            document.getElementById('pcfg-lin').classList.add('active');
            renderParetoScatter();
        });
        // Reference model
        document.getElementById('pcfg-ref')?.addEventListener('change', e => {
            PS.referenceModel = e.target.value || null;
            renderParetoScatter();
        });
        // Wizard
        document.getElementById('pcfg-wizard')?.addEventListener('click', () => showWizardModal());
    }

    // ══════════════════════════════════════════════════════════════════
    // ENHANCED PARETO SCATTER PLOT
    // ══════════════════════════════════════════════════════════════════
    function updateScatterDesc() {
        const el = document.getElementById('pareto-scatter-desc');
        if (!el) return;
        const names = [];
        if (PS.criteria.co2) names.push('CO₂');
        if (PS.criteria.speed) names.push('Velocidad');
        if (PS.criteria.latency) names.push('Latencia');
        if (PS.criteria.params) names.push('Tamaño modelo');
        if (PS.criteria.quality) names.push('Calidad (MMLU)');
        const n = names.length;
        const criteriaHtml = n > 0
            ? ` <span class="desc-dynamic"><strong>Criterios activos:</strong> ${names.join(', ')}. Un modelo ★ debe ser mejor en ${n === 1 ? 'ese criterio' : `esos ${n} criterios`} simultáneamente que cualquier otro. El tamaño del frente depende de los trade-offs reales del conjunto de datos.</span>`
            : '';
        const refHtml = PS.referenceModel
            ? ` <span class="desc-dynamic desc-dynamic--ref"><strong>Referencia activa: ${PS.referenceModel}.</strong> Las flechas cian parten de ese modelo hacia cada Pareto-óptimo, mostrando qué alternativas lo mejoran objetivamente en los criterios seleccionados.</span>`
            : '';
        const axesCriteria = PS.criteria.co2 && PS.criteria.speed;
        const extraCriteria = (PS.criteria.latency || PS.criteria.params) && !axesCriteria;
        const projNote = (!axesCriteria && (PS.criteria.co2 || PS.criteria.speed || PS.criteria.latency || PS.criteria.params))
            ? ' <em>Nota: los criterios activos no coinciden con los ejes del gráfico; la frontera step-after no se dibuja, pero los modelos ★ son correctamente Pareto-óptimos en las dimensiones seleccionadas.</em>'
            : '';
        const noCriteria = !PS.criteria.co2 && !PS.criteria.speed && !PS.criteria.latency && !PS.criteria.params && !PS.criteria.quality;
        const noCriteriaNote = noCriteria
            ? ' <em>Sin criterios activos, ningún modelo puede dominar a otro (no hay dimensiones de comparación), por lo que todos se consideran Pareto-óptimos. Activa al menos un criterio para obtener un frente significativo.</em>'
            : '';
        el.innerHTML = `Eje X: velocidad de inferencia (tokens/s). Eje Y: huella de CO₂ por consulta (gCO₂). El modelo ideal se sitúa abajo-derecha (rápido y limpio). Los modelos ★ son <strong>Pareto-óptimos</strong>: ningún otro modelo los supera simultáneamente en todos los criterios activos.${axesCriteria ? ' La zona sombreada en verde representa el <strong>frente de Pareto eficiente</strong>.' : ''} Arrastra sobre el gráfico para seleccionar múltiples modelos.${criteriaHtml}${projNote}${noCriteriaNote}${refHtml}`;
    }

    function renderParetoScatter() {
        updateScatterDesc();
        if (scatterChart) scatterChart.destroy();
        if (PS.pulseRAF) cancelAnimationFrame(PS.pulseRAF);
        const ctx = document.getElementById('scatter-chart')?.getContext('2d');
        if (!ctx) return;

        const table = PS.table;
        const paretoModels = PS.paretoModels;
        const currentModelName = (OPTIONS.models || []).find(m => m.model_id === PS.currentModel)?.model_name || '';

        const points = table
            .filter(r => r.tokens_per_second && r.tokens_per_second > 0)
            .map(r => ({
                x: r.tokens_per_second,
                y: r.co2_gCO2,
                model: r.model,
                org: r.organization || '',
                label: r.environmental_label?.label || '?',
                isPareto: paretoModels.includes(r.model),
                isCurrent: r.model === currentModelName,
                isCustom: !!r.is_custom,
                tps: r.tokens_per_second,
                latency: r.latency_ms_per_token,
                co2: r.co2_gCO2,
                envLabel: r.environmental_label,
                benchmark_score: r.benchmark_score,
            }));

        // Compute TOPSIS scores for point sizing
        const topsisScores = calculateTOPSIS(table, PS.topsisWeights);
        const scoreMap = {};
        table.forEach((r, i) => { scoreMap[r.model] = topsisScores[i]; });

        const bgColors = points.map(p => {
            if (p.isCustom) return '#00e5ff';
            if (p.isCurrent) return '#00e5ff';
            if (p.isPareto) return '#ffd600';
            const ec = ENERGY_CLASSES[p.label] || ENERGY_CLASSES['A'];
            return ec ? ec.color : '#00e676';
        });
        const borderColors = points.map(p => {
            if (p.isCustom) return '#00e5ff';
            if (p.isCurrent) return '#00e5ff';
            if (p.isPareto) return '#ffd600';
            return 'transparent';
        });
        const pointRadii = points.map(p => {
            const base = p.isCustom ? 12 : (p.isCurrent ? 11 : (p.isPareto ? 10 : 6));
            const tScore = scoreMap[p.model] || 0;
            return base + tScore * 3;
        });
        const borderWidths = points.map(p => p.isCustom ? 3.5 : (p.isCurrent ? 3 : (p.isPareto ? 2.5 : 0)));
        const pointStyles = points.map(p => p.isCustom ? 'rectRot' : (p.isPareto ? 'star' : 'circle'));
        const alphas = points.map(p => p.isPareto || p.isCurrent ? 1.0 : 0.6);

        // ── Pareto front plugin (only draws when both CO₂ & Speed are active) ──
        const paretoFrontPlugin = {
            id: 'paretoFront',
            beforeDatasetsDraw(chart) {
                if (!PS.criteria.co2 || !PS.criteria.speed) return;
                const c = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                const data = chart.data.datasets[0].data;
                const paretoPts = data
                    .map((d, i) => ({ ...d, px: meta.data[i]?.x, py: meta.data[i]?.y }))
                    .filter(d => d.isPareto && d.px != null)
                    .sort((a, b) => a.x - b.x);
                if (paretoPts.length < 2) return;

                const area = chart.chartArea;
                c.save();

                // Gradient fill under step-after line
                c.beginPath();
                c.moveTo(area.left, paretoPts[0].py);
                c.lineTo(paretoPts[0].px, paretoPts[0].py);
                for (let i = 1; i < paretoPts.length; i++) {
                    c.lineTo(paretoPts[i].px, paretoPts[i - 1].py);
                    c.lineTo(paretoPts[i].px, paretoPts[i].py);
                }
                c.lineTo(area.right, paretoPts[paretoPts.length - 1].py);
                c.lineTo(area.right, area.bottom);
                c.lineTo(area.left, area.bottom);
                c.closePath();
                const grad = c.createLinearGradient(0, area.top, 0, area.bottom);
                grad.addColorStop(0, 'rgba(0,200,100,0.04)');
                grad.addColorStop(1, 'rgba(0,200,100,0.00)');
                c.fillStyle = grad;
                c.fill();

                // Step-after line
                c.beginPath();
                c.strokeStyle = '#00e676';
                c.lineWidth = 2;
                c.setLineDash([8, 4]);
                c.moveTo(area.left, paretoPts[0].py);
                c.lineTo(paretoPts[0].px, paretoPts[0].py);
                for (let i = 1; i < paretoPts.length; i++) {
                    c.lineTo(paretoPts[i].px, paretoPts[i - 1].py);
                    c.lineTo(paretoPts[i].px, paretoPts[i].py);
                }
                c.lineTo(area.right, paretoPts[paretoPts.length - 1].py);
                c.stroke();
                c.setLineDash([]);
                c.restore();
            }
        };

        // ── Pulsing ring plugin ──
        const pulsePlugin = {
            id: 'pulseRing',
            afterDatasetsDraw(chart) {
                const c = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                const data = chart.data.datasets[0].data;
                const phase = PS.pulsePhase;

                data.forEach((d, i) => {
                    if (!d.isPareto) return;
                    const el = meta.data[i];
                    if (!el) return;
                    const radius = 14 + Math.sin(phase + i * 0.8) * 4;
                    const alpha = 0.25 + Math.sin(phase + i * 0.8) * 0.15;
                    c.save();
                    c.beginPath();
                    c.arc(el.x, el.y, radius, 0, Math.PI * 2);
                    c.strokeStyle = `rgba(0,230,118,${alpha})`;
                    c.lineWidth = 2;
                    c.stroke();
                    c.restore();
                });
            }
        };

        // ── Reference model arrows plugin ──
        const refArrowPlugin = {
            id: 'refArrows',
            afterDatasetsDraw(chart) {
                if (!PS.referenceModel) return;
                const c = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                const data = chart.data.datasets[0].data;
                const refPt = data.find(d => d.model === PS.referenceModel);
                if (!refPt) return;
                const refIdx = data.indexOf(refPt);
                const refEl = meta.data[refIdx];
                if (!refEl) return;

                data.forEach((d, i) => {
                    if (!d.isPareto || d.model === PS.referenceModel) return;
                    const el = meta.data[i];
                    if (!el) return;
                    c.save();
                    c.beginPath();
                    c.setLineDash([4, 3]);
                    c.strokeStyle = 'rgba(0,229,255,0.4)';
                    c.lineWidth = 1.5;
                    c.moveTo(refEl.x, refEl.y);
                    c.lineTo(el.x, el.y);
                    c.stroke();
                    // Arrowhead
                    const angle = Math.atan2(el.y - refEl.y, el.x - refEl.x);
                    c.setLineDash([]);
                    c.fillStyle = 'rgba(0,229,255,0.6)';
                    c.beginPath();
                    c.moveTo(el.x, el.y);
                    c.lineTo(el.x - 8 * Math.cos(angle - 0.4), el.y - 8 * Math.sin(angle - 0.4));
                    c.lineTo(el.x - 8 * Math.cos(angle + 0.4), el.y - 8 * Math.sin(angle + 0.4));
                    c.closePath();
                    c.fill();
                    c.restore();
                });
            }
        };

        // ── Labels plugin ──
        const labelsPlugin = {
            id: 'scatterLabels',
            afterDatasetsDraw(chart) {
                const c = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((el, i) => {
                    const p = chart.data.datasets[0].data[i];
                    c.save();
                    // Manual outline instead of shadowBlur (shadowBlur bleeds into dots on animation frames)
                    const labelY = el.y - (p.isPareto || p.isCustom ? 13 : 8);
                    const fgColor = p.isCustom ? '#00e5ff'
                        : (p.isCurrent ? '#00e5ff'
                        : (p.isPareto ? '#ffe033'
                        : 'rgba(195,215,205,0.95)'));
                    c.font = (p.isCurrent || p.isCustom) ? '700 10px Inter' : '500 9px Inter';
                    c.textAlign = 'center';
                    // Dark stroke pass first (acts as outline/shadow without shadowBlur)
                    c.strokeStyle = 'rgba(0,0,0,0.75)';
                    c.lineWidth = 3;
                    c.lineJoin = 'round';
                    c.strokeText(p.model, el.x, labelY);
                    // Fill pass on top
                    c.fillStyle = fgColor;
                    c.fillText(p.model, el.x, labelY);
                    if (p.isCustom) {
                        c.font = '700 12px Inter';
                        c.strokeStyle = 'rgba(0,0,0,0.75)';
                        c.lineWidth = 3;
                        c.strokeText('◆', el.x, el.y - 21);
                        c.fillStyle = '#00e5ff';
                        c.fillText('◆', el.x, el.y - 21);
                    } else if (p.isPareto && !p.isCurrent) {
                        c.font = '700 12px Inter';
                        c.strokeStyle = 'rgba(0,0,0,0.75)';
                        c.lineWidth = 3;
                        c.strokeText('★', el.x, el.y - 21);
                        c.fillStyle = '#00e676';
                        c.fillText('★', el.x, el.y - 21);
                    }
                    c.restore();
                });
            }
        };

        // ── Highlight pair plugin (from matrix hover) ──
        const highlightPlugin = {
            id: 'highlightPair',
            afterDatasetsDraw(chart) {
                if (!PS.highlightPair) return;
                const c = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                const data = chart.data.datasets[0].data;
                const [mA, mB] = PS.highlightPair;
                [mA, mB].forEach(name => {
                    const idx = data.findIndex(d => d.model === name);
                    if (idx < 0) return;
                    const el = meta.data[idx];
                    c.save();
                    c.beginPath();
                    c.arc(el.x, el.y, 18, 0, Math.PI * 2);
                    c.strokeStyle = '#00e5ff';
                    c.lineWidth = 2.5;
                    c.stroke();
                    c.restore();
                });
            }
        };

        // ── External custom tooltip ──
        const externalTooltipHandler = (context) => {
            const { chart, tooltip } = context;
            const el = document.getElementById('pareto-tooltip');
            if (!el) return;
            if (tooltip.opacity === 0) { el.style.display = 'none'; return; }
            const dp = tooltip.dataPoints?.[0];
            if (!dp) return;
            const raw = dp.raw;
            const ec = ENERGY_CLASSES[raw.label] || {};
            el.innerHTML = `
                <div class="pt-name">${raw.model}${raw.isCustom ? ' ◆' : ''}</div>
                <div class="pt-org">${raw.org || (raw.isCustom ? 'Modelo personalizado' : '')}</div>
                <div class="pt-row"><span>CO₂/query</span><span class="pt-val" style="color:#00e676">${sciNotation(raw.co2)} gCO₂</span></div>
                <div class="pt-row"><span>Velocidad</span><span class="pt-val">${raw.tps} tok/s</span></div>
                ${raw.latency ? `<div class="pt-row"><span>Latencia</span><span class="pt-val">${raw.latency.toFixed(1)} ms/tok</span></div>` : ''}
                ${raw.benchmark_score != null ? `<div class="pt-row"><span>${MODEL_QUALITY_SCORES[raw.model] != null ? 'MMLU' : 'MMLU estimado'}</span><span class="pt-val" style="color:#ffd600">${(raw.benchmark_score * 100).toFixed(1)}%</span></div>` : ''}
                <div class="pt-row"><span>Clase</span><span class="pt-badge" style="color:${ec.color || '#999'}">${raw.label}</span></div>
                ${raw.isPareto ? '<div class="pt-pareto">★ Pareto-óptimo</div>' : ''}
                ${raw.isCustom ? '<div class="pt-pareto" style="color:#00e5ff">◆ Tu modelo</div>' : ''}
                <div class="pt-minibar"><div class="pt-minibar-fill" style="width:${Math.min(100, (raw.co2 / Math.max(...points.map(p => p.co2))) * 100)}%"></div></div>
            `;
            el.style.display = 'block';
            const pos = chart.canvas.getBoundingClientRect();
            // Use the exact pixel center of the hovered point instead of caretX/caretY
            const idx = dp.dataIndex;
            const meta = chart.getDatasetMeta(dp.datasetIndex);
            const ptEl = meta.data[idx];
            const ptX = ptEl ? ptEl.x : tooltip.caretX;
            const ptY = ptEl ? ptEl.y : tooltip.caretY;
            const absX = ptX + pos.left;
            const absY = ptY + pos.top;
            const ttW = el.offsetWidth || 220;
            const ttH = el.offsetHeight || 180;
            const gap = 6;
            // Prefer right of point; flip left if near right edge
            const left = (absX + gap + ttW > window.innerWidth)
                ? absX - ttW - gap
                : absX + gap;
            // Center vertically on the point; clamp to viewport
            const top = Math.min(
                Math.max(absY - ttH / 2, gap),
                window.innerHeight - ttH - gap
            );
            el.style.left = left + 'px';
            el.style.top = top + 'px';
        };

        const _lm = document.body.classList.contains('light-mode');

        scatterChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Modelos',
                    data: points,
                    backgroundColor: bgColors.map((c, i) => {
                        const a = alphas[i];
                        // Adjust alpha for non-Pareto
                        if (a < 1) return c.replace(/[\d.]+\)$/, a + ')').replace(/#([0-9a-f]{6})/i, (m, hex) => {
                            const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
                            return `rgba(${r},${g},${b},${a})`;
                        });
                        return c;
                    }),
                    borderColor: borderColors,
                    borderWidth: borderWidths,
                    pointRadius: pointRadii,
                    pointStyle: pointStyles,
                    pointHoverRadius: 14,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeOutCubic' },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false, external: externalTooltipHandler },
                    zoom: {
                        pan: { enabled: true, mode: 'xy', modifierKey: 'ctrl' },
                        zoom: {
                            wheel: { enabled: true, modifierKey: 'ctrl' },
                            pinch: { enabled: true },
                            mode: 'xy',
                        }
                    }
                },
                scales: {
                    x: {
                        type: PS.scaleLog ? 'logarithmic' : 'linear',
                        title: { display: true, text: 'Velocidad (tokens/s)', color: _lm ? '#14532d' : '#7a9e88', font: { size: 11 } },
                        grid: { color: _lm ? 'rgba(0,0,0,0.07)' : 'rgba(74,222,128,0.22)' },
                        ticks: { color: _lm ? '#1e3a28' : '#86efac' },
                    },
                    y: {
                        type: PS.scaleLog ? 'logarithmic' : 'linear',
                        title: { display: true, text: 'CO₂/query (gCO₂)', color: _lm ? '#14532d' : '#7a9e88', font: { size: 11 } },
                        grid: { color: _lm ? 'rgba(0,0,0,0.07)' : 'rgba(74,222,128,0.22)' },
                        ticks: { color: _lm ? '#1e3a28' : '#86efac' },
                    }
                }
            },
            plugins: [paretoFrontPlugin, pulsePlugin, refArrowPlugin, labelsPlugin, highlightPlugin]
        });

        // ── Pulse animation loop ──
        function animatePulse() {
            PS.pulsePhase += 0.04;
            if (scatterChart) scatterChart.draw();
            PS.pulseRAF = requestAnimationFrame(animatePulse);
        }
        PS.pulseRAF = requestAnimationFrame(animatePulse);

        // ── Lasso / brush selection ──
        initLassoSelection(ctx.canvas);

        // Tooltip only appears on hover — no auto-show on load
    }

    // ══════════════════════════════════════════════════════════════════
    // LASSO / BRUSH SELECTION
    // ══════════════════════════════════════════════════════════════════
    function initLassoSelection(canvas) {
        const rect = document.getElementById('lasso-rect');
        const info = document.getElementById('lasso-info');
        if (!rect || !info) return;

        let dragging = false, sx = 0, sy = 0;

        canvas.addEventListener('mousedown', e => {
            if (e.ctrlKey) return; // ctrl = pan
            const r = canvas.getBoundingClientRect();
            sx = e.clientX - r.left; sy = e.clientY - r.top;
            dragging = true;
            rect.style.display = 'block';
            rect.style.left = sx + 'px'; rect.style.top = sy + 'px';
            rect.style.width = '0'; rect.style.height = '0';
        });
        canvas.addEventListener('mousemove', e => {
            if (!dragging) return;
            const r = canvas.getBoundingClientRect();
            const cx = e.clientX - r.left, cy = e.clientY - r.top;
            const x = Math.min(sx, cx), y = Math.min(sy, cy);
            const w = Math.abs(cx - sx), h = Math.abs(cy - sy);
            rect.style.left = x + 'px'; rect.style.top = y + 'px';
            rect.style.width = w + 'px'; rect.style.height = h + 'px';
        });
        canvas.addEventListener('mouseup', e => {
            if (!dragging) return;
            dragging = false;
            rect.style.display = 'none';
            const r = canvas.getBoundingClientRect();
            const cx = e.clientX - r.left, cy = e.clientY - r.top;
            const x1 = Math.min(sx, cx), y1 = Math.min(sy, cy);
            const x2 = Math.max(sx, cx), y2 = Math.max(sy, cy);
            if (x2 - x1 < 10 || y2 - y1 < 10) { info.style.display = 'none'; return; }

            // Find points inside the selection rectangle
            const meta = scatterChart.getDatasetMeta(0);
            const data = scatterChart.data.datasets[0].data;
            const selected = [];
            data.forEach((d, i) => {
                const el = meta.data[i];
                if (el && el.x >= x1 && el.x <= x2 && el.y >= y1 && el.y <= y2) {
                    selected.push(d.model);
                }
            });
            if (selected.length > 0) {
                PS.selectedModels = selected.slice(0, 4);
                info.style.display = 'flex';
                info.innerHTML = `<span class="lasso-label">Seleccionados (${selected.length}): </span>` +
                    selected.map(m => `<span class="lasso-chip">${m}</span>`).join('') +
                    `<button class="lasso-clear" id="lasso-clear">✕</button>`;
                document.getElementById('lasso-clear')?.addEventListener('click', () => {
                    PS.selectedModels = PS.table.slice(0, 3).map(r => r.model);
                    info.style.display = 'none';
                    renderRadarTab();
                });
                renderRadarTab();
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // SIDE PANEL — Tab switching
    // ══════════════════════════════════════════════════════════════════
    function initParetoTabs() {
        const panel = document.getElementById('pareto-side-panel');
        if (!panel) return;
        panel.querySelectorAll('.pareto-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.pareto-tab').forEach(b => b.classList.remove('active'));
                panel.querySelectorAll('.pareto-tab-body').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const target = document.getElementById('ptab-' + btn.dataset.ptab);
                if (target) target.classList.add('active');
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // TAB 1 — Dominancia Pareto
    // ══════════════════════════════════════════════════════════════════
    function renderDominanceTab() {
        const el = document.getElementById('ptab-dominance');
        if (!el) return;

        const table = PS.table;
        const paretoModels = PS.paretoModels;
        const paretoRows = table.filter(r => paretoModels.includes(r.model));

        // Utopian point: min CO₂, max tokens/s
        const minCo2 = Math.min(...table.map(r => r.co2_gCO2));
        const maxTps = Math.max(...table.map(r => r.tokens_per_second || 0));

        // Distance to utopian (normalized)
        const maxCo2 = Math.max(...table.map(r => r.co2_gCO2));
        const distances = paretoRows.map(r => {
            const dCo2 = maxCo2 > minCo2 ? (r.co2_gCO2 - minCo2) / (maxCo2 - minCo2) : 0;
            const dTps = maxTps > 0 ? (1 - (r.tokens_per_second || 0) / maxTps) : 0;
            return { model: r.model, dist: Math.sqrt(dCo2 * dCo2 + dTps * dTps), row: r };
        }).sort((a, b) => a.dist - b.dist);

        // Dominance count for each Pareto model
        const domCounts = {};
        paretoRows.forEach(r => {
            domCounts[r.model] = table.filter(o => o.model !== r.model && dominates(r, o)).length;
        });

        el.innerHTML = `
            <div class="ptab-header">🏆 Dominancia Pareto</div>
            <div class="ptab-desc">Modelos del frente de Pareto ordenados por proximidad al punto utópico ideal (mín CO₂ + máx velocidad).</div>
            <div class="ptab-list">
                ${distances.map((d, i) => {
                    const lbl = d.row.environmental_label?.label || '?';
                    const ec = ENERGY_CLASSES[lbl] || {};
                    return `
                    <div class="ptab-item ${d.row.model === ((OPTIONS.models || []).find(m => m.model_id === PS.currentModel)?.model_name || '') ? 'ptab-item-current' : ''}">
                        <div class="ptab-rank">#${i + 1}</div>
                        <div class="ptab-info">
                            <div class="ptab-model">${d.row.model} <span class="ptab-label-badge" style="color:${ec.color || '#999'}">${lbl}</span></div>
                            <div class="ptab-meta">${d.row.organization || ''} · ${sciNotation(d.row.co2_gCO2)} gCO₂ · ${d.row.tokens_per_second || 0} tok/s</div>
                            <div class="ptab-bars">
                                <span class="ptab-bar-label">Dist. utópica: ${d.dist.toFixed(3)}</span>
                                <div class="ptab-bar"><div class="ptab-bar-fill" style="width:${(1 - d.dist) * 100}%;background:${ec.color || '#00e676'}"></div></div>
                            </div>
                            <div class="ptab-dom">Domina a <strong>${domCounts[d.row.model] || 0}</strong> modelos</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    }

    // ══════════════════════════════════════════════════════════════════
    // TAB 2 — Análisis TOPSIS
    // ══════════════════════════════════════════════════════════════════
    function renderTopsisTab() {
        const el = document.getElementById('ptab-topsis');
        if (!el) return;

        const table = PS.table;
        const weights = PS.topsisWeights;
        const scores = calculateTOPSIS(table, weights);
        const ranked = table.map((r, i) => ({ ...r, score: scores[i] }))
            .sort((a, b) => b.score - a.score);
        const best = ranked[0];

        el.innerHTML = `
            <div class="ptab-header">⚖️ Análisis TOPSIS</div>
            <div class="ptab-desc">Ranking multicriterio — ajusta los pesos para recalcular en tiempo real.</div>
            <div class="topsis-sliders">
                <div class="topsis-slider-group">
                    <label>CO₂ <span class="topsis-w" id="tw-co2">${Math.round(weights.co2 * 100)}%</span></label>
                    <input type="range" min="0" max="100" value="${Math.round(weights.co2 * 100)}" class="topsis-range" data-tw="co2">
                </div>
                <div class="topsis-slider-group">
                    <label>Velocidad <span class="topsis-w" id="tw-speed">${Math.round(weights.speed * 100)}%</span></label>
                    <input type="range" min="0" max="100" value="${Math.round(weights.speed * 100)}" class="topsis-range" data-tw="speed">
                </div>
                <div class="topsis-slider-group">
                    <label>Latencia <span class="topsis-w" id="tw-latency">${Math.round(weights.latency * 100)}%</span></label>
                    <input type="range" min="0" max="100" value="${Math.round(weights.latency * 100)}" class="topsis-range" data-tw="latency">
                </div>
                <div class="topsis-slider-group">
                    <label>Calidad <span class="topsis-w" id="tw-quality">${Math.round((weights.quality || 0) * 100)}%</span></label>
                    <input type="range" min="0" max="100" value="${Math.round((weights.quality || 0) * 100)}" class="topsis-range" data-tw="quality">
                </div>
            </div>
            <div class="topsis-crown">
                🥇 Óptimo bajo tus preferencias: <strong>${best?.model || '—'}</strong> (score: ${best?.score.toFixed(3) || '—'})
            </div>
            <div class="topsis-ranking" id="topsis-ranking">
                ${ranked.map((r, i) => {
                    const ec = ENERGY_CLASSES[r.environmental_label?.label] || {};
                    const isCurrent = r.model === ((OPTIONS.models || []).find(m => m.model_id === PS.currentModel)?.model_name || '');
                    return `
                    <div class="topsis-row ${isCurrent ? 'topsis-current' : ''}">
                        <span class="topsis-pos">${i + 1}</span>
                        <span class="topsis-name">${r.model}</span>
                        <div class="topsis-score-bar"><div class="topsis-score-fill" style="width:${r.score * 100}%;background:${ec.color || '#00e676'}"></div></div>
                        <span class="topsis-score">${r.score.toFixed(3)}</span>
                    </div>`;
                }).join('')}
            </div>
        `;

        // Slider listeners
        el.querySelectorAll('.topsis-range').forEach(slider => {
            slider.addEventListener('input', () => {
                const key = slider.dataset.tw;
                const raw = {};
                el.querySelectorAll('.topsis-range').forEach(s => { raw[s.dataset.tw] = parseInt(s.value); });
                const total = (raw.co2 || 0) + (raw.speed || 0) + (raw.latency || 0) + (raw.quality || 0);
                if (total === 0) return;
                PS.topsisWeights = { co2: raw.co2 / total, speed: raw.speed / total, latency: raw.latency / total, quality: raw.quality / total };
                // Update weight labels
                Object.keys(raw).forEach(k => {
                    const wEl = document.getElementById(`tw-${k}`);
                    if (wEl) wEl.textContent = Math.round(PS.topsisWeights[k] * 100) + '%';
                });
                // Recalculate
                const newScores = calculateTOPSIS(PS.table, PS.topsisWeights);
                const newRanked = PS.table.map((r, i) => ({ ...r, score: newScores[i] }))
                    .sort((a, b) => b.score - a.score);
                const crown = el.querySelector('.topsis-crown');
                if (crown) crown.innerHTML = `🥇 Óptimo bajo tus preferencias: <strong>${newRanked[0]?.model || '—'}</strong> (score: ${newRanked[0]?.score.toFixed(3) || '—'})`;
                const ranking = document.getElementById('topsis-ranking');
                if (ranking) {
                    ranking.innerHTML = newRanked.map((r, i) => {
                        const ec = ENERGY_CLASSES[r.environmental_label?.label] || {};
                        const isCur = r.model === ((OPTIONS.models || []).find(m => m.model_id === PS.currentModel)?.model_name || '');
                        return `<div class="topsis-row ${isCur ? 'topsis-current' : ''}">
                            <span class="topsis-pos">${i + 1}</span>
                            <span class="topsis-name">${r.model}</span>
                            <div class="topsis-score-bar"><div class="topsis-score-fill" style="width:${r.score * 100}%;background:${ec.color || '#00e676'}"></div></div>
                            <span class="topsis-score">${r.score.toFixed(3)}</span>
                        </div>`;
                    }).join('');
                }
                // Update scatter point sizes
                renderParetoScatter();
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // TAB 3 — Radar Chart comparativo
    // ══════════════════════════════════════════════════════════════════
    function renderRadarTab() {
        const selectEl = document.getElementById('radar-model-select');
        const canvasEl = document.getElementById('radar-chart');
        if (!selectEl || !canvasEl) return;

        const table = PS.table;
        const radarColors = ['#00e676', '#00e5ff', '#ffd600', '#ff6b6b'];

        // Model checkboxes
        selectEl.innerHTML = `
            <div class="radar-select-label">Selecciona 2–4 modelos:</div>
            <div class="radar-checks">
                ${table.map(r => `
                    <label class="radar-check ${PS.selectedModels.includes(r.model) ? 'checked' : ''}">
                        <input type="checkbox" value="${r.model}" ${PS.selectedModels.includes(r.model) ? 'checked' : ''}>
                        <span>${r.model}</span>
                    </label>
                `).join('')}
            </div>
        `;

        selectEl.querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.addEventListener('change', () => {
                const checked = Array.from(selectEl.querySelectorAll('input:checked')).map(c => c.value);
                if (checked.length > 4) { cb.checked = false; return; }
                if (checked.length < 1) { cb.checked = true; return; }
                PS.selectedModels = checked;
                selectEl.querySelectorAll('.radar-check').forEach(lbl => {
                    lbl.classList.toggle('checked', lbl.querySelector('input').checked);
                });
                drawRadar();
            });
        });

        function drawRadar() {
            if (radarChart) radarChart.destroy();
            const ctx = canvasEl.getContext('2d');
            if (!ctx) return;

            const sel = table.filter(r => PS.selectedModels.includes(r.model));
            if (sel.length < 1) return;

            // Normalize dimensions to 0-1
            const maxCo2 = Math.max(...table.map(r => r.co2_gCO2));
            const maxTps = Math.max(...table.map(r => r.tokens_per_second || 0));
            const maxLat = Math.max(...table.filter(r => r.latency_ms_per_token).map(r => r.latency_ms_per_token));
            const maxParams = Math.max(...table.filter(r => r.num_parameters).map(r => r.num_parameters));
            const maxEnergy = Math.max(...table.map(r => r.energy_Wh || 0));

            const datasets = sel.map((r, i) => {
                const color = radarColors[i % radarColors.length];
                return {
                    label: r.model,
                    data: [
                        maxCo2 > 0 ? (1 - r.co2_gCO2 / maxCo2) : 0,           // CO₂ efficiency (inverted)
                        maxTps > 0 ? ((r.tokens_per_second || 0) / maxTps) : 0, // Speed
                        maxLat > 0 ? (1 - (r.latency_ms_per_token || 0) / maxLat) : 0, // Latency efficiency
                        maxEnergy > 0 ? (1 - (r.energy_Wh || 0) / maxEnergy) : 0, // Energy efficiency
                        maxParams > 0 ? (1 - (r.num_parameters || 0) / maxParams) : 0, // Param efficiency (inverted)
                        r.benchmark_score || 0,  // Quality (MMLU, already 0-1)
                    ],
                    backgroundColor: color + '20',
                    borderColor: color,
                    borderWidth: 2,
                    pointBackgroundColor: color,
                    pointRadius: 4,
                };
            });

            radarChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['CO₂ Eficiencia', 'Velocidad', 'Latencia Efic.', 'Energía Efic.', 'Eficiencia Params', 'Calidad (MMLU)'],
                    datasets: datasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#c8d6cf', font: { size: 11 } },
                            onClick: (e, legendItem, legend) => {
                                const idx = legendItem.datasetIndex;
                                const meta = legend.chart.getDatasetMeta(idx);
                                meta.hidden = !meta.hidden;
                                legend.chart.update();
                            }
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true, max: 1,
                            grid: { color: 'rgba(255,255,255,0.08)' },
                            angleLines: { color: 'rgba(255,255,255,0.08)' },
                            pointLabels: { color: '#94a3b1', font: { size: 10 } },
                            ticks: { display: false },
                        }
                    }
                }
            });
        }

        drawRadar();
    }

    // ══════════════════════════════════════════════════════════════════
    // DOMINANCE MATRIX (N×N)
    // ══════════════════════════════════════════════════════════════════
    function renderDominanceMatrix() {
        const wrap = document.getElementById('dominance-matrix-wrap');
        if (!wrap) return;

        const table = PS.table;
        const n = table.length;

        // Build matrix: matrix[i][j] = 'dom' if i dominates j, 'sub' if dominated, 'trade' otherwise
        const matrix = [];
        for (let i = 0; i < n; i++) {
            matrix[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) { matrix[i][j] = 'self'; continue; }
                if (dominates(table[i], table[j])) matrix[i][j] = 'dom';
                else if (dominates(table[j], table[i])) matrix[i][j] = 'sub';
                else matrix[i][j] = 'trade';
            }
        }

        const cellClass = { dom: 'dm-dom', sub: 'dm-sub', trade: 'dm-trade', self: 'dm-self' };
        const cellChar = { dom: '▼', sub: '▲', trade: '↔', self: '·' };
        const cellTitle = { dom: 'Domina', sub: 'Dominado', trade: 'Trade-off', self: '' };

        let html = `<table class="dominance-table"><thead><tr><th></th>`;
        table.forEach(r => { html += `<th class="dm-header" title="${r.model}">${r.model.substring(0, 8)}</th>`; });
        html += `</tr></thead><tbody>`;
        for (let i = 0; i < n; i++) {
            html += `<tr><th class="dm-row-header" title="${table[i].model}">${table[i].model.substring(0, 10)}</th>`;
            for (let j = 0; j < n; j++) {
                const val = matrix[i][j];
                html += `<td class="dm-cell ${cellClass[val]}" data-row="${i}" data-col="${j}" title="${table[i].model} ${cellTitle[val]} ${table[j].model}">${cellChar[val]}</td>`;
            }
            html += `</tr>`;
        }
        html += `</tbody></table>`;
        wrap.innerHTML = html;

        // Hover → highlight pair in scatter
        wrap.querySelectorAll('.dm-cell').forEach(td => {
            td.addEventListener('mouseenter', () => {
                const ri = parseInt(td.dataset.row), ci = parseInt(td.dataset.col);
                if (ri === ci) return;
                PS.highlightPair = [table[ri].model, table[ci].model];
                if (scatterChart) scatterChart.draw();
            });
            td.addEventListener('mouseleave', () => {
                PS.highlightPair = null;
                if (scatterChart) scatterChart.draw();
            });
        });

        // Export CSV button
        document.getElementById('btn-export-matrix-csv')?.addEventListener('click', () => {
            let csv = ',' + table.map(r => r.model).join(',') + '\n';
            for (let i = 0; i < n; i++) {
                csv += table[i].model + ',' + matrix[i].map(v => cellTitle[v] || '').join(',') + '\n';
            }
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'dominance_matrix.csv'; a.click();
            URL.revokeObjectURL(url);
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // WIZARD MODAL — "¿Qué modelo me conviene?"
    // ══════════════════════════════════════════════════════════════════
    function showWizardModal() {
        const overlay = document.getElementById('wizard-modal');
        const content = document.getElementById('wizard-content');
        if (!overlay || !content) return;
        overlay.style.display = 'flex';
        let step = 0;
        const answers = { priority: null, speed: null, budget: null };

        function renderStep() {
            const steps = [
                {
                    q: '¿Cuál es tu prioridad principal?',
                    desc: 'Elige qué aspecto valoras más al seleccionar un modelo de IA.',
                    options: [
                        { val: 'sustainability', icon: '🌿', label: 'Sostenibilidad', desc: 'Minimizar emisiones de CO₂' },
                        { val: 'speed', icon: '⚡', label: 'Velocidad', desc: 'Máxima rapidez de inferencia' },
                        { val: 'balance', icon: '⚖️', label: 'Balance', desc: 'Compromiso entre ambos' },
                    ]
                },
                {
                    q: '¿Necesitas baja latencia?',
                    desc: 'Algunas aplicaciones (chatbots en tiempo real, APIs) requieren baja latencia.',
                    options: [
                        { val: 'yes', icon: '🏎️', label: 'Sí, es crítica', desc: '< 20ms por token' },
                        { val: 'no', icon: '🐢', label: 'No es prioritaria', desc: 'Puedo tolerar latencia alta' },
                    ]
                },
                {
                    q: '¿Prefiere modelos con más parámetros?',
                    desc: 'Modelos más grandes suelen ser más capaces, pero más costosos.',
                    options: [
                        { val: 'large', icon: '🧠', label: 'Sí, mayor capacidad', desc: 'Modelos >100B parámetros' },
                        { val: 'small', icon: '💡', label: 'No, eficiencia primero', desc: 'Modelos compactos y eficientes' },
                    ]
                }
            ];

            if (step < 3) {
                const s = steps[step];
                content.innerHTML = `
                    <div class="wizard-step">
                        <div class="wizard-progress"><div class="wizard-progress-fill" style="width:${((step + 1) / 3) * 100}%"></div></div>
                        <div class="wizard-step-num">Paso ${step + 1} de 3</div>
                        <h3 class="wizard-question">${s.q}</h3>
                        <p class="wizard-desc">${s.desc}</p>
                        <div class="wizard-options">
                            ${s.options.map(o => `
                                <button class="wizard-option" data-val="${o.val}">
                                    <span class="wizard-opt-icon">${o.icon}</span>
                                    <span class="wizard-opt-label">${o.label}</span>
                                    <span class="wizard-opt-desc">${o.desc}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
                content.querySelectorAll('.wizard-option').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const keys = ['priority', 'speed', 'budget'];
                        answers[keys[step]] = btn.dataset.val;
                        step++;
                        renderStep();
                    });
                });
            } else {
                // Calculate recommendation
                const w = { co2: 0.33, speed: 0.33, latency: 0.34 };
                if (answers.priority === 'sustainability') { w.co2 = 0.55; w.speed = 0.25; w.latency = 0.20; }
                else if (answers.priority === 'speed') { w.co2 = 0.15; w.speed = 0.55; w.latency = 0.30; }
                else { w.co2 = 0.35; w.speed = 0.35; w.latency = 0.30; }
                if (answers.speed === 'yes') { w.latency += 0.10; w.co2 -= 0.05; w.speed -= 0.05; }
                const total = w.co2 + w.speed + w.latency;
                w.co2 /= total; w.speed /= total; w.latency /= total;

                const scores = calculateTOPSIS(PS.table, w);
                let filtered = PS.table.map((r, i) => ({ ...r, score: scores[i] }));
                if (answers.budget === 'small') filtered = filtered.filter(r => (r.num_parameters || Infinity) < 100e9);
                filtered.sort((a, b) => b.score - a.score);
                const rec = filtered[0];
                const ec = ENERGY_CLASSES[rec?.environmental_label?.label] || {};

                content.innerHTML = `
                    <div class="wizard-result">
                        <div class="wizard-progress"><div class="wizard-progress-fill" style="width:100%"></div></div>
                        <div class="wizard-crown">🏆</div>
                        <h3 class="wizard-rec-title">Tu modelo recomendado</h3>
                        <div class="wizard-rec-model">${rec?.model || '—'}</div>
                        <div class="wizard-rec-org">${rec?.organization || ''}</div>
                        <div class="wizard-rec-stats">
                            <div class="wizard-stat"><span class="wizard-stat-val" style="color:#00e676">${sciNotation(rec?.co2_gCO2)}</span><span class="wizard-stat-label">gCO₂/query</span></div>
                            <div class="wizard-stat"><span class="wizard-stat-val" style="color:#00e5ff">${rec?.tokens_per_second || '—'}</span><span class="wizard-stat-label">tok/s</span></div>
                            <div class="wizard-stat"><span class="wizard-stat-val" style="color:${ec.color || '#ffd600'}">${rec?.environmental_label?.label || '?'}</span><span class="wizard-stat-label">Clase</span></div>
                        </div>
                        <p class="wizard-rec-reason">Basado en tus preferencias: ${
                            answers.priority === 'sustainability' ? 'prioridad en sostenibilidad' :
                            answers.priority === 'speed' ? 'prioridad en velocidad' : 'balance equilibrado'
                        }${answers.speed === 'yes' ? ', baja latencia requerida' : ''}${answers.budget === 'small' ? ', modelos eficientes preferidos' : ''}.</p>
                        <div class="wizard-weights">Pesos TOPSIS: CO₂ ${Math.round(w.co2 * 100)}% · Velocidad ${Math.round(w.speed * 100)}% · Latencia ${Math.round(w.latency * 100)}%</div>
                        <button class="wizard-restart" id="wizard-restart">Volver a empezar</button>
                    </div>
                `;
                // Highlight in scatter
                PS.referenceModel = rec?.model || null;
                document.getElementById('pcfg-ref').value = rec?.model || '';
                renderParetoScatter();

                document.getElementById('wizard-restart')?.addEventListener('click', () => { step = 0; renderStep(); });
            }
        }

        renderStep();

        // Close handlers
        document.getElementById('wizard-close')?.addEventListener('click', () => { overlay.style.display = 'none'; });
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
    }

    // ──────────────────────────────────────────────────────────────────
    // 3. Detailed comparison table
    // ──────────────────────────────────────────────────────────────────
    function renderDetailedTable(sorted, maxCo2, currentModel) {
        const tableDiv = document.getElementById('detailed-comparison-table');
        if (!tableDiv) return;

        const currentModelName = (OPTIONS.models || []).find(m => m.model_id === currentModel)?.model_name || '';
        const currentRow = sorted.find(r => r.model === currentModelName);
        const currentCo2 = currentRow ? currentRow.co2_gCO2 : sorted[0]?.co2_gCO2 || 1;

        const arrowSvg = '<span class="sort-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 3 18 9"/></svg></span>';

        const renderRows = (rows) => rows.map(r => {
            const isActive = r.model === currentModelName;
            const pct = maxCo2 > 0 ? (r.co2_gCO2 / maxCo2 * 100) : 0;
            const savings = currentCo2 > 0 ? ((r.co2_gCO2 / currentCo2 - 1) * 100) : 0;
            const savingsStr = savings <= -0.5
                ? `<span class="comp-savings-positive">−${Math.abs(Math.round(savings))}%</span>`
                : savings >= 0.5
                    ? `<span class="comp-savings-negative">+${Math.round(savings)}%</span>`
                    : '<span style="color:var(--text-muted)">—</span>';
            const latency = r.latency_ms_per_token
                ? (r.latency_ms_per_token * (r.tokens_processed || 285)).toFixed(0) + ' ms'
                : r.inference_time_sec ? (r.inference_time_sec * 1000).toFixed(0) + ' ms' : '—';

            return `<tr${isActive ? ' style="background:rgba(0,229,255,.04)"' : ''}>
                <td style="font-weight:600;color:var(--text-primary);white-space:nowrap">
                    ${r.model}${isActive ? ' <span class="comp-actual-badge">ACTUAL</span>' : ''}
                    ${r.environmental_label?.label?.includes('Pareto') ? ' ★' : ''}
                </td>
                <td style="color:var(--text-muted);font-size:12px">${r.organization || ''}</td>
                <td class="font-mono" style="color:var(--primary)">${formatNum(r.co2_gCO2)}</td>
                <td style="min-width:120px">
                    <div class="comp-emission-bar"><div class="comp-emission-fill" style="width:${pct}%;background:${getBarColorSolid(r.environmental_label?.label)}"></div></div>
                </td>
                <td>${savingsStr}</td>
                <td class="font-mono" style="color:${r.tokens_per_second > 100 ? 'var(--primary)' : 'var(--text-secondary)'}">${r.tokens_per_second || '—'}</td>
                <td class="font-mono">${latency}</td>
                <td>${getLabelBadge(r.environmental_label)}</td>
            </tr>`;
        }).join('');

        tableDiv.innerHTML = `
            <table id="detailed-comp-table">
                <thead><tr>
                    <th data-sort="model">Modelo ${arrowSvg}</th>
                    <th data-sort="organization">Org. ${arrowSvg}</th>
                    <th data-sort="co2_gCO2">CO₂/query (gCO₂) ${arrowSvg}</th>
                    <th>Emisión relativa</th>
                    <th data-sort="savings">Ahorro vs actual ${arrowSvg}</th>
                    <th data-sort="tokens_per_second">Tokens/s ${arrowSvg}</th>
                    <th data-sort="latency">Latencia ${arrowSvg}</th>
                    <th data-sort="label">Etiqueta ${arrowSvg}</th>
                </tr></thead>
                <tbody>${renderRows(sorted)}</tbody>
            </table>
        `;

        // Sorting
        let sortState = {};
        tableDiv.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                // Toggle sort state
                tableDiv.querySelectorAll('th').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
                sortState[key] = !sortState[key];
                th.classList.add(sortState[key] ? 'sort-asc' : 'sort-desc');
                const dir = sortState[key] ? 1 : -1;

                const rows = [...sorted].sort((a, b) => {
                    if (key === 'model' || key === 'organization') return dir * (a[key] || '').localeCompare(b[key] || '');
                    if (key === 'label') return dir * ((a.environmental_label?.label || 'Z').localeCompare(b.environmental_label?.label || 'Z'));
                    if (key === 'savings') {
                        const sA = currentCo2 > 0 ? (a.co2_gCO2 / currentCo2 - 1) : 0;
                        const sB = currentCo2 > 0 ? (b.co2_gCO2 / currentCo2 - 1) : 0;
                        return dir * (sA - sB);
                    }
                    if (key === 'latency') return dir * ((a.inference_time_sec || 0) - (b.inference_time_sec || 0));
                    return dir * ((a[key] || 0) - (b[key] || 0));
                });
                tableDiv.querySelector('tbody').innerHTML = renderRows(rows);
            });
        });
    }

    // ──────────────────────────────────────────────────────────────────
    // 4. Vertical bar chart — CO₂/query
    // ──────────────────────────────────────────────────────────────────
    function renderVerticalBarChart(sorted, currentModel) {
        if (vertBarChart) vertBarChart.destroy();
        const ctx = document.getElementById('vertical-bar-chart')?.getContext('2d');
        if (!ctx) return;

        const currentModelName = resolveCurrentModelName(currentModel);

        // Build colors — highlight selected model with distinct border
        const bgColors = sorted.map(r => {
            if (r.model === currentModelName) return 'rgba(0,229,255,0.75)';
            return getBarColor(r.environmental_label?.label);
        });
        const borderColors = sorted.map(r => {
            if (r.model === currentModelName) return '#00e5ff';
            return 'transparent';
        });
        const borderWidths = sorted.map(r => r.model === currentModelName ? 2 : 0);

        vertBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(r => r.model),
                datasets: [{
                    label: 'gCO₂/query',
                    data: sorted.map(r => r.co2_gCO2),
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: borderWidths,
                    borderRadius: 4,
                    borderSkipped: false,
                    barPercentage: 0.7,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 35 } },
                animation: { duration: 1200, easing: 'easeOutCubic' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: (item) => {
                                const r = sorted[item.dataIndex];
                                return [
                                    `Tokens/s: ${r.tokens_per_second || '—'}`,
                                    r.latency_ms_per_token ? `Latencia: ${r.latency_ms_per_token.toFixed(1)} ms/tok` : '',
                                    r.model === currentModelName ? '← Modelo seleccionado' : '',
                                ].filter(Boolean);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'logarithmic',
                        grid: { color: 'rgba(255,255,255,0.12)' },
                        ticks: { color: '#94a3b1', callback: (v) => formatNum(v) },
                        title: { display: true, text: 'CO₂ total (gCO₂/query)', color: '#7a9e88' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: (ctx) => {
                                const label = sorted[ctx.index]?.model;
                                return label === currentModelName ? '#00e5ff' : '#94a3b1';
                            },
                            font: (ctx) => {
                                const label = sorted[ctx.index]?.model;
                                return { size: 10, weight: label === currentModelName ? '700' : '400' };
                            },
                            maxRotation: 45,
                        },
                    }
                }
            },
            plugins: [{
                id: 'vertBarLabels',
                afterDatasetsDraw(chart) {
                    const c = chart.ctx;
                    chart.getDatasetMeta(0).data.forEach((bar, j) => {
                        const r = sorted[j];
                        const lbl = r.environmental_label?.label || '';
                        const isCurrent = r.model === currentModelName;
                        c.save();
                        c.fillStyle = isCurrent ? '#00e5ff' : getBarColorSolid(lbl);
                        c.font = isCurrent ? '700 11px Inter' : '700 10px Inter';
                        c.textAlign = 'center';
                        // Label above bar + ACTUAL tag for selected model
                        if (isCurrent) {
                            c.fillText('ACTUAL', bar.x, bar.y - 28);
                            c.fillText(lbl, bar.x, bar.y - 14);
                        } else {
                            c.fillText(lbl, bar.x, bar.y - 8);
                        }
                        c.restore();
                    });
                }
            }]
        });
    }

    // ──────────────────────────────────────────────────────────────────
    // PDF export — Professional Consultancy Report using jsPDF
    // ──────────────────────────────────────────────────────────────────
    function exportComparatorPDF() {
        if (!window.jspdf) { showError('jsPDF no está cargado todavía, inténtalo de nuevo.'); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const W = 210, H = 297;
        const ML = 18, MR = 18;
        const CW = W - ML - MR; // 174 mm

        // ── Color palette — Navy / Slate professional (BCG/Deloitte style) ──
        const C = {
            white:     [255, 255, 255],
            bgLight:   [248, 250, 252],
            bgAccent:  [239, 246, 255],
            bgAmber:   [255, 251, 235],
            separator: [203, 213, 225],
            textMain:  [ 15,  23,  42],
            textSub:   [ 71,  85, 105],
            textLight: [148, 163, 184],
            navy:      [ 15,  23,  42],
            navyMid:   [ 30,  58,  95],
            navyLt:    [ 51,  83, 145],
            accentBlue:[  37, 99, 235],
            accentTeal:[  8, 145, 178],
            amber:     [180, 110,   0],
            green:     [ 22, 101,  52],
            greenMid:  [ 22, 163,  74],
            red:       [185,  28,  28],
        };

        // ── Palette helpers ──
        function fc(rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
        function dc(rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }
        function tc(rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
        function whitePage() { fc(C.white); doc.rect(0, 0, W, H, 'F'); }
        function checkPage(y, need) {
            if (y + need > H - 22) { doc.addPage(); whitePage(); return 22; }
            return y;
        }
        function sectionHeader(title, y) {
            fc(C.navyMid); doc.rect(ML, y - 5, 3.5, 9, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(13); tc(C.navyMid);
            doc.text(title, ML + 8, y);
            dc(C.separator); doc.setLineWidth(0.25);
            doc.line(ML + 8, y + 2.5, W - MR, y + 2.5);
            return y + 11;
        }
        function subHeader(title, y) {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10); tc(C.navy);
            doc.text(title, ML, y);
            return y + 6;
        }
        function bodyText(text, x, y, maxW) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9); tc(C.textSub);
            const lines = doc.splitTextToSize(text, maxW || CW);
            doc.text(lines, x, y);
            return y + lines.length * 4.8;
        }
        function infoBox(text, x, y, w, borderColor) {
            // Set font BEFORE splitting so line-width calculation uses the correct size
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
            const lines = doc.splitTextToSize(text, w - 12);
            const LH = 5.0;
            const bh = 8 + lines.length * LH + 4;
            fc(C.bgAccent); doc.rect(x, y - 4, w, bh, 'F');
            fc(borderColor); doc.rect(x, y - 4, 3, bh, 'F');
            tc(C.navyMid);
            doc.text(lines, x + 7, y, { lineHeightFactor: LH / 8.5 * 2.835 });
            return y + bh;
        }
        function labelColor(lbl) {
            const l = (lbl || '').trim();
            if (l === 'A+++') return [  0, 128,   0];
            if (l === 'A++')  return [ 22, 163,  74];
            if (l === 'A+')   return [ 34, 197,  94];
            if (l === 'A')    return [ 74, 222, 128];
            if (l === 'B')    return [180, 110,   0];
            if (l === 'C')    return [234,  88,  12];
            if (l === 'D')    return [185,  28,  28];
            if (l === 'E')    return [153,  27,  27];
            return [127, 29, 29];
        }
        // KEY FIX: composite canvas on white background before export
        function canvasToWhiteImg(canvas) {
            const off = document.createElement('canvas');
            off.width  = canvas.width;
            off.height = canvas.height;
            const ctx = off.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, off.width, off.height);
            ctx.drawImage(canvas, 0, 0);
            return off.toDataURL('image/png', 0.95);
        }
        function fitText(text, maxW) {
            let t = String(text);
            while (t.length > 1 && doc.getTextWidth(t) > maxW) t = t.slice(0, -1);
            return t;
        }

        // ── Extract data ──
        const p = LAST_PARAMS || {};
        const currentModelName = (OPTIONS.models || []).find(m => m.model_id === p.model_id)?.model_name || p.model_id || '-';
        const dcObj     = (OPTIONS.data_centers || []).find(d => d.dc_id     === p.data_center_id);
        const deviceObj = (OPTIONS.devices      || []).find(d => d.device_id === p.device_id);
        const tableEl   = document.getElementById('detailed-comp-table');
        const allRows   = tableEl ? Array.from(tableEl.querySelectorAll('tbody tr')) : [];
        const summaryData = [];
        allRows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length >= 7) {
                summaryData.push({
                    model:   cells[0].textContent.replace('ACTUAL', '').trim(),
                    org:     cells[1].textContent.trim(),
                    co2:     cells[2].textContent.trim(),
                    savings: cells[4].textContent.trim(),
                    tps:     cells[5].textContent.trim(),
                    latency: cells[6].textContent.trim(),
                    label:   cells[7]?.textContent.trim() || '-',
                });
            }
        });

        const bestModel   = summaryData[0];
        const worstModel  = summaryData[summaryData.length - 1];
        const bco2 = parseFloat(bestModel?.co2)  || 0;
        const wco2 = parseFloat(worstModel?.co2) || 0;
        const spreadPct  = (wco2 > 0 && bco2 > 0) ? ((wco2 / bco2 - 1) * 100).toFixed(0) : '-';
        const avgCO2val  = summaryData.length
            ? summaryData.reduce((s, r) => s + (parseFloat(r.co2) || 0), 0) / summaryData.length
            : 0;
        const currentRow = summaryData.find(r => r.model === currentModelName ||
            r.model.startsWith(currentModelName.substring(0, 8)));
        const currentCO2 = parseFloat(currentRow?.co2) || 0;
        const currentRank = summaryData.findIndex(r => r.model === currentModelName ||
            r.model.startsWith(currentModelName.substring(0, 8))) + 1;

        const now       = new Date();
        const dateStr   = now.toISOString().slice(0, 10);
        const dateHuman = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        // ═══════════════════════════════════════════════════════════════
        // PAGE 1 — COVER
        // ═══════════════════════════════════════════════════════════════
        whitePage();

        // Top navy band
        const BANNER_H = 70;
        fc(C.navy);    doc.rect(0, 0, W, BANNER_H, 'F');
        fc(C.navyMid); doc.rect(0, BANNER_H - 3, W, 3, 'F');
        fc(C.accentBlue); doc.rect(0, BANNER_H, W, 1.2, 'F');

        // Decorative side stripe
        fc(C.accentTeal); doc.rect(0, 0, 5, BANNER_H, 'F');

        doc.setFont('helvetica', 'bold'); doc.setFontSize(22); tc(C.white);
        doc.text('Informe Comparativo de Modelos de IA', ML + 2, 24);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(12); tc([147, 197, 253]);
        doc.text('Evaluacion del impacto medioambiental en inferencia', ML + 2, 35);
        dc([147, 197, 253]); doc.setLineWidth(0.6); doc.line(ML + 2, 40, W - MR, 40);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); tc([186, 215, 254]);
        doc.text('Calculadora de Carbono para IA  |  TFG  |  ' + dateHuman, ML + 2, 50);
        doc.text('Antonio Luis Jimenez de la Fuente  |  Universidad de Sevilla', ML + 2, 58);

        let y = BANNER_H + 14;

        // "Prepared by" block
        fc(C.bgLight); doc.rect(ML, y, CW, 24, 'F');
        dc(C.separator); doc.setLineWidth(0.2); doc.rect(ML, y, CW, 24, 'S');
        doc.setFont('helvetica', 'bold');   doc.setFontSize(7.5); tc(C.accentBlue);
        doc.text('PREPARADO POR', ML + 5, y + 7);
        doc.setFont('helvetica', 'bold');   doc.setFontSize(11); tc(C.navy);
        doc.text('Antonio Luis Jimenez de la Fuente', ML + 5, y + 14);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);  tc(C.textSub);
        doc.text('TFG - Evaluacion del impacto medioambiental de modelos de Inteligencia Artificial', ML + 5, y + 20);

        y += 32;

        // Executive summary box
        const sumLines = [
            { label: 'Modelos analizados:',      val: String(summaryData.length) },
            { label: 'Modelo mas eficiente:',    val: bestModel  ? `${bestModel.model}  (Clase ${bestModel.label})` : '-' },
            { label: 'Modelo menos eficiente:',  val: worstModel ? `${worstModel.model}  (Clase ${worstModel.label})` : '-' },
            { label: 'Diferencia maxima:',        val: spreadPct !== '-' ? `${spreadPct}% mas emisiones (peor vs mejor)` : '-' },
            { label: 'Modelo de referencia:',    val: `${currentModelName}  (posicion ${currentRank} de ${summaryData.length})` },
            { label: 'Emisiones referencia:',    val: currentCO2 > 0 ? `${currentCO2.toFixed(4)} gCO2/query` : '-' },
            { label: 'Media del conjunto:',      val: avgCO2val > 0 ? `${avgCO2val.toFixed(4)} gCO2/query` : '-' },
        ];
        const LINE_H = 6.8;
        const BOX_H  = 13 + sumLines.length * LINE_H;
        fc(C.bgAccent); doc.rect(ML, y, CW, BOX_H, 'F');
        fc(C.navyMid);  doc.rect(ML, y, 4, BOX_H, 'F');
        dc(C.separator); doc.setLineWidth(0.2); doc.rect(ML, y, CW, BOX_H, 'S');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); tc(C.accentBlue);
        doc.text('RESUMEN EJECUTIVO', ML + 8, y + 7);
        let by = y + 7 + LINE_H;
        sumLines.forEach(sl => {
            doc.setFont('helvetica', 'bold');   doc.setFontSize(8.5); tc(C.navy);    doc.text(sl.label, ML + 8, by);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); tc(C.textSub); doc.text(sl.val,   ML + 64, by);
            by += LINE_H;
        });
        y += BOX_H + 10;

        // Scope note at bottom of cover
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); tc(C.textLight);
        const scopeNote = 'ALCANCE: Este informe cubre exclusivamente las emisiones de CO2 en la fase de inferencia de los modelos. ' +
            'No incluye emisiones de entrenamiento, fabricacion de hardware ni ciclo de vida completo.';
        const scopeLines = doc.splitTextToSize(scopeNote, CW);
        doc.text(scopeLines, ML, y);

        // ═══════════════════════════════════════════════════════════════
        // PAGE 2 — CONFIGURATION + METHODOLOGY
        // ═══════════════════════════════════════════════════════════════
        doc.addPage(); whitePage();
        y = 22;
        y = sectionHeader('1. Configuracion del escenario de evaluacion', y);
        y += 2;
        y = bodyText(
            'Los parametros de la siguiente tabla definen el escenario de inferencia fijo bajo el cual se han calculado las emisiones de todos los modelos comparados. Estos valores permanecen constantes entre modelos, de modo que la unica variable es el consumo energetico propio de cada modelo (energy_wh_per_1k_tokens).',
            ML, y, CW
        );
        y += 5;

        const configRows = [
            ['Modelo de referencia',       currentModelName],
            ['Tipo de peticion',           formatRequestType(p.request_type || 'chat_simple')],
            ['Tokens entrada / salida',    `${p.tokens_input ?? '-'} / ${p.tokens_output ?? '-'}`],
            ['Data Center',                dcObj ? `${dcObj.provider_name} - ${dcObj.region || ''} (${dcObj.country_code || ''})` : (p.data_center_id || '-')],
            ['PUE del Data Center',        String(dcObj?.pue ?? '-')],
            ['Energia renovable DC',       dcObj?.renewable_pct != null ? `${dcObj.renewable_pct}%` : '-'],
            ['Intensidad carbono DC',      dcObj?.carbon_intensity_gco2_kwh != null ? `${dcObj.carbon_intensity_gco2_kwh} gCO2/kWh` : '-'],
            ['Dispositivo del usuario',    deviceObj?.device_name || p.device_id || '-'],
            ['Tipo de red',                p.network_id || '-'],
            ['Pais del usuario',           p.user_country || 'ES'],
            ['Procesador de inferencia',   (p.inference_processor || 'auto').toUpperCase()],
            ['Utilizacion del procesador', `${p.utilization != null ? Math.round(p.utilization * 100) : 70}%`],
        ];
        const COL2 = ML + 72, ROW_H = 7.2;
        configRows.forEach((row, i) => {
            if (i % 2 !== 0) { fc(C.bgLight); doc.rect(ML, y - 5, CW, ROW_H, 'F'); }
            dc(C.separator); doc.setLineWidth(0.1); doc.line(ML, y + 2, W - MR, y + 2);
            doc.setFont('helvetica', 'bold');   doc.setFontSize(8.5); tc(C.navy);    doc.text(row[0],        ML + 2, y);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); tc(C.textSub); doc.text(String(row[1]), COL2,   y);
            y += ROW_H;
        });
        y += 10;

        y = sectionHeader('2. Nota metodologica y alcance', y);
        y += 2;
        y = infoBox(
            'Este comparador evalua exclusivamente las emisiones de CO2 asociadas a los modelos de IA durante el periodo de inferencia. ' +
            'El resto de parametros (dispositivo del usuario, red de datos y data center) se mantienen fijos segun la configuracion indicada, ' +
            'de modo que la unica variable entre modelos es su consumo energetico por cada 1.000 tokens procesados (energy_wh_per_1k_tokens). ' +
            'Esto permite una comparacion directa, equitativa y bajo condiciones identicas.',
            ML, y, CW, C.accentBlue
        );
        y += 6;
        y = bodyText(
            'Las etiquetas de eficiencia energetica (A+++ hasta F) se asignan en base a la distribucion de percentiles de emisiones del dataset completo de modelos analizados (~693.000 combinaciones de configuraciones), por lo que representan la posicion relativa de cada modelo frente al universo de uso real.',
            ML, y, CW
        );
        y += 4;
        y = infoBox(
            'Nota: la metodologia de calculo de emisiones con sus tres componentes (dispositivo de usuario, red de datos y data center) corresponde al flujo general de la Calculadora de Carbono para IA y no aplica directamente a este informe comparativo. En este analisis, todos los parametros del escenario permanecen fijos; la unica variable entre modelos es su consumo energetico por cada 1.000 tokens procesados (energy_wh_per_1k_tokens), lo que garantiza una comparacion equitativa y directa.',
            ML, y, CW, C.accentBlue
        );

        // ═══════════════════════════════════════════════════════════════
        // PAGE 3 — DETAILED COMPARISON TABLE
        // ═══════════════════════════════════════════════════════════════
        doc.addPage(); whitePage();
        y = 22;
        y = sectionHeader('3. Tabla comparativa detallada de modelos', y);
        y += 2;
        y = bodyText(
            'La siguiente tabla compara los ' + summaryData.length + ' modelos disponibles bajo el mismo escenario de inferencia. ' +
            'Los modelos se ordenan de menor a mayor emision de CO2 por consulta. ' +
            'La columna "Ahorro vs ref." refleja la diferencia porcentual entre cada modelo y el modelo de referencia (marcado con [ref]): ' +
            'un valor negativo indica que ese modelo emite menos CO2 que la referencia (es decir, es mas eficiente), mientras que un valor positivo indica que emite mas. ' +
            'Las etiquetas energeticas (A+++ a D) reflejan la posicion percentil del modelo frente al dataset completo.',
            ML, y, CW
        );
        y += 5;

        const tCols = [
            { label: '#',             x: ML,       w: 8  },
            { label: 'Modelo',        x: ML + 8,   w: 36 },
            { label: 'Org.',          x: ML + 44,  w: 24 },
            { label: 'CO2 (gCO2)',    x: ML + 68,  w: 24 },
            { label: 'Ahorro vs ref.',x: ML + 92,  w: 22 },
            { label: 'Tok/s',         x: ML + 114, w: 16 },
            { label: 'Latencia',      x: ML + 130, w: 22 },
            { label: 'Etiqueta',      x: ML + 152, w: 22 },
        ];
        const T_ROW_H = 7;

        function drawTableHeader(yy) {
            fc(C.navyMid); doc.rect(ML, yy - 5, CW, T_ROW_H, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2); tc(C.white);
            tCols.forEach(c => doc.text(c.label, c.x + 1.5, yy));
            return yy + T_ROW_H;
        }
        y = drawTableHeader(y);

        const co2Values = summaryData.map(r => parseFloat(r.co2) || 0).filter(v => v > 0);
        const co2Min = co2Values.length ? Math.min(...co2Values) : 0;
        const co2Max = co2Values.length ? Math.max(...co2Values) : 1;

        summaryData.forEach((row, idx) => {
            const prevY = y;
            y = checkPage(y, T_ROW_H + 3);
            if (y !== prevY) y = drawTableHeader(y);

            const isCurrent = row.model === currentModelName ||
                              row.model.startsWith(currentModelName.substring(0, 8));
            if (isCurrent) {
                fc(C.bgAmber);   doc.rect(ML, y - 5, CW, T_ROW_H, 'F');
                fc(C.amber);     doc.rect(ML, y - 5, 2.5, T_ROW_H, 'F');
            } else if (idx === 0) {
                fc([240, 253, 244]); doc.rect(ML, y - 5, CW, T_ROW_H, 'F');
                fc(C.greenMid);  doc.rect(ML, y - 5, 2.5, T_ROW_H, 'F');
            } else {
                fc(idx % 2 === 0 ? [239, 246, 255] : [221, 234, 250]);
                doc.rect(ML, y - 5, CW, T_ROW_H, 'F');
            }
            dc(C.separator); doc.setLineWidth(0.1); doc.line(ML, y + 1.8, W - MR, y + 1.8);

            doc.setFontSize(7.2);
            // Rank
            tc(C.textLight); doc.setFont('helvetica', 'normal');
            doc.text(String(idx + 1), tCols[0].x + 2, y);

            // Model name
            doc.setFont('helvetica', isCurrent ? 'bold' : 'normal'); tc(C.navy);
            const modelLabel = fitText(row.model + (isCurrent ? ' [ref]' : ''), tCols[1].w - 2);
            doc.text(modelLabel, tCols[1].x + 1.5, y);

            // Org
            doc.setFont('helvetica', 'normal'); tc(C.textSub);
            doc.text(fitText(row.org, tCols[2].w - 2), tCols[2].x + 1.5, y);

            // CO2 — gradient green-amber-red by rank
            const co2Val = parseFloat(row.co2) || 0;
            const ratio  = co2Max > co2Min ? (co2Val - co2Min) / (co2Max - co2Min) : 0;
            tc(ratio < 0.33 ? C.green : ratio < 0.66 ? C.amber : C.red);
            doc.setFont('helvetica', 'bold');
            doc.text(fitText(row.co2, tCols[3].w - 2), tCols[3].x + 1.5, y);

            // Savings — sanitize whitespace and unicode minus (\u2212 → '-') from DOM text
            doc.setFont('helvetica', 'normal');
            const sv = (row.savings || '').replace(/\s+/g, '').replace(/\u2212/g, '-');
            if      (sv.includes('-') || sv.includes('\u2212')) tc(C.green);
            else if (sv.includes('+'))                           tc(C.red);
            else                                                 tc(C.textLight);
            doc.text(fitText(sv || '-', tCols[4].w - 2), tCols[4].x + 1.5, y);

            // Speed / Latency
            tc(C.textSub);
            doc.text(fitText(row.tps,     tCols[5].w - 2), tCols[5].x + 1.5, y);
            doc.text(fitText(row.latency, tCols[6].w - 2), tCols[6].x + 1.5, y);

            // Label
            tc(labelColor(row.label)); doc.setFont('helvetica', 'bold');
            doc.text(row.label, tCols[7].x + 3, y);
            y += T_ROW_H;
        });

        // Stats footer
        y += 2;
        const avgCO2 = avgCO2val > 0 ? avgCO2val.toFixed(4) : '-';
        fc(C.bgLight); doc.rect(ML, y - 4.5, CW, T_ROW_H + 1, 'F');
        dc(C.navyMid); doc.setLineWidth(0.4); doc.line(ML, y - 4.5, W - MR, y - 4.5);
        doc.setFont('helvetica', 'bold');   doc.setFontSize(7.2); tc(C.navy);    doc.text('Estadisticas del conjunto:', ML + 2, y);
        doc.setFont('helvetica', 'normal'); tc(C.textSub);
        doc.text(`Min: ${co2Min.toFixed(4)} gCO2`, ML + 48, y);
        doc.text(`Max: ${co2Max.toFixed(4)} gCO2`, ML + 92, y);
        doc.text(`Media: ${avgCO2} gCO2`,           ML + 136, y);
        y += T_ROW_H + 2;

        // ═══════════════════════════════════════════════════════════════
        // PAGE 4 — KEY INSIGHTS & ANALYSIS
        // ═══════════════════════════════════════════════════════════════
        doc.addPage(); whitePage();
        y = 22;
        y = sectionHeader('4. Analisis e interpretacion de resultados', y);
        y += 3;

        // Insight 1: efficiency ratio
        y = subHeader('4.1 Rango de eficiencia del conjunto', y);
        const rangeText = spreadPct !== '-'
            ? `El modelo mas eficiente (${bestModel?.model || '-'}, Clase ${bestModel?.label || '-'}) emite ` +
              `${bco2.toFixed(4)} gCO2/query, mientras que el menos eficiente (${worstModel?.model || '-'}, Clase ${worstModel?.label || '-'}) ` +
              `emite ${wco2.toFixed(4)} gCO2/query. Esto supone una diferencia de ${spreadPct}x entre extremos, ` +
              `lo que evidencia la enorme variabilidad de huella de carbono segun el modelo elegido para una misma tarea de inferencia.`
            : 'No hay datos suficientes para calcular el rango de eficiencia.';
        y = bodyText(rangeText, ML, y, CW);
        y += 5;

        // Insight 2: reference model position
        y = subHeader('4.2 Posicion del modelo de referencia', y);
        if (currentRow && currentRank > 0) {
            const pctBetter   = ((currentRank - 1) / Math.max(summaryData.length - 1, 1) * 100).toFixed(0);
            const isTopThird  = currentRank <= Math.ceil(summaryData.length / 3);
            const isLastThird = currentRank > Math.floor(summaryData.length * 2 / 3);
            const rankAssess  = isTopThird
                ? 'posicionandose entre los modelos mas eficientes del conjunto analizado — una opcion sostenible destacada'
                : isLastThird
                ? 'situandose entre los modelos con mayor impacto medioambiental del conjunto. Existen alternativas significativamente mas eficientes disponibles en este analisis que podrian reducir la huella de carbono considerablemente'
                : 'situandose en la franja intermedia del conjunto en cuanto a eficiencia energetica, con margen de mejora frente a los modelos de la zona superior';
            const aboveBelowAvg = currentCO2 > avgCO2val
                ? `Sus emisiones superan la media del conjunto en un ${((currentCO2 / avgCO2val - 1) * 100).toFixed(0)}% (media: ${avgCO2} gCO2/query), lo que representa una penalizacion ambiental notable frente a la mayoria de alternativas disponibles en este analisis.`
                : `Sus emisiones se situan un ${((1 - currentCO2 / avgCO2val) * 100).toFixed(0)}% por debajo de la media del conjunto (media: ${avgCO2} gCO2/query), lo que confirma su buen posicionamiento ambiental dentro del universo de modelos analizado.`;
            const refText = `El modelo de referencia seleccionado (${currentModelName}) ocupa la posicion ${currentRank} de ${summaryData.length} ` +
                `con ${currentCO2.toFixed(4)} gCO2/query (Clase ${currentRow.label}), ${rankAssess}. ` +
                `Supera en eficiencia al ${pctBetter}% de los modelos analizados. ` +
                aboveBelowAvg;
            y = bodyText(refText, ML, y, CW);
        } else {
            y = bodyText('No se pudo determinar la posicion del modelo de referencia.', ML, y, CW);
        }
        y += 5;

        // Insight 3: top 3 alternatives
        y = subHeader('4.3 Alternativas mas eficientes al modelo de referencia', y);
        const alternatives = summaryData.filter(r => {
            const isCurr = r.model === currentModelName || r.model.startsWith(currentModelName.substring(0, 8));
            return !isCurr && parseFloat(r.co2) < currentCO2;
        }).slice(0, 3);
        if (alternatives.length > 0) {
            y = bodyText(
                'Los siguientes modelos presentan menor huella de carbono que el modelo de referencia y podrian considerarse como alternativas sostenibles:',
                ML, y, CW
            );
            y += 3;
            alternatives.forEach((alt, i) => {
                const altCO2 = parseFloat(alt.co2) || 0;
                const saving = currentCO2 > 0 ? ((1 - altCO2 / currentCO2) * 100).toFixed(0) : '?';
                y = checkPage(y, 12);
                fc(C.bgLight); doc.rect(ML, y - 4, CW, 10, 'F');
                fc(C.green);   doc.rect(ML, y - 4, 3, 10, 'F');
                doc.setFont('helvetica', 'bold');   doc.setFontSize(9);   tc(C.navy);    doc.text(`${i + 1}. ${alt.model}`, ML + 6, y);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); tc(C.textSub);
                doc.text(`${alt.co2} gCO2/query  |  Clase ${alt.label}  |  ${alt.tps} tok/s  |  Ahorro: ${saving}%`, ML + 6, y + 5.5);
                y += 13;
            });
        } else {
            y = infoBox('El modelo de referencia ya es el mas eficiente del conjunto o no hay alternativas con menor emision disponibles.', ML, y, CW, C.green);
        }
        y += 5;

        // Insight 4: scale impact
        y = checkPage(y, 40);
        y = subHeader('4.4 Impacto a escala productiva', y);
        const scaleText = currentCO2 > 0
            ? `A modo de referencia, si el modelo de referencia (${currentModelName}) procesase 1 millon de consultas diarias, ` +
              `generaria aproximadamente ${(currentCO2 * 1e6 / 1000).toFixed(1)} kg de CO2 al dia ` +
              `(${(currentCO2 * 1e6 * 365 / 1e6).toFixed(1)} toneladas al año). ` +
              `El modelo mas eficiente (${bestModel?.model}) reduciria esa cifra a ` +
              `${(bco2 * 1e6 / 1000).toFixed(1)} kg/dia (${(bco2 * 1e6 * 365 / 1e6).toFixed(1)} t/año), ` +
              `un ahorro de ${((1 - bco2 / currentCO2) * 100).toFixed(0)}%.`
            : 'No hay datos de emision del modelo de referencia para calcular el impacto a escala.';
        y = bodyText(scaleText, ML, y, CW);

        // ═══════════════════════════════════════════════════════════════
        // PAGE 5 — PARETO-OPTIMAL MODELS
        // ═══════════════════════════════════════════════════════════════
        doc.addPage(); whitePage();
        y = 22;
        y = sectionHeader('5. Modelos Pareto-optimos', y);
        y += 3;
        y = bodyText(
            'La frontera de Pareto identifica los modelos que ofrecen el mejor equilibrio posible entre los criterios activos (emisiones de CO2, velocidad en tokens/s y latencia). Un modelo es Pareto-optimo si ningun otro modelo lo supera en todos los criterios simultaneamente. Son la mejor eleccion objetiva cuando no se quiere sacrificar ningun aspecto del rendimiento o la sostenibilidad.',
            ML, y, CW
        );
        y += 5;
        y = bodyText(
            'A diferencia de simplemente elegir el modelo mas rapido o el de menor CO2, la seleccion Pareto incorpora trade-offs multidimensionales. Los modelos aqui listados representan puntos de la frontera eficiente del espacio de decision.',
            ML, y, CW
        );
        y += 8;

        if (PS.paretoModels && PS.paretoModels.length > 0) {
            PS.paretoModels.forEach((modelName, idx) => {
                const m = PS.table.find(r => r.model === modelName);
                if (!m) return;
                y = checkPage(y, 46);
                const co2Str = (m.co2_gCO2 || 0) < 0.01
                    ? (m.co2_gCO2 || 0).toExponential(2)
                    : (m.co2_gCO2 || 0).toFixed(4);
                const lbl    = m.environmental_label?.label || '?';
                const CARD_H = 40;
                fc(C.bgLight);  doc.rect(ML, y, CW, CARD_H, 'F');
                fc(C.navyMid);  doc.rect(ML, y, 3.5, CARD_H, 'F');
                dc(C.separator); doc.setLineWidth(0.2); doc.rect(ML, y, CW, CARD_H, 'S');

                // Badge
                fc(C.accentBlue); doc.roundedRect(ML + 8, y + 5, 22, 7, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); tc(C.white);
                doc.text(`Pareto #${idx + 1}`, ML + 10, y + 10);

                // Label badge
                const lblColor = labelColor(lbl);
                fc(lblColor); doc.roundedRect(W - MR - 22, y + 5, 18, 7, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); tc(C.white);
                doc.text(`Clase ${lbl}`, W - MR - 20, y + 10);

                doc.setFont('helvetica', 'bold');   doc.setFontSize(12); tc(C.navy);
                doc.text(m.model, ML + 8, y + 22);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);  tc(C.textSub);
                doc.text(m.organization || '-', ML + 8, y + 29);

                // Metrics row
                const metrics = [
                    `CO2: ${co2Str} gCO2/query`,
                    `Velocidad: ${(m.tokens_per_second || 0).toFixed(1)} tok/s`,
                    `Latencia: ${m.latency_ms != null ? m.latency_ms + ' ms' : '-'}`,
                ];
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8); tc(C.navyLt);
                let mx = ML + 8;
                metrics.forEach(met => {
                    doc.text(met, mx, y + 36);
                    mx += doc.getTextWidth(met) + 8;
                });
                y += CARD_H + 6;
            });
        } else {
            y = infoBox('No se identificaron modelos Pareto-optimos con los criterios activos actuales. Prueba a ajustar los pesos de los criterios en la interfaz del comparador.', ML, y, CW, C.accentTeal);
            y += 5;
        }

        // ── Dynamic interpretation texts ──
        const scatterInterpDyn = (() => {
            const paretoList  = PS.paretoModels || [];
            const paretoCount = paretoList.length;
            const topNames    = paretoList.slice(0, 3).join(', ');
            const zone = !currentRow ? '' :
                currentRank <= Math.ceil(summaryData.length / 3)
                    ? 'zona eficiente (esquina inferior derecha: baja emision y alta velocidad)'
                    : currentRank <= Math.ceil(summaryData.length * 2 / 3)
                    ? 'zona intermedia del grafico'
                    : 'zona de alta emision (esquina superior izquierda)';
            const refTps = (PS.table || []).find(r => r.model === currentModelName)?.tokens_per_second || 0;
            return (
                `Los ${summaryData.length} modelos evaluados bajo el mismo escenario presentan una dispersion de ${spreadPct}x entre el mas eficiente y el menos eficiente. ` +
                (paretoCount > 0
                    ? `Se identificaron ${paretoCount} modelo${paretoCount > 1 ? 's' : ''} en la frontera de Pareto — ${topNames}${paretoCount > 3 ? ' entre otros' : ''} —, que representan los mejores equilibrios posibles entre emision de CO2 y velocidad de inferencia: ningun otro modelo del conjunto los supera simultaneamente en ambos criterios. `
                    : `No se identificaron modelos Pareto-optimos con los criterios activos actuales, lo que indica que todos los modelos presentan algun trade-off entre emision y velocidad. `) +
                `El modelo mas sostenible es ${bestModel?.model || '-'} (${bestModel?.co2 || '-'} gCO2/query), ` +
                `mientras que ${worstModel?.model || '-'} registra la mayor huella de carbono con ${wco2.toFixed(4)} gCO2/query. ` +
                (currentRow && zone
                    ? `El modelo de referencia seleccionado, ${currentModelName}, se situa en la ${zone} con ${currentCO2.toFixed(4)} gCO2/query ` +
                      `y ${refTps > 0 ? refTps.toFixed(0) + ' tok/s' : 'velocidad no disponible'}.`
                    : '')
            );
        })();
        const barInterpDyn = (() => {
            const aboveAvg = summaryData.filter(r => (parseFloat(r.co2) || 0) > avgCO2val).length;
            const belowAvg = summaryData.length - aboveAvg;
            return (
                `De los ${summaryData.length} modelos analizados, ${belowAvg} presentan emisiones por debajo de la media del conjunto ` +
                `(${avgCO2val.toFixed(4)} gCO2/query) y ${aboveAvg} la superan. ` +
                `${bestModel?.model || '-'} destaca como la opcion mas sostenible ` +
                `(${bestModel?.co2 || '-'} gCO2/query, Clase ${bestModel?.label || '-'}), ` +
                `mientras que ${worstModel?.model || '-'} representa el mayor impacto ambiental ` +
                `(${wco2.toFixed(4)} gCO2/query, Clase ${worstModel?.label || '-'}), ` +
                `con una diferencia de ${spreadPct}x entre ambos extremos. ` +
                (currentRow
                    ? (currentCO2 > avgCO2val
                        ? `El modelo de referencia, ${currentModelName}, ocupa la posicion ${currentRank} de ${summaryData.length} en este analisis ` +
                          `y tiene una huella de carbono por encima de la media del conjunto (${avgCO2val.toFixed(4)} gCO2/query), ` +
                          `lo que lo situa como uno de los modelos menos eficientes del conjunto. ` +
                          `Existen ${currentRank - 1} alternativa${currentRank - 1 !== 1 ? 's' : ''} con menor impacto ambiental disponibles en este comparador.`
                        : `El modelo de referencia, ${currentModelName}, ocupa la posicion ${currentRank} de ${summaryData.length} en este analisis ` +
                          `y tiene una huella de carbono por debajo de la media del conjunto (${avgCO2val.toFixed(4)} gCO2/query), ` +
                          `siendo una opcion eficiente dentro del universo de modelos comparados.`)
                    : '')
            );
        })();

        // ═══════════════════════════════════════════════════════════════
        // CHART PAGES — White background compositing + Dominance Matrix
        // ═══════════════════════════════════════════════════════════════
        const charts = [
            { id: 'scatter-chart',
              num: '6',
              title: 'Grafico 6: Rendimiento vs Sostenibilidad',
              desc: 'Diagrama de dispersion (Scatter Plot) con escala logaritmica en ambos ejes. El eje X representa la velocidad de inferencia (tokens/s) y el eje Y las emisiones de CO2 por consulta. Los modelos situados en la esquina inferior derecha combinan alta velocidad y baja emision, siendo los mas deseables. Los puntos con anillo de pulso destacan los modelos Pareto-optimos.',
              interp: scatterInterpDyn },
            { type: 'matrix', num: '7', title: '7. Matriz de dominancia cruzada' },
            { id: 'vertical-bar-chart',
              num: '8',
              title: 'Grafico 8: Comparativa de emisiones CO2/query',
              desc: 'Grafico de barras con escala logaritmica en el eje Y. Cada barra representa las emisiones de CO2 por consulta de un modelo, coloreada segun su etiqueta de eficiencia energetica (verde = clase A, rojo = clase D). El modelo de referencia aparece resaltado.',
              interp: barInterpDyn },
        ];

        charts.forEach(ch => {

            // ── DOMINANCE MATRIX (synthetic page, built from data) ──
            if (ch.type === 'matrix') {
                doc.addPage(); whitePage();
                y = 22;
                y = sectionHeader('7. Matriz de dominancia cruzada', y);
                y += 2;
                y = bodyText(
                    'La siguiente matriz compara cada par de modelos de forma bilateral en tres criterios: emisiones CO2 por consulta, velocidad de inferencia (tokens/s) y latencia. ' +
                    'Para cada combinacion (fila i vs. columna j) se contabilizan los criterios ganados por cada modelo, mostrando el resultado como i:j. ' +
                    'Las celdas en verde intenso reflejan una ventaja clara o total del modelo de la fila; las rojas indican lo contrario; las grises, un empate. ' +
                    'Esta representacion permite identificar rapidamente que modelos dominan al conjunto y cuales presentan trade-offs segun el criterio priorizado.',
                    ML, y, CW
                );
                y += 6;

                function getMetricsForDom(row) {
                    const psRow = (PS.table || []).find(r =>
                        r.model === row.model || r.model.startsWith(row.model.substring(0, 8))
                    );
                    return {
                        co2: psRow ? (psRow.co2_gCO2 || 0)         : (parseFloat(row.co2) || 0),
                        tps: psRow ? (psRow.tokens_per_second || 0): (parseFloat(row.tps) || 0),
                        lat: psRow ? (psRow.latency_ms || 0)       : (parseFloat(row.latency) || 0),
                    };
                }
                function compareForDom(a, b) {
                    const am = getMetricsForDom(a), bm = getMetricsForDom(b);
                    let aW = 0, bW = 0;
                    if (am.co2 > 0 && bm.co2 > 0) { if (am.co2 < bm.co2) aW++; else if (bm.co2 < am.co2) bW++; }
                    if (am.tps > 0 && bm.tps > 0) { if (am.tps > bm.tps) aW++; else if (bm.tps > am.tps) bW++; }
                    if (am.lat > 0 && bm.lat > 0) { if (am.lat < bm.lat) aW++; else if (bm.lat < am.lat) bW++; }
                    return { aW, bW };
                }

                const MAX_DOM  = Math.min(summaryData.length, 8);
                const domData  = summaryData.slice(0, MAX_DOM);
                const abbrevN  = (n, max) => n.length > max ? n.substring(0, max - 1) + '.' : n;
                const LABEL_W  = 34;
                const CELL_W   = (CW - LABEL_W) / MAX_DOM;
                const DOM_ROW_H = 9;
                const matTopY  = y;

                // ── Header row ──
                fc(C.navyMid); doc.rect(ML, matTopY, CW, DOM_ROW_H, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); tc(C.white);
                doc.text('Fila vs Columna >', ML + 1, matTopY + 6.5);
                domData.forEach((m, j) => {
                    const cx = ML + LABEL_W + j * CELL_W + CELL_W / 2;
                    doc.text(abbrevN(m.model, 8), cx, matTopY + 6.5, { align: 'center' });
                });
                let rowY = matTopY + DOM_ROW_H;

                // ── Data rows ──
                domData.forEach((rowM, i) => {
                    fc(i % 2 === 0 ? [239, 246, 255] : [221, 234, 250]);
                    doc.rect(ML, rowY, CW, DOM_ROW_H, 'F');

                    // Row label
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); tc(C.navy);
                    doc.text(abbrevN(rowM.model, 16), ML + 1, rowY + 6.5);

                    // Cells
                    domData.forEach((colM, j) => {
                        const cx = ML + LABEL_W + j * CELL_W;
                        if (i === j) {
                            fc(C.separator);
                            doc.rect(cx, rowY, CELL_W, DOM_ROW_H, 'F');
                            tc(C.textLight); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                            doc.text('-', cx + CELL_W / 2, rowY + 6.5, { align: 'center' });
                        } else {
                            const { aW, bW } = compareForDom(rowM, colM);
                            let bg, fg;
                            if      (aW === 3 && bW === 0) { bg = [187, 247, 208]; fg = C.green;    }
                            else if (aW === 2 && bW === 0) { bg = [209, 250, 229]; fg = C.greenMid; }
                            else if (aW > bW)              { bg = [240, 253, 244]; fg = C.greenMid; }
                            else if (aW === bW)            { bg = [241, 245, 249]; fg = C.textSub;  }
                            else if (bW === 3 && aW === 0) { bg = [252, 192, 192]; fg = C.red;      }
                            else                           { bg = [254, 226, 226]; fg = C.red;      }
                            fc(bg); doc.rect(cx, rowY, CELL_W, DOM_ROW_H, 'F');
                            tc(fg); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
                            doc.text(`${aW}:${bW}`, cx + CELL_W / 2, rowY + 6.5, { align: 'center' });
                        }
                    });

                    // Horizontal separator
                    dc(C.separator); doc.setLineWidth(0.1);
                    doc.line(ML, rowY + DOM_ROW_H, W - MR, rowY + DOM_ROW_H);
                    rowY += DOM_ROW_H;
                });

                // Vertical separators
                dc([176, 190, 208]); doc.setLineWidth(0.25);
                doc.line(ML + LABEL_W, matTopY, ML + LABEL_W, rowY);
                domData.forEach((_, j) => {
                    dc(C.separator); doc.setLineWidth(0.1);
                    doc.line(ML + LABEL_W + j * CELL_W, matTopY + DOM_ROW_H, ML + LABEL_W + j * CELL_W, rowY);
                });

                // Outer border
                dc(C.navyMid); doc.setLineWidth(0.4);
                doc.rect(ML, matTopY, CW, rowY - matTopY, 'S');

                y = rowY + 8;

                // ── Legend ──
                y = checkPage(y, 50);
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); tc(C.navy);
                doc.text('Leyenda de colores:', ML, y);
                y += 5;
                const domLegend = [
                    { bg: [187, 247, 208], fg: C.green,    txt: '3:0  Dominancia estricta: la fila supera a la columna en TODOS los criterios (CO2 + velocidad + latencia)' },
                    { bg: [209, 250, 229], fg: C.greenMid, txt: '2:0  Ventaja clara: la fila gana en 2 criterios sin perder ninguno' },
                    { bg: [240, 253, 244], fg: C.greenMid, txt: '2:1  Ventaja relativa: la fila gana en la mayoria de criterios' },
                    { bg: [241, 245, 249], fg: C.textSub,  txt: '1:1  Empate: misma cantidad de criterios ganados por cada modelo' },
                    { bg: [254, 226, 226], fg: C.red,      txt: '1:2  Desventaja relativa: la columna gana en la mayoria de criterios' },
                    { bg: [252, 192, 192], fg: C.red,      txt: '0:3  Dominancia estricta inversa: la columna supera en TODOS los criterios' },
                ];
                domLegend.forEach(li => {
                    fc(li.bg); doc.rect(ML, y - 3.5, 8, 5, 'F');
                    dc(li.fg); doc.setLineWidth(0.3); doc.rect(ML, y - 3.5, 8, 5, 'S');
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); tc(C.textSub);
                    doc.text(li.txt, ML + 11, y);
                    y += 6;
                });

                y += 4;

                // ── Dynamic "Cómo leer" with actual model findings ──
                let mostDomModel = domData[0]?.model || '', mostDomWins = -1;
                let leastDomModel = domData[0]?.model || '', leastDomWins = Infinity;
                domData.forEach((rowM, i) => {
                    let wins = 0;
                    domData.forEach((colM, j) => {
                        if (i === j) return;
                        const { aW, bW } = compareForDom(rowM, colM);
                        if (aW > bW) wins++;
                    });
                    if (wins > mostDomWins)  { mostDomWins  = wins; mostDomModel  = rowM.model; }
                    if (wins < leastDomWins) { leastDomWins = wins; leastDomModel = rowM.model; }
                });
                const exA = domData[0]?.model || 'Modelo A';
                const exB = domData[domData.length - 1]?.model || 'Modelo B';
                const exResult = compareForDom(domData[0], domData[domData.length - 1]);
                y = infoBox(
                    `C\u00f3mo leer la matriz: cada fila es el modelo "atacante" y cada columna el "defensor". ` +
                    `Por ejemplo, la celda (${exA} vs. ${exB}) muestra ${exResult.aW}:${exResult.bW}, ` +
                    `lo que significa que ${exA} gana en ${exResult.aW} de los tres criterios frente a ${exB}. ` +
                    `Segun este analisis, ${mostDomModel} acumula el mayor numero de victorias frente al resto de modelos, ` +
                    `posicionandose como el mas dominante del subconjunto comparado. ` +
                    `${leastDomModel !== mostDomModel ? leastDomModel + ' presenta el mayor numero de desventajas. ' : ''}` +
                    `La matriz es asimetrica: si la celda (i, j) = 2:1, necesariamente la celda (j, i) = 1:2.`,
                    ML, y, CW, C.accentTeal
                );
                return; // exit this forEach iteration, skip canvas code below
            }

            // ── NORMAL CHART PAGE ──
            const canvas = document.getElementById(ch.id);
            if (!canvas) return;
            try {
                const img = canvasToWhiteImg(canvas);
                doc.addPage(); whitePage();
                y = 22;
                y = sectionHeader(ch.title, y);
                y += 2;
                y = infoBox(ch.desc, ML, y, CW, C.accentBlue);
                y += 4;
                const ratio   = canvas.width / canvas.height;
                const availH  = H - y - 30;
                const maxImgH = Math.min(availH * 0.65, 130);
                const imgH    = Math.min(maxImgH, CW / ratio);
                const imgW    = Math.min(imgH * ratio, CW);
                const imgX    = ML + (CW - imgW) / 2;
                dc(C.separator); doc.setLineWidth(0.3);
                doc.rect(imgX - 1, y - 1, imgW + 2, imgH + 2, 'S');
                doc.addImage(img, 'PNG', imgX, y, imgW, imgH);
                y += imgH + 6;
                y = checkPage(y, 20);
                y = infoBox(ch.interp, ML, y, CW, C.accentTeal);

                // ── Tabla de valores exactos (solo en la página del scatter) ──
                if (ch.id === 'scatter-chart' && PS.table && PS.table.length > 0) {
                    const allRows = [...PS.table].sort((a, b) => (a.co2_gCO2 || 0) - (b.co2_gCO2 || 0));
                    const paretoSet = new Set(PS.paretoModels || []);
                    const ref = allRows[0];

                    const ptCols = [
                        { label: 'Modelo',           w: 54 },
                        { label: 'Clase',            w: 14 },
                        { label: 'CO2/query (gCO2)', w: 38 },
                        { label: 'vs. ref. CO2',     w: 22 },
                        { label: 'Vel. (tok/s)',      w: 24 },
                        { label: 'vs. ref. Vel.',     w: 22 },
                    ];
                    if (PS.criteria.latency) {
                        ptCols.push({ label: 'Lat. (ms/tok)', w: 26 });
                        ptCols.push({ label: 'vs. ref. Lat.', w: 22 });
                    }

                    const ptW  = ptCols.reduce((s, c) => s + c.w, 0);
                    const ptX  = ML + (CW - ptW) / 2;
                    const ROW_H = 7;
                    const HDR_H = 8;

                    y = checkPage(y, 20 + HDR_H + allRows.length * ROW_H + 10);
                    y += 8;

                    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); tc(C.navy);
                    doc.text('Tabla de valores exactos — Todos los modelos (criterios activos del frente de Pareto)', ML, y);
                    y += 4;
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.textSub);
                    doc.text('Diferencia % respecto al modelo de menor CO2/query (referencia = ' + ref.model + '). Estrella = Pareto-optimo.', ML, y);
                    y += 5;

                    // Header
                    fc(C.navy); doc.rect(ptX, y, ptW, HDR_H, 'F');
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); tc(C.white);
                    let ptcx = ptX;
                    ptCols.forEach(col => {
                        doc.text(col.label, ptcx + 2, y + 5.5, { maxWidth: col.w - 3 });
                        ptcx += col.w;
                    });
                    y += HDR_H;

                    function ptPctStr(a, b, higherBetter) {
                        if (!b || isNaN(a) || isNaN(b)) return '\u2014';
                        const pct = ((a - b) / Math.abs(b)) * 100;
                        if (Math.abs(pct) < 0.1) return '= igual';
                        const sign = pct > 0 ? '+' : '';
                        return sign + pct.toFixed(1) + '%';
                    }
                    function ptCO2Str(v) {
                        if (v == null || isNaN(v)) return '\u2014';
                        return v < 0.01 ? v.toExponential(3) : v.toFixed(5);
                    }
                    function ptPctColor(a, b, higherBetter) {
                        if (!b || isNaN(a) || isNaN(b)) return C.textSub;
                        const pct = ((a - b) / Math.abs(b)) * 100;
                        if (Math.abs(pct) < 0.1) return C.textSub;
                        const good = higherBetter ? pct > 0 : pct < 0;
                        return good ? [0, 130, 60] : [200, 50, 50];
                    }

                    // Rows
                    allRows.forEach((row, idx) => {
                        const isRef        = idx === 0;
                        const isPareto     = paretoSet.has(row.model);
                        const isFormRef    = !!currentRow && row.model === currentModelName;
                        const bgRgb        = isPareto   ? [220, 240, 230]
                                           : isFormRef  ? [230, 238, 255]
                                           : (idx % 2 === 0 ? [245, 248, 252] : [235, 240, 248]);
                        fc(bgRgb); doc.rect(ptX, y, ptW, ROW_H, 'F');
                        if (isPareto)  { fc([0, 160, 80]); doc.rect(ptX, y, 2, ROW_H, 'F'); }
                        if (isFormRef) { fc(C.navy);       doc.rect(ptX + ptW - 2, y, 2, ROW_H, 'F'); }
                        dc(C.separator); doc.setLineWidth(0.15);
                        doc.line(ptX, y + ROW_H, ptX + ptW, y + ROW_H);

                        const co2 = row.co2_gCO2 || 0;
                        const tps = row.tokens_per_second || 0;
                        const lbl = row.environmental_label?.label || '?';
                        const lat = row.latency_ms_per_token;

                        ptcx = ptX;
                        doc.setFont('helvetica', (isPareto || isFormRef) ? 'bold' : 'normal'); doc.setFontSize(7); tc(C.navy);
                        const ptPrefix = isPareto ? '(P) ' : isFormRef ? '[*] ' : '    ';
                        doc.text(ptPrefix + row.model + (isFormRef ? ' [ref]' : ''), ptcx + 2, y + 4.8, { maxWidth: ptCols[0].w - 3 });
                        ptcx += ptCols[0].w;

                        const lblC = labelColor(lbl);
                        fc(lblC); doc.roundedRect(ptcx + 1, y + 1.5, 10, 4, 0.8, 0.8, 'F');
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); tc([255,255,255]);
                        doc.text(lbl, ptcx + 3, y + 4.5);
                        ptcx += ptCols[1].w;

                        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); tc(C.textMain);
                        doc.text(ptCO2Str(co2), ptcx + 2, y + 4.8);
                        ptcx += ptCols[2].w;

                        const co2Diff = isRef ? 'referencia' : ptPctStr(co2, ref.co2_gCO2, false);
                        tc(isRef ? C.textSub : ptPctColor(co2, ref.co2_gCO2, false));
                        doc.setFont('helvetica', isRef ? 'italic' : 'bold'); doc.setFontSize(6.5);
                        doc.text(co2Diff, ptcx + 2, y + 4.8);
                        ptcx += ptCols[3].w;

                        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); tc(C.textMain);
                        doc.text(tps > 0 ? tps.toFixed(1) : '\u2014', ptcx + 2, y + 4.8);
                        ptcx += ptCols[4].w;

                        const tpsDiff = isRef ? 'referencia' : ptPctStr(tps, ref.tokens_per_second || 0, true);
                        tc(isRef ? C.textSub : ptPctColor(tps, ref.tokens_per_second || 0, true));
                        doc.setFont('helvetica', isRef ? 'italic' : 'bold'); doc.setFontSize(6.5);
                        doc.text(tpsDiff, ptcx + 2, y + 4.8);
                        ptcx += ptCols[5].w;

                        if (PS.criteria.latency) {
                            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); tc(C.textMain);
                            doc.text(lat != null ? lat.toFixed(2) : '\u2014', ptcx + 2, y + 4.8);
                            ptcx += ptCols[6].w;
                            const latDiff = isRef ? 'referencia' : ptPctStr(lat, ref.latency_ms_per_token, false);
                            tc(isRef ? C.textSub : ptPctColor(lat, ref.latency_ms_per_token, false));
                            doc.setFont('helvetica', isRef ? 'italic' : 'bold'); doc.setFontSize(6.5);
                            doc.text(latDiff, ptcx + 2, y + 4.8);
                        }
                        y += ROW_H;
                    });

                    dc(C.navyMid); doc.setLineWidth(0.4);
                    doc.line(ptX, y, ptX + ptW, y);
                    y += 3;
                    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); tc(C.textSub);
                    const ftLines = doc.splitTextToSize(
                        '(P) = Modelo Pareto-optimo (fondo verde). ' +
                        (currentRow ? '[*] = Modelo de referencia seleccionado en el formulario (fondo azul, borde derecho navy). ' : '') +
                        'La columna vs. ref. CO2 y vs. ref. Vel. muestra la diferencia porcentual respecto al modelo de menor CO2/query. Verde = mejor que la referencia; Rojo = peor.',
                        CW
                    );
                    doc.text(ftLines, ML, y);
                }
            } catch (e) {
                doc.addPage(); whitePage();
                y = 22;
                y = sectionHeader(ch.title, y);
                y = bodyText('No se pudo exportar el grafico (canvas inaccesible).', ML, y, CW);
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // GLOSSARY PAGE (9)
        // ═══════════════════════════════════════════════════════════════
        doc.addPage(); whitePage();
        y = 22;
        y = sectionHeader('9. Glosario de terminos', y);
        y += 3;
        y = bodyText(
            'Este glosario define los terminos tecnicos utilizados en este informe comparativo de modelos de IA.',
            ML, y, CW
        );
        y += 5;

        const glossary = [
            ['CO2/query (gCO2)',
             'Gramos de CO2 equivalente emitidos por una sola consulta al modelo de IA, considerando exclusivamente la fase de inferencia bajo el escenario configurado. Es la metrica principal de comparacion entre modelos en este informe.'],
            ['energy_wh_per_1k_tokens',
             'Consumo energetico del modelo por cada 1.000 tokens procesados (entrada + salida). Es el unico parametro que diferencia a los modelos en este comparador: todos los demas factores del escenario permanecen fijos. A mayor valor, mayor huella de carbono por consulta.'],
            ['Etiqueta energetica',
             'Clasificacion de eficiencia basada en percentiles calculados sobre el dataset completo (~693.000 combinaciones). A+++ = top 5% mas eficiente; A++ = 5-15%; A+ = 15-30%; A = 30-50%; B = 50-70%; C = 70-85%; D = 85-95%. Permite ubicar cada modelo en el universo de referencia.'],
            ['Tokens/s (velocidad de inferencia)',
             'Numero de tokens generados por segundo por el modelo. Un valor mas alto indica mayor rapidez de respuesta. Junto con el CO2/query, define el perfil de eficiencia de cada modelo en el grafico de dispersion.'],
            ['Latencia (ms)',
             'Tiempo total estimado de respuesta desde el envio de la consulta hasta la recepcion completa de la respuesta. Depende principalmente de la velocidad del modelo y del numero de tokens de salida.'],
            ['Ahorro vs. referencia',
             'Diferencia porcentual de emisiones entre cada modelo y el modelo de referencia seleccionado. Un valor negativo indica que ese modelo emite menos CO2 (es mas eficiente que la referencia). Un valor positivo indica mayor emision. Se calcula como: (CO2_modelo - CO2_ref) / CO2_ref x 100.'],
            ['Pareto-optimo',
             'Un modelo es Pareto-optimo si ningun otro modelo del conjunto lo supera simultaneamente en todos los criterios activos (CO2, velocidad, latencia). La frontera de Pareto representa el subconjunto de modelos que ofrecen los mejores trade-offs posibles: elegir uno de estos modelos garantiza que no existe ninguna alternativa mejor en todos los criterios a la vez.'],
            ['Dominancia cruzada',
             'Relacion bilateral entre dos modelos: el modelo A domina a B si gana en mas criterios de los que pierde. La matriz de dominancia (seccion 7 de este informe) muestra estas relaciones para todos los pares, permitiendo identificar que modelos son globalmente superiores y cuales presentan debilidades especificas frente a sus competidores.'],
            ['TOPSIS',
             'Technique for Order of Preference by Similarity to Ideal Solution. Metodo de decision multicriterio que ordena los modelos midiendo su distancia euclidea al escenario ideal (mejor en todos los criterios) y al anti-ideal (peor en todos). Nota: el ranking TOPSIS no aparece en ninguna de las secciones ni graficas de este informe PDF; puede consultarse de forma interactiva en la seccion de analisis TOPSIS de la herramienta web.'],
        ];

        glossary.forEach(([term, def]) => {
            y = checkPage(y, 20);
            fc(C.bgLight); doc.rect(ML, y - 4, CW, 5, 'F');
            fc(C.navyMid); doc.rect(ML, y - 4, 3, 5, 'F');
            doc.setFont('helvetica', 'bold');   doc.setFontSize(8.5); tc(C.navyMid); doc.text(term, ML + 6, y);
            y += 5;
            const defLines = doc.splitTextToSize(def, CW - 4);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); tc(C.textSub); doc.text(defLines, ML + 2, y);
            y += defLines.length * 4.8 + 2;
            dc(C.separator); doc.setLineWidth(0.15); doc.line(ML, y, W - MR, y);
            y += 5;
        });

        // ═══════════════════════════════════════════════════════════════
        // POST-PROCESSING: footer + page numbers on all pages
        // ═══════════════════════════════════════════════════════════════
        const totalPages = doc.internal.getNumberOfPages();
        for (let pg = 1; pg <= totalPages; pg++) {
            doc.setPage(pg);
            // Same footer for all pages (including cover)
            fc(C.navyMid); doc.rect(0, H - 8, W, 8, 'F');
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); tc([147, 197, 253]);
            doc.text('TFG - Evaluacion del impacto medioambiental de modelos de IA  |  Antonio Luis Jimenez de la Fuente', ML, H - 3);
            const pgLabel = `Pag. ${pg} / ${totalPages}`;
            doc.text(pgLabel, W - MR - doc.getTextWidth(pgLabel), H - 3);
        }

        doc.save(`informe_comparativo_modelos_IA_${dateStr}.pdf`);
    }

    // ------------------------------------------------------------------
    // Simulation (Tab 5) - TODAS LAS TAREAS EN VANILLA JS
    // ------------------------------------------------------------------
    
    // Estado global para simulación
    let SIM_STATE = {
        queries_dia: 1000000,
        co2_por_query: 0.00413,      // gCO2/query (actualizado al calcular)
        energia_por_query: 0.00000185,  // kWh/query
        modelo_eficiente: 'Phi-2',
        factor_eficiente: 0.05,
        horizonte_anos: 5,
        crecimiento_pct: 0,
        mostrar_todos_modelos: false,
        overhead_depl_kg: 0,
    };

    const PRESETS_SIMULACION = [
        { label: 'Personal',    value: 100 },
        { label: 'Startup',     value: 10000 },
        { label: 'Empresa',     value: 1000000 },
        { label: 'Gran escala', value: 100000000 },
    ];

    const MODELOS_EFICIENTES_SIM_COLORS = ['#4ade80', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa'];
    const MODELOS_EFICIENTES_SIM_BGS = ['rgba(74,222,128,.12)', 'rgba(96,165,250,.12)', 'rgba(251,191,36,.12)', 'rgba(244,114,182,.12)', 'rgba(167,139,250,.12)'];

    function buildModelosEficientes() {
        // Construir dinámicamente a partir de la tabla de comparación
        if (PS.table.length > 0 && PS.currentModel) {
            const currentModelName = (OPTIONS.models || []).find(m => m.model_id === PS.currentModel)?.model_name || '';
            const currentRow = PS.table.find(r => r.model === currentModelName);
            if (currentRow && currentRow.co2_gCO2 > 0) {
                const others = PS.table
                    .filter(r => r.model !== currentModelName && r.co2_gCO2 > 0 && !r.is_custom)
                    .map(r => ({ nombre: r.model, factor: r.co2_gCO2 / currentRow.co2_gCO2 }))
                    .filter(m => m.factor < 1)
                    .sort((a, b) => a.factor - b.factor)
                    .slice(0, 3);
                if (others.length > 0) {
                    return others.map((m, i) => ({
                        nombre: m.nombre,
                        factor: Math.round(m.factor * 100) / 100,
                        color: MODELOS_EFICIENTES_SIM_COLORS[i % MODELOS_EFICIENTES_SIM_COLORS.length],
                        bg: MODELOS_EFICIENTES_SIM_BGS[i % MODELOS_EFICIENTES_SIM_BGS.length],
                    }));
                }
            }
        }
        // Fallback estático
        return [
            { nombre: 'Phi-2',      factor: 0.05, color: '#4ade80', bg: 'rgba(74,222,128,.12)' },
            { nombre: 'Mistral 7B', factor: 0.07, color: '#60a5fa', bg: 'rgba(96,165,250,.12)' },
            { nombre: 'Gemma 7B',   factor: 0.08, color: '#fbbf24', bg: 'rgba(251,191,36,.12)' },
        ];
    }

    // Referencia mutable que se actualiza al recalcular
    let MODELOS_EFICIENTES_SIM = buildModelosEficientes();


    // TAREA 1: Inicializar preset slider + input
    function initSimulacionPresets() {
        const containerPresets = document.getElementById('preset-chips-container');
        if (!containerPresets) return;

        containerPresets.innerHTML = '';
        PRESETS_SIMULACION.forEach(preset => {
            const btn = document.createElement('button');
            btn.className = 'preset-chip';
            btn.dataset.value = preset.value;
            btn.innerHTML = `${preset.label}<span class="preset-chip-val">${preset.value.toLocaleString('es-ES')}</span>`;
            btn.onclick = () => updateQueriesDia(preset.value);
            containerPresets.appendChild(btn);
        });

        const slider = document.getElementById('sim-slider');
        const inputNumeric = document.getElementById('sim-input-numeric');

        if (slider) {
            slider.oninput = () => updateQueriesDia(Math.round(Math.pow(10, parseFloat(slider.value))));
        }
        if (inputNumeric) {
            inputNumeric.oninput = () => {
                const v = parseInt(inputNumeric.value.replace(/\D/g, '')) || 0;
                updateQueriesDia(v);
            };
        }

        updateSliderUI();
    }

    function updateQueriesDia(value) {
        SIM_STATE.queries_dia = Math.max(100, Math.min(100000000, value));
        updateSliderUI();
        renderTarea0ImpactoAnual();
        renderTarea2KPIs();
        renderTarea3Equivalencias();
        renderTarea4Grafico();
        renderTarea5BreakEven();
        renderTarea6Sensitivity();
    }

    function updateSliderUI() {
        const slider = document.getElementById('sim-slider');
        const bigNumber = document.getElementById('sim-big-number');
        const compactCount = document.getElementById('sim-compact-count');
        const formatted = SIM_STATE.queries_dia.toLocaleString('es-ES');

        if (slider) slider.value = Math.log10(SIM_STATE.queries_dia);
        if (bigNumber) bigNumber.textContent = formatted;
        if (compactCount) compactCount.textContent = formatted;

        document.querySelectorAll('.preset-chip').forEach(chip => {
            chip.classList.toggle('active', parseInt(chip.dataset.value) === SIM_STATE.queries_dia);
        });
    }

    // TAREA 2: 6 KPI Cards
    function renderTarea2KPIs() {
        const container = document.getElementById('tarea2-kpi-cards');
        if (!container) return;

        const co2_ano_g = SIM_STATE.queries_dia * 365 * SIM_STATE.co2_por_query;
        const co2_ano_kg = co2_ano_g / 1000;
        const co2_ano_t = co2_ano_kg / 1000;
        const energia_ano_kWh = SIM_STATE.queries_dia * 365 * SIM_STATE.energia_por_query;
        const energia_ano_MWh = energia_ano_kWh / 1000;
        const agua_litros = SIM_STATE.queries_dia * 365 * 0.0000482;
        const coste_euro = energia_ano_kWh * 0.12;

        const _fmtCo2 = (kg) => {
            if (kg >= 1000)    return { val: (kg/1000).toLocaleString('es-ES', {maximumFractionDigits:2}), unit: 'toneladas CO₂' };
            if (kg >= 0.001)   return { val: kg.toLocaleString('es-ES', {maximumFractionDigits:3}), unit: 'kg CO₂' };
            const g = kg * 1000;
            if (g >= 0.001)    return { val: g.toLocaleString('es-ES', {maximumFractionDigits:3}), unit: 'g CO₂' };
            return { val: (g * 1000).toLocaleString('es-ES', {maximumFractionDigits:3}), unit: 'mg CO₂' };
        };
        const co2Disp   = _fmtCo2(co2_ano_kg);
        const proj5Disp = _fmtCo2(co2_ano_kg * 5);

        const energyDisp = (() => {
            if (energia_ano_MWh >= 0.01) return { val: energia_ano_MWh.toLocaleString('es-ES', {maximumFractionDigits:3}), unit: 'MWh/año' };
            if (energia_ano_kWh >= 0.001) return { val: energia_ano_kWh.toLocaleString('es-ES', {maximumFractionDigits:3}), unit: 'kWh/año' };
            return { val: (energia_ano_kWh * 1000).toLocaleString('es-ES', {maximumFractionDigits:3}), unit: 'Wh/año' };
        })();

        const waterDisp = (() => {
            if (agua_litros >= 1000) return { val: (agua_litros/1000).toLocaleString('es-ES', {maximumFractionDigits:2}), unit: 'mil litros/año' };
            if (agua_litros >= 0.01) return { val: agua_litros.toLocaleString('es-ES', {maximumFractionDigits:2}), unit: 'litros/año' };
            return { val: (agua_litros * 1000).toLocaleString('es-ES', {maximumFractionDigits:2}), unit: 'ml/año' };
        })();

        const costDisp = (() => {
            if (coste_euro >= 0.01) return { val: coste_euro.toLocaleString('es-ES', {maximumFractionDigits:2}), unit: '€/año' };
            if (coste_euro >= 0.0001) return { val: (coste_euro*100).toLocaleString('es-ES', {maximumFractionDigits:4}), unit: 'céntimos/año' };
            return { val: (coste_euro*1000).toLocaleString('es-ES', {maximumFractionDigits:4}), unit: 'm€/año' };
        })();

        const kpis = [
            { icon: 'hash',               label: 'Queries/día',       value: SIM_STATE.queries_dia.toLocaleString('es-ES'), unit: 'queries/día' },
            { icon: 'cloud',              label: 'CO₂ anual',         value: co2Disp.val,    unit: co2Disp.unit },
            { icon: 'zap',                label: 'Energía anual',     value: energyDisp.val, unit: energyDisp.unit },
            { icon: 'droplets',           label: 'Agua estimada',     value: waterDisp.val,  unit: waterDisp.unit },
            { icon: 'circle-dollar-sign', label: 'Coste energético',  value: costDisp.val,   unit: costDisp.unit },
            { icon: 'trending-up',        label: 'Proyección 5 años', value: proj5Disp.val,  unit: proj5Disp.unit },
        ];

        container.innerHTML = `
            <div class="card" style="margin-bottom:24px;">
                <div class="card-title"><i data-lucide="activity"></i> Métricas de impacto anual</div>
                <div class="metrics-grid">
                    ${kpis.map(k => metricBox(k.icon, k.label, null, k.unit, null, k.value)).join('')}
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    // Pool de equivalencias con divisores en kg CO₂
    const EQUIVALENCIAS_POOL = [
        { icon: 'search',       label: 'Búsquedas en Google',     divisor: 0.0002, detailFn: n => `${fmtBigNum(n)} búsquedas en Google` },
        { icon: 'smartphone',   label: 'Cargas de móvil',         divisor: 0.005,  detailFn: n => `${fmtBigNum(n)} cargas completas de smartphone` },
        { icon: 'monitor-play', label: 'Horas de streaming',      divisor: 0.036,  detailFn: n => `${formatNum(n)} horas de Netflix` },
        { icon: 'car',          label: 'Km en coche',             divisor: 0.12,   detailFn: n => `${formatNum(n)} km en coche` },
        { icon: 'fuel',         label: 'Litros de gasolina',      divisor: 2.3,    detailFn: n => `${formatNum(n)} litros de gasolina quemada` },
        { icon: 'tree-pine',    label: 'Árboles para compensar',  divisor: 21,     detailFn: n => `${formatNum(n)} árboles necesarios para absorber` },
        { icon: 'plane',        label: 'Vuelos domésticos',       divisor: 150,    detailFn: n => `${formatNum(n)} vuelos nacionales` },
        { icon: 'plane-takeoff',label: 'Vuelos transatlánticos',  divisor: 986,    detailFn: n => `${formatNum(n)} vuelos NYC–Londres` },
        { icon: 'car',          label: 'Años conduciendo',        divisor: 4600,   detailFn: n => `${n.toFixed(2)} años con coche medio` },
        { icon: 'home',         label: 'Años de hogar medio',     divisor: 7500,   detailFn: n => `${n.toFixed(2)} años de consumo doméstico` },
        { icon: 'globe',        label: 'Personas europeas/año',   divisor: 8000,   detailFn: n => `Equivale a ${n.toFixed(2)} europeos durante 1 año` },
    ];

    // Selecciona las 6 equivalencias más significativas para el volumen dado
    function pickEquivalencias(co2_kg) {
        return EQUIVALENCIAS_POOL
            .map(eq => ({ ...eq, ratio: co2_kg / eq.divisor }))
            .filter(eq => eq.ratio >= 0.1)
            .sort((a, b) => {
                // Preferir ratios en rango "legible": 1 a 10,000
                const idealLog = 2; // ~100
                const scoreA = Math.abs(Math.log10(Math.max(a.ratio, 0.1)) - idealLog);
                const scoreB = Math.abs(Math.log10(Math.max(b.ratio, 0.1)) - idealLog);
                return scoreA - scoreB;
            })
            .slice(0, 6);
    }

    // TAREA 3: Grid de Equivalencias (adaptativo)
    function renderTarea3Equivalencias() {
        const container = document.getElementById('tarea3-equivalencias');
        if (!container) return;

        const co2_kg = (SIM_STATE.queries_dia * 365 * SIM_STATE.co2_por_query) / 1000;
        const selected = pickEquivalencias(co2_kg);

        const fmtVal = (ratio) => {
            if (ratio >= 1000000) return fmtBigNum(ratio);
            if (ratio >= 100) return Math.round(ratio).toLocaleString('es-ES');
            if (ratio >= 1) return ratio.toFixed(1);
            return ratio.toFixed(2);
        };

        container.innerHTML = `
            <div class="card" style="margin-bottom:24px;">
                <div class="card-title"><i data-lucide="leaf"></i> Equivalencias intuitivas (anual)</div>
                <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">Comprende tu impacto en términos cotidianos.</p>
                <div class="breakdown-grid">
                    ${selected.map(eq => `
                        <div class="breakdown-card equiv-card" title="${eq.detailFn(eq.ratio)}">
                            <div class="breakdown-icon"><i data-lucide="${eq.icon}"></i></div>
                            <div class="breakdown-label">${eq.label}</div>
                            <div class="breakdown-value">${fmtVal(eq.ratio)}</div>
                            <div class="equiv-detail">${eq.detailFn(eq.ratio)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    // TAREA 4: Proyección comparativa + Switch Hoy (opciones 1+3 combinadas)
    function renderTarea4Grafico() {
        const container = document.getElementById('tarea4-grafico-comparativo');
        if (!container) return;

        const anos = SIM_STATE.horizonte_anos;
        const growth = SIM_STATE.crecimiento_pct / 100;
        const todosModos = SIM_STATE.mostrar_todos_modelos;
        const fmtU = v => { if (v <= 0) return '0'; if (v >= 1000) return (v/1000).toFixed(2)+' t'; if (v >= 0.1) return v.toFixed(2)+' kg'; const g = v*1000; if (g >= 0.1) return g.toFixed(2)+' g'; const mg = g*1000; return mg >= 0.1 ? mg.toFixed(2)+' mg' : (mg*1000).toFixed(2)+' µg'; };
        const modelEf = MODELOS_EFICIENTES_SIM.find(m => m.nombre === SIM_STATE.modelo_eficiente) || MODELOS_EFICIENTES_SIM[0];

        // Build cumulative data for all models
        let cumActual = 0;
        const cumEfMap = Object.fromEntries(MODELOS_EFICIENTES_SIM.map(m => [m.nombre, 0]));
        const labels = [], dataActual = [], csvRows = [];
        const dataPerModel = Object.fromEntries(MODELOS_EFICIENTES_SIM.map(m => [m.nombre, []]));
        for (let y = 1; y <= anos; y++) {
            const qd = SIM_STATE.queries_dia * Math.pow(1 + growth, y - 1);
            const co2yr = (qd * 365 * SIM_STATE.co2_por_query) / 1000;
            cumActual += co2yr;
            labels.push(`Año ${y}`);
            dataActual.push(cumActual);
            const rowEf = {};
            MODELOS_EFICIENTES_SIM.forEach(m => {
                cumEfMap[m.nombre] += co2yr * m.factor;
                dataPerModel[m.nombre].push(cumEfMap[m.nombre]);
                rowEf[m.nombre] = cumEfMap[m.nombre];
            });
            csvRows.push({ ano: y, actual: cumActual, ...rowEf });
        }

        const totalActual = dataActual[dataActual.length - 1];
        const anoLabel = `${anos} año${anos > 1 ? 's' : ''}`;

        // Switch-hoy: daily saving with currently selected model
        const co2DiaDia = SIM_STATE.queries_dia * SIM_STATE.co2_por_query / 1000;
        const co2DiaDiaEf = co2DiaDia * modelEf.factor;
        const ahorroDiario = co2DiaDia - co2DiaDiaEf;
        const hoy = new Date();
        const finAno = new Date(hoy.getFullYear(), 11, 31);
        const diasRestantes = Math.ceil((finAno - hoy) / 86400000);
        const ahorroRestoAno = ahorroDiario * diasRestantes;

        // Ranking for multi-model mode
        const ranking = MODELOS_EFICIENTES_SIM.map(m => {
            const totalEfM = dataPerModel[m.nombre][dataPerModel[m.nombre].length - 1];
            return { ...m, totalEf: totalEfM, ahorro: totalActual - totalEfM, pct: ((1 - m.factor) * 100).toFixed(0) };
        }).sort((a, b) => b.ahorro - a.ahorro);

        // ── Single model panel ──────────────────────────────────────────────
        const singlePanel = () => {
            const totalEf = dataPerModel[modelEf.nombre][dataPerModel[modelEf.nombre].length - 1];
            const ahorro = totalActual - totalEf;
            const pct_ahorro = ((1 - modelEf.factor) * 100).toFixed(0);
            return `
                <!-- Before / After summary -->
                <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-bottom:16px;">
                    <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:var(--radius);padding:16px;text-align:center;">
                        <div style="color:var(--text-secondary);font-size:11px;margin-bottom:4px;">Modelo actual (${anoLabel})</div>
                        <div style="color:#ef4444;font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:700;line-height:1.2;">${fmtU(totalActual)}</div>
                        <div style="color:var(--text-muted);font-size:11px;margin-top:2px;">CO₂</div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                        <i data-lucide="arrow-right" style="color:var(--primary);width:20px;height:20px;"></i>
                        <div style="background:${modelEf.color};color:var(--bg-base);padding:4px 12px;border-radius:var(--radius-pill);font-family:'JetBrains Mono',monospace;font-weight:700;font-size:13px;white-space:nowrap;">−${pct_ahorro}%</div>
                    </div>
                    <div style="background:${modelEf.bg};border:1px solid ${modelEf.color}33;border-radius:var(--radius);padding:16px;text-align:center;">
                        <div style="color:var(--text-secondary);font-size:11px;margin-bottom:4px;">${modelEf.nombre} (${anoLabel})</div>
                        <div style="color:${modelEf.color};font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:700;line-height:1.2;">${fmtU(totalEf)}</div>
                        <div style="color:var(--text-muted);font-size:11px;margin-top:2px;">CO₂</div>
                    </div>
                </div>

                <!-- Switch Hoy callout -->
                <div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:var(--radius);padding:14px 16px;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px;">
                    <i data-lucide="zap" style="width:18px;height:18px;color:#fbbf24;margin-top:2px;flex-shrink:0;"></i>
                    <div>
                        <div style="color:#fbbf24;font-size:12px;font-weight:600;margin-bottom:3px;">¿Y si cambias hoy?</div>
                        <div style="color:var(--text-secondary);font-size:12px;line-height:1.5;">
                            Quedan <strong style="color:var(--text-primary);">${diasRestantes} días</strong> para fin de año.
                            Cambiando ahora a <strong style="color:${modelEf.color};">${modelEf.nombre}</strong> ahorrarías
                            <strong style="color:#fbbf24;">${fmtU(ahorroRestoAno)}</strong> CO₂ este año
                            <span style="color:var(--text-muted);font-size:11px;">(${fmtU(ahorroDiario)}/día)</span>
                        </div>
                    </div>
                </div>

                <!-- Area chart -->
                <div class="chart-container" style="height:280px;margin-bottom:16px;">
                    <canvas id="sim-comparison-chart"></canvas>
                </div>

                <!-- Footer: savings -->
                <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                    <div style="background:${modelEf.bg};border:1px solid ${modelEf.color}33;border-radius:var(--radius);padding:12px 16px;display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                        <i data-lucide="leaf" style="width:15px;height:15px;color:${modelEf.color};flex-shrink:0;"></i>
                        <span style="color:var(--text-primary);font-size:13px;">
                            Ahorro en ${anoLabel}: <strong style="color:${modelEf.color};">${fmtU(ahorro)}</strong> CO₂${growth > 0 ? ` <span style="color:var(--text-muted);font-size:11px;">(+${SIM_STATE.crecimiento_pct}% crec./año)</span>` : ''}
                        </span>
                    </div>
                </div>
            `;
        };

        // ── All models panel ────────────────────────────────────────────────
        const allModelsPanel = () => {
            const best = ranking[0];
            return `
                <!-- Ranking grid -->
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:16px;">
                    ${ranking.map((m, i) => `
                        <div style="background:${m.bg};border:1px solid ${m.color}44;border-radius:var(--radius);padding:12px;position:relative;overflow:hidden;">
                            ${i === 0 ? `<div style="position:absolute;top:6px;right:6px;background:${m.color};color:var(--bg-base);font-size:9px;font-weight:700;padding:2px 6px;border-radius:var(--radius-pill);letter-spacing:.5px;">MEJOR</div>` : ''}
                            <div style="color:var(--text-secondary);font-size:10px;margin-bottom:4px;">${m.nombre}</div>
                            <div style="color:${m.color};font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;">−${m.pct}%</div>
                            <div style="color:var(--text-muted);font-size:10px;margin-top:3px;">Ahorra ${fmtU(m.ahorro)}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Multi-model chart -->
                <div class="chart-container" style="height:300px;margin-bottom:16px;">
                    <canvas id="sim-comparison-chart"></canvas>
                </div>

                <!-- Footer: best model -->
                <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                    <div style="background:${best.bg};border:1px solid ${best.color}44;border-radius:var(--radius);padding:12px 16px;display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                        <i data-lucide="trophy" style="width:15px;height:15px;color:${best.color};flex-shrink:0;"></i>
                        <span style="color:var(--text-primary);font-size:13px;">
                            Mejor opción: <strong style="color:${best.color};">${best.nombre}</strong> — ahorra <strong style="color:${best.color};">${fmtU(best.ahorro)}</strong> en ${anoLabel}
                        </span>
                    </div>
                </div>
            `;
        };

        container.innerHTML = `
            <div class="card" style="margin-bottom:24px;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
                    <div class="card-title" style="margin:0;"><i data-lucide="git-compare"></i> Proyección comparativa</div>
                    <!-- Mode toggle -->
                    <div style="display:flex;gap:4px;background:var(--bg-surface);border:1px solid var(--glass-border);border-radius:var(--radius-pill);padding:3px;">
                        <button id="sim-mode-single" class="preset-chip ${!todosModos ? 'active' : ''}" style="padding:5px 14px;font-size:12px;border-radius:var(--radius-pill);">Un modelo</button>
                        <button id="sim-mode-all" class="preset-chip ${todosModos ? 'active' : ''}" style="padding:5px 14px;font-size:12px;border-radius:var(--radius-pill);">Comparar todos</button>
                    </div>
                </div>

                <!-- Controls -->
                <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:20px;align-items:flex-end;">
                    ${!todosModos ? `
                    <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:170px;">
                        <label style="color:var(--text-secondary);font-size:12px;font-weight:500;">Modelo eficiente</label>
                        <select id="sim-modelo-select" style="width:100%;">
                            ${MODELOS_EFICIENTES_SIM.map(m => `<option value="${m.nombre}" ${m.nombre === SIM_STATE.modelo_eficiente ? 'selected' : ''}>${m.nombre} (−${((1-m.factor)*100).toFixed(0)}%)</option>`).join('')}
                        </select>
                    </div>` : ''}
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <label style="color:var(--text-secondary);font-size:12px;font-weight:500;">Horizonte temporal</label>
                        <div style="display:flex;gap:4px;">
                            ${[1,2,3,5,10].map(y => `<button class="preset-chip sim-year-btn ${anos === y ? 'active' : ''}" data-years="${y}" style="padding:6px 12px;font-size:12px;">${y}a</button>`).join('')}
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;min-width:170px;">
                        <label style="color:var(--text-secondary);font-size:12px;font-weight:500;">Crecimiento anual de uso</label>
                        <select id="sim-growth-select" style="width:100%;">
                            ${[0,20,50,100,200].map(g => `<option value="${g}" ${SIM_STATE.crecimiento_pct === g ? 'selected' : ''}>+${g}%${g === 0 ? ' (sin crecimiento)' : ''}</option>`).join('')}
                        </select>
                    </div>
                </div>

                ${todosModos ? allModelsPanel() : singlePanel()}
            </div>
        `;

        // ── Event handlers ──────────────────────────────────────────────────
        document.getElementById('sim-mode-single').onclick = () => {
            SIM_STATE.mostrar_todos_modelos = false; renderTarea4Grafico();
        };
        document.getElementById('sim-mode-all').onclick = () => {
            SIM_STATE.mostrar_todos_modelos = true; renderTarea4Grafico();
        };
        if (!todosModos) {
            document.getElementById('sim-modelo-select').onchange = e => {
                const m = MODELOS_EFICIENTES_SIM.find(x => x.nombre === e.target.value);
                if (m) { SIM_STATE.modelo_eficiente = m.nombre; SIM_STATE.factor_eficiente = m.factor; renderTarea4Grafico(); renderTarea5BreakEven(); }
            };
        }
        document.querySelectorAll('.sim-year-btn').forEach(btn =>
            btn.onclick = () => { SIM_STATE.horizonte_anos = parseInt(btn.dataset.years); renderTarea4Grafico(); }
        );
        document.getElementById('sim-growth-select').onchange = e => {
            SIM_STATE.crecimiento_pct = parseInt(e.target.value); renderTarea4Grafico();
        };
        /*
        document.getElementById('export-proyeccion-csv').onclick = () => {
            let header, rows;
            if (todosModos) {
                header = ['Año', 'CO₂ actual (kg)', ...MODELOS_EFICIENTES_SIM.map(m => `${m.nombre} (kg)`), ...MODELOS_EFICIENTES_SIM.map(m => `Ahorro ${m.nombre} (kg)`)].join(',');
                rows = csvRows.map(d => [d.ano, d.actual.toFixed(3), ...MODELOS_EFICIENTES_SIM.map(m => d[m.nombre].toFixed(3)), ...MODELOS_EFICIENTES_SIM.map(m => (d.actual - d[m.nombre]).toFixed(3))].join(','));
            } else {
                header = `Año,CO₂ actual (kg),CO₂ ${modelEf.nombre} (kg),Ahorro (kg)`;
                rows = csvRows.map(d => `${d.ano},${d.actual.toFixed(3)},${d[modelEf.nombre].toFixed(3)},${(d.actual - d[modelEf.nombre]).toFixed(3)}`);
            }
            const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'proyeccion_co2.csv'; a.style.display = 'none';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };
        */

        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
            if (todosModos) {
                renderSimulacionGraficoChartAllModels(labels, dataActual, dataPerModel);
            } else {
                renderSimulacionGraficoChart(labels, dataActual, dataPerModel[modelEf.nombre], modelEf);
            }
        }, 0);
    }

    function renderSimulacionGraficoChart(labels, dataActual, dataEficiente, modelEf) {
        if (simChartInstance) { simChartInstance.destroy(); simChartInstance = null; }
        const ctx = document.getElementById('sim-comparison-chart');
        if (!ctx) return;
        const color = modelEf ? modelEf.color : '#4ade80';
        const bgColor = modelEf ? modelEf.color.replace(')', ',0.15)').replace('rgb', 'rgba') : 'rgba(74,222,128,0.15)';
        const fmtU = v => { if (v <= 0) return '0'; if (v >= 1000) return (v/1000).toFixed(2)+' t'; if (v >= 0.1) return v.toFixed(2)+' kg'; const g = v*1000; if (g >= 0.1) return g.toFixed(2)+' g'; const mg = g*1000; return mg >= 0.1 ? mg.toFixed(2)+' mg' : (mg*1000).toFixed(2)+' µg'; };

        simChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Modelo actual',
                        data: dataActual,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239,68,68,0.08)',
                        borderWidth: 2.5,
                        pointRadius: 5,
                        pointBackgroundColor: '#ef4444',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1.5,
                        fill: true,
                        tension: 0.3,
                    },
                    {
                        label: modelEf ? modelEf.nombre : SIM_STATE.modelo_eficiente,
                        data: dataEficiente,
                        borderColor: color,
                        backgroundColor: modelEf ? modelEf.bg : 'rgba(74,222,128,0.15)',
                        borderWidth: 2.5,
                        pointRadius: 5,
                        pointBackgroundColor: color,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1.5,
                        fill: true,
                        tension: 0.3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                animation: { duration: 600 },
                plugins: {
                    legend: { display: true, labels: { color: '#94a3b1', font: { size: 12 }, usePointStyle: true, pointStyleWidth: 10 } },
                    tooltip: {
                        backgroundColor: 'rgba(10,20,15,0.92)',
                        borderColor: 'rgba(74,222,128,0.25)',
                        borderWidth: 1,
                        titleColor: '#e8f0eb',
                        bodyColor: '#94a3b1',
                        callbacks: {
                            label: c => ` ${c.dataset.label}: ${fmtU(c.parsed.y)} CO₂`,
                            afterBody: items => items.length >= 2 ? [`  Ahorro acumulado: ${fmtU(items[0].parsed.y - items[1].parsed.y)}`] : [],
                        },
                    },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b1', font: { size: 12 } } },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.12)' },
                        ticks: { color: '#94a3b1', font: { size: 11 }, callback: v => v >= 1000 ? `${(v/1000).toFixed(1)}t` : v < 0.01 ? `${(v*1000).toFixed(0)}g` : `${v.toFixed(0)}kg` },
                        title: { display: true, text: 'CO₂ acumulado', color: '#94a3b1', font: { size: 11 } },
                    },
                },
            },
        });
    }

    function renderSimulacionGraficoChartAllModels(labels, dataActual, dataPerModel) {
        if (simChartInstance) { simChartInstance.destroy(); simChartInstance = null; }
        const ctx = document.getElementById('sim-comparison-chart');
        if (!ctx) return;
        const fmtU = v => { if (v <= 0) return '0'; if (v >= 1000) return (v/1000).toFixed(2)+' t'; if (v >= 0.1) return v.toFixed(2)+' kg'; const g = v*1000; if (g >= 0.1) return g.toFixed(2)+' g'; const mg = g*1000; return mg >= 0.1 ? mg.toFixed(2)+' mg' : (mg*1000).toFixed(2)+' µg'; };

        const modelDatasets = MODELOS_EFICIENTES_SIM.map(m => ({
            label: m.nombre,
            data: dataPerModel[m.nombre],
            borderColor: m.color,
            backgroundColor: m.bg,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: m.color,
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            fill: false,
            tension: 0.3,
        }));

        simChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Modelo actual',
                        data: dataActual,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239,68,68,0.08)',
                        borderWidth: 2.5,
                        pointRadius: 5,
                        pointBackgroundColor: '#ef4444',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1.5,
                        fill: false,
                        tension: 0.3,
                    },
                    ...modelDatasets,
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                animation: { duration: 600 },
                plugins: {
                    legend: { display: true, labels: { color: '#94a3b1', font: { size: 11 }, usePointStyle: true, pointStyleWidth: 8 } },
                    tooltip: {
                        backgroundColor: 'rgba(10,20,15,0.92)',
                        borderColor: 'rgba(74,222,128,0.25)',
                        borderWidth: 1,
                        titleColor: '#e8f0eb',
                        bodyColor: '#94a3b1',
                        callbacks: { label: c => ` ${c.dataset.label}: ${fmtU(c.parsed.y)} CO₂` },
                    },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b1', font: { size: 12 } } },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.12)' },
                        ticks: { color: '#94a3b1', font: { size: 11 }, callback: v => v >= 1000 ? `${(v/1000).toFixed(1)}t` : v < 0.01 ? `${(v*1000).toFixed(0)}g` : `${v.toFixed(0)}kg` },
                        title: { display: true, text: 'CO₂ acumulado', color: '#94a3b1', font: { size: 11 } },
                    },
                },
            },
        });
    }

    // TAREA 5: Break-even ambiental (opción 2)
    function renderTarea5BreakEven() {
        const container = document.getElementById('tarea5-breakeven');
        if (!container) return;

        const modelEf = MODELOS_EFICIENTES_SIM.find(m => m.nombre === SIM_STATE.modelo_eficiente) || MODELOS_EFICIENTES_SIM[0];
        const fmtU = v => { if (v <= 0) return '0'; if (v >= 1000) return (v/1000).toFixed(2)+' t'; if (v >= 0.1) return v.toFixed(2)+' kg'; const g = v*1000; if (g >= 0.1) return g.toFixed(2)+' g'; const mg = g*1000; return mg >= 0.1 ? mg.toFixed(2)+' mg' : (mg*1000).toFixed(2)+' µg'; };

        const co2DiaDia = SIM_STATE.queries_dia * SIM_STATE.co2_por_query / 1000;
        const ahorroDiario = co2DiaDia * (1 - modelEf.factor);
        const overhead = SIM_STATE.overhead_depl_kg;
        const breakEvenDays = overhead > 0 && ahorroDiario > 0 ? Math.ceil(overhead / ahorroDiario) : 0;
        const breakEvenMeses = breakEvenDays > 0 ? (breakEvenDays / 30.4).toFixed(1) : 0;

        const contenidoResultado = overhead === 0
            ? `<div style="background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:var(--radius);padding:14px 16px;display:flex;align-items:center;gap:10px;">
                <i data-lucide="check-circle" style="width:18px;height:18px;color:var(--primary);flex-shrink:0;"></i>
                <span style="color:var(--text-primary);font-size:13px;">Impacto inmediato — sin overhead de despliegue, el ahorro empieza desde el primer día.</span>
               </div>`
            : `<div style="background:${modelEf.bg};border:1px solid ${modelEf.color}44;border-radius:var(--radius);padding:14px 16px;">
                <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
                    <span style="color:var(--text-secondary);font-size:12px;">Punto de equilibrio:</span>
                    <span style="color:${modelEf.color};font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;">${breakEvenDays} días</span>
                    <span style="color:var(--text-muted);font-size:11px;">(~${breakEvenMeses} meses)</span>
                </div>
                <div style="color:var(--text-muted);font-size:11px;">Tras ${breakEvenDays} días compensas los ${fmtU(overhead)} CO₂ del despliegue y empiezas a ahorrar neto.</div>
               </div>`;

        // Build break-even chart data (2× break-even point, no cap so crossing is always visible)
        const chartDays = overhead > 0 ? Math.max(breakEvenDays * 2, 30) : 180;
        const step = Math.max(1, Math.floor(chartDays / 30));
        const _fmtDay = d => {
            if (d === 0) return 'Hoy';
            if (chartDays > 730) {
                const yrs = d / 365;
                return yrs >= 1 ? `Año ${yrs.toFixed(1).replace('.0','')}` : `Mes ${Math.round(d/30.4)}`;
            }
            return `Día ${d}`;
        };
        const beLabels = [], beSinCambio = [], beConModelo = [];
        for (let d = 0; d <= chartDays; d += step) {
            beLabels.push(_fmtDay(d));
            beSinCambio.push(co2DiaDia * d);
            beConModelo.push(overhead + co2DiaDia * modelEf.factor * d);
        }
        // Find crossover index for annotation
        let crossIdx = -1;
        if (overhead > 0) {
            for (let i = 0; i < beSinCambio.length; i++) {
                if (beConModelo[i] <= beSinCambio[i]) { crossIdx = i; break; }
            }
        }
        const pointRadii = beLabels.map((_, i) => i === crossIdx ? 8 : 3);
        const pointBg = beLabels.map((_, i) => i === crossIdx ? '#fbbf24' : modelEf.color);

        container.innerHTML = `
            <div class="card" style="margin-bottom:24px;">
                <div class="card-title"><i data-lucide="calendar-check"></i> Break-even ambiental</div>

                <!-- Explicación colapsable -->
                <details style="margin-bottom:16px;background:rgba(255,255,255,.03);border:1px solid var(--glass-border);border-radius:var(--radius);">
                    <summary style="cursor:pointer;padding:10px 14px;color:var(--text-secondary);font-size:12px;list-style:none;display:flex;align-items:center;gap:8px;user-select:none;">
                        <i data-lucide="info" style="width:14px;height:14px;flex-shrink:0;"></i>
                        <span>¿En qué consiste esta sección?</span>
                        <i data-lucide="chevron-down" style="width:13px;height:13px;margin-left:auto;"></i>
                    </summary>
                    <div style="padding:12px 14px 14px;border-top:1px solid var(--glass-border);display:flex;flex-direction:column;gap:10px;">
                        <p style="color:var(--text-secondary);font-size:12px;line-height:1.7;margin:0;">
                            Cambiar a un modelo más eficiente no es gratis desde el punto de vista ambiental.
                            Hay un <strong style="color:var(--text-primary);">coste de despliegue</strong>: el CO₂ que se emite al entrenar,
                            transferir o poner en marcha el nuevo modelo. Este coste puede ser pequeño (migración interna)
                            o mayor (reentrenamiento completo).
                        </p>
                        <p style="color:var(--text-secondary);font-size:12px;line-height:1.7;margin:0;">
                            Una vez en producción, el modelo eficiente emite <em>menos</em> CO₂ por consulta que el actual.
                            Esa diferencia diaria va devolviendo la deuda inicial, poco a poco.
                            El <strong style="color:var(--text-primary);">punto de equilibrio</strong> es el día en que la deuda queda saldada:
                            a partir de ahí cada consulta genera un ahorro neto real.
                        </p>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-top:2px;">
                            <div style="background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px 12px;">
                                <div style="color:#f87171;font-size:11px;font-weight:600;margin-bottom:3px;">Línea roja — Sin cambio</div>
                                <div style="color:var(--text-muted);font-size:11px;line-height:1.5;">CO₂ acumulado si sigues con el modelo actual. Crece a ritmo constante.</div>
                            </div>
                            <div style="background:${modelEf.bg};border:1px solid ${modelEf.color}44;border-radius:8px;padding:10px 12px;">
                                <div style="color:${modelEf.color};font-size:11px;font-weight:600;margin-bottom:3px;">Línea de color — Con ${modelEf.nombre}</div>
                                <div style="color:var(--text-muted);font-size:11px;line-height:1.5;">Empieza más arriba (el overhead), pero crece más despacio. Cuando cruza la roja, empiezas a ganar.</div>
                            </div>
                            <div style="background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.25);border-radius:8px;padding:10px 12px;">
                                <div style="color:#fbbf24;font-size:11px;font-weight:600;margin-bottom:3px;">Punto amarillo</div>
                                <div style="color:var(--text-muted);font-size:11px;line-height:1.5;">El cruce entre ambas líneas: el día exacto en que el modelo eficiente ha compensado su coste de despliegue.</div>
                            </div>
                        </div>
                        <p style="color:var(--text-muted);font-size:11px;line-height:1.6;margin:0;">
                            Si seleccionas <em>"Sin overhead"</em>, significa que el despliegue no tiene coste ambiental asociado
                            (p. ej., un modelo ya disponible vía API) y el ahorro es inmediato desde el primer día.
                        </p>
                    </div>
                </details>

                <!-- Overhead selector -->
                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
                    <label style="color:var(--text-secondary);font-size:12px;font-weight:500;">Overhead de despliegue (CO₂ estimado)</label>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        ${[
                            { label: 'Sin overhead', val: 0 },
                            { label: '0.5 kg CO₂', val: 0.5 },
                            { label: '5 kg CO₂', val: 5 },
                            { label: '50 kg CO₂', val: 50 },
                        ].map(o => `<button class="preset-chip sim-be-btn ${overhead === o.val ? 'active' : ''}" data-val="${o.val}" style="padding:6px 14px;font-size:12px;">${o.label}</button>`).join('')}
                    </div>
                </div>

                ${contenidoResultado}

                ${overhead > 0 ? `
                <div style="margin-top:16px;">
                    <div style="color:var(--text-muted);font-size:11px;margin-bottom:8px;">Evolución CO₂ acumulado</div>
                    <div style="height:200px;position:relative;">
                        <canvas id="sim-breakeven-chart"></canvas>
                    </div>
                </div>` : ''}
            </div>
        `;

        document.querySelectorAll('.sim-be-btn').forEach(btn =>
            btn.onclick = () => { SIM_STATE.overhead_depl_kg = parseFloat(btn.dataset.val); renderTarea5BreakEven(); }
        );

        if (window.lucide) lucide.createIcons();

        if (overhead > 0) {
            setTimeout(() => {
                if (simBreakEvenChartInstance) { simBreakEvenChartInstance.destroy(); simBreakEvenChartInstance = null; }
                const bectx = document.getElementById('sim-breakeven-chart');
                if (!bectx) return;
                const fmtUb = v => { if (v <= 0) return '0'; if (v >= 1000) return (v/1000).toFixed(2)+' t'; if (v >= 0.1) return v.toFixed(2)+' kg'; const g = v*1000; if (g >= 0.1) return g.toFixed(2)+' g'; const mg = g*1000; return mg >= 0.1 ? mg.toFixed(2)+' mg' : (mg*1000).toFixed(2)+' µg'; };
                simBreakEvenChartInstance = new Chart(bectx, {
                    type: 'line',
                    data: {
                        labels: beLabels,
                        datasets: [
                            {
                                label: 'Sin cambio',
                                data: beSinCambio,
                                borderColor: '#ef4444',
                                backgroundColor: 'rgba(239,68,68,0.06)',
                                borderWidth: 2,
                                pointRadius: 2,
                                fill: true,
                                tension: 0.2,
                            },
                            {
                                label: `Con ${modelEf.nombre}`,
                                data: beConModelo,
                                borderColor: modelEf.color,
                                backgroundColor: modelEf.bg,
                                borderWidth: 2,
                                pointRadius: pointRadii,
                                pointBackgroundColor: pointBg,
                                pointBorderColor: '#fff',
                                pointBorderWidth: 1.5,
                                fill: true,
                                tension: 0.2,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        animation: { duration: 500 },
                        plugins: {
                            legend: { display: true, labels: { color: '#94a3b1', font: { size: 11 }, usePointStyle: true } },
                            tooltip: { backgroundColor: 'rgba(10,20,15,0.92)', borderColor: 'rgba(74,222,128,0.25)', borderWidth: 1, titleColor: '#e8f0eb', bodyColor: '#94a3b1', callbacks: { label: c => ` ${c.dataset.label}: ${fmtUb(c.parsed.y)} CO₂` } },
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: '#94a3b1', font: { size: 10 }, maxTicksLimit: 8 } },
                            y: { grid: { color: 'rgba(255,255,255,0.12)' }, ticks: { color: '#94a3b1', font: { size: 10 }, callback: v => fmtUb(v) }, title: { display: true, text: 'CO₂ acumulado', color: '#94a3b1', font: { size: 10 } } },
                        },
                    },
                });
            }, 0);
        }
    }

    // TAREA 6: Análisis de sensibilidad — ¿qué importa más? (opción 4)
    function renderTarea6Sensitivity() {
        const container = document.getElementById('tarea6-sensitivity');
        if (!container) return;

        const fmtU = v => { if (v <= 0) return '0'; if (v >= 1000) return (v/1000).toFixed(2)+' t'; if (v >= 0.1) return v.toFixed(2)+' kg'; const g = v*1000; if (g >= 0.1) return g.toFixed(2)+' g'; const mg = g*1000; return mg >= 0.1 ? mg.toFixed(2)+' mg' : (mg*1000).toFixed(2)+' µg'; };
        const co2AnualActual = (SIM_STATE.queries_dia * 365 * SIM_STATE.co2_por_query) / 1000;
        const bestFactor = Math.min(...MODELOS_EFICIENTES_SIM.map(m => m.factor));

        const strategies = [
            ...MODELOS_EFICIENTES_SIM.map(m => ({
                label: `Modelo: ${m.nombre}`,
                pct: (1 - m.factor) * 100,
                ahorro: co2AnualActual * (1 - m.factor),
                color: m.color + 'bb',
            })),
            { label: 'Reducir queries −50%', pct: 50, ahorro: co2AnualActual * 0.5, color: '#fb923cbb' },
            { label: 'Datacenter 100% renovable', pct: 35, ahorro: co2AnualActual * 0.35, color: '#34d399bb' },
            { label: 'Reducir utilización −20%', pct: 15, ahorro: co2AnualActual * 0.15, color: '#cbd5e1bb' },
            { label: 'Mejor modelo + renovable', pct: (1 - bestFactor * 0.65) * 100, ahorro: co2AnualActual * (1 - bestFactor * 0.65), color: '#fbbf24bb' },
        ].sort((a, b) => b.pct - a.pct);

        const chartHeight = 80 + strategies.length * 38;

        container.innerHTML = `
            <div class="card" style="margin-bottom:24px;">
                <div class="card-title"><i data-lucide="sliders-horizontal"></i> ¿Qué palanca tiene más impacto?</div>
                <div style="color:var(--text-secondary);font-size:12px;margin-bottom:16px;">Reducción de CO₂ anual estimada por acción independiente, sobre tu configuración actual.</div>
                <div style="height:${chartHeight}px;position:relative;">
                    <canvas id="sim-sensitivity-chart"></canvas>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            if (simSensitivityChartInstance) { simSensitivityChartInstance.destroy(); simSensitivityChartInstance = null; }
            const sctx = document.getElementById('sim-sensitivity-chart');
            if (!sctx) return;
            simSensitivityChartInstance = new Chart(sctx, {
                type: 'bar',
                data: {
                    labels: strategies.map(s => s.label),
                    datasets: [{
                        label: 'Reducción CO₂ (%)',
                        data: strategies.map(s => s.pct),
                        backgroundColor: strategies.map(s => s.color),
                        borderRadius: 6,
                        borderSkipped: false,
                    }],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 700 },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(10,20,15,0.92)',
                            borderColor: 'rgba(74,222,128,0.25)',
                            borderWidth: 1,
                            titleColor: '#e8f0eb',
                            bodyColor: '#94a3b1',
                            callbacks: {
                                label: c => {
                                    const s = strategies[c.dataIndex];
                                    return ` −${s.pct.toFixed(1)}% · ahorra ${fmtU(s.ahorro)} CO₂/año`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255,255,255,0.12)' },
                            ticks: { color: '#94a3b1', font: { size: 11 }, callback: v => `${v}%` },
                            max: 100,
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: '#94a3b1', font: { size: 11 }, autoSkip: false },
                        },
                    },
                },
            });
        }, 0);
    }

    // TAREA 5 (legacy dead code — kept for ref, container removed from HTML)
    function renderTarea5Tabla() {
        const container = document.getElementById('tarea5-tabla-multianual');
        if (!container) return;

        const factor_ef = SIM_STATE.factor_eficiente;
        const datos_tabla = [];
        for (let y = 1; y <= 5; y++) {
            const queries_totales = SIM_STATE.queries_dia * 365 * y;
            const co2_actual_kg   = (queries_totales * SIM_STATE.co2_por_query) / 1000;
            const co2_ef_kg       = (queries_totales * SIM_STATE.co2_por_query * factor_ef) / 1000;
            const ahorro_pct      = ((1 - factor_ef) * 100).toFixed(1);
            datos_tabla.push({ ano: y, queries_totales, co2_actual_kg, co2_ef_kg, ahorro_pct });
        }

        const fmtTabla = v => v < 0.01 ? (v*1000).toFixed(1) : v < 1 ? v.toFixed(3) : Math.round(v).toLocaleString('es-ES');

        container.innerHTML = `
            <div class="card" style="margin-bottom:24px;">
                <div class="card-title"><i data-lucide="table-2"></i> Proyección detallada (5 años)</div>

                <!-- Line chart -->
                <div class="chart-container" style="height:220px;margin-bottom:20px;">
                    <canvas id="sim-tabla-chart"></canvas>
                </div>

                <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
                    <button id="toggle-tabla-sim" class="button button-secondary" style="font-size:12px;padding:6px 14px;">
                        <i data-lucide="chevron-down"></i> Ver tabla
                    </button>
                </div>
                <div id="tabla-sim-content" style="display:none;">
                    <div style="overflow-x:auto;border-radius:var(--radius-sm);border:1px solid var(--glass-border);margin-bottom:14px;">
                        <table style="width:100%;border-collapse:collapse;font-size:13px;font-family:'JetBrains Mono',monospace;">
                            <thead>
                                <tr style="background:var(--bg-surface);border-bottom:2px solid var(--border-strong);">
                                    <th style="color:var(--primary);font-weight:700;padding:12px 16px;text-align:left;">Año</th>
                                    <th style="color:var(--primary);font-weight:700;padding:12px 16px;text-align:right;">Queries totales</th>
                                    <th style="color:var(--accent-red);font-weight:700;padding:12px 16px;text-align:right;">CO₂ actual</th>
                                    <th style="color:var(--primary);font-weight:700;padding:12px 16px;text-align:right;">CO₂ ${SIM_STATE.modelo_eficiente}</th>
                                    <th style="color:var(--accent-teal);font-weight:700;padding:12px 16px;text-align:right;">Ahorro</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${datos_tabla.map((f, i) => `
                                    <tr style="background:${i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-card)'};border-bottom:1px solid var(--glass-border);">
                                        <td style="color:var(--primary);padding:11px 16px;font-weight:600;">Año ${f.ano}</td>
                                        <td style="color:var(--text-secondary);padding:11px 16px;text-align:right;">${f.queries_totales.toLocaleString('es-ES')}</td>
                                        <td style="color:var(--accent-red);padding:11px 16px;text-align:right;font-weight:600;">${fmtTabla(f.co2_actual_kg)} kg</td>
                                        <td style="color:var(--primary);padding:11px 16px;text-align:right;font-weight:600;">${fmtTabla(f.co2_ef_kg)} kg</td>
                                        <td style="color:var(--accent-teal);padding:11px 16px;text-align:right;font-weight:700;">${f.ahorro_pct}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();

        // Render line chart
        setTimeout(() => {
            if (simTablaChartInstance) { simTablaChartInstance.destroy(); simTablaChartInstance = null; }
            const ctx = document.getElementById('sim-tabla-chart');
            if (!ctx) return;

            const fmtU = v => v >= 1000 ? (v/1000).toFixed(2) + ' t' : v < 0.01 ? (v*1000).toFixed(1) + ' g' : v.toFixed(1) + ' kg';

            simTablaChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: datos_tabla.map(d => `Año ${d.ano}`),
                    datasets: [
                        {
                            label: 'Modelo actual',
                            data: datos_tabla.map(d => d.co2_actual_kg),
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239,68,68,0.06)',
                            borderWidth: 2,
                            pointRadius: 4,
                            pointBackgroundColor: '#ef4444',
                            fill: true,
                            tension: 0.3,
                        },
                        {
                            label: SIM_STATE.modelo_eficiente,
                            data: datos_tabla.map(d => d.co2_ef_kg),
                            borderColor: '#4ade80',
                            backgroundColor: 'rgba(74,222,128,0.06)',
                            borderWidth: 2,
                            pointRadius: 4,
                            pointBackgroundColor: '#4ade80',
                            fill: true,
                            tension: 0.3,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: true, labels: { color: '#94a3b1', font: { size: 11 }, usePointStyle: true } },
                        tooltip: {
                            backgroundColor: 'rgba(10,20,15,0.92)',
                            borderColor: 'rgba(74,222,128,0.25)',
                            borderWidth: 1,
                            titleColor: '#e8f0eb',
                            bodyColor: '#94a3b1',
                            callbacks: { label: c => ` ${c.dataset.label}: ${fmtU(c.parsed.y)} CO₂` },
                        },
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#94a3b1', font: { size: 11 } } },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.12)' },
                            ticks: {
                                color: '#94a3b1', font: { size: 10 },
                                callback: v => v >= 1000 ? `${(v/1000).toFixed(1)}t` : v < 0.01 ? `${(v*1000).toFixed(0)}g` : `${v.toFixed(0)}kg`,
                            },
                        },
                    },
                },
            });
        }, 0);

        let tablaAbierta = false;
        document.getElementById('toggle-tabla-sim').onclick = () => {
            tablaAbierta = !tablaAbierta;
            document.getElementById('tabla-sim-content').style.display = tablaAbierta ? 'block' : 'none';
            document.getElementById('toggle-tabla-sim').innerHTML = tablaAbierta
                ? '<i data-lucide="chevron-up"></i> Ocultar tabla'
                : '<i data-lucide="chevron-down"></i> Ver tabla';
            if (window.lucide) lucide.createIcons();
        };

        /*
        document.getElementById('export-csv-sim').onclick = () => {
            const header = 'Año,Queries totales,CO₂ actual (kg),CO₂ eficiente (kg),Ahorro (%)';
            const rows = datos_tabla.map(d => `${d.ano},${d.queries_totales},${d.co2_actual_kg.toFixed(2)},${d.co2_ef_kg.toFixed(2)},${d.ahorro_pct}`);
            const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'proyeccion_simulacion.csv';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        */
    }

    // Inicializar simulación cuando se carga
    async function doSimulate() {
        if (!LAST_PARAMS) { showError("Calcula emisiones primero."); return; }

        // Usar el valor seleccionado por el usuario en presets/slider
        const qpd = SIM_STATE.queries_dia;
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
        // Actualizar estado con datos de la API
        if (data.production_impact && data.production_impact.emissions) {
            const emitPerQuery = data.production_impact.emissions.g_co2_per_query || 0.00413;
            const energyPerQuery = data.production_impact.energy?.kwh_per_query || 0.00000185;
            SIM_STATE.co2_por_query = emitPerQuery / 1000;
            SIM_STATE.energia_por_query = energyPerQuery;
        }
        SIM_STATE.queries_dia = qpd;

        // Transición: ocultar panel de lanzamiento, mostrar barra compacta + resultados
        document.getElementById('sim-launch-panel').style.display = 'none';
        document.getElementById('sim-compact-bar').style.display = 'block';
        document.getElementById('simulacion-content').style.display = 'block';
        updateSliderUI();

        // Botón "Ajustar": vuelve al panel de lanzamiento
        const btnAjustar = document.getElementById('btn-ajustar-sim');
        if (btnAjustar) {
            btnAjustar.onclick = () => {
                document.getElementById('sim-launch-panel').style.display = 'block';
                document.getElementById('sim-compact-bar').style.display = 'none';
                document.getElementById('simulacion-content').style.display = 'none';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        }
        if (window.lucide) lucide.createIcons();

        renderTarea0ImpactoAnual();
        renderTarea2KPIs();
        renderTarea3Equivalencias();
        renderTarea4Grafico();
        renderTarea5BreakEven();
        renderTarea6Sensitivity();
    }

    // Variables globales para los gráficos de simulación
    let simImpactoChartInstance = null;
    let simChartInstance = null;
    let simBreakEvenChartInstance = null;
    let simSensitivityChartInstance = null;

    // Pool de referencias cotidianas con su CO₂ en kg
    const REFERENCIAS_CO2 = [
        { label: '1 búsqueda Google',        value: 0.0002,  color: ['rgba(96,165,250,.65)','#60a5fa'] },
        { label: '1 carga de móvil',         value: 0.005,   color: ['rgba(251,191,36,.65)','#fbbf24'] },
        { label: '1 hora de streaming',      value: 0.036,   color: ['rgba(167,139,250,.65)','#a78bfa'] },
        { label: '1 km en coche',            value: 0.12,    color: ['rgba(251,146,60,.65)','#fb923c'] },
        { label: '1 litro de gasolina',      value: 2.3,     color: ['rgba(251,146,60,.65)','#fb923c'] },
        { label: '1 árbol absorbe/año',      value: 21,      color: ['rgba(52,211,153,.65)','#34d399'] },
        { label: '1 vuelo doméstico',        value: 150,     color: ['rgba(251,191,36,.65)','#fbbf24'] },
        { label: '1 vuelo transatlántico',   value: 986,     color: ['rgba(251,191,36,.65)','#fbbf24'] },
        { label: 'Límite París per cápita',  value: 2300,    color: ['rgba(248,113,113,.65)','#f87171'] },
        { label: '1 coche medio/año',        value: 4600,    color: ['rgba(251,146,60,.65)','#fb923c'] },
        { label: '1 hogar medio/año',        value: 7500,    color: ['rgba(167,139,250,.65)','#a78bfa'] },
        { label: 'Europeo medio/año',        value: 8000,    color: ['rgba(167,139,250,.65)','#a78bfa'] },
    ];

    // Selecciona las N referencias más adecuadas para un valor de CO₂
    function pickReferencias(co2_kg, n = 2) {
        return REFERENCIAS_CO2
            .map(r => ({ ...r, ratio: co2_kg / r.value }))
            .filter(r => r.ratio >= 0.005 && r.ratio <= 500)
            .sort((a, b) => Math.abs(Math.log10(a.ratio)) - Math.abs(Math.log10(b.ratio)))
            .slice(0, n);
    }

    // TAREA 0: Gráfico de impacto anual vs referencias cotidianas (adaptativo)
    function renderTarea0ImpactoAnual() {
        const container = document.getElementById('tarea0-grafico-anual');
        if (!container) return;

        const co2_ano_kg = (SIM_STATE.queries_dia * 365 * SIM_STATE.co2_por_query) / 1000;
        const refs = pickReferencias(co2_ano_kg, 2);

        const labels = ['Tu modelo (anual)', ...refs.map(r => r.label)];
        const data = [co2_ano_kg, ...refs.map(r => r.value)];
        const bgColors = ['rgba(74,222,128,.65)', ...refs.map(r => r.color[0])];
        const borderColors = ['#4ade80', ...refs.map(r => r.color[1])];

        container.innerHTML = `
            <div class="card" style="margin-bottom:24px;">
                <div class="card-title"><i data-lucide="bar-chart-horizontal"></i> Tu modelo frente a referencias del mundo real</div>
                <p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px;">CO₂ anual generado por tu modelo de IA comparado con actividades cotidianas.</p>
                <div class="chart-container" style="height:${100 + refs.length * 70}px;">
                    <canvas id="sim-impacto-chart"></canvas>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            if (simImpactoChartInstance) { simImpactoChartInstance.destroy(); simImpactoChartInstance = null; }
            const ctx = document.getElementById('sim-impacto-chart');
            if (!ctx) return;

            const fmtKg = v => { if (v <= 0) return '0'; if (v >= 1000) return (v/1000).toFixed(2)+' t'; if (v >= 0.1) return v.toFixed(2)+' kg'; const g = v*1000; if (g >= 0.1) return g.toFixed(2)+' g'; const mg = g*1000; return mg >= 0.1 ? mg.toFixed(2)+' mg' : (mg*1000).toFixed(2)+' µg'; };
            const tickFmt = v => { if (v <= 0) return '0'; if (v >= 1000) return (v/1000).toFixed(1)+'t'; if (v >= 0.1) return v.toFixed(1)+'kg'; const g = v*1000; if (g >= 0.1) return g.toFixed(1)+'g'; const mg = g*1000; return mg >= 0.1 ? mg.toFixed(0)+'mg' : (mg*1000).toFixed(0)+'µg'; };

            const _simLm = document.body.classList.contains('light-mode');
            const _simTickX = _simLm ? '#1e3a28' : '#94a3b1';
            const _simTitleX = _simLm ? '#14532d' : '#94a3b1';
            const _simTickY = _simLm ? '#0f2714' : '#e8f0eb';
            const _simGrid = _simLm ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.12)';

            simImpactoChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{ data, backgroundColor: bgColors, borderColor: borderColors, borderWidth: 2, borderRadius: 5 }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: _simLm ? 'rgba(240,247,241,.97)' : 'rgba(10,20,15,.92)',
                            borderColor: _simLm ? 'rgba(22,163,74,.3)' : 'rgba(74,222,128,.25)',
                            borderWidth: 1,
                            titleColor: _simLm ? '#0f2714' : '#e8f0eb',
                            bodyColor: _simLm ? '#1e3a28' : '#94a3b1',
                            callbacks: { label: c => ` ${fmtKg(c.parsed.x)} CO₂/año` }
                        },
                    },
                    scales: {
                        x: {
                            grid: { color: _simGrid },
                            ticks: { color: _simTickX, font:{size:11}, callback: tickFmt, maxTicksLimit: 7 },
                            title: { display: true, text: 'CO₂ / año', color: _simTitleX, font:{size:11} },
                        },
                        y: { grid: { display: false }, ticks: { color: _simTickY, font:{size:12}, autoSkip: false } },
                    },
                },
            });
        }, 0);
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

        // Determine which scale items are "green", "yellow", "red"
        const greenLabels = ['A+++','A++','A+','A'];
        const yellowLabels = ['B','C'];

        // CO2 breakdown from current result
        const em = LAST_RESULT?.emissions_gCO2 || {};
        const total = em.total || 0;
        const dcPct = total > 0 ? ((em.datacenter || 0) / total * 100).toFixed(1) : '—';
        const netPct = total > 0 ? ((em.network || 0) / total * 100).toFixed(1) : '—';
        const devPct = total > 0 ? ((em.device || 0) / total * 100).toFixed(1) : '—';

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

                <div class="elabel-info-card">
                    <div class="elabel-info-title">
                        <i data-lucide="info" style="width:18px;height:18px;display:inline;vertical-align:middle;margin-right:8px;color:var(--primary)"></i>
                        ¿Cómo funciona este sistema de etiquetado?
                    </div>
                    <p class="elabel-info-text">
                        Este sistema se inspira en el <strong>etiquetado energético europeo</strong> regulado por la
                        <strong>Directiva 2017/1369/UE</strong>, que desde 2021 ayuda a los consumidores a identificar
                        la eficiencia energética de electrodomésticos de un vistazo.
                    </p>
                    <p class="elabel-info-text">
                        Al igual que la UE calibra sus umbrales de eficiencia a partir de cómo se distribuyen realmente
                        los productos en el mercado (usando percentiles), analizamos <strong>639.000 combinaciones</strong> de 
                        escenarios reales: 15 modelos LLM × 71 centros de datos × 20 dispositivos × 5 redes × 6 tipos de consulta.
                        Esto nos permite saber dónde se ubica tu consulta dentro del universo completo de posibilidades.
                    </p>
                </div>

                <div class="elabel-info-card">
                    <div class="elabel-info-title">
                        <i data-lucide="pie-chart" style="width:18px;height:18px;display:inline;vertical-align:middle;margin-right:8px;color:var(--primary)"></i>
                        Componentes de emisión
                    </div>
                    <p class="elabel-info-text" style="margin-bottom:12px;">
                        Las emisiones de tu consulta provienen de tres fuentes principales. El <strong>centro de datos</strong>
                        domina el impacto (típicamente el 70–95%), seguido por la <strong>red</strong> de transmisión 
                        y el <strong>dispositivo</strong> del usuario.
                    </p>
                    <div class="elabel-factors-grid">
                        <div class="elabel-factor">
                            <div class="elabel-factor-icon" style="background:rgba(56,189,248,0.12);color:#38bdf8;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                            </div>
                            <div class="elabel-factor-label">Centro de datos</div>
                            <div class="elabel-factor-sub">Intensidad del carbono + eficiencia</div>
                        </div>
                        <div class="elabel-factor">
                            <div class="elabel-factor-icon" style="background:rgba(251,191,36,0.12);color:#fbbf24;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                            </div>
                            <div class="elabel-factor-label">Red</div>
                            <div class="elabel-factor-sub">WiFi, 4G, 5G, Fibra…</div>
                        </div>
                        <div class="elabel-factor">
                            <div class="elabel-factor-icon" style="background:rgba(168,85,247,0.12);color:#a855f7;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                            </div>
                            <div class="elabel-factor-label">Dispositivo</div>
                            <div class="elabel-factor-sub">CPU, GPU, NPU…</div>
                        </div>
                    </div>
                </div>

                <div class="elabel-info-card">
                    <div class="elabel-info-title">
                        <i data-lucide="lightbulb" style="width:18px;height:18px;display:inline;vertical-align:middle;margin-right:8px;color:#fbbf24"></i>
                        ¿Por qué 9 clases y no 7?
                    </div>
                    <p class="elabel-info-text">
                        La UE simplificó su etiqueta de A+++–D a A–G en 2021 porque los electrodomésticos se volvieron 
                        cada vez más eficientes y casi todos llegaban a A++. Con los modelos de IA ocurre lo contrario:
                        el rango de emisiones es <strong>extraordinariamente amplio</strong>.
                    </p>
                    <p class="elabel-info-text">
                        Un consulta puede consumir desde microgramos de CO₂
                        hasta gramos enteros. Esa variación 
                        requiere más detalle, por eso usamos <strong>9 clases</strong> (A+++ hasta F) 
                        con umbrales calibrados según distribuciones reales.
                    </p>
                    <div class="elabel-why-visual">
                        ${scaleOrder.map(l => {
                            const s = scaleObj[l];
                            if (!s) return '';
                            const isG = greenLabels.includes(l);
                            const isY = yellowLabels.includes(l);
                            const barColor = isG ? '#4ade80' : isY ? '#fbbf24' : '#ef4444';
                            // Width proportional to percentile range
                            const pRanges = {'A+++':2,'A++':8,'A+':10,'A':10,'B':20,'C':20,'D':20,'E':7,'F':3};
                            const w = pRanges[l] || 10;
                            return `<div class="elabel-why-bar" style="flex:${w};background:${barColor};" title="${l}: ${s.description || ''}">${l}</div>`;
                        }).join('')}
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:13px;color:#4a7c59;margin-top:6px;padding:0 2px;font-weight:700;letter-spacing:0.3px;">
                        <span>P0 (menor CO₂)</span>
                        <span>P50 (mediana)</span>
                        <span>P100 (mayor CO₂)</span>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    }

    // ------------------------------------------------------------------
    // Map (Tab 7) — Choropleth + Data Centers
    // ------------------------------------------------------------------
    let map = null;
    let mapMarkers = [];  // refs to DC markers for popup updates
    let mapDCData = [];   // DC data for popup regeneration

    // Resolve current model display name (works for both CSV and custom models)
    function resolveCurrentModelName(modelId) {
        const id = modelId || LAST_PARAMS?.model_id || '';
        if (id === '__custom__') {
            return LAST_PARAMS?.custom_model?.model_name || 'Modelo personalizado';
        }
        return (OPTIONS.models || []).find(m => m.model_id === id)?.model_name || '';
    }

    const providerColors = {
        'AWS': '#f97316', 'Google Cloud': '#4ade80', 'GCP': '#4ade80',
        'Microsoft Azure': '#38bdf8', 'Azure': '#38bdf8', 'Deep Green': '#a78bfa',
    };

    const providerLetters = {
        'AWS': 'A', 'Google Cloud': 'G', 'GCP': 'G',
        'Microsoft Azure': 'Z', 'Azure': 'Z', 'Deep Green': 'D',
    };

    // Choropleth fill colors (higher opacity for visibility on dark basemap)
    const ciChoroplethRanges = [
        { max: 100,   fill: 'rgba(74, 222, 128, 0.55)',  label: '< 100 (Muy limpio)' },
        { max: 200,   fill: 'rgba(134, 239, 172, 0.45)', label: '100–200 (Limpio)' },
        { max: 300,   fill: 'rgba(251, 191, 36, 0.45)',  label: '200–300 (Medio)' },
        { max: 400,   fill: 'rgba(249, 115, 22, 0.50)',  label: '300–400 (Alto)' },
        { max: 600,   fill: 'rgba(239, 68, 68, 0.50)',   label: '400–600 (Muy alto)' },
        { max: 99999, fill: 'rgba(185, 28, 28, 0.55)',   label: '> 600 (Crítico)' },
    ];

    function ciChoroplethFill(ci) {
        if (ci == null) return 'rgba(128,128,128,0.1)';
        for (const r of ciChoroplethRanges) { if (ci < r.max) return r.fill; }
        return 'rgba(185, 28, 28, 0.55)';
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
        if (providerColors[provider]) return providerColors[provider];
        for (const [key, color] of Object.entries(providerColors)) {
            if (provider.toLowerCase().includes(key.toLowerCase())) return color;
        }
        return '#666';
    }

    function getProviderLetter(provider) {
        if (!provider) return '?';
        if (providerLetters[provider]) return providerLetters[provider];
        for (const [key, letter] of Object.entries(providerLetters)) {
            if (provider.toLowerCase().includes(key.toLowerCase())) return letter;
        }
        return '?';
    }

    function renewableBadge(pct) {
        if (pct == null) return '';
        if (pct >= 80) return `<span class="popup-badge popup-badge-green">${pct.toFixed(0)}% renovable</span>`;
        if (pct >= 50) return `<span class="popup-badge popup-badge-amber">${pct.toFixed(0)}% renovable</span>`;
        return `<span class="popup-badge popup-badge-red">${pct.toFixed(0)}% renovable</span>`;
    }

    function detectGreenwash(dc) {
        const pRenew = dc.provider_renewable_pct;
        const ci = dc.carbon_intensity;
        if (pRenew != null && ci != null && pRenew > 80 && ci > 300) return true;
        return false;
    }

    // ISO-3166 numeric → alpha-2 mapping for TopoJSON → country matching
    const iso3ToIso2 = {"004":"AF","008":"AL","010":"AQ","012":"DZ","016":"AS","020":"AD","024":"AO","028":"AG","031":"AZ","032":"AR","036":"AU","040":"AT","044":"BS","048":"BH","050":"BD","051":"AM","056":"BE","060":"BM","064":"BT","068":"BO","070":"BA","072":"BW","076":"BR","084":"BZ","086":"IO","090":"SB","092":"VG","096":"BN","100":"BG","104":"MM","108":"BI","112":"BY","116":"KH","120":"CM","124":"CA","132":"CV","140":"CF","144":"LK","148":"TD","152":"CL","156":"CN","158":"TW","162":"CX","166":"CC","170":"CO","174":"KM","175":"YT","178":"CG","180":"CD","184":"CK","188":"CR","191":"HR","192":"CU","196":"CY","203":"CZ","204":"BJ","208":"DK","212":"DM","214":"DO","218":"EC","222":"SV","226":"GQ","231":"ET","232":"ER","233":"EE","234":"FO","238":"FK","242":"FJ","246":"FI","250":"FR","254":"GF","258":"PF","260":"TF","262":"DJ","266":"GA","268":"GE","270":"GM","275":"PS","276":"DE","288":"GH","292":"GI","296":"KI","300":"GR","304":"GL","308":"GD","312":"GP","316":"GU","320":"GT","324":"GN","328":"GY","332":"HT","336":"VA","340":"HN","344":"HK","348":"HU","352":"IS","356":"IN","360":"ID","364":"IR","368":"IQ","372":"IE","376":"IL","380":"IT","384":"CI","388":"JM","392":"JP","398":"KZ","400":"JO","404":"KE","408":"KP","410":"KR","414":"KW","417":"KG","418":"LA","422":"LB","426":"LS","428":"LV","430":"LR","434":"LY","438":"LI","440":"LT","442":"LU","446":"MO","450":"MG","454":"MW","458":"MY","462":"MV","466":"ML","470":"MT","474":"MQ","478":"MR","480":"MU","484":"MX","492":"MC","496":"MN","498":"MD","499":"ME","500":"MS","504":"MA","508":"MZ","512":"OM","516":"NA","520":"NR","524":"NP","528":"NL","531":"CW","533":"AW","540":"NC","548":"VU","554":"NZ","558":"NI","562":"NE","566":"NG","570":"NU","574":"NF","578":"NO","580":"MP","583":"FM","584":"MH","585":"PW","586":"PK","591":"PA","598":"PG","600":"PY","604":"PE","608":"PH","612":"PN","616":"PL","620":"PT","624":"GW","626":"TL","630":"PR","634":"QA","638":"RE","642":"RO","643":"RU","646":"RW","652":"BL","654":"SH","659":"KN","660":"AI","662":"LC","663":"MF","666":"PM","670":"VC","674":"SM","678":"ST","682":"SA","686":"SN","688":"RS","690":"SC","694":"SL","702":"SG","703":"SK","704":"VN","705":"SI","706":"SO","710":"ZA","716":"ZW","724":"ES","728":"SS","729":"SD","732":"EH","740":"SR","744":"SJ","748":"SZ","752":"SE","756":"CH","760":"SY","762":"TJ","764":"TH","768":"TG","772":"TK","776":"TO","780":"TT","784":"AE","788":"TN","792":"TR","795":"TM","796":"TC","798":"TV","800":"UG","804":"UA","807":"MK","818":"EG","826":"GB","831":"GG","832":"JE","833":"IM","834":"TZ","840":"US","850":"VI","854":"BF","858":"UY","860":"UZ","862":"VE","876":"WF","882":"WS","887":"YE","894":"ZM"};

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
        map = L.map("map", { zoomControl: true }).setView([25, 0], 2);

        // CARTO dark basemap
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            maxZoom: 18,
            subdomains: 'abcd',
        }).addTo(map);

        // Legend (rectangles for CI, dots for providers)
        const legendDiv = document.createElement('div');
        legendDiv.className = 'map-legend';
        legendDiv.innerHTML = `
            <h4>Intensidad Carbono (gCO₂/kWh)</h4>
            ${ciChoroplethRanges.map(r => `<div class="map-legend-item"><div class="map-legend-rect" style="background:${r.fill}"></div> ${r.label}</div>`).join('')}
            <hr class="map-legend-divider">
            <h4>Proveedores</h4>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#a78bfa"></div> Deep Green</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#f97316"></div> AWS</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#4ade80"></div> GCP</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#38bdf8"></div> Azure</div>
            <p class="map-legend-note">Color del país = CI de la red eléctrica<br>Color del icono = proveedor</p>
        `;
        document.getElementById("map").appendChild(legendDiv);

        try {
            // Fetch map data and world TopoJSON in parallel
            const [mapResp, topoResp] = await Promise.all([
                fetch("/api/map-data"),
                fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json")
            ]);
            if (!mapResp.ok) return;
            const data = await mapResp.json();
            const dcs = data.data_centers || [];
            const zones = data.countries || [];

            // ── Aggregate zones to country-level CI ──
            const countryCI = {};  // { "US": { sum, count, name } }
            zones.forEach(z => {
                if (z.carbon_intensity == null) return;
                const iso = z.code.includes('-') ? z.code.split('-')[0] : z.code;
                if (!countryCI[iso]) countryCI[iso] = { sum: 0, count: 0, name: z.country_name || iso };
                countryCI[iso].sum += z.carbon_intensity;
                countryCI[iso].count++;
            });
            // { "US": { avg, count, name } }
            for (const iso of Object.keys(countryCI)) {
                const c = countryCI[iso];
                c.avg = Math.round(c.sum / c.count);
            }

            // ── Choropleth layer ──
            if (topoResp.ok && typeof topojson !== 'undefined') {
                const topoData = await topoResp.json();
                const countries = topojson.feature(topoData, topoData.objects.countries);

                // Fix antimeridian-crossing polygons (Russia, Fiji, etc.)
                // These produce horizontal lines because coords jump from ~180 to ~-180
                function fixAntimeridianRing(ring) {
                    let crossesAM = false;
                    for (let i = 1; i < ring.length; i++) {
                        if (Math.abs(ring[i][0] - ring[i-1][0]) > 180) { crossesAM = true; break; }
                    }
                    if (!crossesAM) return [ring];
                    // Split into west (<0) and east (>0) sub-rings
                    const shifted = ring.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]);
                    return [shifted];
                }
                function fixFeatureGeometry(feature) {
                    const g = feature.geometry;
                    if (!g) return feature;
                    if (g.type === 'Polygon') {
                        const fixed = g.coordinates.flatMap(fixAntimeridianRing);
                        return { ...feature, geometry: { ...g, coordinates: fixed } };
                    }
                    if (g.type === 'MultiPolygon') {
                        const fixed = g.coordinates.map(polygon =>
                            polygon.flatMap(fixAntimeridianRing)
                        );
                        return { ...feature, geometry: { ...g, coordinates: fixed } };
                    }
                    return feature;
                }
                countries.features = countries.features.map(fixFeatureGeometry);

                let hoveredLayer = null;
                const defaultStyle = (feature) => {
                    const numericId = feature.id || feature.properties?.id;
                    const iso2 = iso3ToIso2[String(numericId).padStart(3, '0')] || '';
                    const cData = countryCI[iso2];
                    return {
                        fillColor: cData ? ciChoroplethFill(cData.avg) : 'rgba(128,128,128,0.08)',
                        fillOpacity: 1,
                        color: 'rgba(255,255,255,0.12)',
                        weight: 0.8,
                    };
                };

                const choroplethLayer = L.geoJSON(countries, {
                    style: defaultStyle,
                    onEachFeature: (feature, layer) => {
                        const numericId = feature.id || feature.properties?.id;
                        const iso2 = iso3ToIso2[String(numericId).padStart(3, '0')] || '';
                        const cData = countryCI[iso2];
                        const name = cData?.name || feature.properties?.name || iso2;
                        const ciText = cData ? `${cData.avg} gCO₂/kWh` : 'Sin datos';
                        const zonesText = cData && cData.count > 1 ? ` (${cData.count} zonas)` : '';
                        layer.bindTooltip(`<strong>${name}</strong><br>${ciText}${zonesText}`, {
                            sticky: true,
                            className: 'choropleth-tooltip',
                        });
                        layer.on('mouseover', () => {
                            hoveredLayer = layer;
                            layer.setStyle({ weight: 2, color: 'rgba(255,255,255,0.5)' });
                            layer.bringToFront();
                        });
                        layer.on('mouseout', () => {
                            if (hoveredLayer === layer) {
                                choroplethLayer.resetStyle(layer);
                                hoveredLayer = null;
                            }
                        });
                    },
                }).addTo(map);
            }

            // ── Data center markers ──
            let totalDCs = dcs.length;
            let providers = {};
            let pueSum = 0, pueCount = 0, bestPUE = 99, worstPUE = 0, bestPUE_name = '', worstPUE_name = '';

            dcs.forEach(dc => {
                if (dc.latitude == null || dc.longitude == null) return;
                if (dc.dc_id && dc.dc_id.endsWith('-global')) return; // Skip global averages

                const ci = dc.carbon_intensity;
                const provColor = getProviderColor(dc.provider);
                const borderColor = ciColorSolid(ci);
                const letter = getProviderLetter(dc.provider);
                const isGreenwash = detectGreenwash(dc);

                // Provider stats
                if (dc.provider) providers[dc.provider] = (providers[dc.provider] || 0) + 1;
                if (dc.pue) {
                    pueSum += dc.pue; pueCount++;
                    if (dc.pue < bestPUE) { bestPUE = dc.pue; bestPUE_name = `${dc.provider} ${dc.region}`; }
                    if (dc.pue > worstPUE) { worstPUE = dc.pue; worstPUE_name = `${dc.provider} ${dc.region}`; }
                }

                // Marker with provider letter
                const size = 18;
                const extraClass = isGreenwash ? ' greenwash' : '';
                const icon = L.divIcon({
                    className: '',
                    html: `<div class="dc-marker${extraClass}" style="width:${size}px;height:${size}px;background:${provColor};border:2px solid ${borderColor};"><span class="dc-marker-letter">${letter}</span></div>`,
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
                        <span class="popup-provider-dot" style="background:${provColor}"></span>
                        <div>
                            <div class="popup-name">${dc.provider || ''}</div>
                            <div class="popup-region">${dc.region || ''} (${dc.country_code || ''})</div>
                        </div>
                    </div>
                    <div class="popup-body">
                        <div class="popup-row">
                            <span class="popup-row-label">Intensidad carbono</span>
                            <span class="popup-row-value" style="color:${ciColorSolid(ci)}">${ci != null ? ci.toFixed(0) + ' gCO₂/kWh' : 'N/D'}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-row-label">PUE</span>
                            <span class="popup-row-value">${dc.pue ? dc.pue.toFixed(2) : 'N/D'}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-row-label">Renovables declaradas</span>
                            <span>${renewableBadge(renewPct)}</span>
                        </div>
                        ${gwBadge}
                        <hr class="popup-divider">
                        <div class="popup-co2">
                            ${co2Estimate
                                ? `<div class="popup-co2-label">Estimación CO₂/query en este DC:</div>
                                   <div class="popup-co2-value">${co2Estimate} gCO₂</div>
                                   <div class="popup-co2-sub">${resolveCurrentModelName()} | ${LAST_PARAMS?.request_type || 'Petición'}</div>`
                                : `<div class="popup-co2-label" style="color:#64748b;font-style:italic;">Realiza un cálculo primero para ver la estimación de CO₂/query</div>`
                            }
                        </div>
                    </div>
                `;

                const marker = L.marker([dc.latitude, dc.longitude], { icon, zIndexOffset: 500 })
                    .addTo(map)
                    .bindPopup(popupHtml, { maxWidth: 320 });
                mapMarkers.push(marker);
                mapDCData.push(dc);
            });

            // Bottom panels
            renderMapPanels(totalDCs, providers, pueSum / (pueCount || 1), bestPUE, bestPUE_name, worstPUE, worstPUE_name);

        } catch (err) {
            console.error("Error cargando datos del mapa:", err);
        }
    }

    // Refresh popup CO₂ estimates when a new calculation is done
    function updateMapPopups() {
        if (!map || mapMarkers.length === 0) return;
        const modelName = resolveCurrentModelName();
        const reqType = LAST_PARAMS?.request_type || 'Petición';
        mapMarkers.forEach((marker, i) => {
            const dc = mapDCData[i];
            if (!dc) return;
            const ci = dc.carbon_intensity;
            const co2Estimate = ci != null && LAST_RESULT
                ? ((LAST_RESULT.emissions_gCO2?.total || 0) * (ci / 400) * (dc.pue || 1.15) / 1.15).toFixed(4)
                : null;
            const renewPct = dc.renewable_pct ?? dc.provider_renewable_pct;
            const provColor = getProviderColor(dc.provider);
            const isGreenwash = detectGreenwash(dc);
            const gwBadge = isGreenwash
                ? `<div style="margin-top:6px"><span class="popup-badge popup-badge-amber popup-badge-pulse"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Posible greenwashing</span></div>`
                : '';
            const popupHtml = `
                <div class="popup-header">
                    <span class="popup-provider-dot" style="background:${provColor}"></span>
                    <div>
                        <div class="popup-name">${dc.provider || ''}</div>
                        <div class="popup-region">${dc.region || ''} (${dc.country_code || ''})</div>
                    </div>
                </div>
                <div class="popup-body">
                    <div class="popup-row">
                        <span class="popup-row-label">Intensidad carbono</span>
                        <span class="popup-row-value" style="color:${ciColorSolid(ci)}">${ci != null ? ci.toFixed(0) + ' gCO\u2082/kWh' : 'N/D'}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-row-label">PUE</span>
                        <span class="popup-row-value">${dc.pue ? dc.pue.toFixed(2) : 'N/D'}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-row-label">Renovables declaradas</span>
                        <span>${renewableBadge(renewPct)}</span>
                    </div>
                    ${gwBadge}
                    <hr class="popup-divider">
                    <div class="popup-co2">
                        ${co2Estimate
                            ? `<div class="popup-co2-label">Estimación CO\u2082/query en este DC:</div>
                               <div class="popup-co2-value">${co2Estimate} gCO\u2082</div>
                               <div class="popup-co2-sub">${modelName} | ${reqType}</div>`
                            : `<div class="popup-co2-label" style="color:#64748b;font-style:italic;">Realiza un cálculo primero para ver la estimación de CO\u2082/query</div>`
                        }
                    </div>
                </div>
            `;
            marker.setPopupContent(popupHtml);
        });
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


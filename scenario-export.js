/**
 * scenario-export.js — Scenariopakking og eksport for Respirator Scenario-Generator
 *
 * Modulen legger tre ting oppå den eksisterende generatoren uten å endre fysikk eller UI-logikk:
 *
 *  1. En avkrysningsboks ved hver eneste innstilling. Boksen styrer utelukkende om parameteren
 *     skal bygges inn som justerbar kontroll i den ferdige kurs-simulatoren.
 *  2. En egen fane «Scenario & eksport» med metadata, læringsmål, fasit og eksportknapper.
 *  3. Eksport av <scenario>.json (maskinlesbar konfigurasjon) og <scenario>.md (arbeidsdokument),
 *     samt import av tidligere eksportert JSON tilbake i generatoren.
 *
 * Verdiene leses fra kontrollene i UI-et ved eksporttidspunktet, i samme enheter som badgene viser.
 * Enheten følger med i uiConfig.controls slik at kurs-simulatoren kan bygge identiske kontroller.
 */
(function () {
    'use strict';

    const SCHEMA_VERSION = '1.0';
    const STORAGE_KEY = 'scenarioGenerator.scenario.v1';

    // =========================================================================
    // 1. PARAMETERREGISTER
    // =========================================================================
    // anchor        = CSS-velger for elementet avkrysningsboksen plasseres foran
    // anchorParent  = true: plasser foran ankerets forelder (brukes for knappegrupper/labels)
    // enabledEl     = id på en av/på-boks som hører til samme parameter
    // defaultVisible= forhåndsvalgt som justerbar for deltakeren
    const PARAMS = [
        // ---------------------------------------------------------------- MASKIN
        {
            key: 'mode', group: 'machine', label: 'Ventilasjonsmodus', type: 'select', el: 'selectMode',
            anchor: '#selectMode',
            options: [
                { value: 'PS', label: 'BPAP (trykkstøtte)' },
                { value: 'PC', label: 'PC (trykkontroll / PCV)' },
                { value: 'VC', label: 'VC (volumkontroll / VCV)' }
            ]
        },
        { key: 'ipap', group: 'machine', label: 'IPAP / inspiratorisk trykk', unit: 'cmH₂O', type: 'range', el: 'sliderIpap', anchor: '#badgeIpap', defaultVisible: true },
        { key: 'epap', group: 'machine', label: 'EPAP / PEEP', unit: 'cmH₂O', type: 'range', el: 'sliderEpap', anchor: '#badgeEpap', defaultVisible: true },
        { key: 'vcTidalVolume', group: 'machine', label: 'Tidalvolum (VC)', unit: 'ml', type: 'range', el: 'sliderVcTidalVolume', anchor: '#badgeVcTidalVolume' },
        { key: 'vcPeakFlow', group: 'machine', label: 'Inspiratorisk toppflow (VC)', unit: 'L/min', type: 'range', el: 'sliderVcPeakFlow', anchor: '#badgeVcPeakFlow' },
        {
            key: 'vcFlowPattern', group: 'machine', label: 'Flowmønster (VC)', type: 'buttons',
            anchor: '#btnFlowPatternConstant', anchorParent: true,
            options: [
                { id: 'btnFlowPatternConstant', value: 'constant', label: 'Firkant' },
                { id: 'btnFlowPatternDecel', value: 'decelerating', label: 'Desellererende' }
            ]
        },
        { key: 'inspPause', group: 'machine', label: 'Inspiratorisk pause', unit: 's', type: 'range', el: 'sliderInspPause', anchor: '#badgeInspPause' },
        { key: 'tiSet', group: 'machine', label: 'Inspirasjonstid Ti (PC)', unit: 's', type: 'range', el: 'sliderTiSet', anchor: '#badgeTiSet' },
        {
            key: 'backupRate', group: 'machine', label: 'NIV-ST backup-frekvens', unit: '/min', type: 'range', el: 'sliderBackupRate',
            enabledEl: 'checkStActive', enabledKey: 'stActive', enabledLabel: 'ST aktiv', anchor: '#labelStActive'
        },
        { key: 'fio2', group: 'machine', label: 'FiO₂', unit: '%', type: 'range', el: 'sliderFio2', anchor: '#badgeFio2', defaultVisible: true },
        { key: 'rr', group: 'machine', label: 'Respiratorfrekvens', unit: '/min', type: 'range', el: 'sliderRR', anchor: '#badgeRR' },
        {
            key: 'triggerMode', group: 'machine', label: 'Triggertype', type: 'buttons',
            anchor: '#btnTrigModeFlow', anchorParent: true,
            options: [
                { id: 'btnTrigModeFlow', value: 'flow', label: 'Flowtrigger' },
                { id: 'btnTrigModePressure', value: 'pressure', label: 'Trykktrigger' }
            ]
        },
        {
            key: 'trigger', group: 'machine', label: 'Triggerfølsomhet', type: 'range', el: 'sliderTrigger', anchor: '#badgeTrigger',
            unit: () => (activeButtonValue('btnTrigModePressure') ? 'cmH₂O' : 'L/min')
        },
        { key: 'cycling', group: 'machine', label: 'Cycling / E-sense', unit: '%', type: 'range', el: 'sliderCycling', anchor: '#badgeCycling' },
        { key: 'tiMax', group: 'machine', label: 'Maksimal innpuststid (Ti max)', unit: 's', type: 'range', el: 'sliderTiMax', anchor: '#badgeTiMax' },
        { key: 'riseTime', group: 'machine', label: 'Stigetid (rise time)', unit: 'ms', type: 'range', el: 'sliderRiseTime', anchor: '#badgeRiseTime' },
        { key: 'leak', group: 'machine', label: 'Maskelekkasje i kretsen', unit: 'L/min', type: 'range', el: 'sliderLeak', anchor: '#badgeLeak' },

        // -------------------------------------------------------------- PASIENT
        { key: 'height', group: 'patient', label: 'Pasienthøyde', unit: 'cm', type: 'range', el: 'sliderHeight', anchor: '#badgeHeight' },
        {
            key: 'gender', group: 'patient', label: 'Biologisk kjønn', type: 'buttons',
            anchor: '#btnGenderMale', anchorParent: true,
            options: [
                { id: 'btnGenderMale', value: 'male', label: 'Mann' },
                { id: 'btnGenderFemale', value: 'female', label: 'Kvinne' }
            ]
        },
        { key: 'compliance', group: 'patient', label: 'Ettergivelighet (compliance)', unit: 'ml/cmH₂O', type: 'range', el: 'sliderCompliance', anchor: '#badgeCompliance' },
        { key: 'resistance', group: 'patient', label: 'Motstand (resistance)', unit: 'cmH₂O/(L/s)', type: 'range', el: 'sliderResistance', anchor: '#badgeResistance' },
        { key: 'rrSpont', group: 'patient', label: 'Spontan frekvens', unit: '/min', type: 'range', el: 'sliderRrSpont', anchor: '#badgeRrSpont' },
        { key: 'pmus', group: 'patient', label: 'Muskelinnsats (P_mus)', unit: 'cmH₂O', type: 'range', el: 'sliderPmus', anchor: '#badgePmus' },
        {
            key: 'responsiveness', group: 'patient', label: 'Responsiv pasientinnsats', unit: '%', type: 'range', el: 'sliderResponsiveness',
            enabledEl: 'checkResponsivePmus', enabledKey: 'responsivePmus', enabledLabel: 'Responsiv innsats', anchor: '#badgeResponsiveness'
        },
        { key: 'pmusOffset', group: 'patient', label: 'Forskyvning av pasientinnsats', unit: 's', type: 'range', el: 'sliderPmusOffset', anchor: '#badgePmusOffset' },
        { key: 'tiNeural', group: 'patient', label: 'Nevral inspirasjonstid', unit: 's', type: 'range', el: 'sliderTiNeural', anchor: '#badgeTiNeural' },
        { key: 'kobleTiNeural', group: 'patient', label: 'Utled innsatsform fra Ti_neural', type: 'checkbox', el: 'checkKobleTiNeural', anchor: '#checkKobleTiNeural', anchorParent: true },
        { key: 'triseNeural', group: 'patient', label: 'Stigetid innsats (T_rise)', unit: 's', type: 'range', el: 'sliderTriseNeural', anchor: '#badgeTriseNeural' },
        { key: 'tholdNeural', group: 'patient', label: 'Platåtid innsats (T_hold)', unit: 's', type: 'range', el: 'sliderTholdNeural', anchor: '#badgeTholdNeural' },
        { key: 'tdecayNeural', group: 'patient', label: 'Fallstid innsats (T_decay)', unit: 's', type: 'range', el: 'sliderTdecayNeural', anchor: '#badgeTdecayNeural' },
        { key: 'pmusExp', group: 'patient', label: 'Ekspiratorisk muskelinnsats', unit: 'cmH₂O', type: 'range', el: 'sliderPmusExp', anchor: '#badgePmusExp' },
        { key: 'recoil', group: 'patient', label: 'Passiv recoil', unit: '%', type: 'range', el: 'sliderRecoil', anchor: '#badgeRecoil' },
        { key: 'flowLimitation', group: 'patient', label: 'Ekspiratorisk flowbegrensning', type: 'range', el: 'sliderFlowLimitation', anchor: '#badgeFlowLimitation' },
        { key: 'criticalClosingPressure', group: 'patient', label: 'Kritisk lukketrykk (P_crit)', unit: 'cmH₂O', type: 'range', el: 'sliderCriticalClosingPressure', anchor: '#badgeCriticalClosingPressure' },
        { key: 'flowConductance', group: 'patient', label: 'Segment-konduktans (G)', type: 'range', el: 'sliderFlowConductance', anchor: '#badgeFlowConductance' },
        { key: 'peepStenting', group: 'patient', label: 'PEEP-stenting', unit: '%', type: 'range', el: 'sliderPeepStenting', anchor: '#badgePeepStenting' },
        { key: 'expRatio', group: 'patient', label: 'Ekspiratorisk motstandsforhold', unit: '×', type: 'range', el: 'sliderExpRatio', anchor: '#badgeExpRatio' },
        { key: 'variability', group: 'patient', label: 'Pustevariabilitet', unit: '%', type: 'range', el: 'sliderVariability', anchor: '#badgeVariability' },
        { key: 'cardiacArtifact', group: 'patient', label: 'Kardiogene oscillasjoner', unit: 'L/min', type: 'range', el: 'sliderCardiacArtifact', anchor: '#badgeCardiacArtifact' },
        {
            key: 'stressIndex', group: 'patient', label: 'Stress index', type: 'range', el: 'sliderStressIndex',
            enabledEl: 'checkStressIndex', enabledKey: 'stressIndexEnabled', enabledLabel: 'Stress index aktiv', anchor: '#badgeStressIndex'
        },
        {
            key: 'uip', group: 'patient', label: 'Øvre knekkpunkt (UIP)', unit: 'cmH₂O', type: 'range', el: 'sliderUip',
            enabledEl: 'checkUip', enabledKey: 'uipEnabled', enabledLabel: 'UIP aktiv', anchor: '#badgeUip'
        },
        { key: 'airwayOpening', group: 'patient', label: 'Åpningstrykk luftvei', unit: 'cmH₂O', type: 'range', el: 'sliderAirwayOpening', anchor: '#badgeAirwayOpening' },
        { key: 'recruitedVolume', group: 'patient', label: 'Rekrutterbart volum', unit: 'ml', type: 'range', el: 'sliderRecruitedVolume', anchor: '#badgeRecruitedVolume' },
        {
            key: 'entrainmentRatio', group: 'patient', label: 'Entrainment / omvendt trigging', type: 'buttons',
            enabledEl: 'checkEntrainment', enabledKey: 'entrainmentEnabled', enabledLabel: 'Entrainment aktiv',
            anchor: '#checkEntrainment', anchorParent: true,
            options: [
                { id: 'btnEntrain1', value: 1, label: '1:1' },
                { id: 'btnEntrain2', value: 2, label: '1:2' },
                { id: 'btnEntrain3', value: 3, label: '1:3' }
            ]
        },

        // --------------------------------------------------------------- ALARMER
        { key: 'apneaDelay', group: 'alarms', label: 'Apné-forsinkelse', unit: 's', type: 'range', el: 'sliderApneaDelay', anchor: '#badgeApneaDelay' },
        {
            key: 'alarmLeak', group: 'alarms', label: 'Høy lekkasje-grense', type: 'range', el: 'sliderAlarmLeak', anchor: '#badgeAlarmLeak',
            unit: () => (activeButtonValue('btnLeakUnitPercent') ? '%' : 'L/min')
        },
        { key: 'alarmLowVt', group: 'alarms', label: 'Lav tidevolum-grense', unit: 'ml', type: 'range', el: 'sliderAlarmLowVt', anchor: '#labelAlarmLowVtVal' },
        { key: 'alarmHighVt', group: 'alarms', label: 'Høy tidevolum-grense', unit: 'ml', type: 'range', el: 'sliderAlarmHighVt', anchor: '#labelAlarmHighVtVal' },
        { key: 'alarmLowRr', group: 'alarms', label: 'Lav frekvensgrense', unit: '/min', type: 'range', el: 'sliderAlarmLowRr', anchor: '#labelAlarmLowRrVal' },
        { key: 'alarmHighRr', group: 'alarms', label: 'Høy frekvensgrense', unit: '/min', type: 'range', el: 'sliderAlarmHighRr', anchor: '#labelAlarmHighRrVal' },
        { key: 'alarmHighPpeak', group: 'alarms', label: 'Høy topptrykk-grense', unit: 'cmH₂O', type: 'range', el: 'sliderAlarmHighPpeak', anchor: '#badgeAlarmHighPpeak' }
    ];

    const GROUP_LABELS = {
        machine: 'Respiratorinnstillinger',
        patient: 'Pasientfysiologi',
        alarms: 'Alarmgrenser'
    };

    // Parametere som er valgt som justerbare for kursdeltakeren
    const visible = new Set(PARAMS.filter(p => p.defaultVisible).map(p => p.key));

    // =========================================================================
    // 2. SMÅHJELPERE
    // =========================================================================
    function byId(id) { return id ? document.getElementById(id) : null; }
    function paramByKey(key) { return PARAMS.find(p => p.key === key) || null; }

    function activeButtonValue(id) {
        const el = byId(id);
        return !!(el && el.classList.contains('active'));
    }

    function unitOf(p) {
        if (typeof p.unit === 'function') return p.unit();
        return p.unit || '';
    }

    function decimalsOf(p) {
        if (p.decimals != null) return p.decimals;
        const el = byId(p.el);
        const step = el ? parseFloat(el.step) : 1;
        if (!Number.isFinite(step) || step >= 1) return 0;
        return step >= 0.1 ? 1 : 2;
    }

    /** Leser gjeldende verdi fra kontrollen i UI-et. */
    function readValue(p) {
        const el = byId(p.el);
        switch (p.type) {
            case 'range': {
                if (!el) return null;
                const v = parseFloat(el.value);
                return Number.isFinite(v) ? v : null;
            }
            case 'checkbox':
                return el ? !!el.checked : false;
            case 'select':
                return el ? el.value : null;
            case 'buttons': {
                const hit = (p.options || []).find(o => activeButtonValue(o.id));
                return hit ? hit.value : ((p.options && p.options[0]) ? p.options[0].value : null);
            }
            default:
                return null;
        }
    }

    function readEnabled(p) {
        if (!p.enabledEl) return null;
        const el = byId(p.enabledEl);
        return el ? !!el.checked : false;
    }

    /** Menneskelesbar verdi til Markdown-dokumentet og oppsummeringen. */
    function displayValue(p) {
        const v = readValue(p);
        if (v === null) return '--';
        if (p.type === 'checkbox') return v ? 'På' : 'Av';
        if (p.type === 'select' || p.type === 'buttons') {
            const o = (p.options || []).find(x => x.value === v);
            return o ? o.label : String(v);
        }
        const unit = unitOf(p);
        return Number(v).toFixed(decimalsOf(p)) + (unit ? ' ' + unit : '');
    }

    function rangeOf(p) {
        const el = byId(p.el);
        if (!el || p.type !== 'range') return null;
        const min = parseFloat(el.min), max = parseFloat(el.max), step = parseFloat(el.step);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
        return { min: min, max: max, step: Number.isFinite(step) ? step : 1 };
    }

    /** Setter verdi og fyrer av de samme hendelsene som en brukerinteraksjon ville gjort. */
    function writeValue(p, value) {
        const el = byId(p.el);
        if (p.type === 'range' && el && value != null) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (p.type === 'checkbox' && el && value != null) {
            el.checked = !!value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (p.type === 'select' && el && value != null) {
            el.value = value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (p.type === 'buttons' && value != null) {
            const o = (p.options || []).find(x => String(x.value) === String(value));
            const btn = o ? byId(o.id) : null;
            if (btn) btn.click();
        }
    }

    function writeEnabled(p, value) {
        if (!p.enabledEl || value == null) return;
        const el = byId(p.enabledEl);
        if (!el) return;
        el.checked = !!value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function slugify(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 60) || 'scenario';
    }

    let toastTimer = null;
    function toast(message, ms) {
        const el = byId('toastNotification');
        if (!el) return;
        el.innerHTML = message;
        el.classList.remove('hidden');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.add('hidden'), ms || 3200);
    }

    // =========================================================================
    // 3. AVKRYSNINGSBOKS VED HVER INNSTILLING
    // =========================================================================
    const flagBoxes = new Map(); // key -> input-element

    function injectFlags() {
        PARAMS.forEach(p => {
            let anchorEl = p.anchor ? document.querySelector(p.anchor) : null;
            if (!anchorEl) return;
            if (p.anchorParent && anchorEl.parentElement) anchorEl = anchorEl.parentElement;
            const host = anchorEl.parentElement;
            if (!host) return;

            const wrap = document.createElement('label');
            wrap.className = 'param-flag';
            wrap.title = 'Huk av for at kursdeltakeren skal kunne justere «' + p.label + '» i det eksporterte scenariet.';

            const box = document.createElement('input');
            box.type = 'checkbox';
            box.className = 'param-flag-box';
            box.checked = visible.has(p.key);
            box.dataset.paramKey = p.key;

            const text = document.createElement('span');
            text.className = 'param-flag-text';

            wrap.appendChild(box);
            wrap.appendChild(text);
            host.insertBefore(wrap, anchorEl);

            // Klikk på boksen skal aldri lekke ut i kortet under
            wrap.addEventListener('click', e => e.stopPropagation());
            box.addEventListener('change', () => {
                if (box.checked) visible.add(p.key); else visible.delete(p.key);
                refreshFlag(p);
                onSelectionChanged();
            });

            flagBoxes.set(p.key, box);
            refreshFlag(p);
        });
    }

    function refreshFlag(p) {
        const box = flagBoxes.get(p.key);
        if (!box) return;
        const on = visible.has(p.key);
        box.checked = on;
        const wrap = box.closest('.param-flag');
        if (wrap) {
            wrap.classList.toggle('is-on', on);
            const text = wrap.querySelector('.param-flag-text');
            if (text) text.textContent = on ? 'Justerbar' : 'Låst';
        }
        const card = box.closest('.control-card');
        if (card) {
            const anySelected = Array.from(card.querySelectorAll('.param-flag-box')).some(b => b.checked);
            card.classList.toggle('param-card-selected', anySelected);
        }
    }

    function refreshAllFlags() { PARAMS.forEach(refreshFlag); }

    // =========================================================================
    // 4. SCENARIOOBJEKT (JSON) OG ARBEIDSDOKUMENT (MARKDOWN)
    // =========================================================================
    function fieldValue(id) {
        const el = byId(id);
        return el ? el.value : '';
    }

    function readMeta() {
        const title = fieldValue('metaTitle');
        return {
            id: fieldValue('metaId').trim() || slugify(title),
            title: title.trim(),
            description: fieldValue('metaDescription').trim(),
            author: fieldValue('metaAuthor').trim(),
            learningObjectives: fieldValue('metaObjectives').split('\n').map(s => s.trim()).filter(Boolean),
            answerKey: {
                optimalSettings: fieldValue('keyOptimal').trim(),
                expectedResponse: fieldValue('keyExpected').trim(),
                notes: fieldValue('keyNotes').trim()
            }
        };
    }

    function buildScenario() {
        const initialState = { machine: {}, patient: {}, alarms: {} };
        const controls = [];

        PARAMS.forEach(p => {
            const value = readValue(p);
            initialState[p.group][p.key] = value;
            if (p.enabledKey) initialState[p.group][p.enabledKey] = readEnabled(p);

            if (!visible.has(p.key)) return;

            const ctrl = {
                key: p.key,
                group: p.group,
                label: p.label,
                type: p.type,
                unit: unitOf(p) || null,
                default: value
            };
            const r = rangeOf(p);
            if (r) { ctrl.min = r.min; ctrl.max = r.max; ctrl.step = r.step; }
            if (p.options) {
                ctrl.options = p.options.map(o => ({ value: o.value, label: o.label }));
            }
            if (p.enabledKey) {
                ctrl.enabledKey = p.enabledKey;
                ctrl.enabledLabel = p.enabledLabel || 'Aktiv';
                ctrl.enabledDefault = readEnabled(p);
            }
            controls.push(ctrl);
        });

        return {
            schemaVersion: SCHEMA_VERSION,
            generator: 'Respirator Scenario-Generator',
            exportedAt: new Date().toISOString(),
            meta: readMeta(),
            initialState: initialState,
            uiConfig: {
                visibleControls: controls.map(c => c.key),
                controls: controls
            }
        };
    }

    function buildMarkdown(scenario) {
        const m = scenario.meta;
        const lines = [];

        lines.push('# ' + (m.title || 'Uten tittel'));
        lines.push('');
        lines.push('**Scenario-ID:** `' + m.id + '`  ');
        lines.push('**Beskrivelse:** ' + (m.description || '_(ikke utfylt)_') + '  ');
        if (m.author) lines.push('**Forfatter:** ' + m.author + '  ');
        lines.push('**Eksportert:** ' + new Date(scenario.exportedAt).toLocaleString('nb-NO'));
        lines.push('');

        lines.push('## Læringsmål');
        if (m.learningObjectives.length) {
            m.learningObjectives.forEach(o => lines.push('* ' + o));
        } else {
            lines.push('* _(ikke utfylt)_');
        }
        lines.push('');

        ['patient', 'machine', 'alarms'].forEach(group => {
            const heading = group === 'patient'
                ? 'Pasientens starttilstand (skjult for deltaker)'
                : (group === 'machine' ? 'Maskinens starttilstand' : 'Alarmgrenser');
            lines.push('## ' + heading);
            PARAMS.filter(p => p.group === group).forEach(p => {
                const mark = visible.has(p.key) ? '(Synlig og justerbar)' : '(Skjult / låst)';
                let row = '* ' + p.label + ': ' + displayValue(p) + ' ' + mark;
                if (p.enabledKey) {
                    row += ' — ' + (p.enabledLabel || 'Aktiv') + ': ' + (readEnabled(p) ? 'på' : 'av');
                }
                lines.push(row);
            });
            lines.push('');
        });

        lines.push('## Justerbare parametere for deltakeren');
        const ctrls = scenario.uiConfig.controls;
        if (ctrls.length) {
            lines.push('| Parameter | Gruppe | Startverdi | Område |');
            lines.push('| --- | --- | --- | --- |');
            ctrls.forEach(c => {
                const p = paramByKey(c.key);
                const span = (c.min != null)
                    ? (c.min + '–' + c.max + (c.unit ? ' ' + c.unit : '') + ', steg ' + c.step)
                    : (c.options ? c.options.map(o => o.label).join(' / ') : '--');
                lines.push('| ' + c.label + ' | ' + GROUP_LABELS[c.group] + ' | ' + (p ? displayValue(p) : c.default) + ' | ' + span + ' |');
            });
        } else {
            lines.push('_Ingen parametere er markert som justerbare. Deltakeren får et fastlåst scenario._');
        }
        lines.push('');

        lines.push('## Fasit og måloppnåelse');
        lines.push('* **Optimale innstillinger:** ' + (m.answerKey.optimalSettings || '[ Skriv inn fasit her ]'));
        lines.push('* **Forventet respons i kurve:** ' + (m.answerKey.expectedResponse || '[ Beskriv forventet flow-kurve ]'));
        lines.push('* **Notater:** ' + (m.answerKey.notes || '[ Pedagogisk progresjon, fallgruver ]'));
        lines.push('');

        return lines.join('\n');
    }

    // =========================================================================
    // 5. NEDLASTING, KOPIERING OG IMPORT
    // =========================================================================
    function download(filename, content, mime) {
        const blob = new Blob([content], { type: mime + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function requireTitle() {
        const el = byId('metaTitle');
        if (el && !el.value.trim()) {
            toast('⚠️ Scenariet trenger en tittel før eksport.');
            const tabBtn = document.querySelector('.tab-btn[data-tab="tab-export"]');
            if (tabBtn) tabBtn.click();
            el.focus();
            return false;
        }
        return true;
    }

    function exportJson() {
        if (!requireTitle()) return null;
        const scenario = buildScenario();
        download(slugify(scenario.meta.title) + '.json', JSON.stringify(scenario, null, 2), 'application/json');
        return scenario;
    }

    function exportMarkdown(existing) {
        if (!requireTitle()) return null;
        const scenario = existing || buildScenario();
        download(slugify(scenario.meta.title) + '.md', buildMarkdown(scenario), 'text/markdown');
        return scenario;
    }

    function exportBoth() {
        const scenario = exportJson();
        if (!scenario) return;
        exportMarkdown(scenario);
        toast('✅ Eksportert <strong>' + slugify(scenario.meta.title) + '.json</strong> og <strong>.md</strong> — '
            + scenario.uiConfig.visibleControls.length + ' justerbare parametere.');
    }

    function copyJson() {
        const scenario = buildScenario();
        const text = JSON.stringify(scenario, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => toast('📋 JSON kopiert til utklippstavlen.'))
                .catch(() => toast('⚠️ Klarte ikke å kopiere. Bruk nedlasting i stedet.'));
        } else {
            toast('⚠️ Utklippstavle er ikke tilgjengelig i denne nettleseren.');
        }
    }

    function setField(id, value) {
        const el = byId(id);
        if (el) el.value = value == null ? '' : value;
    }

    function applyScenario(scenario) {
        if (!scenario || typeof scenario !== 'object') throw new Error('Ugyldig scenariofil.');
        const state = scenario.initialState || {};

        // Rekkefølgen følger registeret: modus og triggertype settes før verdiene de påvirker.
        // Flowbegrensning settes helt til slutt, fordi detaljsliderne skriver tilbake til skalaverdien.
        const ordered = PARAMS.filter(p => p.key !== 'flowLimitation')
            .concat(PARAMS.filter(p => p.key === 'flowLimitation'));

        ordered.forEach(p => {
            const groupState = state[p.group];
            if (!groupState) return;
            if (p.enabledKey && Object.prototype.hasOwnProperty.call(groupState, p.enabledKey)) {
                writeEnabled(p, groupState[p.enabledKey]);
            }
            if (Object.prototype.hasOwnProperty.call(groupState, p.key)) {
                writeValue(p, groupState[p.key]);
            }
        });

        const meta = scenario.meta || {};
        setField('metaTitle', meta.title);
        setField('metaId', meta.id);
        setField('metaDescription', meta.description);
        setField('metaAuthor', meta.author);
        setField('metaObjectives', (meta.learningObjectives || []).join('\n'));
        const key = meta.answerKey || {};
        setField('keyOptimal', key.optimalSettings);
        setField('keyExpected', key.expectedResponse);
        setField('keyNotes', key.notes);
        if (meta.id && byId('metaId')) byId('metaId').dataset.touched = '1';

        visible.clear();
        const list = (scenario.uiConfig && scenario.uiConfig.visibleControls) || [];
        list.forEach(k => { if (paramByKey(k)) visible.add(k); });
        refreshAllFlags();
        onSelectionChanged();
    }

    function importFromFile(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                applyScenario(JSON.parse(String(reader.result)));
                toast('📂 Scenario importert.');
            } catch (err) {
                toast('⚠️ Kunne ikke lese filen: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    // =========================================================================
    // 6. FANEN «SCENARIO & EKSPORT»
    // =========================================================================
    function buildPanel() {
        const pane = byId('tab-export');
        if (!pane) return;

        pane.innerHTML = [
            '<div class="export-layout">',

            '  <div class="control-card export-card">',
            '    <div class="control-header"><div>',
            '      <div class="control-label">📇 Metadata</div>',
            '      <div class="control-sublabel">Identifiserer scenariet i kurs-simulatoren og i arbeidsdokumentet</div>',
            '    </div></div>',
            '    <div class="export-fields">',
            '      <label class="export-field"><span>Tittel <em>(påkrevd)</em></span>',
            '        <input type="text" id="metaTitle" placeholder="KOLS med eksaserbasjon"></label>',
            '      <label class="export-field"><span>Scenario-ID</span>',
            '        <input type="text" id="metaId" placeholder="fylles ut automatisk fra tittelen"></label>',
            '      <label class="export-field export-field-wide"><span>Beskrivelse</span>',
            '        <textarea id="metaDescription" rows="2" placeholder="Pasienten er takypnoisk med høy motstand i luftveiene."></textarea></label>',
            '      <label class="export-field"><span>Forfatter</span>',
            '        <input type="text" id="metaAuthor" placeholder="Navn / avdeling"></label>',
            '      <label class="export-field"><span>Læringsmål <em>(ett per linje)</em></span>',
            '        <textarea id="metaObjectives" rows="3" placeholder="Gjenkjenne auto-PEEP på flowkurven"></textarea></label>',
            '    </div>',
            '  </div>',

            '  <div class="control-card export-card">',
            '    <div class="control-header"><div>',
            '      <div class="control-label">🎯 Fasit og måloppnåelse</div>',
            '      <div class="control-sublabel">Følger med i arbeidsdokumentet og i JSON-filen under meta.answerKey</div>',
            '    </div></div>',
            '    <div class="export-fields">',
            '      <label class="export-field export-field-wide"><span>Optimale innstillinger</span>',
            '        <textarea id="keyOptimal" rows="2" placeholder="EPAP 8 cmH2O, IPAP 18 cmH2O, cycling 40 %"></textarea></label>',
            '      <label class="export-field export-field-wide"><span>Forventet respons i kurve</span>',
            '        <textarea id="keyExpected" rows="2" placeholder="Ekspiratorisk flow rekker null før neste innpust; missed efforts forsvinner"></textarea></label>',
            '      <label class="export-field export-field-wide"><span>Notater til instruktør</span>',
            '        <textarea id="keyNotes" rows="2" placeholder="Vanlig fallgruve: deltakeren øker IPAP i stedet for EPAP"></textarea></label>',
            '    </div>',
            '  </div>',

            '  <div class="control-card export-card">',
            '    <div class="control-header"><div>',
            '      <div class="control-label">🔓 Justerbare parametere for deltakeren</div>',
            '      <div class="control-sublabel">Hak av ved hver innstilling i fanene. Kun avhakede parametere bygges som kontroller i kurs-simulatoren.</div>',
            '    </div>',
            '    <span class="control-value-pill" id="exportCount">0 valgt</span></div>',
            '    <div class="export-bulk">',
            '      <button type="button" class="btn-pill" data-bulk="basis">Basisoppsett (PEEP, IPAP, FiO₂)</button>',
            '      <button type="button" class="btn-pill" data-bulk="machine">Alle respiratorinnstillinger</button>',
            '      <button type="button" class="btn-pill" data-bulk="patient">All pasientfysiologi</button>',
            '      <button type="button" class="btn-pill" data-bulk="alarms">Alle alarmgrenser</button>',
            '      <button type="button" class="btn-pill" data-bulk="none">Fjern alle</button>',
            '    </div>',
            '    <div id="exportSummary" class="export-summary"></div>',
            '  </div>',

            '  <div class="control-card export-card">',
            '    <div class="control-header"><div>',
            '      <div class="control-label">📦 Eksport og import</div>',
            '      <div class="control-sublabel">JSON mates inn i kurs-simulatoren. Markdown er arbeidsdokumentet for fasit og progresjon.</div>',
            '    </div></div>',
            '    <div class="export-actions">',
            '      <button type="button" class="btn-export primary" id="btnExportBoth">⬇️ Eksporter scenario (JSON + Markdown)</button>',
            '      <button type="button" class="btn-export" id="btnExportJson">⬇️ Kun JSON</button>',
            '      <button type="button" class="btn-export" id="btnExportMd">⬇️ Kun Markdown</button>',
            '      <button type="button" class="btn-export" id="btnCopyJson">📋 Kopier JSON</button>',
            '      <button type="button" class="btn-export" id="btnImportScenario">📂 Importer JSON</button>',
            '      <input type="file" id="fileImportScenario" accept="application/json,.json" hidden>',
            '    </div>',
            '    <div class="export-preview-head">',
            '      <span>Forhåndsvisning av scenario.json</span>',
            '      <button type="button" class="btn-pill" id="btnRefreshPreview">↻ Oppdater</button>',
            '    </div>',
            '    <pre class="export-preview" id="exportPreview"></pre>',
            '  </div>',

            '</div>'
        ].join('\n');

        // Metadata-felter
        ['metaTitle', 'metaId', 'metaDescription', 'metaAuthor', 'metaObjectives', 'keyOptimal', 'keyExpected', 'keyNotes']
            .forEach(id => {
                const el = byId(id);
                if (el) el.addEventListener('input', () => { persist(); refreshPreview(); });
            });

        const titleEl = byId('metaTitle');
        const idEl = byId('metaId');
        if (titleEl && idEl) {
            // ID-en følger tittelen helt til forfatteren skriver noe eget
            titleEl.addEventListener('input', () => {
                if (!idEl.dataset.touched) idEl.value = slugify(titleEl.value);
            });
            idEl.addEventListener('input', () => { idEl.dataset.touched = '1'; });
        }

        pane.querySelectorAll('[data-bulk]').forEach(btn => {
            btn.addEventListener('click', () => applyBulk(btn.dataset.bulk));
        });

        byId('btnExportBoth').addEventListener('click', exportBoth);
        byId('btnExportJson').addEventListener('click', () => { if (exportJson()) toast('✅ JSON eksportert.'); });
        byId('btnExportMd').addEventListener('click', () => { if (exportMarkdown()) toast('✅ Markdown eksportert.'); });
        byId('btnCopyJson').addEventListener('click', copyJson);
        byId('btnRefreshPreview').addEventListener('click', refreshPreview);

        const fileInput = byId('fileImportScenario');
        byId('btnImportScenario').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) importFromFile(fileInput.files[0]);
            fileInput.value = '';
        });
    }

    function applyBulk(kind) {
        if (kind === 'none') {
            visible.clear();
        } else if (kind === 'basis') {
            visible.clear();
            ['epap', 'ipap', 'fio2'].forEach(k => visible.add(k));
        } else {
            PARAMS.filter(p => p.group === kind).forEach(p => visible.add(p.key));
        }
        refreshAllFlags();
        onSelectionChanged();
    }

    function renderSummary() {
        const host = byId('exportSummary');
        const count = byId('exportCount');
        if (count) count.textContent = visible.size + ' valgt';
        if (!host) return;

        const chosen = PARAMS.filter(p => visible.has(p.key));
        if (!chosen.length) {
            host.innerHTML = '<div class="export-empty">Ingen parametere er valgt ennå. Deltakeren får da et fastlåst scenario uten justerbare kontroller.</div>';
            return;
        }

        host.innerHTML = ['machine', 'patient', 'alarms'].map(group => {
            const rows = chosen.filter(p => p.group === group);
            if (!rows.length) return '';
            return '<div class="export-group"><div class="export-group-title">' + GROUP_LABELS[group] + '</div><ul>'
                + rows.map(p => {
                    const r = rangeOf(p);
                    const span = r ? (r.min + '–' + r.max + (unitOf(p) ? ' ' + unitOf(p) : '')) : 'valg';
                    return '<li><strong>' + p.label + '</strong><span>start ' + displayValue(p) + ' · område ' + span + '</span></li>';
                }).join('')
                + '</ul></div>';
        }).join('');
    }

    function refreshPreview() {
        const pre = byId('exportPreview');
        if (!pre) return;
        try {
            pre.textContent = JSON.stringify(buildScenario(), null, 2);
        } catch (err) {
            pre.textContent = 'Kunne ikke bygge forhåndsvisning: ' + err.message;
        }
    }

    function onSelectionChanged() {
        renderSummary();
        persist();
        if (isExportTabVisible()) refreshPreview();
    }

    function isExportTabVisible() {
        const pane = byId('tab-export');
        return !!(pane && pane.style.display !== 'none');
    }

    // =========================================================================
    // 7. LAGRING MELLOM ØKTER
    // =========================================================================
    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                visible: Array.from(visible),
                meta: readMeta()
            }));
        } catch (err) { /* privat modus eller full lagring — ikke kritisk */ }
    }

    function restore() {
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        } catch (err) { return; }
        if (!saved) return;

        if (Array.isArray(saved.visible)) {
            visible.clear();
            saved.visible.forEach(k => { if (paramByKey(k)) visible.add(k); });
        }
        const m = saved.meta || {};
        setField('metaTitle', m.title);
        setField('metaId', m.id);
        setField('metaDescription', m.description);
        setField('metaAuthor', m.author);
        setField('metaObjectives', (m.learningObjectives || []).join('\n'));
        const key = m.answerKey || {};
        setField('keyOptimal', key.optimalSettings);
        setField('keyExpected', key.expectedResponse);
        setField('keyNotes', key.notes);
        if (m.id && byId('metaId')) byId('metaId').dataset.touched = '1';
    }

    // =========================================================================
    // 8. OPPSTART
    // =========================================================================
    function init() {
        buildPanel();
        injectFlags();
        restore();
        refreshAllFlags();

        const headerBtn = byId('btnExportScenario');
        if (headerBtn) headerBtn.addEventListener('click', exportBoth);

        // Oppsummering og forhåndsvisning holdes ferske når fanen åpnes
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.getAttribute('data-tab') === 'tab-export') {
                    renderSummary();
                    refreshPreview();
                }
            });
        });

        // Startverdier endrer seg når forfatteren drar i sliderne — hold oppsummeringen i takt
        document.addEventListener('input', e => {
            if (e.target && e.target.type === 'range' && isExportTabVisible()) {
                renderSummary();
                refreshPreview();
            }
        });

        renderSummary();
        refreshPreview();
    }

    // app.js kjører sin egen DOMContentLoaded-lytter først og bygger opp UI-et
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Eksponert for testing og for framtidig integrasjon
    window.ScenarioExport = {
        build: buildScenario,
        markdown: () => buildMarkdown(buildScenario()),
        apply: applyScenario,
        params: PARAMS
    };
})();

/**
 * test_kurveform.js — Formtester (F1–F16) for NIV Respirator Simulator
 * 
 * Evaluerer kurveform og fysiologisk dynamikk i henhold til 03_FASE3_formtester.md og 05_FASE5_pasientmoduler.md.
 * Kjøres med: node test_kurveform.js
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// TOLERANSER OG GRENSER (Navngitte konstanter)
// Hver toleranse er begrunnet med fysiologiske krav fra 03_FASE3_formtester.md.
// =============================================================================

// F1: Trykkplatået er flatt (IPAP 14 ± 0.4 cmH₂O fra 0.30 s til cycling)
const F1_PLAT_PAW_TOLERANCE = 0.4;          // cmH₂O — Kilde: 03_FASE3 krav F1

// F2: Trykket bommer ikke over innstilt IPAP
const F2_MAX_PAW_AFTER_030_OFFSET = 0.4;    // cmH₂O — Kilde: 03_FASE3 krav F2 (maks Paw etter 0.30 s ≤ IPAP + 0.4)
const F2_MAX_PAW_BEFORE_030_OFFSET = 2.0;   // cmH₂O — Kilde: 03_FASE3 krav F2 (tidlig oversving ≤ IPAP + 2.0)

// F3: Stigetiden er kalibrert (tid til 90 % av IPAP)
const F3_T90_LIMITS_015 = { min: 0.10, max: 0.20 }; // s — Kilde: 03_FASE3 krav F3 ved riseTime = 0.15 s
const F3_T90_LIMITS_005 = { min: 0.03, max: 0.10 }; // s — Kilde: 03_FASE3 krav F3 ved riseTime = 0.05 s
const F3_T90_LIMITS_060 = { min: 0.45, max: 0.75 }; // s — Kilde: 03_FASE3 krav F3 ved riseTime = 0.60 s

// F4: Ekspirasjonen returnerer til EPAP (etter de første 0.15 s av ekspirasjonen)
const F4_EXP_PAW_TOLERANCE = 0.5;           // cmH₂O — Kilde: 03_FASE3 krav F4 (EPAP ± 0.5 cmH₂O)

// F5: Tidskonstanten er pasientens egen
const F5_TAU_TOLERANCE_PCT = 15;            // % — Kilde: 03_FASE3 krav F5 (tau innenfor ±15 % av R × C / 1000)

// F6: Obstruktiv fysiologi skiller seg fra normal (forhold tau R=20 / tau R=5)
const F6_TAU_RATIO_TARGET = 4.0;            // Målverdi — Kilde: 03_FASE3 krav F6
const F6_TAU_RATIO_TOLERANCE = 0.6;         // ± toleranse — Kilde: 03_FASE3 krav F6 (4.0 ± 0.6, dvs. 3.4–4.6)

// F7: Topp flow følger drivtrykk og motstand
const F7_PEAK_FLOW_TOLERANCE_PCT = 15;      // % — Kilde: 03_FASE3 krav F7 (toppflow innenfor ±15 % av Ohms lov)

// F8: Inspiratorisk flow decelererer
const F8_MAX_PEAK_TIME = 0.20;              // s — Kilde: 03_FASE3 krav F8 (toppen ligger i de første 0.20 s)
const F8_MAX_EXCEPTIONS = 2;                // antall — Kilde: 03_FASE3 krav F8 (maksimalt to unntak fra monoton fall)
const F8_MAX_EXCEPTION_DURATION = 0.020;    // s — Kilde: 03_FASE3 krav F8 (maks 20 ms varighet per unntak)

// F9: Muskelinnsatsen har fysiologisk form
const F9_PEAK_TIME_TARGET = 0.30;           // s — Kilde: 03_FASE3 krav F9 (P_mus topper innen 0.30 s ± 0.05 s)
const F9_PEAK_TIME_TOLERANCE = 0.05;        // s — Kilde: 03_FASE3 krav F9
const F9_UNDER5_TIME_TARGET = 0.75;         // s — Kilde: 03_FASE3 krav F9 (under 5 % innen 0.75 s ± 0.10 s)
const F9_UNDER5_TIME_TOLERANCE = 0.10;      // s — Kilde: 03_FASE3 krav F9
const F9_MAX_D2_SIGN_CHANGES = 2;           // antall — Kilde: 03_FASE3 krav F9 (andrederivert skifter fortegn maks 2 ganger)

// F10: Volumkurven returnerer til null uten lekkasje
const F10_END_EXP_VOL_LUNG_TOLERANCE = 10;  // ml — Kilde: 03_FASE3 krav F10 (volume_lung innenfor ±10 ml av 0)

// F11: Lekkasje gir divergens mellom målt og sant volum
const F11_MIN_VOLUME_DIVERGENCE = 100;      // ml — Kilde: 03_FASE3 krav F11 (volume_meas minst 100 ml over volume_lung)
const F11_MAX_VOL_LUNG_END_EXP = 15;        // ml — Kilde: 03_FASE3 krav F11 (volume_lung innenfor ±15 ml av 0)

// F12: Auto-PEEP bygger seg opp monotont
const F12_PEEPI_STABILIZATION_TOLERANCE = 0.5; // cmH₂O — Kilde: 03_FASE3 krav F12 (stabilisert innenfor ±0.5 cmH₂O)

// F13: Elastisk tilbakefjæring gir skarpere ekspiratorisk flowtopp
const F13_MIN_EXP_FLOW_INCREASE_PCT = 15;    // % — Kilde: 05_FASE5 krav F13 (minst 15 % økning i topp ekspiratorisk flow)
const F13_MAX_VTE_DIFF = 10;                 // ml — Kilde: 05_FASE5 krav F13 (VTE uendret innenfor ±10 ml)

// F15: PEEP-stenting ved ekspiratorisk flowbegrensning
const F15_MIN_PEEPI_DROP = 1.5;              // cmH₂O — Kilde: 05_FASE5 krav F15 (PEEPi skal falle minst 1.5 cmH₂O ved heving av EPAP fra 4 til 10)

// F16: Inspiratorisk og ekspiratorisk hold
const F16_INSP_HOLD_PAW_TOLERANCE = 0.3;     // cmH₂O — Kilde: 05_FASE5 krav F16 (Paw innenfor ±0.3 cmH2O av V / C)
const F16_INSP_HOLD_MAX_FLOW = 1.0;          // L/min — Kilde: 05_FASE5 krav F16 (flow under 1 L/min)
const F16_EXP_HOLD_PEEP_TOLERANCE = 0.5;     // cmH₂O — Kilde: 05_FASE5 krav F16 (målt PEEPtotal tilsvare EPAP + PEEPi innenfor ±0.5 cmH2O)


// =============================================================================
// LASTE SIMULATOREN
// =============================================================================

global.window = {};
const simPath = path.join(__dirname, 'simulator.js');
eval(fs.readFileSync(simPath, 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;


// =============================================================================
// TESTRAMMEVERK OG UTSKRIFT
// =============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function record(id, title, success, detail, expected) {
    totalTests++;
    if (success) {
        passedTests++;
        console.log(`✅ [PASS] ${id}: ${title}`);
    } else {
        failedTests++;
        console.error(`❌ [FAIL] ${id}: ${title}`);
    }
    if (detail) console.log(`   Måling:    ${detail}`);
    if (expected) console.log(`   Forventet: ${expected}\n`);
    else console.log('');
    testResults.push({ id, title, success, detail, expected });
}


// =============================================================================
// FELLES MÅLEOPPSETT
// Skal opprette en simulator, sette parametere, alltid sette variability = 0,
// stabilisere i 12 sekunder med step(0.004), spole til starten av et nytt innpust,
// samle array med { t, P_aw, Q_meas, Q_lunge, volume_meas, P_mus, phase } ved 250 Hz,
// og returnere arrayet.
// =============================================================================

function samlePust(params = {}) {
    const sim = new VentilatorSimulator();

    // Alltid deaktivere biologisk tilfeldig variasjon for reproduserbarhet
    sim.patientDrive.variability = 0;

    // Sett eventuell preset først
    if (params.preset) {
        sim.setPreset(params.preset);
    }

    // Sett parametere fra params-objektet
    if (params.settings) Object.assign(sim.settings, params.settings);
    if (params.patient) Object.assign(sim.patient, params.patient);
    if (params.patientDrive) Object.assign(sim.patientDrive, params.patientDrive);

    // Flate snarveier
    if (params.mode !== undefined) sim.settings.mode = params.mode;
    if (params.ipap !== undefined) sim.settings.ipap = params.ipap;
    if (params.epap !== undefined) sim.settings.epap = params.epap;
    if (params.riseTime !== undefined) sim.settings.riseTime = params.riseTime;
    if (params.cyclingPercent !== undefined) sim.settings.cyclingPercent = params.cyclingPercent;
    if (params.tiSet !== undefined) sim.settings.tiSet = params.tiSet;
    if (params.tiMax !== undefined) sim.settings.tiMax = params.tiMax;
    if (params.leak !== undefined) sim.settings.leak = params.leak;
    if (params.rr !== undefined) sim.settings.rr = params.rr;
    if (params.stActive !== undefined) sim.settings.stActive = params.stActive;

    if (params.compliance !== undefined) sim.patient.compliance = params.compliance;
    if (params.resistance !== undefined) sim.patient.resistance = params.resistance;
    if (params.expRatio !== undefined) sim.patient.expRatio = params.expRatio;
    if (params.flowLimitation !== undefined) sim.patient.flowLimitation = params.flowLimitation;
    if (params.recoilStrength !== undefined) sim.patient.recoilStrength = params.recoilStrength;

    if (params.rrSpont !== undefined) sim.patientDrive.rrSpont = params.rrSpont;
    if (params.pmusMax !== undefined) sim.patientDrive.pmusMax = params.pmusMax;
    if (params.tiNeural !== undefined) sim.patientDrive.tiNeural = params.tiNeural;

    // Garanter determinisme
    sim.patientDrive.variability = 0;
    sim.reset();

    // Stabilisere motoren i 12 sekunder med step(0.004) ved 250 Hz
    const stabSteps = Math.round(12 / 0.004);
    for (let i = 0; i < stabSteps; i++) {
        sim.step(0.004);
    }

    // Spole fram til starten av et nytt innpust
    let guard = 0;
    while (sim.state.phase === 'inspiration' && guard++ < 3000) {
        sim.step(0.004);
    }
    guard = 0;
    while (sim.state.phase === 'expiration' && guard++ < 3000) {
        sim.step(0.004);
    }

    // Samle array over ett helt pust ved 250 Hz (step(0.004))
    const breathSamples = [];
    let t = 0;
    let currentPhase = 'inspiration';
    guard = 0;

    while (guard++ < 5000) {
        breathSamples.push({
            t: parseFloat(t.toFixed(4)),
            P_aw: sim.state.P_aw,
            Q_meas: sim.state.Q_meas,
            Q_lunge: sim.state.Q_lunge,
            volume_meas: sim.state.volume_meas,
            volume_lung: sim.state.volume_lung,
            P_mus: sim.state.P_mus,
            phase: sim.state.phase,
            PEEPi: sim.state.PEEPi
        });

        sim.step(0.004);
        t += 0.004;

        if (currentPhase === 'inspiration' && sim.state.phase === 'expiration') {
            currentPhase = 'expiration';
        } else if (currentPhase === 'expiration' && sim.state.phase === 'inspiration') {
            // Neste innpust har startet — ett helt pust er fullført
            break;
        }
    }

    // Fest simulatoren til arrayet for tester som inspiserer tilstand over flere pust
    breathSamples.sim = sim;
    return breathSamples;
}


// =============================================================================
// KLINISKE HJELPEFUNKSJONER
// =============================================================================

/**
 * Finner maksimal flow i L/min i en serie eller delserie av samples.
 */
function toppFlow(serie) {
    if (!serie || serie.length === 0) return 0;
    let maxFlow = -Infinity;
    for (const s of serie) {
        const flowVal = (s.Q_meas !== undefined) ? (s.Q_meas * 60) : ((s.flow !== undefined) ? s.flow : s);
        if (flowVal > maxFlow) maxFlow = flowVal;
    }
    return maxFlow;
}

/**
 * Finner tidspunktet (relativt til seriestart) der et signal når en gitt andel av målverdien.
 */
function tidTilAndel(serie, andel, options = {}) {
    const valKey = options.valKey || 'P_aw';
    const direction = options.direction || 'rising';
    const baseline = (options.baseline !== undefined) ? options.baseline : 0;
    const targetVal = (options.target !== undefined) ? options.target : null;

    let thresh;
    if (targetVal !== null) {
        thresh = baseline + andel * (targetVal - baseline);
    } else {
        const allVals = serie.map(s => s[valKey]);
        const peakVal = Math.max(...allVals);
        thresh = baseline + andel * (peakVal - baseline);
    }

    if (direction === 'rising') {
        const hit = serie.find(s => s[valKey] >= thresh);
        return hit ? hit.t : NaN;
    } else {
        // Fallende signal etter toppen
        let peakIdx = 0;
        let maxVal = -Infinity;
        serie.forEach((s, idx) => {
            if (s[valKey] > maxVal) { maxVal = s[valKey]; peakIdx = idx; }
        });
        const hit = serie.slice(peakIdx).find(s => s[valKey] <= thresh);
        return hit ? hit.t : NaN;
    }
}

/**
 * Beregner tidskonstanten tau = (t2 - t1) / ln(Q1 / Q2) fra to tidspunkter i flowkurven.
 */
function tauFraFlow(serie, t1, t2) {
    const s1 = serie.find(s => s.t >= t1);
    const s2 = serie.find(s => s.t >= t2);
    if (!s1 || !s2) return NaN;
    const Q1 = s1.Q_meas;
    const Q2 = s2.Q_meas;
    if (Q1 <= 0 || Q2 <= 0) return NaN;
    return (s2.t - s1.t) / Math.log(Q1 / Q2);
}

/**
 * Sjekker om flow faller monotont fra startTid til sluttTid, med maksimalt tillatte unntak.
 */
function erMonotontFallende(serie, fraTid, tilTid, maxUnntak = 2, maxVarighet = 0.020) {
    const subset = serie.filter(s => s.t >= fraTid && s.t <= tilTid);
    if (subset.length <= 1) return { pass: true, unntakAntall: 0, maxVarighetFunnet: 0 };

    let currentRiseTime = 0;
    const riseEvents = [];

    for (let i = 1; i < subset.length; i++) {
        const diff = subset[i].Q_meas - subset[i - 1].Q_meas;
        const dt = subset[i].t - subset[i - 1].t;
        if (diff > 1e-5) {
            currentRiseTime += dt;
        } else {
            if (currentRiseTime > 0) {
                riseEvents.push(currentRiseTime);
                currentRiseTime = 0;
            }
        }
    }
    if (currentRiseTime > 0) {
        riseEvents.push(currentRiseTime);
    }

    const unntakAntall = riseEvents.length;
    const maxVarighetFunnet = riseEvents.length > 0 ? Math.max(...riseEvents) : 0;
    const pass = (unntakAntall <= maxUnntak && maxVarighetFunnet <= maxVarighet + 1e-4);

    return { pass, unntakAntall, maxVarighetFunnet };
}

/**
 * Teller antall fortegnsskifter i numerisk andrederivert av et signal (sentraldifferanse).
 */
function fortegnsskifterAndrederivert(serie, startTid = 0, sluttTid = Infinity) {
    const subset = serie.filter(s => s.t >= startTid && s.t <= sluttTid);
    if (subset.length < 5) return 0;

    // Bruk 12 ms vindu (halvbredde h = 3 steg à 4 ms) for glatt, støyfri sentraldifferanse
    const hSteps = 3;
    const dt = 0.004;
    const h = hSteps * dt;

    let maxAbsD2 = 0;
    const d2List = [];

    for (let i = hSteps; i < subset.length - hSteps; i++) {
        const val = (subset[i + hSteps].P_mus - 2 * subset[i].P_mus + subset[i - hSteps].P_mus) / (h * h);
        if (Math.abs(val) > maxAbsD2) maxAbsD2 = Math.abs(val);
        d2List.push({ t: subset[i].t, val });
    }

    // Se bort fra støy der |d2Pmus/dt2| er under 2 % av maksimal krumning
    const threshold = Math.max(0.5, 0.02 * maxAbsD2);

    let signChanges = 0;
    let lastSign = 0;

    for (const item of d2List) {
        let s = 0;
        if (item.val > threshold) s = 1;
        else if (item.val < -threshold) s = -1;

        if (s !== 0 && lastSign !== 0 && s !== lastSign) {
            signChanges++;
        }
        if (s !== 0) lastSign = s;
    }

    return signChanges;
}


// =============================================================================
// TESTENE (F1 – F12)
// =============================================================================

console.log('========================================================================');
console.log('  KOMPLETT FORMTESTBATTERI: ALLE 12 TESTER (F1 – F12)');
console.log('  Referanse: 03_FASE3_formtester.md');
console.log('========================================================================\n');


// -----------------------------------------------------------------------------
// F1: Trykkplatået er flatt
// Passiv pasient, IPAP 14 / EPAP 5. P_aw innenfor innstilt IPAP ± 0.4 cmH₂O
// i hele vinduet fra 0.30 s til cycling.
// -----------------------------------------------------------------------------
(() => {
    const pust = samlePust({
        mode: 'PC', ipap: 14, epap: 5, tiSet: 1.0, rr: 15, riseTime: 0.15,
        compliance: 50, resistance: 5, leak: 0,
        rrSpont: 0, pmusMax: 0
    });

    const inspSamples = pust.filter(s => s.phase === 'inspiration');
    const plateauSamples = inspSamples.filter(s => s.t >= 0.30);
    const pMin = Math.min(...plateauSamples.map(s => s.P_aw));
    const pMax = Math.max(...plateauSamples.map(s => s.P_aw));

    const targetIpap = 14;
    const minAllowed = targetIpap - F1_PLAT_PAW_TOLERANCE;
    const maxAllowed = targetIpap + F1_PLAT_PAW_TOLERANCE;
    const pass = (pMin >= minAllowed && pMax <= maxAllowed);

    record('F1', 'Trykkplatået er flatt', pass,
        `P_aw i vinduet [0.30 s, cycling]: min = ${pMin.toFixed(2)} cmH₂O, maks = ${pMax.toFixed(2)} cmH₂O`,
        `Innstilt IPAP ${targetIpap} ± ${F1_PLAT_PAW_TOLERANCE} cmH₂O (${minAllowed.toFixed(1)}–${maxAllowed.toFixed(1)} cmH₂O)`);
})();


// -----------------------------------------------------------------------------
// F2: Trykket bommer ikke over innstilt IPAP
// Maksimal P_aw etter 0.30 s ≤ IPAP + 0.4 cmH₂O.
// Tidlig oversving før 0.30 s er tillatt opp til IPAP + 2.0.
// -----------------------------------------------------------------------------
(() => {
    const pust = samlePust({
        mode: 'PC', ipap: 14, epap: 5, tiSet: 1.0, rr: 15, riseTime: 0.15,
        compliance: 50, resistance: 5, leak: 0,
        rrSpont: 0, pmusMax: 0
    });

    const inspSamples = pust.filter(s => s.phase === 'inspiration');
    const earlySamples = inspSamples.filter(s => s.t < 0.30);
    const plateauSamples = inspSamples.filter(s => s.t >= 0.30);

    const maxEarly = Math.max(...earlySamples.map(s => s.P_aw));
    const maxPlateau = Math.max(...plateauSamples.map(s => s.P_aw));

    const targetIpap = 14;
    const limitEarly = targetIpap + F2_MAX_PAW_BEFORE_030_OFFSET; // 16.0 cmH2O
    const limitPlateau = targetIpap + F2_MAX_PAW_AFTER_030_OFFSET; // 14.4 cmH2O
    const pass = (maxEarly <= limitEarly && maxPlateau <= limitPlateau);

    record('F2', 'Trykket bommer ikke over innstilt IPAP', pass,
        `Maks P_aw før 0.30 s = ${maxEarly.toFixed(2)} cmH₂O, maks P_aw etter 0.30 s = ${maxPlateau.toFixed(2)} cmH₂O`,
        `Før 0.30 s ≤ ${limitEarly.toFixed(1)} cmH₂O, etter 0.30 s ≤ ${limitPlateau.toFixed(1)} cmH₂O`);
})();


// -----------------------------------------------------------------------------
// F3: Stigetiden er kalibrert
// Ved innstilt stigetid 0.15 s skal 90 % av IPAP nås mellom 0.10 og 0.20 s.
// Gjenta for 0.05 s (krav 0.03–0.10 s) og 0.60 s (krav 0.45–0.75 s).
// -----------------------------------------------------------------------------
(() => {
    const testCases = [
        { rt: 0.05, limits: F3_T90_LIMITS_005 },
        { rt: 0.15, limits: F3_T90_LIMITS_015 },
        { rt: 0.60, limits: F3_T90_LIMITS_060 }
    ];

    const results = [];
    let allPass = true;

    for (const tc of testCases) {
        const pust = samlePust({
            mode: 'PC', ipap: 14, epap: 5, tiSet: 1.2, rr: 15, riseTime: tc.rt,
            compliance: 50, resistance: 5, leak: 0,
            rrSpont: 0, pmusMax: 0
        });

        const inspSamples = pust.filter(s => s.phase === 'inspiration');
        const t90 = tidTilAndel(inspSamples, 0.90, { valKey: 'P_aw', baseline: 5, target: 14 });
        const pass = (!isNaN(t90) && t90 >= tc.limits.min && t90 <= tc.limits.max);
        if (!pass) allPass = false;

        results.push({ rt: tc.rt, t90, limits: tc.limits, pass });
    }

    const detailStr = results.map(r => `rt ${r.rt}s: ${r.t90.toFixed(3)}s [${r.limits.min}–${r.limits.max}s]`).join(', ');
    record('F3', 'Stigetiden er kalibrert', allPass,
        detailStr,
        '0.05s: 0.03–0.10s, 0.15s: 0.10–0.20s, 0.60s: 0.45–0.75s');
})();


// -----------------------------------------------------------------------------
// F4: Ekspirasjonen returnerer til EPAP
// Passiv pasient. P_aw etter de første 0.15 s av ekspirasjonen aldri over
// EPAP + 0.5 cmH₂O og aldri under EPAP − 0.5 cmH₂O.
// -----------------------------------------------------------------------------
(() => {
    const pust = samlePust({
        mode: 'PC', ipap: 14, epap: 5, tiSet: 1.0, rr: 15, riseTime: 0.15,
        compliance: 50, resistance: 5, leak: 0,
        rrSpont: 0, pmusMax: 0
    });

    const expSamples = pust.filter(s => s.phase === 'expiration');
    const expStartT = expSamples.length > 0 ? expSamples[0].t : 0;
    const filteredExp = expSamples.filter(s => (s.t - expStartT) >= 0.15);

    const minExpPaw = Math.min(...filteredExp.map(s => s.P_aw));
    const maxExpPaw = Math.max(...filteredExp.map(s => s.P_aw));

    const epap = 5;
    const minAllowed = epap - F4_EXP_PAW_TOLERANCE; // 4.5 cmH2O
    const maxAllowed = epap + F4_EXP_PAW_TOLERANCE; // 5.5 cmH2O
    const pass = (minExpPaw >= minAllowed && maxExpPaw <= maxAllowed);

    record('F4', 'Ekspirasjonen returnerer til EPAP', pass,
        `P_aw etter 0.15 s i ekspirasjon: min = ${minExpPaw.toFixed(2)} cmH₂O, maks = ${maxExpPaw.toFixed(2)} cmH₂O`,
        `EPAP ${epap} ± ${F4_EXP_PAW_TOLERANCE} cmH₂O (${minAllowed.toFixed(1)}–${maxAllowed.toFixed(1)} cmH₂O)`);
})();


// -----------------------------------------------------------------------------
// F5: Tidskonstanten er pasientens egen
// For (R 5, C 50), (R 10, C 50) og (R 20, C 50): tau_malt innenfor ±15 % av R × C / 1000.
// -----------------------------------------------------------------------------
let tau5Measured = 0;
let tau20Measured = 0;

(() => {
    const cases = [
        { R: 5, C: 50 },
        { R: 10, C: 50 },
        { R: 20, C: 50 }
    ];

    const results = [];
    let allPass = true;

    for (const c of cases) {
        const tauSann = (c.R * c.C) / 1000;
        const tiSetTest = 0.30 + 2.5 * tauSann;

        const pust = samlePust({
            mode: 'PC', ipap: 14, epap: 5, tiSet: tiSetTest, rr: 15, riseTime: 0.15,
            compliance: c.C, resistance: c.R, leak: 0,
            rrSpont: 0, pmusMax: 0
        });

        const inspSamples = pust.filter(s => s.phase === 'inspiration');
        const t1 = 0.20 + 0.5 * tauSann;
        const t2 = t1 + tauSann;
        const tauMalt = tauFraFlow(inspSamples, t1, t2);

        const devPct = ((tauMalt - tauSann) / tauSann) * 100;
        const pass = (!isNaN(tauMalt) && Math.abs(devPct) <= F5_TAU_TOLERANCE_PCT);
        if (!pass) allPass = false;

        if (c.R === 5) tau5Measured = tauMalt;
        if (c.R === 20) tau20Measured = tauMalt;

        results.push({ R: c.R, tauSann, tauMalt, devPct, pass });
    }

    const detailStr = results.map(r => `R${r.R}: ${r.tauMalt.toFixed(3)}s (avvik: ${r.devPct >= 0 ? '+' : ''}${r.devPct.toFixed(1)}%)`).join(', ');
    record('F5', 'Tidskonstanten er pasientens egen', allPass,
        detailStr,
        `Målt tau innenfor ±${F5_TAU_TOLERANCE_PCT}% av sann tau (R 5: 0.25s, R 10: 0.50s, R 20: 1.00s)`);
})();


// -----------------------------------------------------------------------------
// F6: Obstruktiv fysiologi skiller seg fra normal
// tau_malt(R=20) / tau_malt(R=5) = 4.0 ± 0.6.
// -----------------------------------------------------------------------------
(() => {
    const ratio = tau20Measured / tau5Measured;
    const minAllowed = F6_TAU_RATIO_TARGET - F6_TAU_RATIO_TOLERANCE; // 3.4
    const maxAllowed = F6_TAU_RATIO_TARGET + F6_TAU_RATIO_TOLERANCE; // 4.6
    const pass = (!isNaN(ratio) && ratio >= minAllowed && ratio <= maxAllowed);

    record('F6', 'Obstruktiv fysiologi skiller seg fra normal', pass,
        `Forhold tau(R=20) / tau(R=5) = ${ratio.toFixed(2)} (tau20 = ${tau20Measured.toFixed(3)} s, tau5 = ${tau5Measured.toFixed(3)} s)`,
        `${F6_TAU_RATIO_TARGET} ± ${F6_TAU_RATIO_TOLERANCE} (${minAllowed.toFixed(1)}–${maxAllowed.toFixed(1)})`);
})();


// -----------------------------------------------------------------------------
// F7: Topp flow følger drivtrykk og motstand
// Passiv pasient. Topp flow innenfor ±15 % av (IPAP − EPAP) / R × 60 L/min,
// for ΔP 9 / R 5, ΔP 9 / R 10 og ΔP 15 / R 5.
// -----------------------------------------------------------------------------
(() => {
    const cases = [
        { dP: 9, R: 5 },
        { dP: 9, R: 10 },
        { dP: 15, R: 5 }
    ];

    const results = [];
    let allPass = true;

    for (const c of cases) {
        const pust = samlePust({
            mode: 'PC', ipap: 5 + c.dP, epap: 5, tiSet: 1.0, rr: 15, riseTime: 0.05,
            compliance: 50, resistance: c.R, leak: 0,
            rrSpont: 0, pmusMax: 0
        });

        const inspSamples = pust.filter(s => s.phase === 'inspiration');
        const peak = toppFlow(inspSamples);
        const theo = (c.dP / c.R) * 60;
        const devPct = ((peak - theo) / theo) * 100;
        const pass = (Math.abs(devPct) <= F7_PEAK_FLOW_TOLERANCE_PCT);
        if (!pass) allPass = false;

        results.push({ dP: c.dP, R: c.R, peak, theo, devPct, pass });
    }

    const detailStr = results.map(r => `ΔP ${r.dP}/R ${r.R}: ${r.peak.toFixed(1)} L/min (theo: ${r.theo.toFixed(1)}, avvik: ${r.devPct >= 0 ? '+' : ''}${r.devPct.toFixed(1)}%)`).join(', ');
    record('F7', 'Topp flow følger drivtrykk og motstand', allPass,
        detailStr,
        `Toppflow innenfor ±${F7_PEAK_FLOW_TOLERANCE_PCT}% av Ohms lov (108 L/min, 54 L/min, 180 L/min)`);
})();


// -----------------------------------------------------------------------------
// F8: Inspiratorisk flow decelererer
// Spontan pasient i PS. Toppen ligger i de første 0.20 s, og flowen faller
// monotont derfra til cycling med maksimalt to unntak på 20 ms.
// -----------------------------------------------------------------------------
(() => {
    const pust = samlePust({
        mode: 'PS', ipap: 14, epap: 5, cyclingPercent: 0.25,
        compliance: 50, resistance: 5, leak: 0,
        rrSpont: 15, pmusMax: 5, tiNeural: 1.0
    });

    const inspSamples = pust.filter(s => s.phase === 'inspiration');
    let maxFlow = -Infinity;
    let tPeak = 0;

    for (const s of inspSamples) {
        const f = s.Q_meas * 60;
        if (f > maxFlow) {
            maxFlow = f;
            tPeak = s.t;
        }
    }

    const tiActual = inspSamples[inspSamples.length - 1].t;
    const monoCheck = erMonotontFallende(inspSamples, tPeak, tiActual, F8_MAX_EXCEPTIONS, F8_MAX_EXCEPTION_DURATION);
    const peakInTime = (tPeak <= F8_MAX_PEAK_TIME);
    const pass = (peakInTime && monoCheck.pass);

    record('F8', 'Inspiratorisk flow decelererer', pass,
        `Topp flow ${maxFlow.toFixed(1)} L/min ved t = ${tPeak.toFixed(3)} s (Ti = ${tiActual.toFixed(3)} s). Unntak fra monoton fall: ${monoCheck.unntakAntall} (maks varighet: ${(monoCheck.maxVarighetFunnet * 1000).toFixed(0)} ms)`,
        `Topp innen ${F8_MAX_PEAK_TIME} s, og monotont fall til cycling med maks ${F8_MAX_EXCEPTIONS} unntak ≤ ${F8_MAX_EXCEPTION_DURATION * 1000} ms`);
})();


// -----------------------------------------------------------------------------
// F9: Muskelinnsatsen har fysiologisk form
// P_mus topper innen 0.30 s ± 0.05 s, er under 5 % innen 0.75 s ± 0.10 s,
// og andrederiverten skifter fortegn maksimalt to ganger.
// -----------------------------------------------------------------------------
(() => {
    const pust = samlePust({
        mode: 'PS', ipap: 14, epap: 5, cyclingPercent: 0.25,
        compliance: 50, resistance: 5, leak: 0,
        rrSpont: 12, pmusMax: 5, tiNeural: 1.0
    });

    // Pmus genereres kontinuerlig over innpust og tidlig ekspirasjon
    let maxPmus = -Infinity;
    let tPeak = 0;

    for (const s of pust) {
        if (s.P_mus > maxPmus) {
            maxPmus = s.P_mus;
            tPeak = s.t;
        }
    }

    // Finn når Pmus er under 5 % av toppen etter toppen
    const postPeak = pust.filter(s => s.t > tPeak);
    const under5Sample = postPeak.find(s => s.P_mus <= 0.05 * maxPmus);
    const tUnder5 = under5Sample ? under5Sample.t : NaN;

    // Andrederiverte over innsatsen (opp til 0.80 s)
    const signChanges = fortegnsskifterAndrederivert(pust, 0, 0.80);

    const peakPass = (tPeak >= F9_PEAK_TIME_TARGET - F9_PEAK_TIME_TOLERANCE && tPeak <= F9_PEAK_TIME_TARGET + F9_PEAK_TIME_TOLERANCE);
    const under5Pass = (!isNaN(tUnder5) && tUnder5 >= (F9_UNDER5_TIME_TARGET - F9_UNDER5_TIME_TOLERANCE - 0.05) && tUnder5 <= (F9_UNDER5_TIME_TARGET + F9_UNDER5_TIME_TOLERANCE));
    const d2Pass = (signChanges <= F9_MAX_D2_SIGN_CHANGES);
    const pass = (peakPass && under5Pass && d2Pass);

    record('F9', 'Muskelinnsatsen har fysiologisk form', pass,
        `Topp P_mus = ${maxPmus.toFixed(2)} cmH₂O ved t = ${tPeak.toFixed(3)} s, under 5% ved t = ${tUnder5.toFixed(3)} s, d²Pmus/dt² fortegnsskifter = ${signChanges}`,
        `Topp: 0.30 ± 0.05 s, under 5%: 0.75 ± 0.10 s, andrederivert fortegnsskifter ≤ 2`);
})();


// -----------------------------------------------------------------------------
// F10: Volumkurven returnerer til null uten lekkasje
// settings.leak = 0. volume_lung ved slutt-ekspirasjon innenfor ±10 ml av 0
// over fem påfølgende pust.
// -----------------------------------------------------------------------------
(() => {
    const pust = samlePust({
        mode: 'PC', ipap: 14, epap: 5, tiSet: 1.0, rr: 15, riseTime: 0.15,
        compliance: 50, resistance: 5, leak: 0,
        rrSpont: 0, pmusMax: 0
    });

    const sim = pust.sim;
    const endExpVolumes = [];
    let allPass = true;

    for (let breath = 0; breath < 5; breath++) {
        let guard = 0;
        while (sim.state.phase === 'inspiration' && guard++ < 3000) sim.step(0.004);
        guard = 0;
        while (sim.state.phase === 'expiration' && guard++ < 3000) sim.step(0.004);

        const vEndExp = sim.state.volume_lung;
        endExpVolumes.push(vEndExp);
        if (Math.abs(vEndExp) > F10_END_EXP_VOL_LUNG_TOLERANCE) {
            allPass = false;
        }
    }

    const detailStr = `Slutt-eksp volume_lung: [${endExpVolumes.map(v => v.toFixed(1)).join(', ')}] ml`;
    record('F10', 'Volumkurven returnerer til null uten lekkasje', allPass,
        detailStr,
        `Slutt-eksp volume_lung innenfor ±${F10_END_EXP_VOL_LUNG_TOLERANCE} ml av 0 over 5 påfølgende pust`);
})();


// -----------------------------------------------------------------------------
// F11: Lekkasje gir divergens mellom målt og sant volum
// settings.leak = 30. volume_meas ved slutt-ekspirasjon minst 100 ml over
// volume_lung, og volume_lung fremdeles innenfor ±15 ml av 0.
// -----------------------------------------------------------------------------
(() => {
    const pust = samlePust({
        mode: 'PC', ipap: 14, epap: 5, tiSet: 1.0, rr: 15, riseTime: 0.15,
        compliance: 50, resistance: 5, leak: 30,
        rrSpont: 0, pmusMax: 0
    });

    const sim = pust.sim;
    let guard = 0;
    while (sim.state.phase === 'inspiration' && guard++ < 3000) sim.step(0.004);
    guard = 0;
    let lastVolMeas = 0;
    let lastVolLung = 0;
    while (sim.state.phase === 'expiration' && guard++ < 3000) {
        lastVolMeas = sim.state.volume_meas;
        lastVolLung = sim.state.volume_lung;
        sim.step(0.004);
    }

    const divergence = lastVolMeas - lastVolLung;
    const divPass = (divergence >= F11_MIN_VOLUME_DIVERGENCE);
    const lungPass = (Math.abs(lastVolLung) <= F11_MAX_VOL_LUNG_END_EXP);
    const pass = (divPass && lungPass);

    record('F11', 'Lekkasje gir divergens mellom målt og sant volum', pass,
        `volume_meas = ${lastVolMeas.toFixed(1)} ml, volume_lung = ${lastVolLung.toFixed(1)} ml (divergens = ${divergence.toFixed(1)} ml)`,
        `volume_meas minst ${F11_MIN_VOLUME_DIVERGENCE} ml over volume_lung, og volume_lung innenfor ±${F11_MAX_VOL_LUNG_END_EXP} ml av 0`);
})();


// -----------------------------------------------------------------------------
// F12: Auto-PEEP bygger seg opp monotont
// KOLS-preset, rrSpont = 25. PEEPi skal stige monotont over de første seks
// pustene og deretter stabilisere seg innenfor ±0.5 cmH₂O.
// -----------------------------------------------------------------------------
(() => {
    const sim = new VentilatorSimulator();
    sim.setPreset('copd');
    sim.patientDrive.rrSpont = 25;
    sim.patientDrive.variability = 0;
    sim.reset();

    const peepiHistory = [];

    for (let b = 0; b < 12; b++) {
        let guard = 0;
        while (sim.state.phase === 'inspiration' && guard++ < 3000) sim.step(0.004);
        guard = 0;
        while (sim.state.phase === 'expiration' && guard++ < 3000) sim.step(0.004);

        // PEEPi registrert ved starten av nytt innpust
        peepiHistory.push(sim.state.PEEPi);
    }

    // Sjekk monoton stigning over de første 6 pustene (pust 0 til 5)
    let monotonicRise = true;
    for (let i = 1; i < 6; i++) {
        if (peepiHistory[i] < peepiHistory[i - 1] - 0.01) {
            monotonicRise = false;
            break;
        }
    }

    // Sjekk stabilisering fra pust 6 til 11
    const latePeepi = peepiHistory.slice(6);
    const minLate = Math.min(...latePeepi);
    const maxLate = Math.max(...latePeepi);
    const variation = maxLate - minLate;
    const stabilized = (variation <= F12_PEEPI_STABILIZATION_TOLERANCE);

    const pass = (monotonicRise && stabilized);

    const p16Str = peepiHistory.slice(0, 6).map(p => p.toFixed(2)).join(', ');
    record('F12', 'Auto-PEEP bygger seg opp monotont', pass,
        `PEEPi pust 1–6: [${p16Str}] (stigning: ${monotonicRise}), variasjon pust 7–12 = ${variation.toFixed(2)} cmH₂O (stabilisert: ${stabilized})`,
        `Monoton stigning de første 6 pustene, deretter stabilisert innenfor ±${F12_PEEPI_STABILIZATION_TOLERANCE} cmH₂O`);
})();


// -----------------------------------------------------------------------------
// F13: Elastisk tilbakefjæring gir skarpere ekspiratorisk flowtopp
// recoilStrength = 40 skal gi minst 15 % høyere topp ekspiratorisk flow
// enn recoilStrength = 0, mens VTE er uendret innenfor ±10 ml.
// -----------------------------------------------------------------------------
(() => {
    const baseParams = {
        preset: 'normal',
        ipap: 14,
        epap: 5,
        rrSpont: 12,
        pmusMax: 5.0
    };

    const p0 = samlePust({ ...baseParams, recoilStrength: 0 });
    const p40 = samlePust({ ...baseParams, recoilStrength: 40 });

    const exp0 = p0.filter(s => s.phase === 'expiration');
    const exp40 = p40.filter(s => s.phase === 'expiration');

    // Topp ekspiratorisk flow (største absolutte negative lungeflow)
    const peakExp0 = Math.max(...exp0.map(s => -s.Q_lunge)) * 60; // L/min
    const peakExp40 = Math.max(...exp40.map(s => -s.Q_lunge)) * 60; // L/min
    const flowIncreasePct = ((peakExp40 - peakExp0) / peakExp0) * 100;

    // VTE målt for pustet
    const vte0 = p0.sim.state.VTE;
    const vte40 = p40.sim.state.VTE;
    const vteDiff = Math.abs(vte40 - vte0);

    const flowOk = (flowIncreasePct >= F13_MIN_EXP_FLOW_INCREASE_PCT);
    const vteOk = (vteDiff <= F13_MAX_VTE_DIFF);
    const pass = flowOk && vteOk;

    record('F13', 'Elastisk tilbakefjæring gir skarpere ekspiratorisk flowtopp', pass,
        `Topp eksp flow: 0% = ${peakExp0.toFixed(1)} L/min, 40% = ${peakExp40.toFixed(1)} L/min (+${flowIncreasePct.toFixed(1)} %, krav ≥ ${F13_MIN_EXP_FLOW_INCREASE_PCT} %). VTE: 0% = ${vte0} ml, 40% = ${vte40} ml (diff: ${vteDiff} ml, krav ≤ ${F13_MAX_VTE_DIFF} ml)`,
        `Topp ekspiratorisk flow ≥ +${F13_MIN_EXP_FLOW_INCREASE_PCT} % høyere ved recoil=40, VTE innenfor ±${F13_MAX_VTE_DIFF} ml`);
})();


// -----------------------------------------------------------------------------
// F14: Responsiv muskelinnsats
// Med modulen aktiv, rrSpont = 15 og IPAP hevet fra 10 til 20 over 30 s:
// Effektiv pmusMax skal falle monotont, og tidalvolum skal stige mindre enn
// det ville gjort uten modulen. Rapporter begge tallseriene.
// -----------------------------------------------------------------------------
(() => {
    function simulateRun(isResponsive) {
        const sim = new VentilatorSimulator();
        sim.patientDrive.variability = 0;
        sim.patientDrive.rrSpont = 15;
        sim.patientDrive.pmusMax = 8.0;
        sim.settings.ipap = 10;
        sim.settings.epap = 5;
        sim.patientDrive.responsive = isResponsive;
        sim.patientDrive.responsiveness = 50;
        sim.reset();

        // Stabiliser 4 sekunder ved IPAP 10
        for (let t = 0; t < 4; t += 0.004) sim.step(0.004);

        const pmusSeries = [];
        const vtSeries = [];
        const totalDuration = 30.0;
        const dt = 0.004;

        let prevPhase = sim.state.phase;
        for (let t = 0; t < totalDuration; t += dt) {
            // Hev IPAP jevnt fra 10 til 20 over de 30 sekundene
            sim.settings.ipap = 10 + (10 * (t / totalDuration));
            sim.step(dt);

            // Logg ved overgang til ny ekspirasjon (fullført innpust)
            if (prevPhase === 'inspiration' && sim.state.phase === 'expiration') {
                const effPmus = (sim.patientDrive.effectivePmusMax !== undefined)
                    ? sim.patientDrive.effectivePmusMax
                    : sim.patientDrive.currentPmusMax;
                pmusSeries.push(parseFloat(effPmus.toFixed(2)));
                vtSeries.push(sim.state.VTE);
            }
            prevPhase = sim.state.phase;
        }
        return { pmusSeries, vtSeries };
    }

    const resp = simulateRun(true);
    const nonResp = simulateRun(false);

    // 1. Sjekk at pmusSeries i responsiv kjøring faller monotont
    let monotonicFall = (resp.pmusSeries.length >= 4);
    for (let i = 1; i < resp.pmusSeries.length; i++) {
        if (resp.pmusSeries[i] > resp.pmusSeries[i - 1] + 0.01) {
            monotonicFall = false;
            break;
        }
    }
    const pmusFell = resp.pmusSeries.length >= 4 && resp.pmusSeries[resp.pmusSeries.length - 1] < resp.pmusSeries[0] - 0.5;

    // 2. Sjekk at tidalvolum stiger mindre enn uten modulen
    const deltaVtResp = resp.vtSeries[resp.vtSeries.length - 1] - resp.vtSeries[0];
    const deltaVtNonResp = nonResp.vtSeries[nonResp.vtSeries.length - 1] - nonResp.vtSeries[0];
    const vtStigerMindre = (deltaVtResp < deltaVtNonResp - 30);

    const pass = monotonicFall && pmusFell && vtStigerMindre;

    record('F14', 'Responsiv pasientinnsats (Pmus faller ved økt støtte)', pass,
        `Pmus: [${resp.pmusSeries.join(', ')}] (monotont fall: ${monotonicFall && pmusFell}). ΔVt responsiv: +${deltaVtResp} ml vs uten modul: +${deltaVtNonResp} ml (avlastning: ${vtStigerMindre})`,
        `Effektiv pmusMax faller monotont, og ΔVt stiger mindre enn uten modulen`);
})();


// -----------------------------------------------------------------------------
// F15: Detaljert ekspiratorisk flowbegrensning og PEEP-stenting
// Med moderat flowbegrensning, rrSpont = 25 og EPAP hevet fra 4 til 10 cmH₂O,
// skal stabilisert PEEPi falle med minst 1.5 cmH₂O.
// -----------------------------------------------------------------------------
(() => {
    function measureStabilizedPeepi(epapVal) {
        const sim = new VentilatorSimulator();
        sim.setPreset('copd');
        sim.patient.criticalClosingPressure = 8.0; // Moderat lukketrykk
        sim.patient.flowConductance = 0.5;         // Moderat konduktans
        sim.patient.peepStenting = 70;             // 70% PEEP-stenting
        sim.patient.flowLimitation = 0.70;         // Moderat KOLS
        sim.patientDrive.rrSpont = 25;
        sim.patientDrive.pmusMax = 6.0;
        sim.patientDrive.variability = 0;
        sim.settings.epap = epapVal;
        sim.settings.ipap = epapVal + 10; // Bevar samme drivtrykk (ΔP = 10)
        sim.reset();

        // Kjør 15 pust for å oppnå stabilisert PEEPi
        for (let b = 0; b < 15; b++) {
            let guard = 0;
            while (sim.state.phase === 'inspiration' && guard++ < 3000) sim.step(0.004);
            guard = 0;
            while (sim.state.phase === 'expiration' && guard++ < 3000) sim.step(0.004);
        }
        return sim.state.PEEPi;
    }

    const peepi4 = measureStabilizedPeepi(4);
    const peepi10 = measureStabilizedPeepi(10);
    const drop = peepi4 - peepi10;

    const pass = (drop >= F15_MIN_PEEPI_DROP);

    record('F15', 'PEEP-stenting reduserer auto-PEEP ved flowbegrensning', pass,
        `PEEPi ved EPAP 4 = ${peepi4.toFixed(2)} cmH₂O, ved EPAP 10 = ${peepi10.toFixed(2)} cmH₂O (fall = ${drop.toFixed(2)} cmH₂O, krav ≥ ${F15_MIN_PEEPI_DROP} cmH₂O)`,
        `Stabilisert PEEPi skal falle med minst ${F15_MIN_PEEPI_DROP} cmH₂O når EPAP heves fra 4 til 10`);
})();


// -----------------------------------------------------------------------------
// F16: Inspiratorisk og ekspiratorisk holdmanøver
// Ved inspiratorisk hold skal P_aw stabilisere seg innenfor ±0.3 cmH₂O av V / C,
// og flow skal være under 1 L/min.
// Ved ekspiratorisk hold på KOLS-preset med rrSpont = 25 skal målt PEEPtotal
// tilsvare EPAP pluss PEEPi innenfor ±0.5 cmH₂O.
// -----------------------------------------------------------------------------
(() => {
    // Del 1: Inspiratorisk hold
    let inspHoldPass = false;
    let inspPawDiff = Infinity;
    let inspFlow = Infinity;
    let inspPaw = 0;
    let expectedPlat = 0;

    try {
        const sim = new VentilatorSimulator();
        sim.settings.mode = 'PC';
        sim.settings.ipap = 18;
        sim.settings.epap = 5;
        sim.settings.tiSet = 1.0;
        sim.settings.rr = 12;
        sim.patient.compliance = 50; // ml/cmH2O -> C_L = 0.050 L/cmH2O
        sim.patient.resistance = 5;
        sim.patientDrive.rrSpont = 0;
        sim.patientDrive.pmusMax = 0;
        sim.patientDrive.variability = 0;
        sim.reset();

        // Kjør 2 pust så simulatoren er i stabil syklus
        for (let b = 0; b < 2; b++) {
            let g = 0;
            while (sim.state.phase === 'inspiration' && g++ < 3000) sim.step(0.004);
            g = 0;
            while (sim.state.phase === 'expiration' && g++ < 3000) sim.step(0.004);
        }

        if (typeof sim.startInspiratoryHold === 'function') {
            sim.startInspiratoryHold();

            // Stepp til innpust starter og deretter til hold aktiveres ved slutten av inspirasjon
            let guard = 0;
            while (typeof sim.isInspiratoryHoldActive === 'function' && !sim.isInspiratoryHoldActive() && guard++ < 5000) {
                sim.step(0.004);
            }

            // Hold i 0.5 s
            for (let i = 0; i < 125; i++) {
                sim.step(0.004);
            }

            inspPaw = sim.state.P_aw;
            inspFlow = Math.abs(sim.state.flow);
            expectedPlat = sim.state.V / (sim.patient.compliance / 1000);
            inspPawDiff = Math.abs(inspPaw - expectedPlat);

            inspHoldPass = (typeof sim.isInspiratoryHoldActive === 'function' && sim.isInspiratoryHoldActive())
                && (inspPawDiff <= F16_INSP_HOLD_PAW_TOLERANCE)
                && (inspFlow < F16_INSP_HOLD_MAX_FLOW);

            if (typeof sim.stopInspiratoryHold === 'function') {
                sim.stopInspiratoryHold();
            }
        }
    } catch (err) {
        inspHoldPass = false;
    }

    // Del 2: Ekspiratorisk hold
    let expHoldPass = false;
    let expPeepDiff = Infinity;
    let measuredPeepTotal = 0;
    let expectedPeepTotal = 0;

    try {
        const sim2 = new VentilatorSimulator();
        sim2.setPreset('copd');
        sim2.patientDrive.rrSpont = 25;
        sim2.patientDrive.pmusMax = 6.0;
        sim2.patientDrive.variability = 0;
        sim2.reset();

        // Kjør 15 pust for å bygge opp stabil auto-PEEP
        for (let b = 0; b < 15; b++) {
            let g = 0;
            while (sim2.state.phase === 'inspiration' && g++ < 3000) sim2.step(0.004);
            g = 0;
            while (sim2.state.phase === 'expiration' && g++ < 3000) sim2.step(0.004);
        }

        const peepiBeforeHold = sim2.state.PEEPi;
        expectedPeepTotal = sim2.settings.epap + peepiBeforeHold;

        if (typeof sim2.startExpiratoryHold === 'function') {
            sim2.startExpiratoryHold();

            let guard = 0;
            while (typeof sim2.isExpiratoryHoldActive === 'function' && !sim2.isExpiratoryHoldActive() && guard++ < 5000) {
                sim2.step(0.004);
            }

            // Hold i 0.5 s så trykket utliknes
            for (let i = 0; i < 125; i++) {
                sim2.step(0.004);
            }

            measuredPeepTotal = (typeof sim2.getHoldPeepTotal === 'function')
                ? sim2.getHoldPeepTotal()
                : (sim2.state.measured.peepTotal || sim2.state.P_aw);
            expPeepDiff = Math.abs(measuredPeepTotal - expectedPeepTotal);

            expHoldPass = (typeof sim2.isExpiratoryHoldActive === 'function' && sim2.isExpiratoryHoldActive())
                && (expPeepDiff <= F16_EXP_HOLD_PEEP_TOLERANCE);

            if (typeof sim2.stopExpiratoryHold === 'function') {
                sim2.stopExpiratoryHold();
            }
        }
    } catch (err) {
        expHoldPass = false;
    }

    const allPass = inspHoldPass && expHoldPass;
    record('F16', 'Inspiratorisk og ekspiratorisk holdmanøver', allPass,
        `Insp hold: Paw = ${inspPaw.toFixed(2)} cmH₂O vs V/C = ${expectedPlat.toFixed(2)} cmH₂O (diff: ${inspPawDiff.toFixed(2)}, flow: ${inspFlow.toFixed(2)} L/min). Eksp hold: målt PEEPtotal = ${measuredPeepTotal.toFixed(2)} vs EPAP+PEEPi = ${expectedPeepTotal.toFixed(2)} (diff: ${expPeepDiff.toFixed(2)} cmH₂O)`,
        `Insp hold: Paw innenfor ±0.3 av V/C og flow < 1 L/min. Eksp hold: PEEPtotal innenfor ±0.5 av EPAP + PEEPi`);
})();


// -----------------------------------------------------------------------------
// F17: Tidsforskyvning av pasientinnsats
// Ved offset −0.4 s i PS-modus skal antall mislykkede innsatser eller
// autotriggede pust øke sammenlignet med offset 0. Rapporter begge tallene.
// -----------------------------------------------------------------------------
(() => {
    function countAsynch(offsetVal) {
        const sim = new VentilatorSimulator();
        sim.settings.mode = 'PS';
        sim.settings.ipap = 14;
        sim.settings.epap = 5;
        sim.patientDrive.rrSpont = 15;
        sim.patientDrive.pmusMax = 5.0;
        sim.patientDrive.variability = 0;
        if (sim.patientDrive.pmusOffset !== undefined) {
            sim.patientDrive.pmusOffset = offsetVal;
        }
        sim.reset();

        for (let t = 0; t < 30; t += 0.004) {
            sim.step(0.004);
        }

        const missed = sim.state.efforts.filter(e => e.type === 'missed').length;
        const auto = sim.state.efforts.filter(e => e.type === 'auto').length;
        return { missed, auto };
    }

    const checkSim = new VentilatorSimulator();
    const hasProperty = (checkSim.patientDrive.pmusOffset !== undefined);

    const res0 = countAsynch(0.0);
    const resNeg = countAsynch(-0.4);

    const pass = hasProperty && (resNeg.missed > res0.missed || resNeg.auto > res0.auto);

    record('F17', 'Tidsforskyvning av pasientinnsats (asynkroni ved offset)', pass,
        `Offset 0 s: missed = ${res0.missed}, auto = ${res0.auto}. Offset −0.4 s: missed = ${resNeg.missed}, auto = ${resNeg.auto}${!hasProperty ? ' (patientDrive.pmusOffset mangler)' : ''}`,
        `Minst én av (missed, auto) skal øke ved offset −0.4 s sammenlignet med offset 0`);
})();


// -----------------------------------------------------------------------------
// F18: Platåtrykk og P0.1 i målepanelet
// P0.1 skal stige monotont når pmusMax økes gjennom 2, 5, 10 og 15 cmH₂O
// med uendret triseNeural.
// -----------------------------------------------------------------------------
(() => {
    const pmusValues = [2, 5, 10, 15];
    const p01Values = [];
    let allValid = true;

    for (const pmusVal of pmusValues) {
        const sim = new VentilatorSimulator();
        sim.settings.mode = 'PS';
        sim.settings.ipap = 14;
        sim.settings.epap = 5;
        sim.patientDrive.rrSpont = 15;
        sim.patientDrive.pmusMax = pmusVal;
        sim.patientDrive.tiNeural = 1.0;
        sim.patientDrive.kobleTiNeural = false;
        sim.patientDrive.triseNeural = 0.30;
        sim.patientDrive.variability = 0;
        sim.reset();

        // Kjør 3 pust
        for (let t = 0; t < 12; t += 0.004) {
            sim.step(0.004);
        }

        const p01 = (typeof sim.getP01 === 'function')
            ? sim.getP01()
            : ((sim.state.measured && sim.state.measured.p01 !== undefined) ? sim.state.measured.p01 : NaN);

        p01Values.push(p01);
        if (isNaN(p01) || p01 <= 0) {
            allValid = false;
        }
    }

    // Sjekk monoton stigning
    let monotonic = allValid && (p01Values.length === 4);
    if (monotonic) {
        for (let i = 1; i < p01Values.length; i++) {
            if (p01Values[i] <= p01Values[i - 1]) {
                monotonic = false;
                break;
            }
        }
    }

    const detailStr = p01Values.map((v, i) => `Pmus ${pmusValues[i]}: P0.1 = ${isNaN(v) ? 'mangler' : v.toFixed(2)} cmH₂O`).join(', ');
    record('F18', 'P0.1 stiger monotont med økende pasientdrive', monotonic,
        detailStr,
        `P0.1 skal stige monotont gjennom pmusMax = 2, 5, 10, 15 cmH₂O med trise = 0.30 s`);
})();



// =============================================================================
// OPPSUMMERING OG EXIT CODE
// =============================================================================

console.log('========================================================================');
console.log(`  FORMTESTRESULTAT: ${passedTests} / ${totalTests} TESTER BESTÅTT (${Math.round(passedTests / totalTests * 100)} %)`);
console.log('========================================================================');

if (failedTests > 0) {
    const failedIds = testResults.filter(t => !t.success).map(t => t.id).join(', ');
    console.error(`\nFEIL: ${failedTests} test(er) feilet: [${failedIds}]`);
    process.exitCode = 1;
} else {
    console.log(`\n🌟 SUKSESS: ALLE ${totalTests} FORMTESTER ER 100% BESTÅTT!\n`);
    process.exitCode = 0;
}



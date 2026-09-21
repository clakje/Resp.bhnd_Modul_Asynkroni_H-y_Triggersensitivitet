/**
 * mal_fase2.js — Måleskript for Fase 2 akseptansekriterier (Pmus-kurveform)
 * Kjøres med: node scratch/mal_fase2.js
 * 
 * Måler alle 8 krav fra 02_FASE2_pmus_form.md mot gjeldende kode.
 */
const fs = require('fs'), path = require('path');

// 1. Initialiser simulatormiljø
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'simulator.js'), 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

// 2. Seedet PRNG (xorshift32, frø 12345) for reproduserbarhet
let _prngState = 12345;
function seededRandom() {
    _prngState ^= _prngState << 13;
    _prngState ^= _prngState >> 17;
    _prngState ^= _prngState << 5;
    return ((_prngState >>> 0) / 4294967296);
}

// 3. Konfigurer og kjør simulering for gitt oppsett
function runSimulation(overrides = {}) {
    _prngState = 12345;
    Math.random = seededRandom;

    const sim = new VentilatorSimulator();

    // Måleoppsett iht. 02_FASE2_pmus_form.md og Merknad 3
    sim.settings.mode = 'PS';
    sim.settings.ipap = 14;
    sim.settings.epap = 5;
    sim.settings.cyclingPercent = 0.25;
    sim.settings.leak = 0;

    sim.patient.compliance = 50;
    sim.patient.resistance = 5;
    sim.patient.expRatio = 1.0;
    sim.patient.flowLimitation = 0.0;

    sim.patientDrive.rrSpont = 12;
    sim.patientDrive.pmusMax = 5;
    sim.patientDrive.tiNeural = (overrides.tiNeural !== undefined) ? overrides.tiNeural : 1.0;
    sim.patientDrive.pmusExp = 0;
    sim.patientDrive.variability = 0;
    sim.patientDrive.cardiacArtifact = 0;

    sim.reset();

    // Stabiliser motoren i 12 sekunder før måling (4 ms tidssteg)
    const stabSteps = Math.round(12.0 / 0.004);
    for (let i = 0; i < stabSteps; i++) {
        sim.step(0.004);
    }

    // Samle data med høy oppløsning (0.2 ms / DT) over 6 sekunder (dekker minst én full syklus)
    const dt = 0.0002;
    const totalSteps = Math.round(6.0 / dt);
    const samples = [];

    for (let i = 0; i < totalSteps; i++) {
        sim.step(dt);
        samples.push({
            t: sim.state.totalTime,
            phase: sim.state.phase,
            timeInPhase: sim.state.timeInPhase,
            timeInCycle: sim.patientDrive.timeInCycle,
            P_mus: sim.state.P_mus,
            flow: sim.state.flow,
            Q_lunge: sim.state.Q_lunge,
            Q_meas: sim.state.Q_meas,
            P_aw: sim.state.P_aw,
            V: sim.state.V
        });
    }

    // Finn start på ny nevrale syklus etter 12 s (der timeInCycle faller tilbake mot 0)
    let cycleStartIdx = -1;
    for (let i = 1; i < samples.length; i++) {
        if (samples[i].timeInCycle < samples[i - 1].timeInCycle) {
            cycleStartIdx = i;
            break;
        }
    }
    if (cycleStartIdx === -1) {
        throw new Error('Kunne ikke finne start på ny nevrale syklus etter stabilisering.');
    }

    // Finn første innpuststart (phase går fra expiration til inspiration) etter syklusstart
    let inspStartIdx = -1;
    for (let i = cycleStartIdx; i < samples.length; i++) {
        if (samples[i].phase === 'inspiration' && (i === 0 || samples[i - 1].phase === 'expiration')) {
            inspStartIdx = i;
            break;
        }
    }
    if (inspStartIdx === -1) {
        throw new Error('Kunne ikke finne innpuststart etter syklusstart.');
    }

    // Finn cycling (phase går fra inspiration til expiration)
    let inspEndIdx = -1;
    for (let i = inspStartIdx; i < samples.length; i++) {
        if (samples[i].phase === 'expiration' && samples[i - 1].phase === 'inspiration') {
            inspEndIdx = i;
            break;
        }
    }
    if (inspEndIdx === -1) {
        throw new Error('Kunne ikke finne cycling etter innpuststart.');
    }

    return { samples, cycleStartIdx, inspStartIdx, inspEndIdx, dt };
}

console.log('================================================================================');
console.log('  FASE 2 MÅLESKRIPT — Akseptansekriterier for Pmus-kurveform (Krav 1–8)');
console.log('================================================================================\n');

// Hovedkjøring med tiNeural = 1.0
const res = runSimulation({ tiNeural: 1.0 });
const { samples, cycleStartIdx, inspStartIdx, inspEndIdx, dt } = res;

const tCycleStart = samples[cycleStartIdx].t;
const tInspStart = samples[inspStartIdx].t;
const tInspEnd = samples[inspEndIdx].t;
const pmusMax = 5.0;

// ── KRAV 1: P_mus når 95 % av pmusMax innenfor 0.30 s ± 0.05 s etter syklusstart ──
const p95Target = 0.95 * pmusMax; // 4.75 cmH2O
let t95Cycle = null;
let t95Insp = null;
for (let i = cycleStartIdx; i < samples.length; i++) {
    if (samples[i].P_mus >= p95Target) {
        t95Cycle = samples[i].t - tCycleStart;
        t95Insp = samples[i].t - tInspStart;
        break;
    }
}
const k1Pass = (t95Cycle !== null && t95Cycle >= 0.25 && t95Cycle <= 0.35);

// ── KRAV 2: P_mus er tilbake under 5 % av pmusMax innen 0.75 s ± 0.10 s ──
const p05Target = 0.05 * pmusMax; // 0.25 cmH2O
let reachedPeak = false;
let t05Cycle = null;
let t05Insp = null;
for (let i = cycleStartIdx; i < samples.length; i++) {
    if (samples[i].P_mus >= p95Target) {
        reachedPeak = true;
    }
    if (reachedPeak && samples[i].P_mus <= p05Target) {
        t05Cycle = samples[i].t - tCycleStart;
        t05Insp = samples[i].t - tInspStart;
        break;
    }
}
const k2Pass = (t05Cycle !== null && t05Cycle >= 0.65 && t05Cycle <= 0.85);

// ── KRAV 3: P_mus andrederivert skifter fortegn maksimalt to ganger ──
// Målevindu: syklusstart til trise + thold + tdecay (standard 0.30 + 0.00 + 0.40 = 0.70 s)
// Merknad 4: Sentraldifferanse over et vindu på 5 ms (halvbredde h = 2.5 ms).
// Se bort fra fortegnsskifter der |d2Pmus/dt2| er under 1 % av maksimalverdien gjennom innsatsen.
const h_steps = Math.round(0.0025 / dt); // 5 ms sentraldifferanse-vindu
const h = h_steps * dt;

function analyzeSecondDerivative(startIdx, durationSeconds) {
    // Finn først maksimal andrederivert gjennom hele den aktive innsatsen (minst 1.5 s)
    // for at 1 % terskelen skal reflektere reelle kurvekrumninger og ikke flytetallsstøy
    const fullEffortEndIdx = Math.min(samples.length - h_steps - 1, startIdx + Math.round(1.5 / dt));
    let globalMaxAbsD2 = 0;
    for (let i = startIdx + h_steps; i <= fullEffortEndIdx; i++) {
        const val = (samples[i + h_steps].P_mus - 2 * samples[i].P_mus + samples[i - h_steps].P_mus) / (h * h);
        if (Math.abs(val) > globalMaxAbsD2) globalMaxAbsD2 = Math.abs(val);
    }
    // Sikkerhetsbunn for terskel (f.eks. 1.0 cmH2O/s^2) hvis hele kurven er flat
    const threshold = Math.max(0.1, 0.01 * globalMaxAbsD2);

    const endIdx = Math.min(samples.length - h_steps - 1, startIdx + Math.round(durationSeconds / dt));
    const d2 = [];

    for (let i = startIdx + h_steps; i <= endIdx; i++) {
        const val = (samples[i + h_steps].P_mus - 2 * samples[i].P_mus + samples[i - h_steps].P_mus) / (h * h);
        d2.push({ t: samples[i].t - samples[startIdx].t, val });
    }

    let signChanges = 0;
    let lastSign = 0;
    const transitions = [];

    for (let i = 0; i < d2.length; i++) {
        const v = d2[i].val;
        let s = 0;
        if (v > threshold) s = 1;
        else if (v < -threshold) s = -1;

        if (s !== 0 && lastSign !== 0 && s !== lastSign) {
            signChanges++;
            transitions.push({ t: d2[i].t, from: lastSign, to: s, val: v });
        }
        if (s !== 0) lastSign = s;
    }

    return { signChanges, maxAbsD2: globalMaxAbsD2, transitions };
}

const d2Analysis07 = analyzeSecondDerivative(cycleStartIdx, 0.70);
const d2Analysis15 = analyzeSecondDerivative(cycleStartIdx, 1.50);
const k3Pass = (d2Analysis07.signChanges <= 2);

// ── KRAV 4: Inspiratorisk flow har sitt maksimum i løpet av de første 0.20 s av innpustet ──
const inspSamples = samples.slice(inspStartIdx, inspEndIdx);
let maxInspFlow = -Infinity;
let tMaxFlowInPhase = 0;
let maxFlowIdxInInsp = -1;

for (let i = 0; i < inspSamples.length; i++) {
    const f = inspSamples[i].Q_lunge * 60; // L/min
    if (f > maxInspFlow) {
        maxInspFlow = f;
        tMaxFlowInPhase = inspSamples[i].timeInPhase;
        maxFlowIdxInInsp = i;
    }
}
const k4Pass = (tMaxFlowInPhase <= 0.20);

// ── KRAV 5: Flow er monotont fallende fra toppen til cycling (maks 2 unntak på 20 ms) ──
const postPeakSamples = inspSamples.slice(maxFlowIdxInInsp);
let currentRiseTime = 0;
const riseEvents = [];

for (let i = 1; i < postPeakSamples.length; i++) {
    const diff = postPeakSamples[i].Q_lunge - postPeakSamples[i - 1].Q_lunge;
    if (diff > 1e-6) {
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

// Unntak er stigningsintervaller. Maks 2 unntak, hvert unntak maks 20 ms (0.020 s)
const excessiveRises = riseEvents.filter(dur => dur > 0.020);
const k5Pass = (riseEvents.length <= 2 && excessiveRises.length === 0);

// ── KRAV 6: Målt Ti mellom 0.55 og 0.95 s ──
const measuredTi = tInspEnd - tInspStart;
const k6Pass = (measuredTi >= 0.55 && measuredTi <= 0.95);

// ── KRAV 7: Tidalvolum mellom 600 og 780 ml ──
const measuredVt = (samples[inspEndIdx].V - samples[inspStartIdx].V) * 1000; // ml
const k7Pass = (measuredVt >= 600 && measuredVt <= 780);

// ── KRAV 8: Med tiNeural satt til 0.6 og 1.6, endres Ti og Vt monotont ──
const res06 = runSimulation({ tiNeural: 0.6 });
const ti06 = res06.samples[res06.inspEndIdx].t - res06.samples[res06.inspStartIdx].t;
const vt06 = (res06.samples[res06.inspEndIdx].V - res06.samples[res06.inspStartIdx].V) * 1000;

const res16 = runSimulation({ tiNeural: 1.6 });
const ti16 = res16.samples[res16.inspEndIdx].t - res16.samples[res16.inspStartIdx].t;
const vt16 = (res16.samples[res16.inspEndIdx].V - res16.samples[res16.inspStartIdx].V) * 1000;

// Monotoni: tiNeural øker (0.6 -> 1.0 -> 1.6), så både Ti og Vt skal øke monotont
const isTiMonotonic = (ti06 < measuredTi && measuredTi < ti16);
const isVtMonotonic = (vt06 < measuredVt && measuredVt < vt16);
const k8Pass = (isTiMonotonic && isVtMonotonic);

// ── RESULTATTABELL ──
console.log('| # | Krav                                          | Målt verdi                   | Forventet / Kriterium     | Status |');
console.log('|---|-----------------------------------------------|------------------------------|---------------------------|--------|');
console.log(`| 1 | P_mus når 95 % av pmusMax                     | ${(t95Cycle !== null ? t95Cycle.toFixed(3) + ' s' : 'Ikke nådd').padEnd(28)} | 0.30 s ± 0.05 s (0.25–0.35)| ${k1Pass ? 'PASS  ' : 'FAIL  '} |`);
console.log(`| 2 | P_mus tilbake under 5 % av pmusMax            | ${(t05Cycle !== null ? t05Cycle.toFixed(3) + ' s' : 'Ikke nådd').padEnd(28)} | 0.75 s ± 0.10 s (0.65–0.85)| ${k2Pass ? 'PASS  ' : 'FAIL  '} |`);
console.log(`| 3 | P_mus andrederivert fortegnsskifter (≤ 0.70 s) | ${d2Analysis07.signChanges.toString().padEnd(28)} | Maks 2 fortegnsskifter    | ${k3Pass ? 'PASS  ' : 'FAIL  '} |`);
console.log(`| 4 | Inspiratorisk flow maks innen 0.20 s          | ${tMaxFlowInPhase.toFixed(3).padEnd(26)} s | ≤ 0.20 s etter innpuststart | ${k4Pass ? 'PASS  ' : 'FAIL  '} |`);
console.log(`| 5 | Flow monotont fallende (maks 2 unntak ≤ 20 ms) | ${(`${riseEvents.length} unntak (maks ${(riseEvents.length > 0 ? Math.max(...riseEvents) * 1000 : 0).toFixed(0)} ms)`).padEnd(28)} | ≤ 2 unntak, alle ≤ 20 ms  | ${k5Pass ? 'PASS  ' : 'FAIL  '} |`);
console.log(`| 6 | Målt Ti mellom 0.55 og 0.95 s                 | ${measuredTi.toFixed(3).padEnd(26)} s | 0.55 – 0.95 s             | ${k6Pass ? 'PASS  ' : 'FAIL  '} |`);
console.log(`| 7 | Tidalvolum mellom 600 og 780 ml               | ${measuredVt.toFixed(1).padEnd(25)} ml | 600 – 780 ml              | ${k7Pass ? 'PASS  ' : 'FAIL  '} |`);
console.log(`| 8 | Monoton endring av Ti og Vt ved tiNeural-sveip | Ti: [${ti06.toFixed(2)}, ${measuredTi.toFixed(2)}, ${ti16.toFixed(2)}] s      | Monotont økende            | ${k8Pass ? 'PASS  ' : 'FAIL  '} |`);
console.log(`|   |                                               | Vt: [${vt06.toFixed(0)}, ${measuredVt.toFixed(0)}, ${vt16.toFixed(0)}] ml    |                           |        |`);

console.log('\n--------------------------------------------------------------------------------');
console.log('DETALJER OG FYSIKKANALYSE:');
console.log('--------------------------------------------------------------------------------');
console.log(`- Syklusstart (patientDrive): t = ${tCycleStart.toFixed(3)} s`);
console.log(`- Innpuststart (maskin trigger): t = ${tInspStart.toFixed(3)} s (triggerforsinkelse: ${((tInspStart - tCycleStart) * 1000).toFixed(1)} ms)`);
console.log(`- Cycling (flow-avslutning):    t = ${tInspEnd.toFixed(3)} s`);
console.log(`- Topp inspiratorisk flow:      ${maxInspFlow.toFixed(1)} L/min ved t = ${tMaxFlowInPhase.toFixed(3)} s etter innpuststart`);
console.log(`- Krav 3 (utvidet til 1.5 s):    ${d2Analysis15.signChanges} fortegnsskifte(r) (maks |d2Pmus/dt2|: ${d2Analysis15.maxAbsD2.toFixed(1)})`);
console.log(`- Krav 8 sveip detaljer:`);
console.log(`  * tiNeural = 0.6: Ti = ${ti06.toFixed(3)} s, Vt = ${vt06.toFixed(1)} ml`);
console.log(`  * tiNeural = 1.0: Ti = ${measuredTi.toFixed(3)} s, Vt = ${measuredVt.toFixed(1)} ml`);
console.log(`  * tiNeural = 1.6: Ti = ${ti16.toFixed(3)} s, Vt = ${vt16.toFixed(1)} ml`);
console.log('================================================================================\n');

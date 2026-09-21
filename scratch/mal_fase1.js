/**
 * mal_fase1.js — Måleskript for Fase 1 akseptansekriterier
 * Kjøres med: node scratch/mal_fase1.js
 * 
 * Måler alle 8 krav mot gjeldende kode og skriver ut tabell.
 */
const fs = require('fs'), path = require('path');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'simulator.js'), 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

// Hjelpefunksjon: sett opp passiv pasient med gitte parametere
function setupPassive(sim, overrides = {}) {
    sim.settings.mode = 'PC';
    sim.settings.tiSet = overrides.tiSet !== undefined ? overrides.tiSet : 1.0;
    sim.settings.rr = 15;
    sim.settings.ipap = overrides.ipap !== undefined ? overrides.ipap : 14;
    sim.settings.epap = overrides.epap !== undefined ? overrides.epap : 5;
    sim.settings.riseTime = 0.15;
    sim.settings.leak = 0;
    sim.patient.compliance = overrides.compliance !== undefined ? overrides.compliance : 50;
    sim.patient.resistance = overrides.resistance !== undefined ? overrides.resistance : 5;
    sim.patient.expRatio = 1.0;
    sim.patient.flowLimitation = 0.0;
    sim.patientDrive.rrSpont = 0;
    sim.patientDrive.pmusMax = 0;
    sim.patientDrive.variability = 0;
    sim.patientDrive.pmusExp = 0;
    sim.reset();
}

// Kjør simulatoren i gitt antall sekunder
function runFor(sim, seconds) {
    const steps = Math.round(seconds / 0.004);
    for (let i = 0; i < steps; i++) {
        sim.step(0.004);
    }
}

console.log('========================================================================');
console.log('  FASE 1 MÅLESKRIPT — Akseptansekriterier (krav 1–8)');
console.log('========================================================================\n');

// ── Krav 1–6: Passiv pasient, IPAP 14, EPAP 5, C 50, R 5 ──

const sim = new VentilatorSimulator();
setupPassive(sim);

// La motoren stabilisere seg 12 sekunder
runFor(sim, 12);

// Samle data for én hel pustesyklus (4 s er mer enn nok: 60/15 = 4 s)
// Finn start av neste innpust
let foundInspStart = false;
let inspStartTime = 0;
const cycleData = [];
const collectSeconds = 5.0;

// Samle med høy oppløsning
for (let i = 0; i < Math.round(collectSeconds / 0.0002); i++) {
    sim.step(0.0002);
    const d = {
        t: sim.state.totalTime,
        P_aw: sim.state.P_aw,
        Q_total: sim.state.Q_total,
        Q_lunge: sim.state.Q_lunge,
        flow: sim.state.flow,
        volume_lung: sim.state.volume_lung,
        volume_meas: sim.state.volume_meas,
        phase: sim.state.phase,
        timeInPhase: sim.state.timeInPhase,
        P_servo: sim.state.P_servo,
        V: sim.state.V
    };
    cycleData.push(d);
    
    // Finn den første overgangen fra expiration til inspiration etter stabilisering
    if (!foundInspStart && d.phase === 'inspiration' && d.timeInPhase < 0.001) {
        foundInspStart = true;
        inspStartTime = d.t;
    }
}

if (!foundInspStart) {
    console.log('FEIL: Fant ikke start av innpust i de siste 5 sekunder.\n');
    process.exit(1);
}

// Filtrér data fra innpuststart
const breathData = cycleData.filter(d => d.t >= inspStartTime);

// Krav 1: Topp inspiratorisk flow
const inspData = breathData.filter(d => d.phase === 'inspiration');
const peakFlow = Math.max(...inspData.map(d => d.Q_lunge)) * 60; // L/min

// Krav 2: P_aw innenfor 14.0 ± 0.4 i hele vinduet 0.30 s til cycling
const cyclingTime = inspData.length > 0 ? inspData[inspData.length - 1].timeInPhase : 1.0;
const plateauData = inspData.filter(d => d.timeInPhase >= 0.30);
const plateauPawMin = plateauData.length > 0 ? Math.min(...plateauData.map(d => d.P_aw)) : 0;
const plateauPawMax = plateauData.length > 0 ? Math.max(...plateauData.map(d => d.P_aw)) : 0;

// Krav 3: Maksimal P_aw i innpustet
const maxPaw = Math.max(...inspData.map(d => d.P_aw));

// Krav 4: Tid til 90% av IPAP
const ipap = 14;
const epap = 5;
const target90 = epap + 0.9 * (ipap - epap); // 5 + 0.9 * 9 = 13.1
const first90 = inspData.find(d => d.P_aw >= target90);
const timeTo90 = first90 ? first90.timeInPhase : NaN;

// Krav 5: P_aw i ekspirasjon aldri over EPAP + 0.5 etter de første 0.20 s
// Regulatoren har en legitim falltransient på ca. 0.10 s (FALLTID_SERVO),
// og et vindu på 0.15 s målte selve transienten.
const expData = breathData.filter(d => d.phase === 'expiration' && d.timeInPhase > 0.20);
const expPawMax = expData.length > 0 ? Math.max(...expData.map(d => d.P_aw)) : 0;

// Krav 6: Tidalvolum ved 1.0 s (fra innpuststart)
const vtStartV = inspData.length > 0 ? inspData[0].V : 0;
const vtEndV = inspData.length > 0 ? inspData[inspData.length - 1].V : 0;
const tidalVolume = (vtEndV - vtStartV) * 1000; // ml

console.log('── Krav 1–6: Passiv pasient, PC, IPAP 14, EPAP 5, C 50, R 5 ──\n');
console.log('| # | Krav                                    | Malt verdi          | Grense                      |');
console.log('|---|----------------------------------------|--------------------|-----------------------------|');
console.log(`| 1 | Topp inspiratorisk flow                | ${peakFlow.toFixed(1)} L/min       | >= 95 L/min                  |`);
console.log(`| 2 | P_aw plata (0.30 s til cycling)        | ${plateauPawMin.toFixed(2)}–${plateauPawMax.toFixed(2)} cmH2O | 14.0 +/- 0.4 (13.6–14.4)    |`);
console.log(`| 3 | Maks P_aw i innpust                    | ${maxPaw.toFixed(2)} cmH2O       | <= 16.0 cmH2O                |`);
console.log(`| 4 | Tid til 90 % av IPAP                   | ${timeTo90.toFixed(2)} s           | 0.10–0.20 s                 |`);
console.log(`| 5 | P_aw i eksp. etter 0.20 s              | ${expPawMax.toFixed(2)} cmH2O       | <= EPAP + 0.5 = 5.5 cmH2O   |`);
console.log(`| 6 | Tidalvolum                             | ${tidalVolume.toFixed(0)} ml           | 430–470 ml                  |`);

// ── Krav 7: Tidskonstant ──
console.log('\n── Krav 7: Tidskonstant tau ──\n');

function measureTau(R, C) {
    const tauSann = (R * C) / 1000; // s
    const tiSet_test = 0.30 + 2.5 * tauSann;
    
    const s = new VentilatorSimulator();
    setupPassive(s, { resistance: R, compliance: C, tiSet: tiSet_test });
    
    // Stabiliser
    runFor(s, 12);
    
    // Samle data for neste pust
    const data = [];
    for (let i = 0; i < Math.round(8.0 / 0.0002); i++) {
        s.step(0.0002);
        data.push({
            t: s.state.totalTime,
            Q_lunge: s.state.Q_lunge,
            phase: s.state.phase,
            timeInPhase: s.state.timeInPhase
        });
    }
    
    // Finn start av innpust
    let inspStart = null;
    for (let i = 1; i < data.length; i++) {
        if (data[i].phase === 'inspiration' && data[i].timeInPhase < 0.001) {
            inspStart = i;
            break;
        }
    }
    
    if (inspStart === null) {
        return { R, C, tauSann, tauMalt: NaN, error: 'Fant ikke innpuststart' };
    }
    
    const inspStartTime = data[inspStart].t;
    
    // t1 = 0.20 + 0.5 * tau_sann etter innpuststart
    const t1_offset = 0.20 + 0.5 * tauSann;
    const t2_offset = t1_offset + tauSann;
    
    // Finn flow ved t1 og t2
    let Q1 = null, Q2 = null;
    for (const d of data) {
        const dt_from_start = d.t - inspStartTime;
        if (Q1 === null && dt_from_start >= t1_offset) {
            Q1 = d.Q_lunge;
        }
        if (Q2 === null && dt_from_start >= t2_offset) {
            Q2 = d.Q_lunge;
        }
        if (Q1 !== null && Q2 !== null) break;
    }
    
    if (Q1 === null || Q2 === null || Q1 <= 0 || Q2 <= 0) {
        return { R, C, tauSann, tauMalt: NaN, error: `Q1=${Q1}, Q2=${Q2}` };
    }
    
    const tauMalt = tauSann / Math.log(Q1 / Q2);
    const avvik = ((tauMalt - tauSann) / tauSann * 100);
    
    return { R, C, tauSann, tauMalt, avvik, Q1: Q1 * 60, Q2: Q2 * 60 };
}

const tau5 = measureTau(5, 50);
const tau10 = measureTau(10, 50);
const tau20 = measureTau(20, 50);

console.log('| R   | C  | tau_sann | tau_malt | Avvik   | Krav      |');
console.log('|-----|-----|----------|----------|---------|-----------|');
for (const t of [tau5, tau10, tau20]) {
    const avvikStr = t.tauMalt ? `${t.avvik >= 0 ? '+' : ''}${t.avvik.toFixed(1)} %` : t.error;
    const maltStr = t.tauMalt ? `${t.tauMalt.toFixed(3)} s` : 'N/A';
    const pass = t.tauMalt && Math.abs(t.avvik) <= 15 ? 'PASS' : 'FAIL';
    console.log(`| ${t.R.toString().padEnd(3)} | ${t.C}  | ${t.tauSann.toFixed(2)} s  | ${maltStr.padEnd(8)} | ${avvikStr.padEnd(7)} | +/-15 % ${pass} |`);
}

// ── Krav 8: Forholdstall ──
const ratio = tau20.tauMalt / tau5.tauMalt;
const ratioPass = Math.abs(ratio - 4.0) <= 0.6 ? 'PASS' : 'FAIL';
console.log(`\n── Krav 8: Forholdstall tau(R=20) / tau(R=5) ──\n`);
console.log(`Malt: ${ratio.toFixed(2)}  (krav: 4.0 +/- 0.6, dvs. 3.4–4.6) ${ratioPass}`);

console.log('\n========================================================================\n');

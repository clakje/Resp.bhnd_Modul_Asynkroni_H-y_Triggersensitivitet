/**
 * mal_1b4.js — Måling for steg 1b.4: P_aw-overskudd i ekspirasjon vs topp ekspiratorisk flow
 */
const fs = require('fs');
const path = require('path');

global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'simulator.js'), 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

function runMeasurement(C) {
    const sim = new VentilatorSimulator();
    sim.settings.mode = 'PC';
    sim.settings.tiSet = 1.0;
    sim.settings.rr = 15;
    sim.settings.ipap = 14;
    sim.settings.epap = 5;
    sim.settings.riseTime = 0.15;
    sim.settings.leak = 0;
    sim.patient.compliance = C;
    sim.patient.resistance = 5;
    sim.patient.expRatio = 1.0;
    sim.patient.flowLimitation = 0.0;
    sim.patientDrive.rrSpont = 0;
    sim.patientDrive.pmusMax = 0;
    sim.patientDrive.variability = 0;
    sim.patientDrive.pmusExp = 0;
    sim.reset();

    // Stabiliser i 12 s
    const dtSim = 0.004;
    for (let i = 0; i < Math.round(12 / dtSim); i++) sim.step(dtSim);

    // Samle data med 0.2 ms oppløsning for én hel syklus
    let foundInspStart = false;
    let inspStartTime = 0;
    const cycleData = [];
    const dtMeas = 0.0002;
    for (let i = 0; i < Math.round(5.0 / dtMeas); i++) {
        sim.step(dtMeas);
        const d = {
            t: sim.state.totalTime,
            P_aw: sim.state.P_aw,
            P_servo: sim.state.P_servo,
            Q_lunge: sim.state.Q_lunge,
            phase: sim.state.phase,
            timeInPhase: sim.state.timeInPhase
        };
        cycleData.push(d);
        if (!foundInspStart && d.phase === 'inspiration' && d.timeInPhase < dtMeas * 1.5) {
            foundInspStart = true;
            inspStartTime = d.t;
        }
    }

    const breathData = cycleData.filter(d => d.t >= inspStartTime);
    const expData = breathData.filter(d => d.phase === 'expiration');
    const expDataAfter150ms = expData.filter(d => d.timeInPhase > 0.15);

    // Topp ekspiratorisk flow (største negative flow mot masken, målt som positiv magnitude)
    const peakExpFlowLmin = Math.abs(Math.min(...expData.map(d => d.Q_lunge))) * 60;
    
    // Maks P_aw i ekspirasjonen etter de første 150 ms
    const maxExpPaw = Math.max(...expDataAfter150ms.map(d => d.P_aw));
    const overskudd = maxExpPaw - sim.settings.epap;

    // Sjekk om det er oscillasjoner / flere toppunkter i P_aw etter 150 ms
    let localPeaks = 0;
    for (let i = 1; i < expDataAfter150ms.length - 1; i++) {
        const prev = expDataAfter150ms[i - 1].P_aw;
        const curr = expDataAfter150ms[i].P_aw;
        const next = expDataAfter150ms[i + 1].P_aw;
        if (curr > prev && curr > next && (curr - sim.settings.epap) > 0.05) {
            localPeaks++;
        }
    }

    return {
        C,
        peakExpFlowLmin,
        maxExpPaw,
        overskudd,
        localPeaks,
        expCurveSnippet: expDataAfter150ms.filter((_, idx) => idx % 500 === 0).map(d => ({
            te: d.timeInPhase.toFixed(2),
            Paw: d.P_aw.toFixed(2),
            flow: (d.Q_lunge * 60).toFixed(1)
        }))
    };
}

console.log('========================================================================');
console.log('  1b.4 MÅLING: P_aw-overskudd vs Topp Ekspiratorisk Flow');
console.log('========================================================================\n');

const results = [30, 50, 80].map(runMeasurement);

console.log('| Compliance | Topp eksp. flow | Maks P_aw (>0.15s) | Overskudd (Paw - EPAP) | Antall topper |');
console.log('|---|---|---|---|---|');
for (const r of results) {
    console.log(`| C = ${r.C} ml/cmH2O | ${r.peakExpFlowLmin.toFixed(1)} L/min | ${r.maxExpPaw.toFixed(2)} cmH2O | +${r.overskudd.toFixed(2)} cmH2O | ${r.localPeaks} |`);
}

console.log('\nKurveforløp i ekspirasjon etter 0.15 s:');
for (const r of results) {
    console.log(`\n--- C = ${r.C} ---`);
    console.log(r.expCurveSnippet.map(s => `t_exp=${s.te}s: Paw=${s.Paw} cmH2O, Flow=${s.flow} L/min`).join(' | '));
}

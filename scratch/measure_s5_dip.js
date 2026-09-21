const fs = require('fs');
const path = require('path');

global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'simulator.js'), 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

function measureDip(riseTimeVal, pmusMaxVal) {
    const sim = new VentilatorSimulator();
    sim.settings.mode = 'PS';
    sim.settings.ipap = 16;
    sim.settings.epap = 6;
    sim.settings.riseTime = riseTimeVal;
    sim.settings.cyclingPercent = 0.25;
    sim.settings.tiMax = 2.0;
    sim.settings.leak = 0;
    sim.settings.triggerMode = 'flow';
    sim.settings.triggerFlow = 2.0;
    sim.patient.compliance = 32;
    sim.patient.resistance = 6;
    sim.patient.expRatio = 1.3;
    sim.patientDrive.rrSpont = 30;
    sim.patientDrive.pmusMax = pmusMaxVal;
    sim.patientDrive.tiNeural = 0.55;
    sim.patientDrive.pmusExp = 0; // Sett til 0 for ren måling uten for tidlig ekspirasjonsrelaksasjon
    sim.patientDrive.variability = 0;
    sim.reset();

    for (let i = 0; i < Math.round(12 / 0.004); i++) sim.step(0.004);

    while (sim.state.phase !== 'inspiration') sim.step(0.0002);

    let minPawFirst300ms = 999;
    while (sim.state.phase === 'inspiration') {
        const tip = sim.state.timeInPhase;
        if (tip <= 0.30 && sim.state.P_aw < minPawFirst300ms) {
            minPawFirst300ms = sim.state.P_aw;
        }
        sim.step(0.0002);
    }

    const dipUnderEpap = Math.max(0, sim.settings.epap - minPawFirst300ms);
    return {
        riseTime: riseTimeVal,
        pmusMax: pmusMaxVal,
        epap: sim.settings.epap,
        minPaw: minPawFirst300ms,
        dip: dipUnderEpap
    };
}

console.log('Måling av trykkdipp under EPAP i første 300 ms av innpust:\n');

const resSlow = measureDip(0.80, 10);
const resFast = measureDip(0.10, 10);

console.log(`riseTime = 0.80 s, pmus = 10: min P_aw = ${resSlow.minPaw.toFixed(2)} cmH2O -> Dipp under EPAP (${resSlow.epap}): ${resSlow.dip.toFixed(2)} cmH2O (krav: >= 1.0 cmH2O)`);
console.log(`riseTime = 0.10 s, pmus = 10: min P_aw = ${resFast.minPaw.toFixed(2)} cmH2O -> Dipp under EPAP (${resFast.epap}): ${resFast.dip.toFixed(2)} cmH2O (krav: < 0.3 cmH2O)`);

// Hva med pmus = 15 (som i slowRise-scenariet)?
const resSlow15 = measureDip(0.75, 15);
const resFast15 = measureDip(0.10, 15);
console.log(`\nMed scenariets pmus = 15:`);
console.log(`riseTime = 0.75 s, pmus = 15: min P_aw = ${resSlow15.minPaw.toFixed(2)} cmH2O -> Dipp under EPAP: ${resSlow15.dip.toFixed(2)} cmH2O`);
console.log(`riseTime = 0.10 s, pmus = 15: min P_aw = ${resFast15.minPaw.toFixed(2)} cmH2O -> Dipp under EPAP: ${resFast15.dip.toFixed(2)} cmH2O`);

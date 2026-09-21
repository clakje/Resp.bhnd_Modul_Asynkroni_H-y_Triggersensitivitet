const fs = require('fs');
global.window = {};
eval(fs.readFileSync('simulator.js', 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

const sim = new VentilatorSimulator();
sim.settings.ipap = 14;
sim.settings.epap = 5;
sim.settings.cyclingPercent = 0.05; // 5% sen cycling
sim.settings.tiMax = 2.5;
sim.settings.leak = 25; // NIV har alltid maskelekkasje
sim.patientDrive.rrSpont = 12;
sim.patientDrive.tiNeural = 0.6;
sim.patientDrive.pmusMax = 3.0;
sim.patientDrive.pmusExp = 8.0; // Kraftig aktiv utpust mot slutten av innpust
sim.patientDrive.variability = 0;
sim.reset();

const simSec = (s, sec) => {
    const steps = Math.round(sec / 0.004);
    for (let i = 0; i < steps; i++) s.step(0.004);
};
simSec(sim, 6);
while (sim.state.phase !== 'inspiration') sim.step(0.0002);

const inspSamples = [];
while (sim.state.phase === 'inspiration') {
    inspSamples.push({
        tip: sim.state.timeInPhase,
        paw: sim.state.P_aw
    });
    sim.step(0.0002);
}

const Ti = inspSamples.length > 0 ? inspSamples[inspSamples.length - 1].tip : 0;

let minPlateau = 999;
let maxLatePaw = -999;
for (const s of inspSamples) {
    if (s.tip >= 0.15 && s.tip <= 0.35 && s.paw < minPlateau) {
        minPlateau = s.paw;
    }
    if (s.tip > 0.5 * Ti && s.paw > maxLatePaw) {
        maxLatePaw = s.paw;
    }
}

const oldSpike = sim.state.lastPip - minPlateau;
const newSpike = maxLatePaw - minPlateau;

console.log(`Ti: ${Ti.toFixed(3)} s`);
console.log(`minPlateau (0.15-0.35s): ${minPlateau.toFixed(2)} cmH2O`);
console.log(`Gammel måling (lastPip): ${sim.state.lastPip.toFixed(2)} cmH2O -> spike: +${oldSpike.toFixed(2)} cmH2O`);
console.log(`Ny måling (max P_aw for tip > 0.5*Ti): ${maxLatePaw.toFixed(2)} cmH2O -> spike: +${newSpike.toFixed(2)} cmH2O`);

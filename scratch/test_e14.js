const fs = require('fs');
global.window = {};
eval(fs.readFileSync('simulator.js', 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

const sim = new VentilatorSimulator();
sim.settings.ipap = 14;
sim.settings.epap = 5;
sim.settings.cyclingPercent = 0.05;
sim.settings.tiMax = 2.5;
sim.patientDrive.rrSpont = 12;
sim.patientDrive.tiNeural = 0.6;
sim.patientDrive.pmusMax = 3.0;
sim.patientDrive.pmusExp = 8.0;
sim.patientDrive.variability = 0;
sim.reset();

for (let i = 0; i < Math.round(6 / 0.0002); i++) sim.step(0.0002);
while (sim.state.phase !== 'inspiration') sim.step(0.0002);

console.log('Insp start:');
let minPlateau = 999;
while (sim.state.phase === 'inspiration') {
    const tip = sim.state.timeInPhase;
    if (tip >= 0.15 && tip <= 0.35 && sim.state.P_aw < minPlateau) {
        minPlateau = sim.state.P_aw;
    }
    const roundedTip = Math.round(tip * 100) / 100;
    if (Math.abs(tip - roundedTip) < 0.0001 && roundedTip % 0.05 === 0) {
        console.log(`tip=${tip.toFixed(2)} P_aw=${sim.state.P_aw.toFixed(2)} P_mus=${sim.state.P_mus.toFixed(2)} Q_lunge=${(sim.state.Q_lunge*60).toFixed(1)} L/min`);
    }
    sim.step(0.0002);
}
console.log('minPlateau:', minPlateau, 'lastPip:', sim.state.lastPip, 'spike:', sim.state.lastPip - minPlateau);

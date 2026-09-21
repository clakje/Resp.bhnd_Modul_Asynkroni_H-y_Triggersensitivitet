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

for (let i = 0; i < 60000; i++) {
    sim.step(0.0002);
    if (sim.state.timeInPhase < 0.0003) {
        console.log(`t=${sim.state.totalTime.toFixed(4)} ${sim.state.phase} reason=${sim.state.lastCycleReason} lastPip=${sim.state.lastPip.toFixed(2)} tn=${sim.patientDrive.timeInCycle.toFixed(4)} Pmus=${sim.patientDrive.P_mus.toFixed(2)} Paw=${sim.state.P_aw.toFixed(2)}`);
    }
}

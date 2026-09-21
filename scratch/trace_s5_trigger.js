const fs = require('fs');
const path = require('path');

global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'simulator.js'), 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

const sim = new VentilatorSimulator();
sim.settings.mode = 'PS';
sim.settings.ipap = 16;
sim.settings.epap = 6;
sim.settings.riseTime = 0.80;
sim.settings.cyclingPercent = 0.25;
sim.settings.tiMax = 2.0;
sim.settings.leak = 0;
sim.settings.triggerMode = 'flow';
sim.settings.triggerFlow = 2.0;
sim.patient.compliance = 32;
sim.patient.resistance = 6;
sim.patient.expRatio = 1.3;
sim.patientDrive.rrSpont = 30;
sim.patientDrive.pmusMax = 10;
sim.patientDrive.tiNeural = 0.55;
sim.patientDrive.pmusExp = 0;
sim.patientDrive.variability = 0;
sim.reset();

for (let i = 0; i < Math.round(12 / 0.004); i++) sim.step(0.004);

// Finn start av neste nevrale syklus
while (sim.patientDrive.timeInCycle > 0.001) sim.step(0.0002);

console.log('Nevral syklus startet ved t = ' + sim.state.totalTime.toFixed(4));
for (let i = 0; i < 3000; i++) {
    sim.step(0.0002);
    const tn = sim.patientDrive.timeInCycle;
    if (i % 50 === 0) { // every 10 ms
        console.log(`tn=${tn.toFixed(3)}s phase=${sim.state.phase} tip=${sim.state.timeInPhase.toFixed(3)} Paw=${sim.state.P_aw.toFixed(2)} Pservo=${sim.state.P_servo.toFixed(2)} Pmus=${sim.patientDrive.P_mus.toFixed(2)} flow=${(sim.state.flow_lung*60).toFixed(1)}`);
    }
}

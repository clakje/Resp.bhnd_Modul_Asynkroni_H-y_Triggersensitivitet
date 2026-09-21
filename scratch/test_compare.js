const fs = require('fs');
let code = fs.readFileSync('simulator.js', 'utf8').replace(/\r\n/g, '\n');

function runE14WithCode(codeStr, label) {
    global.window = {};
    eval(codeStr);
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

    const simSec = (s, sec) => {
        const steps = Math.round(sec / 0.004);
        for (let i = 0; i < steps; i++) s.step(0.004);
    };
    simSec(sim, 6);
    while (sim.state.phase !== 'inspiration') sim.step(0.0002);

    let minPlateau = 999;
    while (sim.state.phase === 'inspiration') {
        const tip = sim.state.timeInPhase;
        if (tip >= 0.15 && tip <= 0.35 && sim.state.P_aw < minPlateau) {
            minPlateau = sim.state.P_aw;
        }
        sim.step(0.0002);
    }
    const spike = sim.state.lastPip - minPlateau;
    console.log(label, 'minPlateau:', minPlateau.toFixed(2), 'lastPip:', sim.state.lastPip.toFixed(2), 'spike:', spike.toFixed(2));
}

// Current code (1b.2 + 1b.3)
runE14WithCode(code, 'With 1b.3:');

// Code with old omega:
const oldServo = `        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        const omega = 4.0 / Math.max(GRENSER.MIN_RISETIME, this.settings.riseTime);        // rad/s
        let zeta  = clamp(0.35 + 0.70 * (this.settings.riseTime - 0.05) / 0.85, 0.35, 1.05);
        // Asymmetrisk demping: ved trykkfall (overgang til EPAP) settes zeta til
        // minst 1.0 for å unngå bump over EPAP i utpustet.
        if (P_target < this.state.P_servo) {
            zeta = Math.max(zeta, 1.0);
        }`;

const newServo = `        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        let zeta  = clamp(0.35 + 0.70 * (this.settings.riseTime - 0.05) / 0.85, 0.35, 1.05);
        // Asymmetrisk demping: ved trykkfall (overgang til EPAP) settes zeta til
        // minst 1.0 for å unngå bump over EPAP i utpustet.
        if (P_target < this.state.P_servo) {
            zeta = Math.max(zeta, 1.0);
        }
        const omega = (1.0 + 2.8 * zeta) / Math.max(GRENSER.MIN_RISETIME, this.settings.riseTime); // rad/s`;

if (!code.includes(newServo)) {
    console.error('ERROR: newServo not found in code');
}
const codeOldOmega = code.replace(newServo, oldServo);
runE14WithCode(codeOldOmega, 'Old omega:');

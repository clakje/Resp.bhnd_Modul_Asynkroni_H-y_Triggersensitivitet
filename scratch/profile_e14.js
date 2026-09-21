const fs = require('fs');
let code = fs.readFileSync('simulator.js', 'utf8').replace(/\r\n/g, '\n');

function profileBreath(codeStr, label) {
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

    console.log(`=== ${label} ===`);
    console.log(`Start of inspiration at t=${sim.state.totalTime.toFixed(4)}, timeInCycle=${sim.patientDrive.timeInCycle.toFixed(4)}`);
    
    let stepCount = 0;
    while (sim.state.phase === 'inspiration') {
        const tip = sim.state.timeInPhase;
        if (stepCount % 250 === 0) { // every 0.05s
            console.log(`tip=${tip.toFixed(2)} P_aw=${sim.state.P_aw.toFixed(2)} P_servo=${sim.state.P_servo.toFixed(2)} P_mus=${sim.state.P_mus.toFixed(2)} Q_lunge=${(sim.state.Q_lunge*60).toFixed(1)}`);
        }
        stepCount++;
        sim.step(0.0002);
    }
    console.log(`End of inspiration at tip=${sim.state.timeInPhase.toFixed(4)}, cycleReason=${sim.state.lastCycleReason}, lastPip=${sim.state.lastPip}`);
}

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

profileBreath(code.replace(newServo, oldServo), 'OLD OMEGA');
profileBreath(code, 'NEW OMEGA');

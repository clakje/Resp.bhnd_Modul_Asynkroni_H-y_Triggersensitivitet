const fs = require('fs');
const path = require('path');

let code = fs.readFileSync(path.join(__dirname, '..', 'simulator.js'), 'utf8').replace(/\r\n/g, '\n');

// Apply 1b.2:
code = code.replace(
    'const kompensasjon = clamp(R_out_eff_prev * Math.abs(this.state.Q_total), 0, 15);',
    'const kompensasjon = clamp(R_out_eff_prev * this.state.Q_total, -15, 15);'
);

// Apply 1b.3:
const oldServo = `        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        const omega = 4.0 / Math.max(GRENSER.MIN_RISETIME, this.settings.riseTime);        // rad/s
        let zeta  = clamp(0.35 + 0.70 * (this.settings.riseTime - 0.05) / 0.85, 0.35, 1.05);
        // Asymmetrisk demping: ved trykkfall (overgang til EPAP) settes zeta til
        // minst 1.0 for å unngå bump over EPAP i utpustet.
        if (P_target < this.state.P_servo) {
            zeta = Math.max(zeta, 1.0);
        }`;

const newServo = `        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        let zeta = clamp(0.35 + 0.70 * (this.settings.riseTime - 0.05) / 0.85, 0.35, 1.05);
        // Asymmetrisk demping: ved trykkfall (overgang til EPAP) settes zeta til
        // minst 1.0 for å unngå bump over EPAP i utpustet.
        if (P_target < this.state.P_servo) {
            zeta = Math.max(zeta, 1.0);
        }
        const omega = (1.0 + 2.8 * zeta) / Math.max(GRENSER.MIN_RISETIME, this.settings.riseTime); // rad/s`;

if (!code.includes(oldServo)) {
    console.error('ERROR: oldServo not found');
    process.exit(1);
}
code = code.replace(oldServo, newServo);

global.window = {};
eval(code);
const VentilatorSimulator = global.window.VentilatorSimulator;

function measureRiseTime(riseTimeSec) {
    const sim = new VentilatorSimulator();
    sim.settings.mode = 'PC';
    sim.settings.tiSet = 1.5;
    sim.settings.rr = 10;
    sim.settings.ipap = 14;
    sim.settings.epap = 5;
    sim.settings.riseTime = riseTimeSec;
    sim.settings.leak = 0;
    sim.patient.compliance = 50;
    sim.patient.resistance = 5;
    sim.patient.expRatio = 1.0;
    sim.patient.flowLimitation = 0.0;
    sim.patientDrive.rrSpont = 0;
    sim.patientDrive.pmusMax = 0;
    sim.patientDrive.variability = 0;
    sim.patientDrive.pmusExp = 0;
    sim.reset();
    for (let i = 0; i < Math.round(12 / 0.004); i++) sim.step(0.004);
    
    let foundInspStart = false;
    let inspStartTime = 0;
    const inspData = [];
    for (let i = 0; i < Math.round(5.0 / 0.0002); i++) {
        sim.step(0.0002);
        const d = { t: sim.state.totalTime, P_aw: sim.state.P_aw, phase: sim.state.phase, timeInPhase: sim.state.timeInPhase };
        if (!foundInspStart && d.phase === 'inspiration' && d.timeInPhase < 0.001) {
            foundInspStart = true;
            inspStartTime = d.t;
        }
        if (foundInspStart && d.phase === 'inspiration') {
            inspData.push(d);
        }
    }
    const target90 = 5 + 0.9 * 9;
    const first90 = inspData.find(d => d.P_aw >= target90);
    return first90 ? first90.timeInPhase : NaN;
}

const riseTimes = [0.05, 0.15, 0.30, 0.60, 0.90];
console.log('Rise Time Table:');
for (const rt of riseTimes) {
    const t90 = measureRiseTime(rt);
    const diff = (t90 - rt) / rt * 100;
    console.log(`riseTime: ${rt.toFixed(2)} s -> t90: ${t90.toFixed(3)} s (diff: ${diff.toFixed(1)} %, pass: ${Math.abs(diff) <= 20})`);
}

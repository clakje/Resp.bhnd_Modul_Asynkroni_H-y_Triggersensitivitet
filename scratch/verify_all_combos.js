const fs = require('fs');
const path = require('path');

global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'simulator.js'), 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

function measureBreath(riseTimeSec, ipapVal = 14, epapVal = 5, cVal = 50) {
    const sim = new VentilatorSimulator();
    sim.settings.mode = 'PC';
    sim.settings.tiSet = 1.5;
    sim.settings.rr = 10;
    sim.settings.ipap = ipapVal;
    sim.settings.epap = epapVal;
    sim.settings.riseTime = riseTimeSec;
    sim.settings.leak = 0;
    sim.patient.compliance = cVal;
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
    const cycleData = [];
    for (let i = 0; i < Math.round(6.0 / 0.0002); i++) {
        sim.step(0.0002);
        const d = {
            t: sim.state.totalTime,
            P_aw: sim.state.P_aw,
            phase: sim.state.phase,
            timeInPhase: sim.state.timeInPhase
        };
        cycleData.push(d);
        if (!foundInspStart && d.phase === 'inspiration' && d.timeInPhase < 0.001) {
            foundInspStart = true;
            inspStartTime = d.t;
        }
    }

    const breathData = cycleData.filter(d => d.t >= inspStartTime);
    const inspData = breathData.filter(d => d.phase === 'inspiration');
    const expData = breathData.filter(d => d.phase === 'expiration');
    const expAfter200ms = expData.filter(d => d.timeInPhase > 0.20);

    const target90 = epapVal + 0.9 * (ipapVal - epapVal);
    const first90 = inspData.find(d => d.P_aw >= target90);
    const t90 = first90 ? first90.timeInPhase : NaN;

    const maxExpPawAfter200 = expAfter200ms.length > 0 ? Math.max(...expAfter200ms.map(d => d.P_aw)) : epapVal;

    return {
        riseTime: riseTimeSec,
        ipap: ipapVal,
        epap: epapVal,
        deltaP: ipapVal - epapVal,
        C: cVal,
        t90,
        maxExpPawAfter200,
        expOvershoot: maxExpPawAfter200 - epapVal
    };
}

console.log('========================================================================');
console.log('  1. KONTROLL AV TID TIL 90% AV IPAP (skal være uendret fra 1b.3)');
console.log('========================================================================\n');

const riseTimes = [0.05, 0.15, 0.30, 0.60, 0.90];
for (const rt of riseTimes) {
    const res = measureBreath(rt, 14, 5, 50);
    const diff = (res.t90 - rt) / rt * 100;
    console.log(`riseTime: ${rt.toFixed(2)} s -> t90: ${res.t90.toFixed(3)} s (diff: ${diff.toFixed(1)} %, pass: ${Math.abs(diff) <= 20})`);
}

console.log('\n========================================================================');
console.log('  2. KONTROLL AV EKSPIRASJONS-PAW (>0.20s) FOR FORSKJELLIGE KOMBINASJONER');
console.log('========================================================================\n');

// 9 kombinasjoner: 3 stigetider (0.05, 0.15, 0.60) x 3 drivtrykk (deltaP 6: 11/5, deltaP 9: 14/5, deltaP 15: 20/5)
const testCombos = [
    { rt: 0.05, ipap: 11, epap: 5 },
    { rt: 0.05, ipap: 14, epap: 5 },
    { rt: 0.05, ipap: 20, epap: 5 },
    { rt: 0.15, ipap: 11, epap: 5 },
    { rt: 0.15, ipap: 14, epap: 5 },
    { rt: 0.15, ipap: 20, epap: 5 },
    { rt: 0.60, ipap: 11, epap: 5 },
    { rt: 0.60, ipap: 14, epap: 5 },
    { rt: 0.60, ipap: 20, epap: 5 }
];

console.log('| riseTime | IPAP / EPAP (dP) | Maks Paw (>0.20s) | Overskudd (Paw - EPAP) | Krav (<= 0.5) |');
console.log('|---|---|---|---|---|');
for (const c of testCombos) {
    const res = measureBreath(c.rt, c.ipap, c.epap, 50);
    const pass = res.expOvershoot <= 0.50 + 1e-6;
    console.log(`| ${res.riseTime.toFixed(2)} s | ${res.ipap} / ${res.epap} (ΔP ${res.deltaP}) | ${res.maxExpPawAfter200.toFixed(2)} cmH2O | +${res.expOvershoot.toFixed(2)} cmH2O | ${pass ? 'PASS' : 'FAIL'} |`);
}

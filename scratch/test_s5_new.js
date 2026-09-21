const fs = require('fs');
const path = require('path');

// Test the updated simulator code with S5 logic
global.window = {};
eval(fs.readFileSync('scratch/test_pretrigger.js', 'utf8')); // this has evaluated the updated simulator
const VentilatorSimulator = global.window.VentilatorSimulator;

const appSrc = fs.readFileSync('app.js', 'utf8');
const start = appSrc.indexOf('const SCENARIOS = {');
const end = appSrc.indexOf('// TOAST NOTIFIKASJONER', start);
let blokk = appSrc.slice(start, end);
blokk = blokk.slice(0, blokk.lastIndexOf('};') + 2);
const SCENARIOS = eval('(' + blokk.replace('const SCENARIOS = ', '').replace(/;\s*$/, '') + ')');

function createSim(scen) {
    const sim = new VentilatorSimulator();
    sim.settings.mode = scen.mode || 'PS';
    sim.settings.ipap = scen.ipap;
    sim.settings.epap = scen.epap;
    sim.settings.rr = scen.rr !== undefined ? scen.rr : 12;
    sim.settings.fio2 = scen.fio2 !== undefined ? scen.fio2 : 30;
    sim.settings.riseTime = scen.riseTime / 1000;
    sim.settings.cyclingPercent = scen.cycling / 100;
    sim.settings.tiSet = scen.tiSet !== undefined ? scen.tiSet : 1.0;
    sim.settings.tiMax = scen.tiMax !== undefined ? scen.tiMax : 2.0;
    sim.settings.leak = scen.leak !== undefined ? scen.leak : 0;
    sim.settings.triggerMode = scen.triggerMode || 'flow';
    if (sim.settings.triggerMode === 'flow') sim.settings.triggerFlow = scen.triggerVal;
    else sim.settings.triggerPressure = scen.triggerVal;
    sim.settings.stActive = !!scen.stActive;
    sim.settings.backupRate = scen.backupRate !== undefined ? scen.backupRate : 12;
    sim.patient.compliance = scen.compliance;
    sim.patient.resistance = scen.resistance;
    sim.patient.expRatio = scen.expRatio;
    sim.patient.flowLimitation = scen.flowLimitation !== undefined ? scen.flowLimitation : 0.0;
    sim.patientDrive.rrSpont = scen.rrSpont;
    sim.patientDrive.pmusMax = scen.pmus;
    sim.patientDrive.tiNeural = scen.tiNeural;
    sim.patientDrive.pmusExp = scen.pmusExp;
    sim.patientDrive.variability = 0;
    sim.reset();
    return sim;
}

function runSimForPaw300(scen) {
    const sim = createSim(scen);
    const dt = 1 / 60;
    const pawAt300List = [];

    let wasInsp = false;
    let inspStartPaw = 0;
    let recordedThisBreath = false;

    for (let i = 0; i < 6000; i++) {
        sim.step(dt);
        const t = sim.state.totalTime;
        if (t >= 40) {
            if (sim.state.phase === 'inspiration') {
                if (sim.state.timeInPhase >= 0.30 && !recordedThisBreath) {
                    pawAt300List.push(sim.state.P_aw);
                    recordedThisBreath = true;
                }
            } else {
                recordedThisBreath = false;
            }
        }
    }

    const eff60 = sim.state.efforts.filter(e => e.t >= 40);
    const missed = eff60.filter(e => e.type === 'missed').length;
    const assist = eff60.filter(e => e.type === 'assist').length;
    const double = eff60.filter(e => e.type === 'double').length;
    const patientEff = assist + double + missed;
    const fanget = patientEff > 0 ? ((assist + double) / patientEff) * 100 : 100;
    const meanTi = sim.recentBreaths.reduce((s, b) => s + b.ti, 0) / sim.recentBreaths.length;

    const medianPaw300 = pawAt300List.length > 0 ? pawAt300List.sort((a,b)=>a-b)[Math.floor(pawAt300List.length/2)] : NaN;
    return {
        paw300: medianPaw300,
        fanget,
        ti: meanTi,
        ipap: scen.ipap,
        epap: scen.epap
    };
}

const rSlow = runSimForPaw300(SCENARIOS.slowRise);
const rFast = runSimForPaw300(Object.assign({}, SCENARIOS.slowRise, { riseTime: 150 }));

console.log('rSlow (riseTime 750 ms):', rSlow);
console.log('rFast (riseTime 150 ms):', rFast);

const limitSlow = rSlow.epap + 0.45 * (rSlow.ipap - rSlow.epap); // 6 + 4.5 = 10.5
const limitFast = rFast.ipap - 0.5; // 16 - 0.5 = 15.5

console.log(`Slow: paw300 = ${rSlow.paw300.toFixed(2)} cmH2O <= ${limitSlow.toFixed(2)}: ${rSlow.paw300 <= limitSlow}`);
console.log(`Fast: paw300 = ${rFast.paw300.toFixed(2)} cmH2O >= ${limitFast.toFixed(2)}: ${rFast.paw300 >= limitFast}`);
console.log(`Fanget: ${rSlow.fanget.toFixed(0)} % === 100: ${rSlow.fanget === 100}`);
console.log(`Ti: ${rSlow.ti.toFixed(2)} s < 0.85: ${rSlow.ti < 0.85}`);

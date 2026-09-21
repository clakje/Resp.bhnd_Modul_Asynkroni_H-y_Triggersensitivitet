const fs = require('fs');
const path = require('path');

global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'simulator.js'), 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

const appSrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = appSrc.indexOf('const SCENARIOS = {');
const end = appSrc.indexOf('// TOAST NOTIFIKASJONER', start);
let blokk = appSrc.slice(start, end);
blokk = blokk.slice(0, blokk.lastIndexOf('};') + 2);
const SCENARIOS = eval('(' + blokk.replace('const SCENARIOS = ', '').replace(/;\s*$/, '') + ')');

const scen = SCENARIOS.slowRise;
console.log('scen.slowRise definition:');
console.log(scen);

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

for (let i = 0; i < 6000; i++) sim.step(1/60);

const eff60 = sim.state.efforts.filter(e => e.t >= 40);
console.log('\nEfforts in t >= 40:');
console.log(`Total efforts: ${eff60.length}`);
for (const e of eff60) {
    console.log(`t: ${e.t.toFixed(2)}, type: ${e.type}, detected: ${e.detected}`);
}

const missed = eff60.filter(e => e.type === 'missed').length;
const assist = eff60.filter(e => e.type === 'assist').length;
const double = eff60.filter(e => e.type === 'double').length;
const auto = eff60.filter(e => e.type === 'auto').length;
const mand = eff60.filter(e => e.type === 'mandatory').length;
const patientEff = assist + double + missed;
const fanget = patientEff > 0 ? ((assist + double) / patientEff) * 100 : 100;

console.log({ missed, assist, double, auto, mand, patientEff, fanget });

const recentBreaths = sim.recentBreaths;
console.log('\nRecent breaths:');
for (const b of recentBreaths.slice(-10)) {
    console.log(`t: ${b.t.toFixed(2)}, triggerType: ${b.triggerType}, Ti: ${b.ti.toFixed(2)}, cycleReason: ${b.cycleReason}`);
}

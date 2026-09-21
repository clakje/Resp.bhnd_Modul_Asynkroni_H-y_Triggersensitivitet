/**
 * scratch/mottest_s12.js
 * Mottest for kontrakt S12 (Redusert respirasjonsdrive) iht. 01c_FASE1B_AVSLUTNING.md steg 1b.8.
 *
 * Verifiserer at kontrakten består for svak drive og feiler når pasientens egen drive skrus opp.
 */

const fs = require('fs');
const path = require('path');

// 1. Last inn simulatoren
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'simulator.js'), 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

// Seedet pseudo-tilfeldig tallgenerator (xorshift32)
let _prngState = 12345;
function seededRandom() {
    _prngState ^= _prngState << 13;
    _prngState ^= _prngState >> 17;
    _prngState ^= _prngState << 5;
    return ((_prngState >>> 0) / 4294967296);
}
Math.random = seededRandom;

// 2. Hent SCENARIOS fra app.js
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = appSrc.indexOf('const SCENARIOS = {');
const end = appSrc.indexOf('// TOAST NOTIFIKASJONER', start);
let blokk = appSrc.slice(start, end);
blokk = blokk.slice(0, blokk.lastIndexOf('};') + 2);
const SCENARIOS = eval('(' + blokk.replace('const SCENARIOS = ', '').replace(/;\s*$/, '') + ')');

function createSimulator(scen) {
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
    if (sim.settings.triggerMode === 'flow') {
        sim.settings.triggerFlow = scen.triggerVal;
    } else {
        sim.settings.triggerPressure = scen.triggerVal;
    }
    sim.settings.stActive = !!scen.stActive;
    sim.settings.backupRate = scen.backupRate !== undefined ? scen.backupRate : 12;

    sim.patient.compliance = scen.compliance;
    sim.patient.resistance = scen.resistance;
    sim.patient.expRatio = scen.expRatio;
    sim.patient.flowLimitation = scen.flowLimitation !== undefined ? scen.flowLimitation : 0.0;
    sim.patient.height = scen.height !== undefined ? scen.height : 175;
    sim.patient.gender = scen.gender || 'male';

    sim.patientDrive.rrSpont = scen.rrSpont;
    sim.patientDrive.pmusMax = scen.pmus;
    sim.patientDrive.tiNeural = scen.tiNeural;
    sim.patientDrive.pmusExp = scen.pmusExp;
    sim.patientDrive.variability = 0;
    sim.patientDrive.cardiacArtifact = scen.cardiac !== undefined ? scen.cardiac : 0.0;

    sim.reset();
    return sim;
}

function runTest(overrides) {
    const scen = Object.assign({}, SCENARIOS.lowDrive, overrides);
    const sim = createSimulator(scen);
    const dt = 1 / 60;

    for (let i = 0; i < 6000; i++) {
        sim.step(dt);
    }

    const eff60 = sim.state.efforts.filter(e => e.t >= 40);
    const mand = eff60.filter(e => e.type === 'mandatory').length;
    const vt = sim.state.measured.vt;
    const rrSpont = sim.patientDrive.rrSpont;
    const egetMinuttvolum = rrSpont * vt / 1000;
    const isApneaAlarm = sim.state.isApneaAlarm;

    const pass = mand >= 10 &&
                 egetMinuttvolum < 4.0 &&
                 !isApneaAlarm &&
                 vt >= 450 && vt <= 620;

    return {
        rrSpont,
        pmus: scen.pmus,
        mand,
        vt,
        egetMinuttvolum,
        pass
    };
}

const testCases = [
    { rrSpont: 5, pmus: 3 },
    { rrSpont: 6, pmus: 3 },
    { rrSpont: 7, pmus: 3 },
    { rrSpont: 8, pmus: 4 },
    { rrSpont: 12, pmus: 6 },
    { rrSpont: 14, pmus: 8 },
];

console.log('| Innstilling | mandatory | Eget minuttvolum | Forventet MV | Utfall | Forventet utfall |');
console.log('|---|---|---|---|---|---|');

const expected = [
    { mv: '2,6 L/min', pass: 'består' },
    { mv: '3,2 L/min', pass: 'består' },
    { mv: '3,9 L/min', pass: 'består' },
    { mv: '4,0 L/min', pass: 'feiler' },
    { mv: '5,8 L/min', pass: 'feiler' },
    { mv: '10,2 L/min', pass: 'feiler' },
];

for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const res = runTest(tc);
    const mvStr = res.egetMinuttvolum.toFixed(1).replace('.', ',') + ' L/min';
    const passStr = res.pass ? 'består' : 'feiler';
    const label = `rrSpont ${tc.rrSpont}, pmus ${tc.pmus}` + (i === 0 ? ' (valgt)' : '');
    console.log(`| \`${label}\` | ${res.mand} | ${mvStr} | ${expected[i].mv} | **${passStr}** | ${expected[i].pass} |`);
}

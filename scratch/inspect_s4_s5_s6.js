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

console.log('========================================================================');
console.log('  INSPEKSJON AV SLOWRISE (S5) OG FASTRISE (S6)');
console.log('========================================================================\n');

for (const key of ['slowRise', 'fastRise']) {
    const scen = SCENARIOS[key];
    const sim = createSimulator(scen);
    for (let i = 0; i < Math.round(40 / 0.004); i++) sim.step(0.004);

    while (sim.state.phase !== 'inspiration') sim.step(0.0002);
    let inspStartT = sim.state.totalTime;
    let inspSamples = [];
    while (sim.state.phase === 'inspiration') {
        inspSamples.push({ tip: sim.state.timeInPhase, Paw: sim.state.P_aw, Pservo: sim.state.P_servo });
        sim.step(0.0002);
    }
    let expSamples = [];
    while (sim.state.phase === 'expiration') {
        expSamples.push({ tep: sim.state.timeInPhase, Paw: sim.state.P_aw, Pservo: sim.state.P_servo });
        sim.step(0.0002);
        if (expSamples.length > 5000) break; // 1s
    }

    const Ti = inspSamples[inspSamples.length - 1].tip;
    const first90 = inspSamples.find(s => s.Paw >= scen.epap + 0.9 * (scen.ipap - scen.epap));
    const t90 = first90 ? first90.tip : NaN;

    // Falltid til EPAP + 0.5 i utpust:
    const firstNearEpap = expSamples.find(s => s.Paw <= scen.epap + 0.5);
    const fallTid = firstNearEpap ? firstNearEpap.tep : NaN;

    console.log(`--- ${scen.name} (${key}) ---`);
    console.log(`Innstilt riseTime: ${scen.riseTime} ms, IPAP: ${scen.ipap}, EPAP: ${scen.epap}`);
    console.log(`Målt Ti: ${Ti.toFixed(2)} s`);
    console.log(`Tid til 90% IPAP i innpust: ${t90 ? t90.toFixed(3) + ' s' : 'Nådde aldri 90%'}`);
    console.log(`Tid til EPAP + 0.5 i utpust: ${fallTid ? fallTid.toFixed(3) + ' s' : 'Tregt fall'}`);
    console.log(`Paw ved t_exp=0.15s: ${expSamples.find(s => s.tep >= 0.15)?.Paw.toFixed(2)} cmH2O\n`);
}

console.log('========================================================================');
console.log('  INSPEKSJON AV AUTOTRIGGER (S4)');
console.log('========================================================================\n');
{
    const scen = SCENARIOS.autotrigger;
    const sim = createSimulator(scen);
    for (let i = 0; i < 6000; i++) sim.step(1/60);
    const eff60 = sim.state.efforts.filter(e => e.t >= 40);
    const auto = eff60.filter(e => e.type === 'auto').length;
    const b60 = sim.recentBreaths;
    const tiMaxCount = b60.filter(b => b.cycleReason === 'tiMax').length;
    const flowCount = b60.filter(b => b.cycleReason === 'flow').length;
    console.log(`Auto-pust: ${auto}, Totale pust: ${b60.length}, TiMax-avbrudd: ${tiMaxCount}, Flow-avbrudd: ${flowCount}`);
    console.log(`Målt lekkasje: ${sim.state.measured.leak.toFixed(1)} L/min, Innstilt lekkasje: ${scen.leak} L/min`);
}

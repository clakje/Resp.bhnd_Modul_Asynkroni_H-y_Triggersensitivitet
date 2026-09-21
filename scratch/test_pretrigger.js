const fs = require('fs');
let code = fs.readFileSync('simulator.js', 'utf8').replace(/\r\n/g, '\n');

// 1. Add PRETRIGGER_VINDU to GRENSER
code = code.replace(
    'FALLTID_SERVO: 0.10,',
    'FALLTID_SERVO: 0.10,\n    PRETRIGGER_VINDU: 0.15, // s — klinisk asynkroniskåring regner et pust som pasientutløst når trigging og nevral innsats faller innenfor et fysiologisk vindu.'
);

// 2. Add erNevraltNaer and pretriggeredEffort to PatientDrive
code = code.replace(
    'this.currentEffort = null; // Peker til aktivt objekt i state.efforts',
    'this.currentEffort = null; // Peker til aktivt objekt i state.efforts\n        this.pretriggeredEffort = false;'
);

code = code.replace(
    `    isNeuralActive() {
        if (this.rrSpont <= 0) return false;
        return (this.timeInCycle < this.currentTiNeural && this.currentPmusMax > 0.05);
    }`,
    `    isNeuralActive() {
        if (this.rrSpont <= 0) return false;
        return (this.timeInCycle < this.currentTiNeural && this.currentPmusMax > 0.05);
    }

    erNevraltNaer() {
        if (this.rrSpont <= 0) return false;
        if (this.isNeuralActive()) return true;
        const remaining = this.currentCycleDuration - this.timeInCycle;
        return (remaining > 0 && remaining < GRENSER.PRETRIGGER_VINDU);
    }`
);

// 3. Update _startNewCycle
code = code.replace(
    `        if (effortsList) {
            this.currentEffort = {
                t: totalTime,
                detected: false,
                type: 'missed',
                markerEmitted: false
            };
            effortsList.push(this.currentEffort);
        }`,
    `        if (effortsList) {
            if (this.pretriggeredEffort) {
                this.currentEffort = {
                    t: totalTime,
                    detected: true,
                    type: 'assist',
                    markerEmitted: false
                };
                this.pretriggeredEffort = false;
            } else {
                this.currentEffort = {
                    t: totalTime,
                    detected: false,
                    type: 'missed',
                    markerEmitted: false
                };
            }
            effortsList.push(this.currentEffort);
        }`
);

// 4. Update trigger classification around line 722
const oldTrig = `                    if (isTriggered) {
                        // Bestem triggertype
                        const isNeural = this.patientDrive.isNeuralActive();
                        let triggerType = 'assist';

                        if (isNeural) {
                            // Dobbeltrigger: ny trigging hvis pasientens pågående innsats allerede har utløst pust i denne syklusen eller innen 0.50s etter forrige cycling
                            const isSecondaryInEffort = !!(this.patientDrive.currentEffort && this.patientDrive.currentEffort.detected);
                            if (this.state.breathCount > 0 && isSecondaryInEffort) {
                                // Samme nevrale innsats har alt utløst et pust — dette er
                                // en ekte dobbelttrigger. Ingen ny innsatspost pushes;
                                // den eksisterende merkes 'double' nedenfor, slik at
                                // hendelsen telles én gang.
                                triggerType = 'double';
                            } else {
                                triggerType = 'assist';
                            }

                            if (this.patientDrive.currentEffort) {
                                this.patientDrive.currentEffort.detected = true;
                                this.patientDrive.currentEffort.type = triggerType;
                            }
                        } else {
                            // Autotrigger: terskel krysset uten aktiv nevral pasientinnsats
                            triggerType = 'auto';
                            this.state.efforts.push({
                                t: this.state.totalTime,
                                detected: true,
                                type: 'auto'
                            });
                        }`;

const newTrig = `                    if (isTriggered) {
                        // Bestem triggertype
                        const isNeural = this.patientDrive.erNevraltNaer();
                        let triggerType = 'assist';

                        if (isNeural) {
                            if (!this.patientDrive.isNeuralActive()) {
                                // Trigging skjedde i pretrigger-vinduet rett før ny innsats
                                this.patientDrive.pretriggeredEffort = true;
                                triggerType = 'assist';
                            } else {
                                // Dobbeltrigger: ny trigging hvis pasientens pågående innsats allerede har utløst pust i denne syklusen eller innen 0.50s etter forrige cycling
                                const isSecondaryInEffort = !!(this.patientDrive.currentEffort && this.patientDrive.currentEffort.detected);
                                if (this.state.breathCount > 0 && isSecondaryInEffort) {
                                    // Samme nevrale innsats har alt utløst et pust — dette er
                                    // en ekte dobbelttrigger. Ingen ny innsatspost pushes;
                                    // den eksisterende merkes 'double' nedenfor, slik at
                                    // hendelsen telles én gang.
                                    triggerType = 'double';
                                } else {
                                    triggerType = 'assist';
                                }

                                if (this.patientDrive.currentEffort) {
                                    this.patientDrive.currentEffort.detected = true;
                                    this.patientDrive.currentEffort.type = triggerType;
                                }
                            }
                        } else {
                            // Autotrigger: terskel krysset uten aktiv nevral pasientinnsats
                            triggerType = 'auto';
                            this.state.efforts.push({
                                t: this.state.totalTime,
                                detected: true,
                                type: 'auto'
                            });
                        }`;

if (!code.includes(oldTrig)) {
    console.error('ERROR: oldTrig not found in code');
    process.exit(1);
}
code = code.replace(oldTrig, newTrig);

global.window = {};
eval(code);
const VentilatorSimulator = global.window.VentilatorSimulator;

const appSrc = fs.readFileSync('app.js', 'utf8');
const start = appSrc.indexOf('const SCENARIOS = {');
const end = appSrc.indexOf('// TOAST NOTIFIKASJONER', start);
let blokk = appSrc.slice(start, end);
blokk = blokk.slice(0, blokk.lastIndexOf('};') + 2);
const SCENARIOS = eval('(' + blokk.replace('const SCENARIOS = ', '').replace(/;\s*$/, '') + ')');

function testScenario(scenKey) {
    const scen = SCENARIOS[scenKey];
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
    const missed = eff60.filter(e => e.type === 'missed').length;
    const assist = eff60.filter(e => e.type === 'assist').length;
    const double = eff60.filter(e => e.type === 'double').length;
    const auto = eff60.filter(e => e.type === 'auto').length;
    const mand = eff60.filter(e => e.type === 'mandatory').length;
    const patientEff = assist + double + missed;
    const fanget = patientEff > 0 ? ((assist + double) / patientEff) * 100 : 100;
    const ai = sim.state.measured.asynchronyIndex;

    console.log(`=== Resultater for ${scenKey} ===`);
    console.log({ assist, auto, missed, double, mand, fanget: fanget.toFixed(0) + '%', ai: ai.toFixed(0) + '%' });
}

testScenario('slowRise');
testScenario('autotrigger');

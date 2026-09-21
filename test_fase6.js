/**
 * test_fase6.js — Tester (V1–V9) for Fase 6: volumkontroll, ikke-lineær P/V-kurve og entrainment
 *
 * Dekker de tre modulene som ble lagt til i Fase 6:
 *   6.1 Volumkontroll (VC) med flowmønster og inspiratorisk pause
 *   6.2 Stress index, øvre knekkpunkt, åpningstrykk og rekruttert volum
 *   6.3 Entrainment / omvendt trigging (reverse triggering)
 *
 * Kjøres med: node test_fase6.js
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// TOLERANSER OG GRENSER (Navngitte konstanter)
// =============================================================================

// V1: Levert tidalvolum treffer settpunktet. Cyclingen skjer på det tidssteget
// integralet passerer målet, så avviket er begrenset av ett tidssteg med toppflow.
const V1_VT_TOLERANCE = 15;              // ml

// V2: Platåtrykket under pause skal tilsvare EPAP + Vt / C for en passiv pasient
const V2_PPLAT_TOLERANCE = 0.5;          // cmH₂O
// PIP − Pplat er det resistive trykkfallet R × flow ved slutten av innpustet
const V2_RESISTIV_TOLERANCE = 1.0;       // cmH₂O

// V3: Desellererende rampe gir samme platå, men lavere topptrykk enn firkantflow
const V3_MIN_PIP_REDUKSJON = 2.0;        // cmH₂O
const V3_PPLAT_TOLERANCE = 0.5;          // cmH₂O

// V4: Stress index endrer krumningen på trykkurven under konstant flow.
// Krumningen måles som andrederiverte av P_aw gjennom flowfasen.
const V4_MIN_KRUMNINGSFORSKJELL = 0.5;   // cmH₂O per normalisert tid²

// V5: Øvre knekkpunkt hever platåtrykket over den lineære verdien
const V5_MIN_PPLAT_OKNING = 2.0;         // cmH₂O

// V6: PEEP over lukketrykket holder lungen rekruttert mellom pustene
const V6_REKRUTTERING_TOLERANCE = 10;    // ml

// V7: Entrainment låser innsatsintervallet til maskinfrekvensen
const V7_INTERVALL_TOLERANCE = 0.25;     // s

// V9: Med alle nye funksjoner avslått skal motoren være numerisk uendret
const V9_IDENTISK_DESIMALER = 9;         // antall desimaler i sammenligningen


// =============================================================================
// LASTE SIMULATOREN
// =============================================================================

global.window = {};
const simPath = path.join(__dirname, 'simulator.js');
eval(fs.readFileSync(simPath, 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;


// =============================================================================
// TESTRAMMEVERK OG UTSKRIFT
// =============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function record(id, title, success, detail, expected) {
    totalTests++;
    if (success) {
        passedTests++;
        console.log(`✅ [PASS] ${id}: ${title}`);
    } else {
        failedTests++;
        console.error(`❌ [FAIL] ${id}: ${title}`);
    }
    if (detail) console.log(`   Måling:    ${detail}`);
    if (expected) console.log(`   Forventet: ${expected}\n`);
    else console.log('');
}


// =============================================================================
// FELLES MÅLEOPPSETT
// Oppretter en simulator, slår av biologisk variabilitet, stabiliserer i 15 s
// og samler deretter ett komplett innpust ved 250 Hz.
// =============================================================================

function byggSimulator(params = {}) {
    const sim = new VentilatorSimulator();
    sim.patientDrive.variability = 0;
    Object.assign(sim.settings, params.settings || {});
    Object.assign(sim.patient, params.patient || {});
    // Passiv pasient med mindre noe annet er oppgitt
    sim.patientDrive.rrSpont = 0;
    Object.assign(sim.patientDrive, params.drive || {});
    sim.reset();
    return sim;
}

function stabiliser(sim, sekunder = 15) {
    const steg = Math.round(sekunder / 0.004);
    for (let i = 0; i < steg; i++) sim.step(0.004);
}

/** Samler ett komplett innpust ved 250 Hz, fra og med tidssteget fasen starter. */
function samleInnpust(sim, maksSekunder = 5) {
    // Spol fram til starten av neste innpust
    let vakt = Math.round(maksSekunder / 0.004);
    while (sim.state.phase !== 'expiration' && vakt-- > 0) sim.step(0.004);
    vakt = Math.round(maksSekunder / 0.004);
    while (sim.state.phase !== 'inspiration' && vakt-- > 0) sim.step(0.004);

    const prover = [];
    vakt = Math.round(maksSekunder / 0.004);
    while (sim.state.phase === 'inspiration' && vakt-- > 0) {
        prover.push({
            t: sim.state.timeInPhase,
            paw: sim.state.P_aw,
            flow: sim.state.flow,
            volume: sim.state.volume,
            pmus: sim.state.P_mus
        });
        sim.step(0.004);
    }
    return prover;
}


console.log('========================================================================');
console.log('  FASE 6: VOLUMKONTROLL, IKKE-LINEÆR P/V-KURVE OG ENTRAINMENT (V1–V9)');
console.log('========================================================================\n');


// =============================================================================
// 6.1 VOLUMKONTROLL
// =============================================================================

// --- V1: Levert tidalvolum treffer settpunktet ------------------------------
{
    const resultater = [];
    let alleOk = true;
    for (const vt of [300, 500, 700]) {
        const sim = byggSimulator({
            settings: { mode: 'VC', vcTidalVolume: vt, vcPeakFlow: 60, rr: 12, epap: 5, inspPause: 0 },
            patient: { compliance: 50, resistance: 10 }
        });
        stabiliser(sim);
        const avvik = Math.abs(sim.state.VTI - vt);
        if (avvik > V1_VT_TOLERANCE) alleOk = false;
        resultater.push(`${vt} → ${sim.state.VTI} ml (avvik ${avvik})`);
    }
    record('V1', 'Volumkontroll leverer innstilt tidalvolum',
        alleOk,
        resultater.join(', '),
        `Levert VTI innenfor ±${V1_VT_TOLERANCE} ml av innstilt tidalvolum`);
}

// --- V2: Inspiratorisk pause avdekker platåtrykket --------------------------
{
    const C = 50, R = 10, VT = 500, FLOW = 60, EPAP = 5;
    const sim = byggSimulator({
        settings: { mode: 'VC', vcTidalVolume: VT, vcPeakFlow: FLOW, rr: 12, epap: EPAP, inspPause: 0.4 },
        patient: { compliance: C, resistance: R }
    });
    stabiliser(sim);

    const forventetPplat = EPAP + VT / C;
    const forventetResistiv = R * (FLOW / 60);   // R × flow i L/s
    const maltPplat = sim.state.lastPplat;
    const maltResistiv = sim.state.lastPip - sim.state.lastPplat;

    const okPplat = Math.abs(maltPplat - forventetPplat) <= V2_PPLAT_TOLERANCE;
    const okResistiv = Math.abs(maltResistiv - forventetResistiv) <= V2_RESISTIV_TOLERANCE;

    record('V2', 'Inspiratorisk pause gir korrekt platåtrykk og resistivt fall',
        okPplat && okResistiv,
        `Pplat = ${maltPplat} (forventet ${forventetPplat.toFixed(1)}), PIP − Pplat = ${maltResistiv.toFixed(2)} (forventet ${forventetResistiv.toFixed(1)}), cyclingårsak = ${sim.state.lastCycleReason}`,
        `Pplat innenfor ±${V2_PPLAT_TOLERANCE} cmH₂O av EPAP + Vt/C, og PIP − Pplat innenfor ±${V2_RESISTIV_TOLERANCE} cmH₂O av R × flow`);
}

// --- V3: Desellererende rampe senker topptrykket ----------------------------
{
    const resultat = {};
    for (const monster of ['constant', 'decelerating']) {
        const sim = byggSimulator({
            settings: { mode: 'VC', vcTidalVolume: 500, vcPeakFlow: 60, rr: 12, epap: 5, inspPause: 0.3, vcFlowPattern: monster },
            patient: { compliance: 50, resistance: 8 }
        });
        stabiliser(sim);
        resultat[monster] = { pip: sim.state.lastPip, pplat: sim.state.lastPplat, vti: sim.state.VTI };
    }
    const pipFall = resultat.constant.pip - resultat.decelerating.pip;
    const platLikt = Math.abs(resultat.constant.pplat - resultat.decelerating.pplat) <= V3_PPLAT_TOLERANCE;

    record('V3', 'Desellererende flow senker PIP uten å endre platåtrykket',
        pipFall >= V3_MIN_PIP_REDUKSJON && platLikt,
        `Firkant: PIP = ${resultat.constant.pip}, Pplat = ${resultat.constant.pplat}. Desellererende: PIP = ${resultat.decelerating.pip}, Pplat = ${resultat.decelerating.pplat}. PIP-fall = ${pipFall.toFixed(1)} cmH₂O`,
        `PIP skal falle minst ${V3_MIN_PIP_REDUKSJON} cmH₂O, mens Pplat holder seg innenfor ±${V3_PPLAT_TOLERANCE} cmH₂O`);
}


// =============================================================================
// 6.2 IKKE-LINEÆR TRYKK/VOLUM-KURVE
// =============================================================================

// --- V4: Stress index endrer krumningen på trykkurven -----------------------
{
    /**
     * Krumning måles på flowfasen av innpustet: trykkurven normaliseres til
     * tidsintervallet [0, 1] og tilpasses et andregradspolynom. Andregradsleddet
     * er da et direkte mål på om kurven bøyer oppover (SI > 1) eller nedover (SI < 1).
     */
    function krumning(prover) {
        const n = prover.length;
        if (n < 10) return 0;
        // Minste kvadraters tilpasning av a·x² + b·x + c
        let Sx = 0, Sx2 = 0, Sx3 = 0, Sx4 = 0, Sy = 0, Sxy = 0, Sx2y = 0;
        for (let i = 0; i < n; i++) {
            const x = i / (n - 1);
            const y = prover[i].paw;
            const x2 = x * x;
            Sx += x; Sx2 += x2; Sx3 += x2 * x; Sx4 += x2 * x2;
            Sy += y; Sxy += x * y; Sx2y += x2 * y;
        }
        // Løs 3x3-systemet med Cramers regel
        const M = [[Sx4, Sx3, Sx2], [Sx3, Sx2, Sx], [Sx2, Sx, n]];
        const V = [Sx2y, Sxy, Sy];
        const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
                         - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
                         + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        const D = det(M);
        if (Math.abs(D) < 1e-12) return 0;
        const Ma = [[V[0], M[0][1], M[0][2]], [V[1], M[1][1], M[1][2]], [V[2], M[2][1], M[2][2]]];
        return det(Ma) / D;
    }

    const maalt = {};
    for (const si of [0.7, 1.0, 1.4]) {
        const sim = byggSimulator({
            settings: { mode: 'VC', vcTidalVolume: 500, vcPeakFlow: 30, rr: 10, epap: 5, inspPause: 0, vcFlowPattern: 'constant' },
            patient: { compliance: 50, resistance: 5, stressIndexEnabled: si !== 1.0, stressIndex: si }
        });
        stabiliser(sim);
        maalt[si] = krumning(samleInnpust(sim));
    }

    // SI < 1 skal bøye nedover (negativ krumning) og SI > 1 oppover, begge målt
    // mot den lineære referansen ved SI = 1.
    const lav = maalt[0.7] - maalt[1.0];
    const hoy = maalt[1.4] - maalt[1.0];
    const riktigRetning = lav < 0 && hoy > 0;
    const stortNok = Math.abs(lav) >= V4_MIN_KRUMNINGSFORSKJELL && Math.abs(hoy) >= V4_MIN_KRUMNINGSFORSKJELL;

    record('V4', 'Stress index endrer krumningen på trykkurven under konstant flow',
        riktigRetning && stortNok,
        `Krumning: SI 0.7 = ${maalt[0.7].toFixed(2)}, SI 1.0 = ${maalt[1.0].toFixed(2)}, SI 1.4 = ${maalt[1.4].toFixed(2)} (avvik fra lineær: ${lav.toFixed(2)} og +${hoy.toFixed(2)})`,
        `SI 0.7 skal gi nedadbøyd kurve og SI 1.4 oppadbøyd, begge minst ${V4_MIN_KRUMNINGSFORSKJELL} fra den lineære referansen`);
}

// --- V5: Øvre knekkpunkt gir beaking ----------------------------------------
{
    const C = 50, VT = 700, EPAP = 5;
    const lineartPplat = EPAP + VT / C;   // 19 cmH₂O

    const resultater = [];
    let monotont = true;
    let forrige = -Infinity;
    for (const terskel of [null, 16, 12]) {
        const sim = byggSimulator({
            settings: { mode: 'VC', vcTidalVolume: VT, vcPeakFlow: 40, rr: 10, epap: EPAP, inspPause: 0.3, alarmHighPpeak: 50 },
            patient: { compliance: C, resistance: 5, uipEnabled: terskel !== null, uipThreshold: terskel || 30 }
        });
        stabiliser(sim);
        const p = sim.state.lastPplat;
        if (p < forrige) monotont = false;
        forrige = p;
        resultater.push(`${terskel === null ? 'av' : terskel + ' cmH₂O'} → Pplat ${p}`);
    }
    // Det strengeste knekkpunktet må ha løftet platået tydelig over den lineære verdien
    const okning = forrige - lineartPplat;

    record('V5', 'Øvre knekkpunkt hever platåtrykket (overdistensjon)',
        monotont && okning >= V5_MIN_PPLAT_OKNING,
        `${resultater.join(', ')}. Lineært platå = ${lineartPplat.toFixed(1)}, økning ved strengeste knekkpunkt = ${okning.toFixed(1)} cmH₂O`,
        `Platåtrykket skal stige monotont når knekkpunktet senkes, og minst ${V5_MIN_PPLAT_OKNING} cmH₂O over den lineære verdien`);
}

// --- V6: PEEP over lukketrykket holder lungen rekruttert --------------------
{
    const P_OPEN = 18;
    const REKRUTTERT = 200;
    const lukketrykk = P_OPEN * 0.6;   // 10.8 cmH₂O

    const lav = byggSimulator({
        settings: { mode: 'PC', ipap: 25, epap: 4, rr: 12, tiSet: 1.0 },
        patient: { compliance: 50, resistance: 8, airwayOpeningPressure: P_OPEN, recruitedVolume: REKRUTTERT }
    });
    stabiliser(lav, 20);

    const hoy = byggSimulator({
        settings: { mode: 'PC', ipap: 25, epap: 12, rr: 12, tiSet: 1.0 },
        patient: { compliance: 50, resistance: 8, airwayOpeningPressure: P_OPEN, recruitedVolume: REKRUTTERT }
    });
    stabiliser(hoy, 20);

    // Ved lav EPAP (under lukketrykket) skal lungen ha kollapset igjen ved slutten
    // av utpustet. Ved høy EPAP (over lukketrykket) skal rekrutteringen bestå.
    const lavRekruttert = lav._V_recruit * 1000;
    const hoyRekruttert = hoy._V_recruit * 1000;
    const okLav = lavRekruttert <= V6_REKRUTTERING_TOLERANCE && lav._lungOpen === false;
    const okHoy = Math.abs(hoyRekruttert - REKRUTTERT) <= V6_REKRUTTERING_TOLERANCE && hoy._lungOpen === true;

    record('V6', 'PEEP over lukketrykket holder rekruttert volum mellom pustene',
        okLav && okHoy,
        `Lukketrykk = ${lukketrykk.toFixed(1)} cmH₂O. EPAP 4: rekruttert = ${lavRekruttert.toFixed(0)} ml, lungeåpen = ${lav._lungOpen}. EPAP 12: rekruttert = ${hoyRekruttert.toFixed(0)} ml, lungeåpen = ${hoy._lungOpen}`,
        `EPAP under lukketrykket skal slippe rekrutteringen, EPAP over skal beholde ${REKRUTTERT} ml innenfor ±${V6_REKRUTTERING_TOLERANCE} ml`);
}


// =============================================================================
// 6.3 ENTRAINMENT / OMVENDT TRIGGING
// =============================================================================

/** Finner tidspunktene for toppene i P_mus etter innsvingningstiden. */
function pmusTopper(sim, sekunder, hoppOver) {
    const steg = Math.round(sekunder / 0.004);
    const prover = [];
    for (let i = 0; i < steg; i++) {
        sim.step(0.004);
        if (sim.state.totalTime >= hoppOver) {
            prover.push({ t: sim.state.totalTime, p: sim.state.P_mus });
        }
    }
    const topper = [];
    for (let i = 1; i < prover.length - 1; i++) {
        if (prover[i].p > 1 && prover[i].p >= prover[i - 1].p && prover[i].p > prover[i + 1].p) {
            topper.push(prover[i].t);
        }
    }
    return topper;
}

function medianIntervall(topper) {
    const gap = [];
    for (let i = 1; i < topper.length; i++) gap.push(topper[i] - topper[i - 1]);
    if (gap.length === 0) return 0;
    gap.sort((a, b) => a - b);
    return gap[Math.floor(gap.length / 2)];
}

// --- V7: Entrainment låser innsatsen til maskinfrekvensen -------------------
{
    const MASKIN_RR = 20;
    const SPONT_RR = 11;
    const maskinIntervall = 60 / MASKIN_RR;   // 3.0 s
    const friIntervall = 60 / SPONT_RR;       // 5.45 s

    const maalinger = [];
    let alleOk = true;
    for (const [aktiv, ratio, forventet] of [[false, 1, friIntervall], [true, 1, maskinIntervall], [true, 2, maskinIntervall * 2], [true, 3, maskinIntervall * 3]]) {
        const sim = byggSimulator({
            settings: { mode: 'PC', ipap: 15, epap: 5, rr: MASKIN_RR, tiSet: 0.9 },
            patient: { compliance: 50, resistance: 8 },
            drive: { rrSpont: SPONT_RR, pmusMax: 6, variability: 0, entrainmentEnabled: aktiv, entrainmentRatio: ratio }
        });
        const median = medianIntervall(pmusTopper(sim, 90, 25));
        const ok = Math.abs(median - forventet) <= V7_INTERVALL_TOLERANCE;
        if (!ok) alleOk = false;
        maalinger.push(`${aktiv ? `1:${ratio}` : 'av'} → ${median.toFixed(2)} s (forventet ${forventet.toFixed(2)})`);
    }

    record('V7', 'Entrainment låser pasientens innsats til maskinfrekvensen',
        alleOk,
        maalinger.join(', '),
        `Innsatsintervallet skal treffe maskinintervallet × forholdet innenfor ±${V7_INTERVALL_TOLERANCE} s, og falle tilbake til egenfrekvensen når entrainment er av`);
}

// --- V8: Entrainment faller tilbake til fri frekvens ved maskinstans --------
{
    const sim = byggSimulator({
        settings: { mode: 'PC', ipap: 15, epap: 5, rr: 20, tiSet: 0.9 },
        patient: { compliance: 50, resistance: 8 },
        drive: { rrSpont: 11, pmusMax: 6, variability: 0, entrainmentEnabled: true, entrainmentRatio: 1 }
    });
    // Først entrainet
    const entrainet = medianIntervall(pmusTopper(sim, 60, 25));

    // Slå av maskinpustene: uten ST-backup og med PS-modus kommer det ingen
    // maskinutløste pust, og pasienten skal etter tidsavbruddet gå tilbake til fri frekvens.
    sim.settings.mode = 'PS';
    sim.settings.stActive = false;
    const fritt = medianIntervall(pmusTopper(sim, 120, sim.state.totalTime + 30));

    const okEntrainet = Math.abs(entrainet - 3.0) <= V7_INTERVALL_TOLERANCE;
    const okFritt = Math.abs(fritt - 60 / 11) <= V7_INTERVALL_TOLERANCE;

    record('V8', 'Pasienten går tilbake til egen frekvens når maskinpustene opphører',
        okEntrainet && okFritt,
        `Entrainet intervall = ${entrainet.toFixed(2)} s (forventet 3.00), etter maskinstans = ${fritt.toFixed(2)} s (forventet ${(60 / 11).toFixed(2)})`,
        `Etter ENTRAINMENT_TIMEOUT skal innsatsen løpe fritt igjen på egenfrekvensen innenfor ±${V7_INTERVALL_TOLERANCE} s`);
}


// =============================================================================
// REGRESJON
// =============================================================================

// --- V9: Alle nye funksjoner av gir uendret motor ---------------------------
{
    /**
     * Den ikke-lineære P/V-modellen ligger i signalveien for hvert eneste tidssteg,
     * også når den er avslått. Denne testen kjører den samme simuleringen to ganger —
     * én gang gjennom _pElastic og én gang gjennom den opprinnelige lineære V / C —
     * og krever bit-identisk resultat. Da kan Fase 6 ikke ha flyttet på noe i de
     * eksisterende scenariene.
     */
    function kjor(lineariser) {
        const sim = new VentilatorSimulator();
        if (lineariser) {
            sim._pElastic = function (V) { return V / (this.patient.compliance / 1000); };
            sim._elasticVolume = function () { return this.state.V; };
        }
        Object.assign(sim.settings, { ipap: 14, epap: 5, leak: 10 });
        Object.assign(sim.patient, { compliance: 60, resistance: 12, flowLimitation: 0.5 });
        Object.assign(sim.patientDrive, { rrSpont: 18, pmusMax: 6, variability: 0 });
        sim.reset();

        const spor = [];
        for (let i = 0; i < 3000; i++) {
            sim.step(0.01);
            if (i % 250 === 0) {
                spor.push([sim.state.P_aw, sim.state.Q_lunge, sim.state.V, sim.state.PEEPi]
                    .map(x => x.toFixed(V9_IDENTISK_DESIMALER)).join(','));
            }
        }
        spor.push(`VTE=${sim.state.VTE};PIP=${sim.state.lastPip};PEEPi=${sim.state.measured.peepi}`);
        return spor.join('|');
    }

    const ny = kjor(false);
    const gammel = kjor(true);

    record('V9', 'Ikke-lineær P/V-modell er uten virkning når alle flagg er av',
        ny === gammel,
        ny === gammel
            ? `Bit-identisk over 30 s simulering med lekkasje, flowbegrensning og pasientinnsats (${V9_IDENTISK_DESIMALER} desimaler)`
            : `AVVIK.\n   Ny:    ${ny}\n   Gammel:${gammel}`,
        'Sporet av P_aw, Q_lunge, V og PEEPi skal være identisk med den opprinnelige lineære modellen');
}


// =============================================================================
// OPPSUMMERING
// =============================================================================

const prosent = Math.round((passedTests / totalTests) * 100);
console.log('========================================================================');
console.log(`  FASE 6-RESULTAT: ${passedTests} / ${totalTests} TESTER BESTÅTT (${prosent} %)`);
console.log('========================================================================\n');

if (failedTests === 0) {
    console.log('🌟 SUKSESS: ALLE FASE 6-TESTER ER BESTÅTT!');
    process.exit(0);
} else {
    console.error(`FEIL: ${failedTests} test(er) feilet.`);
    process.exit(1);
}

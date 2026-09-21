/**
 * test_referanse.js - Kjører de 12 referansetilfellene mot vår motor
 * Referanse: 04_FASE4_parameterkart.md / VALIDERINGSPROTOKOLL.md
 *
 * Måler for hvert tilfelle:
 * - PIP (Peak Inspiratory Pressure, cmH₂O)
 * - Platåtrykk (Pplat, cmH₂O)
 * - VTE (Ekspirert tidalvolum, ml)
 * - Minuttvolum (MV, L/min)
 * - Målt frekvens (RRtot, /min)
 * - Topp inspiratorisk flow (L/min)
 * - Topp ekspiratorisk flow (L/min)
 */

const fs = require('fs');
const path = require('path');

// Last inn simulatoren
global.window = {};
eval(fs.readFileSync(path.join(__dirname, 'simulator.js'), 'utf8'));
const VentilatorSimulator = global.window.VentilatorSimulator;

// De 12 referansetilfellene spesifisert i VALIDERINGSPROTOKOLL.md
const referanseTilfeller = [
    {
        id: 'REF-01',
        tittel: 'Normal lunge, passiv pasient (PC-kontrollert)',
        kategori: 'Normal lunge / Passiv',
        settings: { mode: 'PC', ipap: 15, epap: 5, rr: 12, tiSet: 1.0, riseTime: 0.15, leak: 0 },
        patient: { compliance: 80, resistance: 5, expRatio: 1.0, flowLimitation: 0 },
        patientDrive: { rrSpont: 0, pmusMax: 0, tiNeural: 1.0, variability: 0 }
    },
    {
        id: 'REF-02',
        tittel: 'Normal lunge, spontant pustende (PS trykkstøtte)',
        kategori: 'Normal lunge / Spontan',
        settings: { mode: 'PS', ipap: 14, epap: 5, cyclingPercent: 0.25, riseTime: 0.15, leak: 0 },
        patient: { compliance: 80, resistance: 5, expRatio: 1.0, flowLimitation: 0 },
        patientDrive: { rrSpont: 14, pmusMax: 5, tiNeural: 0.9, variability: 0 }
    },
    {
        id: 'REF-03',
        tittel: 'Stiv lunge, passiv pasient (Restriktiv / ARDS-modell)',
        kategori: 'Stiv lunge / Passiv',
        settings: { mode: 'PC', ipap: 20, epap: 10, rr: 16, tiSet: 0.8, riseTime: 0.15, leak: 0 },
        patient: { compliance: 25, resistance: 5, expRatio: 1.0, flowLimitation: 0 },
        patientDrive: { rrSpont: 0, pmusMax: 0, tiNeural: 1.0, variability: 0 }
    },
    {
        id: 'REF-04',
        tittel: 'Stiv lunge, spontant pustende (Restriktiv takypné)',
        kategori: 'Stiv lunge / Spontan',
        settings: { mode: 'PS', ipap: 18, epap: 8, cyclingPercent: 0.25, riseTime: 0.10, leak: 0 },
        patient: { compliance: 25, resistance: 5, expRatio: 1.0, flowLimitation: 0 },
        patientDrive: { rrSpont: 22, pmusMax: 6, tiNeural: 0.6, variability: 0 }
    },
    {
        id: 'REF-05',
        tittel: 'Obstruktiv lunge, passiv pasient (KOLS / høy motstand)',
        kategori: 'Obstruktiv lunge / Passiv',
        settings: { mode: 'PC', ipap: 18, epap: 5, rr: 10, tiSet: 1.2, riseTime: 0.15, leak: 0 },
        patient: { compliance: 60, resistance: 20, expRatio: 1.5, flowLimitation: 0 },
        patientDrive: { rrSpont: 0, pmusMax: 0, tiNeural: 1.0, variability: 0 }
    },
    {
        id: 'REF-06',
        tittel: 'Obstruktiv lunge, spontant pustende (KOLS med auto-PEEP)',
        kategori: 'Obstruktiv lunge / Spontan',
        settings: { mode: 'PS', ipap: 16, epap: 5, cyclingPercent: 0.25, riseTime: 0.15, leak: 0 },
        patient: { compliance: 60, resistance: 20, expRatio: 1.5, flowLimitation: 0.4 },
        patientDrive: { rrSpont: 18, pmusMax: 4, tiNeural: 0.8, variability: 0 }
    },
    {
        id: 'REF-07',
        tittel: 'Lav stigetid / Rask trykksetting (Oversving)',
        kategori: 'Lav stigetid',
        settings: { mode: 'PC', ipap: 18, epap: 5, rr: 12, tiSet: 1.0, riseTime: 0.05, leak: 0 },
        patient: { compliance: 50, resistance: 5, expRatio: 1.0, flowLimitation: 0 },
        patientDrive: { rrSpont: 0, pmusMax: 0, tiNeural: 1.0, variability: 0 }
    },
    {
        id: 'REF-08',
        tittel: 'Høy stigetid / Langsom trykksetting',
        kategori: 'Høy stigetid',
        settings: { mode: 'PC', ipap: 18, epap: 5, rr: 12, tiSet: 1.0, riseTime: 0.40, leak: 0 },
        patient: { compliance: 50, resistance: 5, expRatio: 1.0, flowLimitation: 0 },
        patientDrive: { rrSpont: 0, pmusMax: 0, tiNeural: 1.0, variability: 0 }
    },
    {
        id: 'REF-09',
        tittel: 'Tidlig cycling / Høy E-Sense (50 % av toppflow)',
        kategori: 'Tidlig cycling',
        settings: { mode: 'PS', ipap: 16, epap: 5, cyclingPercent: 0.50, riseTime: 0.15, leak: 0 },
        patient: { compliance: 50, resistance: 8, expRatio: 1.0, flowLimitation: 0 },
        patientDrive: { rrSpont: 15, pmusMax: 5, tiNeural: 1.0, variability: 0 }
    },
    {
        id: 'REF-10',
        tittel: 'Sen cycling / Lav E-Sense (10 % av toppflow)',
        kategori: 'Sen cycling',
        settings: { mode: 'PS', ipap: 16, epap: 5, cyclingPercent: 0.10, riseTime: 0.15, leak: 0 },
        patient: { compliance: 60, resistance: 15, expRatio: 1.0, flowLimitation: 0 },
        patientDrive: { rrSpont: 14, pmusMax: 5, tiNeural: 0.7, variability: 0 }
    },
    {
        id: 'REF-11',
        tittel: 'Maskelekkasje (25 L/min @ 10 cmH₂O)',
        kategori: 'Lekkasje',
        settings: { mode: 'PS', ipap: 16, epap: 5, cyclingPercent: 0.25, riseTime: 0.15, leak: 25 },
        patient: { compliance: 50, resistance: 5, expRatio: 1.0, flowLimitation: 0 },
        patientDrive: { rrSpont: 15, pmusMax: 4, tiNeural: 0.9, variability: 0 }
    },
    {
        id: 'REF-12',
        tittel: 'Pasient med kraftig drive (Høy Pmus 15 cmH₂O, takypné)',
        kategori: 'Kraftig drive',
        settings: { mode: 'PS', ipap: 14, epap: 5, cyclingPercent: 0.25, riseTime: 0.15, leak: 0 },
        patient: { compliance: 50, resistance: 5, expRatio: 1.0, flowLimitation: 0 },
        patientDrive: { rrSpont: 26, pmusMax: 15, tiNeural: 0.65, variability: 0 }
    }
];

function kjorOgMal(tilfelle) {
    const sim = new VentilatorSimulator();
    sim.patientDrive.variability = 0;

    // Sett innstillinger
    Object.assign(sim.settings, tilfelle.settings);
    Object.assign(sim.patient, tilfelle.patient);
    Object.assign(sim.patientDrive, tilfelle.patientDrive);
    sim.patientDrive.variability = 0;
    sim.reset();

    // 1. Stabiliser motoren i 15 sekunder (250 Hz step(0.004))
    const stabSteps = Math.round(15 / 0.004);
    for (let i = 0; i < stabSteps; i++) {
        sim.step(0.004);
    }

    // 2. Spol til starten av neste inspirasjon
    let guard = 0;
    while (sim.state.phase === 'inspiration' && guard++ < 3000) {
        sim.step(0.004);
    }
    guard = 0;
    while (sim.state.phase === 'expiration' && guard++ < 3000) {
        sim.step(0.004);
    }

    // 3. Ta opp ett fullt pust (både inspirasjon og ekspirasjon)
    let inspPawMax = -Infinity;
    let inspPawLastBuffer = [];
    let peakInspFlow = -Infinity; // L/min
    let peakExpFlow = 0;         // L/min (positiv størrelse av ekspirasjonsflow)
    let inspDuration = 0;
    let expDuration = 0;
    let currentPhase = 'inspiration';

    guard = 0;
    while (guard++ < 5000) {
        const paw = sim.state.P_aw;
        const qMeasLmin = sim.state.Q_meas * 60;
        const qLungeLmin = sim.state.Q_lunge * 60;

        // Flow: bruk lungeflow/maskinflow relevant for pasientkurve
        // Under inspirasjon: topp positiv flow
        if (currentPhase === 'inspiration') {
            inspDuration += 0.004;
            if (paw > inspPawMax) inspPawMax = paw;
            inspPawLastBuffer.push(paw);
            if (inspPawLastBuffer.length > 25) inspPawLastBuffer.shift(); // siste 100 ms

            const flowInsp = (sim.settings.leak > 0) ? qLungeLmin : qMeasLmin;
            if (flowInsp > peakInspFlow) peakInspFlow = flowInsp;

            if (sim.state.phase === 'expiration') {
                currentPhase = 'expiration';
            }
        } else if (currentPhase === 'expiration') {
            expDuration += 0.004;
            const flowExp = (sim.settings.leak > 0) ? -qLungeLmin : -qMeasLmin;
            if (flowExp > peakExpFlow) peakExpFlow = flowExp;

            if (sim.state.phase === 'inspiration') {
                // Pustet er fullført
                break;
            }
        }

        sim.step(0.004);
    }

    // Platåtrykk: snitt av trykk siste 100 ms av inspirasjonen
    const pPlat = (inspPawLastBuffer.length > 0)
        ? inspPawLastBuffer.reduce((a, b) => a + b, 0) / inspPawLastBuffer.length
        : inspPawMax;

    // VTE: bruk sim.state.VTE eller integrert volum
    const vte = sim.state.VTE;
    const totalBreathTime = inspDuration + expDuration;
    const rr = (totalBreathTime > 0) ? (60 / totalBreathTime) : 0;
    const mv = (vte * rr) / 1000;

    return {
        id: tilfelle.id,
        tittel: tilfelle.tittel,
        kategori: tilfelle.kategori,
        pip: parseFloat(inspPawMax.toFixed(2)),
        pplat: parseFloat(pPlat.toFixed(2)),
        vte: Math.round(vte),
        mv: parseFloat(mv.toFixed(2)),
        rr: parseFloat(rr.toFixed(1)),
        peakInspFlow: parseFloat(peakInspFlow.toFixed(1)),
        peakExpFlow: parseFloat(peakExpFlow.toFixed(1))
    };
}

console.log('='.repeat(105));
console.log('  REFERANSEVALIDERING (FASE 4): 12 REFERANSETILFELLER MÅLT MOT VÅR MOTOR');
console.log('  Dokumentasjon og referanse: VALIDERINGSPROTOKOLL.md');
console.log('='.repeat(105));
console.log('');

const resultater = referanseTilfeller.map(kjorOgMal);

console.log(
    'Id'.padEnd(8) +
    'Kategori'.padEnd(26) +
    'PIP (cmH₂O)'.padEnd(14) +
    'Pplat (cmH₂O)'.padEnd(16) +
    'VTE (ml)'.padEnd(11) +
    'MV (L/min)'.padEnd(13) +
    'RR (/min)'.padEnd(11) +
    'InspFlow'.padEnd(11) +
    'ExpFlow'
);
console.log('-'.repeat(105));

for (const r of resultater) {
    console.log(
        r.id.padEnd(8) +
        r.kategori.padEnd(26) +
        r.pip.toString().padEnd(14) +
        r.pplat.toString().padEnd(16) +
        r.vte.toString().padEnd(11) +
        r.mv.toString().padEnd(13) +
        r.rr.toString().padEnd(11) +
        r.peakInspFlow.toString().padEnd(11) +
        r.peakExpFlow.toString()
    );
}

console.log('='.repeat(105));
console.log('Fullført simulering av alle 12 referansetilfeller.');

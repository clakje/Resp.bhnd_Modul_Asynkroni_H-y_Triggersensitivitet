/**
 * scenario-data.js — AUTOGENERERT av bygg-scenario-data.js. Ikke rediger for hånd.
 * Kilde: scenario.json
 *
 * Denne filen har forrang: finnes den, bruker spilleren den i stedet for å
 * hente scenario.json. Kjør skriptet på nytt etter endringer i scenario.json,
 * eller slett filen for å la spilleren hente JSON-en over nett.
 */
window.SCENARIO_DATA = {
  "schemaVersion": "1.0",
  "generator": "Respirator Scenario-Generator",
  "exportedAt": "2026-09-21T07:58:45.132Z",
  "meta": {
    "id": "asynkroni_hoey_trigger_senitivitet",
    "title": "Asynkroni ved høy triggersensitivitet",
    "description": "Dette viser hva som skjer når trigger er innstilt for høyt og respirator gir for lite trykkstøtte mot hva pasienten trenger.",
    "author": "Petter",
    "learningObjectives": [
      "Gjenkjenne høy trigger sensitivitet"
    ],
    "answerKey": {
      "optimalSettings": "Redusering av triggerfølsomhet til en lavere terskel vil gi korrekt synkronisering",
      "expectedResponse": "Ved reduksjon av trigger sensitivitet vil respirasjonsfrekvens bli korrekt trigget av pasient, Alternativt vil Flowtrigger gi en bedret synkronisering da denne er mer følsom enn trykk trigger.",
      "notes": "Flow-trigger vil fikse problemet straks. Trykk-trigger vil ikke nødvendigvis med små justeringer bedre synkronisering."
    }
  },
  "initialState": {
    "machine": {
      "mode": "PS",
      "ipap": 10,
      "epap": 5,
      "vcTidalVolume": 500,
      "vcPeakFlow": 60,
      "vcFlowPattern": "constant",
      "inspPause": 0,
      "tiSet": 1,
      "backupRate": 12,
      "stActive": false,
      "fio2": 30,
      "rr": 12,
      "triggerMode": "pressure",
      "trigger": 1.5,
      "cycling": 25,
      "tiMax": 2,
      "riseTime": 150,
      "leak": 0
    },
    "patient": {
      "height": 175,
      "gender": "male",
      "compliance": 76,
      "resistance": 7,
      "rrSpont": 16,
      "pmus": 6.5,
      "responsiveness": 10,
      "responsivePmus": true,
      "pmusOffset": 0,
      "tiNeural": 1,
      "kobleTiNeural": false,
      "triseNeural": 0.1,
      "tholdNeural": 0.35,
      "tdecayNeural": 0.45,
      "pmusExp": 0,
      "recoil": 25,
      "flowLimitation": 0,
      "criticalClosingPressure": 0,
      "flowConductance": 1,
      "peepStenting": 0,
      "expRatio": 1,
      "variability": 29,
      "cardiacArtifact": 2.2,
      "stressIndex": 1,
      "stressIndexEnabled": false,
      "uip": 30,
      "uipEnabled": false,
      "airwayOpening": 0,
      "recruitedVolume": 0,
      "entrainmentRatio": 1,
      "entrainmentEnabled": false
    },
    "alarms": {
      "apneaDelay": 20,
      "alarmLeak": 40,
      "alarmLowVt": 300,
      "alarmHighVt": 800,
      "alarmLowRr": 0,
      "alarmHighRr": 30,
      "alarmHighPpeak": 40
    }
  },
  "uiConfig": {
    "visibleControls": [
      "ipap",
      "epap",
      "fio2",
      "triggerMode",
      "trigger",
      "kobleTiNeural"
    ],
    "controls": [
      {
        "key": "ipap",
        "group": "machine",
        "label": "IPAP / inspiratorisk trykk",
        "type": "range",
        "unit": "cmH₂O",
        "default": 10,
        "min": 8,
        "max": 30,
        "step": 1
      },
      {
        "key": "epap",
        "group": "machine",
        "label": "EPAP / PEEP",
        "type": "range",
        "unit": "cmH₂O",
        "default": 5,
        "min": 3,
        "max": 15,
        "step": 1
      },
      {
        "key": "fio2",
        "group": "machine",
        "label": "FiO₂",
        "type": "range",
        "unit": "%",
        "default": 30,
        "min": 21,
        "max": 100,
        "step": 1
      },
      {
        "key": "triggerMode",
        "group": "machine",
        "label": "Triggertype",
        "type": "buttons",
        "unit": null,
        "default": "pressure",
        "options": [
          {
            "value": "flow",
            "label": "Flowtrigger"
          },
          {
            "value": "pressure",
            "label": "Trykktrigger"
          }
        ]
      },
      {
        "key": "trigger",
        "group": "machine",
        "label": "Triggersensitivitet",
        "type": "range",
        "unit": "cmH₂O",
        "default": 1.5,
        "min": 0.2,
        "max": 5,
        "step": 0.1,
        "modes": {
          "flow": {
            "label": "Triggersensitivitet (flow)",
            "unit": "L/min",
            "min": 1,
            "max": 5,
            "step": 0.5
          },
          "pressure": {
            "label": "Triggersensitivitet (trykk)",
            "unit": "cmH₂O",
            "min": 0.2,
            "max": 5,
            "step": 0.1
          }
        }
      },
      {
        "key": "kobleTiNeural",
        "group": "patient",
        "label": "Utled innsatsform fra Ti_neural",
        "type": "checkbox",
        "unit": null,
        "default": false
      }
    ]
  }
};

/**
 * app.js - Hovedapplikasjon og kontrollerkobling for Respirator Scenario-Generator (Hamilton-stil)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialiser kjernekomponenter
    const simulator = new VentilatorSimulator();
    const renderer = new WaveformRenderer('waveformCanvas');

    let isPaused = false;
    let lastTimestamp = performance.now();
    let currentGender = 'male';

    // 2. DOM Referanser
    // Header & Status
    const modeBadge = document.getElementById('modeBadge');
    const toastNotification = document.getElementById('toastNotification');
    const btnCopyScreenshot = document.getElementById('btnCopyScreenshot');

    // Alarm-banner & Alarm-liste (C3)
    const alarmBanner = document.getElementById('alarmBanner');
    const alarmList = document.getElementById('alarmList');

    // Primære måleverdier (D5)
    const valPpeak = document.getElementById('valPpeak');
    const valVt = document.getElementById('valVt');
    const valMv = document.getElementById('valMv');
    const valRR = document.getElementById('valRR');

    // Målekort (for styling ved alarm)
    const cardMetricPpeak = document.getElementById('cardMetricPpeak');
    const cardMetricVt = document.getElementById('cardMetricVt');
    const cardMetricMv = document.getElementById('cardMetricMv');
    const cardMetricRR = document.getElementById('cardMetricRR');

    // Sekundære måleverdier (D5)
    const dispPeepPeepi = document.getElementById('dispPeepPeepi');
    const dispPeepTot = document.getElementById('dispPeepTot');
    const dispLeakSec = document.getElementById('dispLeakSec');
    const dispLeakStatus = document.getElementById('dispLeakStatus');

    // 5.4: Holdmanøvrer & Målinger
    const btnInspHold = document.getElementById('btnInspHold');
    const btnExpHold = document.getElementById('btnExpHold');
    const holdStatusIndicator = document.getElementById('holdStatusIndicator');
    const titleSecPeep = document.getElementById('titleSecPeep');
    const titleSecPplat = document.getElementById('titleSecPplat');
    const dispPplatSec = document.getElementById('dispPplatSec');
    const dispPplatFoot = document.getElementById('dispPplatFoot');

    // Modusvelger & Kort (D1)
    const selectMode = document.getElementById('selectMode');
    const cardPressure = document.getElementById('cardPressure');
    const labelPressureMode = document.getElementById('labelPressureMode');
    const sublabelPressureMode = document.getElementById('sublabelPressureMode');
    const labelDeltaPInfo = document.getElementById('labelDeltaPInfo');
    const cardTiSet = document.getElementById('cardTiSet');
    const labelTiSet = document.getElementById('labelTiSet');
    const sublabelTiSet = document.getElementById('sublabelTiSet');
    const labelTiSetStatus = document.getElementById('labelTiSetStatus');

    // ST-backup kontroller (D2)
    const cardStBackup = document.getElementById('cardStBackup');
    const checkStActive = document.getElementById('checkStActive');

    // Cycling & TiMax kort (Fane 3)
    const cardCycling = document.getElementById('cardCycling');
    const labelCyclingStatus = document.getElementById('labelCyclingStatus');
    const cardTiMax = document.getElementById('cardTiMax');
    const cardTriseNeural = document.getElementById('cardTriseNeural');
    const cardTholdNeural = document.getElementById('cardTholdNeural');
    const cardTdecayNeural = document.getElementById('cardTdecayNeural');
    const checkKobleTiNeural = document.getElementById('checkKobleTiNeural');
    const cardResponsivePmus = document.getElementById('cardResponsivePmus');
    const checkResponsivePmus = document.getElementById('checkResponsivePmus');
    const checkShowP01 = document.getElementById('checkShowP01');
    const cardSecP01 = document.getElementById('cardSecP01');
    const dispP01Sec = document.getElementById('dispP01Sec');
    const dispP01Foot = document.getElementById('dispP01Foot');

    // Trigger-modus knapper og etiketter
    const btnTrigModeFlow = document.getElementById('btnTrigModeFlow');
    const btnTrigModePressure = document.getElementById('btnTrigModePressure');
    const triggerTitle = document.getElementById('triggerTitle');
    const triggerSublabel = document.getElementById('triggerSublabel');
    const triggerLimitMin = document.getElementById('triggerLimitMin');
    const triggerLimitMid = document.getElementById('triggerLimitMid');
    const triggerLimitMax = document.getElementById('triggerLimitMax');

    // Pasientprofil & Kjønnsknapper (D5)
    const btnGenderMale = document.getElementById('btnGenderMale');
    const btnGenderFemale = document.getElementById('btnGenderFemale');
    const badgeIbwCalc = document.getElementById('badgeIbwCalc');

    // Avkrysningsboks for pedagogisk lungekurvevisning (A7)
    const checkShowTrueCurves = document.getElementById('checkShowTrueCurves');

    // Monitor verktøylinje (C8, C9)
    const btnSweep15 = document.getElementById('btnSweep15');
    const btnScaleLocked = document.getElementById('btnScaleLocked');
    const btnScaleAuto = document.getElementById('btnScaleAuto');

    // Slidere
    const sliders = {
        ipap: document.getElementById('sliderIpap'),
        epap: document.getElementById('sliderEpap'),
        tiSet: document.getElementById('sliderTiSet'),
        backupRate: document.getElementById('sliderBackupRate'),
        rr: document.getElementById('sliderRR'),
        fio2: document.getElementById('sliderFio2'),
        trigger: document.getElementById('sliderTrigger'),
        compliance: document.getElementById('sliderCompliance'),
        resistance: document.getElementById('sliderResistance'),
        flowLimitation: document.getElementById('sliderFlowLimitation'),
        criticalClosingPressure: document.getElementById('sliderCriticalClosingPressure'),
        flowConductance: document.getElementById('sliderFlowConductance'),
        peepStenting: document.getElementById('sliderPeepStenting'),
        recoil: document.getElementById('sliderRecoil'),
        expRatio: document.getElementById('sliderExpRatio'),
        rrSpont: document.getElementById('sliderRrSpont'),
        pmus: document.getElementById('sliderPmus'),
        responsiveness: document.getElementById('sliderResponsiveness'),
        pmusOffset: document.getElementById('sliderPmusOffset'),
        tiNeural: document.getElementById('sliderTiNeural'),
        triseNeural: document.getElementById('sliderTriseNeural'),
        tholdNeural: document.getElementById('sliderTholdNeural'),
        tdecayNeural: document.getElementById('sliderTdecayNeural'),
        pmusExp: document.getElementById('sliderPmusExp'),
        variability: document.getElementById('sliderVariability'),
        cardiacArtifact: document.getElementById('sliderCardiacArtifact'),
        cycling: document.getElementById('sliderCycling'),
        tiMax: document.getElementById('sliderTiMax'),
        riseTime: document.getElementById('sliderRiseTime'),
        leak: document.getElementById('sliderLeak'),

        // 6.1: Volumkontroll
        vcTidalVolume: document.getElementById('sliderVcTidalVolume'),
        vcPeakFlow: document.getElementById('sliderVcPeakFlow'),
        inspPause: document.getElementById('sliderInspPause'),

        // 6.2: Ikke-lineær trykk/volum-kurve
        stressIndex: document.getElementById('sliderStressIndex'),
        uip: document.getElementById('sliderUip'),
        airwayOpening: document.getElementById('sliderAirwayOpening'),
        recruitedVolume: document.getElementById('sliderRecruitedVolume'),

        // Fase 4: Pasientprofil og Alarmer
        height: document.getElementById('sliderHeight'),
        apneaDelay: document.getElementById('sliderApneaDelay'),
        alarmLeak: document.getElementById('sliderAlarmLeak'),
        alarmLowVt: document.getElementById('sliderAlarmLowVt'),
        alarmHighVt: document.getElementById('sliderAlarmHighVt'),
        alarmLowRr: document.getElementById('sliderAlarmLowRr'),
        alarmHighRr: document.getElementById('sliderAlarmHighRr'),
        alarmHighPpeak: document.getElementById('sliderAlarmHighPpeak')
    };

    // Badges
    const badges = {
        ipap: document.getElementById('badgeIpap'),
        epap: document.getElementById('badgeEpap'),
        tiSet: document.getElementById('badgeTiSet'),
        backupRate: document.getElementById('badgeBackupRate'),
        rr: document.getElementById('badgeRR'),
        fio2: document.getElementById('badgeFio2'),
        trigger: document.getElementById('badgeTrigger'),
        compliance: document.getElementById('badgeCompliance'),
        resistance: document.getElementById('badgeResistance'),
        flowLimitation: document.getElementById('badgeFlowLimitation'),
        criticalClosingPressure: document.getElementById('badgeCriticalClosingPressure'),
        flowConductance: document.getElementById('badgeFlowConductance'),
        peepStenting: document.getElementById('badgePeepStenting'),
        recoil: document.getElementById('badgeRecoil'),
        expRatio: document.getElementById('badgeExpRatio'),
        rrSpont: document.getElementById('badgeRrSpont'),
        pmus: document.getElementById('badgePmus'),
        responsiveness: document.getElementById('badgeResponsiveness'),
        pmusOffset: document.getElementById('badgePmusOffset'),
        tiNeural: document.getElementById('badgeTiNeural'),
        triseNeural: document.getElementById('badgeTriseNeural'),
        tholdNeural: document.getElementById('badgeTholdNeural'),
        tdecayNeural: document.getElementById('badgeTdecayNeural'),
        pmusExp: document.getElementById('badgePmusExp'),
        variability: document.getElementById('badgeVariability'),
        cardiacArtifact: document.getElementById('badgeCardiacArtifact'),
        cycling: document.getElementById('badgeCycling'),
        tiMax: document.getElementById('badgeTiMax'),
        riseTime: document.getElementById('badgeRiseTime'),
        leak: document.getElementById('badgeLeak'),

        // 6.1: Volumkontroll
        vcTidalVolume: document.getElementById('badgeVcTidalVolume'),
        vcPeakFlow: document.getElementById('badgeVcPeakFlow'),
        inspPause: document.getElementById('badgeInspPause'),

        // 6.2: Ikke-lineær trykk/volum-kurve
        stressIndex: document.getElementById('badgeStressIndex'),
        uip: document.getElementById('badgeUip'),
        airwayOpening: document.getElementById('badgeAirwayOpening'),
        recruitedVolume: document.getElementById('badgeRecruitedVolume'),

        // Fase 4 Badges & Labels
        height: document.getElementById('badgeHeight'),
        apneaDelay: document.getElementById('badgeApneaDelay'),
        alarmLeak: document.getElementById('badgeAlarmLeak'),
        alarmLowVt: document.getElementById('badgeAlarmLowVt'),
        alarmHighVt: document.getElementById('badgeAlarmHighVt'),
        alarmLowRr: document.getElementById('badgeAlarmLowRr'),
        alarmHighRr: document.getElementById('badgeAlarmHighRr'),
        alarmHighPpeak: document.getElementById('badgeAlarmHighPpeak')
    };

    // 6.1 / 6.2 / 6.3: Nye avkrysningsbokser, knapper og statusetiketter
    const checkStressIndex = document.getElementById('checkStressIndex');
    const checkUip = document.getElementById('checkUip');
    const checkEntrainment = document.getElementById('checkEntrainment');
    const btnFlowPatternConstant = document.getElementById('btnFlowPatternConstant');
    const btnFlowPatternDecel = document.getElementById('btnFlowPatternDecel');
    const entrainBtns = {
        1: document.getElementById('btnEntrain1'),
        2: document.getElementById('btnEntrain2'),
        3: document.getElementById('btnEntrain3')
    };
    const cardVcTidalVolume = document.getElementById('cardVcTidalVolume');
    const cardVcPeakFlow = document.getElementById('cardVcPeakFlow');
    const cardInspPause = document.getElementById('cardInspPause');
    const labelVcVtPerKg = document.getElementById('labelVcVtPerKg');
    const labelVcTiCalc = document.getElementById('labelVcTiCalc');
    const labelInspPauseStatus = document.getElementById('labelInspPauseStatus');
    const labelStressIndexStatus = document.getElementById('labelStressIndexStatus');
    const labelAirwayOpeningStatus = document.getElementById('labelAirwayOpeningStatus');
    const labelRecruitedVolumeStatus = document.getElementById('labelRecruitedVolumeStatus');
    const labelEntrainmentStatus = document.getElementById('labelEntrainmentStatus');
    const cardRecruitedVolume = document.getElementById('cardRecruitedVolume');

    // Alarmgrenser etiketter og enhetsvelger
    const labelAlarmLowVtVal = document.getElementById('labelAlarmLowVtVal');
    const labelAlarmHighVtVal = document.getElementById('labelAlarmHighVtVal');
    const labelAlarmLowRrVal = document.getElementById('labelAlarmLowRrVal');
    const labelAlarmHighRrVal = document.getElementById('labelAlarmHighRrVal');

    const btnLeakUnitLmin = document.getElementById('btnLeakUnitLmin');
    const btnLeakUnitPercent = document.getElementById('btnLeakUnitPercent');
    const leakLimitMin = document.getElementById('leakLimitMin');
    const leakLimitMid = document.getElementById('leakLimitMid');
    const leakLimitMax = document.getElementById('leakLimitMax');
    const leakSublabel = document.getElementById('leakSublabel');
    const btnAlarmLeakStepDown = document.getElementById('btnAlarmLeakStepDown');
    const btnAlarmLeakStepUp = document.getElementById('btnAlarmLeakStepUp');

    // Trigger-samkjøringsfelter (UI/UX)
    const triggerSyncBox = document.getElementById('triggerSyncBox');
    const triggerSyncBadge = document.getElementById('triggerSyncBadge');
    const syncTriggerReq = document.getElementById('syncTriggerReq');
    const syncPatientEffort = document.getElementById('syncPatientEffort');
    const triggerGaugeFill = document.getElementById('triggerGaugeFill');
    const triggerGaugeThreshold = document.getElementById('triggerGaugeThreshold');
    const triggerSyncMessage = document.getElementById('triggerSyncMessage');

    // Knapper
    const btnPause = document.getElementById('btnPause');
    const pauseIcon = document.getElementById('pauseIcon');
    const pauseText = document.getElementById('pauseText');
    const btnReset = document.getElementById('btnReset');

    // 5.3: Alvorlighetsknapper for flowbegrensning
    const flSeverityBtns = {
        none: document.getElementById('btnFlNone'),
        mild: document.getElementById('btnFlMild'),
        moderate: document.getElementById('btnFlModerate'),
        severe: document.getElementById('btnFlSevere'),
        custom: document.getElementById('btnFlCustom')
    };

    // Innsiktspanel
    const insightTau = document.getElementById('insightTau');
    const insightDeltaP = document.getElementById('insightDeltaP');
    const insightTheoVt = document.getElementById('insightTheoVt');
    const insightCycleReason = document.getElementById('insightCycleReason');
    const insightText = document.getElementById('insightText');

    // =========================================================================
    // TOAST NOTIFIKASJONER (D6)
    // =========================================================================
    let toastTimer = null;
    function showToast(message, durationMs = 3500) {
        if (!toastNotification) return;
        toastNotification.innerHTML = message;
        toastNotification.classList.remove('hidden');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastNotification.classList.add('hidden');
        }, durationMs);
    }

    // =========================================================================
    // D1: MODUS-HÅNDTERING (PS vs PC)
    // =========================================================================
    function setVentilationMode(mode) {
        simulator.settings.mode = mode;
        if (selectMode) selectMode.value = mode;

        if (mode === 'VC') {
            // 6.1: Volumkontroll — tidalvolumet er innstilt og trykket er resultatet
            if (modeBadge) {
                modeBadge.innerHTML = '<span>Modus: Volumkontroll (VCV / A/C)</span>';
            }
            if (labelPressureMode) labelPressureMode.textContent = 'IPAP (ikke aktiv i VC)';
            if (sublabelPressureMode) sublabelPressureMode.textContent = 'I volumkontroll følger trykket av volum, motstand og ettergivelighet';

            if (labelCyclingStatus) {
                labelCyclingStatus.textContent = 'Gjelder i PS-modus';
                labelCyclingStatus.style.color = 'var(--text-dim)';
            }
            if (labelTiSetStatus) {
                labelTiSetStatus.textContent = 'Gjelder i PC-modus';
                labelTiSetStatus.style.color = 'var(--text-dim)';
            }
        } else if (mode === 'PC') {
            if (modeBadge) {
                modeBadge.innerHTML = '<span>Modus: Trykkontroll (PCV / A/C)</span>';
            }
            if (labelPressureMode) labelPressureMode.textContent = 'PC over PEEP (Trykkontroll)';
            if (sublabelPressureMode) sublabelPressureMode.textContent = 'Inspiratorisk trykknivå levert under innpust';

            if (labelCyclingStatus) {
                labelCyclingStatus.textContent = 'Gjelder i PS-modus';
                labelCyclingStatus.style.color = 'var(--text-dim)';
            }
            if (labelTiSetStatus) {
                labelTiSetStatus.textContent = '✅ Aktiv (Innpuststid = Ti)';
                labelTiSetStatus.style.color = 'var(--color-accent)';
            }
        } else {
            // PS-modus (Standard)
            if (modeBadge) {
                modeBadge.innerHTML = '<span>Modus: BPAP</span>';
            }
            if (labelPressureMode) labelPressureMode.textContent = 'IPAP (Inspiratorisk trykk)';
            if (sublabelPressureMode) sublabelPressureMode.textContent = 'Trykkstøtte levert under innpust';

            if (labelCyclingStatus) {
                labelCyclingStatus.textContent = 'Gjelder i PS-modus';
                labelCyclingStatus.style.color = 'var(--color-accent)';
            }
            if (labelTiSetStatus) {
                labelTiSetStatus.textContent = 'Gjelder i PC-modus';
                labelTiSetStatus.style.color = 'var(--text-dim)';
            }
        }

        // Alle slidere holdes fullt redigerbare i scenario-generatoren
        if (sliders.cycling) sliders.cycling.disabled = false;
        if (sliders.tiSet) sliders.tiSet.disabled = false;
        if (sliders.tiMax) sliders.tiMax.disabled = false;
        if (cardCycling) cardCycling.classList.remove('control-disabled');
        if (cardTiSet) cardTiSet.classList.remove('control-disabled');
        if (cardTiMax) cardTiMax.classList.remove('control-disabled');

        updateSimulatorFromUI();
    }

    if (selectMode) {
        selectMode.addEventListener('change', () => {
            setVentilationMode(selectMode.value);
        });
    }

    // 6.1: Flowmønster i volumkontroll (firkant / desellererende rampe)
    function setFlowPattern(pattern) {
        simulator.settings.vcFlowPattern = pattern;
        const erFirkant = (pattern === 'constant');
        if (btnFlowPatternConstant) btnFlowPatternConstant.classList.toggle('active', erFirkant);
        if (btnFlowPatternDecel) btnFlowPatternDecel.classList.toggle('active', !erFirkant);
        updateSimulatorFromUI();
    }
    if (btnFlowPatternConstant) btnFlowPatternConstant.addEventListener('click', () => setFlowPattern('constant'));
    if (btnFlowPatternDecel) btnFlowPatternDecel.addEventListener('click', () => setFlowPattern('decelerating'));

    // 6.3: Forhold mellom maskinpust og nevral innsats ved entrainment
    function setEntrainmentRatio(ratio) {
        simulator.patientDrive.entrainmentRatio = ratio;
        Object.keys(entrainBtns).forEach(key => {
            const btn = entrainBtns[key];
            if (btn) btn.classList.toggle('active', parseInt(key, 10) === ratio);
        });
        updateSimulatorFromUI();
    }
    Object.keys(entrainBtns).forEach(key => {
        const btn = entrainBtns[key];
        if (btn) btn.addEventListener('click', () => setEntrainmentRatio(parseInt(key, 10)));
    });

    // Avkrysningsboks for lungekurver (A7)
    if (checkShowTrueCurves) {
        checkShowTrueCurves.addEventListener('change', () => {
            renderer.showTrueCurves = checkShowTrueCurves.checked;
        });
    }

    // FASE 4: Avkrysningsboks for 4. spor (P_es / muskelinnsats)
    const checkShowPes = document.getElementById('checkShowPes');
    if (checkShowPes) {
        checkShowPes.addEventListener('change', () => {
            renderer.showPesTrack = checkShowPes.checked;
            renderer.resize();   // sporlayouten må regnes om
        });
    }

    // Trigger-modus veksling (Flow / Trykk)
    function setTriggerMode(mode) {
        simulator.settings.triggerMode = mode;

        if (mode === 'flow') {
            if (btnTrigModeFlow) btnTrigModeFlow.classList.add('active');
            if (btnTrigModePressure) btnTrigModePressure.classList.remove('active');

            if (triggerTitle) triggerTitle.textContent = 'Flow-trigger (Inspirasjonstrigger)';
            if (triggerSublabel) triggerSublabel.textContent = 'Påkrevd pasientflow for å utløse støtte (1–5 L/min)';
            if (triggerLimitMin) triggerLimitMin.textContent = '1.0 L/min (100% utløst ▲)';
            if (triggerLimitMid) triggerLimitMid.textContent = '4.0 L/min (Asynkroni)';
            if (triggerLimitMax) triggerLimitMax.textContent = '5.0 L/min (Apné / 0%)';

            if (sliders.trigger) {
                sliders.trigger.min = '1';
                sliders.trigger.max = '5';
                sliders.trigger.step = '0.5';
                sliders.trigger.value = simulator.settings.triggerFlow;
            }
        } else {
            if (btnTrigModePressure) btnTrigModePressure.classList.add('active');
            if (btnTrigModeFlow) btnTrigModeFlow.classList.remove('active');

            if (triggerTitle) triggerTitle.textContent = 'Trykk-trigger (Inspirasjonstrigger)';
            if (triggerSublabel) triggerSublabel.textContent = 'Trykkfall under EPAP for å utløse støtte (0.2–5.0 cmH₂O)';
            if (triggerLimitMin) triggerLimitMin.textContent = '0.2 cmH₂O (Svært lett)';
            if (triggerLimitMid) triggerLimitMid.textContent = '1.0 cmH₂O';
            if (triggerLimitMax) triggerLimitMax.textContent = '5.0 cmH₂O (Tung)';

            if (sliders.trigger) {
                sliders.trigger.min = '0.2';
                sliders.trigger.max = '5';
                sliders.trigger.step = '0.1';
                sliders.trigger.value = simulator.settings.triggerPressure;
            }
        }

        updateSimulatorFromUI();
    }

    if (btnTrigModeFlow) {
        btnTrigModeFlow.addEventListener('click', () => setTriggerMode('flow'));
    }
    if (btnTrigModePressure) {
        btnTrigModePressure.addEventListener('click', () => setTriggerMode('pressure'));
    }

    // =========================================================================
    // 5.3: EKSPIRATORISK FLOWBEGRENSNING & PEEP-STENTING
    // =========================================================================
    function setSeverityButtonActive(level) {
        Object.entries(flSeverityBtns).forEach(([key, btn]) => {
            if (btn) btn.classList.toggle('active', key === level);
        });
    }

    function setFlowLimitationSeverity(level) {
        setSeverityButtonActive(level);

        // Slidere holdes alltid redigerbare
        if (sliders.criticalClosingPressure) sliders.criticalClosingPressure.disabled = false;
        if (sliders.flowConductance) sliders.flowConductance.disabled = false;
        if (sliders.peepStenting) sliders.peepStenting.disabled = false;
        document.querySelectorAll('.step-btn[data-target="sliderCriticalClosingPressure"], .step-btn[data-target="sliderFlowConductance"], .step-btn[data-target="sliderPeepStenting"]').forEach(btn => btn.disabled = false);

        if (level === 'none') {
            if (sliders.criticalClosingPressure) sliders.criticalClosingPressure.value = '0.0';
            if (sliders.flowConductance) sliders.flowConductance.value = '1.00';
            if (sliders.peepStenting) sliders.peepStenting.value = '0';
            if (sliders.flowLimitation) sliders.flowLimitation.value = '0.00';
        } else if (level === 'mild') {
            // Begrunnelse: Tidlig perifer luftveissykdom. Lukketrykk 4.0 cmH2O, moderat segmentkonduktans 0.8, 50% PEEP-respons.
            if (sliders.criticalClosingPressure) sliders.criticalClosingPressure.value = '4.0';
            if (sliders.flowConductance) sliders.flowConductance.value = '0.80';
            if (sliders.peepStenting) sliders.peepStenting.value = '50';
            if (sliders.flowLimitation) sliders.flowLimitation.value = '0.35';
        } else if (level === 'moderate') {
            // Begrunnelse: Moderat KOLS (tilsvarer flowLimitation 0.70). Lukketrykk 8.0 cmH2O, nedsatt konduktans 0.5, god stentingrespons (70%) ved EPAP.
            if (sliders.criticalClosingPressure) sliders.criticalClosingPressure.value = '8.0';
            if (sliders.flowConductance) sliders.flowConductance.value = '0.50';
            if (sliders.peepStenting) sliders.peepStenting.value = '70';
            if (sliders.flowLimitation) sliders.flowLimitation.value = '0.70';
        } else if (level === 'severe') {
            // Begrunnelse: Alvorlig emfysem og dynamisk luftveiskollaps. Lukketrykk 14.0 cmH2O, lav konduktans 0.2, krever 80% PEEP-stenting.
            if (sliders.criticalClosingPressure) sliders.criticalClosingPressure.value = '14.0';
            if (sliders.flowConductance) sliders.flowConductance.value = '0.20';
            if (sliders.peepStenting) sliders.peepStenting.value = '80';
            if (sliders.flowLimitation) sliders.flowLimitation.value = '1.00';
        }

        updateSimulatorFromUI();
        updateInsights();
    }

    Object.entries(flSeverityBtns).forEach(([key, btn]) => {
        if (btn) {
            btn.addEventListener('click', () => setFlowLimitationSeverity(key));
        }
    });

    function onDetailedFlSliderChange() {
        setSeverityButtonActive('custom');
        const P_crit = (sliders.criticalClosingPressure) ? parseFloat(sliders.criticalClosingPressure.value) : 0;
        const fl = Math.min(1.0, Math.max(0, (P_crit / 8.0) * 0.70));
        if (sliders.flowLimitation) sliders.flowLimitation.value = fl.toFixed(2);
        updateSimulatorFromUI();
        updateInsights();
    }
    if (sliders.criticalClosingPressure) sliders.criticalClosingPressure.addEventListener('input', onDetailedFlSliderChange);
    if (sliders.flowConductance) sliders.flowConductance.addEventListener('input', onDetailedFlSliderChange);
    if (sliders.peepStenting) sliders.peepStenting.addEventListener('input', onDetailedFlSliderChange);

    // =========================================================================
    // LEKKASJE ALARM ENHET (L/min vs %)
    // =========================================================================
    function setLeakAlarmUnit(unit) {
        simulator.settings.alarmLeakUnit = unit;
        if (unit === 'lmin') {
            if (btnLeakUnitLmin) btnLeakUnitLmin.classList.add('active');
            if (btnLeakUnitPercent) btnLeakUnitPercent.classList.remove('active');
            if (leakSublabel) leakSublabel.textContent = 'Utløses ved lekkasje over grensen i > 10 sekunder';
            if (leakLimitMin) leakLimitMin.textContent = '10 L/min';
            if (leakLimitMid) leakLimitMid.textContent = '40 L/min';
            if (leakLimitMax) leakLimitMax.textContent = '60 L/min';
            if (btnAlarmLeakStepDown) btnAlarmLeakStepDown.dataset.step = '-5';
            if (btnAlarmLeakStepUp) btnAlarmLeakStepUp.dataset.step = '5';
            if (sliders.alarmLeak) {
                sliders.alarmLeak.min = '10';
                sliders.alarmLeak.max = '60';
                sliders.alarmLeak.step = '5';
                sliders.alarmLeak.value = simulator.settings.alarmLeakLimit || 40;
            }
        } else {
            if (btnLeakUnitPercent) btnLeakUnitPercent.classList.add('active');
            if (btnLeakUnitLmin) btnLeakUnitLmin.classList.remove('active');
            if (leakSublabel) leakSublabel.textContent = 'Utløses ved lekkasjeprosent over grensen i > 10 sekunder';
            if (leakLimitMin) leakLimitMin.textContent = '10 %';
            if (leakLimitMid) leakLimitMid.textContent = '50 %';
            if (leakLimitMax) leakLimitMax.textContent = '80 %';
            if (btnAlarmLeakStepDown) btnAlarmLeakStepDown.dataset.step = '-5';
            if (btnAlarmLeakStepUp) btnAlarmLeakStepUp.dataset.step = '5';
            if (sliders.alarmLeak) {
                sliders.alarmLeak.min = '10';
                sliders.alarmLeak.max = '80';
                sliders.alarmLeak.step = '5';
                sliders.alarmLeak.value = simulator.settings.alarmLeakPercentLimit || 50;
            }
        }
        updateSimulatorFromUI();
    }

    if (btnLeakUnitLmin) {
        btnLeakUnitLmin.addEventListener('click', () => setLeakAlarmUnit('lmin'));
    }
    if (btnLeakUnitPercent) {
        btnLeakUnitPercent.addEventListener('click', () => setLeakAlarmUnit('percent'));
    }

    // Funksjon for sanntids samkjøring av pasientflow og trigger (A4 & A6)
    function updateTriggerSyncUI() {
        const isFlowMode = (simulator.settings.triggerMode === 'flow');
        const trigFlow = simulator.settings.triggerFlow;
        const trigPress = simulator.settings.triggerPressure;
        const pmus = simulator.patientDrive.pmusMax;
        const R = simulator.patient.resistance;
        const rrSpont = simulator.patientDrive.rrSpont;
        const peepi = simulator.state.PEEPi || 0;
        const effectiveDrivingForce = Math.max(0, pmus - peepi);
        const patientPeakFlow = isFlowMode
            ? parseFloat((simulator.state.visPeakTriggerFlow * 60).toFixed(1))
            : parseFloat(((effectiveDrivingForce / R) * 60).toFixed(1));
        const cardiac = simulator.patientDrive.cardiacArtifact;
        const isStActive = simulator.settings.stActive && simulator.settings.backupRate > 0;

        const syncPatientLabel = syncPatientEffort ? syncPatientEffort.previousElementSibling : null;

        if (isFlowMode) {
            if (syncPatientLabel && syncPatientLabel.classList.contains('sync-label')) {
                syncPatientLabel.textContent = 'Pasientens topp-innsats (målt):';
                syncPatientLabel.title = 'Toppholdt måling over de siste sekundene, ikke en øyeblikksverdi';
            }
            if (syncTriggerReq) syncTriggerReq.textContent = `${trigFlow.toFixed(1)} L/min`;
            if (syncPatientEffort) {
                syncPatientEffort.textContent = `${patientPeakFlow.toFixed(1)} L/min`;
                syncPatientEffort.title = 'Toppholdt måling over de siste sekundene, ikke en øyeblikksverdi';
            }

            const maxVal = 6.0;
            const threshPct = Math.min(95, Math.max(5, (trigFlow / maxVal) * 100));
            const effortPct = Math.min(100, Math.max(5, (patientPeakFlow / maxVal) * 100));

            if (triggerGaugeThreshold) triggerGaugeThreshold.style.left = `${threshPct}%`;
            if (triggerGaugeFill) triggerGaugeFill.style.width = `${effortPct}%`;

            if (rrSpont === 0) {
                if (cardiac >= trigFlow) {
                    if (triggerSyncBox) triggerSyncBox.className = 'trigger-sync-box warning-state';
                    if (triggerGaugeFill) triggerGaugeFill.className = 'trigger-gauge-fill warning-fill';
                    if (triggerSyncBadge) {
                        triggerSyncBadge.className = 'trigger-sync-status-badge status-warning';
                        triggerSyncBadge.textContent = '⚡ Autotrigging';
                    }
                    if (badges.trigger) {
                        badges.trigger.classList.add('badge-warning-pill');
                        badges.trigger.classList.remove('badge-danger-pill');
                    }
                    if (triggerSyncMessage) {
                        triggerSyncMessage.innerHTML = `⚡ <strong>Kardiogen autotrigging:</strong> Pulsslag (${cardiac.toFixed(1)} L/min) er kraftigere enn triggerterskelen (${trigFlow.toFixed(1)} L/min) og trigger innpust uten pasientinnsats.`;
                    }
                } else if (isStActive) {
                    if (triggerSyncBox) triggerSyncBox.className = 'trigger-sync-box';
                    if (triggerGaugeFill) triggerGaugeFill.className = 'trigger-gauge-fill';
                    if (triggerSyncBadge) {
                        triggerSyncBadge.className = 'trigger-sync-status-badge status-ok';
                        triggerSyncBadge.textContent = '■ ST-Backup aktiv';
                    }
                    if (badges.trigger) {
                        badges.trigger.classList.remove('badge-warning-pill', 'badge-danger-pill');
                    }
                    if (triggerSyncMessage) {
                        triggerSyncMessage.innerHTML = `■ <strong>ST-Backup aktiv:</strong> Pasienten er passiv (rrSpont = 0). Maskinen leverer ${simulator.settings.backupRate} backup-pust/min uten apné-alarm.`;
                    }
                } else {
                    if (triggerSyncBox) triggerSyncBox.className = 'trigger-sync-box danger-state';
                    if (triggerGaugeFill) triggerGaugeFill.className = 'trigger-gauge-fill danger-fill';
                    if (triggerSyncBadge) {
                        triggerSyncBadge.className = 'trigger-sync-status-badge status-danger';
                        triggerSyncBadge.textContent = '🚨 Passiv / Apné';
                    }
                    if (badges.trigger) {
                        badges.trigger.classList.remove('badge-warning-pill');
                        badges.trigger.classList.remove('badge-danger-pill');
                    }
                    if (triggerSyncMessage) {
                        triggerSyncMessage.innerHTML = `🚨 <strong>Passiv pasient (rrSpont = 0, ST av):</strong> Ingen pasientinnsats eller backup. Apné-alarm utløses etter ${simulator.settings.apneaDelay} sekunder.`;
                    }
                }
            } else if (peepi > 1.5 && patientPeakFlow < trigFlow) {
                if (triggerSyncBox) triggerSyncBox.className = 'trigger-sync-box warning-state';
                if (triggerGaugeFill) triggerGaugeFill.className = 'trigger-gauge-fill warning-fill';
                if (triggerSyncBadge) {
                    triggerSyncBadge.className = 'trigger-sync-status-badge status-warning';
                    triggerSyncBadge.textContent = '⚠️ Auto-PEEP asynkroni';
                }
                if (badges.trigger) {
                    badges.trigger.classList.add('badge-warning-pill');
                    badges.trigger.classList.remove('badge-danger-pill');
                }
                if (triggerSyncMessage) {
                    triggerSyncMessage.innerHTML = `⚠️ <strong>Mislykket trigger pga. Auto-PEEP (${peepi.toFixed(1)} cmH₂O):</strong> Pasienten må overvinne mottrykket i lungene før flow snur til positiv. Generert triggerflow er kun ${patientPeakFlow} L/min vs krav ${trigFlow.toFixed(1)} L/min.`;
                }
            } else if (patientPeakFlow >= trigFlow) {
                if (triggerSyncBox) triggerSyncBox.className = 'trigger-sync-box';
                if (triggerGaugeFill) triggerGaugeFill.className = 'trigger-gauge-fill';
                if (triggerSyncBadge) {
                    triggerSyncBadge.className = 'trigger-sync-status-badge status-ok';
                    triggerSyncBadge.textContent = '✅ 100% Utløst';
                }
                if (badges.trigger) badges.trigger.classList.remove('badge-warning-pill', 'badge-danger-pill');
                if (triggerSyncMessage) {
                    triggerSyncMessage.innerHTML = `Flow-trigger på <strong>${trigFlow.toFixed(1)} L/min</strong>: Pasienten genererer nok flow (${patientPeakFlow} L/min) til å utløse maskinen pålitelig ved hvert innpust (100%).`;
                }
            } else {
                if (triggerSyncBox) triggerSyncBox.className = 'trigger-sync-box warning-state';
                if (triggerGaugeFill) triggerGaugeFill.className = 'trigger-gauge-fill warning-fill';
                if (triggerSyncBadge) {
                    triggerSyncBadge.className = 'trigger-sync-status-badge status-warning';
                    triggerSyncBadge.textContent = '⚠️ Mislykket trigger';
                }
                if (badges.trigger) {
                    badges.trigger.classList.add('badge-warning-pill');
                    badges.trigger.classList.remove('badge-danger-pill');
                }
                if (triggerSyncMessage) {
                    triggerSyncMessage.innerHTML = `⚠️ <strong>Mislykket innsats (Missed effort):</strong> Pasientens innsatsflow (${patientPeakFlow} L/min) når ikke triggerkravet (${trigFlow.toFixed(1)} L/min). Innsatsen sees i flowkurven uten at maskinen gir trykkstøtte!`;
                }
            }
        } else {
            // Trykkmodus
            if (syncPatientLabel && syncPatientLabel.classList.contains('sync-label')) {
                syncPatientLabel.textContent = 'Pasientinnsats:';
                syncPatientLabel.removeAttribute('title');
            }
            if (syncTriggerReq) syncTriggerReq.textContent = `-${trigPress.toFixed(1)} cmH₂O`;
            if (syncPatientEffort) {
                syncPatientEffort.textContent = `Pmus ${pmus.toFixed(1)}`;
                syncPatientEffort.removeAttribute('title');
            }
            if (triggerSyncBox) triggerSyncBox.className = 'trigger-sync-box';
            if (triggerGaugeFill) triggerGaugeFill.className = 'trigger-gauge-fill';
            if (triggerSyncBadge) {
                triggerSyncBadge.className = 'trigger-sync-status-badge status-ok';
                triggerSyncBadge.textContent = '⚡ Trykk-trigger';
            }
            if (badges.trigger) badges.trigger.classList.remove('badge-warning-pill', 'badge-danger-pill');
            if (triggerSyncMessage) {
                triggerSyncMessage.innerHTML = `Trykk-trigger på <strong>${trigPress.toFixed(1)} cmH₂O</strong>: Maskinen trigger innpust når masketrykket suges under ${(simulator.settings.epap - trigPress).toFixed(1)} cmH₂O.`;
            }
        }
    }

    // Kjønnsvalg (D5)
    function setGender(gender) {
        currentGender = gender || 'male';
        if (btnGenderMale && btnGenderFemale) {
            if (currentGender === 'female') {
                btnGenderFemale.classList.add('active');
                btnGenderMale.classList.remove('active');
            } else {
                btnGenderMale.classList.add('active');
                btnGenderFemale.classList.remove('active');
            }
        }
        updateSimulatorFromUI();
    }

    if (btnGenderMale && btnGenderFemale) {
        btnGenderMale.addEventListener('click', () => {
            setGender('male');
        });
        btnGenderFemale.addEventListener('click', () => {
            setGender('female');
        });
    }

    // 3. Koble til Sliders og synkroniser UI
    function updateSimulatorFromUI() {
        const ipap = parseFloat(sliders.ipap.value);
        let epap = parseFloat(sliders.epap.value);

        // Sikre at IPAP alltid er minst 2 cmH2O høyere enn EPAP
        if (epap >= ipap) {
            epap = ipap - 2;
            sliders.epap.value = epap;
        }

        const deltaP = ipap - epap;
        const tiSet = sliders.tiSet ? parseFloat(sliders.tiSet.value) : 1.0;
        const backupRate = sliders.backupRate ? parseInt(sliders.backupRate.value, 10) : 12;
        const stActive = checkStActive ? checkStActive.checked : false;
        const rr = parseInt(sliders.rr.value, 10);
        const fio2 = parseInt(sliders.fio2.value, 10);
        const rrSpont = parseInt(sliders.rrSpont.value, 10);
        const compliance = parseFloat(sliders.compliance.value);
        const resistance = parseFloat(sliders.resistance.value);
        const flowLimitation = sliders.flowLimitation ? parseFloat(sliders.flowLimitation.value) : 0.0;
        const critClose = (sliders.criticalClosingPressure && !isNaN(parseFloat(sliders.criticalClosingPressure.value)))
            ? parseFloat(sliders.criticalClosingPressure.value) : ((flowLimitation / 0.70) * 8.0);
        const conductance = (sliders.flowConductance && !isNaN(parseFloat(sliders.flowConductance.value)))
            ? parseFloat(sliders.flowConductance.value) : Math.max(0.1, 1.0 - (flowLimitation / 0.70) * 0.5);
        const stenting = (sliders.peepStenting && !isNaN(parseFloat(sliders.peepStenting.value)))
            ? parseFloat(sliders.peepStenting.value) : (flowLimitation > 0 ? 70 : 0);
        const recoil = sliders.recoil ? parseFloat(sliders.recoil.value) : (rrSpont > 0 ? 25 : 0);
        const responsiveness = sliders.responsiveness ? parseFloat(sliders.responsiveness.value) : 50;
        const responsivePmus = checkResponsivePmus ? checkResponsivePmus.checked : false;
        const expRatio = sliders.expRatio ? parseFloat(sliders.expRatio.value) : 1.5;
        const pmus = parseFloat(sliders.pmus.value);
        const tiNeural = parseFloat(sliders.tiNeural.value);
        const kobleTiNeural = checkKobleTiNeural ? checkKobleTiNeural.checked : true;
        let triseNeural = (sliders.triseNeural && !isNaN(parseFloat(sliders.triseNeural.value))) ? parseFloat(sliders.triseNeural.value) : 0.30;
        let tholdNeural = (sliders.tholdNeural && !isNaN(parseFloat(sliders.tholdNeural.value))) ? parseFloat(sliders.tholdNeural.value) : 0.00;
        let tdecayNeural = (sliders.tdecayNeural && !isNaN(parseFloat(sliders.tdecayNeural.value))) ? parseFloat(sliders.tdecayNeural.value) : 0.40;

        if (kobleTiNeural) {
            triseNeural = 0.30 * tiNeural;
            tholdNeural = 0.00 * tiNeural;
            tdecayNeural = 0.40 * tiNeural;

            if (sliders.triseNeural) {
                sliders.triseNeural.value = triseNeural.toFixed(2);
                sliders.triseNeural.disabled = true;
            }
            if (sliders.tholdNeural) {
                sliders.tholdNeural.value = tholdNeural.toFixed(2);
                sliders.tholdNeural.disabled = true;
            }
            if (sliders.tdecayNeural) {
                sliders.tdecayNeural.value = tdecayNeural.toFixed(2);
                sliders.tdecayNeural.disabled = true;
            }

            if (cardTriseNeural) cardTriseNeural.classList.add('control-disabled');
            if (cardTholdNeural) cardTholdNeural.classList.add('control-disabled');
            if (cardTdecayNeural) cardTdecayNeural.classList.add('control-disabled');

            document.querySelectorAll('.step-btn[data-target="sliderTriseNeural"], .step-btn[data-target="sliderTholdNeural"], .step-btn[data-target="sliderTdecayNeural"]').forEach(btn => btn.disabled = true);
        } else {
            if (sliders.triseNeural) sliders.triseNeural.disabled = false;
            if (sliders.tholdNeural) sliders.tholdNeural.disabled = false;
            if (sliders.tdecayNeural) sliders.tdecayNeural.disabled = false;

            if (cardTriseNeural) cardTriseNeural.classList.remove('control-disabled');
            if (cardTholdNeural) cardTholdNeural.classList.remove('control-disabled');
            if (cardTdecayNeural) cardTdecayNeural.classList.remove('control-disabled');

            document.querySelectorAll('.step-btn[data-target="sliderTriseNeural"], .step-btn[data-target="sliderTholdNeural"], .step-btn[data-target="sliderTdecayNeural"]').forEach(btn => btn.disabled = false);
        }
        const pmusExp = parseFloat(sliders.pmusExp.value);
        const variability = parseInt(sliders.variability.value, 10);
        const cardiac = parseFloat(sliders.cardiacArtifact.value);
        const cycling = parseFloat(sliders.cycling.value) / 100;
        const tiMax = sliders.tiMax ? parseFloat(sliders.tiMax.value) : (simulator.settings.tiMax || 2.0);
        const riseTime = parseFloat(sliders.riseTime.value) / 1000;
        const leak = sliders.leak ? parseFloat(sliders.leak.value) : 0;
        const triggerVal = parseFloat(sliders.trigger.value);
        const pmusOffset = sliders.pmusOffset ? parseFloat(sliders.pmusOffset.value) : 0.0;

        // Fase 4: Pasientantropometri og Alarmgrenser
        const height = sliders.height ? parseInt(sliders.height.value, 10) : 175;
        const apneaDelay = sliders.apneaDelay ? parseInt(sliders.apneaDelay.value, 10) : 20;
        const alarmLeakVal = sliders.alarmLeak ? parseFloat(sliders.alarmLeak.value) : 40;
        const alarmLowVt = sliders.alarmLowVt ? parseInt(sliders.alarmLowVt.value, 10) : 300;
        const alarmHighVt = sliders.alarmHighVt ? parseInt(sliders.alarmHighVt.value, 10) : 800;
        const alarmLowRr = sliders.alarmLowRr ? parseInt(sliders.alarmLowRr.value, 10) : 0;
        const alarmHighRr = sliders.alarmHighRr ? parseInt(sliders.alarmHighRr.value, 10) : 30;
        const alarmHighPpeak = sliders.alarmHighPpeak ? parseFloat(sliders.alarmHighPpeak.value) : 40;

        // 6.1: Volumkontroll
        const vcTidalVolume = sliders.vcTidalVolume ? parseInt(sliders.vcTidalVolume.value, 10) : 500;
        const vcPeakFlow = sliders.vcPeakFlow ? parseInt(sliders.vcPeakFlow.value, 10) : 60;
        const inspPause = sliders.inspPause ? parseFloat(sliders.inspPause.value) : 0;

        // 6.2: Ikke-lineær trykk/volum-kurve
        const stressIndexOn = !!(checkStressIndex && checkStressIndex.checked);
        const stressIndexVal = sliders.stressIndex ? parseFloat(sliders.stressIndex.value) : 1.0;
        const uipOn = !!(checkUip && checkUip.checked);
        const uipVal = sliders.uip ? parseInt(sliders.uip.value, 10) : 30;
        const airwayOpening = sliders.airwayOpening ? parseInt(sliders.airwayOpening.value, 10) : 0;
        const recruitedVolume = sliders.recruitedVolume ? parseInt(sliders.recruitedVolume.value, 10) : 0;

        // 6.3: Entrainment
        const entrainmentOn = !!(checkEntrainment && checkEntrainment.checked);

        // Oppdater simulatoren
        simulator.settings.mode = selectMode ? selectMode.value : 'PS';
        simulator.settings.ipap = ipap;
        simulator.settings.epap = epap;
        simulator.settings.tiSet = tiSet;
        simulator.settings.backupRate = backupRate;
        simulator.settings.stActive = stActive;
        simulator.settings.rr = rr;
        simulator.settings.fio2 = fio2;
        simulator.settings.riseTime = riseTime;
        simulator.settings.cyclingPercent = cycling;
        simulator.settings.tiMax = tiMax;
        simulator.settings.leak = leak;
        simulator.settings.apneaDelay = apneaDelay;
        if (simulator.settings.alarmLeakUnit === 'percent') {
            simulator.settings.alarmLeakPercentLimit = alarmLeakVal;
        } else {
            simulator.settings.alarmLeakLimit = alarmLeakVal;
        }
        simulator.settings.alarmLowVtLimit = alarmLowVt;
        simulator.settings.alarmHighVtLimit = alarmHighVt;
        simulator.settings.alarmLowRrLimit = alarmLowRr;
        simulator.settings.alarmHighRrLimit = alarmHighRr;
        simulator.settings.alarmHighPpeak = alarmHighPpeak;
        simulator.settings.alarmHighPpeakDelta = alarmHighPpeak - ipap;

        if (simulator.settings.triggerMode === 'flow') {
            simulator.settings.triggerFlow = triggerVal;
        } else {
            simulator.settings.triggerPressure = triggerVal;
        }

        simulator.patient.compliance = compliance;
        simulator.patient.resistance = resistance;
        simulator.patient.flowLimitation = flowLimitation;
        simulator.patient.criticalClosingPressure = critClose;
        simulator.patient.flowConductance = conductance;
        simulator.patient.peepStenting = stenting;
        simulator.patient.recoilStrength = recoil;
        simulator.patient.expRatio = expRatio;
        simulator.patient.height = height;
        simulator.patient.gender = currentGender;

        // 6.1: Volumkontroll
        simulator.settings.vcTidalVolume = vcTidalVolume;
        simulator.settings.vcPeakFlow = vcPeakFlow;
        simulator.settings.inspPause = inspPause;

        // 6.2: Ikke-lineær trykk/volum-kurve
        simulator.patient.stressIndexEnabled = stressIndexOn;
        simulator.patient.stressIndex = stressIndexVal;
        simulator.patient.uipEnabled = uipOn;
        simulator.patient.uipThreshold = uipVal;
        simulator.patient.airwayOpeningPressure = airwayOpening;
        // Rekruttert volum har bare mening sammen med et åpningstrykk: uten en terskel
        // finnes det ingen kollaps å åpne opp, og volumet ville bare ligge der konstant.
        simulator.patient.recruitedVolume = (airwayOpening > 0) ? recruitedVolume : 0;

        // 6.3: Entrainment
        simulator.patientDrive.entrainmentEnabled = entrainmentOn;

        // 5.1: Pasient Recoil
        const cardRecoil = document.getElementById('cardRecoil');
        if (cardRecoil) {
            cardRecoil.classList.remove('control-disabled');
            if (sliders.recoil) sliders.recoil.disabled = false;
        }

        // 5.2: Responsiv pasientinnsats
        if (cardResponsivePmus) {
            cardResponsivePmus.classList.remove('control-disabled');
            if (checkResponsivePmus) checkResponsivePmus.disabled = false;
            const isRespActive = checkResponsivePmus && checkResponsivePmus.checked;
            if (sliders.responsiveness) sliders.responsiveness.disabled = !isRespActive;
            document.querySelectorAll('.step-btn[data-target="sliderResponsiveness"]').forEach(btn => btn.disabled = !isRespActive);
        }

        // 5.5: Forskyvning av pasientinnsats
        const cardPmusOffset = document.getElementById('cardPmusOffset');
        if (cardPmusOffset) {
            cardPmusOffset.classList.remove('control-disabled');
            if (sliders.pmusOffset) sliders.pmusOffset.disabled = false;
            document.querySelectorAll('.step-btn[data-target="sliderPmusOffset"]').forEach(btn => btn.disabled = false);
        }

        simulator.patientDrive.responsive = (rrSpont > 0) && responsivePmus;
        simulator.patientDrive.responsiveness = responsiveness;
        simulator.patientDrive.pmusOffset = pmusOffset;
        simulator.patientDrive.rrSpont = rrSpont;
        simulator.patientDrive.pmusMax = pmus;
        simulator.patientDrive.tiNeural = tiNeural;
        simulator.patientDrive.kobleTiNeural = kobleTiNeural;
        simulator.patientDrive.triseNeural = kobleTiNeural ? null : triseNeural;
        simulator.patientDrive.tholdNeural = kobleTiNeural ? null : tholdNeural;
        simulator.patientDrive.tdecayNeural = kobleTiNeural ? null : tdecayNeural;
        simulator.patientDrive.pmusExp = pmusExp;
        simulator.patientDrive.variability = variability;
        simulator.patientDrive.cardiacArtifact = cardiac;

        // D1: Viser både absolutt trykk og ΔP samtidig i begge moduser
        if (badges.ipap) badges.ipap.textContent = `${ipap} cmH₂O (ΔP ${deltaP})`;
        if (labelDeltaPInfo) labelDeltaPInfo.textContent = `ΔP over PEEP: ${deltaP} cmH₂O`;
        if (badges.epap) badges.epap.textContent = `${epap} cmH₂O`;
        if (badges.tiSet) badges.tiSet.textContent = `${tiSet.toFixed(2)} s`;
        if (badges.backupRate) badges.backupRate.textContent = `${backupRate} /min`;
        if (badges.rr) badges.rr.textContent = `${rr} /min`;
        if (badges.fio2) badges.fio2.textContent = `${fio2} %`;
        if (badges.compliance) badges.compliance.textContent = `${compliance} ml/cmH₂O`;
        if (badges.resistance) badges.resistance.textContent = `${resistance} cmH₂O/(L/s)`;
        if (badges.flowLimitation) badges.flowLimitation.textContent = `${flowLimitation.toFixed(2)}`;
        if (badges.criticalClosingPressure) badges.criticalClosingPressure.textContent = `${critClose.toFixed(1)} cmH₂O`;
        if (badges.flowConductance) badges.flowConductance.textContent = `${conductance.toFixed(2)}`;
        if (badges.peepStenting) badges.peepStenting.textContent = `${Math.round(stenting)} %`;
        if (badges.recoil) badges.recoil.textContent = `${Math.round(recoil)} %`;
        if (badges.responsiveness) badges.responsiveness.textContent = `${Math.round(responsiveness)} %`;
        if (badges.expRatio) badges.expRatio.textContent = `${expRatio.toFixed(1)} ×`;
        if (badges.rrSpont) badges.rrSpont.textContent = `${rrSpont} /min`;
        if (badges.pmus) badges.pmus.textContent = `${pmus.toFixed(1)} cmH₂O`;
        let pmusOffsetStatus = 'synkronisert';
        if (pmusOffset < -0.01) {
            pmusOffsetStatus = 'forskjøvet tidligere';
        } else if (pmusOffset > 0.01) {
            pmusOffsetStatus = 'forskjøvet senere';
        }
        if (badges.pmusOffset) {
            const sign = pmusOffset > 0 ? '+' : '';
            badges.pmusOffset.textContent = `${sign}${pmusOffset.toFixed(2)} s (${pmusOffsetStatus})`;
        }
        const labelPmusOffsetStatus = document.getElementById('labelPmusOffsetStatus');
        if (labelPmusOffsetStatus) {
            labelPmusOffsetStatus.textContent = pmusOffsetStatus;
        }
        if (badges.tiNeural) badges.tiNeural.textContent = `${tiNeural.toFixed(2)} s`;
        if (badges.triseNeural) badges.triseNeural.textContent = `${triseNeural.toFixed(2)} s`;
        if (badges.tholdNeural) badges.tholdNeural.textContent = `${tholdNeural.toFixed(2)} s`;
        if (badges.tdecayNeural) badges.tdecayNeural.textContent = `${tdecayNeural.toFixed(2)} s`;
        if (badges.pmusExp) badges.pmusExp.textContent = `${pmusExp.toFixed(1)} cmH₂O`;
        if (badges.variability) badges.variability.textContent = `${variability} %`;
        if (badges.cardiacArtifact) badges.cardiacArtifact.textContent = `${cardiac.toFixed(1)} L/min`;
        if (badges.cycling) badges.cycling.textContent = `${Math.round(cycling * 100)} %`;
        if (badges.tiMax) badges.tiMax.textContent = `${tiMax.toFixed(1)} s`;
        if (badges.riseTime) badges.riseTime.textContent = `${Math.round(riseTime * 1000)} ms`;
        if (badges.leak) badges.leak.textContent = `${leak} L/min`;

        // =====================================================================
        // 6.1 / 6.2 / 6.3: Nye kontroller — merkelapper og avhengigheter
        // =====================================================================
        const erVc = (simulator.settings.mode === 'VC');

        // 6.1: Volumkontroll. Kortene er alltid redigerbare i generatoren, men
        // dempes visuelt utenfor VC slik at forfatteren ser hva som er i spill.
        [cardVcTidalVolume, cardVcPeakFlow, cardInspPause].forEach(card => {
            if (card) card.style.opacity = erVc ? '1' : '0.45';
        });
        if (badges.vcTidalVolume) badges.vcTidalVolume.textContent = `${vcTidalVolume} ml`;
        if (badges.vcPeakFlow) badges.vcPeakFlow.textContent = `${vcPeakFlow} L/min`;
        if (badges.inspPause) badges.inspPause.textContent = `${inspPause.toFixed(2)} s`;

        const vcIbw = simulator.getPatientIBW();
        if (labelVcVtPerKg) {
            labelVcVtPerKg.textContent = `${(vcTidalVolume / vcIbw).toFixed(1)} ml/kg IBW`;
        }
        if (labelVcTiCalc) {
            // Firkantflow: Ti = Vt / flow. Desellererende rampe har middelflow 0,75 × topp.
            const middelflow = (simulator.settings.vcFlowPattern === 'decelerating')
                ? vcPeakFlow * 0.75
                : vcPeakFlow;
            const tiFlow = (vcTidalVolume / 1000) / (middelflow / 60);
            labelVcTiCalc.innerHTML = `T<sub>i</sub> ≈ ${(tiFlow + inspPause).toFixed(2)} s`;
        }
        if (labelInspPauseStatus) {
            if (!erVc) {
                labelInspPauseStatus.textContent = 'Gjelder i VC-modus';
                labelInspPauseStatus.style.color = 'var(--text-dim)';
            } else if (inspPause > 0) {
                labelInspPauseStatus.textContent = '✅ Platåtrykk måles';
                labelInspPauseStatus.style.color = 'var(--color-accent)';
            } else {
                labelInspPauseStatus.textContent = 'Uten pause: intet ekte platå';
                labelInspPauseStatus.style.color = 'var(--color-warning)';
            }
        }

        // 6.2: Ikke-lineær trykk/volum-kurve
        if (sliders.stressIndex) sliders.stressIndex.disabled = !stressIndexOn;
        document.querySelectorAll('.step-btn[data-target="sliderStressIndex"]').forEach(b => b.disabled = !stressIndexOn);
        if (badges.stressIndex) badges.stressIndex.textContent = stressIndexVal.toFixed(2);
        if (labelStressIndexStatus) {
            if (!stressIndexOn) {
                labelStressIndexStatus.textContent = 'Av (lineær kurve)';
                labelStressIndexStatus.style.color = 'var(--text-dim)';
            } else if (!erVc) {
                labelStressIndexStatus.textContent = '⚠️ Avleses kun under konstant flow (VC)';
                labelStressIndexStatus.style.color = 'var(--color-warning)';
            } else if (stressIndexVal > 1.05) {
                labelStressIndexStatus.textContent = 'Overdistensjon (oppadbøyd)';
                labelStressIndexStatus.style.color = '#f472b6';
            } else if (stressIndexVal < 0.95) {
                labelStressIndexStatus.textContent = 'Tidal rekruttering (nedadbøyd)';
                labelStressIndexStatus.style.color = '#f472b6';
            } else {
                labelStressIndexStatus.textContent = '1.00 = lineær';
                labelStressIndexStatus.style.color = 'var(--color-accent)';
            }
        }

        if (sliders.uip) sliders.uip.disabled = !uipOn;
        document.querySelectorAll('.step-btn[data-target="sliderUip"]').forEach(b => b.disabled = !uipOn);
        if (badges.uip) badges.uip.textContent = uipOn ? `${uipVal} cmH₂O` : `${uipVal} cmH₂O (Av)`;

        if (badges.airwayOpening) {
            badges.airwayOpening.textContent = (airwayOpening > 0) ? `${airwayOpening} cmH₂O` : '0 cmH₂O (Av)';
        }
        if (labelAirwayOpeningStatus) {
            if (airwayOpening <= 0) {
                labelAirwayOpeningStatus.textContent = 'Luftveien alltid åpen';
                labelAirwayOpeningStatus.style.color = 'var(--text-dim)';
            } else {
                // Lukketrykket er 60 % av åpningstrykket (hysterese i P/V-sløyfen)
                const lukketrykk = airwayOpening * 0.6;
                const holdes = epap >= lukketrykk;
                labelAirwayOpeningStatus.textContent = holdes
                    ? `Lukketrykk ${lukketrykk.toFixed(1)} — EPAP holder åpen`
                    : `Lukketrykk ${lukketrykk.toFixed(1)} — kollapser hver utpust`;
                labelAirwayOpeningStatus.style.color = holdes ? 'var(--color-accent)' : 'var(--color-warning)';
            }
        }

        const rekrutteringMulig = (airwayOpening > 0);
        if (sliders.recruitedVolume) sliders.recruitedVolume.disabled = !rekrutteringMulig;
        document.querySelectorAll('.step-btn[data-target="sliderRecruitedVolume"]').forEach(b => b.disabled = !rekrutteringMulig);
        if (cardRecruitedVolume) cardRecruitedVolume.style.opacity = rekrutteringMulig ? '1' : '0.45';
        if (badges.recruitedVolume) {
            badges.recruitedVolume.textContent = rekrutteringMulig ? `${recruitedVolume} ml` : '0 ml (Av)';
        }
        if (labelRecruitedVolumeStatus) {
            labelRecruitedVolumeStatus.textContent = rekrutteringMulig
                ? 'Vinnes ved åpning, slippes ved kollaps'
                : 'Krever åpningstrykk > 0';
            labelRecruitedVolumeStatus.style.color = rekrutteringMulig ? 'var(--color-accent)' : 'var(--text-dim)';
        }

        // 6.3: Entrainment
        Object.keys(entrainBtns).forEach(key => {
            const btn = entrainBtns[key];
            if (btn) btn.disabled = !entrainmentOn;
        });
        if (labelEntrainmentStatus) {
            const harMaskinpust = erVc || simulator.settings.mode === 'PC' || stActive;
            if (!entrainmentOn) {
                labelEntrainmentStatus.textContent = 'Av — pasienten puster med egen frekvens';
                labelEntrainmentStatus.style.color = 'var(--text-dim)';
            } else if (rrSpont <= 0) {
                labelEntrainmentStatus.textContent = '⚠️ Krever spontan frekvens > 0';
                labelEntrainmentStatus.style.color = 'var(--color-warning)';
            } else if (!harMaskinpust) {
                labelEntrainmentStatus.textContent = '⚠️ Krever maskinutløste pust (PC, VC eller ST-backup)';
                labelEntrainmentStatus.style.color = 'var(--color-warning)';
            } else {
                const r = simulator.patientDrive.entrainmentRatio || 1;
                labelEntrainmentStatus.textContent = `✅ Innsats utløses av hvert ${r === 1 ? '' : r + '.'} maskinpust (1:${r})`;
                labelEntrainmentStatus.style.color = 'var(--color-accent)';
            }
        }

        // Fase 4 Badges & Labels
        if (badges.height) badges.height.textContent = `${height} cm`;
        const currentIbw = simulator.getPatientIBW();
        if (badgeIbwCalc) badgeIbwCalc.textContent = `IBW: ${currentIbw} kg`;
        if (badges.apneaDelay) badges.apneaDelay.textContent = `${apneaDelay} s`;
        if (badges.alarmLeak) {
            if (simulator.settings.alarmLeakUnit === 'percent') {
                badges.alarmLeak.textContent = `${Math.round(alarmLeakVal)} %`;
            } else {
                badges.alarmLeak.textContent = `${Math.round(alarmLeakVal)} L/min`;
            }
        }
        if (badges.alarmLowVt) badges.alarmLowVt.textContent = `Lav: ${alarmLowVt} ml`;
        if (badges.alarmHighVt) badges.alarmHighVt.textContent = `Høy: ${alarmHighVt} ml`;
        if (labelAlarmLowVtVal) labelAlarmLowVtVal.textContent = `${alarmLowVt} ml`;
        if (labelAlarmHighVtVal) labelAlarmHighVtVal.textContent = `${alarmHighVt} ml`;

        if (badges.alarmLowRr) badges.alarmLowRr.textContent = `Lav: ${alarmLowRr} /min`;
        if (badges.alarmHighRr) badges.alarmHighRr.textContent = `Høy: ${alarmHighRr} /min`;
        if (labelAlarmLowRrVal) labelAlarmLowRrVal.textContent = alarmLowRr === 0 ? `0 /min (Av)` : `${alarmLowRr} /min`;
        if (labelAlarmHighRrVal) labelAlarmHighRrVal.textContent = `${alarmHighRr} /min`;

        if (badges.alarmHighPpeak) {
            badges.alarmHighPpeak.textContent = `${alarmHighPpeak} cmH₂O`;
        }

        if (badges.trigger) {
            if (simulator.settings.triggerMode === 'flow') {
                badges.trigger.textContent = `${triggerVal.toFixed(1)} L/min`;
            } else {
                badges.trigger.textContent = `${triggerVal.toFixed(1)} cmH₂O`;
            }
        }

        updateTriggerSyncUI();

        // C4: Oppdater modusetiketten dynamisk når ST-innstillinger endres
        if (simulator.settings.mode === 'PS' && modeBadge) {
            modeBadge.innerHTML = '<span>Modus: BPAP</span>';
        }
        updateInsights();
    }

    // Lytt på slider-endringer
    Object.values(sliders).forEach(slider => {
        if (!slider) return;
        slider.addEventListener('input', () => {
            updateSimulatorFromUI();
            updateInsights();
        });
    });

    if (checkStActive) {
        checkStActive.addEventListener('change', () => {
            updateSimulatorFromUI();
            updateInsights();
        });
    }

    if (checkKobleTiNeural) {
        checkKobleTiNeural.addEventListener('change', () => {
            updateSimulatorFromUI();
            updateInsights();
        });
    }

    if (checkResponsivePmus) {
        checkResponsivePmus.addEventListener('change', () => {
            updateSimulatorFromUI();
            updateInsights();
        });
    }

    // 6.2 / 6.3: Avkrysningsbokser for ikke-lineær P/V-kurve og entrainment
    [checkStressIndex, checkUip, checkEntrainment].forEach(box => {
        if (!box) return;
        box.addEventListener('change', () => {
            updateSimulatorFromUI();
            updateInsights();
        });
    });

    // 5.6: Avkryssingsboks for visning av P0.1
    if (checkShowP01) {
        checkShowP01.addEventListener('change', () => {
            if (cardSecP01) {
                cardSecP01.style.display = checkShowP01.checked ? '' : 'none';
            }
        });
    }

    // Trinnknapper (+ / -)
    document.querySelectorAll('.step-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            const step = parseFloat(btn.getAttribute('data-step'));
            const targetSlider = document.getElementById(targetId);
            if (targetSlider && !targetSlider.disabled) {
                let currentVal = parseFloat(targetSlider.value);
                let min = parseFloat(targetSlider.min);
                let max = parseFloat(targetSlider.max);
                let newVal = Math.min(max, Math.max(min, currentVal + step));
                
                if (step % 1 !== 0) {
                    const decimals = (step.toString().split('.')[1] || '').length;
                    newVal = parseFloat(newVal.toFixed(decimals));
                }
                
                targetSlider.value = newVal;
                targetSlider.dispatchEvent(new Event('input'));
            }
        });
    });


    // =========================================================================
    // NØYTRAL BASELINE / NULLSTILLING
    // =========================================================================
    function resetToNeutralBaseline() {
        simulator.reset();
        currentGender = 'male';
        if (btnGenderMale) btnGenderMale.classList.add('active');
        if (btnGenderFemale) btnGenderFemale.classList.remove('active');

        // Maskininnstillinger
        if (selectMode) selectMode.value = 'PS';
        if (sliders.ipap) sliders.ipap.value = 10;
        if (sliders.epap) sliders.epap.value = 5;
        if (sliders.tiSet) sliders.tiSet.value = 1.0;
        if (sliders.backupRate) sliders.backupRate.value = 12;
        if (checkStActive) checkStActive.checked = false;
        if (sliders.rr) sliders.rr.value = 12;
        if (sliders.fio2) sliders.fio2.value = 30;
        if (sliders.riseTime) sliders.riseTime.value = 150;
        if (sliders.cycling) sliders.cycling.value = 25;
        if (sliders.tiMax) sliders.tiMax.value = 2.0;
        if (sliders.leak) sliders.leak.value = 0;

        // 6.1: Volumkontroll
        if (sliders.vcTidalVolume) sliders.vcTidalVolume.value = 500;
        if (sliders.vcPeakFlow) sliders.vcPeakFlow.value = 60;
        if (sliders.inspPause) sliders.inspPause.value = 0;
        simulator.settings.vcFlowPattern = 'constant';
        if (btnFlowPatternConstant) btnFlowPatternConstant.classList.add('active');
        if (btnFlowPatternDecel) btnFlowPatternDecel.classList.remove('active');

        // 6.2: Ikke-lineær trykk/volum-kurve
        if (checkStressIndex) checkStressIndex.checked = false;
        if (sliders.stressIndex) sliders.stressIndex.value = 1.0;
        if (checkUip) checkUip.checked = false;
        if (sliders.uip) sliders.uip.value = 30;
        if (sliders.airwayOpening) sliders.airwayOpening.value = 0;
        if (sliders.recruitedVolume) sliders.recruitedVolume.value = 0;

        // 6.3: Entrainment
        if (checkEntrainment) checkEntrainment.checked = false;
        simulator.patientDrive.entrainmentRatio = 1;
        Object.keys(entrainBtns).forEach(key => {
            const btn = entrainBtns[key];
            if (btn) btn.classList.toggle('active', key === '1');
        });

        // Pasientfysiologi
        if (sliders.compliance) sliders.compliance.value = 60;
        if (sliders.resistance) sliders.resistance.value = 5.0;
        if (sliders.flowLimitation) sliders.flowLimitation.value = 0.0;
        if (sliders.criticalClosingPressure) sliders.criticalClosingPressure.value = 0.0;
        if (sliders.flowConductance) sliders.flowConductance.value = 1.0;
        if (sliders.peepStenting) sliders.peepStenting.value = 0;
        setSeverityButtonActive('none');

        if (sliders.recoil) sliders.recoil.value = 25;
        if (sliders.expRatio) sliders.expRatio.value = 1.2;
        if (sliders.rrSpont) sliders.rrSpont.value = 12;
        if (sliders.pmus) sliders.pmus.value = 5.0;
        if (checkResponsivePmus) checkResponsivePmus.checked = false;
        if (sliders.responsiveness) sliders.responsiveness.value = 50;
        if (sliders.pmusOffset) sliders.pmusOffset.value = 0.0;
        if (sliders.tiNeural) sliders.tiNeural.value = 1.0;
        if (checkKobleTiNeural) checkKobleTiNeural.checked = true;
        if (sliders.triseNeural) sliders.triseNeural.value = 0.30;
        if (sliders.tholdNeural) sliders.tholdNeural.value = 0.00;
        if (sliders.tdecayNeural) sliders.tdecayNeural.value = 0.40;
        if (sliders.pmusExp) sliders.pmusExp.value = 0.0;
        if (sliders.variability) sliders.variability.value = 0;
        if (sliders.cardiacArtifact) sliders.cardiacArtifact.value = 0.0;
        if (sliders.height) sliders.height.value = 175;

        // Trigger
        setTriggerMode('flow');
        if (sliders.trigger) sliders.trigger.value = 1.5;

        // Monitor & Alarmer
        if (checkShowTrueCurves) {
            checkShowTrueCurves.checked = false;
            renderer.showTrueCurves = false;
        }
        renderer.setAnnotations([]);
        setSweepDurationUI(15);
        setScaleModeUI(false);
        setLeakAlarmUnit('lmin');
        if (sliders.apneaDelay) sliders.apneaDelay.value = 20;
        if (sliders.alarmLeak) sliders.alarmLeak.value = 40;
        if (sliders.alarmLowVt) sliders.alarmLowVt.value = 300;
        if (sliders.alarmHighVt) sliders.alarmHighVt.value = 800;
        if (sliders.alarmLowRr) sliders.alarmLowRr.value = 0;
        if (sliders.alarmHighRr) sliders.alarmHighRr.value = 30;
        if (sliders.alarmHighPpeak) sliders.alarmHighPpeak.value = 40;

        setVentilationMode('PS');
        updateSimulatorFromUI();
        updateInsights();
    }

    // 5. Fane-veksling
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.style.display = 'none');

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.style.display = 'block';
            }
        });
    });

    // Monitor verktøylinje event listeners (C8, D3, C9)
    function setSweepDurationUI(duration = 15) {
        if (btnSweep15) {
            btnSweep15.classList.add('active');
        }
        renderer.setSweepDuration(15);
    }

    if (btnSweep15) btnSweep15.addEventListener('click', () => setSweepDurationUI(15));

    function setScaleModeUI(isAuto = true) {
        if (btnScaleLocked) btnScaleLocked.classList.toggle('active', !isAuto);
        if (btnScaleAuto) btnScaleAuto.classList.add('active');
        renderer.setAutoScale('all', true);
    }

    if (btnScaleLocked) btnScaleLocked.addEventListener('click', () => setScaleModeUI(false));
    if (btnScaleAuto) btnScaleAuto.addEventListener('click', () => setScaleModeUI(true));

    // =========================================================================
    // D6: UNDERVISNINGSMODUS (FRYS, KURSOR, KOPIER BILDE, VIS FASIT)
    // =========================================================================
    // 1. Frys / Pause
    btnPause.addEventListener('click', () => {
        isPaused = !isPaused;
        simulator.isRunning = !isPaused;
        renderer.setFrozen(isPaused);

        if (isPaused) {
            pauseIcon.textContent = '▶';
            pauseText.textContent = 'Fortsett';
            btnPause.classList.add('active');
            showToast('❄️ <strong>Simulering fryst:</strong> Beveg musen eller trykk på kurven for å inspisere verdier.');
        } else {
            pauseIcon.textContent = '⏸';
            pauseText.textContent = 'Pause / Frys';
            btnPause.classList.remove('active');
            renderer.clearCursor();
            lastTimestamp = performance.now();
        }
    });

    // 2. Kursor-sporing over canvas (D6)
    const canvasElem = document.getElementById('waveformCanvas');
    function handleCursorMove(e) {
        if (!canvasElem) return;
        const rect = canvasElem.getBoundingClientRect();
        const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
        const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        renderer.setCursor(x, y);
    }

    function handleCursorLeave() {
        renderer.clearCursor();
    }

    if (canvasElem) {
        canvasElem.addEventListener('mousemove', handleCursorMove);
        canvasElem.addEventListener('mouseleave', handleCursorLeave);
        canvasElem.addEventListener('touchmove', handleCursorMove, { passive: true });
        canvasElem.addEventListener('touchstart', handleCursorMove, { passive: true });
        canvasElem.addEventListener('touchend', handleCursorLeave);
    }

    // 3. Kopier skjermbilde til utklippstavle (D6)
    if (btnCopyScreenshot) {
        btnCopyScreenshot.addEventListener('click', async () => {
            const success = await renderer.copyToClipboard();
            if (success) {
                showToast('📸 <strong>Skjermbilde kopiert:</strong> Kurvebildet er lagt på utklippstavlen og kan limes rett inn i Rise 360 / PPT!');
            } else {
                showToast('⚠️ Kunne ikke legge bilde på utklippstavlen direkte. Bruk Win+Shift+S (skjermklipp).');
            }
        });
    }

    // 5.4: Holdmanøver-knapper (virker mens de holdes nede med mus eller berøring)
    function attachHoldButton(btn, startFn, stopFn, holdName) {
        if (!btn) return;
        let isHolding = false;

        const startHold = (e) => {
            e.preventDefault();
            if (isHolding) return;
            isHolding = true;
            btn.classList.add('active');
            btn.style.background = 'var(--color-accent)';
            btn.style.color = '#0f172a';
            btn.style.borderColor = 'var(--color-accent)';
            startFn();
            if (holdStatusIndicator) {
                holdStatusIndicator.textContent = `🛑 ${holdName} aktiv... Låser luftveien (maks 5 s)`;
                holdStatusIndicator.style.color = 'var(--color-accent)';
            }
        };

        const stopHold = (e) => {
            if (e) e.preventDefault();
            if (!isHolding) return;
            isHolding = false;
            btn.classList.remove('active');
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
            stopFn();
            if (holdStatusIndicator) {
                holdStatusIndicator.textContent = `Avsluttet ${holdName}. Måling oppdatert i panelet.`;
                holdStatusIndicator.style.color = 'var(--color-text-secondary)';
                setTimeout(() => {
                    if (!isHolding && holdStatusIndicator) {
                        holdStatusIndicator.textContent = 'Hold nede knappen for å låse luftveien (maks 5 s)';
                    }
                }, 4000);
            }
        };

        btn.addEventListener('mousedown', startHold);
        btn.addEventListener('mouseup', stopHold);
        btn.addEventListener('mouseleave', stopHold);
        btn.addEventListener('touchstart', startHold, { passive: false });
        btn.addEventListener('touchend', stopHold, { passive: false });
        btn.addEventListener('touchcancel', stopHold, { passive: false });
    }

    attachHoldButton(btnInspHold, () => simulator.startInspiratoryHold(), () => simulator.stopInspiratoryHold(), 'Inspiratorisk hold');
    attachHoldButton(btnExpHold, () => simulator.startExpiratoryHold(), () => simulator.stopExpiratoryHold(), 'Ekspiratorisk hold');

    // Nullstill-knapp
    btnReset.addEventListener('click', () => {
        resetToNeutralBaseline();

        if (isPaused) {
            isPaused = false;
            simulator.isRunning = true;
            renderer.setFrozen(false);
            pauseIcon.textContent = '⏸';
            pauseText.textContent = 'Pause / Frys';
            btnPause.classList.remove('active');
        }

        renderer.initCanvas();
        showToast('↺ Simulatoren er nullstilt til nøytral baseline.');
    });

    // 7. Oppdater pedagogisk innsikt (C12: Regelbasert)
    function updateInsights() {
        const insights = simulator.getPhysiologicalInsights();
        if (insightTau) insightTau.textContent = `${insights.tau} s`;
        if (insightDeltaP) insightDeltaP.textContent = `${insights.drivingPressure} cmH₂O`;
        // 6.1: I volumkontroll er drivtrykket målt (Pplat − PEEPtotal), ikke innstilt
        const insightDeltaPLabel = document.getElementById('insightDeltaPLabel');
        if (insightDeltaPLabel) {
            insightDeltaPLabel.textContent = insights.erVolumkontroll
                ? 'Drivtrykk (Pplat − PEEP)'
                : 'Trykkstøtte (ΔP)';
        }
        if (insightTheoVt) {
            insightTheoVt.textContent = `${insights.theoreticalVt} ml`;
            const parent = insightTheoVt.parentElement;
            if (parent) {
                if (!parent.dataset.labeled) {
                    parent.dataset.labeled = 'true';
                    for (const node of parent.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Teoretisk')) {
                            node.textContent = node.textContent.replace('Teoretisk', 'Forventet');
                        }
                    }
                    const sub = parent.querySelector('sub');
                    if (sub && sub.nextSibling && sub.nextSibling.nodeType === Node.TEXT_NODE) {
                        sub.nextSibling.textContent = ' (maskin + pasient): ';
                    }
                }
                const titleText = `Forventet Vt (maskin + pasient):\n• Maskin: ${insights.machineVt} ml\n• Pasient: ${insights.patientVt} ml`;
                parent.title = titleText;
                insightTheoVt.title = titleText;

                let subtext = parent.querySelector('.insight-breakdown');
                if (!subtext) {
                    subtext = document.createElement('span');
                    subtext.className = 'insight-breakdown';
                    subtext.style.marginLeft = '5px';
                    subtext.style.fontSize = '0.85em';
                    subtext.style.opacity = '0.85';
                    parent.appendChild(subtext);
                }
                subtext.textContent = `(maskin ${insights.machineVt} + pasient ${insights.patientVt} ml)`;
            }
        }
        
        if (insightCycleReason) {
            if (insights.lastCycleReason === 'pressureLimit') {
                const setLim = simulator.settings.alarmHighPpeak !== undefined ? simulator.settings.alarmHighPpeak : 40;
                const effLim = Math.max(simulator.settings.epap + 2, setLim - 10).toFixed(0);
                insightCycleReason.textContent = `🛑 P-maks (${effLim} cmH₂O)`;
                insightCycleReason.style.color = '#ef4444';
            } else if (insights.lastCycleReason === 'tiMax') {
                insightCycleReason.textContent = `⚠️ Ti-max (${simulator.settings.tiMax.toFixed(1)}s)`;
                insightCycleReason.style.color = 'var(--color-warning)';
            } else if (insights.lastCycleReason === 'timeSet') {
                insightCycleReason.textContent = `Ti-innstilt (${simulator.settings.tiSet.toFixed(2)}s)`;
                insightCycleReason.style.color = '#38bdf8';
            } else if (insights.lastCycleReason === 'volume') {
                insightCycleReason.textContent = `Volum (${simulator.settings.vcTidalVolume} ml)`;
                insightCycleReason.style.color = '#22d3ee';
            } else if (insights.lastCycleReason === 'pause') {
                insightCycleReason.textContent = `Pause (${simulator.settings.inspPause.toFixed(2)}s)`;
                insightCycleReason.style.color = '#22d3ee';
            } else {
                insightCycleReason.textContent = `Flow (${Math.round(simulator.settings.cyclingPercent * 100)}%)`;
                insightCycleReason.style.color = '#38bdf8';
            }
        }

        if (insightText) {
            insightText.innerHTML = insights.clinicalNote;
        }
    }

    // 8. Oppdater målte pasientverdier i displayet og håndter alarmtilstand (C1, C3, C5, C6, D5)
    let readoutUpdateTimer = 0;
    function updateReadouts(dt) {
        readoutUpdateTimer += dt;
        if (readoutUpdateTimer >= 0.25) {
            readoutUpdateTimer = 0;

            const m = simulator.state.measured;
            const activeAlarms = simulator.state.activeAlarms || [];

            // C3: Oppdater alarmbanner med alle aktive alarmer
            if (alarmBanner && alarmList) {
                if (activeAlarms.length > 0) {
                    alarmBanner.classList.remove('hidden');
                    alarmList.innerHTML = activeAlarms.map(a => `
                        <div class="alarm-item alarm-type-${a.type}">
                            <span class="alarm-icon">${a.type === 'danger' ? '🚨' : '⚠️'}</span>
                            <div class="alarm-text-block">
                                <span class="alarm-title">${a.title}</span>
                                <span class="alarm-msg">${a.msg}</span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    alarmBanner.classList.add('hidden');
                    alarmList.innerHTML = '';
                }
            }

            // Primære måleverdier (C1, C5: ekte målinger, aldri snappet til 0)
            if (valPpeak) valPpeak.textContent = m.ppeak.toFixed(1);
            if (valVt) valVt.textContent = m.vt;
            if (valMv) valMv.textContent = m.mv.toFixed(1);
            if (valRR) valRR.textContent = m.rrTotal;

            // Målekort visuell alarm-status
            const hasApnea = activeAlarms.some(a => a.id === 'apnea');
            const hasHighPressure = activeAlarms.some(a => a.id === 'high_pressure');
            const hasLowVt = activeAlarms.some(a => a.id === 'low_vt');
            const hasHighVt = activeAlarms.some(a => a.id === 'high_vt');
            const hasLowRr = activeAlarms.some(a => a.id === 'low_rr');
            const hasHighRr = activeAlarms.some(a => a.id === 'high_rr');

            if (cardMetricPpeak) cardMetricPpeak.classList.toggle('metric-alarm-active', hasHighPressure);
            if (cardMetricVt) cardMetricVt.classList.toggle('metric-alarm-active', hasLowVt || hasHighVt);
            if (cardMetricMv) cardMetricMv.classList.toggle('metric-alarm-active', hasApnea);
            if (cardMetricRR) cardMetricRR.classList.toggle('metric-alarm-active', hasApnea || hasHighRr || hasLowRr);

            // Sekundære måleverdier (D5 & 5.4)
            const isExpHold = simulator.isExpiratoryHoldActive();
            const isInspHold = simulator.isInspiratoryHoldActive();

            // PEEP / PEEPi / PEEPtotal (5.4: under ekspiratorisk hold merkes feltet PEEPtotal)
            if (isExpHold) {
                if (titleSecPeep) titleSecPeep.innerHTML = '<span style="color: var(--color-warning);">PEEP<sub>total</sub></span>';
                if (dispPeepPeepi) dispPeepPeepi.innerHTML = `<span style="color: var(--color-warning);">${simulator.getHoldPeepTotal().toFixed(1)}</span>`;
                if (dispPeepTot) dispPeepTot.innerHTML = `Hold aktiv: <strong>${simulator.getHoldPeepTotal().toFixed(1)}</strong> cmH₂O`;
            } else if (simulator.state.measured.holdPeepTotal !== null) {
                if (titleSecPeep) titleSecPeep.innerHTML = 'PEEP / PEEP<sub>i</sub>';
                if (dispPeepPeepi) dispPeepPeepi.textContent = `${simulator.settings.epap.toFixed(1)} / ${m.peepi.toFixed(1)}`;
                if (dispPeepTot) dispPeepTot.innerHTML = `Avdekket PEEP<sub>tot</sub>: <strong>${simulator.getHoldPeepTotal().toFixed(1)}</strong> cmH₂O`;
            } else {
                if (titleSecPeep) titleSecPeep.innerHTML = 'PEEP / PEEP<sub>i</sub>';
                const peepTot = (simulator.settings.epap + m.peepi).toFixed(1);
                if (dispPeepPeepi) dispPeepPeepi.textContent = `${simulator.settings.epap.toFixed(1)} / ${m.peepi.toFixed(1)}`;
                if (dispPeepTot) dispPeepTot.innerHTML = `PEEP<sub>tot</sub>: ${peepTot} cmH₂O`;
            }

            // Platåtrykk Pplat (5.4: holdmanøver, 5.6: vises også utenfor hold)
            if (isInspHold) {
                if (titleSecPplat) titleSecPplat.innerHTML = '<span style="color: #38bdf8;">P<sub>plat</sub> (Hold)</span>';
                if (dispPplatSec) dispPplatSec.innerHTML = `<span style="color: #38bdf8;">${simulator.getHoldPplat().toFixed(1)}</span>`;
                if (dispPplatFoot) dispPplatFoot.innerHTML = `Hold aktiv: <strong>${simulator.getHoldPplat().toFixed(1)}</strong> cmH₂O`;
            } else if (simulator.state.measured.holdPplat !== null) {
                if (titleSecPplat) titleSecPplat.innerHTML = 'P<sub>plat</sub> (Hold)';
                if (dispPplatSec) dispPplatSec.textContent = simulator.getHoldPplat().toFixed(1);
                if (dispPplatFoot) dispPplatFoot.innerHTML = `Avdekket P<sub>plat</sub>: <strong>${simulator.getHoldPplat().toFixed(1)}</strong> cmH₂O`;
            } else {
                if (titleSecPplat) titleSecPplat.innerHTML = 'P<sub>plat</sub> (Platå)';
                const pplat = (simulator.state.measured && simulator.state.measured.pplat) ? simulator.state.measured.pplat : simulator.state.lastPplat;
                if (pplat !== undefined && !isNaN(pplat)) {
                    if (dispPplatSec) dispPplatSec.textContent = pplat.toFixed(1);
                    if (dispPplatFoot) dispPplatFoot.textContent = 'End-insp. platå (siste 100ms)';
                } else {
                    if (dispPplatSec) dispPplatSec.textContent = '--';
                    if (dispPplatFoot) dispPplatFoot.textContent = 'End-insp. platå';
                }
            }

            // 5.6: P0.1 Okklusjonstrykk og respiratorisk drive
            const isP01Available = (simulator.patientDrive.rrSpont > 0) || (simulator.patientDrive.cardiacArtifact > 0);
            if (checkShowP01) {
                checkShowP01.disabled = !isP01Available;
            }
            if (cardSecP01) {
                const shouldShow = isP01Available && (!checkShowP01 || checkShowP01.checked);
                cardSecP01.style.display = shouldShow ? '' : 'none';
            }
            if (dispP01Sec) {
                if (isP01Available) {
                    const p01 = simulator.getP01();
                    dispP01Sec.textContent = p01.toFixed(1);
                    if (dispP01Foot) {
                        if (p01 < 1.0) {
                            dispP01Foot.textContent = 'Lav drive (< 1.0)';
                        } else if (p01 <= 3.5) {
                            dispP01Foot.textContent = 'Normal drive (1.0–3.5)';
                        } else {
                            dispP01Foot.textContent = 'Høy drive (> 3.5)';
                        }
                    }
                } else {
                    dispP01Sec.textContent = '--';
                    if (dispP01Foot) dispP01Foot.textContent = 'Passiv pasient';
                }
            }

            if (dispLeakSec) dispLeakSec.innerHTML = `${m.leak.toFixed(1)} <span class="sub-val-secondary">(${m.leakPercent.toFixed(0)}%)</span>`;
            if (dispLeakStatus) {
                dispLeakStatus.textContent = (m.leak > 40 || m.leakPercent > 40) ? '⚠️ Høy lekkasje' : ((m.leak > 15 || m.leakPercent > 20) ? 'Moderat lekkasje' : 'Tett krets');
            }

            updateInsights();
        }
    }

    // 9. Hoved-animasjonsloop (60 FPS)
    function loop(currentTimestamp) {
        const elapsedSec = (currentTimestamp - lastTimestamp) / 1000;
        lastTimestamp = currentTimestamp;

        if (!isPaused && elapsedSec > 0) {
            if (elapsedSec > 0.5) {
                // Fanen har vært i bakgrunnen — hopp over uten å skape tidssprang i kurvene
                simulator.step(elapsedSec);
            } else {
                // 1. Simuler fysiologi
                simulator.step(elapsedSec);

                // 2. C7 & D3: Send min/maks-konvolutt og hendelser til grafisk monitor
                const wasTriggered = simulator.state.justTriggered;
                simulator.state.justTriggered = false;

                renderer.addSample(
                    elapsedSec,
                    simulator.frameSample,
                    simulator.state.volume,
                    simulator.state.flow,
                    wasTriggered,
                    simulator.settings.epap,
                    simulator.state.volume_lung,
                    simulator.state.flow_lung,
                    simulator.frameEvents
                );

                // 3. Oppdater måletall og alarmbanner
                updateReadouts(elapsedSec);
            }
        }

        // 4. Tegn kurver (renderer håndterer frys, kursor og annotasjoner)
        renderer.render();

        requestAnimationFrame(loop);
    }

    // Start opp med default-verdier
    resetToNeutralBaseline();
    requestAnimationFrame(loop);
});

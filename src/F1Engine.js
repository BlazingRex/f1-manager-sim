import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import './Dashboard.css';
import RaceResults from './RaceResults';
import LiveLeaderboard from './LiveLeaderboard';
import RaceMap from './RaceMap';
import PodiumScreen from './PodiumScreen';
import RadioAlert from './RadioAlert';

const wearRates = { Soft: 8, Medium: 5, Hard: 3, Inter: 4, Wet: 4 };

const AI_DRIVER_NAMES = [
  'V. Bottas',
  'C. Leclerc',
  'L. Hamilton',
  'M. Verstappen',
  'F. Alonso',
  'C. Sainz',
  'G. Russell',
  'L. Norris',
  'O. Piastri',
  'S. Perez',
];

function pickRadioLine(style, intent) {
  const aggressivePit = ['Copy, box box!', 'Box this lap. Copy.', "I'm coming in now!", 'Push in, box box.'];
  const conservativePit = ['Box box, understood.', 'Copy. In this lap.', "Okay, we'll box.", 'Roger, pitting.'];

  const aggressiveStay = ['Negative. Staying out!', 'No, we stay out—push!', 'We can survive on these.', 'Hold position, staying out.'];
  const conservativeStay = ['Negative, staying out for now.', 'We stay out, tyres feel okay.', 'Holding track position. Staying out.', 'Copy, staying out.'];

  const wetCall = ['Track is wet—box for wets!', 'It’s coming down hard—wets now!', 'Grip is gone. We need wets.', 'This is wet, box for wets.'];
  const slickCall = ['Track is drying—box for slicks!', 'We need slicks now.', 'Dry line is here—slicks.', 'Going back to slicks.'];

  if (intent === 'PIT_FOR_WETS') return wetCall[Math.floor(Math.random() * wetCall.length)];
  if (intent === 'PIT_FOR_SLICKS') return slickCall[Math.floor(Math.random() * slickCall.length)];

  if (intent === 'PIT') {
    const pool = style === 'Aggressive' ? aggressivePit : conservativePit;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const pool = style === 'Aggressive' ? aggressiveStay : conservativeStay;
  return pool[Math.floor(Math.random() * pool.length)];
}

function clampProgress(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  let v = num;
  while (v >= 100) v -= 100;
  while (v < 0) v += 100;
  return v;
}

function createOpponents() {
  const seeds = [
    { name: 'Orion GP', color: '#00f2ff' },
    { name: 'Crimson Bull', color: '#ff003c' },
    { name: 'Verdant Racing', color: '#39ff14' },
    { name: 'Aurora Motorsport', color: '#a855f7' },
    { name: 'Atlas Speedworks', color: '#fbbf24' },
    { name: 'Pulse Performance', color: '#38bdf8' },
    { name: 'Silver Arrow', color: '#e5e7eb' },
    { name: 'Amber Apex', color: '#ffaa00' },
    { name: 'Vortex Velocity', color: '#fb7185' },
    { name: 'Neon Nova', color: '#84cc16' },
  ];

  return seeds.map((s, idx) => ({
    ...s,
    teamName: s.name,
    name: AI_DRIVER_NAMES[idx] ?? `AI ${idx + 1}`,
    baseSpeed: 3 + Math.random() * 4,
    currentProgress: clampProgress(idx * 10),
    tireType: 'Slicks',
    strategyType: Math.random() < 0.4 ? 'Aggressive' : 'Conservative',
    gapToPlayerSec: 0,
    lastLapTimeSec: 0,
    totalRaceTime: 0,
    totalDistanceTravelled: 0,
  }));
}

const handleAISubject = (aiCar, currentRain) => {
  let decision = 'STAY';

  if (currentRain > 50 && aiCar.tireType === 'Slicks') {
    const riskTaking = aiCar.strategyType === 'Aggressive' ? 0.3 : 0.8;
    if (Math.random() < riskTaking) {
      decision = 'PIT_FOR_WETS';
    }
  }

  if (currentRain < 10 && aiCar.tireType !== 'Slicks') {
    decision = 'PIT_FOR_SLICKS';
  }

  return decision;
};

export default function F1Engine() {
  const [lap, setLap] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isPitting, setIsPitting] = useState(false);
  const [pitRequested, setPitRequested] = useState(false);

  const [week2Staff] = useState({
    engineer: { name: "Ava Stone", tier: 'Legendary' },
    pitCrew: { name: 'Apex Pit Crew', tier: 'Pro' },
  });

  const [fuel, setFuel] = useState(100);
  const [tireHealth, setTireHealth] = useState(100);
  const [selectedTire, setSelectedTire] = useState('Soft');

  const [rainIntensity, setRainIntensity] = useState(0);

  const [playerProgress, setPlayerProgress] = useState(0);
  const [playerTotalDistanceTravelled, setPlayerTotalDistanceTravelled] = useState(0);

  const [opponents, setOpponents] = useState(() => createOpponents());

  const [lapTimes, setLapTimes] = useState([]);
  const [totalTimeSec, setTotalTimeSec] = useState(0);
  const [bestLapSec, setBestLapSec] = useState(null);
  const [totalPitStops, setTotalPitStops] = useState(0);
  const [wrongTireLaps, setWrongTireLaps] = useState(0);
  const [dnfReason, setDnfReason] = useState(null);
  const [radioAlert, setRadioAlert] = useState(null);

  const pitTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pitTimeoutRef.current) clearTimeout(pitTimeoutRef.current);
    };
  }, []);

  const restartSeason = useCallback(() => {
    if (pitTimeoutRef.current) clearTimeout(pitTimeoutRef.current);
    setLap(1);
    setIsRunning(false);
    setIsPitting(false);
    setPitRequested(false);
    setFuel(100);
    setTireHealth(100);
    setSelectedTire('Soft');
    setRainIntensity(0);
    setPlayerProgress(0);
    setPlayerTotalDistanceTravelled(0);
    setOpponents((prev) =>
      prev.map((o, idx) => ({
        ...o,
        currentProgress: clampProgress(idx * 10),
        tireType: 'Slicks',
        gapToPlayerSec: 0,
        lastLapTimeSec: 0,
        totalRaceTime: 0,
        totalDistanceTravelled: 0,
      }))
    );
    setLapTimes([]);
    setTotalTimeSec(0);
    setBestLapSec(null);
    setTotalPitStops(0);
    setWrongTireLaps(0);
    setDnfReason(null);
    setRadioAlert(null);
  }, []);

  const currentWeather = rainIntensity > 70 ? 'Heavy Rain' : rainIntensity > 40 ? 'Rainy' : 'Clear';

  const isWrongTireForWeather = useCallback(
    (weather, tire) => {
      if (weather === 'Clear') return tire === 'Inter' || tire === 'Wet';
      if (weather === 'Rainy') return tire === 'Soft' || tire === 'Medium' || tire === 'Hard';
      if (weather === 'Heavy Rain') return tire === 'Soft' || tire === 'Medium' || tire === 'Hard';
      return false;
    },
    []
  );

  const triggerPitStop = useCallback(() => {
    setIsPitting(true);
    setPitRequested(false);

    setTotalPitStops((p) => p + 1);

    if (pitTimeoutRef.current) clearTimeout(pitTimeoutRef.current);
    pitTimeoutRef.current = setTimeout(() => {
      setTireHealth(100);
      setFuel(100);
      setIsPitting(false);
      setLap((prev) => prev + 1);
    }, 5000);
  }, []);

  const processLap = useCallback(() => {
    if (lap >= 50 || fuel <= 0 || tireHealth <= 0) {
      setIsRunning(false);
      if (fuel <= 0) setDnfReason('Out of fuel');
      if (tireHealth <= 0) setDnfReason('Puncture / 0% tires');
      return;
    }

    const baseWear = wearRates[selectedTire] ?? 5;
    const legendaryEngineerWearMultiplier = week2Staff.engineer.tier === 'Legendary' ? 0.8 : 1;
    const wearThisLap = baseWear * legendaryEngineerWearMultiplier;
    const newWear = Math.max(0, tireHealth - wearThisLap);
    const newFuel = Math.max(0, fuel - 2.2);

    const baseLapTime = 90;
    const tirePenalty = newWear < 30 ? 2.5 : newWear < 70 ? 1.0 : 0;
    const weatherPenalty = isWrongTireForWeather(currentWeather, selectedTire) ? 6 : 0;
    const lapTimeThisLap = baseLapTime + tirePenalty + weatherPenalty;

    const playerDelta = 4.2;
    setPlayerProgress((p) => clampProgress(p + playerDelta));
    setPlayerTotalDistanceTravelled((d) => (Number(d) || 0) + playerDelta);

    setLapTimes((prev) => [...prev, lapTimeThisLap]);
    setTotalTimeSec((prev) => prev + lapTimeThisLap);
    setBestLapSec((prev) => {
      if (prev == null) return lapTimeThisLap;
      return Math.min(prev, lapTimeThisLap);
    });
    if (isWrongTireForWeather(currentWeather, selectedTire)) {
      setWrongTireLaps((prev) => prev + 1);
    }

    if (Math.random() > 0.9) {
      setRainIntensity(Math.floor(Math.random() * 100));
    }

    setOpponents((prev) =>
      prev.map((ai) => {
        const baseSpeed = Number(ai.baseSpeed) || 3;
        const fluctuation = (Math.random() - 0.5) * 0.8;
        const aiBaseLap = 90 - baseSpeed;

        const decision = handleAISubject(ai, rainIntensity);
        let tireType = ai.tireType;
        let pitted = false;
        if (decision === 'PIT_FOR_WETS') {
          tireType = 'Wets';
          pitted = true;
        } else if (decision === 'PIT_FOR_SLICKS') {
          tireType = 'Slicks';
          pitted = true;
        }

        if (pitted || (decision === 'STAY' && Math.random() < 0.15)) {
          const intent = pitted ? decision : 'STAY';
          const line = pickRadioLine(ai.strategyType, intent);
          const key = `ai-radio-${lap}-${ai.name}-${intent}`;
          setRadioAlert({ key, message: `${ai.name}: ${line}`, ts: Date.now() });
        }

        const wrongTirePenalty =
          rainIntensity > 50 && tireType === 'Slicks'
            ? 10
            : rainIntensity < 10 && tireType !== 'Slicks'
              ? 5
              : 0;

        const pitPenalty = pitted ? 5 : 0;
        const aiLapTime = Math.max(60, aiBaseLap + wrongTirePenalty + pitPenalty + fluctuation);

        const distanceDelta = baseSpeed * 1.7;
        const nextProgress = clampProgress(ai.currentProgress + distanceDelta);
        const nextGap = (Number(ai.gapToPlayerSec) || 0) + (aiLapTime - lapTimeThisLap);

        return {
          ...ai,
          tireType,
          lastLapTimeSec: aiLapTime,
          totalRaceTime: (Number(ai.totalRaceTime) || 0) + aiLapTime,
          totalDistanceTravelled: (Number(ai.totalDistanceTravelled) || 0) + distanceDelta,
          gapToPlayerSec: nextGap,
          currentProgress: nextProgress,
        };
      })
    );

    if (pitRequested) {
      triggerPitStop();
    } else {
      setTireHealth(newWear);
      setFuel(newFuel);
      setLap((prev) => prev + 1);
      if (newFuel <= 0) setDnfReason('Out of fuel');
      if (newWear <= 0) setDnfReason('Puncture / 0% tires');
    }
  }, [
    currentWeather,
    fuel,
    isWrongTireForWeather,
    lap,
    pitRequested,
    rainIntensity,
    selectedTire,
    tireHealth,
    triggerPitStop,
    week2Staff.engineer.tier,
  ]);

  useEffect(() => {
    let interval = null;

    if (isRunning && !isPitting) {
      interval = setInterval(() => {
        processLap();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPitting, processLap]);

  const tireZoneClass =
    tireHealth >= 70 ? 'green-zone' : tireHealth >= 30 ? 'orange-zone' : 'red-zone';

  const tireValueClass =
    tireHealth > 70
      ? 'tireValueGreen'
      : tireHealth >= 30
        ? 'tireValueOrange'
        : 'tireValueRedFlash';

  const raceFinished = lap >= 50 || Boolean(dnfReason);

  const carsForMap = [
    { id: 'Player', progress: playerProgress, color: '#39ff14' },
    ...opponents.map((o, idx) => ({
      id: `AI${idx + 1}`,
      progress: o.currentProgress,
      color: o.color,
    })),
  ];

  const carsForLeaderboard = [
    {
      id: 'Player',
      name: 'Player',
      color: '#39ff14',
      totalRaceTime: totalTimeSec,
      totalDistanceTravelled: playerTotalDistanceTravelled,
      tireType: selectedTire,
    },
    ...opponents.map((o) => ({
      id: o.name,
      name: o.name,
      color: o.color,
      totalRaceTime: o.totalRaceTime,
      totalDistanceTravelled: o.totalDistanceTravelled,
      tireType: o.tireType,
    })),
  ];

  const top3 = carsForLeaderboard
    .slice()
    .sort(
      (a, b) =>
        (Number(b.totalDistanceTravelled) || 0) - (Number(a.totalDistanceTravelled) || 0)
    )
    .slice(0, 3);

  const playerInTop3 = top3.some((c) => c.id === 'Player');

  return (
    <div className="f1-dashboard">
      <RadioAlert alert={radioAlert} />
      <header className="dashboardTopBar">
        <div className="topBarLeft">
          <div className="title">F1 Manager Sim</div>
          <div className="subtitle">Race Strategy</div>
        </div>

        <div className="topBarRight">
          <div className="data-panel topStat">
            <div className="label">Lap</div>
            <div className="stat-value">
              {lap}
              /50
            </div>
          </div>
          <div className="data-panel topStat">
            <div className="label">Rain Intensity</div>
            <div className="stat-value">{rainIntensity}%</div>
          </div>
        </div>
      </header>

      <main className="content">
        {raceFinished ? (
          <PodiumScreen
            top3={top3}
            totalRaceTimeSec={totalTimeSec}
            bestLapSec={bestLapSec}
            totalPitStops={totalPitStops}
            showConfetti={playerInTop3}
          />
        ) : null}

        {raceFinished ? (
          <RaceResults
            totalTimeSec={totalTimeSec}
            wrongTireLaps={wrongTireLaps}
            totalLaps={Math.max(1, lapTimes.length)}
            dnf={Boolean(dnfReason)}
            dnfReason={dnfReason}
            onRestart={restartSeason}
          />
        ) : null}

        <div className="engineLayout">
          <aside className="data-panel staffSidebar">
            <div className="panelTitle">Week 2 Staff</div>
            <div className="panelContent">
              <div className="sidebarRow">
                <div className="label">Engineer</div>
                <div className="stat-value">{week2Staff.engineer.name}</div>
                <div className="label">Tier: {week2Staff.engineer.tier}</div>
                {week2Staff.engineer.tier === 'Legendary' ? (
                  <div className="label">Buff: -20% tire wear</div>
                ) : null}
              </div>

              <div className="sidebarRow">
                <div className="label">Pit Crew</div>
                <div className="stat-value">{week2Staff.pitCrew.name}</div>
                <div className="label">Tier: {week2Staff.pitCrew.tier}</div>
              </div>
            </div>
          </aside>

          <section className="dashboardGrid engineMain">
            <div className="data-panel dashboardPanel">
              <div className="panelTitle">Car Telemetry</div>
              <div className="panelContent">
                <div>
                  <div className="label">Tire Health</div>
                  <div className={`tireHealthNumber ${tireValueClass}`}>{Math.round(tireHealth)}%</div>
                  <div className="telemetryTrack" style={{ height: 14 }}>
                    <div
                      className={`health-bar-inner ${tireZoneClass}`}
                      style={{ width: `${Math.max(0, Math.min(100, tireHealth))}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="label">Fuel</div>
                  <div className="telemetryTrack" style={{ height: 14 }}>
                    <div
                      className="health-bar-inner"
                      style={{
                        width: `${Math.max(0, Math.min(100, fuel))}%`,
                        background: 'var(--neon-blue)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="data-panel dashboardPanel">
              <div className="panelTitle">Strategy / Pit Wall</div>
              <div className="panelContent">
                <div>
                  <div className="label">Tire Compound</div>
                  <select
                    value={selectedTire}
                    onChange={(e) => setSelectedTire(e.target.value)}
                    className="pit-btn"
                    style={{ width: '100%', marginTop: 8 }}
                    disabled={isPitting}
                  >
                    {Object.keys(wearRates).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="controls">
                  <button
                    type="button"
                    className="pit-btn"
                    onClick={() => setIsRunning((v) => !v)}
                  >
                    {isRunning ? 'Pause' : 'Play'}
                  </button>
                  <button
                    type="button"
                    className="pit-btn"
                    onClick={() => setPitRequested((v) => !v)}
                    disabled={isPitting}
                  >
                    {pitRequested ? 'Box This Lap: ON' : 'Box This Lap: OFF'}
                  </button>
                  <button
                    type="button"
                    className="pit-btn"
                    onClick={processLap}
                    disabled={isPitting}
                  >
                    Process Lap
                  </button>
                </div>

                <div className="label">
                  Status: {isPitting ? 'Pitting…' : isRunning ? 'Running' : 'Paused'}
                </div>
              </div>
            </div>

            <div className="data-panel dashboardPanel">
              <div className="panelTitle">Session</div>
              <div className="panelContent">
                <div className="sessionGrid">
                  <RaceMap cars={carsForMap} />
                  <LiveLeaderboard cars={carsForLeaderboard} />
                </div>

                <div className="telemetry-grid">
                  <div className="data-panel">
                    <div className="label">Fuel (L)</div>
                    <div className="stat-value">{fuel.toFixed(1)}</div>
                  </div>
                  <div className="data-panel">
                    <div className="label">Tire (%)</div>
                    <div className="stat-value">{Math.round(tireHealth)}</div>
                  </div>
                  <div className="data-panel">
                    <div className="label">Pit Requested</div>
                    <div className="stat-value">{pitRequested ? 'YES' : 'NO'}</div>
                  </div>
                </div>

                {fuel <= 0 ? <div className="raceStatusSubtitle">DNF: Out of fuel</div> : null}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

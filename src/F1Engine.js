import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import './Dashboard.css';
import RaceResults from './RaceResults';
import LiveLeaderboard from './LiveLeaderboard';
import RaceMap from './RaceMap';
import PodiumScreen from './PodiumScreen';
import RadioAlert from './RadioAlert';
import { staffMarket } from './staffData';

const wearRates = { Soft: 8, Medium: 5, Hard: 3, Inter: 4, Wet: 4 };

const AI_DRIVER_NAMES = [
  'J. Speedster',
  'M. Vortex',
  'L. Thunder',
  'A. Nitro',
  'K. Flash',
  'R. Bolt',
  'S. Blaze',
  'T. Rocket',
];

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
  ];

  // Wider random range for more variable difficulty per run
  const baseSpeedMultiplier = 0.8 + Math.random() * 0.9; // 0.8 to 1.7

  return seeds.map((s, idx) => ({
    ...s,
    teamName: s.name,
    name: AI_DRIVER_NAMES[idx] ?? `AI ${idx + 1}`,
    baseSpeed: (1.8 + Math.random() * 2.4) * baseSpeedMultiplier, // 1.8–4.2 scaled by multiplier
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

  const hiredEngineerId = (typeof window !== 'undefined' && window.hiredEngineerId) || null;
  const hiredPitCrewId = (typeof window !== 'undefined' && window.hiredPitCrewId) || null;

  const week2Staff = {
    engineer: hiredEngineerId ? staffMarket.engineers.find(e => e.id === hiredEngineerId) ?? { name: "Ava Stone", tier: 'Legendary' } : { name: "Ava Stone", tier: 'Legendary' },
    pitCrew: hiredPitCrewId ? staffMarket.pitCrews.find(p => p.id === hiredPitCrewId) ?? { name: 'Apex Pit Crew', tier: 'Pro' } : { name: 'Apex Pit Crew', tier: 'Pro' },
  };

  // Random budget per run
  const [budget, setBudget] = useState(() => (typeof window !== 'undefined' && window.budget) || Math.floor(800000 + Math.random() * 1400000)); // $800k–$2.2M

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
  const [showResultsPortal, setShowResultsPortal] = useState(false);
  const [raceFinished, setRaceFinished] = useState(false);

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
    setRaceFinished(false);
    setShowResultsPortal(false);
    const newBudget = Math.floor(800000 + Math.random() * 1400000);
    setBudget(newBudget);
    if (typeof window !== 'undefined') window.budget = newBudget;
    setFuel(100);
    setTireHealth(100);
    setSelectedTire('Soft');
    setRainIntensity(0);
    setPlayerProgress(0);
    setPlayerTotalDistanceTravelled(0);
    setOpponents(createOpponents());
    setLapTimes([]);
    setTotalTimeSec(0);
    setBestLapSec(null);
    setTotalPitStops(0);
    setWrongTireLaps(0);
    setDnfReason(null);
    setRadioAlert(null);
  }, []);

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
      setRaceFinished(true);
      setShowResultsPortal(true);
      if (fuel <= 0) setDnfReason('Out of fuel');
      if (tireHealth <= 0) setDnfReason('Puncture / 0% tires');
      return;
    }

    // Random DNF chance (mechanical failure)
    if (Math.random() < 0.004) {
      setIsRunning(false);
      setRaceFinished(true);
      setShowResultsPortal(true);
      setDnfReason('Mechanical failure');
      return;
    }

    const baseWear = wearRates[selectedTire] ?? 5;
    const legendaryEngineerWearMultiplier = week2Staff.engineer.tier === 'Legendary' ? 0.8 : 1;
    const wearThisLap = baseWear * legendaryEngineerWearMultiplier;
    const newWear = Math.max(0, tireHealth - wearThisLap);
    const newFuel = Math.max(0, fuel - 2.2);

    // Tire and weather effects on lap time
    let tirePenalty = 0;
    if (selectedTire === 'Soft') {
      tirePenalty = newWear < 20 ? 4 : newWear < 50 ? 1.5 : 0;
    } else if (selectedTire === 'Medium') {
      tirePenalty = newWear < 15 ? 2 : 0;
    } else if (selectedTire === 'Hard') {
      tirePenalty = 0; // durable
    } else if (selectedTire === 'Inter') {
      tirePenalty = rainIntensity > 30 ? -1 : 2; // good in damp, bad in dry
    } else if (selectedTire === 'Wet') {
      tirePenalty = rainIntensity > 60 ? -3 : rainIntensity > 30 ? -1 : 5; // great in heavy rain, terrible in dry
    }

    const baseLapTime = 90;
    const lapTimeThisLap = baseLapTime + tirePenalty;

    // Player speed delta affected by tire choice and conditions
    let playerDelta = 4.2;
    if (selectedTire === 'Soft') playerDelta += 0.4;
    if (selectedTire === 'Hard') playerDelta -= 0.3;
    if (selectedTire === 'Wet' && rainIntensity > 60) playerDelta += 0.6;
    if (selectedTire === 'Wet' && rainIntensity < 30) playerDelta -= 1.2;
    if (selectedTire === 'Inter' && rainIntensity > 30 && rainIntensity <= 60) playerDelta += 0.3;
    if (selectedTire === 'Inter' && rainIntensity < 20) playerDelta -= 0.8;

    setPlayerProgress((p) => clampProgress(p + playerDelta));
    setPlayerTotalDistanceTravelled((d) => (Number(d) || 0) + playerDelta);

    setLapTimes((prev) => [...prev, lapTimeThisLap]);
    setTotalTimeSec((prev) => prev + lapTimeThisLap);
    setBestLapSec((prev) => {
      if (prev == null) return lapTimeThisLap;
      return Math.min(prev, lapTimeThisLap);
    });

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

        // AI tire penalties
        let aiTirePenalty = 0;
        if (tireType === 'Soft') {
          aiTirePenalty = 2;
        } else if (tireType === 'Hard') {
          aiTirePenalty = -0.5;
        } else if (tireType === 'Wet') {
          aiTirePenalty = rainIntensity > 60 ? -3 : rainIntensity < 30 ? 5 : 0;
        } else if (tireType === 'Inter') {
          aiTirePenalty = rainIntensity > 30 && rainIntensity <= 60 ? -1 : rainIntensity < 20 ? 3 : 0;
        }

        const wrongTirePenalty =
          rainIntensity > 50 && tireType === 'Slicks'
            ? 12
            : rainIntensity < 10 && tireType !== 'Slicks'
              ? 6
              : 0;

        const pitPenalty = pitted ? 6.5 : 0;
        const aiLapTime = Math.max(60, aiBaseLap + wrongTirePenalty + pitPenalty + fluctuation + aiTirePenalty);

        // Random AI DNF
        if (Math.random() < 0.003) {
          return { ...ai, dnf: true, dnfReason: 'Mechanical failure' };
        }

        const distanceDelta = baseSpeed * 1.4;
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
      }).filter(ai => !ai.dnf)
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
    fuel,
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

  const carsForMap = [
    { id: 'Player', progress: playerProgress, color: '#39ff14', teamName: 'Player' },
    ...opponents.map((o, idx) => ({
      id: `AI${idx + 1}`,
      progress: o.currentProgress,
      color: o.color,
      teamName: o.teamName,
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

  // Prepare final standings sorted by total distance (desc), then total time (asc)
  const finalStandings = raceFinished
    ? (() => {
        const sorted = carsForLeaderboard
          .slice()
          .sort((a, b) => {
            const distDiff = (Number(b.totalDistanceTravelled) || 0) - (Number(a.totalDistanceTravelled) || 0);
            if (distDiff !== 0) return distDiff;
            return (Number(a.totalRaceTime) || 0) - (Number(b.totalRaceTime) || 0);
          });
        const winnerTime = sorted[0]?.totalRaceTime ?? 0;
        return sorted.map((car, idx) => {
          const interval = idx === 0 ? 0 : (Number(car.totalRaceTime) || 0) - winnerTime;
          return { ...car, position: idx + 1, interval };
        });
      })()
    : [];

  return (
    <>
      {showResultsPortal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.96)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'monospace',
          }}
        >
          <h2 style={{ color: '#39ff14', fontSize: '2.5rem', marginBottom: '1rem' }}>Final Standings</h2>
          <table
            style={{
              borderCollapse: 'collapse',
              width: '600px',
              maxWidth: '90vw',
              fontSize: '1.1rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #39ff14' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Pos</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Driver</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Total Time</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Interval</th>
              </tr>
            </thead>
            <tbody>
              {finalStandings.map((car) => (
                <tr
                  key={car.id}
                  style={{
                    borderBottom: '1px solid #333',
                    backgroundColor: car.id === 'Player' ? '#39ff14' : 'transparent',
                    color: car.id === 'Player' ? '#000' : '#fff',
                  }}
                >
                  <td style={{ padding: '0.75rem' }}>
                    {car.position}
                    {car.id === 'Player' && (
                      <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>
                        (YOU FINISHED P{car.position})
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{car.name}</td>
                  <td style={{ padding: '0.75rem' }}>{(Number(car.totalRaceTime) || 0).toFixed(1)}s</td>
                  <td style={{ padding: '0.75rem' }}>
                    {car.interval === 0 ? '—' : `+${car.interval.toFixed(1)}s`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => setShowResultsPortal(false)}
            style={{
              marginTop: '2rem',
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              background: '#39ff14',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Close Results
          </button>
        </div>
      )}

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
            <div className="panelTitle">Team</div>
            <div className="panelContent">
              <div className="sidebarRow">
                <div className="label">Budget</div>
                <div className="stat-value">${(budget || 0).toLocaleString()}</div>
              </div>

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
      </>
  );
}

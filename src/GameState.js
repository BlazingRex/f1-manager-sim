import { staffMarket } from './staffData';
import { getConditionFromIntensity, tickRainIntensity } from './weatherSystem';

const WEATHER = Object.freeze({
  Clear: 'Clear',
  Rainy: 'Rainy',
  HeavyRain: 'Heavy Rain',
});

const ENGINEERS = staffMarket.engineers;
const PIT_CREWS = staffMarket.pitCrews;

const FULL_FUEL_LITERS = 100;

let state = {
  lapNumber: 1,
  weather: WEATHER.Clear,
  rainIntensity: 0,
  teamBudget: 100000000,
  raceTimeSec: 0,
  lastEvent: null,
  lastRadioAlert: null,
  radioFeed: [],
  raceOver: false,
  lastLapTimeSec: 0,
  avgLapTimeSec: 0,
  lapsCompleted: 0,
  gapToLeaderSec: 0,
  carStats: {
    tireHealth: 100,
    fuel: 100,
  },
  staff: {
    engineerId: null,
    pitCrewId: null,
  },
  boxThisLapRequested: false,
};

const subscribers = new Set();

function addRadioAlert(message, key) {
  const alertKey = String(key ?? message);
  if (state.radioFeed.some((a) => a.key === alertKey)) return;

  const nextAlert = {
    key: alertKey,
    lapNumber: state.lapNumber,
    message,
    ts: Date.now(),
  };

  state = {
    ...state,
    lastRadioAlert: nextAlert,
    radioFeed: [...state.radioFeed.slice(-49), nextAlert],
  };
}

function forecastRainSoon(intensity) {
  let sim = Number(intensity) || 0;
  for (let i = 0; i < 3; i += 1) {
    sim = tickRainIntensity(sim).intensity;
  }
  const condition = getConditionFromIntensity(sim);
  return condition === WEATHER.Rainy || condition === WEATHER.HeavyRain;
}

function clampNumber(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function notify() {
  for (const callback of subscribers) {
    callback(getState());
  }
}

function findEngineerById(id) {
  return ENGINEERS.find((e) => e.id === id) ?? null;
}

function findPitCrewById(id) {
  return PIT_CREWS.find((p) => p.id === id) ?? null;
}

function getHiredEngineer() {
  return findEngineerById(state.staff.engineerId);
}

function getHiredPitCrew() {
  return findPitCrewById(state.staff.pitCrewId);
}

function computePitStopTimeFromPitSpeed(pitSpeed) {
  const speed = clampNumber(pitSpeed, 1, 100);
  return clampNumber(4.5 - speed * 0.022, 2.0, 4.5);
}

function computePitStopTimeSec(pitCrew) {
  const pitTime = pitCrew?.pitTime;
  if (typeof pitTime === 'number') {
    return clampNumber(pitTime, 1.8, 8);
  }

  const skill = clampNumber(pitCrew?.skill ?? 1, 1, 100);
  return computePitStopTimeFromPitSpeed(skill);
}

function computeTireWearPerLap(weather, engineer) {
  const baseWear = weather === WEATHER.Rainy ? 3.4 : 2.6;
  const skill = clampNumber(engineer?.skill ?? 1, 1, 100);
  const skillMultiplier = 1 - (skill / 100) * 0.2;
  const wearReduction = clampNumber(engineer?.wearReduction ?? 1, 0.6, 1.4);
  return clampNumber(baseWear * skillMultiplier * wearReduction, 0.5, 5);
}

function shouldPitThisLap(carStats) {
  return carStats.tireHealth <= 25 || carStats.fuel <= 20;
}

function computeLapTimeSec(weather) {
  const base = weather === WEATHER.Rainy ? 96 : 90;
  const variance = (Math.random() - 0.5) * 2.0;
  return clampNumber(base + variance, 80, 110);
}

function rollCriticalError({ label, riskFactor, penaltyRangeSec }) {
  if (typeof riskFactor !== 'number') return null;
  const risk = clampNumber(riskFactor, 0, 1);
  if (Math.random() >= risk) return null;

  const [minPenalty, maxPenalty] = penaltyRangeSec;
  const penaltySec = clampNumber(
    minPenalty + Math.random() * (maxPenalty - minPenalty),
    minPenalty,
    maxPenalty
  );

  return {
    message: `Critical Error (${label}) +${penaltySec.toFixed(1)}s`,
    penaltySec,
  };
}

export function calculateLap() {
  const engineer = getHiredEngineer();
  const pitCrew = getHiredPitCrew();

  const tireWear = computeTireWearPerLap(state.weather, engineer);
  const fuelUse = 2.5;

  const predictedTireHealth = state.carStats.tireHealth - tireWear;
  const predictedFuel = state.carStats.fuel - fuelUse;

  const pitStopThisLap = shouldPitThisLap(state.carStats) || state.boxThisLapRequested;
  const pitStopTimeSec = pitStopThisLap ? computePitStopTimeSec(pitCrew) : 0;
  const baseLapTimeSec = computeLapTimeSec(state.weather);
  const missingFuelLiters = clampNumber(
    FULL_FUEL_LITERS - clampNumber(state.carStats.fuel, 0, FULL_FUEL_LITERS),
    0,
    FULL_FUEL_LITERS
  );
  const fuelWeightBonusSec = missingFuelLiters * 0.02;
  const lapTimeSec = clampNumber(baseLapTimeSec - fuelWeightBonusSec, 70, 130);

  const events = [];
  let penaltySec = 0;

  if (predictedTireHealth <= 0) {
    events.push('PUNCTURE: Tire failed! +60.0s');
    penaltySec += 60;
  }

  if (predictedTireHealth > 0 && predictedTireHealth < 20) {
    events.push("[Driver]: I'm losing the rear! I need to box!");
  }

  let dnfThisLap = false;
  if (predictedFuel <= 0) {
    events.push('DNF: Out of fuel');
    dnfThisLap = true;
  }

  if (engineer && engineer.skill < 40) {
    const engineerError = rollCriticalError({
      label: `${engineer.name} (Engineer)`,
      riskFactor: engineer.riskFactor,
      penaltyRangeSec: [1.5, 6.0],
    });
    if (engineerError) {
      events.push(engineerError.message);
      penaltySec += engineerError.penaltySec;
    }
  }

  if (pitStopThisLap && pitCrew && pitCrew.skill < 40) {
    if (Math.random() < 0.05) {
      events.push('ERROR: Cross-threaded nut! +10s penalty.');
      penaltySec += 10;
    }

    const pitError = rollCriticalError({
      label: `${pitCrew.name} (Pit Crew)`,
      riskFactor: pitCrew.failureChance,
      penaltyRangeSec: [2.0, 10.0],
    });
    if (pitError) {
      events.push(`CRITICAL ERROR: Wheel nut stuck! +${pitError.penaltySec.toFixed(1)}s`);
      penaltySec += pitError.penaltySec;
    }
  }

  return {
    tireWear,
    fuelUse,
    pitStopTimeSec,
    pitStopThisLap,
    lapTimeSec,
    penaltySec,
    dnfThisLap,
    eventMessage: events.length ? events.join(' / ') : null,
    predictedTireHealth,
  };
}

export function getState() {
  const engineer = getHiredEngineer();
  const pitCrew = getHiredPitCrew();

  const lapCalc = calculateLap();

  const effects = {
    pitStopTimeSec: lapCalc.pitStopTimeSec,
    pitServiceTimeSec: computePitStopTimeSec(pitCrew),
    pitStopThisLap: lapCalc.pitStopThisLap,
    tireWearPerLap: lapCalc.tireWear,
    hiredEngineer: engineer,
    hiredPitCrew: pitCrew,
  };

  return {
    ...structuredClone(state),
    effects,
    rosters: {
      engineers: ENGINEERS,
      pitCrews: PIT_CREWS,
    },
  };
}

export function subscribe(callback) {
  subscribers.add(callback);
  callback(getState());

  return () => {
    subscribers.delete(callback);
  };
}

export function setLapNumber(lapNumber) {
  state = {
    ...state,
    lapNumber: Math.max(1, Math.floor(Number(lapNumber) || 1)),
  };
  notify();
}

export function nextLap() {
  if (state.raceOver) return;

  const rainSoon =
    state.weather === WEATHER.Clear && forecastRainSoon(state.rainIntensity) && state.lapNumber > 0;
  if (rainSoon) {
    addRadioAlert('[Engineer]: Rain expected soon, check your strategy.', `rain-soon-${state.lapNumber}`);
  }

  const lapCalc = calculateLap();
  const nextTire = state.carStats.tireHealth - lapCalc.tireWear;
  const nextFuel = state.carStats.fuel - lapCalc.fuelUse;

  const timeThisLap = lapCalc.lapTimeSec + lapCalc.pitStopTimeSec + lapCalc.penaltySec;

  const avgBefore = state.lapsCompleted > 0 ? state.avgLapTimeSec : timeThisLap;
  const gapDelta = Math.max(0, timeThisLap - avgBefore);
  const nextAvg =
    (state.avgLapTimeSec * state.lapsCompleted + timeThisLap) / (state.lapsCompleted + 1);

  if (lapCalc.predictedTireHealth > 0 && lapCalc.predictedTireHealth < 20) {
    addRadioAlert("[Driver]: I'm losing the rear! I need to box!", `tire-critical-${state.lapNumber}`);
  }

  if (lapCalc.eventMessage && lapCalc.eventMessage.includes('ERROR: Cross-threaded nut! +10s penalty.')) {
    addRadioAlert('ERROR: Cross-threaded nut! +10s penalty.', `pit-cross-thread-${state.lapNumber}`);
  }

  const nextRain = tickRainIntensity(state.rainIntensity);
  const nextWeather = nextRain.condition;

  state = {
    ...state,
    lapNumber: state.lapNumber + 1,
    weather: nextWeather,
    rainIntensity: nextRain.intensity,
    raceTimeSec: state.raceTimeSec + timeThisLap,
    lastEvent: lapCalc.eventMessage,
    raceOver: state.raceOver || lapCalc.dnfThisLap,
    lastLapTimeSec: timeThisLap,
    avgLapTimeSec: nextAvg,
    lapsCompleted: state.lapsCompleted + 1,
    gapToLeaderSec: state.gapToLeaderSec + gapDelta,
    carStats: {
      ...state.carStats,
      tireHealth: lapCalc.pitStopThisLap ? 100 : clampNumber(nextTire, 0, 100),
      fuel: clampNumber(nextFuel, 0, FULL_FUEL_LITERS),
    },
    boxThisLapRequested: false,
  };
  notify();
}

export function setBoxThisLapRequested(value) {
  state = {
    ...state,
    boxThisLapRequested: Boolean(value),
  };
  notify();
}

export function toggleBoxThisLapRequested() {
  setBoxThisLapRequested(!state.boxThisLapRequested);
}

export function setWeather(weather) {
  if (weather !== WEATHER.Clear && weather !== WEATHER.Rainy && weather !== WEATHER.HeavyRain) return;

  state = {
    ...state,
    weather,
  };
  notify();
}

export function toggleWeather() {
  setWeather(state.weather === WEATHER.Clear ? WEATHER.Rainy : WEATHER.Clear);
}

export function setTeamBudget(teamBudget) {
  const budget = Math.max(0, Math.floor(Number(teamBudget) || 0));
  state = {
    ...state,
    teamBudget: budget,
  };
  notify();
}

export function adjustTeamBudget(delta) {
  setTeamBudget(state.teamBudget + (Number(delta) || 0));
}

export function setTireHealth(tireHealth) {
  state = {
    ...state,
    carStats: {
      ...state.carStats,
      tireHealth: clampNumber(tireHealth, 0, 100),
    },
  };
  notify();
}

export function adjustTireHealth(delta) {
  setTireHealth(state.carStats.tireHealth + (Number(delta) || 0));
}

export function setFuel(fuel) {
  state = {
    ...state,
    carStats: {
      ...state.carStats,
      fuel: clampNumber(fuel, 0, FULL_FUEL_LITERS),
    },
  };
  notify();
}

export function adjustFuel(delta) {
  setFuel(state.carStats.fuel + (Number(delta) || 0));
}

export const Weather = WEATHER;

export function listEngineers() {
  return ENGINEERS;
}

export function listPitCrews() {
  return PIT_CREWS;
}

export function hireEngineer(engineerId) {
  const engineer = findEngineerById(engineerId);
  if (!engineer) return false;
  if (state.staff.engineerId === engineer.id) return true;
  if (state.teamBudget < engineer.cost) return false;

  state = {
    ...state,
    teamBudget: state.teamBudget - engineer.cost,
    staff: {
      ...state.staff,
      engineerId: engineer.id,
    },
  };
  notify();
  return true;
}

export function hirePitCrew(pitCrewId) {
  const pitCrew = findPitCrewById(pitCrewId);
  if (!pitCrew) return false;
  if (state.staff.pitCrewId === pitCrew.id) return true;
  if (state.teamBudget < pitCrew.cost) return false;

  state = {
    ...state,
    teamBudget: state.teamBudget - pitCrew.cost,
    staff: {
      ...state.staff,
      pitCrewId: pitCrew.id,
    },
  };
  notify();
  return true;
}

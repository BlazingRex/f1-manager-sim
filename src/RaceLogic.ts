// RaceLogic.ts: Realistic F1 race engine

export interface CarStats {
  topSpeed: number;        // km/h base (e.g., 330)
  cornering: number;       // 0-100 handling
  reliability: number;     // 0-100 (affects DNF chance)
}

export interface TireCompound {
  name: 'Soft' | 'Medium' | 'Hard' | 'Inter' | 'Wet';
  wearRate: number;        // % lost per lap (e.g., 2.0)
  grip: number;            // base grip modifier (1.0 = neutral)
}

export interface Strategy {
  mode: 'Push' | 'Balanced' | 'Save';
  speedModifier: number;   // e.g., Push +0.3s, Balanced 0, Save -0.2s
  wearMultiplier: number;  // e.g., Push 1.3x, Balanced 1x, Save 0.8x
}

export interface RacerState {
  id: string;
  name: string;
  car: CarStats;
  tire: TireCompound;
  strategy: Strategy;
  fuel: number;            // 0-100
  tireHealth: number;      // 0-100
  totalLaps: number;
  totalTime: number;       // seconds
  lastLapTime: number;
  dnf?: boolean;
  dnfReason?: string;
}

export interface LeaderboardEntry extends RacerState {
  position: number;
  interval: number;        // seconds to leader
}

// Tire compounds data
export const TIRES: Record<TireCompound['name'], TireCompound> = {
  Soft: { name: 'Soft', wearRate: 2.8, grip: 1.05 },
  Medium: { name: 'Medium', wearRate: 2.0, grip: 1.0 },
  Hard: { name: 'Hard', wearRate: 1.4, grip: 0.96 },
  Inter: { name: 'Inter', wearRate: 1.8, grip: 0.92 },
  Wet: { name: 'Wet', wearRate: 1.5, grip: 0.88 },
};

export const STRATEGIES: Record<Strategy['mode'], Strategy> = {
  Push: { mode: 'Push', speedModifier: -0.3, wearMultiplier: 1.3 },
  Balanced: { mode: 'Balanced', speedModifier: 0, wearMultiplier: 1.0 },
  Save: { mode: 'Save', speedModifier: 0.2, wearMultiplier: 0.8 },
};

// Base lap time formula (seconds)
function baseLapTime(car: CarStats, tire: TireCompound, fuel: number, tireHealth: number, strategy: Strategy): number {
  const base = 85; // base reference lap time at a generic track

  // Car stats influence
  const speedEffect = (350 - car.topSpeed) * 0.02; // lower topSpeed = slower
  const corneringEffect = (100 - car.cornering) * 0.015;

  // Tire grip
  const gripEffect = (1 - tire.grip) * 2.5;

  // Tire degradation: 0.1s slower per 10% lost
  const tireDegEffect = ((100 - tireHealth) / 10) * 0.1;

  // Fuel weight: 0.05s faster per lap as fuel goes from 100 to 0
  const fuelEffect = (fuel / 100) * 0.05;

  // Strategy modifier
  const strategyEffect = strategy.speedModifier;

  return Math.max(60, base + speedEffect + corneringEffect + gripEffect + tireDegEffect + fuelEffect + strategyEffect);
}

// Simulate a single lap for a racer
export function simulateLap(racer: RacerState, weather: 'Dry' | 'Damp' | 'Wet' = 'Dry'): RacerState {
  // Reliability DNF check
  if (Math.random() * 100 > racer.car.reliability) {
    return { ...racer, dnf: true, dnfReason: 'Mechanical failure' };
  }

  // Calculate lap time
  const lapTime = baseLapTime(racer.car, racer.tire, racer.fuel, racer.tireHealth, racer.strategy);

  // Apply tire wear
  const wearThisLap = racer.tire.wearRate * racer.strategy.wearMultiplier;
  const newTireHealth = Math.max(0, racer.tireHealth - wearThisLap);

  // Consume fuel
  const newFuel = Math.max(0, racer.fuel - 1.8);

  // DNF if out of fuel or tires
  if (newFuel <= 0) {
    return { ...racer, dnf: true, dnfReason: 'Out of fuel' };
  }
  if (newTireHealth <= 0) {
    return { ...racer, dnf: true, dnfReason: 'Puncture' };
  }

  return {
    ...racer,
    fuel: newFuel,
    tireHealth: newTireHealth,
    totalLaps: racer.totalLaps + 1,
    totalTime: racer.totalTime + lapTime,
    lastLapTime: lapTime,
  };
}

// Generate initial grid
export function createGrid(
  drivers: Array<{ id: string; name: string; car: CarStats }>,
  defaultTire: TireCompound['name'],
  defaultStrategy: Strategy['mode']
): RacerState[] {
  return drivers.map((d, idx) => ({
    ...d,
    tire: TIRES[defaultTire],
    strategy: STRATEGIES[defaultStrategy],
    fuel: 100,
    tireHealth: 100,
    totalLaps: 0,
    totalTime: 0,
    lastLapTime: 0,
  }));
}

// Build leaderboard sorted by total laps then total time
export function buildLeaderboard(racers: RacerState[]): LeaderboardEntry[] {
  const sorted = racers
    .filter(r => !r.dnf)
    .sort((a, b) => {
      if (b.totalLaps !== a.totalLaps) return b.totalLaps - a.totalLaps;
      return a.totalTime - b.totalTime;
    })
    .map((r, idx) => {
      const leaderTime = sorted[0]?.totalTime ?? 0;
      const interval = idx === 0 ? 0 : r.totalTime - leaderTime;
      return { ...r, position: idx + 1, interval };
    });

  // Append DNFs at the end
  const dnfs = racers
    .filter(r => r.dnf)
    .map((r, idx) => ({ ...r, position: sorted.length + idx + 1, interval: 0 }));

  return [...sorted, ...dnfs];
}

// Simulate a full race (async, lap-by-lap)
export async function runRace(
  initialGrid: RacerState[],
  totalLaps: number,
  onLapComplete?: (leaderboard: LeaderboardEntry[], lap: number) => void,
  weather: 'Dry' | 'Damp' | 'Wet' = 'Dry',
  updateIntervalMs: number = 2000
): Promise<LeaderboardEntry[]> {
  let racers = initialGrid;
  for (let lap = 1; lap <= totalLaps; lap++) {
    racers = racers.map(r => simulateLap(r, weather));
    const leaderboard = buildLeaderboard(racers);
    onLapComplete?.(leaderboard, lap);
    if (updateIntervalMs > 0) await new Promise(res => setTimeout(res, updateIntervalMs));
  }
  return buildLeaderboard(racers);
}

// Example usage:
/*
const drivers = [
  { id: '1', name: 'Player', car: { topSpeed: 335, cornering: 85, reliability: 92 } },
  { id: '2', name: 'Rival A', car: { topSpeed: 332, cornering: 88, reliability: 90 } },
  { id: '3', name: 'Rival B', car: { topSpeed: 330, cornering: 82, reliability: 94 } },
];

const grid = createGrid(drivers, 'Medium', 'Balanced');

runRace(grid, 20, (lb, lap) => {
  console.log(`Lap ${lap}`);
  lb.forEach(e => console.log(`${e.position}. ${e.name} +${e.interval.toFixed(1)}s`));
});
*/

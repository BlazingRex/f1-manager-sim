function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function calculateTotalLapTime({
  baseTime,
  tireWearPenalty = 0,
  weatherMismatchPenalty = 0,
  staffBuffs = 0,
  tireCompound,
  weather,
  chiefEngineerTier,
}) {
  let total =
    asNumber(baseTime) +
    asNumber(tireWearPenalty) +
    asNumber(weatherMismatchPenalty) +
    asNumber(staffBuffs);

  if (tireCompound === 'Softs' && weather === 'Heavy Rain') {
    total += 20;
  }

  if (chiefEngineerTier === 'Elite') {
    total -= 1;
  }

  return total;
}

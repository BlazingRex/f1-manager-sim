function clampNumber(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

export function calculateFinalLapTime({
  wearPercent,
  weather,
  tireType,
  engineerSkill = 0,
  rng = Math.random,
}) {
  let total = 90;

  const wear = clampNumber(wearPercent, 0, 100);
  if (wear > 50) {
    total += (wear - 50) * 0.1;
  }

  if (tireType === 'Slicks') {
    if (weather === 'Heavy Rain') total += 30;
    else if (weather === 'Rainy') total += 15;
  }

  total -= clampNumber(engineerSkill, 0, 100) / 20;

  const fluctuation = (rng() - 0.5) * 1.0;
  total += fluctuation;

  return total;
}

const CONDITIONS = Object.freeze({
  Clear: 'Clear',
  Rainy: 'Rainy',
  HeavyRain: 'Heavy Rain',
});

function clampInt(value, min, max) {
  const num = Math.round(Number(value));
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

export function getConditionFromIntensity(intensity) {
  const i = clampInt(intensity, 0, 100);
  if (i > 70) return CONDITIONS.HeavyRain;
  if (i > 40) return CONDITIONS.Rainy;
  return CONDITIONS.Clear;
}

export function tickRainIntensity(intensity, rng = Math.random) {
  const current = clampInt(intensity, 0, 100);

  let next = current;
  if (rng() < 0.1) {
    const direction = rng() < 0.5 ? -1 : 1;
    next = clampInt(current + direction * 20, 0, 100);
  }

  return {
    intensity: next,
    condition: getConditionFromIntensity(next),
  };
}

export const WeatherConditions = CONDITIONS;

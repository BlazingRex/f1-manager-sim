function getTireColor(valuePercent) {
  if (valuePercent >= 70) return 'telemetryGreen';
  if (valuePercent >= 30) return 'telemetryOrange';
  return 'telemetryRed';
}

function clampPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

function ProgressBar({ valuePercent, colorClass }) {
  const clamped = clampPercent(valuePercent);
  return (
    <div className="hudTrack">
      <div className={`hudFill ${colorClass}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default function TelemetryHUD({ tireHealth, fuelLevel, gapToLeaderSec }) {
  const tire = clampPercent(tireHealth);
  const fuel = clampPercent(fuelLevel);
  const gap = Number(gapToLeaderSec) || 0;

  return (
    <section className="telemetryHud">
      <div className="telemetryHudTitle">Telemetry HUD</div>

      <div className="hudRow">
        <div className="hudHeader">
          <div className="hudLabel">Tire Health</div>
          <div className="hudValue">{Math.round(tire)}%</div>
        </div>
        <ProgressBar valuePercent={tire} colorClass={getTireColor(tire)} />
      </div>

      <div className="hudRow">
        <div className="hudHeader">
          <div className="hudLabel">Fuel Level</div>
          <div className="hudValue">{Math.round(fuel)}%</div>
        </div>
        <ProgressBar valuePercent={fuel} colorClass="telemetryBlue" />
      </div>

      <div className="hudGap">
        <div className="hudLabel">Gap to Leader</div>
        <div className="hudGapValue">+{gap.toFixed(1)}s</div>
      </div>
    </section>
  );
}

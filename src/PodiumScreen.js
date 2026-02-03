function formatDuration(totalSeconds) {
  const total = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PodiumScreen({ top3, totalRaceTimeSec, bestLapSec, totalPitStops, showConfetti }) {
  const winners = Array.isArray(top3) ? top3.slice(0, 3) : [];

  const gold = winners[0];
  const silver = winners[1];
  const bronze = winners[2];

  const confettiPieces = showConfetti
    ? Array.from({ length: 40 }, (_, i) => ({
        key: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 1.8 + Math.random() * 1.6,
      }))
    : [];

  return (
    <section className="data-panel podiumScreen">
      <div className="panelTitle">Podium</div>

      {showConfetti ? (
        <div className="confettiLayer" aria-hidden="true">
          {confettiPieces.map((p) => (
            <div
              key={p.key}
              className="confettiPiece"
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="podiumWrap">
        <div className="podiumCol">
          <div className="podiumName">{silver?.name ?? '—'}</div>
          <div className="podiumPillar pillarSilver">
            <div className="podiumPlace">2</div>
          </div>
        </div>

        <div className="podiumCol">
          <div className="podiumName">{gold?.name ?? '—'}</div>
          <div className="podiumPillar pillarGold">
            <div className="podiumPlace">1</div>
          </div>
        </div>

        <div className="podiumCol">
          <div className="podiumName">{bronze?.name ?? '—'}</div>
          <div className="podiumPillar pillarBronze">
            <div className="podiumPlace">3</div>
          </div>
        </div>
      </div>

      <div className="panelTitle" style={{ marginTop: 16 }}>
        Race Statistics
      </div>
      <div className="telemetry-grid">
        <div className="data-panel">
          <div className="label">Total Race Time</div>
          <div className="stat-value">{formatDuration(totalRaceTimeSec)}</div>
        </div>
        <div className="data-panel">
          <div className="label">Best Lap</div>
          <div className="stat-value">{bestLapSec ? `${bestLapSec.toFixed(1)}s` : '—'}</div>
        </div>
        <div className="data-panel">
          <div className="label">Total Pit Stops</div>
          <div className="stat-value">{Number(totalPitStops) || 0}</div>
        </div>
      </div>
    </section>
  );
}

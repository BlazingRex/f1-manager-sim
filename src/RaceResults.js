function formatDuration(totalSeconds) {
  const total = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getGrade({ totalTimeSec, dnf }) {
  if (dnf) return 'F';
  if (totalTimeSec < 80 * 60) return 'S';
  if (totalTimeSec < 85 * 60) return 'A';
  return 'F';
}

export default function RaceResults({
  totalTimeSec,
  wrongTireLaps,
  totalLaps,
  dnf,
  dnfReason,
  onRestart,
}) {
  const laps = Math.max(1, Number(totalLaps) || 1);
  const wrong = Math.max(0, Number(wrongTireLaps) || 0);
  const consistencyScore = Math.max(0, Math.round(((laps - wrong) / laps) * 100));
  const grade = getGrade({ totalTimeSec, dnf });

  return (
    <section className="data-panel raceResults">
      <div className="panelTitle">Race Results</div>
      <div className="panelContent">
        <div className="telemetry-grid">
          <div className="data-panel">
            <div className="label">Total Time</div>
            <div className="stat-value">{formatDuration(totalTimeSec)}</div>
          </div>
          <div className="data-panel">
            <div className="label">Consistency</div>
            <div className="stat-value">{consistencyScore}%</div>
          </div>
          <div className="data-panel">
            <div className="label">Grade</div>
            <div className="stat-value">{grade} Rank</div>
          </div>
        </div>

        <div className="label">
          Wrong-tire laps: {wrong} / {laps}
        </div>

        {dnf ? <div className="raceStatusSubtitle">F Rank (DNF): {dnfReason}</div> : null}

        <button type="button" className="pit-btn" onClick={onRestart}>
          Restart Season
        </button>
      </div>
    </section>
  );
}

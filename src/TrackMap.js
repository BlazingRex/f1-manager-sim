export default function TrackMap({ cars }) {
  const list = Array.isArray(cars) ? cars : [];

  const playerCar = list.find((c) => c?.id === 'Player' || c?.name === 'Player');
  const playerLabel = playerCar?.teamName || 'YOU';

  return (
    <div className="track-container" style={{ position: 'relative', height: '300px' }}>
      <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%' }}>
        <ellipse cx="250" cy="100" rx="200" ry="80" fill="none" stroke="#333" strokeWidth="15" />

        {list.map((car) => {
          const angle = ((Number(car.progress) || 0) / 100) * 2 * Math.PI;
          const x = 250 + 200 * Math.cos(angle);
          const y = 100 + 80 * Math.sin(angle);

          const isPlayer = car?.id === 'Player' || car?.name === 'Player';

          return (
            <g key={car.id}>
              {isPlayer ? (
                <text
                  x={x}
                  y={y - 14}
                  textAnchor="middle"
                  className="playerDotLabel"
                >
                  {playerLabel}
                </text>
              ) : null}

              <circle
                cx={x}
                cy={y}
                r={isPlayer ? 10 : 6}
                fill={isPlayer ? '#39ff14' : car.color}
                className={isPlayer ? 'playerDotPulse' : 'glow-dot'}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

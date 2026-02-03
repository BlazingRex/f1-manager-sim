export default function TrackMap({ cars }) {
  const list = Array.isArray(cars) ? cars : [];
  console.log('TrackMap cars:', cars); // Debug: log incoming data

  const playerCar = list.find((c) => c?.id === 'Player' || c?.name === 'Player');
  const playerLabel = playerCar?.teamName || 'YOU';

  // Dynamic viewBox dimensions relative to container
  const svgWidth = 500;
  const svgHeight = 200;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const radiusX = svgWidth * 0.4;
  const radiusY = svgHeight * 0.4;

  return (
    <div
      className="track-container"
      style={{
        position: 'relative',
        height: '400px',
        width: '100%',
        zIndex: 10,
        border: '3px solid #ff0000',
        backgroundColor: '#0a0a0a',
      }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={radiusX}
          ry={radiusY}
          fill="none"
          stroke="#333"
          strokeWidth="15"
        />

        {list.map((car) => {
          const angle = ((Number(car.progress) || 0) / 100) * 2 * Math.PI;
          const x = centerX + radiusX * Math.cos(angle);
          const y = centerY + radiusY * Math.sin(angle);

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

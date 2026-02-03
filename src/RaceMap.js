export default function RaceMap({ cars }) {
  const list = Array.isArray(cars) ? cars : [];

  const centerX = 250;
  const centerY = 100;
  const radiusX = 200;
  const radiusY = 80;

  return (
    <div className="track-container" style={{ position: 'relative', height: '300px' }}>
      <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%' }}>
        <ellipse cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} fill="none" stroke="#333" strokeWidth="15" />

        {list.map((car) => {
          const progress = Number(car.progress) || 0;
          const angle = (progress / 100) * 2 * Math.PI;
          const x = centerX + radiusX * Math.cos(angle);
          const y = centerY + radiusY * Math.sin(angle);

          const isPlayer = car.id === 'Player';

          return (
            <circle
              key={car.id}
              cx={x}
              cy={y}
              r={isPlayer ? 9 : 6}
              fill={car.color}
              style={
                isPlayer
                  ? { filter: 'drop-shadow(0 0 5px #39ff14)' }
                  : { filter: 'drop-shadow(0 0 4px rgba(0, 242, 255, 0.25))' }
              }
            />
          );
        })}
      </svg>
    </div>
  );
}

import { useLayoutEffect, useRef } from 'react';

function getTireIconLabel(tireType) {
  if (tireType === 'Wets') return 'W';
  if (tireType === 'Inter') return 'I';
  if (tireType === 'Slicks') return 'S';
  if (tireType === 'Soft') return 'S';
  if (tireType === 'Medium') return 'M';
  if (tireType === 'Hard') return 'H';
  return '?';
}

export default function LiveLeaderboard({ cars }) {
  const list = Array.isArray(cars) ? cars : [];

  const sorted = list
    .slice()
    .sort(
      (a, b) =>
        (Number(b.totalDistanceTravelled) || 0) - (Number(a.totalDistanceTravelled) || 0)
    )
    .slice(0, 10);

  const rowRefs = useRef(new Map());
  const prevRects = useRef(new Map());

  useLayoutEffect(() => {
    const moves = [];

    for (const car of sorted) {
      const el = rowRefs.current.get(car.id);
      if (!el) continue;

      const prev = prevRects.current.get(car.id);
      const next = el.getBoundingClientRect();
      prevRects.current.set(car.id, next);

      if (!prev) continue;
      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (dx === 0 && dy === 0) continue;

      moves.push({ el, dx, dy });
    }

    if (!moves.length) return;

    for (const m of moves) {
      m.el.style.transform = `translate(${m.dx}px, ${m.dy}px)`;
      m.el.style.transition = 'transform 0s';
    }

    requestAnimationFrame(() => {
      for (const m of moves) {
        m.el.style.transform = '';
        m.el.style.transition = '';
      }
    });
  }, [sorted]);

  return (
    <section className="liveLeaderboard">
      <div className="panelTitle">Live Leaderboard</div>
      <div className="leaderboardList">
        {sorted.map((c, idx) => (
          <div
            key={c.id}
            ref={(el) => {
              if (!el) {
                rowRefs.current.delete(c.id);
                return;
              }
              rowRefs.current.set(c.id, el);
            }}
            className={`leaderboardRow ${c.id === 'Player' ? 'leaderboardPlayer' : ''}`}
          >
            <div className="leaderboardPos">{idx + 1}</div>
            <div className="leaderboardName" style={{ color: c.color }}>
              {c.id !== 'Player' ? (
                <span className="tireIcon" title={`Tire: ${c.tireType ?? 'Unknown'}`}>
                  {getTireIconLabel(c.tireType)}
                </span>
              ) : null}
              {c.name}
            </div>
            <div className="leaderboardTime">
              {(Number(c.totalDistanceTravelled) || 0).toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';

function appendIfNew(setMessages, key, lapNumber, text) {
  setMessages((prev) => {
    if (prev.some((m) => m.key === key)) return prev;
    return [...prev, { key, lapNumber, text }];
  });
}

export default function RaceFeed({ gameState }) {
  const [messages, setMessages] = useState([]);
  const prevRef = useRef(null);

  useEffect(() => {
    if (!gameState) return;

    const prev = prevRef.current;

    if (prev && prev.weather !== 'Rainy' && gameState.weather === 'Rainy') {
      appendIfNew(
        setMessages,
        `rain-start-${gameState.lapNumber}`,
        gameState.lapNumber,
        'Engineer: Clouds are gathering!'
      );
    }

    const prevWear = prev ? 100 - prev.carStats.tireHealth : 0;
    const currentWear = 100 - gameState.carStats.tireHealth;
    if (prevWear <= 70 && currentWear > 70) {
      appendIfNew(
        setMessages,
        `tire-wear-${gameState.lapNumber}`,
        gameState.lapNumber,
        "Driver: These tires are gone, I'm sliding everywhere!"
      );
    }

    if (
      gameState.lastEvent &&
      gameState.lastEvent.includes('CRITICAL ERROR: Wheel nut stuck!')
    ) {
      appendIfNew(
        setMessages,
        `pit-fail-${gameState.lapNumber}`,
        gameState.lapNumber,
        'CRITICAL ERROR: Wheel nut stuck!'
      );
    }

    prevRef.current = gameState;
  }, [gameState]);

  return (
    <section className="raceFeed">
      <div className="raceFeedTitle">Race Feed</div>
      <div className="raceFeedList">
        {messages.length === 0 ? (
          <div className="raceFeedEmpty">—</div>
        ) : (
          messages
            .slice()
            .reverse()
            .map((m) => (
              <div key={m.key} className="raceFeedItem">
                <div className="raceFeedLap">Lap {m.lapNumber}</div>
                <div className="raceFeedText">{m.text}</div>
              </div>
            ))
        )}
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import { staffMarket } from './staffData';

function formatMoney(value) {
  const num = Number(value) || 0;
  return `$${num.toLocaleString()}`;
}

export default function HiringHall() {
  const [hiredEngineerId, setHiredEngineerId] = useState(null);
  const [hiredPitCrewId, setHiredPitCrewId] = useState(null);

  // Get or initialize budget from window bridge
  const [budget, setBudget] = useState(() => (typeof window !== 'undefined' && window.budget) || Math.floor(800000 + Math.random() * 1400000));

  const engineers = useMemo(() => staffMarket.engineers ?? [], []);
  const pitCrews = useMemo(() => staffMarket.pitCrews ?? [], []);

  // Persist to F1Engine via simple global/state bridge
  if (typeof window !== 'undefined') {
    window.hiredEngineerId = hiredEngineerId;
    window.hiredPitCrewId = hiredPitCrewId;
    window.budget = budget;
  }

  const handleHireEngineer = (engineer) => {
    if (budget >= engineer.cost) {
      setHiredEngineerId(engineer.id);
      setBudget((prev) => prev - engineer.cost);
    }
  };

  const handleHirePitCrew = (pitCrew) => {
    if (budget >= pitCrew.cost) {
      setHiredPitCrewId(pitCrew.id);
      setBudget((prev) => prev - pitCrew.cost);
    }
  };

  return (
    <div className="f1-dashboard">
      <header className="dashboardTopBar">
        <div className="topBarLeft">
          <div className="title">F1 Manager Sim</div>
          <div className="subtitle">Hiring Hall</div>
        </div>
        <div className="topBarRight">
          <div className="data-panel topStat">
            <div className="label">Budget</div>
            <div className="stat-value">{formatMoney(budget)}</div>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="data-panel dashboardPanel">
          <div className="panelTitle">Engineers</div>
          <div className="panelContent">
            <div className="hiringGrid">
              {engineers.map((e) => {
                const isHired = hiredEngineerId === e.id;
                return (
                  <div key={e.id} className={`hiringCard ${isHired ? 'hiringCardActive' : ''}`}>
                    <div className="hiringName">{e.name}</div>
                    <div className="hiringMeta">Skill: {e.skill}</div>
                    <div className="hiringMeta">Cost: {formatMoney(e.cost)}</div>
                    <div className="hiringMeta">Salary: {formatMoney(e.salary)}</div>
                    <button
                      type="button"
                      className="pit-btn"
                      onClick={() => handleHireEngineer(e)}
                      disabled={isHired || budget < e.cost}
                      style={{ width: '100%', marginTop: 10 }}
                    >
                      {isHired ? 'Hired' : budget < e.cost ? 'Too Expensive' : 'Hire'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="data-panel dashboardPanel" style={{ marginTop: 14 }}>
          <div className="panelTitle">Pit Crews</div>
          <div className="panelContent">
            <div className="hiringGrid">
              {pitCrews.map((p) => {
                const isHired = hiredPitCrewId === p.id;
                return (
                  <div key={p.id} className={`hiringCard ${isHired ? 'hiringCardActive' : ''}`}>
                    <div className="hiringName">{p.name}</div>
                    <div className="hiringMeta">Skill: {p.skill}</div>
                    <div className="hiringMeta">Cost: {formatMoney(p.cost)}</div>
                    <div className="hiringMeta">Pit Time: {Number(p.pitTime).toFixed(1)}s</div>
                    <button
                      type="button"
                      className="pit-btn"
                      onClick={() => handleHirePitCrew(p)}
                      disabled={isHired || budget < p.cost}
                      style={{ width: '100%', marginTop: 10 }}
                    >
                      {isHired ? 'Hired' : budget < p.cost ? 'Too Expensive' : 'Hire'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

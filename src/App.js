import { useState } from 'react';
import HiringHall from './HiringHall';
import RaceSimulation from './RaceSimulation';

export default function App() {
  const [activeTab, setActiveTab] = useState('paddock');

  let mainView = null;
  if (activeTab === 'paddock') {
    mainView = <HiringHall />;
  } else if (activeTab === 'race') {
    mainView = <RaceSimulation />;
  }

  return (
    <div>
      <div className="tab-container">
        <button
          type="button"
          className={`tab-button ${activeTab === 'paddock' ? 'active' : ''}`}
          onClick={() => setActiveTab('paddock')}
        >
          THE PADDOCK
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'race' ? 'active' : ''}`}
          onClick={() => setActiveTab('race')}
        >
          RACE CONTROL
        </button>
      </div>

      {mainView}
    </div>
  );
}

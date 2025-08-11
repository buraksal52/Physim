import React, { useState, useCallback } from 'react';
import SerbestDusmeControls from './SerbestDusmeControls';
import SerbestDusmeSimulation from './SerbestDusmeSimulation';
import './SerbestDusme.css';

const SerbestDusmeContainer = () => {
  const [resetKey, setResetKey] = useState(0);
  const [ballInfo, setBallInfo] = useState({ height: 0, velocity: 0 });

  const handleReset = useCallback(() => {
    setResetKey(prevKey => prevKey + 1);
  }, []);

  return (
    <div className="simulation-container">
      <div className="simulation-layout">
        <SerbestDusmeSimulation 
          resetKey={resetKey} 
          onDataUpdate={setBallInfo} 
        />
        <SerbestDusmeControls 
          onReset={handleReset} 
          ballInfo={ballInfo} 
        />
      </div>
    </div>
  );
};

// src/simulations/SerbestDusme/SerbestDusme.css
/*
.simulation-container {
  background-color: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.simulation-layout {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
*/

export default SerbestDusmeContainer;
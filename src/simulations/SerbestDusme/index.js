import React, { useState, useCallback } from 'react';
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
      <SerbestDusmeSimulation 
        resetKey={resetKey} 
        onDataUpdate={setBallInfo} 
      />
    </div>
  );
};

export default SerbestDusmeContainer;
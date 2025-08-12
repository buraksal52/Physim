import React, { useState } from 'react';
import SerbestDusmeSimulation from './SerbestDusmeSimulation';
import './SerbestDusme.css';

const SerbestDusmeContainer = () => {
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="simulation-container">
      <SerbestDusmeSimulation 
        resetKey={resetKey} 
        onDataUpdate={() => {}} 
      />
    </div>
  );
};

export default SerbestDusmeContainer;
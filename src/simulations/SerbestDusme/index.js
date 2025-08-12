import React from 'react';
import SerbestDusmeSimulation from './SerbestDusmeSimulation';
import './SerbestDusme.css';

const SerbestDusmeContainer = () => {
  return (
    <div className="simulation-container">
      <SerbestDusmeSimulation 
        resetKey={0} 
        onDataUpdate={() => {}} 
      />
    </div>
  );
};

export default SerbestDusmeContainer;
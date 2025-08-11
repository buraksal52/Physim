import React, { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';

// Statik import kullanarak daha güvenilir hale getiriyoruz
const SerbestDusmeContainer = lazy(() => import('../simulations/SerbestDusme'));

// Simülasyon mapping'i
const simulationComponents = {
  'serbest-dusme': SerbestDusmeContainer,
};

const SimulationLoader = ({ simulationName }) => {
  const Component = simulationComponents[simulationName];
  
  if (!Component) {
    return <div>Simülasyon bulunamadı: {simulationName}</div>;
  }
  
  return <Component />;
};

const SimulationPage = () => {
  const { simulationName } = useParams();

  if (!simulationName) {
    return <div>Lütfen bir simülasyon seçin.</div>;
  }

  return (
    <div>
      <Suspense fallback={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          fontSize: '18px',
          color: '#666'
        }}>
          Simülasyon Yükleniyor...
        </div>
      }>
        <SimulationLoader simulationName={simulationName} />
      </Suspense>
    </div>
  );
};

export default SimulationPage;
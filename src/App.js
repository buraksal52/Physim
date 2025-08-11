import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SimulationPage from './pages/SimulationPage';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/simulasyon/serbest-dusme" />} />
            <Route path="/simulasyon/:simulationName" element={<SimulationPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
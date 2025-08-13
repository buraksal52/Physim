import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const simulations = [
  { name: 'Serbest Düşme', path: 'serbest-dusme' },
  { name: 'Yatay Atış', path: 'yatay-atis' },
  // Yeni simülasyonlar buraya eklenecek
  // { name: 'Eğik Atış', path: 'egik-atis' },
];

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">Konular</div>
      <nav>
        <ul>
          {simulations.map((sim) => (
            <li key={sim.path}>
              <NavLink to={`/simulasyon/${sim.path}`}>
                {sim.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

// src/components/Sidebar.css
/*
.sidebar {
  width: 250px;
  background-color: #001529;
  color: rgba(255, 255, 255, 0.65);
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  padding: 20px;
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  text-align: center;
}

.sidebar nav ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.sidebar nav li a {
  display: block;
  padding: 12px 24px;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  transition: all 0.2s;
}

.sidebar nav li a:hover {
  background-color: #1890ff;
  color: #fff;
}

.sidebar nav li a.active {
  background-color: #1890ff;
  color: #fff;
}
*/
export default Sidebar;
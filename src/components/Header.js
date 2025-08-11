import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <h1>YKS Fizik Simülasyonları</h1>
    </header>
  );
};

// Header.css dosyasını da oluşturalım.
// src/components/Header.css
/*
.header {
  background-color: #fff;
  padding: 0 24px;
  border-bottom: 1px solid #e8e8e8;
  height: 64px;
  display: flex;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
}
*/
export default Header;
import React, { useState } from 'react';
import UploadGazette from './pages/UploadGazette';
import SearchResults from './pages/SearchResults';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');

  return (
    <div className="app-shell">
      <header className="navbar">
        <h3 className="brand-title">BISE Gazette Admin</h3>
        <div className="nav-actions">
          <button
            onClick={() => setActiveTab('upload')}
            className={`nav-btn ${activeTab === 'upload' ? 'active' : ''}`}
          >
            Page 1: Upload & Map PDF
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`nav-btn ${activeTab === 'search' ? 'active' : ''}`}
          >
            Page 2: Search Results
          </button>
        </div>
      </header>

      <main className="content-area">
        {activeTab === 'upload' ? <UploadGazette /> : <SearchResults />}
      </main>
    </div>
  );
}
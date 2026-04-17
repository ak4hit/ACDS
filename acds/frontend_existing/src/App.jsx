import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import Blueprints from './pages/Blueprints';
import Threats from './pages/Threats';
import Intelligence from './pages/Intelligence';
import Archives from './pages/Archives';
import Settings from './pages/Settings';

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <div className="flex h-screen bg-[#131313] overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <div className="flex-1 overflow-y-auto relative z-10">
              <Routes>
                <Route path="/" element={<Navigate to="/blueprints" replace />} />
                <Route path="/blueprints" element={<Blueprints />} />
                <Route path="/threats" element={<Threats />} />
                <Route path="/intelligence" element={<Intelligence />} />
                <Route path="/archives" element={<Archives />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </SocketProvider>
  );
}

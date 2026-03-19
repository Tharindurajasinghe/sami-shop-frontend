import React, { useState } from 'react';
import api from '../services/api';

const Navbar = ({ activeScreen, setActiveScreen, onLogout }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');

  const navItems = [
    { id: 'selling', label: 'Start Today', icon: '🛒' },
    { id: 'store', label: 'Store', icon: '📦' },
    { id: 'summary', label: 'Summary', icon: '📊' },
    { id: 'checkbill', label: 'Check Bill', icon: '🧾' }
  ];

  const handleNavClick = (screenId) => {
    if (screenId === 'summary') {
      setShowPasswordModal(true);
    } else {
      setActiveScreen(screenId);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.verifyPassword({ password });
      
      if (response.data.success) {
        setActiveScreen('summary');
        setShowPasswordModal(false);
        setPassword('');
      } else {
        alert('Incorrect password!');
        setPassword('');
      }
    } catch (error) {
      alert('Incorrect password!');
      setPassword('');
    }
  };

  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setPassword('');
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm(
      'Are you sure you want to logout?'
    );
    if (confirmLogout) {
      onLogout();
    }
  };

  return (
    <>
      <nav className="bg-blue-600 text-white shadow-lg sticky top-0">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-bold">The Vision</h1>
            
            <div className="flex space-x-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-4 py-2 rounded transition ${
                    activeScreen === item.id
                      ? 'bg-green-700'
                      : 'hover:bg-green-500'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Enter Password</h2>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 mb-4 text-gray-800"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
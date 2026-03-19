import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Navbar from './components/Navbar';
import SellingScreen from './components/SellingScreen';
import StoreManagement from './components/StoreManagement';
import Summary from './components/Summary';
import CheckBill from './components/CheckBill';
import DayEndSummary from './components/DayEndSummary';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeScreen, setActiveScreen] = useState('selling');
  const [dayEndData, setDayEndData] = useState(null);

  useEffect(() => {
    // Check if already logged in
    const loggedIn = localStorage.getItem('jagathStoreLoggedIn');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    localStorage.setItem('jagathStoreLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('jagathStoreLoggedIn');
    localStorage.removeItem('token'); 
    setIsLoggedIn(false);
    setActiveScreen('selling');
  };

  const handleEndDay = (data) => {
    setDayEndData(data);
    setActiveScreen('dayend');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar 
        activeScreen={activeScreen} 
        setActiveScreen={setActiveScreen}
        onLogout={handleLogout}
      />
      <div className="container mx-auto px-4 py-6">
        {activeScreen === 'selling' && <SellingScreen onEndDay={handleEndDay} />}
        {activeScreen === 'store' && <StoreManagement />}
        {activeScreen === 'summary' && <Summary />}
        {activeScreen === 'checkbill' && <CheckBill />}
        {activeScreen === 'dayend' && <DayEndSummary data={dayEndData} onLogout={handleLogout} />}
      </div>
    </div>
  );
}

export default App;


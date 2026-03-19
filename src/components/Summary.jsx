import React, { useState, useEffect } from 'react';
import api from '../services/api';
import MonthSummary from './MonthSummary';
import SummaryTable from './SummaryTable';
import LoadingOverlay from './LoadingOverlay';

const Summary = () => {
  const [viewType, setViewType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySummary, setDailySummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (viewType === 'daily') {
      loadDailySummary();
    }
  }, [selectedDate, viewType]);

  const loadDailySummary = async () => {
    setLoading(true);
    try {
      const response = await api.getDailySummary(selectedDate);
      setDailySummary(response.data);
    } catch (error) {
      setDailySummary(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {loading && <LoadingOverlay message="Loading summary..." />}

      <h2 className="text-2xl font-bold mb-6">Summary</h2>

      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setViewType('daily')}
          className={`px-6 py-2 rounded font-semibold ${
            viewType === 'daily'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Daily Summary
        </button>
        <button
          onClick={() => setViewType('monthly')}
          className={`px-6 py-2 rounded font-semibold ${
            viewType === 'monthly'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Monthly Summary
        </button>
      </div>

      {viewType === 'daily' ? (
        <div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2 font-semibold">View Summary Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {dailySummary ? (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-4">
                  Daily Summary - {new Date(dailySummary.date).toLocaleDateString()}
                </h3>

                <SummaryTable items={dailySummary.items} />

                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 mb-1">Total Income</p>
                      <p className="text-2xl font-bold text-green-600">
                        Rs. {dailySummary.totalIncome.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Total Profit</p>
                      <p className="text-2xl font-bold text-green-700">
                        Rs. {dailySummary.totalProfit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No summary available for this date</p>
              <p className="text-sm mt-2">Day must be ended to generate summary</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {viewType === 'monthly' && <MonthSummary />}
        </div>
      )}
    </div>
  );
};

export default Summary;

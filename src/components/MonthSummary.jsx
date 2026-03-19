import React, { useEffect, useState } from 'react';
import api from '../services/api';
import SummaryTable from './SummaryTable';

const MonthSummary = () => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [monthlySummaries, setMonthlySummaries] = useState([]);

  useEffect(() => {
    loadMonthlySummaries();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadMonthlySummary();
    }
  }, [selectedMonth]);

  const loadMonthlySummary = async () => {
    try {
      const response = await api.getMonthlySummary(selectedMonth);
      setMonthlySummary(response.data);
    } catch (error) {
      setMonthlySummary(null);
    }
  };

  const loadMonthlySummaries = async () => {
    try {
      const response = await api.getAllMonthlySummaries();
      setMonthlySummaries(response.data);
    } catch (error) {
      console.error('Error loading monthly summaries:', error);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <label className="block text-gray-700 mb-2 font-semibold">
          Select Month:
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">-- Select Month --</option>
          {monthlySummaries.map(summary => (
            <option key={summary.month} value={summary.month}>
              {summary.monthName}
            </option>
          ))}
        </select>
      </div>

      {monthlySummary ? (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2">
              {monthlySummary.monthName}
            </h3>
            <p className="text-sm text-gray-600">
              Period: {monthlySummary.startDate} to {monthlySummary.endDate}
              ({monthlySummary.daysIncluded} days)
            </p>
          </div>

          <SummaryTable items={monthlySummary.items} />
          
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-blue-600">
                  Rs. {monthlySummary.totalIncome.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Total Profit</p>
                <p className="text-2xl font-bold text-blue-700">
                  Rs. {monthlySummary.totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          {selectedMonth
            ? <p>No summary available for this month</p>
            : <p>Please select a month to view summary</p>
          }
        </div>
      )}
    </div>
  );
};

export default MonthSummary;

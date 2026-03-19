import React, { useState } from 'react';
import api from '../services/api.js';
import LoadingOverlay from '../components/LoadingOverlay';

const DayEndSummary = ({ data, onLogout }) => {
  const [loading, setLoading] = useState(false);

  const handleMakeMonthSummary = async () => {
    try {
      setLoading(true);
      await api.createMonthlySummary();
      alert('Monthly summary created successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating monthly summary');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndEnd = async () => {
    const confirm = window.confirm(
      'Are you sure you want to save and end?\nThis will logout the system.'
    );
    if (!confirm) return;

    try {
      setLoading(true);
      await api.endDay();
      alert('Day ended and saved successfully!');
      onLogout();
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving day summary');
    } finally {
      setLoading(false);
    }
  };

  if (!data) return null;

  return (
    <>
      {loading && <LoadingOverlay message="Please wait, processing..." />}

      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-8">End Day Summary</h2>

        <div className="mb-8">
          <p className="text-center text-gray-600 mb-2">
            Date: {new Date(data.date).toLocaleDateString()}
          </p>
        </div>

        <div className="mb-8">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Item ID</th>
                <th className="px-4 py-3 text-left">Item Name</th>
                <th className="px-4 py-3 text-left">Variant</th>
                <th className="px-4 py-3 text-right">Sold Quantity</th>
                <th className="px-4 py-3 text-right">Total Income</th>
                <th className="px-4 py-3 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {data.items.sort((a, b) => a.productId.localeCompare(b.productId))
              .map(item => (
                <tr key={`${item.productId}_${item.variant || 'Standard'}`} className="border-b">
                  <td className="px-4 py-3">{item.productId}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      item.variant && item.variant !== 'Standard'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.variant || 'Standard'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{item.soldQuantity}</td>
                  <td className="px-4 py-3 text-right">
                    Rs. {item.totalIncome.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">
                    Rs. {item.profit.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-green-50 p-6 rounded-lg mb-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 mb-2">Total Income</p>
              <p className="text-3xl font-bold text-green-600">
                Rs. {data.totalIncome.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Total Profit</p>
              <p className="text-3xl font-bold text-green-700">
                Rs. {data.totalProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSaveAndEnd}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
            disabled={loading}
          >
            Save & End
          </button>
        </div>
      </div>
    </>
  );
};

export default DayEndSummary;

import React from 'react';

const UptoNowBox = ({ show, bills, onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-96 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Today's Bills</h2>

<div className="flex-1 overflow-y-auto p-6">
  <table className="w-full">
    <thead className="bg-gray-100">
      <tr>
        <th className="px-4 py-2 text-left">Bill ID</th>
        <th className="px-4 py-2 text-left">Time</th>
        <th className="px-4 py-2 text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      {bills.map(bill => (
        <tr key={bill.billId} className="border-b">
          <td className="px-4 py-2">{bill.billId}</td>
          <td className="px-4 py-2">{bill.time}</td>
          <td className="px-4 py-2 text-right font-semibold">
            Rs. {bill.totalAmount.toFixed(2)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<div className="p-4 border-t">
  <button
    onClick={onClose}
    className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
  >
    Close
  </button>
</div>

      </div>
    </div>
  );
};

export default UptoNowBox;

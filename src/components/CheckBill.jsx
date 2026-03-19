import React, { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingOverlay from './LoadingOverlay';
import { getBillHTML } from '../components/BillView';

const CheckBill = () => {
  const [billId, setBillId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [deletingBill, setDeletingBill] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const initialLoad = async () => {
      try {
        await Promise.all([loadAvailableDates(), loadTodayBills()]);
      } finally {
        setPageLoading(false);
      }
    };
    initialLoad();
  }, []);

  const loadAvailableDates = async () => {
    try {
      const response = await api.getAvailableDates();
      setAvailableDates(response.data);
    } catch (error) {
      console.error('Error loading dates:', error);
    }
  };

  const loadTodayBills = async () => {
    try {
      const response = await api.getTodayBills();
      setBills(response.data);
    } catch (error) {
      console.error('Error loading bills:', error);
    }
  };

  const searchBillById = async () => {
    if (!billId.trim()) {
      alert('Please enter a bill ID');
      return;
    }
    setSearching(true);
    try {
      const response = await api.getBill(billId);
      setSelectedBill(response.data);
      setShowBillDetails(true);
    } catch (error) {
      alert('Bill not found');
    } finally {
      setSearching(false);
    }
  };

  const searchBillsByDate = async (date) => {
    setSelectedDate(date);
    setSearching(true);
    try {
      const response = await api.getBillsByDate(date);
      setBills(response.data);
      setShowBillDetails(false);
    } catch (error) {
      console.error('Error loading bills:', error);
      setBills([]);
    } finally {
      setSearching(false);
    }
  };

  const handleBillClick = async (billId) => {
    setSearching(true);
    try {
      const response = await api.getBill(billId);
      setSelectedBill(response.data);
      setShowBillDetails(true);
    } catch (error) {
      alert('Error loading bill details');
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteBill = async () => {
    if (!selectedBill) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete Bill #${selectedBill.billId}?`
    );
    if (!confirmDelete) return;

    setDeletingBill(true);
    try {
      await api.deleteBill(selectedBill.billId);
      alert(`Bill #${selectedBill.billId} deleted successfully`);
      setShowBillDetails(false);
      if (selectedDate) {
        searchBillsByDate(selectedDate);
      } else {
        loadTodayBills();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting bill');
    } finally {
      setDeletingBill(false);
    }
  };

  const handlePrintBill = () => {
    if (!selectedBill) return;
    const w = window.open('', '', 'width=400,height=600');
    w.document.write(getBillHTML(selectedBill));
    w.document.close();
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {pageLoading && <LoadingOverlay message="Loading bills..." />}
      {deletingBill && <LoadingOverlay message="Removing bill..." />}
      {searching && <LoadingOverlay message="Searching..." />}
      {/* Left Panel: Bill Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Check Bill</h2>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-semibold">Enter Bill ID:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={billId}
              onChange={(e) => setBillId(e.target.value)}
              placeholder="e.g., 10006"
              className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={searchBillById}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Search
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-semibold">Search by Date:</label>
          <select
            value={selectedDate}
            onChange={(e) => searchBillsByDate(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">-- Select Date --</option>
            {availableDates.map((date) => (
              <option key={date.date} value={date.date}>
                {date.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="font-semibold mb-3">
            {selectedDate ? 'Bills for Selected Date' : "Today's Bills"}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bills.length > 0 ? (
              bills.map((bill) => (
                <div
                  key={bill.billId}
                  onClick={() => handleBillClick(bill.billId)}
                  className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Bill #{bill.billId}</p>
                      <p className="text-sm text-gray-600">{bill.time}</p>
                    </div>
                    <p className="font-bold text-green-600">
                      Rs. {bill.totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No bills found</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Bill Details */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Bill Details</h2>

        {showBillDetails && selectedBill ? (
          <div>
            <div className="mb-4 pb-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-lg font-bold">Bill #{selectedBill.billId}</p>
                  <p className="text-sm text-gray-600">Time: {selectedBill.time}</p>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(selectedBill.date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-left">Variant</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    {selectedBill.items.some(i => i.originalPrice != null) && (
                      <th className="px-3 py-2 text-right">Dis.Pri</th>
                    )}
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBill.items.map((item, index) => {
                    const isPriceEdited = item.originalPrice != null;
                    const hasAnyEdited = selectedBill.items.some(i => i.originalPrice != null);
                    return (
                      <tr key={index} className="border-b">
                        <td className="px-3 py-2">
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-gray-600">ID: {item.productId}</p>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.variant && item.variant !== 'Standard'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.variant || 'Standard'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">{item.quantity}
                          {item.unit && item.unit !== 'unit' && (
                           <span className="text-xs text-gray-500 ml-1">
                          {item.unit}
                        </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isPriceEdited ? (
                            <span className="line-through text-gray-400 text-xs">
                              Rs. {item.originalPrice.toFixed(2)}
                            </span>
                          ) : (
                            `Rs. ${item.price.toFixed(2)}`
                          )}
                        </td>
                        {hasAnyEdited && (
                          <td className="px-3 py-2 text-right">
                            {isPriceEdited ? (
                              <span className="font-semibold text-orange-600">
                                Rs. {item.price.toFixed(2)}
                              </span>
                            ) : ''}
                          </td>
                        )}
                        <td className="px-3 py-2 text-right font-semibold">
                          Rs. {item.total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cash, Change, Total */}
            <div className="bg-green-50 p-4 rounded space-y-2">
              {(() => {
                const totalDiscount = selectedBill.items.reduce((sum, i) => {
                  if (i.originalPrice != null) {
                    return sum + (i.originalPrice - i.price) * i.quantity;
                  }
                  return sum;
                }, 0);
                return totalDiscount > 0 ? (
                  <div className="flex justify-between">
                    <p className="text-lg font-bold text-orange-600">Discount:</p>
                    <p className="text-lg font-bold text-orange-600">
                      Rs. {totalDiscount.toFixed(2)}
                    </p>
                  </div>
                ) : null;
              })()}
              <div className="flex justify-between">
                <p className="text-lg font-bold">Cash Paid:</p>
                <p className="text-lg font-bold text-green-600">
                  Rs. {(selectedBill.cash ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between">
                <p className="text-lg font-bold">Change:</p>
                <p className="text-lg font-bold text-green-600">
                  Rs. {(selectedBill.change ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between border-t pt-2">
                <p className="text-lg font-bold">Total Amount:</p>
                <p className="text-lg font-bold text-green-600">
                  Rs. {(selectedBill.totalAmount ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            <button
              onClick={handlePrintBill}
              className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold"
            >
              Print Bill
            </button>

            <button
              onClick={handleDeleteBill}
              className="w-full mb-2 mt-2 bg-red-600 text-white py-2 rounded hover:bg-red-700"
            >
              Remove Bill
            </button>

            <button
              onClick={() => setShowBillDetails(false)}
              className="w-full mt-2 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <p>Select a bill to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckBill;

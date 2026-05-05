import React, { useState, useEffect } from 'react';
import api from '../services/api';

const LowStockAlert = () => {
  const [allLowStockItems, setAllLowStockItems] = useState([]);
  const [categories, setCategories]             = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus]     = useState(''); // NEW
  const [loading, setLoading]                   = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.getProducts(),
        api.getCategories()
      ]);
      const lowStock = productsRes.data.filter(product => product.stock <= 10);
      setAllLowStockItems(lowStock);
      setCategories(categoriesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading low stock items:', error);
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.categoryId === categoryId);
    return category ? category.name : 'Unknown';
  };

  // NEW: toggle — clicking active button deselects it
  const handleStatusToggle = (status) => {
    setSelectedStatus(prev => prev === status ? '' : status);
  };

  // ── Filter directly at render time — no separate state, no stale closures ──
  let displayedItems = selectedCategory
    ? allLowStockItems.filter(item => item.categoryId === selectedCategory)
    : allLowStockItems;

  // NEW: apply status filter on top
  if (selectedStatus === 'out') {
    displayedItems = displayedItems.filter(item => item.stock === 0);
  } else if (selectedStatus === 'critical') {
    displayedItems = displayedItems.filter(item => item.stock > 0 && item.stock <= 5);
  } else if (selectedStatus === 'low') {
    displayedItems = displayedItems.filter(item => item.stock > 5 && item.stock <= 10);
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500">Loading stock alerts...</p>
      </div>
    );
  }

  if (allLowStockItems.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">✅</span>
          <h2 className="text-xl font-bold text-green-600">Stock Levels Good</h2>
        </div>
        <p className="text-gray-600">All items have sufficient stock (above 10 units)</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-xl font-bold text-orange-600">Low Stock Alert</h2>
        </div>
        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
          {displayedItems.length} {displayedItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Category Filter + Status Filter in same row */}
      <div className="mb-4 flex items-end gap-6 flex-wrap">
        <div>
          <label className="block text-gray-700 mb-2 font-semibold">Filter by Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-64 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Categories ({allLowStockItems.length})</option>
            {categories.map(cat => {
              const count = allLowStockItems.filter(item => item.categoryId === cat.categoryId).length;
              if (count === 0) return null;
              return (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.name} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-3 flex-wrap pb-0.5">
          <span className="text-sm font-semibold text-gray-500">Filter by Status:</span>

          <button
            onClick={() => handleStatusToggle('out')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-150 ${
              selectedStatus === 'out'
                ? 'border-red-500 bg-red-100 text-red-700'
                : 'border-gray-200 bg-gray-100 text-gray-500 hover:border-red-300 hover:text-red-500'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
              selectedStatus === 'out'
                ? 'bg-red-500 border-red-500 shadow-[0_0_0_3px_#fee2e2]'
                : 'border-current'
            }`} />
            Out of Stock
          </button>

          <button
            onClick={() => handleStatusToggle('critical')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-150 ${
              selectedStatus === 'critical'
                ? 'border-orange-500 bg-orange-100 text-orange-700'
                : 'border-gray-200 bg-gray-100 text-gray-500 hover:border-orange-300 hover:text-orange-500'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
              selectedStatus === 'critical'
                ? 'bg-orange-500 border-orange-500 shadow-[0_0_0_3px_#ffedd5]'
                : 'border-current'
            }`} />
            Critical
          </button>

          <button
            onClick={() => handleStatusToggle('low')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-150 ${
              selectedStatus === 'low'
                ? 'border-yellow-500 bg-yellow-100 text-yellow-700'
                : 'border-gray-200 bg-gray-100 text-gray-500 hover:border-yellow-300 hover:text-yellow-500'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
              selectedStatus === 'low'
                ? 'bg-yellow-500 border-yellow-500 shadow-[0_0_0_3px_#fef9c3]'
                : 'border-current'
            }`} />
            Low
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-orange-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Item ID</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Category</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Item Name</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Variant</th>
              <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Available Quantity</th>
              <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedItems.length > 0 ? (
              displayedItems.map(item => (
                <tr
                  key={`${item.productId}_${item.variant || 'Standard'}`}
                  className={`border-b hover:bg-gray-50 ${
                    item.stock === 0 ? 'bg-red-50' : item.stock <= 5 ? 'bg-orange-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono font-semibold">{item.productId}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {getCategoryName(item.categoryId)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.variant && item.variant !== 'Standard'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.variant || 'Standard'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${
                      item.stock === 0 ? 'text-red-600' :
                      item.stock <= 5 ? 'text-orange-600' :
                      'text-yellow-600'
                    }`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.stock === 0 ? (
                      <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        OUT OF STOCK
                      </span>
                    ) : item.stock <= 5 ? (
                      <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        CRITICAL
                      </span>
                    ) : (
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        LOW
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  No low stock items in this category
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-orange-50 rounded border border-orange-200">
        <p className="text-sm text-orange-800">
          <span className="font-semibold">💡 Tip:</span> Please restock these items soon to avoid stockouts.
          {(selectedCategory || selectedStatus) && ` (Showing ${displayedItems.length} of ${allLowStockItems.length} low stock items)`}
        </p>
      </div>
    </div>
  );
};

export default LowStockAlert;
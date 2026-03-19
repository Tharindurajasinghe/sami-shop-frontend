import React, { useState, useEffect } from 'react';
import api from '../services/api';

const CategoryManagement = ({ show, onClose, onCategoryChange }) => {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      loadCategories();
    }
  }, [show]);

  const loadCategories = async () => {
    try {
      const response = await api.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      alert('Please enter category name');
      return;
    }

    setLoading(true);
    try {
      await api.addCategory({ name: newCategoryName.trim() });
      alert('Category added successfully!');
      setNewCategoryName('');
      await loadCategories();
      onCategoryChange(); // Refresh parent
    } catch (error) {
      alert(error.response?.data?.message || 'Error adding category');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCategory = async () => {
    if (!selectedCategory) {
      alert('Please select a category to remove');
      return;
    }

    const confirm = window.confirm('Are you sure you want to remove this category?');
    if (!confirm) return;

    setLoading(true);
    try {
      await api.deleteCategory(selectedCategory);
      alert('Category removed successfully!');
      setSelectedCategory('');
      await loadCategories();
      onCategoryChange(); // Refresh parent
    } catch (error) {
      alert(error.response?.data?.message || 'Error removing category');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Manage Categories</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Add Category Section */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold mb-3 text-green-800">Add New Category</h3>
          <form onSubmit={handleAddCategory} className="space-y-3">
            <div>
              <label className="block text-gray-700 mb-2">Category Name *</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Adding...' : 'Add Category'}
            </button>
          </form>
        </div>

        {/* Remove Category Section */}
        <div className="p-4 bg-red-50 rounded-lg">
          <h3 className="font-semibold mb-3 text-red-800">Remove Category</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-gray-700 mb-2">Select Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">
                  {categories.length === 0 ? 'NO EXIST' : '-- Select Category --'}
                </option>
                {categories.map(cat => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRemoveCategory}
              disabled={loading || !selectedCategory}
              className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              {loading ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>

        {/* Current Categories List */}
        {categories.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Existing Categories ({categories.length})</h3>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {categories.map(cat => (
                <div key={cat.categoryId} className="py-1 px-2 hover:bg-gray-100 rounded">
                  <span className="text-sm font-mono text-gray-600">{cat.categoryId}</span>
                  {' - '}
                  <span className="font-medium">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;
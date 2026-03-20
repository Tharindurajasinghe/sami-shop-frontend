import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UNIT_OPTIONS } from '../utils/Units';  // ✅ NEW IMPORT

/**
 * AddProduct Component
 * Supports adding one product with multiple variants in a single form.
 * Each variant row: variant name | unit | stock | buying price | selling price | remove
 */
const AddProduct = ({ showAddModal, setShowAddModal, formData, setFormData, onProductAdded }) => {
  const [categories, setCategories] = useState([]);

  // Variant rows — each row is one variant
  const [variantRows, setVariantRows] = useState([
    { variant: '', unit: 'unit', stock: '', buyingPrice: '', sellingPrice: '', barcode: '' }
  ]);

  useEffect(() => {
    if (showAddModal) {
      loadCategories();
      setVariantRows([{ variant: '', unit: 'unit', stock: '', buyingPrice: '', sellingPrice: '', barcode: '' }]);
    }
  }, [showAddModal]);

  const loadCategories = async () => {
    try {
      const response = await api.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const addVariantRow = () => {
    setVariantRows(prev => [
      ...prev,
      { variant: '', unit: 'unit', stock: '', buyingPrice: '', sellingPrice: '', barcode: '' }
    ]);
  };

  const removeVariantRow = (index) => {
    if (variantRows.length === 1) return;
    setVariantRows(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariantRow = (index, field, value) => {
    setVariantRows(prev =>
      prev.map((row, i) => i === index ? { ...row, [field]: value } : row)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.categoryId) {
      alert('Please fill Product Name and Category');
      return;
    }

    // Validate all rows
    for (let i = 0; i < variantRows.length; i++) {
      const row = variantRows[i];
      if (!row.stock || !row.buyingPrice || !row.sellingPrice) {
        alert(`Please fill all fields in row ${i + 1}`);
        return;
      }
      
      // ✅ NEW VALIDATION: Check if stock is integer for unit='unit'
      if (row.unit === 'unit') {
        const stockValue = parseFloat(row.stock);
        if (!Number.isInteger(stockValue)) {
          alert(`Row ${i + 1}: Stock must be a whole number for "Unit (Piece/Item)". No decimals allowed.`);
          return;
        }
      }
      
      if (parseFloat(row.sellingPrice) < parseFloat(row.buyingPrice)) {
        alert(`Row ${i + 1}: Selling price cannot be less than buying price`);
        return;
      }
    }

    // Check for duplicate variant names
    const variantNames = variantRows.map(r => (r.variant.trim() || 'Standard'));
    const uniqueNames = new Set(variantNames);
    if (uniqueNames.size !== variantNames.length) {
      alert('Duplicate variant names found. Each variant must have a unique name.');
      return;
    }

    try {
      for (const row of variantRows) {
        await api.addProduct({
          productId: formData.productId,
          name: formData.name,
          variant: row.variant.trim() || undefined,
          categoryId: formData.categoryId,
          stock: parseFloat(row.stock),
          buyingPrice: parseFloat(row.buyingPrice),
          sellingPrice: parseFloat(row.sellingPrice),
          unit: row.unit,
          barcode: row.barcode.trim() || undefined   // barcode is optional
        });
      }

      const count = variantRows.length;
      alert(`Product added successfully! (${count} variant${count > 1 ? 's' : ''})`);
      setShowAddModal(false);
      if (onProductAdded) onProductAdded();
    } catch (error) {
      alert(error.response?.data?.message || 'Error adding product');
    }
  };

  if (!showAddModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">Add New Product</h2>
          <button
            type="button"
            onClick={() => setShowAddModal(false)}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">

          {/* Product ID */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-1">Product ID</label>
            <input
              type="text"
              value={formData.productId}
              readOnly
              className="w-32 px-3 py-2 border rounded bg-gray-100 text-gray-600 text-center font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-generated</p>
          </div>

          {/* Product Name */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-1">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Boys Shoes"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-1">Category *</label>
            <select
              value={formData.categoryId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">-- Select Category --</option>
              {categories.map(cat => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Variants Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <label className="text-gray-700 font-medium">Variants</label>
                <p className="text-xs text-gray-500">Leave variant name empty for Standard</p>
              </div>
              <button
                type="button"
                onClick={addVariantRow}
                className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-semibold"
              >
                <span className="text-base font-bold">+</span> Add Variant
              </button>
            </div>

            {/* Column Headers */}
            <div className="grid gap-2 mb-1 px-2" style={{gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.1fr 1.1fr 32px'}}>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Variant Name</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Barcode</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Buying (Rs.)</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Selling (Rs.)</span>
              <span></span>
            </div>

            {/* Variant Rows */}
            <div className="space-y-2">
              {variantRows.map((row, index) => (
                <div
                  key={index}
                  className="grid gap-2 items-center bg-gray-50 px-2 py-2 rounded border border-gray-200"
                  style={{gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.1fr 1.1fr 32px'}}
                >
                  {/* Variant Name */}
                  <input
                    type="text"
                    value={row.variant}
                    onChange={(e) => updateVariantRow(index, 'variant', e.target.value)}
                    placeholder={index === 0 ? 'Small / or leave empty' : 'Large / XL...'}
                    className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white w-full"
                  />
                  
                  {/* Unit Dropdown */}
                  <select
                    value={row.unit}
                    onChange={(e) => updateVariantRow(index, 'unit', e.target.value)}
                    className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white w-full"
                  >
                    {UNIT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value === 'unit' ? 'Unit' : opt.value}
                      </option>
                    ))}
                  </select>

                  {/* Barcode (optional) */}
                  <input
                    type="text"
                    value={row.barcode}
                    onChange={(e) => updateVariantRow(index, 'barcode', e.target.value)}
                    placeholder="Optional"
                    className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white w-full"
                  />
                  
                  {/* Stock */}
                  <input
                    type="number"
                    step={row.unit === 'unit' ? '1' : '0.01'}
                    value={row.stock}
                    onChange={(e) => updateVariantRow(index, 'stock', e.target.value)}
                    placeholder="0"
                    min="0"
                    required
                    className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white w-full"
                  />
                  
                  {/* Buying Price */}
                  <input
                    type="number"
                    step="0.01"
                    value={row.buyingPrice}
                    onChange={(e) => updateVariantRow(index, 'buyingPrice', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    required
                    className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white w-full"
                  />
                  
                  {/* Selling Price */}
                  <input
                    type="number"
                    step="0.01"
                    value={row.sellingPrice}
                    onChange={(e) => updateVariantRow(index, 'sellingPrice', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    required
                    className={`px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 bg-white w-full ${
                      row.buyingPrice && row.sellingPrice && parseFloat(row.sellingPrice) < parseFloat(row.buyingPrice)
                        ? 'border-red-400 focus:ring-red-400'
                        : 'focus:ring-green-400'
                    }`}
                  />
                  
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeVariantRow(index)}
                    disabled={variantRows.length === 1}
                    className={`w-7 h-7 flex items-center justify-center rounded text-sm font-bold flex-shrink-0
                      ${variantRows.length === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-red-500 hover:bg-red-100 hover:text-red-700 cursor-pointer'
                      }`}
                    title="Remove variant"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Validation Warnings */}
            {variantRows.some(r =>
              r.buyingPrice && r.sellingPrice &&
              parseFloat(r.sellingPrice) < parseFloat(r.buyingPrice)
            ) && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                ⚠ Selling price cannot be less than buying price
              </p>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-4 border-t mt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2.5 rounded hover:bg-green-700 font-semibold"
            >
              Add Product {variantRows.length > 1 ? `(${variantRows.length} Variants)` : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;

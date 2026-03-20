import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UNIT_OPTIONS } from '../utils/Units';  // ✅ NEW IMPORT

/**
 * UpdateProduct Component
 *
 * Same layout as AddProduct.
 * - Loads ALL existing variants for the selected productId
 * - User can edit any variant row (name, stock, buying price, selling price, unit)
 * - User can delete an existing variant row
 * - User can add brand new variant rows
 * - Product name and category apply to ALL variants (shared fields)
 *
 * Variant rows have two kinds:
 *   existing : { mode:'existing', originalVariant, variant, unit, stock, buyingPrice, sellingPrice, deleted }
 *   new      : { mode:'new',      variant, unit, stock, buyingPrice, sellingPrice }
 */
const UpdateProduct = ({ showUpdateModal, setShowUpdateModal, productId, onProductUpdated }) => {
  const [categories, setCategories]   = useState([]);
  const [name, setName]               = useState('');
  const [categoryId, setCategoryId]   = useState('');
  const [variantRows, setVariantRows] = useState([]);
  const [loading, setLoading]         = useState(false);

  // Load all data when modal opens
  useEffect(() => {
    if (showUpdateModal && productId) {
      loadData();
    }
  }, [showUpdateModal, productId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, varRes] = await Promise.all([
        api.getCategories(),
        api.getProductVariants(productId)
      ]);

      setCategories(catRes.data);

      const variants = Array.isArray(varRes.data) ? varRes.data : [varRes.data];

      // Pre-fill shared fields from first variant
      if (variants.length > 0) {
        setName(variants[0].name);
        setCategoryId(variants[0].categoryId);
      }

      // Build existing rows
      setVariantRows(
        variants.map(v => ({
          mode           : 'existing',
          originalVariant: v.variant || 'Standard',
          variant        : v.variant || 'Standard',
          unit           : v.unit || 'unit',
          barcode        : v.barcode || '',   // barcode field
          stock          : String(v.stock),
          buyingPrice    : String(v.buyingPrice),
          sellingPrice   : String(v.sellingPrice),
          deleted        : false
        }))
      );
    } catch (err) {
      alert('Error loading product data');
      setShowUpdateModal(false);
    } finally {
      setLoading(false);
    }
  };

  // ── Row helpers ──────────────────────────────────────────────────────────

  const addNewRow = () => {
    setVariantRows(prev => [
      ...prev,
      { mode: 'new', variant: '', unit: 'unit', barcode: '', stock: '', buyingPrice: '', sellingPrice: '' }
    ]);
  };

  const removeRow = (index) => {
    const row = variantRows[index];
    if (row.mode === 'new') {
      // New row — just remove from state
      setVariantRows(prev => prev.filter((_, i) => i !== index));
    } else {
      // Existing row — mark as deleted (or undelete if already deleted)
      setVariantRows(prev => prev.map((r, i) => 
        i === index ? { ...r, deleted: !r.deleted } : r
      ));
    }
  };

  const updateRow = (index, field, value) => {
    setVariantRows(prev =>
      prev.map((r, i) => i === index ? { ...r, [field]: value } : r)
    );
  };

  // ── Validation ───────────────────────────────────────────────────────────

  const validateRow = (row, index) => {
    if (row.deleted) return null;

    if (!row.stock || !row.buyingPrice || !row.sellingPrice) {
      return `Row ${index + 1}: Please fill all fields`;
    }

    // ✅ NEW VALIDATION: Check if stock is integer for unit='unit'
    if (row.unit === 'unit') {
      const stockValue = parseFloat(row.stock);
      if (!Number.isInteger(stockValue)) {
        return `Row ${index + 1}: Stock must be a whole number for "Unit (Piece/Item)". No decimals allowed.`;
      }
    }

    if (parseFloat(row.sellingPrice) < parseFloat(row.buyingPrice)) {
      return `Row ${index + 1}: Selling price cannot be less than buying price`;
    }

    return null;
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !categoryId) {
      alert('Please fill Product Name and Category');
      return;
    }

    // Validate all non-deleted rows
    for (let i = 0; i < variantRows.length; i++) {
      const error = validateRow(variantRows[i], i);
      if (error) {
        alert(error);
        return;
      }
    }

    // Check at least one row remains
    const activeRows = variantRows.filter(r => !r.deleted);
    if (activeRows.length === 0) {
      alert('At least one variant must remain');
      return;
    }

    // Check for duplicate variant names
    const variantNames = activeRows.map(r => r.variant.trim() || 'Standard');
    const uniqueNames = new Set(variantNames);
    if (uniqueNames.size !== variantNames.length) {
      alert('Duplicate variant names found. Each variant must have a unique name.');
      return;
    }

    try {
      const promises = [];

      // 1. Update existing non-deleted rows
      for (const row of variantRows) {
        if (row.mode === 'existing' && !row.deleted) {
          promises.push(
            api.updateProduct(productId, {
              name,
              categoryId,
              stock: parseFloat(row.stock),
              buyingPrice: parseFloat(row.buyingPrice),
              sellingPrice: parseFloat(row.sellingPrice),
              unit: row.unit,
              barcode: row.barcode.trim() || null   // send null to clear barcode
            }, row.originalVariant)
          );
        }
      }

      // 2. Delete marked rows
      for (const row of variantRows) {
        if (row.mode === 'existing' && row.deleted) {
          promises.push(
            api.deleteProduct(productId, row.originalVariant)
          );
        }
      }

      // 3. Add new rows
      for (const row of variantRows) {
        if (row.mode === 'new') {
          promises.push(
            api.addProduct({
              productId,
              name,
              variant: row.variant.trim() || undefined,
              categoryId,
              stock: parseFloat(row.stock),
              buyingPrice: parseFloat(row.buyingPrice),
              sellingPrice: parseFloat(row.sellingPrice),
              unit: row.unit,
              barcode: row.barcode.trim() || undefined   // barcode is optional
            })
          );
        }
      }

      await Promise.all(promises);

      alert('Product updated successfully!');
      setShowUpdateModal(false);
      if (onProductUpdated) onProductUpdated();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating product');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (!showUpdateModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">Update Product — ID: {productId}</h2>
          <button
            type="button"
            onClick={() => setShowUpdateModal(false)}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
          >×</button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">

            {/* Product ID (read-only) */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Product ID</label>
              <input
                type="text"
                value={productId}
                readOnly
                className="w-32 px-3 py-2 border rounded bg-gray-100 text-gray-600 text-center font-mono"
              />
            </div>

            {/* Product Name */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onClick={addNewRow}
                  className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold"
                >
                  <span className="text-base font-bold">+</span> Add Variant
                </button>
              </div>

              {/* Column Headers */}
              <div
                className="grid gap-2 mb-1 px-2"
                style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.1fr 1.1fr 32px' }}
              >
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
                    className={`grid gap-2 items-center px-2 py-2 rounded border
                      ${row.deleted
                        ? 'bg-red-50 border-red-200 opacity-60'
                        : row.mode === 'new'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.1fr 1.1fr 32px' }}
                  >
                    {/* Variant Name */}
                    <input
                      type="text"
                      value={row.variant}
                      onChange={(e) => updateRow(index, 'variant', e.target.value)}
                      disabled={row.deleted}
                      placeholder={row.mode === 'new' ? 'e.g. XL' : ''}
                      className={`px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full
                        ${row.deleted ? 'bg-gray-200 line-through' : 'bg-white'}`}
                    />

                    {/* Unit Dropdown */}
                    <select
                      value={row.unit}
                      onChange={(e) => updateRow(index, 'unit', e.target.value)}
                      disabled={row.deleted}
                      className={`px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full
                        ${row.deleted ? 'bg-gray-200 line-through' : 'bg-white'}`}
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
                      onChange={(e) => updateRow(index, 'barcode', e.target.value)}
                      disabled={row.deleted}
                      placeholder="Optional"
                      className={`px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full
                        ${row.deleted ? 'bg-gray-200 line-through' : 'bg-white'}`}
                    />

                    {/* Stock */}
                    <input
                      type="number"
                      step={row.unit === 'unit' ? '1' : '0.01'}
                      value={row.stock}
                      onChange={(e) => updateRow(index, 'stock', e.target.value)}
                      disabled={row.deleted}
                      className={`px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full
                        ${row.deleted ? 'bg-gray-200 line-through' : 'bg-white'}`}
                    />

                    {/* Buying Price */}
                    <input
                      type="number"
                      step="0.01"
                      value={row.buyingPrice}
                      onChange={(e) => updateRow(index, 'buyingPrice', e.target.value)}
                      disabled={row.deleted}
                      className={`px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full
                        ${row.deleted ? 'bg-gray-200 line-through' : 'bg-white'}`}
                    />

                    {/* Selling Price */}
                    <input
                      type="number"
                      step="0.01"
                      value={row.sellingPrice}
                      onChange={(e) => updateRow(index, 'sellingPrice', e.target.value)}
                      disabled={row.deleted}
                      className={`px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 w-full
                        ${row.deleted
                          ? 'bg-gray-200 line-through'
                          : row.buyingPrice && row.sellingPrice && parseFloat(row.sellingPrice) < parseFloat(row.buyingPrice)
                            ? 'border-red-400 focus:ring-red-400 bg-white'
                            : 'focus:ring-blue-400 bg-white'
                        }`}
                    />

                    {/* Remove/Restore Button */}
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-sm font-bold flex-shrink-0
                        ${row.deleted
                          ? 'text-blue-500 hover:bg-blue-100'
                          : 'text-red-500 hover:bg-red-100'
                        }`}
                      title={row.deleted ? 'Restore variant' : 'Remove variant'}
                    >
                      {row.deleted ? '↩' : '✕'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-3 text-xs text-gray-600 space-y-1">
                <p>• <span className="bg-gray-200 px-1 rounded">Gray</span> = Existing variant</p>
                <p>• <span className="bg-green-100 px-1 rounded">Green</span> = New variant (not saved yet)</p>
                <p>• <span className="bg-red-100 px-1 rounded line-through">Red strikethrough</span> = Marked for deletion (click ↩ to restore)</p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-4 border-t mt-2">
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UpdateProduct;

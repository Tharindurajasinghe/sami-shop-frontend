import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import AddProduct from './AddProduct';
import UpdateProduct from './UpdateProduct';
import CategoryManagement from './CategoryManagement';
import LoadingOverlay from './LoadingOverlay';

const StoreManagement = () => {
  const [products, setProducts]               = useState([]);
  const [categories, setCategories]           = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery]         = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showAddModal, setShowAddModal]         = useState(false);
  const [showUpdateModal, setShowUpdateModal]   = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null); // only productId needed now

  // ── Loading states ────────────────────────────────────────────────────────
  const [pageLoading, setPageLoading]   = useState(true);   // initial load of products + categories
  const [tableLoading, setTableLoading] = useState(false);  // reload after add / update / delete
  const [addLoading, setAddLoading]     = useState(false);  // fetching next product ID
  const [deleteLoading, setDeleteLoading] = useState(false); // deleting a product

  const [formData, setFormData] = useState({
    productId : '',
    name      : '',
    variant   : '',
    categoryId: '',
    stock     : '',
    buyingPrice : '',
    sellingPrice: ''
  });

  useEffect(() => {
    const initialLoad = async () => {
      setPageLoading(true);
      try {
        await Promise.all([loadProducts(), loadCategories()]);
      } finally {
        setPageLoading(false);
      }
    };
    initialLoad();
  }, []);

  useEffect(() => { filterProducts(); }, [selectedCategory, searchQuery, products]);

  const loadProducts = async () => {
    try {
      const res = await api.getProducts();
      setProducts(res.data);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.getCategories();
      setCategories(res.data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const filterProducts = () => {
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productId.includes(searchQuery) ||
        (p.variant && p.variant.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    setFilteredProducts(filtered);
  };

  // Reload products + categories with table loading indicator
  // Used as callback after add, update, delete, category change
  const reloadData = async () => {
    setTableLoading(true);
    try {
      await Promise.all([loadProducts(), loadCategories()]);
    } finally {
      setTableLoading(false);
    }
  };

  // ── Add Product ──────────────────────────────────────────────────────────

  const handleAddProduct = async () => {
    setAddLoading(true);
    try {
      const res = await api.getNextProductId();
      setFormData({
        productId : res.data.productId,
        name      : '',
        variant   : '',
        categoryId: '',
        stock     : '',
        buyingPrice : '',
        sellingPrice: ''
      });
      setShowAddModal(true);
    } catch {
      alert('Error getting next product ID');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Update Product ───────────────────────────────────────────────────────

  // Just pass the productId — UpdateProduct loads all variants itself
  const handleUpdateClick = (productId) => {
    setSelectedProductId(productId);
    setShowUpdateModal(true);
  };

  // ── Delete Product ───────────────────────────────────────────────────────

  const handleDelete = async (productId, variant) => {
    const variantText = variant && variant !== 'Standard' ? ` (${variant})` : '';
    const confirmed = window.confirm(
      `Are you sure you want to delete this product${variantText}?`
    );
    if (!confirmed) return;
    setDeleteLoading(true);
    try {
      await api.deleteProduct(productId, variant);
      alert('Product deleted successfully!');
      await reloadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting product');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.categoryId === categoryId);
    return cat ? cat.name : 'Unknown';
  };

  const getProductUniqueKey = (product) =>
    `${product.productId}_${product.variant || 'Standard'}`;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Loading overlays */}
      {pageLoading   && <LoadingOverlay message="Loading store data..." />}
      {tableLoading  && <LoadingOverlay message="Updating products..." />}
      {addLoading    && <LoadingOverlay message="Preparing form..." />}
      {deleteLoading && <LoadingOverlay message="Deleting product..." />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Store Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold"
          >
            📁 Add/Remove Category
          </button>
          <button
            onClick={handleAddProduct}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-semibold"
          >
            + Add New Product
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2 font-semibold">Category</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-64 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by ID, Name, or Variant..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Item ID</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Item Name</th>
              <th className="px-4 py-3 text-left">Variant</th>
              <th className="px-4 py-3 text-left">Unit</th>
              <th className="px-4 py-3 text-left">In Stock</th>
              <th className="px-4 py-3 text-left">Buying Price</th>
              <th className="px-4 py-3 text-left">Selling Price</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={getProductUniqueKey(product)} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{product.productId}</td>
                <td className="px-4 py-3">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {getCategoryName(product.categoryId)}
                  </span>
                </td>
                <td className="px-4 py-3">{product.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    product.variant && product.variant !== 'Standard'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {product.variant || 'Standard'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 font-medium">
                    {product.unit || 'unit'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded ${
                    product.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {parseFloat(product.stock.toFixed(3))}
                  </span>
                </td>
                <td className="px-4 py-3">Rs. {product.buyingPrice.toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold">Rs. {product.sellingPrice.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {/* Update opens modal for the whole productId (all variants) */}
                    <button
                      onClick={() => handleUpdateClick(product.productId)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Update
                    </button>
                    {/* Remove deletes only this specific variant */}
                    <button
                      onClick={() => handleDelete(product.productId, product.variant)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">No products found</div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Total: {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
        <span className="ml-2 text-xs">
          💡 Click Update on any row to edit all variants of that product at once
        </span>
      </div>

      {/* Modals */}
      <CategoryManagement
        show={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoryChange={reloadData}
      />

      <AddProduct
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        formData={formData}
        setFormData={setFormData}
        onProductAdded={reloadData}
      />

      {/* UpdateProduct now receives productId and a callback — no formData needed */}
      <UpdateProduct
        showUpdateModal={showUpdateModal}
        setShowUpdateModal={setShowUpdateModal}
        productId={selectedProductId}
        onProductUpdated={reloadData}
      />
    </div>
  );
};

export default StoreManagement;

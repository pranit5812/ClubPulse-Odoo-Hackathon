import React, { useState, useEffect } from 'react';
import { api, formatINR } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X,
  ShoppingBag,
  SlidersHorizontal,
  Edit2,
  Package,
  Layers,
  Save,
  Trash2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const MerchManagementPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState(null);

  // Manage Size & Stock Modal state
  const [manageModalProduct, setManageModalProduct] = useState(null);
  const [editingSizes, setEditingSizes] = useState([]);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Edit Product Modal state
  const [editModalProduct, setEditModalProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriceInr, setEditPriceInr] = useState(499);
  const [editCategory, setEditCategory] = useState('T-Shirts');
  const [customEditCategory, setCustomEditCategory] = useState('');
  const [isCustomEditCategory, setIsCustomEditCategory] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState('/merch/white-tee.jpg');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Product Modal state
  const [deleteModalProduct, setDeleteModalProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add Product Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceInr, setPriceInr] = useState(499);
  const [category, setCategory] = useState('T-Shirts');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [sku, setSku] = useState('');
  const [imageUrl, setImageUrl] = useState('/merch/white-tee.jpg');
  const [stockS, setStockS] = useState(15);
  const [stockM, setStockM] = useState(25);
  const [stockL, setStockL] = useState(20);
  const [stockXL, setStockXL] = useState(10);
  const [createLoading, setCreateLoading] = useState(false);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/products');
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Open Manage Size & Stock modal for a product
  const openManageModal = (prod) => {
    setManageModalProduct(prod);
    setEditingSizes(
      (prod.sizes || []).map((s) => ({
        size: s.size,
        stock: Number(s.stock) || 0
      }))
    );
    setUpdateError('');
  };

  const handleSizeStockChange = (index, delta) => {
    setEditingSizes((prev) => {
      const copy = [...prev];
      const cur = copy[index].stock || 0;
      copy[index].stock = Math.max(0, cur + delta);
      return copy;
    });
  };

  const handleStockInputChange = (index, value) => {
    const val = parseInt(value, 10);
    setEditingSizes((prev) => {
      const copy = [...prev];
      copy[index].stock = isNaN(val) ? 0 : Math.max(0, val);
      return copy;
    });
  };

  const handleSizeNameChange = (index, value) => {
    setEditingSizes((prev) => {
      const copy = [...prev];
      copy[index].size = value.toUpperCase().trim();
      return copy;
    });
  };

  const handleAddSizeVariant = () => {
    const existing = editingSizes.map((s) => s.size);
    let defaultNew = 'XXL';
    if (existing.includes('XXL')) defaultNew = 'XS';
    if (existing.includes('XS')) defaultNew = 'Custom';
    setEditingSizes((prev) => [...prev, { size: defaultNew, stock: 10 }]);
  };

  const handleRemoveSizeVariant = (index) => {
    if (editingSizes.length <= 1) {
      setUpdateError('A product must have at least one size variant.');
      return;
    }
    setEditingSizes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSizeStock = async () => {
    if (!manageModalProduct) return;
    if (editingSizes.length === 0) {
      setUpdateError('At least one size variant is required.');
      return;
    }
    // Check duplicate sizes
    const sizeNames = editingSizes.map((s) => s.size.trim());
    if (new Set(sizeNames).size !== sizeNames.length) {
      setUpdateError('Size variants must have unique names.');
      return;
    }

    setUpdateLoading(true);
    setUpdateError('');

    try {
      const updated = await api.patch(`/api/products/${manageModalProduct.id}`, {
        sizes: editingSizes
      });

      setProducts((prev) =>
        prev.map((item) => (item.id === manageModalProduct.id ? updated : item))
      );
      showNotice(`Successfully updated size & stock inventory for "${manageModalProduct.name}"!`);
      setManageModalProduct(null);
    } catch (err) {
      console.error('Failed to update size & stock:', err);
      setUpdateError(err.message || 'Failed to update sizes & stock.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const STANDARD_CATEGORIES = ['T-Shirts', 'Hoodies', 'Badges', 'Jackets', 'Accessories'];

  const openEditModal = (prod) => {
    setEditModalProduct(prod);
    setEditName(prod.name || '');
    setEditBrand(prod.brand || 'Competition Edition');
    setEditDescription(prod.description || '');
    setEditPriceInr(Math.round((prod.price_paise || 0) / 100));

    if (STANDARD_CATEGORIES.includes(prod.category)) {
      setEditCategory(prod.category);
      setIsCustomEditCategory(false);
      setCustomEditCategory('');
    } else {
      setEditCategory('Other');
      setIsCustomEditCategory(true);
      setCustomEditCategory(prod.category || '');
    }

    setEditImageUrl(prod.image_url || '/merch/white-tee.jpg');
    setEditError('');
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editModalProduct) return;
    if (!editName.trim()) {
      setEditError('Product name is required.');
      return;
    }

    const finalCategory = isCustomEditCategory ? customEditCategory.trim() : editCategory;
    if (isCustomEditCategory && !customEditCategory.trim()) {
      setEditError('Please enter a custom category name.');
      return;
    }

    setEditLoading(true);
    setEditError('');

    try {
      const updated = await api.patch(`/api/products/${editModalProduct.id}`, {
        name: editName.trim(),
        brand: editBrand.trim(),
        description: editDescription.trim(),
        price_paise: Math.round(Number(editPriceInr) * 100),
        category: finalCategory,
        image_url: editImageUrl
      });

      setProducts((prev) =>
        prev.map((item) => (item.id === editModalProduct.id ? updated : item))
      );
      setEditModalProduct(null);
      showNotice(`Successfully updated product "${editName}"!`);
    } catch (err) {
      console.error('Failed to update product:', err);
      setEditError(err.message || 'Failed to update product.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteModalProduct) return;
    setDeleteLoading(true);

    try {
      await api.delete(`/api/products/${deleteModalProduct.id}`);
      setProducts((prev) => prev.filter((item) => item.id !== deleteModalProduct.id));
      showNotice(`Deleted product "${deleteModalProduct.name}" from catalog.`);
      setDeleteModalProduct(null);
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    if (isCustomCategory && !customCategory.trim()) {
      alert('Please enter a custom category name.');
      return;
    }

    setCreateLoading(true);

    try {
      await api.post('/api/products', {
        name,
        description,
        price_paise: Math.round(Number(priceInr) * 100),
        category: finalCategory,
        sku: sku.toUpperCase(),
        image_url: imageUrl || '/merch/white-tee.jpg',
        sizes: [
          { size: 'S', stock: Number(stockS) },
          { size: 'M', stock: Number(stockM) },
          { size: 'L', stock: Number(stockL) },
          { size: 'XL', stock: Number(stockXL) }
        ]
      });
      setAddModalOpen(false);
      setName('');
      setDescription('');
      setSku('');
      setCategory('T-Shirts');
      setIsCustomCategory(false);
      setCustomCategory('');
      fetchProducts();
      showNotice('New product added to inventory.');
    } catch (err) {
      alert(`Product creation failed: ${err.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-100" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <Box className="w-3.5 h-3.5" />
              <span>Organizer Inventory & Size Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#171A2B] tracking-tight">
              Merchandise Catalog & Stock Control
            </h1>
            <p className="text-xs sm:text-sm text-[#687086] mt-1 max-w-2xl">
              Manage size variants, inventory availability, and stock quotas for chapter items.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2.5 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add SKU Item</span>
            </button>
          </div>
        </div>

        {/* Organizer Policy Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-start gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-900">
              Organizer Role Permissions: Inventory & Size Control
            </h4>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              As an organizer, you are authorized to <strong>manage sizes and stock quantities</strong> for all chapter merchandise. 
              Organizers cannot purchase merchandise; purchasing is reserved exclusively for students and chapter members.
            </p>
          </div>
        </div>

        {/* Products Table with Direct Sizing & Stock Management */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton lines={5} />
            </div>
          ) : products.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={Box}
                title="No inventory products added"
                description="Click '+ Add SKU Item' to add hoodies, tees, or club badges."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FC] text-[#687086] uppercase font-bold border-b border-[#E7E9F1] text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Item & SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Selling Price</th>
                    <th className="py-3.5 px-4">Size & Stock Breakdown</th>
                    <th className="py-3.5 px-4">Total Available</th>
                    <th className="py-3.5 px-4">Stock Status</th>
                    <th className="py-3.5 px-4 text-right">Organizer Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E9F1] font-medium text-[#171A2B]">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#F7F8FC]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.image_url || '/merch/white-tee.jpg'}
                            alt={prod.name}
                            className="w-12 h-14 object-cover rounded-xl border border-[#E7E9F1] shadow-2xs shrink-0 bg-slate-50"
                            onError={(e) => {
                              e.currentTarget.src = '/merch/white-tee.jpg';
                            }}
                          />
                          <div>
                            <div className="font-bold text-[#171A2B] text-xs sm:text-sm line-clamp-1">
                              {prod.name}
                            </div>
                            <div className="text-[11px] font-mono text-[#687086] mt-0.5">
                              SKU: {prod.sku}
                            </div>
                            <div className="text-[10px] text-[#8B93A7]">
                              {prod.brand || 'ClubPulse Official'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#F7F8FC] border border-[#E7E9F1] text-[#171A2B]">
                          {prod.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#171A2B]">
                        {formatINR(prod.price_paise)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {prod.sizes?.map((s) => (
                            <span
                              key={s.size}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                s.stock <= 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : s.stock <= 5
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {s.size}: <span className="font-mono">{s.stock}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-sm text-[#171A2B]">
                        {prod.total_stock} <span className="text-xs font-normal text-[#687086]">units</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            prod.total_stock === 0
                              ? 'critical'
                              : prod.total_stock <= 10
                              ? 'warning'
                              : 'active'
                          }
                        >
                          {prod.total_stock === 0
                            ? 'Sold Out'
                            : prod.total_stock <= 10
                            ? 'Low Stock'
                            : 'In Stock'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openManageModal(prod)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#625BF6]/10 hover:bg-[#625BF6] text-[#625BF6] hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Manage Size & Stock"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Sizes & Stock</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(prod)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-[#171A2B] text-[#171A2B] hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModalProduct(prod)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border border-rose-200 hover:border-transparent"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* MODAL: MANAGE SIZE AND STOCK (ORGANIZER ONLY)                  */}
        {/* ============================================================== */}
        {manageModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-[#E7E9F1] animate-in fade-in max-h-[92vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-[#E7E9F1] pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={manageModalProduct.image_url || '/merch/white-tee.jpg'}
                    alt={manageModalProduct.name}
                    className="w-14 h-16 object-cover rounded-xl border border-[#E7E9F1] bg-slate-50 shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = '/merch/white-tee.jpg';
                    }}
                  />
                  <div>
                    <span className="text-[10px] font-bold text-[#625BF6] uppercase tracking-wider">
                      Inventory Control
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-[#171A2B] leading-tight">
                      {manageModalProduct.name}
                    </h3>
                    <p className="text-[11px] font-mono text-[#687086] mt-0.5">
                      SKU: {manageModalProduct.sku} • {formatINR(manageModalProduct.price_paise)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setManageModalProduct(null)}
                  className="p-1.5 rounded-xl text-[#8B93A7] hover:text-[#171A2B] hover:bg-[#F0F2F7] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notice Banner */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                <strong>Organizer Control:</strong> Edit available size variants and update the in-hand stock quantities. Organizers cannot purchase this item.
              </div>

              {updateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{updateError}</span>
                </div>
              )}

              {/* Size & Stock Editor Table */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#171A2B]">
                    Size Variants & Units Available:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSizeVariant}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#625BF6] hover:text-[#5048E5]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Size Variant</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {editingSizes.map((variant, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#F7F8FC] border border-[#E7E9F1]"
                    >
                      {/* Size Name */}
                      <div className="w-24 shrink-0">
                        <label className="block text-[10px] font-bold text-[#687086] mb-0.5">
                          Size
                        </label>
                        <input
                          type="text"
                          value={variant.size}
                          onChange={(e) => handleSizeNameChange(idx, e.target.value)}
                          placeholder="S, M, L..."
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-[#E7E9F1] bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                        />
                      </div>

                      {/* Stock Quantity */}
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-[#687086] mb-0.5">
                          Stock Quantity
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSizeStockChange(idx, -1)}
                            className="w-8 h-8 rounded-lg bg-white border border-[#E7E9F1] font-black text-sm text-[#171A2B] hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={variant.stock}
                            onChange={(e) => handleStockInputChange(idx, e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-[#E7E9F1] bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSizeStockChange(idx, 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-[#E7E9F1] font-black text-sm text-[#171A2B] hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Quick Adjust Buttons */}
                      <div className="flex items-center gap-1 pt-4">
                        <button
                          type="button"
                          onClick={() => handleSizeStockChange(idx, 5)}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white border border-[#E7E9F1] hover:bg-slate-50 text-[#687086]"
                          title="Add 5 units"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSizeStockChange(idx, 10)}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white border border-[#E7E9F1] hover:bg-slate-50 text-[#687086]"
                          title="Add 10 units"
                        >
                          +10
                        </button>
                        {editingSizes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSizeVariant(idx)}
                            className="p-1.5 text-[#D9485F] hover:bg-rose-50 rounded-lg transition-colors ml-1"
                            title="Remove Size"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-right text-xs text-[#687086]">
                  Total New Calculated Stock:{' '}
                  <strong className="text-[#171A2B] font-bold text-sm">
                    {editingSizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0)} units
                  </strong>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[#E7E9F1] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setManageModalProduct(null)}
                  disabled={updateLoading}
                  className="px-4 py-2.5 border border-[#E7E9F1] text-[#687086] rounded-xl text-xs font-semibold hover:bg-[#F7F8FC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSizeStock}
                  disabled={updateLoading}
                  className="px-5 py-2.5 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-[#625BF6]/25 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{updateLoading ? 'Saving Stock & Sizes...' : 'Save Size & Stock'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL: ADD PRODUCT SKU (ORGANIZER ONLY)                        */}
        {/* ============================================================== */}
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E7E9F1]">
              <div className="flex justify-between items-center border-b border-[#E7E9F1] pb-3">
                <h3 className="font-bold text-sm text-[#171A2B]">Add New Merchandise Product</h3>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="p-1 rounded-lg text-[#687086] hover:text-[#171A2B] hover:bg-[#F7F8FC]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter Embroidered Fleece"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">
                      SKU Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CP-HOOD-26"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">
                      Category *
                    </label>
                    <select
                      value={isCustomCategory ? 'Other' : category}
                      onChange={(e) => {
                        if (e.target.value === 'Other') {
                          setIsCustomCategory(true);
                        } else {
                          setIsCustomCategory(false);
                          setCategory(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    >
                      <option value="Hoodies">Hoodies</option>
                      <option value="T-Shirts">T-Shirts</option>
                      <option value="Badges">Badges</option>
                      <option value="Jackets">Jackets</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Other">Other (type manually)</option>
                    </select>
                    {isCustomCategory && (
                      <input
                        type="text"
                        required
                        placeholder="Type category (e.g. Caps, Posters)..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-[#625BF6] rounded-xl bg-white text-[#171A2B] text-xs focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Image URL
                  </label>
                  <input
                    type="text"
                    placeholder="/merch/white-tee.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Price in INR (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={priceInr}
                    onChange={(e) => setPriceInr(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Material specs, wash instructions, fabric GSM..."
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  ></textarea>
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Initial Stock by Size
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="block text-[10px] text-[#687086] font-bold">S</span>
                      <input
                        type="number"
                        min="0"
                        value={stockS}
                        onChange={(e) => setStockS(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-[#E7E9F1] bg-[#F7F8FC] rounded-lg text-center font-bold"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#687086] font-bold">M</span>
                      <input
                        type="number"
                        min="0"
                        value={stockM}
                        onChange={(e) => setStockM(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-[#E7E9F1] bg-[#F7F8FC] rounded-lg text-center font-bold"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#687086] font-bold">L</span>
                      <input
                        type="number"
                        min="0"
                        value={stockL}
                        onChange={(e) => setStockL(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-[#E7E9F1] bg-[#F7F8FC] rounded-lg text-center font-bold"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#687086] font-bold">XL</span>
                      <input
                        type="number"
                        min="0"
                        value={stockXL}
                        onChange={(e) => setStockXL(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-[#E7E9F1] bg-[#F7F8FC] rounded-lg text-center font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="flex-1 py-2.5 border border-[#E7E9F1] text-[#687086] rounded-xl font-semibold hover:bg-[#F7F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 py-2.5 bg-[#625BF6] text-white rounded-xl font-semibold hover:bg-[#5048E5] transition-colors"
                  >
                    {createLoading ? 'Saving...' : 'Add SKU'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ============================================================== */}
        {/* MODAL: EDIT PRODUCT (ORGANIZER ONLY)                          */}
        {/* ============================================================== */}
        {editModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#E7E9F1] animate-in fade-in max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-start justify-between border-b border-[#E7E9F1] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#171A2B]">Edit Product Details</h3>
                    <p className="text-xs text-[#687086]">
                      SKU: {editModalProduct.sku}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalProduct(null)}
                  className="p-1 rounded-xl text-[#8B93A7] hover:text-[#171A2B] hover:bg-[#F0F2F7]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-[#E7E9F1]">
                  <img
                    src={editImageUrl || '/merch/white-tee.jpg'}
                    alt="Preview"
                    className="w-14 h-16 object-cover rounded-lg border border-[#E7E9F1] bg-white shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = '/merch/white-tee.jpg';
                    }}
                  />
                  <div className="flex-1">
                    <label className="block font-semibold text-[#171A2B] mb-1">Product Image</label>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {[
                        { label: 'White Tee', url: '/merch/white-tee.jpg' },
                        { label: 'Black Hoodie', url: '/merch/black-hoodie.jpg' },
                        { label: 'Black Tee', url: '/merch/black-tee.jpg' },
                        { label: 'Badge', url: '/merch/badge.jpg' },
                        { label: 'Cream Hoodie', url: '/merch/cream-hoodie.jpg' }
                      ].map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setEditImageUrl(preset.url)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            editImageUrl === preset.url
                              ? 'bg-[#625BF6] text-white border-[#625BF6]'
                              : 'bg-white text-[#687086] border-[#E7E9F1] hover:bg-slate-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="/merch/example.jpg or URL"
                      className="w-full px-2.5 py-1 text-xs border border-[#E7E9F1] rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] font-medium focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Category *</label>
                    <select
                      value={isCustomEditCategory ? 'Other' : editCategory}
                      onChange={(e) => {
                        if (e.target.value === 'Other') {
                          setIsCustomEditCategory(true);
                        } else {
                          setIsCustomEditCategory(false);
                          setEditCategory(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:ring-2 focus:ring-[#625BF6]"
                    >
                      <option value="T-Shirts">T-Shirts</option>
                      <option value="Hoodies">Hoodies</option>
                      <option value="Badges">Badges</option>
                      <option value="Jackets">Jackets</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Other">Other (type manually)</option>
                    </select>
                    {isCustomEditCategory && (
                      <input
                        type="text"
                        required
                        placeholder="Type category..."
                        value={customEditCategory}
                        onChange={(e) => setCustomEditCategory(e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-[#625BF6] rounded-xl bg-white text-[#171A2B] text-xs focus:ring-2 focus:ring-[#625BF6]"
                        autoFocus
                      />
                    )}
                  </div>
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Brand / Tag</label>
                    <input
                      type="text"
                      value={editBrand}
                      onChange={(e) => setEditBrand(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:ring-2 focus:ring-[#625BF6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Selling Price (INR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editPriceInr}
                    onChange={(e) => setEditPriceInr(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] font-bold focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Description *</label>
                  <textarea
                    rows={3}
                    required
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E7E9F1]">
                  <button
                    type="button"
                    onClick={() => setEditModalProduct(null)}
                    className="px-4 py-2 border border-[#E7E9F1] text-[#687086] rounded-xl font-semibold hover:bg-[#F7F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-5 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl font-bold shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editLoading ? 'Saving...' : 'Update Product'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL: DELETE CONFIRMATION (ORGANIZER ONLY)                     */}
        {/* ============================================================== */}
        {deleteModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E7E9F1] animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="font-bold text-lg text-[#171A2B]">Delete Product</h3>
                <p className="text-xs text-[#687086]">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-[#171A2B]">"{deleteModalProduct.name}"</strong> (SKU: {deleteModalProduct.sku})?
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] leading-relaxed">
                <strong>Warning:</strong> This product will be immediately removed from both the organizer inventory and the student merchandise catalog. This action cannot be undone.
              </div>

              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteModalProduct(null)}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 border border-[#E7E9F1] text-[#687086] rounded-xl text-xs font-semibold hover:bg-[#F7F8FC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProduct}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteLoading ? 'Deleting...' : 'Delete Product'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};


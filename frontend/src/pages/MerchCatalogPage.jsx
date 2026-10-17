import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR } from '../api/client';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Lock,
  Package,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { DashboardLayout } from '../components/DashboardLayout';

export const MerchCatalogPage = () => {
  const { user, isMember, role } = useAuth();
  const isOrganizer = role === 'organizer' || user?.role === 'organizer';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [orderError, setOrderError] = useState('');

  const fetchProducts = async () => {
    try {
      const data = await api.get('/api/products');
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to load merchandise:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const list = ['Hoodies', 'T-Shirts', 'Jackets', 'Badges'];
    products.forEach((p) => {
      if (p.category && !list.some((c) => c.toLowerCase() === p.category.toLowerCase())) {
        list.push(p.category);
      }
    });
    return ['All', ...list];
  }, [products]);

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'All') return true;
    return p.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  const openQuickView = (prod) => {
    setActiveProduct(prod);
    const firstAvail = prod.sizes?.find((s) => s.stock > 0);
    setSelectedSize(firstAvail ? firstAvail.size : prod.sizes?.[0]?.size || 'M');
    setQuantity(1);
    setDeliveryNotes('');
    setOrderError('');
    setOrderSuccess(null);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!selectedSize) {
      setOrderError('Please select a size before proceeding.');
      return;
    }

    setOrderLoading(true);
    setOrderError('');

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
      }

      const orderData = await api.post('/api/payments/create-merch-order', {
        product_id: activeProduct.id,
        size: selectedSize,
        quantity,
        delivery_notes: deliveryNotes
      });

      const options = {
        key: orderData.key_id || 'rzp_test_placeholder',
        amount: orderData.amount_paise,
        currency: orderData.currency || 'INR',
        name: 'Skyline Chapter Store',
        description: `${activeProduct.name} (Size: ${selectedSize}, Qty: ${quantity})`,
        image: activeProduct.image_url || '/logo.png',
        order_id: orderData.order_id,
        prefill: {
          name: user?.full_name || orderData.user_name,
          email: user?.email || orderData.user_email,
          contact: user?.phone || orderData.user_phone || '+91 9876543210'
        },
        notes: {
          product_id: activeProduct.id,
          product_name: activeProduct.name,
          size: selectedSize,
          quantity: String(quantity),
          user_id: user?.id,
          type: 'merchandise'
        },
        theme: {
          color: '#625BF6'
        },
        handler: async function (response) {
          try {
            setOrderLoading(true);
            const orderRes = await api.post('/api/orders', {
              items: [
                {
                  product_id: activeProduct.id,
                  size: selectedSize,
                  quantity
                }
              ],
              delivery_notes: deliveryNotes,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            setOrderSuccess(orderRes);
            fetchProducts();
            try {
              confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
            } catch {}
          } catch (tktErr) {
            console.error('Order creation error:', tktErr);
            setOrderError(tktErr.message || 'Payment received, but order recording failed.');
          } finally {
            setOrderLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setOrderLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setOrderLoading(false);
        setOrderError(resp.error?.description || 'Payment was unsuccessful or cancelled.');
      });
      rzp.open();
    } catch (err) {
      setOrderError(err.message || 'Payment checkout could not be initiated.');
      setOrderLoading(false);
    }
  };

  const getProductDisplayPrice = (product) => {
    const basePaise = product.price_paise || 49900;
    if (isMember) {
      return {
        unitPaise: Math.max(100, basePaise - 15000),
        originalPaise: basePaise,
        hasDiscount: true
      };
    }
    return {
      unitPaise: basePaise,
      originalPaise: basePaise,
      hasDiscount: false
    };
  };

  const pageBody = (
    <div className="space-y-8 w-full max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Official Competition Wear & Chapter Store</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Competition Apparel & Gear
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
          Tournament heavyweight hoodies, collegiate varsity bombers, and athletic Henley t-shirts. 
          Active members receive flat ₹150 off with instant Razorpay checkout.
        </p>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-[#171A2B] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid matching user's image */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="space-y-3">
              <div className="aspect-3/4 bg-slate-100 rounded-2xl animate-pulse" />
              <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center text-slate-500 text-xs bg-white rounded-3xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <span>No competition merchandise found in this category.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {filteredProducts.map((p) => {
            const pricing = getProductDisplayPrice(p);
            const inStock = p.total_stock > 0;

            return (
              <div
                key={p.id}
                className="group flex flex-col cursor-pointer"
                onClick={() => openQuickView(p)}
              >
                {/* Image Container with Quick View Hover */}
                <div className="relative aspect-3/4 w-full bg-[#F4F4F6] rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center group-hover:shadow-lg transition-all duration-300">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {!inStock && (
                    <div className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-xs">
                      Sold Out
                    </div>
                  )}

                  {/* QUICK VIEW Button Overlay */}
                  <div className="absolute inset-x-4 bottom-4 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 transform sm:translate-y-2 sm:group-hover:translate-y-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openQuickView(p);
                      }}
                      className="w-full py-2 px-3 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 text-xs font-black tracking-wider text-[#1B355B] uppercase text-center hover:bg-white transition-colors"
                    >
                      QUICK VIEW
                    </button>
                  </div>
                </div>

                {/* Typography matching user's photo */}
                <div className="pt-3 text-center flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#8E6737] tracking-wide uppercase line-clamp-1">
                      {p.brand || 'AOOSH'}
                    </div>

                    <h4 className="text-sm font-medium text-slate-900 leading-snug line-clamp-2 mt-0.5 hover:text-[#625BF6] transition-colors">
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="text-sm font-black text-slate-900">
                      {formatINR(pricing.unitPaise)}
                    </span>
                    {pricing.hasDiscount && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatINR(pricing.originalPaise)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick View & Razorpay Payment Modal */}
      {activeProduct && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            if (!orderLoading) setActiveProduct(null);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveProduct(null)}
              disabled={orderLoading}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 backdrop-blur-md text-slate-500 hover:text-slate-900 shadow-sm border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {orderSuccess ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Order & Payment Confirmed!</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Your Razorpay payment was successful. Collect your tournament apparel at the competition registration desk.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Order ID:</span>
                    <strong className="font-mono text-slate-900">#{orderSuccess.id.slice(-6).toUpperCase()}</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Item:</span>
                    <strong className="text-slate-900">{activeProduct.name}</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Size / Variant:</span>
                    <strong className="text-slate-900">{selectedSize} (Qty: {quantity})</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Total Paid:</span>
                    <strong className="text-emerald-700 font-bold">{formatINR(orderSuccess.total_amount_paise)}</strong>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveProduct(null);
                    setOrderSuccess(null);
                  }}
                  className="w-full py-3 bg-[#625BF6] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {orderError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{orderError}</span>
                  </div>
                )}

                <div className="flex gap-4 sm:gap-5">
                  <div className="w-28 sm:w-36 aspect-3/4 rounded-2xl bg-[#F4F4F6] border border-slate-200 overflow-hidden shrink-0">
                    <img
                      src={activeProduct.image_url}
                      alt={activeProduct.name}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  <div className="flex-1 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-[#8E6737] uppercase tracking-wider">
                        {activeProduct.brand || 'AOOSH'}
                      </span>
                      <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug">
                        {activeProduct.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {activeProduct.description}
                      </p>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-slate-900">
                          {formatINR(getProductDisplayPrice(activeProduct).unitPaise * quantity)}
                        </span>
                        {getProductDisplayPrice(activeProduct).hasDiscount && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatINR(getProductDisplayPrice(activeProduct).originalPaise * quantity)}
                          </span>
                        )}
                      </div>
                      {isMember && (
                        <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5">
                          ✓ ₹150 Member Benefit Applied
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Size Selection */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-800">Select Size:</label>
                    <span className="text-[11px] text-slate-400">Regular Competition Fit</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {activeProduct.sizes?.map((s) => {
                      const outOfStock = s.stock <= 0;
                      const isSelected = selectedSize === s.size;
                      return (
                        <button
                          key={s.size}
                          type="button"
                          disabled={outOfStock}
                          onClick={() => setSelectedSize(s.size)}
                          className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                            outOfStock
                              ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-[#171A2B] text-white border-[#171A2B] shadow-xs ring-2 ring-[#625BF6]/20'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <div className="text-sm font-black">{s.size}</div>
                          <div className={`text-[9px] ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                            {outOfStock ? 'Sold Out' : `${s.stock} left`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-slate-800">Quantity:</span>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 text-xs font-bold text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(5, quantity + 1))}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Delivery Notes */}
                <div className="space-y-1 text-xs">
                  <label className="font-semibold text-slate-700">Handover Location / Room (Optional):</label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g., Campus Innovation Hall or Chapter Desk"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                {/* Pay with Razorpay Button OR Organizer Notice */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {isOrganizer ? (
                    <div className="space-y-2 text-center">
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold leading-relaxed">
                        Organizers cannot purchase merchandise. As an organizer, you manage product sizes and stock inventory.
                      </div>
                      <Link
                        to="/organizer/merch"
                        className="w-full py-3.5 px-6 bg-[#171A2B] hover:bg-[#252844] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        <span>Manage Size & Stock in Inventory</span>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleRazorpayPayment}
                        disabled={orderLoading || !selectedSize}
                        className="w-full py-3.5 px-6 bg-[#625BF6] hover:bg-[#5048E5] disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-[#625BF6]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {orderLoading ? (
                          <span>Connecting to Razorpay...</span>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Pay {formatINR(getProductDisplayPrice(activeProduct).unitPaise * quantity)} with Razorpay</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                        <Lock className="w-3 h-3" />
                        <span>256-Bit SSL Secured • Instant Order Confirmation</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (user) {
    return (
      <DashboardLayout
        pageTitle="Merch Catalog"
        breadcrumbs={[{ label: 'Dashboard', link: '/dashboard' }, { label: 'Merch Catalog' }]}
      >
        {pageBody}
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col">
      <Navbar />
      <main className="px-4 sm:px-6 lg:px-8 py-10 flex-1">
        {pageBody}
      </main>
    </div>
  );
};

export default MerchCatalogPage;

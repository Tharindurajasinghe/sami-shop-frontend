import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getBillHTML } from '../components/BillView';
import api from '../services/api';
import { Product } from '../utils/ProductClasses';
import { getUnitShort } from '../utils/Units';
import UptoNowBox from './UptoNowBox';
import LowStockAlert from './LowStockAlert';
import LoadingOverlay from '../components/LoadingOverlay';

/**
 * SellingScreen
 *
 * Cart is stored as a plain React array:  cartItems = [CartRow, ...]
 * Each CartRow is a plain object with a unique rowId (not tied to productId),
 * so the SAME product can be added multiple times as separate rows.
 *
 * CartRow shape:
 * {
 *   rowId        : string  — unique per row (never changes after creation)
 *   product      : Product — product instance
 *   quantity     : number
 *   editedPrice  : number | null  — null = use product.sellingPrice
 *   priceInput   : string — raw string shown in the price input while typing
 * }
 */

// ─── Helper: create a unique row id ─────────────────────────────────────────
const makeRowId = (productKey) =>
  `${productKey}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ─── Helper: get the displayed price of a row ─────────────────────────────
const getRowPrice = (row) =>
  row.editedPrice !== null ? row.editedPrice : row.product.sellingPrice;

// ─── Helper: get row total ────────────────────────────────────────────────
const getRowTotal = (row) => getRowPrice(row) * row.quantity;

// ─── Helper: cart grand total ────────────────────────────────────────────
const calcTotal = (rows) => rows.reduce((s, r) => s + getRowTotal(r), 0);


const SellingScreen = ({ onEndDay }) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [cartItems, setCartItems]     = useState([]);   // plain array of CartRows
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [todayBills, setTodayBills]   = useState([]);
  const [showBills, setShowBills]     = useState(false);
  const [currentSales, setCurrentSales] = useState({ total: 0, profit: 0 });
  const [cash, setCash]   = useState('');
  const [change, setChange] = useState(0);
  const [loading, setLoading]               = useState(false);        // day-end loading (existing)
  const [productsLoading, setProductsLoading] = useState(true);       // initial product load
  const [billSaving, setBillSaving]           = useState(false);      // bill save (print/cash Enter)
  const [billsChecking, setBillsChecking]     = useState(false);      // Check Up to Now Sell
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Barcode scanner state
  const [barcodeBuffer, setBarcodeBuffer]   = useState('');
  const [barcodeStatus, setBarcodeStatus]   = useState(''); // '' | 'scanning' | 'found' | 'notfound'
  const barcodeTimerRef = useRef(null);
  // guard flag to prevent double-fire from idle timer + Enter both triggering
  const barcodeHandledRef = useRef(false);
  // tracks last scanned barcode + timestamp to debounce accidental double-scans
  const lastScannedRef = useRef({ barcode: null, time: 0 });

  // Product indexes (loaded once)
  const [productIndex, setProductIndex]       = useState({}); // uniqueKey → Product
  const [productsByIdMap, setProductsByIdMap] = useState({}); // productId → Product[]

  const searchTimeoutRef = useRef(null);
  const searchInputRef   = useRef(null);
  const cashInputRef     = useRef(null);

  // ── FIX: cart scroll ref + barcode-triggered flag ─────────────────────────
  const cartScrollRef   = useRef(null); // attached to the cart scroll container div
  const barcodeAddedRef = useRef(false);// set true just before a barcode cart update

  // ── Load products once ─────────────────────────────────────────────────────
  useEffect(() => {
    loadCurrentDaySummary();
    (async () => {
      setProductsLoading(true);
      try {
        const res = await api.getProducts();
        const keyIndex  = {};
        const idGroupMap = {};
        res.data.forEach(p => {
          const product = new Product(p);
          keyIndex[product.getUniqueKey()] = product;
          if (!idGroupMap[product.productId]) idGroupMap[product.productId] = [];
          idGroupMap[product.productId].push(product);
        });
        setProductIndex(keyIndex);
        setProductsByIdMap(idGroupMap);
      } catch {
        alert('Products failed to load');
      } finally {
        setProductsLoading(false);
      }
    })();
  }, []);

  // ── FIX: scroll cart to bottom whenever a barcode scan adds/updates a row ──
  useEffect(() => {
    if (barcodeAddedRef.current && cartScrollRef.current) {
      cartScrollRef.current.scrollTop = cartScrollRef.current.scrollHeight;
      barcodeAddedRef.current = false;
    }
  }, [cartItems]);

  // ── Global keyboard: Ctrl = print/save, RightShift = focus cash ───────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && cartItems.length > 0) {
        e.preventDefault();
        handlePrintSave(true);  // skip confirm dialog, always print
      }
      if (e.code === 'ShiftRight') {
        e.preventDefault();
        cashInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartItems, cash]);  // added cash — fixes stale closure when Ctrl is pressed

  // ── Barcode scanner listener ───────────────────────────────────────────────
  // Barcode scanners typically fire characters rapidly and finish with Enter.
  // We collect characters in a buffer with a 50ms idle timeout to distinguish
  // scanner input from manual keyboard input.
  useEffect(() => {
    const BARCODE_MIN_LENGTH = 3;   // ignore very short accidental scans
    const IDLE_TIMEOUT_MS    = 50;  // ms of silence = end of barcode

    const onKeyDown = (e) => {
      // Ignore modifier combos and events from focused inputs (manual typing)
      const tag = document.activeElement?.tagName;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        // Cancel idle timer immediately so it cannot fire a second scan
        if (barcodeTimerRef.current) {
          clearTimeout(barcodeTimerRef.current);
          barcodeTimerRef.current = null;
        }

        setBarcodeBuffer(prev => {
          const code = prev.trim();
          // Only call handler if not already handled by idle timer
          if (code.length >= BARCODE_MIN_LENGTH && !barcodeHandledRef.current) {
            barcodeHandledRef.current = true;
            handleBarcodeScanned(code);
            // Reset guard after a short delay
            setTimeout(() => { barcodeHandledRef.current = false; }, 300);
          }
          return '';
        });
        return;
      }

      // Single printable character — add to buffer
      if (e.key.length === 1) {
        // Reset the handled guard when new characters start coming in
        barcodeHandledRef.current = false;
        setBarcodeBuffer(prev => prev + e.key);
        setBarcodeStatus('scanning');

        // Reset idle timer
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = setTimeout(() => {
          setBarcodeBuffer(prev => {
            const code = prev.trim();
            // Only fire if not already handled and guard not set
            if (code.length >= BARCODE_MIN_LENGTH && !barcodeHandledRef.current) {
              barcodeHandledRef.current = true;
              handleBarcodeScanned(code);
              setTimeout(() => { barcodeHandledRef.current = false; }, 300);
            }
            return '';
          });
        }, IDLE_TIMEOUT_MS);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
    };
  }, [productIndex]);   // re-bind when productIndex is ready

  /** Handle a fully scanned barcode */
  const handleBarcodeScanned = async (barcode) => {
    setBarcodeStatus('scanning');
    // Clear the search field immediately when a barcode scan is triggered
    setSearchQuery('');
    setSuggestions([]);

    try {
      const res = await api.searchByBarcode(barcode);
      const product = new Product(res.data);

      if (product.stock <= 0) {
        setBarcodeStatus('notfound');
        setTimeout(() => setBarcodeStatus(''), 2000);
        alert(`Product "${product.getDisplayName()}" is out of stock!`);
        return;
      }

      // ── FIX: flag that the next cartItems update needs auto-scroll ──
      barcodeAddedRef.current = true;

      // Add directly to cart with qty = 1, then immediately focus search
      addToCartFromBarcode(product);
      setBarcodeStatus('found');
      setTimeout(() => setBarcodeStatus(''), 1500);
    } catch (err) {
      setBarcodeStatus('notfound');
      setTimeout(() => setBarcodeStatus(''), 2000);
      // Only alert for non-404; 404 = barcode simply not assigned
      if (err.response?.status !== 404) {
        alert('Barcode scan error: ' + (err.response?.data?.message || err.message));
      } else {
        alert(`No product found for barcode: ${barcode}`);
      }
    }
  };

  // ── Live change calc ───────────────────────────────────────────────────────
  useEffect(() => {
    const cashNum = parseFloat(cash) || 0;
    const total   = calcTotal(cartItems);
    setChange(cashNum >= total ? cashNum - total : 0);
  }, [cash, cartItems]);

  // ── Scroll suggestion into view ────────────────────────────────────────────
  useEffect(() => {
    if (selectedSuggestionIndex >= 0) {
      document
        .querySelector(`[data-suggestion-index="${selectedSuggestionIndex}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedSuggestionIndex]);

  // ── API helpers ────────────────────────────────────────────────────────────
  const loadCurrentDaySummary = async () => {
    try {
      const r = await api.getCurrentDaySummary();
      setCurrentSales({ total: r.data.totalSales, profit: r.data.totalProfit });
    } catch {}
  };

  // ── Cart helpers ───────────────────────────────────────────────────────────

  /**
   * Add product as a BRAND NEW row every time — never merges with existing rows.
   * rowId is unique so React key and DOM id are unique per row.
   */
  const addToCart = (product) => {
    const rowId = makeRowId(product.getUniqueKey());
    const newRow = {
      rowId,
      product,
      quantity     : 1,
      quantityInput: '1',
      editedPrice  : null,
      priceInput   : String(product.sellingPrice),
    };

    // Stock check
    if (newRow.quantity > product.stock) {
      alert(`Insufficient stock! Available: ${parseFloat(product.stock.toFixed(3))}`);
      return;
    }

    setCartItems(prev => [...prev, newRow]);
    setSearchQuery('');
    setSuggestions([]);

    // Focus the qty input of the newly added row
    setTimeout(() => {
      const el = document.getElementById(`qty-${rowId}`);
      el?.focus();
      el?.select();
    }, 80);
  };

  /**
   * Add product from barcode scan — qty fixed at 1 for new items.
   * If same productId + variant already in cart:
   *   - If scanned within 800ms of the last scan of the same barcode → accidental
   *     double-fire from scanner, IGNORE silently.
   *   - If scanned after 800ms → intentional re-scan, INCREMENT qty by 1
   *     (with stock limit check).
   * Different variant of same product is always added as a new row.
   */
  const addToCartFromBarcode = (product) => {
    const DOUBLE_SCAN_THRESHOLD_MS = 800;
    const now = Date.now();
    const barcodeKey = `${product.productId}_${product.variant}`;

    // Check if this is an accidental double-fire (same barcode within threshold)
    if (
      lastScannedRef.current.barcode === barcodeKey &&
      now - lastScannedRef.current.time < DOUBLE_SCAN_THRESHOLD_MS
    ) {
      // Silently ignore — this is the scanner misfiring
      return;
    }

    // Update last scanned record
    lastScannedRef.current = { barcode: barcodeKey, time: now };

    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        r => r.product.productId === product.productId &&
             r.product.variant   === product.variant
      );

      if (existingIndex !== -1) {
        // Product already in cart — intentional re-scan → increment qty by 1
        const existingRow = prev[existingIndex];
        const newQty = existingRow.quantity + 1;

        // Stock check
        if (newQty > product.stock) {
          alert(
            `Cannot add more "${product.getDisplayName()}". ` +
            `Stock limit reached! Available: ${parseFloat(product.stock.toFixed(3))}`
          );
          return prev; // unchanged
        }

        // Increment
        return prev.map((r, i) =>
          i === existingIndex
            ? { ...r, quantity: newQty, quantityInput: String(newQty) }
            : r
        );
      }

      // Not in cart yet — add as new row (qty = 1)
      if (1 > product.stock) {
        alert(`Insufficient stock! Available: ${parseFloat(product.stock.toFixed(3))}`);
        return prev;
      }

      const rowId = makeRowId(product.getUniqueKey());
      const newRow = {
        rowId,
        product,
        quantity     : 1,
        quantityInput: '1',
        editedPrice  : null,
        priceInput   : String(product.sellingPrice),
      };

      return [...prev, newRow];
    });
    // Do NOT redirect focus — scanner is ready for next item immediately
  };

  /** Update quantity input (raw string, no validation while typing) */
  const updateQuantityInput = (rowId, rawValue) => {
    setCartItems(prev => prev.map(r => 
      r.rowId === rowId ? { ...r, quantityInput: rawValue } : r
    ));
  };

  /** Apply and validate quantity (called on blur or Enter) */
  const applyQuantity = (rowId) => {
    setCartItems(prev => prev.map(r => {
      if (r.rowId !== rowId) return r;

      const parsed = parseFloat(r.quantityInput);

      // If empty or invalid, revert to current quantity
      if (isNaN(parsed) || r.quantityInput.trim() === '') {
        return { ...r, quantityInput: String(r.quantity) };
      }

      // Minimum check
      const minQty = 0.01;
      if (parsed < minQty) {
        alert(`Minimum quantity is ${minQty}`);
        return { ...r, quantityInput: String(r.quantity) };
      }

      // Maximum check
      if (parsed > 99999) {
        alert('Quantity too large');
        return { ...r, quantityInput: String(r.quantity) };
      }

      // Validate integer for 'unit' type
      if (r.product.unit === 'unit' && !Number.isInteger(parsed)) {
        alert('Quantity must be a whole number for this product (sold by piece/item)');
        return { ...r, quantityInput: String(r.quantity) };
      }

      // Stock check
      if (parsed > r.product.stock) {
        alert(`Insufficient stock! Available: ${parseFloat(r.product.stock.toFixed(3))} ${r.product.unit}`);
        return { ...r, quantityInput: String(r.quantity) };
      }

      // Valid - update both quantity and quantityInput
      return { ...r, quantity: parsed, quantityInput: String(parsed) };
    }));
  };

  /** Live update the raw price string while user is typing (no validation) */
  const updatePriceInput = (rowId, rawValue) => {
    setCartItems(prev =>
      prev.map(r => r.rowId === rowId ? { ...r, priceInput: rawValue } : r)
    );
  };

  /** Apply price on Enter/blur — validate here */
  const applyPrice = (rowId) => {
    setCartItems(prev => prev.map(r => {
      if (r.rowId !== rowId) return r;
      const parsed = parseFloat(r.priceInput);
      if (isNaN(parsed) || r.priceInput === '') {
        // Reset to current effective price
        return { ...r, priceInput: String(getRowPrice(r)) };
      }
      if (parsed < r.product.buyingPrice) {
        alert(`Price cannot be less than buying price (Rs.${r.product.buyingPrice})`);
        return { ...r, priceInput: String(getRowPrice(r)) };
      }
      return { ...r, editedPrice: parsed, priceInput: String(parsed) };
    }));
  };

  /** Change variant for a row — replaces product, keeps quantity, checks stock */
  const changeVariant = (rowId, newVariantName) => {
    setCartItems(prev => prev.map(r => {
      if (r.rowId !== rowId) return r;
      
      const newProductKey = `${r.product.productId}_${newVariantName}`;
      const newProduct = productIndex[newProductKey];
      
      if (!newProduct) {
        alert('Variant not found');
        return r;
      }
      
      // Check if new variant has enough stock for current quantity
      if (r.quantity > newProduct.stock) {
        alert(`Variant "${newVariantName}" has insufficient stock! Available: ${parseFloat(newProduct.stock.toFixed(3))}. Current quantity: ${r.quantity}`);
        return r; // Keep old variant
      }
      
      return {
        ...r,
        product      : newProduct,
        editedPrice  : null,
        priceInput   : String(newProduct.sellingPrice),
        quantityInput: String(r.quantity),
      };
    }));
  };

  /** Remove a row from cart */
  const removeRow = (rowId) => {
    setCartItems(prev => prev.filter(r => r.rowId !== rowId));
  };

  // ── Search ─────────────────────────────────────────────────────────────────

  /**
   * Type numeric ID → Enter → adds first variant WITH STOCK.
   * If all variants are out of stock, show error.
   * If found, user can change variant via dropdown in cart.
   */
  const addByProductId = (value) => {
    const id       = value.padStart(3, '0');
    const variants = productsByIdMap[id];
    
    if (!variants || variants.length === 0) {
      alert('Product ID not found');
      return;
    }

    // Find first variant with stock > 0
    const availableVariant = variants.find(v => v.stock > 0);
    
    if (!availableVariant) {
      alert(`Product ${id} - All variants are out of stock`);
      return;
    }

    addToCart(availableVariant);
  };

  const handleSearch = async (value) => {
    setSearchQuery(value);
    setSelectedSuggestionIndex(-1);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!value.trim()) { setSuggestions([]); return; }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        if (/^\d{1,3}$/.test(value)) {
          // Short numeric → product ID lookup
          const res  = await api.getProduct(value.padStart(3, '0'));
          const data = Array.isArray(res.data) ? res.data : [res.data];
          setSuggestions(data.map(p => new Product(p)));
        } else {
          // Name search first
          const res = await api.searchProducts(value);
          const byName = res.data.map(p => new Product(p));

          // Also try barcode lookup in parallel (value might be a barcode being typed)
          let byBarcode = null;
          try {
            const bRes = await api.searchByBarcode(value.trim());
            byBarcode = new Product(bRes.data);
          } catch { /* barcode not found — that's fine */ }

          if (byBarcode) {
            // Put barcode match at top, then name results (deduplicated)
            const deduplicated = byName.filter(
              p => p.getUniqueKey() !== byBarcode.getUniqueKey()
            );
            setSuggestions([byBarcode, ...deduplicated]);
          } else {
            setSuggestions(byName);
          }
        }
      } catch { setSuggestions([]); }
    }, 300);
  };

  // ── Bill ───────────────────────────────────────────────────────────────────

  const buildBillData = (cashAmount) => ({
    items: cartItems.map(r => ({
      productId    : r.product.productId,
      variant      : r.product.variant,
      quantity     : r.quantity,
      ...(r.editedPrice !== null && {
        price        : r.editedPrice,
        originalPrice: r.product.sellingPrice,  // send original so bill can show both
      }),
    })),
    cash  : cashAmount,
    change: Math.max(0, cashAmount - calcTotal(cartItems)),
  });

  const printBill = (bill) => {
    const w = window.open('', '', 'width=400,height=600');
    w.document.write(getBillHTML(bill));
    w.document.close();
  };

  const clearCart = () => {
    setCartItems([]);
    setCash('');
    setChange(0);
    loadCurrentDaySummary();
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handlePrintSave = async (skipConfirm = false) => {
    document.activeElement?.blur();

    if (cartItems.length === 0) {
      alert('Cart is empty!');
      return;
    }

    // If called from Ctrl shortcut, skip the confirm dialog and always print
    const doPrint = skipConfirm
      ? true
      : window.confirm('Do you want to print the bill?\n\nYes - Print and Save\nNo - Save Only');

    setBillSaving(true);
    try {
      const res = await api.createBill(buildBillData(parseFloat(cash) || 0));
      // Hide loading BEFORE alert appears (as required)
      setBillSaving(false);
      if (doPrint) printBill(res.data);
      alert('Bill saved successfully!');
      clearCart();
    } catch (err) {
      setBillSaving(false);
      alert(err.response?.data?.message || 'Error saving bill');
    }
  };

  const handleSaveBillFromCash = async (cashNum) => {
    if (cartItems.length === 0) return;
    setBillSaving(true);
    try {
      await api.createBill(buildBillData(cashNum));
      // Hide loading BEFORE alert appears (as required)
      setBillSaving(false);
      alert('Bill saved successfully!');
      clearCart();
    } catch (err) {
      setBillSaving(false);
      alert(err.response?.data?.message || 'Error saving bill');
    }
  };

  const handleCheckUpToNow = async () => {
    setBillsChecking(true);
    try {
      const r = await api.getTodayBills();
      setTodayBills(r.data);
      setShowBills(true);
    } catch {
      alert('Error loading bills');
    } finally {
      setBillsChecking(false);
    }
  };

  const handleEndDay = async () => {
    if (!window.confirm(
      'Are you sure you want to end the day?\nThis will create a daily summary and close today\'s sales.'
    )) return;
    setLoading(true);
    try {
      const r = await api.getCurrentDaySummary();
      onEndDay({
        date       : r.data.date,
        items      : r.data.items,
        totalIncome: r.data.totalSales,
        totalProfit: r.data.totalProfit,
        bills      : r.data.bills,
      });
    } catch (err) {
      setLoading(false);
      alert(err.response?.data?.message || 'Error ending day');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const grandTotal = calcTotal(cartItems);

  return (
    <div>
      {/* Loading overlays — each with specific message */}
      {productsLoading  && <LoadingOverlay message="Loading products..." />}
      {billSaving       && <LoadingOverlay message="Saving bill..." />}
      {billsChecking    && <LoadingOverlay message="Loading bills..." />}
      {loading          && <LoadingOverlay message="Creating day-end summary..." />}

      <div className="grid grid-cols-2 gap-6 mb-6">

        {/* ── Left: Search panel ── */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Add Products</h2>

          <div className="mb-4 relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by product ID, name or barcode..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedSuggestionIndex(p => p < suggestions.length - 1 ? p + 1 : 0);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedSuggestionIndex(p => p > 0 ? p - 1 : suggestions.length - 1);
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

                  // ── NUMERIC ID (1-3 digits) → add directly from local index ──
                  if (/^\d{1,3}$/.test(searchQuery)) {
                    setSuggestions([]);
                    addByProductId(searchQuery);
                    return;
                  }
                  // ── Arrow-selected suggestion ──
                  if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                    addToCart(suggestions[selectedSuggestionIndex]);
                    return;
                  }
                  // ── Single or first suggestion ──
                  if (suggestions.length > 0) {
                    addToCart(suggestions[0]);
                    return;
                  }
                  // ── No suggestions found → try as barcode ──
                  if (searchQuery.trim().length >= 3) {
                    handleBarcodeScanned(searchQuery.trim());
                  }
                }
              }}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((product, index) => (
                  <div
                    key={product.getUniqueKey()}
                    data-suggestion-index={index}
                    onClick={() => addToCart(product)}
                    className={`p-3 cursor-pointer border-b ${
                      index === selectedSuggestionIndex ? 'bg-green-100' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{product.getDisplayName()}</p>
                        <p className="text-sm text-gray-600">
                          ID: {product.productId} | Stock: {parseFloat(product.stock.toFixed(3))}
                        </p>
                      </div>
                      <p className="font-bold text-green-600">
                        Rs. {product.sellingPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Barcode scanner status indicator */}
          <div className="mb-3 flex items-center gap-2 text-sm">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium
              ${barcodeStatus === 'scanning' ? 'bg-yellow-100 text-yellow-700' :
                barcodeStatus === 'found'    ? 'bg-green-100 text-green-700'   :
                barcodeStatus === 'notfound' ? 'bg-red-100 text-red-700'       :
                'bg-gray-100 text-gray-500'}`}
            >
              <span className={`w-2 h-2 rounded-full
                ${barcodeStatus === 'scanning' ? 'bg-yellow-500 animate-pulse' :
                  barcodeStatus === 'found'    ? 'bg-green-500'                 :
                  barcodeStatus === 'notfound' ? 'bg-red-500'                   :
                  'bg-gray-400'}`}
              />
              {barcodeStatus === 'scanning' ? 'Scanning...' :
               barcodeStatus === 'found'    ? '✓ Product added' :
               barcodeStatus === 'notfound' ? '✗ Not found' :
               'Ready to scan'}
            </span>
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded">
            <div className="flex justify-between">
              <span className="font-semibold">Up to Now Sell:</span>
              <span className="text-blue-600 font-bold">Rs. {currentSales.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCheckUpToNow}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Check Up to Now Sell
            </button>
            <button onClick={handleEndDay}
              className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700">
              End Sell Today
            </button>
          </div>
        </div>

        {/* ── Right: Cart panel ── */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Current Bill</h2>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString()} | {new Date().toLocaleTimeString()}
            </p>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No items in cart</p>
            </div>
          ) : (
            <>
              {/* FIX: ref attached here — barcode scans auto-scroll this div to bottom */}
              <div ref={cartScrollRef} className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {cartItems.map((row) => {
                  const availableVariants = productsByIdMap[row.product.productId] || [];
                  const hasMultipleVariants = availableVariants.length > 1;
                  const priceIsEdited = row.editedPrice !== null;

                  return (
                    <div key={row.rowId} className="p-3 bg-gray-50 rounded border">

                      {/* Name + remove */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold">{row.product.name}</p>
                          <p className="text-xs text-gray-500">ID: {row.product.productId}</p>
                        </div>
                        <button
                          onClick={() => removeRow(row.rowId)}
                          className="text-red-500 hover:text-red-700 ml-2 text-sm"
                        >✕</button>
                      </div>

                      {/* Variant */}
                      <div className="flex items-center mb-2">
                        <span className="text-sm text-gray-600 w-16">Variant:</span>
                        {hasMultipleVariants ? (
                          <select
                            value={row.product.variant}
                            onChange={(e) => changeVariant(row.rowId, e.target.value)}
                            className="flex-1 ml-2 px-2 py-1 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                          >
                            {availableVariants.map(v => (
                              <option key={v.variant} value={v.variant}>
                                {v.variant} — Rs.{v.sellingPrice.toFixed(2)} (Stock: {parseFloat(v.stock.toFixed(3))})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="flex-1 ml-2 px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                            {row.product.variant}
                          </span>
                        )}
                      </div>

                      {/* Quantity — backspace safe, unit-aware, allows empty while typing */}
                      <div className="flex items-center mb-2">
                        <span className="text-sm text-gray-600 w-20">Qty ({getUnitShort(row.product.unit)}):</span>
                        <input
                          id={`qty-${row.rowId}`}
                          type="number"
                          step={row.product.unit === 'unit' ? '1' : '0.01'}
                          value={row.quantityInput}
                          min={row.product.unit === 'unit' ? '1' : '0.01'}
                          onChange={(e) => updateQuantityInput(row.rowId, e.target.value)}
                          onBlur={() => applyQuantity(row.rowId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyQuantity(row.rowId);
                              searchInputRef.current?.focus();
                            }
                          }}
                          className="flex-1 ml-2 px-2 py-1 border rounded text-center text-sm w-20"
                        />
                      </div>

                      {/* Price — validate only on Enter/blur */}
                      <div className="flex items-center mb-1">
                        <span className="text-sm text-gray-600 w-16">Price:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={row.priceInput}
                          onChange={(e) => updatePriceInput(row.rowId, e.target.value)}
                          onBlur={() => applyPrice(row.rowId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyPrice(row.rowId);
                              searchInputRef.current?.focus();
                            }
                          }}
                          className={`flex-1 ml-2 px-2 py-1 border rounded text-right text-sm
                            ${priceIsEdited ? 'bg-yellow-50 border-yellow-400' : ''}`}
                          title={`Min: Rs.${row.product.buyingPrice}. Press Enter or click away to apply.`}
                        />
                      </div>

                      {priceIsEdited && (
                        <p className="text-xs text-yellow-600 text-right mb-1">
                          Edited (Original: Rs.{row.product.sellingPrice.toFixed(2)})
                        </p>
                      )}

                      {/* Row total */}
                      <div className="flex justify-between pt-2 border-t mt-1">
                        <span className="text-sm font-semibold text-gray-600">Total:</span>
                        <span className="font-bold text-green-600">
                          Rs. {getRowTotal(row).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cash & Change */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold">Cash:</p>
                  <input
                    ref={cashInputRef}
                    type="number"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const cashNum = parseFloat(cash) || 0;
                        setChange(Math.max(0, cashNum - grandTotal));
                        await handleSaveBillFromCash(cashNum);
                      }
                    }}
                    className="w-32 px-2 py-1 border rounded text-right"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold text-blue-600">Change:</p>
                  <p className="text-lg font-bold text-blue-600">Rs. {change.toFixed(2)}</p>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <p className="text-xl font-bold">Total</p>
                  <p className="text-2xl font-bold text-green-600">Rs. {grandTotal.toFixed(2)}</p>
                </div>

                <button
                  onClick={handlePrintSave}
                  className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 font-semibold"
                >
                  Print Bill / Save Bill
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-6">
        <LowStockAlert />
      </div>

      <UptoNowBox show={showBills} bills={todayBills} onClose={() => setShowBills(false)} />
    </div>
  );
};

export default SellingScreen;

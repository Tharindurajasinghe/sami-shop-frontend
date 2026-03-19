/**
 * Product Class - OOP Implementation
 * Represents a product with variant support
 */
export class Product {
  constructor(data) {
    this.productId = data.productId;
    this.name = data.name;
    this.variant = data.variant || 'Standard';
    this.stock = data.stock;
    this.buyingPrice = data.buyingPrice;
    this.sellingPrice = data.sellingPrice;
    this.categoryId = data.categoryId;
    this.unit = data.unit || 'unit';  // ✅ NEW FIELD
  }

  /**
   * Get unique identifier for product + variant combination
   */
  getUniqueKey() {
    return `${this.productId}_${this.variant}`;
  }

  /**
   * Get display name with variant
   */
  getDisplayName() {
    return this.variant === 'Standard' 
      ? this.name 
      : `${this.name} (${this.variant})`;
  }

  /**
   * Check if product has sufficient stock
   */
  hasStock(quantity = 1) {
    return this.stock >= quantity;
  }

  /**
   * Get profit margin
   */
  getProfitMargin() {
    return this.sellingPrice - this.buyingPrice;
  }

  /**
   * Get profit percentage
   */
  getProfitPercentage() {
    return ((this.sellingPrice - this.buyingPrice) / this.buyingPrice * 100).toFixed(2);
  }

  /**
   * Validate price against buying price
   */
  isValidSellingPrice(price) {
    return price >= this.buyingPrice;
  }

  /**
   * Format price for display
   */
  formatPrice(price) {
    return `Rs. ${price.toFixed(2)}`;
  }

  /**
   * Convert to plain object for API calls
   */
  toJSON() {
    return {
      productId: this.productId,
      name: this.name,
      variant: this.variant,
      stock: this.stock,
      buyingPrice: this.buyingPrice,
      sellingPrice: this.sellingPrice,
      categoryId: this.categoryId,
      unit: this.unit  // ✅ NEW FIELD
    };
  }
}

/**
 * CartItem Class - OOP Implementation
 * Represents an item in the shopping cart.
 * cartKey is a unique per-row ID so the same product+variant
 * can appear as multiple separate rows in the cart.
 */
export class CartItem {
  constructor(product, quantity = 1, editedPrice = null, cartKey = null) {
    this.product = product instanceof Product ? product : new Product(product);
    this.quantity = quantity;
    this.editedPrice = editedPrice; // User-edited price (optional)
    // Each row gets its own unique key (timestamp + random) so the same
    // product/variant can be added again as a new row
    this.cartKey = cartKey || `${product.getUniqueKey()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Get unique key for THIS cart row (not the product key)
   */
  getUniqueKey() {
    return this.cartKey;
  }

  /**
   * Get the product's own key (productId_variant) for lookups
   */
  getProductKey() {
    return this.product.getUniqueKey();
  }

  /**
   * Get actual selling price (edited or default)
   */
  getPrice() {
    return this.editedPrice !== null ? this.editedPrice : this.product.sellingPrice;
  }

  /**
   * Get total price for this item
   */
  getTotal() {
    return this.getPrice() * this.quantity;
  }

  /**
   * Get profit for this item
   */
  getProfit() {
    return (this.getPrice() - this.product.buyingPrice) * this.quantity;
  }

  /**
   * Check if quantity exceeds stock
   */
  exceedsStock() {
    return this.quantity > this.product.stock;
  }

  /**
   * Validate edited price
   */
  isValidEditedPrice(price) {
    return price >= this.product.buyingPrice;
  }

  /**
   * Set edited price with validation
   */
  setEditedPrice(price) {
    if (!this.isValidEditedPrice(price)) {
      throw new Error(`Price cannot be less than buying price (Rs.${this.product.buyingPrice})`);
    }
    this.editedPrice = price;
  }

  /**
   * Update quantity with stock validation
   */
  updateQuantity(quantity) {
    if (quantity > this.product.stock) {
      throw new Error(`Insufficient stock! Available: ${this.product.stock}`);
    }
    this.quantity = quantity;
  }

  /**
   * Increase quantity
   */
  incrementQuantity(amount = 1) {
    this.updateQuantity(this.quantity + amount);
  }

  /**
   * Convert to API format for bill creation
   */
  toBillItem() {
    return {
      productId: this.product.productId,
      variant: this.product.variant,
      quantity: this.quantity,
      ...(this.editedPrice !== null && { price: this.editedPrice })
    };
  }

  /**
   * Convert to display object
   */
  toDisplay() {
    return {
      uniqueKey: this.getUniqueKey(),
      productId: this.product.productId,
      name: this.product.getDisplayName(),
      variant: this.product.variant,
      quantity: this.quantity,
      price: this.getPrice(),
      originalPrice: this.product.sellingPrice,
      priceEdited: this.editedPrice !== null,
      total: this.getTotal(),
      stock: this.product.stock,
      buyingPrice: this.product.buyingPrice,
      profit: this.getProfit(),
      unit: this.product.unit  // ✅ NEW FIELD
    };
  }
}

/**
 * ShoppingCart Class - OOP Implementation
 * Manages the shopping cart
 */
export class ShoppingCart {
  constructor() {
    this.items = new Map(); // Map of uniqueKey => CartItem
  }

  /**
   * Add product to cart as a NEW separate row every time.
   * Same product+variant typed twice = two separate rows in the cart.
   */
  addProduct(product, quantity = 1) {
    const cartItem = new CartItem(product, quantity);
    if (cartItem.exceedsStock()) {
      throw new Error(`Insufficient stock! Available: ${product.stock}`);
    }
    // Use the cartItem's own unique cartKey so each add creates a new row
    this.items.set(cartItem.cartKey, cartItem);
  }

  /**
   * Update quantity for a cart item
   */
  updateQuantity(uniqueKey, quantity) {
    if (!this.items.has(uniqueKey)) return;
    
    if (quantity <= 0) {
      this.removeItem(uniqueKey);
    } else {
      const item = this.items.get(uniqueKey);
      item.updateQuantity(quantity);
    }
  }

  /**
   * Update price for a cart item
   */
  updatePrice(uniqueKey, price) {
    if (!this.items.has(uniqueKey)) return;
    
    const item = this.items.get(uniqueKey);
    item.setEditedPrice(price);
  }

  /**
   * Remove item from cart
   */
  removeItem(uniqueKey) {
    this.items.delete(uniqueKey);
  }

  /**
   * Clear all items
   */
  clear() {
    this.items.clear();
  }

  /**
   * Get cart items as array
   */
  getItems() {
    return Array.from(this.items.values());
  }

  /**
   * Get cart size
   */
  getSize() {
    return this.items.size;
  }

  /**
   * Get total amount
   */
  getTotal() {
    return this.getItems().reduce((sum, item) => sum + item.getTotal(), 0);
  }

  /**
   * Get total profit
   */
  getTotalProfit() {
    return this.getItems().reduce((sum, item) => sum + item.getProfit(), 0);
  }

  /**
   * Check if cart is empty
   */
  isEmpty() {
    return this.items.size === 0;
  }

  /**
   * Convert to bill data for API
   */
  toBillData(cash) {
    const total = this.getTotal();
    const change = cash >= total ? cash - total : 0;

    return {
      items: this.getItems().map(item => item.toBillItem()),
      cash: cash,
      change: change
    };
  }

  /**
   * Get display data
   */
  toDisplayArray() {
    return this.getItems().map(item => item.toDisplay());
  }
}

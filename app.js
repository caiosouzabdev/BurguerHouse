const DELIVERY_FEE = 3.99;
const FREE_DELIVERY_MIN = 25;

const MENU = [
  {
    id: "classic-smash",
    name: "Classic Smash",
    description: "Um disco, queijo americano, picles, cebola e molho da casa no brioche.",
    price: 32.9,
    category: "burgers",
    emoji: "🍔",
    badge: "Mais vendido",
  },
  {
    id: "double-smash",
    name: "Double Smash",
    description: "Dois discos achatados, queijo duplo, alface picada e molho especial.",
    price: 41.9,
    category: "burgers",
    emoji: "🍔",
    badge: "Popular",
  },
  {
    id: "bacon-bbq",
    name: "Bacon BBQ",
    description: "Bacon crocante, cheddar, anéis de cebola e glaze de BBQ defumado.",
    price: 43.9,
    category: "burgers",
    emoji: "🥓",
  },
  {
    id: "mushroom-swiss",
    name: "Cogumelo Suíço",
    description: "Cogumelos salteados, queijo suíço, aioli de alho e rúcula.",
    price: 39.9,
    category: "burgers",
    emoji: "🍄",
  },
  {
    id: "spicy-jalapeno",
    name: "Jalapeño Picante",
    description: "Pepper jack, jalapeños em conserva, maionese de chipotle e cebola crocante.",
    price: 38.9,
    category: "burgers",
    emoji: "🌶️",
    badge: "Picante",
  },
  {
    id: "veggie-garden",
    name: "Veggie Garden",
    description: "Discos de feijão preto, abacate, tomate, brotos e molho de iogurte com ervas.",
    price: 36.9,
    category: "burgers",
    emoji: "🥬",
    badge: "Vegetariano",
  },
  {
    id: "truffle-fries",
    name: "Batata Trufada",
    description: "Batatas cortadas na hora, óleo de trufa, parmesão e salsinha fresca.",
    price: 18.9,
    category: "sides",
    emoji: "🍟",
  },
  {
    id: "onion-rings",
    name: "Anéis de Cebola",
    description: "Anéis empanados na cerveja com molho ranch de chipotle.",
    price: 16.9,
    category: "sides",
    emoji: "🧅",
  },
  {
    id: "coleslaw",
    name: "Salada de Repolho",
    description: "Salada cremosa da casa com molho de vinagre de maçã.",
    price: 12.9,
    category: "sides",
    emoji: "🥗",
  },
  {
    id: "cola",
    name: "Cola Artesanal",
    description: "Cola produzida em pequenos lotes, levemente adocicada.",
    price: 9.9,
    category: "drinks",
    emoji: "🥤",
  },
  {
    id: "lemonade",
    name: "Limonada Fresca",
    description: "Espremida diariamente com hortelã.",
    price: 11.9,
    category: "drinks",
    emoji: "🍋",
  },
  {
    id: "milkshake",
    name: "Milkshake de Baunilha",
    description: "Milkshake cremoso de baunilha.",
    price: 18.9,
    category: "drinks",
    emoji: "🥛",
    badge: "Popular",
  },
];

let cart = loadCart();
let activeCategory = "burgers";

const menuGrid = document.getElementById("menuGrid");
const categoryTabs = document.getElementById("categoryTabs");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const cartFooter = document.getElementById("cartFooter");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartDeliveryFee = document.getElementById("cartDeliveryFee");
const deliveryFeeRow = document.getElementById("deliveryFeeRow");
const cartTotal = document.getElementById("cartTotal");
const checkoutTotal = document.getElementById("checkoutTotal");

const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const checkoutModal = document.getElementById("checkoutModal");
const successModal = document.getElementById("successModal");
const checkoutForm = document.getElementById("checkoutForm");
const addressField = document.getElementById("addressField");
const successMessage = document.getElementById("successMessage");
const orderIdEl = document.getElementById("orderId");

function formatMoney(amount) {
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function loadCart() {
  try {
    const saved = localStorage.getItem("burger-house-cart");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem("burger-house-cart", JSON.stringify(cart));
}

function getMenuItem(id) {
  return MENU.find((item) => item.id === id);
}

function getSubtotal() {
  return cart.reduce((sum, line) => {
    const item = getMenuItem(line.id);
    return sum + (item ? item.price * line.qty : 0);
  }, 0);
}

function getDeliveryFee(orderType = "delivery") {
  if (orderType === "pickup") return 0;
  const subtotal = getSubtotal();
  return subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
}

function getTotal(orderType = "delivery") {
  return getSubtotal() + getDeliveryFee(orderType);
}

function getCartCount() {
  return cart.reduce((sum, line) => sum + line.qty, 0);
}

function addToCart(id) {
  const existing = cart.find((line) => line.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, qty: 1 });
  }
  saveCart();
  renderCart();
  openCart();
}

function updateQty(id, delta) {
  const line = cart.find((item) => item.id === id);
  if (!line) return;

  line.qty += delta;
  if (line.qty <= 0) {
    cart = cart.filter((item) => item.id !== id);
  }

  saveCart();
  renderCart();
}

function renderMenu() {
  const items = MENU.filter((item) => item.category === activeCategory);

  menuGrid.innerHTML = items
    .map(
      (item) => `
        <article class="menu-card">
          <div class="menu-card__emoji" aria-hidden="true">${item.emoji}</div>
          <div class="menu-card__top">
            <h3>${item.name}</h3>
            <span class="menu-card__price">${formatMoney(item.price)}</span>
          </div>
          <p>${item.description}</p>
          <div class="menu-card__footer">
            ${item.badge ? `<span class="badge">${item.badge}</span>` : "<span></span>"}
            <button class="btn btn--primary btn--small" data-add="${item.id}">Adicionar</button>
          </div>
        </article>
      `
    )
    .join("");

  menuGrid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.add));
  });
}

function renderCart(orderType = getSelectedOrderType()) {
  const count = getCartCount();
  cartCount.textContent = String(count);

  if (cart.length === 0) {
    cartItems.innerHTML = `<p class="cart-empty">Seu carrinho está vazio. Adicione um burger para começar!</p>`;
    cartFooter.hidden = true;
    return;
  }

  cartFooter.hidden = false;

  cartItems.innerHTML = cart
    .map((line) => {
      const item = getMenuItem(line.id);
      if (!item) return "";

      return `
        <div class="cart-item">
          <span class="cart-item__emoji" aria-hidden="true">${item.emoji}</span>
          <div class="cart-item__info">
            <h4>${item.name}</h4>
            <p>${formatMoney(item.price)} cada</p>
          </div>
          <div class="qty-controls">
            <button class="qty-btn" data-qty-minus="${line.id}" aria-label="Diminuir quantidade">−</button>
            <span>${line.qty}</span>
            <button class="qty-btn" data-qty-plus="${line.id}" aria-label="Aumentar quantidade">+</button>
          </div>
        </div>
      `;
    })
    .join("");

  const subtotal = getSubtotal();
  const fee = getDeliveryFee(orderType);
  const total = subtotal + fee;

  cartSubtotal.textContent = formatMoney(subtotal);

  if (orderType === "delivery") {
    deliveryFeeRow.hidden = false;
    cartDeliveryFee.textContent = fee === 0 ? "Grátis" : formatMoney(fee);
  } else {
    deliveryFeeRow.hidden = true;
  }

  cartTotal.textContent = formatMoney(total);
  checkoutTotal.textContent = formatMoney(total);

  cartItems.querySelectorAll("[data-qty-minus]").forEach((btn) => {
    btn.addEventListener("click", () => updateQty(btn.dataset.qtyMinus, -1));
  });

  cartItems.querySelectorAll("[data-qty-plus]").forEach((btn) => {
    btn.addEventListener("click", () => updateQty(btn.dataset.qtyPlus, 1));
  });
}

function getSelectedOrderType() {
  const selected = document.querySelector('input[name="orderType"]:checked');
  return selected ? selected.value : "delivery";
}

function openCart() {
  cartDrawer.hidden = false;
  cartOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartDrawer.hidden = true;
  cartOverlay.hidden = true;
  document.body.style.overflow = "";
}

function openCheckout() {
  if (cart.length === 0) return;
  closeCart();
  checkoutModal.hidden = false;
  document.body.style.overflow = "hidden";
  updateAddressField();
  renderCart();
}

function closeCheckout() {
  checkoutModal.hidden = true;
  document.body.style.overflow = "";
}

function openSuccess(orderNumber, orderType) {
  successMessage.textContent =
    orderType === "delivery"
      ? "Estamos preparando na chapa. Seu burger já vai sair para entrega!"
      : "Estamos preparando na chapa. Passe aqui para retirar quando estiver pronto!";
  orderIdEl.textContent = `Pedido #${orderNumber}`;
  successModal.hidden = false;
}

function closeSuccess() {
  successModal.hidden = true;
  document.body.style.overflow = "";
}

function updateAddressField() {
  const isDelivery = getSelectedOrderType() === "delivery";
  addressField.hidden = !isDelivery;
  addressField.querySelector("input").required = isDelivery;
}

function generateOrderId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

categoryTabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".category-tab");
  if (!tab) return;

  activeCategory = tab.dataset.category;

  categoryTabs.querySelectorAll(".category-tab").forEach((el) => {
    const isActive = el === tab;
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-selected", String(isActive));
  });

  renderMenu();
});

document.getElementById("openCartBtn").addEventListener("click", openCart);
document.getElementById("closeCartBtn").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);
document.getElementById("checkoutBtn").addEventListener("click", openCheckout);
document.getElementById("closeCheckoutBtn").addEventListener("click", closeCheckout);
document.getElementById("closeCheckoutBackdrop").addEventListener("click", closeCheckout);
document.getElementById("closeSuccessBackdrop").addEventListener("click", closeSuccess);
document.getElementById("successDoneBtn").addEventListener("click", closeSuccess);

checkoutForm.addEventListener("change", (event) => {
  if (event.target.name === "orderType") {
    updateAddressField();
    renderCart();
  }
});

checkoutForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(checkoutForm);
  const orderType = formData.get("orderType");
  const order = {
    id: generateOrderId(),
    createdAt: new Date().toISOString(),
    type: orderType,
    customer: {
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: orderType === "delivery" ? formData.get("address") : null,
      notes: formData.get("notes") || "",
    },
    items: cart.map((line) => {
      const item = getMenuItem(line.id);
      return {
        id: line.id,
        name: item?.name,
        qty: line.qty,
        price: item?.price,
      };
    }),
    subtotal: getSubtotal(),
    deliveryFee: getDeliveryFee(orderType),
    total: getTotal(orderType),
  };

  const orders = JSON.parse(localStorage.getItem("burger-house-orders") || "[]");
  orders.push(order);
  localStorage.setItem("burger-house-orders", JSON.stringify(orders));

  cart = [];
  saveCart();
  renderCart();
  checkoutForm.reset();
  closeCheckout();
  openSuccess(order.id, orderType);
});

renderMenu();
renderCart();

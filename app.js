import { generatePixPayload } from "./lib/pix-core.js";
import { renderPixQrCode } from "./lib/pix-qr.js";
import { createPixPayment, fetchPaymentStatus, notifyRestaurant } from "./lib/payment-client.js";
import {
  getPixHint,
  getSuccessMessage,
  isStaticPaymentMode,
} from "./lib/mercadopago.js";
import {
  isPaymentComplete,
  isPaymentFailed,
  shouldKeepPolling,
} from "./lib/payment-status.js";
import {
  buildOrderItems,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  calculateDeliveryFee,
  calculateSubtotal,
  calculateTotal,
  findMenuItem,
  formatMoney,
  getCartCount as countCartItems,
  validateCheckout,
} from "./lib/order.js";

// Altere para o seu WhatsApp real: DDI + DDD + número, só dígitos (ex.: 5511999999999)
const WHATSAPP_NUMBER = "5522998857007";

// Configuração PIX — use a mesma chave cadastrada no seu banco
const PIX_CONFIG = {
  key: "csb.dev@outlook.com.br",
  merchantName: "Burger House",
  merchantCity: "Rio das Ostras",
};

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
let pendingOrder = null;
let paymentPollTimer = null;
let activePaymentId = null;

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
const pixModal = document.getElementById("pixModal");
const successModal = document.getElementById("successModal");
const checkoutForm = document.getElementById("checkoutForm");
const addressField = document.getElementById("addressField");
const successMessage = document.getElementById("successMessage");
const orderIdEl = document.getElementById("orderId");
const pixAmount = document.getElementById("pixAmount");
const pixCode = document.getElementById("pixCode");
const pixKeyDisplay = document.getElementById("pixKeyDisplay");
const checkoutError = document.getElementById("checkoutError");
const pixQrCode = document.getElementById("pixQrCode");
const pixStatus = document.getElementById("pixStatus");
const pixStatusText = document.getElementById("pixStatusText");
const pixKeyRow = document.getElementById("pixKeyRow");
const pixHint = document.getElementById("pixHint");
const confirmPixBtn = document.getElementById("confirmPixBtn");

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
  return findMenuItem(MENU, id);
}

function getSubtotal() {
  return calculateSubtotal(cart, MENU);
}

function getDeliveryFee(orderType = "delivery") {
  return calculateDeliveryFee(getSubtotal(), orderType, DELIVERY_FEE, FREE_DELIVERY_MIN);
}

function getTotal(orderType = "delivery") {
  return calculateTotal(getSubtotal(), orderType, DELIVERY_FEE, FREE_DELIVERY_MIN);
}

function getCartCount() {
  return countCartItems(cart);
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
  clearCheckoutError();
  checkoutModal.hidden = false;
  document.body.style.overflow = "hidden";
  updateAddressField();
  renderCart();
}

function closeCheckout() {
  checkoutModal.hidden = true;
  if (pixModal.hidden && successModal.hidden) {
    document.body.style.overflow = "";
  }
}

function stopPaymentPolling() {
  if (paymentPollTimer) {
    clearInterval(paymentPollTimer);
    paymentPollTimer = null;
  }
}

function setPixWaiting(isWaiting, message = "Aguardando confirmação do pagamento...") {
  pixStatus.hidden = !isWaiting;
  pixStatusText.textContent = message;
}

function setManualPixFallback(enabled) {
  confirmPixBtn.hidden = !enabled;
  pixKeyRow.hidden = !enabled;
  pixHint.textContent = getPixHint(enabled);
}

function renderPixQrFromProvider({ qrCode, qrCodeBase64 }) {
  pixQrCode.innerHTML = "";

  if (qrCodeBase64) {
    const img = document.createElement("img");
    img.src = `data:image/png;base64,${qrCodeBase64}`;
    img.alt = "QR Code PIX";
    img.width = 220;
    img.height = 220;
    pixQrCode.appendChild(img);
    return;
  }

  if (qrCode) {
    renderPixQrCode(pixQrCode, qrCode);
  }
}

function openStaticPixPayment(order) {
  const payload = generatePixPayload({
    key: PIX_CONFIG.key,
    merchantName: PIX_CONFIG.merchantName,
    merchantCity: PIX_CONFIG.merchantCity,
    amount: order.total,
    txid: order.id,
  });

  pixCode.value = payload;
  pixKeyDisplay.textContent = PIX_CONFIG.key;
  renderPixQrCode(pixQrCode, payload);
  setPixWaiting(false);
  setManualPixFallback(true);
}

async function startPaymentPolling(paymentId) {
  stopPaymentPolling();
  activePaymentId = paymentId;
  setPixWaiting(true);

  const poll = async () => {
    try {
      const result = await fetchPaymentStatus(paymentId);

      if (isPaymentComplete(result.status)) {
        stopPaymentPolling();
        completeOrder(true);
        return;
      }

      if (isPaymentFailed(result.status)) {
        stopPaymentPolling();
        setPixWaiting(true, "Pagamento não concluído. Gere um novo pedido ou tente novamente.");
        setManualPixFallback(true);
        return;
      }

      if (!shouldKeepPolling(result.status)) {
        setPixWaiting(true, "Aguardando atualização do pagamento...");
      }
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
    }
  };

  await poll();
  paymentPollTimer = setInterval(poll, 3000);
}

async function openPixPayment(order) {
  pendingOrder = order;
  activePaymentId = null;

  pixAmount.textContent = formatMoney(order.total);
  pixCode.value = "";
  pixQrCode.innerHTML = "";
  setManualPixFallback(false);
  setPixWaiting(true, "Gerando pagamento PIX...");

  checkoutModal.hidden = true;
  pixModal.hidden = false;
  document.body.style.overflow = "hidden";

  try {
    const result = await createPixPayment(order);

    if (isStaticPaymentMode(result)) {
      openStaticPixPayment(order);
      return;
    }

    pixCode.value = result.qrCode || "";
    pixKeyDisplay.textContent = "Mercado Pago";
    renderPixQrFromProvider(result);
    setManualPixFallback(false);
    await startPaymentPolling(result.paymentId);
  } catch (error) {
    console.error("Erro ao criar pagamento PIX:", error);
    try {
      openStaticPixPayment(order);
      setPixWaiting(false);
    } catch (staticError) {
      console.error("Erro ao gerar PIX estático:", staticError);
      closePix();
      checkoutModal.hidden = false;
      showCheckoutError("Não foi possível gerar o PIX. Tente novamente em instantes.");
    }
  }
}

function showCheckoutError(message) {
  if (!checkoutError) return;
  checkoutError.textContent = message;
  checkoutError.hidden = false;
}

function clearCheckoutError() {
  if (!checkoutError) return;
  checkoutError.textContent = "";
  checkoutError.hidden = true;
}

function closePix() {
  stopPaymentPolling();
  activePaymentId = null;
  pixModal.hidden = true;
  if (checkoutModal.hidden && successModal.hidden) {
    document.body.style.overflow = "";
  }
}

function copyPixCode() {
  pixCode.select();
  pixCode.setSelectionRange(0, pixCode.value.length);
  navigator.clipboard.writeText(pixCode.value).then(() => {
    const btn = document.getElementById("copyPixBtn");
    const original = btn.textContent;
    btn.textContent = "Copiado!";
    setTimeout(() => {
      btn.textContent = original;
    }, 2000);
  });
}

function completeOrder(autoConfirmed = false) {
  if (!pendingOrder) return;

  const order = pendingOrder;
  const paymentId = activePaymentId;

  if (autoConfirmed) {
    notifyRestaurant({ order, paymentId }).catch((error) => {
      console.error("Erro ao notificar restaurante:", error);
      sendOrderToWhatsApp(order);
    });
  } else {
    sendOrderToWhatsApp(order);
  }

  cart = [];
  saveCart();
  renderCart();
  checkoutForm.reset();
  closePix();
  openSuccess(order.id, autoConfirmed);
  pendingOrder = null;
}

function confirmPixPayment() {
  completeOrder(false);
}

function openSuccess(orderNumber, autoConfirmed = false) {
  successMessage.textContent = getSuccessMessage(autoConfirmed);
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

function sendOrderToWhatsApp(order) {
  const message = buildWhatsAppMessage(order);
  const url = buildWhatsAppUrl(WHATSAPP_NUMBER, message);
  window.open(url, "_blank", "noopener,noreferrer");
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
document.getElementById("closePixBtn").addEventListener("click", closePix);
document.getElementById("closePixBackdrop").addEventListener("click", closePix);
document.getElementById("copyPixBtn").addEventListener("click", copyPixCode);
document.getElementById("confirmPixBtn").addEventListener("click", confirmPixPayment);
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
  clearCheckoutError();

  const formData = new FormData(checkoutForm);
  const orderType = formData.get("orderType");
  const validation = validateCheckout({
    name: formData.get("name"),
    phone: formData.get("phone"),
    orderType,
    address: formData.get("address"),
  });

  if (!validation.valid) {
    showCheckoutError(validation.error);
    if (orderType === "delivery") {
      document.querySelector('input[name="address"]')?.focus();
    }
    return;
  }

  const order = {
    id: generateOrderId(),
    createdAt: new Date().toISOString(),
    type: orderType,
    customer: {
      ...validation.customer,
      email: String(formData.get("email") || "").trim() || null,
      notes: formData.get("notes") || "",
    },
    items: buildOrderItems(cart, MENU),
    subtotal: getSubtotal(),
    deliveryFee: getDeliveryFee(orderType),
    total: getTotal(orderType),
  };

  openPixPayment(order);
});

renderMenu();
renderCart();

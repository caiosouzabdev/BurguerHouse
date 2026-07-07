import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrderItems,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  calculateDeliveryFee,
  calculateSubtotal,
  calculateTotal,
  formatMoney,
  getCartCount,
  validateCheckout,
} from "../lib/order.js";

const MENU = [
  { id: "classic-smash", name: "Classic Smash", price: 32.9 },
  { id: "cola", name: "Cola Artesanal", price: 9.9 },
];

describe("order calculations", () => {
  it("formats BRL currency", () => {
    assert.equal(formatMoney(32.9), "R$ 32,90");
    assert.equal(formatMoney(10), "R$ 10,00");
  });

  it("calculates subtotal from cart lines", () => {
    const cart = [
      { id: "classic-smash", qty: 2 },
      { id: "cola", qty: 1 },
    ];

    assert.equal(calculateSubtotal(cart, MENU), 75.7);
  });

  it("counts items in cart", () => {
    const cart = [
      { id: "classic-smash", qty: 2 },
      { id: "cola", qty: 1 },
    ];

    assert.equal(getCartCount(cart), 3);
  });

  it("charges delivery fee below free-delivery minimum", () => {
    assert.equal(calculateDeliveryFee(20, "delivery"), 3.99);
  });

  it("waives delivery fee above free-delivery minimum", () => {
    assert.equal(calculateDeliveryFee(30, "delivery"), 0);
  });

  it("does not charge delivery fee for pickup", () => {
    assert.equal(calculateDeliveryFee(10, "pickup"), 0);
  });

  it("calculates order total", () => {
    assert.ok(Math.abs(calculateTotal(20, "delivery", 3.99, 25) - 23.99) < 0.001);
    assert.equal(calculateTotal(30, "delivery", 3.99, 25), 30);
    assert.equal(calculateTotal(30, "pickup", 3.99, 25), 30);
  });
});

describe("checkout validation", () => {
  it("requires name and phone", () => {
    const result = validateCheckout({
      name: "",
      phone: "",
      orderType: "pickup",
      address: "",
    });

    assert.equal(result.valid, false);
    assert.match(result.error, /nome e telefone/i);
  });

  it("requires address for delivery", () => {
    const result = validateCheckout({
      name: "Maria",
      phone: "22999999999",
      orderType: "delivery",
      address: "",
    });

    assert.equal(result.valid, false);
    assert.match(result.error, /endereço/i);
  });

  it("accepts pickup without address", () => {
    const result = validateCheckout({
      name: "Maria",
      phone: "22999999999",
      orderType: "pickup",
      address: "",
    });

    assert.equal(result.valid, true);
    assert.equal(result.customer.address, null);
  });
});

describe("WhatsApp order message", () => {
  it("builds order items from cart", () => {
    const items = buildOrderItems([{ id: "classic-smash", qty: 1 }], MENU);

    assert.deepEqual(items, [
      {
        id: "classic-smash",
        name: "Classic Smash",
        qty: 1,
        price: 32.9,
      },
    ]);
  });

  it("includes customer and payment details", () => {
    const message = buildWhatsAppMessage({
      id: "ABC123",
      type: "delivery",
      customer: {
        name: "Maria Silva",
        phone: "22999999999",
        address: "Rua A, 10",
        notes: "Sem cebola",
      },
      items: [{ qty: 1, name: "Classic Smash", price: 32.9 }],
      subtotal: 32.9,
      deliveryFee: 3.99,
      total: 36.89,
    });

    assert.match(message, /Maria Silva/);
    assert.match(message, /Rua A, 10/);
    assert.match(message, /PIX/);
    assert.match(message, /Sem cebola/);
    assert.match(message, /Pedido #ABC123/);
  });

  it("builds WhatsApp URL with encoded message", () => {
    const url = buildWhatsAppUrl("5522998857007", "Pedido teste");

    assert.equal(url, "https://wa.me/5522998857007?text=Pedido%20teste");
  });
});

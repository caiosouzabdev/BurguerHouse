import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCallMeBotUrl,
  buildOrderMetadata,
  buildRestaurantNotificationMessage,
  canNotifyRestaurant,
  formatWhatsAppPhone,
  notifyRestaurantOwner,
  parseOrderFromMetadata,
} from "../lib/restaurant-notification.js";

const sampleOrder = {
  id: "ABC123",
  type: "delivery",
  customer: {
    name: "Maria Silva",
    phone: "22999887766",
    address: "Rua A, 10",
    notes: "Sem cebola",
  },
  items: [
    { qty: 2, name: "Classic Smash", price: 32.9 },
    { qty: 1, name: "Cola Artesanal", price: 9.9 },
  ],
  subtotal: 75.7,
  deliveryFee: 3.99,
  total: 79.69,
};

describe("restaurant notification", () => {
  it("builds compact metadata for Mercado Pago", () => {
    const metadata = buildOrderMetadata(sampleOrder);

    assert.equal(metadata.order_id, "ABC123");
    assert.equal(metadata.items_summary, "2x Classic Smash; 1x Cola Artesanal");
    assert.equal(metadata.total, "79.69");
  });

  it("restores order data from payment metadata", () => {
    const metadata = buildOrderMetadata(sampleOrder);
    const restored = parseOrderFromMetadata(metadata, { transaction_amount: 79.69 });

    assert.equal(restored.id, "ABC123");
    assert.equal(restored.customer.name, "Maria Silva");
    assert.equal(restored.items.length, 2);
    assert.equal(restored.total, 79.69);
  });

  it("formats WhatsApp phone numbers for CallMeBot", () => {
    assert.equal(formatWhatsAppPhone("5522998857007"), "+5522998857007");
  });

  it("builds CallMeBot request URL", () => {
    const url = buildCallMeBotUrl("5522998857007", "Novo pedido", "secret");

    assert.match(url, /api\.callmebot\.com\/whatsapp\.php/);
    assert.match(url, /phone=%2B5522998857007/);
    assert.match(url, /apikey=secret/);
  });

  it("builds restaurant alert message with confirmed payment", () => {
    const message = buildRestaurantNotificationMessage(sampleOrder);

    assert.match(message, /Pagamento PIX confirmado automaticamente/i);
    assert.match(message, /Maria Silva/);
    assert.match(message, /2x Classic Smash/);
  });

  it("detects whether notification can be sent", () => {
    assert.equal(
      canNotifyRestaurant({ restaurantPhone: "5522", callMeBotApiKey: "abc" }),
      true
    );
    assert.equal(canNotifyRestaurant({ restaurantPhone: "", callMeBotApiKey: "abc" }), false);
  });

  it("sends WhatsApp notification when payment is approved", async () => {
    const calls = [];

    const fetchImpl = async (url, options = {}) => {
      calls.push({ url, options });

      if (url.includes("mercadopago.com")) {
        return {
          ok: true,
          json: async () => ({
            id: 999,
            status: "approved",
            metadata: buildOrderMetadata(sampleOrder),
            transaction_amount: 79.69,
          }),
        };
      }

      return {
        ok: true,
        text: async () => "Message sent",
      };
    };

    const result = await notifyRestaurantOwner(
      {
        paymentId: "999",
        accessToken: "mp-token",
        restaurantPhone: "5522998857007",
        callMeBotApiKey: "bot-key",
      },
      fetchImpl
    );

    assert.equal(result.sent, true);
    assert.equal(result.orderId, "ABC123");
    assert.equal(calls.length, 2);
    assert.match(calls[1].url, /callmebot\.com/);
  });

  it("does not notify when payment is still pending", async () => {
    const fetchImpl = async (url) => {
      if (url.includes("mercadopago.com")) {
        return {
          ok: true,
          json: async () => ({ id: 999, status: "pending", metadata: {} }),
        };
      }

      throw new Error("Should not call CallMeBot");
    };

    const result = await notifyRestaurantOwner(
      {
        paymentId: "999",
        accessToken: "mp-token",
        restaurantPhone: "5522998857007",
        callMeBotApiKey: "bot-key",
      },
      fetchImpl
    );

    assert.equal(result.sent, false);
    assert.equal(result.reason, "payment_not_approved");
  });
});

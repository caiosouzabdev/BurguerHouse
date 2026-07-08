import { buildWhatsAppMessage } from "./order.js";
import { isPaymentComplete } from "./payment-status.js";

export function buildOrderMetadata(order) {
  return {
    order_id: order.id,
    customer_name: order.customer.name || "",
    customer_phone: order.customer.phone || "",
    customer_address: order.customer.address || "",
    customer_notes: order.customer.notes || "",
    order_type: order.type || "",
    items_summary: (order.items || []).map((item) => `${item.qty}x ${item.name}`).join("; "),
    subtotal: String(order.subtotal),
    delivery_fee: String(order.deliveryFee ?? 0),
    total: String(order.total),
  };
}

export function parseOrderFromMetadata(metadata, payment = {}) {
  if (!metadata?.order_id) {
    return null;
  }

  const items = String(metadata.items_summary || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(\d+)x\s+(.+)$/);
      if (!match) {
        return { qty: 1, name: entry, price: 0 };
      }

      return {
        qty: Number(match[1]),
        name: match[2],
        price: 0,
      };
    });

  return {
    id: metadata.order_id,
    type: metadata.order_type || "delivery",
    customer: {
      name: metadata.customer_name || "",
      phone: metadata.customer_phone || "",
      address: metadata.customer_address || null,
      notes: metadata.customer_notes || "",
    },
    items,
    subtotal: Number(metadata.subtotal || payment.transaction_amount || 0),
    deliveryFee: Number(metadata.delivery_fee || 0),
    total: Number(metadata.total || payment.transaction_amount || 0),
  };
}

export function buildRestaurantNotificationMessage(order, restaurantName = "Burger House") {
  return buildWhatsAppMessage(order, restaurantName, { paymentConfirmed: true });
}

export function formatWhatsAppPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function buildCallMeBotUrl(phone, message, apiKey) {
  const params = new URLSearchParams({
    phone: formatWhatsAppPhone(phone),
    text: message,
    apikey: apiKey,
  });

  return `https://api.callmebot.com/whatsapp.php?${params.toString()}`;
}

export async function sendCallMeBotMessage(
  { phone, message, apiKey },
  fetchImpl = fetch
) {
  const response = await fetchImpl(buildCallMeBotUrl(phone, message, apiKey));

  if (!response.ok) {
    throw new Error("CallMeBot request failed");
  }

  const body = await response.text();
  if (/error/i.test(body)) {
    throw new Error(body);
  }

  return body;
}

export async function fetchMercadoPagoPayment(paymentId, accessToken, fetchImpl = fetch) {
  const response = await fetchImpl(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const payment = await response.json();
  if (!response.ok) {
    throw new Error(payment.message || "Unable to fetch Mercado Pago payment");
  }

  return payment;
}

export function canNotifyRestaurant({ restaurantPhone, callMeBotApiKey }) {
  return Boolean(restaurantPhone && callMeBotApiKey);
}

export async function notifyRestaurantOwner(
  {
    order = null,
    paymentId = null,
    accessToken = null,
    restaurantPhone,
    callMeBotApiKey,
  },
  fetchImpl = fetch
) {
  if (!canNotifyRestaurant({ restaurantPhone, callMeBotApiKey })) {
    return { sent: false, reason: "not_configured" };
  }

  let resolvedOrder = order;

  if (paymentId && accessToken) {
    const payment = await fetchMercadoPagoPayment(paymentId, accessToken, fetchImpl);

    if (!isPaymentComplete(payment.status)) {
      return { sent: false, reason: "payment_not_approved", status: payment.status };
    }

    if (!resolvedOrder) {
      resolvedOrder = parseOrderFromMetadata(payment.metadata || {}, payment);
    }
  }

  if (!resolvedOrder) {
    return { sent: false, reason: "missing_order" };
  }

  const message = buildRestaurantNotificationMessage(resolvedOrder);
  await sendCallMeBotMessage(
    {
      phone: restaurantPhone,
      message,
      apiKey: callMeBotApiKey,
    },
    fetchImpl
  );

  return { sent: true, orderId: resolvedOrder.id };
}

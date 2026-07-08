export const DEFAULT_DELIVERY_FEE = 3.99;
export const DEFAULT_FREE_DELIVERY_MIN = 25;

export function formatMoney(amount) {
  const formatted = Number(amount).toFixed(2).replace(".", ",");
  return `R$ ${formatted}`;
}

export function findMenuItem(menu, id) {
  return menu.find((item) => item.id === id);
}

export function calculateSubtotal(cart, menu) {
  return cart.reduce((sum, line) => {
    const item = findMenuItem(menu, line.id);
    return sum + (item ? item.price * line.qty : 0);
  }, 0);
}

export function calculateDeliveryFee(
  subtotal,
  orderType,
  deliveryFee = DEFAULT_DELIVERY_FEE,
  freeDeliveryMin = DEFAULT_FREE_DELIVERY_MIN
) {
  if (orderType === "pickup") return 0;
  return subtotal >= freeDeliveryMin ? 0 : deliveryFee;
}

export function calculateTotal(subtotal, orderType, deliveryFee, freeDeliveryMin) {
  return subtotal + calculateDeliveryFee(subtotal, orderType, deliveryFee, freeDeliveryMin);
}

export function getCartCount(cart) {
  return cart.reduce((sum, line) => sum + line.qty, 0);
}

export function validateCheckout({ name, phone, orderType, address }) {
  const trimmedName = String(name || "").trim();
  const trimmedPhone = String(phone || "").trim();
  const trimmedAddress = String(address || "").trim();

  if (!trimmedName || !trimmedPhone) {
    return {
      valid: false,
      error: "Preencha nome e telefone para continuar.",
    };
  }

  if (orderType === "delivery" && !trimmedAddress) {
    return {
      valid: false,
      error: "Informe o endereço de entrega para continuar.",
    };
  }

  return {
    valid: true,
    customer: {
      name: trimmedName,
      phone: trimmedPhone,
      address: orderType === "delivery" ? trimmedAddress : null,
    },
  };
}

export function buildOrderItems(cart, menu) {
  return cart.map((line) => {
    const item = findMenuItem(menu, line.id);
    return {
      id: line.id,
      name: item?.name,
      qty: line.qty,
      price: item?.price,
    };
  });
}

export function buildWhatsAppMessage(
  order,
  restaurantName = "Burger House",
  options = {}
) {
  const typeLabel = order.type === "delivery" ? "Entrega" : "Retirada";
  const itemsText = order.items
    .map((line) => `${line.qty}x ${line.name} — ${formatMoney(line.price * line.qty)}`)
    .join("\n");

  const lines = [
    `🍔 *NOVO PEDIDO — ${restaurantName}*`,
    `Pedido #${order.id}`,
    "",
    `*Cliente:* ${order.customer.name}`,
    `*Telefone:* ${order.customer.phone}`,
    `*Tipo:* ${typeLabel}`,
  ];

  if (order.customer.address) {
    lines.push(`*Endereço:* ${order.customer.address}`);
  }

  lines.push(
    "",
    "*Itens:*",
    itemsText,
    "",
    `*Subtotal:* ${formatMoney(order.subtotal)}`
  );

  if (order.type === "delivery") {
    const feeLabel =
      order.deliveryFee === 0 ? "Grátis" : formatMoney(order.deliveryFee);
    lines.push(`*Taxa de entrega:* ${feeLabel}`);
  }

  lines.push(`*Total:* ${formatMoney(order.total)}`, "", "*Pagamento:* PIX");

  if (order.customer.notes) {
    lines.push("", `*Observações:* ${order.customer.notes}`);
  }

  if (options.paymentConfirmed) {
    lines.push("", "✅ *Pagamento PIX confirmado automaticamente.*");
  } else {
    lines.push("", "Enviei o comprovante do PIX em anexo.");
  }

  return lines.join("\n");
}

export function buildWhatsAppUrl(phoneNumber, message) {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

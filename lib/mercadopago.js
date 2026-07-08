import { buildOrderMetadata } from "./restaurant-notification.js";

export function splitPayerName(fullName) {
  const parts = String(fullName || "Cliente").trim().split(/\s+/);
  return {
    firstName: parts[0] || "Cliente",
    lastName: parts.slice(1).join(" ") || "Burger House",
  };
}

export function buildPayerEmail(order) {
  if (order.customer?.email) {
    return order.customer.email;
  }

  const digits = String(order.customer?.phone || order.id).replace(/\D/g, "");
  return `pedido.${digits || order.id}@burgerhouse.app`;
}

export function validatePaymentOrder(order) {
  if (!order || typeof order !== "object") {
    return { valid: false, error: "Missing order data" };
  }

  if (!order.id || order.total == null || !order.customer?.name) {
    return { valid: false, error: "Missing order data" };
  }

  if (Number.isNaN(Number(order.total)) || Number(order.total) <= 0) {
    return { valid: false, error: "Invalid order total" };
  }

  return { valid: true };
}

export function buildMercadoPagoPixPayload(order, siteUrl) {
  const { firstName, lastName } = splitPayerName(order.customer.name);

  return {
    transaction_amount: Number(order.total),
    description: `Pedido Burger House #${order.id}`,
    payment_method_id: "pix",
    external_reference: order.id,
    payer: {
      email: buildPayerEmail(order),
      first_name: firstName,
      last_name: lastName,
    },
    notification_url: `${siteUrl}/.netlify/functions/mercadopago-webhook`,
    metadata: buildOrderMetadata(order),
  };
}

export function mapMercadoPagoCreateResponse(payment) {
  const transaction = payment.point_of_interaction?.transaction_data || {};

  return {
    mode: "mercadopago",
    paymentId: payment.id,
    status: payment.status,
    qrCode: transaction.qr_code || "",
    qrCodeBase64: transaction.qr_code_base64 || "",
  };
}

export function mapMercadoPagoStatusResponse(payment) {
  return {
    paymentId: payment.id,
    status: payment.status,
    statusDetail: payment.status_detail,
    externalReference: payment.external_reference,
  };
}

export function shouldUseStaticPayment(accessToken) {
  return !accessToken;
}

export function isStaticPaymentMode(result) {
  return result?.mode === "static" || !result?.paymentId;
}

export function getPixWaitingMessage({ loading = false, failed = false } = {}) {
  if (loading) return "Gerando pagamento PIX...";
  if (failed) return "Pagamento não concluído. Gere um novo pedido ou tente novamente.";
  return "Aguardando confirmação do pagamento...";
}

export function getPixHint(manualFallback) {
  return manualFallback
    ? "Após pagar, toque no botão abaixo para enviar o pedido pelo WhatsApp."
    : "Após pagar, o pedido será confirmado automaticamente.";
}

export function getSuccessMessage(autoConfirmed) {
  return autoConfirmed
    ? "Pagamento confirmado! O restaurante já foi avisado no WhatsApp e seu pedido está sendo preparado."
    : "Confirme o envio no WhatsApp e anexe o comprovante do PIX. Em seguida começamos a preparar seu pedido!";
}

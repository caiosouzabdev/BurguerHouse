import {
  buildMercadoPagoPixPayload,
  buildPayerEmail,
  mapMercadoPagoCreateResponse,
  mapMercadoPagoStatusResponse,
  shouldUseStaticPayment,
  splitPayerName,
  validatePaymentOrder,
} from "../../lib/mercadopago.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { message: "Method not allowed" });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (shouldUseStaticPayment(accessToken)) {
    return jsonResponse(200, { mode: "static" });
  }

  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { message: "Invalid order payload" });
  }

  const validation = validatePaymentOrder(order);
  if (!validation.valid) {
    return jsonResponse(400, { message: validation.error });
  }

  const siteUrl = process.env.URL || "https://leafy-bavarois-93c63e.netlify.app";
  const paymentPayload = buildMercadoPagoPixPayload(order, siteUrl);

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": order.id,
    },
    body: JSON.stringify(paymentPayload),
  });

  const payment = await response.json();
  if (!response.ok) {
    return jsonResponse(500, {
      message: payment.message || "Mercado Pago payment creation failed",
      details: payment,
    });
  }

  return jsonResponse(200, mapMercadoPagoCreateResponse(payment));
}

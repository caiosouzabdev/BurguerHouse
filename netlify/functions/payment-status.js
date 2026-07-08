import { mapMercadoPagoStatusResponse, shouldUseStaticPayment } from "../../lib/mercadopago.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { message: "Method not allowed" });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (shouldUseStaticPayment(accessToken)) {
    return jsonResponse(503, { message: "Payment provider not configured" });
  }

  const paymentId = event.queryStringParameters?.id;
  if (!paymentId) {
    return jsonResponse(400, { message: "Missing payment id" });
  }

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const payment = await response.json();
  if (!response.ok) {
    return jsonResponse(500, {
      message: payment.message || "Unable to fetch payment status",
    });
  }

  return jsonResponse(200, mapMercadoPagoStatusResponse(payment));
}

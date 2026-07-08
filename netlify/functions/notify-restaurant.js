import { notifyRestaurantOwner } from "../../lib/restaurant-notification.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { message: "Invalid payload" });
  }

  const result = await notifyRestaurantOwner({
    order: payload.order || null,
    paymentId: payload.paymentId || null,
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || null,
    restaurantPhone:
      process.env.RESTAURANT_WHATSAPP_NUMBER ||
      process.env.WHATSAPP_NOTIFY_NUMBER ||
      "",
    callMeBotApiKey: process.env.CALLMEBOT_API_KEY || "",
  });

  if (!result.sent) {
    return jsonResponse(result.reason === "not_configured" ? 503 : 409, result);
  }

  return jsonResponse(200, result);
}

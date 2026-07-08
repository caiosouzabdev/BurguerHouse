exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid payload" };
  }

  const paymentId = payload?.data?.id || payload?.id;
  const action = payload?.action || payload?.type;

  console.log("Mercado Pago webhook received", {
    action,
    paymentId,
    liveMode: payload?.live_mode,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};

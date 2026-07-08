export const API_BASE = "/api";

export function getCreatePixPaymentEndpoint(base = API_BASE) {
  return `${base}/create-pix-payment`;
}

export function getPaymentStatusEndpoint(paymentId, base = API_BASE) {
  return `${base}/payment-status?id=${encodeURIComponent(paymentId)}`;
}

export async function readApiError(response, fallbackMessage) {
  const error = await response.json().catch(() => ({}));
  return new Error(error.message || fallbackMessage);
}

export async function createPixPayment(order, fetchImpl = fetch, base = API_BASE) {
  const response = await fetchImpl(getCreatePixPaymentEndpoint(base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    throw await readApiError(response, "Não foi possível criar o pagamento PIX.");
  }

  return response.json();
}

export async function fetchPaymentStatus(paymentId, fetchImpl = fetch, base = API_BASE) {
  const response = await fetchImpl(getPaymentStatusEndpoint(paymentId, base));

  if (!response.ok) {
    throw await readApiError(response, "Não foi possível verificar o pagamento.");
  }

  return response.json();
}

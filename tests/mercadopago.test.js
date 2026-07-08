import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMercadoPagoPixPayload,
  buildPayerEmail,
  getPixHint,
  getPixWaitingMessage,
  getSuccessMessage,
  isStaticPaymentMode,
  mapMercadoPagoCreateResponse,
  mapMercadoPagoStatusResponse,
  shouldUseStaticPayment,
  splitPayerName,
  validatePaymentOrder,
} from "../lib/mercadopago.js";

const sampleOrder = {
  id: "ABC123",
  type: "delivery",
  total: 36.89,
  customer: {
    name: "Maria Silva",
    phone: "22999887766",
    email: null,
  },
};

describe("Mercado Pago order helpers", () => {
  it("splits payer full name into first and last name", () => {
    assert.deepEqual(splitPayerName("Maria Silva Souza"), {
      firstName: "Maria",
      lastName: "Silva Souza",
    });
  });

  it("uses defaults when payer name is empty", () => {
    assert.deepEqual(splitPayerName(""), {
      firstName: "Cliente",
      lastName: "Burger House",
    });
  });

  it("builds payer email from customer email when provided", () => {
    const email = buildPayerEmail({
      id: "ABC123",
      customer: { email: "maria@email.com", phone: "22999887766" },
    });

    assert.equal(email, "maria@email.com");
  });

  it("builds fallback payer email from phone digits", () => {
    const email = buildPayerEmail(sampleOrder);
    assert.equal(email, "pedido.22999887766@burgerhouse.app");
  });

  it("validates required payment order fields", () => {
    assert.equal(validatePaymentOrder(sampleOrder).valid, true);
    assert.equal(validatePaymentOrder({ id: "X", total: 10 }).valid, false);
    assert.equal(validatePaymentOrder({ ...sampleOrder, total: 0 }).valid, false);
    assert.equal(validatePaymentOrder(null).valid, false);
  });

  it("builds Mercado Pago PIX payload", () => {
    const payload = buildMercadoPagoPixPayload(sampleOrder, "https://example.com");

    assert.equal(payload.transaction_amount, 36.89);
    assert.equal(payload.payment_method_id, "pix");
    assert.equal(payload.external_reference, "ABC123");
    assert.equal(payload.payer.first_name, "Maria");
    assert.equal(payload.payer.last_name, "Silva");
    assert.equal(
      payload.notification_url,
      "https://example.com/.netlify/functions/mercadopago-webhook"
    );
    assert.equal(payload.metadata.order_id, "ABC123");
  });

  it("maps Mercado Pago create response", () => {
    const mapped = mapMercadoPagoCreateResponse({
      id: 999,
      status: "pending",
      point_of_interaction: {
        transaction_data: {
          qr_code: "PIXCODE",
          qr_code_base64: "BASE64",
        },
      },
    });

    assert.deepEqual(mapped, {
      mode: "mercadopago",
      paymentId: 999,
      status: "pending",
      qrCode: "PIXCODE",
      qrCodeBase64: "BASE64",
    });
  });

  it("maps Mercado Pago status response", () => {
    const mapped = mapMercadoPagoStatusResponse({
      id: 999,
      status: "approved",
      status_detail: "accredited",
      external_reference: "ABC123",
    });

    assert.deepEqual(mapped, {
      paymentId: 999,
      status: "approved",
      statusDetail: "accredited",
      externalReference: "ABC123",
    });
  });

  it("detects static payment mode", () => {
    assert.equal(shouldUseStaticPayment(""), true);
    assert.equal(shouldUseStaticPayment("token"), false);
    assert.equal(isStaticPaymentMode({ mode: "static" }), true);
    assert.equal(isStaticPaymentMode({ mode: "mercadopago", paymentId: 1 }), false);
  });

  it("returns UI messages for payment flow", () => {
    assert.match(getPixWaitingMessage({ loading: true }), /Gerando/);
    assert.match(getPixWaitingMessage({ failed: true }), /não concluído/i);
    assert.match(getSuccessMessage(true), /automaticamente/i);
    assert.match(getPixHint(true), /WhatsApp/);
    assert.match(getPixHint(false), /automaticamente/i);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createPixPayment,
  fetchPaymentStatus,
  getCreatePixPaymentEndpoint,
  getPaymentStatusEndpoint,
} from "../lib/payment-client.js";

describe("payment client", () => {
  it("builds API endpoints", () => {
    assert.equal(getCreatePixPaymentEndpoint(), "/api/create-pix-payment");
    assert.equal(
      getPaymentStatusEndpoint("pay 123"),
      "/api/payment-status?id=pay%20123"
    );
  });

  it("creates PIX payment via API", async () => {
    const order = { id: "ABC123", total: 10, customer: { name: "Maria" } };
    const mockResponse = {
      ok: true,
      json: async () => ({ mode: "mercadopago", paymentId: 1, status: "pending" }),
    };

    const fetchImpl = async (url, options) => {
      assert.equal(url, "/api/create-pix-payment");
      assert.equal(options.method, "POST");
      assert.equal(options.headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(options.body), order);
      return mockResponse;
    };

    const result = await createPixPayment(order, fetchImpl);
    assert.equal(result.paymentId, 1);
  });

  it("throws when PIX payment creation fails", async () => {
    const fetchImpl = async () => ({
      ok: false,
      json: async () => ({ message: "Provider unavailable" }),
    });

    await assert.rejects(
      () => createPixPayment({ id: "1" }, fetchImpl),
      /Provider unavailable/
    );
  });

  it("fetches payment status via API", async () => {
    const fetchImpl = async (url) => {
      assert.equal(url, "/api/payment-status?id=12345");
      return {
        ok: true,
        json: async () => ({ paymentId: 12345, status: "approved" }),
      };
    };

    const result = await fetchPaymentStatus("12345", fetchImpl);
    assert.equal(result.status, "approved");
  });

  it("throws when payment status check fails", async () => {
    const fetchImpl = async () => ({
      ok: false,
      json: async () => ({ message: "Not found" }),
    });

    await assert.rejects(
      () => fetchPaymentStatus("999", fetchImpl),
      /Not found/
    );
  });
});

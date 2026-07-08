import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPaymentComplete,
  isPaymentFailed,
  shouldKeepPolling,
} from "../lib/payment-status.js";

describe("payment status", () => {
  it("detects completed payments", () => {
    assert.equal(isPaymentComplete("approved"), true);
    assert.equal(isPaymentComplete("pending"), false);
  });

  it("detects failed payments", () => {
    assert.equal(isPaymentFailed("rejected"), true);
    assert.equal(isPaymentFailed("cancelled"), true);
    assert.equal(isPaymentFailed("pending"), false);
  });

  it("keeps polling only while payment is unresolved", () => {
    assert.equal(shouldKeepPolling("pending"), true);
    assert.equal(shouldKeepPolling("in_process"), true);
    assert.equal(shouldKeepPolling("approved"), false);
    assert.equal(shouldKeepPolling("rejected"), false);
  });
});

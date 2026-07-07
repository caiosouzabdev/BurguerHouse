import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  crc16,
  formatPixKey,
  generatePixPayload,
  isValidPixPayload,
  sanitizePixText,
  tlv,
} from "../lib/pix-core.js";

describe("PIX core", () => {
  it("builds TLV fields with padded length", () => {
    assert.equal(tlv("00", "01"), "000201");
    assert.equal(tlv("01", "test@email.com"), "0114test@email.com");
  });

  it("sanitizes merchant text for PIX payload", () => {
    assert.equal(sanitizePixText("Rio das Ostras", 15), "RIO DAS OSTRAS");
    assert.equal(sanitizePixText("São Paulo", 15), "SAO PAULO");
  });

  it("formats phone PIX keys with country code", () => {
    assert.equal(formatPixKey("5522998857007"), "+5522998857007");
    assert.equal(formatPixKey("csb.dev@outlook.com.br"), "csb.dev@outlook.com.br");
  });

  it("generates a 4-character CRC16 checksum", () => {
    const checksum = crc16("0002010102126304");
    assert.match(checksum, /^[0-9A-F]{4}$/);
    assert.equal(crc16("0002010102126304"), checksum);
  });

  it("generates a valid PIX payload for email key", () => {
    const payload = generatePixPayload({
      key: "csb.dev@outlook.com.br",
      merchantName: "Burger House",
      merchantCity: "Rio das Ostras",
      amount: 36.89,
      txid: "ABC123",
    });

    assert.ok(payload.startsWith("000201"));
    assert.match(payload, /540536\.89/);
    assert.ok(payload.includes("csb.dev@outlook.com.br"));
    assert.ok(isValidPixPayload(payload));
  });

  it("generates a valid PIX payload for phone key", () => {
    const payload = generatePixPayload({
      key: "5522998857007",
      merchantName: "Burger House",
      merchantCity: "Campos",
      amount: 32.9,
      txid: "ORDER1",
    });

    assert.ok(payload.includes("+5522998857007"));
    assert.ok(isValidPixPayload(payload));
  });

  it("rejects payloads with invalid checksum", () => {
    const payload = generatePixPayload({
      key: "test@example.com",
      merchantName: "Burger House",
      merchantCity: "SP",
      amount: 10,
      txid: "X1",
    });

    assert.equal(isValidPixPayload(`${payload.slice(0, -1)}0`), false);
  });
});

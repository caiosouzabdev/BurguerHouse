function tlv(id, value) {
  const length = String(value.length).padStart(2, "0");
  return `${id}${length}${value}`;
}

function crc16(payload) {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitizePixText(value, maxLength) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, maxLength)
    .toUpperCase();
}

function formatPixKey(key) {
  const digitsOnly = key.replace(/\D/g, "");
  if (digitsOnly.length >= 12 && digitsOnly.startsWith("55")) {
    return `+${digitsOnly}`;
  }
  return key.trim();
}

function generatePixPayload({ key, merchantName, merchantCity, amount, txid }) {
  const merchantAccount =
    tlv("00", "br.gov.bcb.pix") + tlv("01", formatPixKey(key));

  const payloadWithoutCrc = [
    tlv("00", "01"),
    tlv("26", merchantAccount),
    tlv("52", "0000"),
    tlv("53", "986"),
    tlv("54", amount.toFixed(2)),
    tlv("58", "BR"),
    tlv("59", sanitizePixText(merchantName, 25)),
    tlv("60", sanitizePixText(merchantCity, 15)),
    tlv("62", tlv("05", txid.slice(0, 25))),
  ].join("");

  const payloadWithCrcField = `${payloadWithoutCrc}6304`;
  return `${payloadWithCrcField}${crc16(payloadWithCrcField)}`;
}

window.generatePixPayload = generatePixPayload;

function renderPixQrCode(container, payload) {
  if (!container) return;

  container.innerHTML = "";

  try {
    if (typeof qrcode === "function") {
      const qr = qrcode(0, "M");
      qr.addData(payload);
      qr.make();
      container.innerHTML = qr.createImgTag(5, 8);
      return;
    }
  } catch (error) {
    console.error("Erro ao gerar QR Code PIX:", error);
  }

  const img = document.createElement("img");
  img.src = `https://quickchart.io/qr?size=220&margin=1&text=${encodeURIComponent(payload)}`;
  img.alt = "QR Code PIX";
  img.width = 220;
  img.height = 220;
  container.appendChild(img);
}

window.renderPixQrCode = renderPixQrCode;

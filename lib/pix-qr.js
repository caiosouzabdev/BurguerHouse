export function renderPixQrCode(container, payload) {
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

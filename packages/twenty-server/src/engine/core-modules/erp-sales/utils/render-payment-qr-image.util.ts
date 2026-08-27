import QRCode from 'qrcode';

// Task 7 (Фаза 9): печать Счёта — статический СБП-QR (ГОСТ Р 56042-2014).
// Печать серверная (REST HTML-эндпоинт, никакого React/DOM в рантайме), а
// платформенный QR-контур (2FA, two-factor-authentication.service.ts) рендерит
// изображение только на фронте через `react-qr-code` — server-side otplib
// строит лишь текстовую otpauth:// строку, без картинки, реюзать нечего.
// `qrcode` — маленькая, широко используемая npm-зависимость без нативных
// бинарников (PNG-рендер через `pngjs`, уже её транзитивная зависимость),
// добавлена в twenty-server намеренно ради этой задачи (см. отчёт Task 7).
const QR_IMAGE_WIDTH_PX = 300;

export const renderPaymentQrDataUri = (payload: string): Promise<string> => {
  return QRCode.toDataURL(payload, {
    width: QR_IMAGE_WIDTH_PX,
    margin: 1,
  });
};

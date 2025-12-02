import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * 產生 QRCode 的 Data URL
 */
export async function generateQRCodeDataURL(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    width = 256,
    margin = 2,
    color = { dark: '#000000', light: '#ffffff' },
  } = options;

  return QRCode.toDataURL(data, {
    width,
    margin,
    color,
    errorCorrectionLevel: 'M',
  });
}

/**
 * 產生 QRCode 的 SVG 字串
 */
export async function generateQRCodeSVG(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    width = 256,
    margin = 2,
    color = { dark: '#000000', light: '#ffffff' },
  } = options;

  return QRCode.toString(data, {
    type: 'svg',
    width,
    margin,
    color,
    errorCorrectionLevel: 'M',
  });
}

/**
 * 產生房間加入 URL
 */
export function generateRoomJoinURL(roomCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/join/${roomCode}`;
}

/**
 * 從 URL 中解析房間代碼
 */
export function parseRoomCodeFromURL(url: string): string | null {
  const match = url.match(/\/join\/([A-Z0-9]{6})/i);
  return match ? match[1].toUpperCase() : null;
}


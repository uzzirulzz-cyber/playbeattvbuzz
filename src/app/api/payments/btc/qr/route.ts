import QRCode from 'qrcode';

// Public QR generator for the BTC payment page (address is public by design).
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const text = (url.searchParams.get('text') || '').slice(0, 220);
    if (!text) return new Response('missing text', { status: 400 });
    const svg = await QRCode.toString(text, {
      type: 'svg',
      margin: 1,
      width: 220,
      color: { dark: '#0b0b10', light: '#ffffff' },
    });
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return new Response('qr generation failed', { status: 500 });
  }
}

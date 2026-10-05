import { db } from '@/lib/db';
import { jsonErr, jsonOk } from '@/lib/auth';

/**
 * Public Bitcoin payment configuration.
 * The address is intentionally PUBLIC — it is the operator's collection address
 * shown on the checkout / payment page. No other payment secrets live here.
 */
export async function GET() {
  try {
    const [addr, instructions] = await Promise.all([
      db.setting.findUnique({ where: { key: 'btc_address' } }),
      db.setting.findUnique({ where: { key: 'payment_instructions' } }),
    ]);
    let address = addr?.value || '';
    try {
      if (address && address.startsWith('{')) address = (JSON.parse(address).address as string) || '';
    } catch { /* raw value */ }
    let note = '';
    try {
      if (instructions?.value && instructions.value.startsWith('{')) note = (JSON.parse(instructions.value).note as string) || '';
    } catch { /* raw value */ }
    return jsonOk({
      address,
      network: 'Bitcoin (BTC)',
      currency: 'USD',
      note,
    });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Remove QA test users (@test.pb / @test.pb emails) and all their artifacts. */
import { initDb, db } from '../src/lib/db';

async function main() {
  await initDb();
  const users = await db.user.findMany({
    where: { email: { contains: '@test.pb' } },
    select: { id: true, email: true },
  });
  console.log(`removing ${users.length} QA users…`);
  for (const u of users) {
    const orders = await db.order.findMany({ where: { userId: u.id }, select: { id: true } });
    for (const o of orders) {
      await db.payment.deleteMany({ where: { orderId: o.id } });
      await db.invoice.deleteMany({ where: { orderId: o.id } });
    }
    await db.iptvLine.deleteMany({ where: { userId: u.id } });
    await db.subscription.deleteMany({ where: { userId: u.id } });
    await db.order.deleteMany({ where: { userId: u.id } });
    await db.device.deleteMany({ where: { userId: u.id } });
    await db.notification.deleteMany({ where: { userId: u.id } });
    await db.favorite.deleteMany({ where: { userId: u.id } });
    await db.watchHistory.deleteMany({ where: { userId: u.id } });
    await db.ticketMessage.deleteMany({ where: { authorId: u.id } });
    await db.supportTicket.deleteMany({ where: { userId: u.id } });
    await db.user.delete({ where: { id: u.id } });
    console.log(`  ✔ removed ${u.email} (${orders.length} orders)`);
  }
  const left = await db.user.count();
  console.log(`done — ${left} users remain`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => process.exit(0));

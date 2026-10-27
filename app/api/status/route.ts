import { env } from 'cloudflare:workers';
import { RELEASE_MESSAGE, RELEASE_VERSION } from '@/lib/release';
export async function GET() {
  try {
    if (!env.DB) throw new Error('Database binding unavailable');
    await env.DB.prepare('SELECT COUNT(*) AS count FROM guestbook').first();
    return Response.json({ ok: true, message: RELEASE_MESSAGE, version: RELEASE_VERSION, serverTime: new Date().toISOString(), database: 'connected' }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Status check failed', error);
    return Response.json({ ok: false, message: '后端正在连接数据库，请稍后重试。' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}

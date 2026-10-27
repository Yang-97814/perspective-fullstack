import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { validateMessage } from '@/lib/message-validation';
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
const sameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  // 浏览器写请求必须来自本站；身份验证仍由下面的登录检查完成。
  return origin !== null && origin === new URL(request.url).origin;
};
export async function GET() {
  try {
    if (!env.DB) throw new Error('Database unavailable');
    const user = await getChatGPTUser();
    const { results } = await env.DB.prepare('SELECT id, user_id, name, body, created_at FROM guestbook ORDER BY created_at DESC, id DESC LIMIT 30').all<{id:string;user_id:string;name:string;body:string;created_at:number}>();
    return json({ messages: results.map(({ user_id, ...row }) => ({ ...row, canDelete: user?.userId === user_id })), signedIn: Boolean(user) });
  } catch (error) {
    console.error('Message list failed', error);
    return json({ error: '暂时无法读取留言，请稍后刷新。' }, 503);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: '请从本站提交留言。' }, 403);
  const user = await getChatGPTUser();
  if (!user) return json({ error: '请先登录，再发表留言。' }, 401);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: '需要 JSON 格式。' }, 415);
  if (Number(request.headers.get('content-length')) > 8192) return json({ error: '请求过大。' }, 413);
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: '请求过大。' }, 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { return json({ error: 'JSON 格式错误。' }, 400); }
    const valid = validateMessage(body);
    if (!valid) return json({ error: '昵称需 1–30 字，留言需 1–500 字。' }, 400);
    if (!env.DB) throw new Error('Database unavailable');
    const now = Date.now(), id = crypto.randomUUID();
    // 单条原子 INSERT 同时执行限频：每个账号每分钟最多 3 条、总计最多 100 条。
    const inserted = await env.DB.prepare('INSERT INTO guestbook (id,user_id,name,body,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM guestbook WHERE user_id = ? AND created_at > ?) < 3 AND (SELECT COUNT(*) FROM guestbook WHERE user_id = ?) < 100')
      .bind(id,user.userId,valid.name,valid.body,now,user.userId,now-60000,user.userId).run();
    if (!inserted.meta.changes) return json({ error: '每分钟最多发表 3 条，每个账号最多保留 100 条留言。请稍后再试或删除旧留言。' }, 429);
    return json({ message: { id, ...valid, created_at: now, canDelete: true } }, 201);
  } catch (error) {
    console.error('Message create failed', error);
    return json({ error: '保存失败，请稍后重试。' }, 503);
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: '请从本站操作。' }, 403);
  const user = await getChatGPTUser();
  if (!user) return json({ error: '请先登录。' }, 401);
  const id = new URL(request.url).searchParams.get('id');
  if (!id || id.length > 100) return json({ error: '留言编号无效。' }, 400);
  try {
    if (!env.DB) throw new Error('Database unavailable');
    const result = await env.DB.prepare('DELETE FROM guestbook WHERE id = ? AND user_id = ?').bind(id,user.userId).run();
    if (!result.meta.changes) return json({ error: '留言不存在，或不属于你。' }, 404);
    return json({ ok: true });
  } catch (error) {
    console.error('Message delete failed', error);
    return json({ error: '删除失败，请稍后重试。' }, 503);
  }
}

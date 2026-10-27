import homepage from './homepage.html?raw';
export function GET() {
  return new Response(homepage, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

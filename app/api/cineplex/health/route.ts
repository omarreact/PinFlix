import { handle } from '@/src/lib/cineplex/routes';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handle(request, 'health'); }

import { type RequestEvent, json } from '@sveltejs/kit';
import { fetchQuizResultDetail } from '$lib/server/admin-queries';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';
import { requireRole } from '$lib/server/auth';

export async function GET(event: RequestEvent) {
    requireRole(event, 'admin');
    const { userId } = event.params;

    try {
        const result = await fetchQuizResultDetail(getSupabaseAdmin(), userId!);
        return json(result);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return json({ error: message }, { status: 500 });
    }
}

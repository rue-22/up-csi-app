import { type RequestEvent, json } from '@sveltejs/kit';
import { fetchAllQuizResults } from '$lib/server/admin-queries';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';
import { requireRole } from '$lib/server/auth';

export async function GET(event: RequestEvent) {
    requireRole(event, 'admin');

    try {
        const result = await fetchAllQuizResults(getSupabaseAdmin());
        return json(result);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return json({ error: message }, { status: 500 });
    }
}

import { type RequestEvent, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/auth';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

export async function GET(event: RequestEvent) {
    requireRole(event, 'admin');

    const supabaseAdmin = getSupabaseAdmin();

    // Get all submissions with profile info
    const { data: submissions, error: subError } = await supabaseAdmin.from('constiquiz-submissions').select(`
            submission_id,
            submitted_at,
            user_id,
            profiles!inner ( username, full_name )
        `);

    if (subError) {
        return json({ error: subError.message }, { status: 500 });
    }

    // Get total scores per submitted user
    const userIds = submissions?.map(s => s.user_id).filter(Boolean) ?? [];

    if (userIds.length === 0) {
        return json({ results: [] });
    }

    const { data: answers, error: ansError } = await supabaseAdmin
        .from('constiquiz-answers')
        .select('user_id, points')
        .in('user_id', userIds);

    if (ansError) {
        return json({ error: ansError.message }, { status: 500 });
    }

    // Aggregate scores
    const scoreMap: Record<string, number> = {};
    for (const a of answers ?? []) {
        scoreMap[a.user_id] = (scoreMap[a.user_id] ?? 0) + (a.points ?? 0);
    }

    const results = submissions?.map(s => ({
        submission_id: s.submission_id,
        submitted_at: s.submitted_at,
        user_id: s.user_id,
        profile: s.profiles,
        total_score: scoreMap[s.user_id] ?? 0,
    }));

    return json({ results });
}

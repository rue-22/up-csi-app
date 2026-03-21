import { type RequestEvent, json } from '@sveltejs/kit';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';
import { requireRole } from '$lib/server/auth';

export async function GET(event: RequestEvent) {
    requireRole(event, 'admin');
    const { userId } = event.params;

    const supabaseAdmin = getSupabaseAdmin();

    const [answersRes, profileRes, submissionRes] = await Promise.all([
        supabaseAdmin
            .from('constiquiz-answers')
            .select(
                `
                answer_id, question_id, answer_text, option_id, points, is_checked,
                question:constiquiz-questions!inner (
                    title, point_value, type,
                    section:constiquiz-sections!inner ( title )
                )
            `,
            )
            .eq('user_id', userId),
        supabaseAdmin.from('profiles').select('id, username, full_name').eq('id', userId).single(),
        supabaseAdmin.from('constiquiz-submissions').select('submitted_at').eq('user_id', userId).maybeSingle(),
    ]);

    if (answersRes.error) {
        return json({ error: answersRes.error.message }, { status: 500 });
    }

    return json({
        profile: profileRes.data,
        submitted_at: submissionRes.data?.submitted_at ?? null,
        answers: answersRes.data,
    });
}

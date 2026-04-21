import { type RequestEvent, json } from '@sveltejs/kit';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';
import { requireRole } from '$lib/server/auth';

export async function POST(event: RequestEvent) {
    requireRole(event, 'admin');
    const { userId } = event.params;
    if (!userId) {
        return json({ error: 'Missing userId' }, { status: 400 });
    }

    let body: unknown = null;
    try {
        body = await event.request.json();
    } catch {
        return json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { answer_id, points } = (body ?? {}) as { answer_id?: unknown; points?: unknown };
    if (typeof answer_id !== 'number' && typeof answer_id !== 'string') {
        return json({ error: 'answer_id required' }, { status: 400 });
    }
    if (typeof points !== 'number' || !Number.isInteger(points) || points < 0) {
        return json({ error: 'points must be a non-negative integer' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: answerRow, error: lookupErr } = await supabase
        .from('constiquiz-answers')
        .select('answer_id, user_id, question:constiquiz-questions!inner(point_value)')
        .eq('answer_id', answer_id)
        .eq('user_id', userId)
        .maybeSingle();

    if (lookupErr) {
        return json({ error: lookupErr.message }, { status: 500 });
    }
    if (!answerRow) {
        return json({ error: 'Answer not found' }, { status: 404 });
    }

    const row = answerRow as unknown as { question: { point_value: number } };
    const pointValue = row.question.point_value;
    if (points > pointValue) {
        return json({ error: `points exceeds question max (${pointValue})` }, { status: 400 });
    }

    const { error: updateErr } = await supabase
        .from('constiquiz-answers')
        .update({ points, is_checked: true })
        .eq('answer_id', answer_id);

    if (updateErr) {
        return json({ error: updateErr.message }, { status: 500 });
    }

    const { data: sumRows, error: sumErr } = await supabase
        .from('constiquiz-answers')
        .select('points')
        .eq('user_id', userId);

    if (sumErr) {
        return json({ error: sumErr.message }, { status: 500 });
    }

    const new_total = ((sumRows as Record<string, unknown>[] | null) ?? []).reduce(
        (sum, r) => sum + ((r.points as number | null) ?? 0),
        0,
    );

    return json({ success: true, new_total });
}

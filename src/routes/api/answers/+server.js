import { json } from '@sveltejs/kit';
import { logger } from '$lib/logger';

export async function POST({ locals, request }) {
    const { supabase } = locals;
    const { user } = await locals.safeGetSession();

    if (!user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const uuid = user.id;

    const body = await request.json();
    const { answers } = body;

    if (!Array.isArray(answers) || answers.length === 0) {
        return json({ success: false, error: 'No answers provided' }, { status: 400 });
    }

    // update existing answers
    const { error } = await supabase.from('constiquiz-answers').upsert(
        answers.map(a => ({
            user_id: uuid,
            question_id: a.question_id,
            option_id: a.option_id ?? null,
            answer_text: a.answer_text ?? null,
        })),
        { onConflict: 'user_id,question_id' },
    );

    if (error) {
        logger.error(error);
        return json({ success: false, error: error.message }, { status: 500 });
    }

    return json({ message: 'Answers successfully saved!' });
}

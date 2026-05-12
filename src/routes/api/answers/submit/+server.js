import { json } from '@sveltejs/kit';
import { logger } from '$lib/logger';

export async function POST({ locals }) {
    const { supabase } = locals;
    const { user } = await locals.safeGetSession();

    if (!user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch saved answers
    const { data: savedAnswers, error: ansError } = await supabase
        .from('constiquiz-answers')
        .select('*')
        .eq('user_id', user.id);

    if (ansError) {
        return json({ error: ansError.message }, { status: 500 });
    }

    if (!savedAnswers || savedAnswers.length === 0) {
        return json({ message: 'No answers found' });
    }

    // Fetch questions with point values
    const { data: questions, error: questionsError } = await supabase
        .from('constiquiz-questions')
        .select('question_id, point_value, type');

    if (questionsError) {
        logger.error(questionsError);
        return json({ error: questionsError.message }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
        return json({ message: 'Failed checking answers' }, { status: 500 });
    }

    // Check if every quiz question has either option_id or answer_text.
    const savedByQuestion = new Map(savedAnswers.map(a => [a.question_id, a]));
    const notAllAnswered = questions.some(q => {
        const answer = savedByQuestion.get(q.question_id);
        return !answer || (!answer.answer_text?.trim() && typeof answer.option_id !== 'number');
    });

    if (notAllAnswered) {
        return json({ message: 'Quiz not yet finished' });
    }

    // Fetch all options for the answers
    const { data: options, error: optionsError } = await supabase
        .from('constiquiz-options')
        .select('option_id, is_correct, question_id');

    // Prepare updates
    if (optionsError) {
        logger.error(optionsError);
        return json({ error: optionsError.message }, { status: 500 });
    }

    if (!options) {
        return json({ message: 'Failed checking answers' }, { status: 500 });
    }

    // Check user answer if correct
    const updates = savedAnswers.map(a => {
        const question = questions.find(q => q.question_id === a.question_id);
        let points = 0;
        let is_checked = false;

        if (question?.type === 'checkbox' && a.answer_text) {
            const selected_choices = a.answer_text.split('-').filter(Boolean);

            for (const choice of selected_choices) {
                const option = options.find(o => o.option_id === parseInt(choice, 10));
                if (option && option.is_correct) {
                    points += 2;
                } else {
                    points -= 1;
                }
            }
            is_checked = true;
        } else if (typeof a.option_id === 'number') {
            const option = options.find(o => o.option_id === a.option_id);
            if (option && option.is_correct) {
                points = question?.point_value ?? 0;
            }
            is_checked = true;
        }

        return {
            id: a.answer_id,
            points,
            is_checked,
        };
    });

    if (!updates || updates.length !== savedAnswers.length) {
        return json({ message: 'Error with updating answers' }, { status: 406 });
    }

    // Batch update answers
    for (const u of updates) {
        const { error: updateError } = await supabase
            .from('constiquiz-answers')
            .update({ points: u.points, is_checked: u.is_checked })
            .eq('answer_id', u.id);

        if (updateError) {
            logger.error(updateError);
            return json({ error: updateError.message }, { status: 500 });
        }
    }

    // check if we made a submission before
    // NOTE: this shouldn't happen much as submit button should not appear when user has submitted

    const { data, error } = await supabase.from('constiquiz-submissions').select('*').eq('user_id', user.id);
    if (error) {
        logger.error(error);
        return json({ error: error.message }, { status: 500 });
    }

    if (data && data.length > 0) {
        return json({ message: 'User has submitted already' });
    }

    // assume that once we reach this, we have successfully updated the database
    // user can only submit once hence we must add them to the constiquiz_submissions
    const { error: insertError } = await supabase.from('constiquiz-submissions').insert({
        user_id: user.id,
    });

    if (insertError) {
        logger.error(insertError);
        return json({ error: insertError.message }, { status: 500 });
    }

    return json({ message: 'Answers successfully submitted!', submitted: true });
}

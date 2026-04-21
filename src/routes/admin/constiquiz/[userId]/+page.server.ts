import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchQuizResultDetail } from '$lib/server/admin-queries';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async ({ params }) => {
    const detail = await fetchQuizResultDetail(getSupabaseAdmin(), params.userId);
    if (!detail.profile) {
        throw error(404, 'Applicant not found');
    }
    return detail;
};

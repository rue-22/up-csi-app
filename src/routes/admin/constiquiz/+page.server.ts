import type { PageServerLoad } from './$types';
import { fetchQuizRespondents } from '$lib/server/admin-queries';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async () => {
    const supabase = getSupabaseAdmin();
    return await fetchQuizRespondents(supabase);
};

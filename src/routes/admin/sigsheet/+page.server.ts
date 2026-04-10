import type { PageServerLoad } from './$types';
import { fetchSigsheetRespondents } from '$lib/server/admin-queries';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async () => {
    const supabase = getSupabaseAdmin();
    const result = await fetchSigsheetRespondents(supabase);
    return {
        total_members: result.total_members,
        respondents: result.respondents,
    };
};

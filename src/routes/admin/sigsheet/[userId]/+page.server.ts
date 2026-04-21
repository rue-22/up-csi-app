import type { PageServerLoad } from './$types';
import { fetchSigsheetDetail } from '$lib/server/admin-queries';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async ({ params }) => {
    const supabase = getSupabaseAdmin();
    const detail = await fetchSigsheetDetail(supabase, params.userId);

    return detail;
};

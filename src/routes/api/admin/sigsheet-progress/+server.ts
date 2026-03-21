import { type RequestEvent, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/auth';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

export async function GET(event: RequestEvent) {
    requireRole(event, 'admin');

    const supabaseAdmin = getSupabaseAdmin();

    // Get total member count for progress calculation
    const { count: totalMembers } = await supabaseAdmin.from('members').select('*', { count: 'exact', head: true });

    const { data, error } = await supabaseAdmin.from('sigsheet').select(`
            sig_id, signed_at, question, answer, member_id, member_name,
            applicant:profiles!inner ( id, username, full_name )
        `);

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    // Group by applicant
    type ApplicantProfile = { id: string; username: string; full_name: string };
    type Signature = { sig_id: string; signed_at: string; member_id: string; member_name: string };
    const byApplicant: Record<string, { profile: ApplicantProfile; signatures: Signature[]; count: number }> = {};
    for (const row of data ?? []) {
        const applicant = row.applicant as unknown as ApplicantProfile;
        const key = applicant.id;
        if (!byApplicant[key]) {
            byApplicant[key] = { profile: applicant, signatures: [], count: 0 };
        }
        byApplicant[key]!.signatures.push({
            sig_id: row.sig_id,
            signed_at: row.signed_at,
            member_id: row.member_id,
            member_name: row.member_name,
        });
        byApplicant[key]!.count++;
    }

    return json({
        total_members: totalMembers,
        progress: Object.values(byApplicant),
    });
}

import { fetchAllQuizResults, fetchApplicants, fetchSigsheetProgress } from '$lib/server/admin-queries';
import type { PageServerLoad } from './$types';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

export interface ActivityItem {
    type: 'quiz' | 'sigsheet';
    name: string;
    detail: string;
    timestamp: string;
}

export const load: PageServerLoad = async () => {
    const supabase = getSupabaseAdmin();

    const [applicantsRes, quizRes, sigsheetRes, quizAnswersRes, recentQuizRes, recentSigRes] = await Promise.all([
        fetchApplicants(supabase),
        fetchAllQuizResults(supabase),
        fetchSigsheetProgress(supabase),
        supabase.from('constiquiz-answers').select('user_id'),
        supabase
            .from('constiquiz-submissions')
            .select('submitted_at, user_id, profiles!inner(full_name)')
            .order('submitted_at', { ascending: false })
            .limit(10),
        supabase
            .from('sigsheet')
            .select('signed_at, member_name, applicant:profiles!inner(full_name)')
            .order('signed_at', { ascending: false })
            .limit(10),
    ]);

    const totalApplicants = applicantsRes.applicants.length;
    const totalMembers = sigsheetRes.total_members ?? 0;

    // Sigsheet pie chart: Not started / In Progress / Met quota
    // Filter to only applicant profiles so non-applicants don't inflate counts
    const applicantIds = new Set(applicantsRes.applicants.map(a => a.id));
    const applicantProgress = sigsheetRes.progress.filter(entry => applicantIds.has(entry.profile.id));
    let sigMetQuota = 0;
    let sigInProgress = 0;
    for (const entry of applicantProgress) {
        if (totalMembers > 0 && entry.count >= totalMembers) {
            sigMetQuota++;
        } else {
            sigInProgress++;
        }
    }
    const sigNotStarted = totalApplicants - applicantProgress.length;

    // Quiz pie chart: Not started / In Progress / Completed
    const submittedUserIds = new Set(quizRes.results.filter(r => applicantIds.has(r.user_id)).map(r => r.user_id));
    const answerUserIds = new Set(
        ((quizAnswersRes.data as { user_id: string }[] | null) ?? [])
            .filter(a => applicantIds.has(a.user_id))
            .map(a => a.user_id),
    );
    const quizCompleted = submittedUserIds.size;
    let quizInProgress = 0;
    for (const uid of answerUserIds) {
        if (!submittedUserIds.has(uid)) {
            quizInProgress++;
        }
    }
    const quizNotStarted = totalApplicants - quizCompleted - quizInProgress;

    // Activity feed: merge recent quiz submissions + sigsheet entries
    const activities: ActivityItem[] = [];

    for (const row of (recentQuizRes.data as { submitted_at: string; profiles: { full_name: string } }[] | null) ??
        []) {
        activities.push({
            type: 'quiz',
            name: row.profiles.full_name,
            detail: 'submitted the constitution quiz',
            timestamp: row.submitted_at,
        });
    }

    for (const row of (recentSigRes.data as
        | { signed_at: string; member_name: string; applicant: { full_name: string } }[]
        | null) ?? []) {
        activities.push({
            type: 'sigsheet',
            name: row.applicant.full_name,
            detail: `got a signature from ${row.member_name}`,
            timestamp: row.signed_at,
        });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
        totalApplicants,
        sigsheet: { notStarted: sigNotStarted, inProgress: sigInProgress, metQuota: sigMetQuota },
        quiz: { notStarted: quizNotStarted, inProgress: quizInProgress, completed: quizCompleted },
        activities: activities.slice(0, 20),
    };
};

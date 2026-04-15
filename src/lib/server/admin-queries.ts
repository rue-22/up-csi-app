import type {
    ApplicantProfile,
    QuizAnswerDetail,
    QuizRespondent,
    QuizResultDetail,
    QuizResultSummary,
    SigsheetProfileSummary,
    SigsheetProgressSummary,
    SigsheetRespondent,
    SigsheetSignatureDetail,
} from '$lib/admin/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sign } from 'crypto';
import { string } from 'effect/FastCheck';

// arbitrary cutoff, change in future depending on m&i
const COMPLETION_QUOTA_PERCENTAGE = 0.5;

export async function fetchApplicants(supabase: SupabaseClient): Promise<{ applicants: ApplicantProfile[] }> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, role')
        .eq('role', 'applicant');

    if (error) {
        throw new Error(error.message);
    }

    return { applicants: (data ?? []) as ApplicantProfile[] };
}

export async function fetchAllQuizResults(supabase: SupabaseClient): Promise<{ results: QuizResultSummary[] }> {
    const { data: submissions, error: subError } = await supabase.from('constiquiz-submissions').select(`
            submission_id,
            submitted_at,
            user_id,
            profiles!inner ( username, full_name )
        `);

    if (subError) {
        throw new Error(subError.message);
    }

    const userIds =
        (submissions as Record<string, unknown>[] | null)?.map(s => s.user_id as string).filter(Boolean) ?? [];

    if (userIds.length === 0) {
        return { results: [] };
    }

    const { data: answers, error: ansError } = await supabase
        .from('constiquiz-answers')
        .select('user_id, points')
        .in('user_id', userIds);

    if (ansError) {
        throw new Error(ansError.message);
    }

    const scoreMap: Record<string, number> = {};
    for (const a of (answers as Record<string, unknown>[] | null) ?? []) {
        const uid = a.user_id as string;
        scoreMap[uid] = (scoreMap[uid] ?? 0) + ((a.points as number | null) ?? 0);
    }

    const results: QuizResultSummary[] = ((submissions as Record<string, unknown>[] | null) ?? []).map(s => ({
        submission_id: s.submission_id as string,
        submitted_at: s.submitted_at as string,
        user_id: s.user_id as string,
        profile: s.profiles as { username: string; full_name: string },
        total_score: scoreMap[s.user_id as string] ?? 0,
    }));

    return { results };
}

export async function fetchQuizResultDetail(supabase: SupabaseClient, userId: string): Promise<QuizResultDetail> {
    const [answersRes, profileRes, submissionRes] = await Promise.all([
        supabase
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
        supabase.from('profiles').select('id, username, full_name').eq('id', userId).single(),
        supabase.from('constiquiz-submissions').select('submitted_at').eq('user_id', userId).maybeSingle(),
    ]);

    if (answersRes.error) {
        throw new Error(answersRes.error.message);
    }

    return {
        profile: profileRes.data as QuizResultDetail['profile'],
        submitted_at: ((submissionRes.data as Record<string, unknown> | null)?.submitted_at as string | null) ?? null,
        answers: (answersRes.data ?? []) as unknown as QuizAnswerDetail[],
    };
}

export async function fetchSigsheetProgress(
    supabase: SupabaseClient,
): Promise<{ total_members: number | null; progress: SigsheetProgressSummary[] }> {
    const { count: totalMembers } = await supabase.from('members').select('*', { count: 'exact', head: true });

    const { data, error } = await supabase.from('sigsheet').select(`
            sig_id, signed_at, question, answer, member_id, member_name,
            applicant:profiles!inner ( id, username, full_name )
        `);

    if (error) {
        throw new Error(error.message);
    }

    type RawApplicant = { id: string; username: string; full_name: string };
    const byApplicant: Record<string, { profile: RawApplicant; signatures: SigsheetSignatureDetail[]; count: number }> =
        {};

    for (const row of (data as Record<string, unknown>[] | null) ?? []) {
        const applicant = row.applicant as unknown as RawApplicant;
        const key = applicant.id;
        if (!byApplicant[key]) {
            byApplicant[key] = { profile: applicant, signatures: [], count: 0 };
        }
        byApplicant[key]!.signatures.push({
            sig_id: row.sig_id as string,
            signed_at: row.signed_at as string,
            member_id: row.member_id as string,
            member_name: row.member_name as string,
        });
        byApplicant[key]!.count++;
    }

    return {
        total_members: totalMembers ?? null,
        progress: Object.values(byApplicant),
    };
}

export async function fetchQuizRespondents(
    supabase: SupabaseClient,
): Promise<{ respondents: QuizRespondent[]; max_score: number }> {
    const [applicantsRes, submissionsRes, answersRes, questionsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name').eq('role', 'applicant'),
        supabase.from('constiquiz-submissions').select('user_id'),
        supabase.from('constiquiz-answers').select('user_id, points'),
        supabase.from('constiquiz-questions').select('point_value'),
    ]);

    if (applicantsRes.error) {
        throw new Error(applicantsRes.error.message);
    }
    if (submissionsRes.error) {
        throw new Error(submissionsRes.error.message);
    }
    if (answersRes.error) {
        throw new Error(answersRes.error.message);
    }
    if (questionsRes.error) {
        throw new Error(questionsRes.error.message);
    }

    const submittedUserIds = new Set<string>();
    for (const row of (submissionsRes.data as Record<string, unknown>[] | null) ?? []) {
        const uid = row.user_id as string | null;
        if (uid) {
            submittedUserIds.add(uid);
        }
    }

    const scoreByUser: Record<string, number> = {};
    const hasAnswerByUser = new Set<string>();
    for (const row of (answersRes.data as Record<string, unknown>[] | null) ?? []) {
        const uid = row.user_id as string | null;
        if (!uid) continue;
        scoreByUser[uid] = (scoreByUser[uid] ?? 0) + ((row.points as number | null) ?? 0);
        hasAnswerByUser.add(uid);
    }

    const max_score = ((questionsRes.data as Record<string, unknown>[] | null) ?? []).reduce(
        (sum, q) => sum + ((q.point_value as number | null) ?? 0),
        0,
    );

    const respondents: QuizRespondent[] = ((applicantsRes.data as Record<string, unknown>[] | null) ?? []).map(p => {
        const uid = p.id as string;
        let status: QuizRespondent['status'] = 'Not Started';
        if (submittedUserIds.has(uid)) {
            status = 'Completed';
        } else if (hasAnswerByUser.has(uid)) {
            status = 'In Progress';
        }

        return {
            user_id: uid,
            full_name: (p.full_name as string | null) ?? '',
            status,
            current_score: scoreByUser[uid] ?? 0,
        };
    });

    return { respondents, max_score };
}

export async function fetchSigsheetDetail(supabase: SupabaseClient, userId: string): Promise<SigsheetProfileSummary> {
    const [profileRes, sigsheetRes, membersRes] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name').eq('id', userId).single(),
        supabase.from('sigsheet').select('sig_id, signed_at, member_id, member_name').eq('applicant_id', userId),
        supabase.from('members').select('member_id, member_committee'),
    ]);

    if (profileRes.error) {
        throw new Error(profileRes.error.message);
    }
    if (sigsheetRes.error) {
        throw new Error(sigsheetRes.error.message);
    }
    if (membersRes.error) {
        throw new Error(membersRes.error.message);
    }

    const membersData = (membersRes.data as Record<string, unknown>[] | null) ?? [];
    const sigsheetData = (sigsheetRes.data as Record<string, unknown>[] | null) ?? [];

    const signatures: SigsheetSignatureDetail[] = ((sigsheetData as Record<string, unknown>[] | null) ?? []).map(
        row => ({
            sig_id: row.sig_id as string,
            signed_at: row.signed_at as string,
            member_id: row.member_id as string,
            member_name: row.member_name as string,
        }),
    );

    const totalMembers = membersData.length;
    const totalSignatures = signatures.length;
    const requiredSignatures = Math.ceil(COMPLETION_QUOTA_PERCENTAGE * totalMembers);

    const memberCommitteeMap = Object.fromEntries(membersData.map(m => [m.member_id, m.member_committee])) as Record<
        string,
        string
    >;

    const sigsByCommittee: { [committee: string]: number } = {};
    for (const sig of signatures) {
        const committee = memberCommitteeMap[sig.member_id] as string;

        if (!committee) {
            sigsByCommittee['Co-Applicants'] = (sigsByCommittee['Co-Applicants'] ?? 0) + 1;
        } else sigsByCommittee[committee] = (sigsByCommittee[committee] ?? 0) + 1;
    }

    const committeeTotals: { [committee: string]: number } = {};
    for (const row of membersData) {
        const committee = row.member_committee as string;
        if (!committee) continue;

        committeeTotals[committee] = (committeeTotals[committee] ?? 0) + 1;
    }

    const COAPPLICANT_QUOTA = 10;
    committeeTotals['Co-Applicants'] = COAPPLICANT_QUOTA;

    let status: SigsheetProfileSummary['status'] = 'Not Started';
    if (totalSignatures === 0) {
        status = 'Not Started';
    } else if (totalSignatures >= requiredSignatures) {
        status = 'Completed';
    } else {
        status = 'In Progress';
    }

    return {
        profile: profileRes.data as { id: string; username: string; full_name: string },
        signatures,
        by_committee: sigsByCommittee,
        committee_totals: committeeTotals,
        total_signatures: totalSignatures,
        total_members: totalMembers,
        status,
    };
}

export async function fetchSigsheetRespondents(
    supabase: SupabaseClient,
): Promise<{ total_members: number | null; respondents: SigsheetRespondent[] }> {
    const [applicantsRes, sigsheetRes, membersRes] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name').eq('role', 'applicant'),
        supabase.from('sigsheet').select('applicant_id, member_id'),
        supabase.from('members').select('member_id, member_committee'),
    ]);

    if (applicantsRes.error) {
        throw new Error(applicantsRes.error.message);
    }
    if (sigsheetRes.error) {
        throw new Error(sigsheetRes.error.message);
    }
    if (membersRes.error) {
        throw new Error(membersRes.error.message);
    }

    const membersData = (membersRes.data as Record<string, unknown>[] | null) ?? [];
    const sigsheetData = (sigsheetRes.data as Record<string, unknown>[] | null) ?? [];
    const applicantsData = (applicantsRes.data as Record<string, unknown>[] | null) ?? [];

    const totalMembers = membersData.length;
    const requiredSignatures = Math.ceil(COMPLETION_QUOTA_PERCENTAGE * totalMembers);

    const memberCommitteeMap = Object.fromEntries(membersData.map(m => [m.member_id, m.member_committee])) as Record<
        string,
        string
    >;

    const byApplicant: Record<string, { by_committee: Record<string, number>; total: number }> = {};
    for (const row of sigsheetData) {
        const applicantId = row.applicant_id as string;
        const memberId = row.member_id as string | null;
        const committee = memberId ? (memberCommitteeMap[memberId] ?? 'Unknown') : 'Co-Applicants';

        if (!byApplicant[applicantId]) {
            byApplicant[applicantId] = { by_committee: {}, total: 0 };
        }

        byApplicant[applicantId]!.by_committee[committee] =
            (byApplicant[applicantId]!.by_committee[committee] ?? 0) + 1;
        byApplicant[applicantId]!.total++;
    }

    const respondents: SigsheetRespondent[] = applicantsData.map(p => {
        const uid = p.id as string;
        const applicantData = byApplicant[uid];
        const total = applicantData?.total ?? 0;

        let status: SigsheetRespondent['status'] = 'Not Started';
        if (total === 0) {
            status = 'Not Started';
        } else if (total >= requiredSignatures) {
            status = 'Completed';
        } else {
            status = 'In Progress';
        }

        return {
            user_id: uid,
            full_name: (p.full_name as string | null) ?? '',
            username: (p.username as string | null) ?? '',
            total_signatures: total,
            by_committee: applicantData?.by_committee ?? {},
            status,
        };
    });

    return { total_members: totalMembers, respondents };
}

/** Profile row for an applicant, as returned by the admin applicants endpoint. */
export interface ApplicantProfile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
}

/** Summary of a quiz submission with aggregated score. */
export interface QuizResultSummary {
    submission_id: string;
    submitted_at: string;
    user_id: string;
    profile: { username: string; full_name: string };
    total_score: number;
}

/** Detailed quiz answer with nested question and section info. */
export interface QuizAnswerDetail {
    answer_id: string;
    question_id: number;
    answer_text: string | null;
    option_id: number | null;
    points: number;
    is_checked: boolean;
    question: {
        title: string;
        point_value: number;
        type: string;
        section: { title: string };
    };
}

/** Full quiz result detail for a single user. */
export interface QuizResultDetail {
    profile: { id: string; username: string; full_name: string } | null;
    submitted_at: string | null;
    answers: QuizAnswerDetail[];
}

/** A single signature entry in the sigsheet. */
export interface SigsheetSignatureDetail {
    sig_id: string;
    signed_at: string;
    member_id: string;
    member_name: string;
}

/** Sigsheet progress summary for one applicant. */
export interface SigsheetProgressSummary {
    profile: { id: string; username: string; full_name: string };
    signatures: SigsheetSignatureDetail[];
    count: number;
}

/** Grade input for an applicant (used in Plan 02). */
export interface GradeInput {
    user_id: string;
    score: number;
    max_score: number;
    remarks?: string;
}

/** Row shape for the constiquiz respondent list page (P02-001). */
export interface QuizRespondent {
    user_id: string;
    full_name: string;
    username: string;
    status: 'Not Started' | 'In Progress' | 'Completed';
    current_score: number;
}

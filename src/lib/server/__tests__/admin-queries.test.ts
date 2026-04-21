import { describe, expect, it } from 'vitest';
import { createMockSupabaseClient } from './helpers';
import { fetchApplicants } from '../admin-queries';

describe('fetchApplicants', () => {
    it('returns applicant profiles when query succeeds', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        const mockApplicants = [
            { id: 'u1', username: 'alice', full_name: 'Alice A', avatar_url: null, role: 'applicant' },
            {
                id: 'u2',
                username: 'bob',
                full_name: 'Bob B',
                avatar_url: 'https://img.example.com/bob.jpg',
                role: 'applicant',
            },
        ];
        whenFrom('profiles').select({ data: mockApplicants, error: null });

        const result = await fetchApplicants(client);

        expect(result).toEqual({ applicants: mockApplicants });
    });

    it('throws when query fails', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('profiles').select({ data: null, error: { message: 'connection refused' } });

        await expect(fetchApplicants(client)).rejects.toThrow('connection refused');
    });

    it('returns empty array when no applicants exist', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('profiles').select({ data: [], error: null });

        const result = await fetchApplicants(client);

        expect(result).toEqual({ applicants: [] });
    });

    it('queries profiles table with correct parameters', async () => {
        const { client, mockFrom, whenFrom } = createMockSupabaseClient();
        whenFrom('profiles').select({ data: [], error: null });

        await fetchApplicants(client);

        expect(mockFrom).toHaveBeenCalledWith('profiles');
    });
});

describe('fetchAllQuizResults', () => {
    it('returns results with aggregated scores when submissions exist', async () => {
        const { client, whenFrom } = createMockSupabaseClient();

        whenFrom('constiquiz-submissions').select({
            data: [
                {
                    submission_id: 's1',
                    submitted_at: '2025-01-01',
                    user_id: 'u1',
                    profiles: { username: 'alice', full_name: 'Alice' },
                },
                {
                    submission_id: 's2',
                    submitted_at: '2025-01-02',
                    user_id: 'u2',
                    profiles: { username: 'bob', full_name: 'Bob' },
                },
            ],
            error: null,
        });

        whenFrom('constiquiz-answers').select({
            data: [
                { user_id: 'u1', points: 5 },
                { user_id: 'u1', points: 3 },
                { user_id: 'u2', points: 10 },
            ],
            error: null,
        });

        const { fetchAllQuizResults } = await import('../admin-queries');
        const result = await fetchAllQuizResults(client);

        expect(result.results).toHaveLength(2);
        expect(result.results[0]).toEqual({
            submission_id: 's1',
            submitted_at: '2025-01-01',
            user_id: 'u1',
            profile: { username: 'alice', full_name: 'Alice' },
            total_score: 8,
        });
        expect(result.results[1]).toEqual({
            submission_id: 's2',
            submitted_at: '2025-01-02',
            user_id: 'u2',
            profile: { username: 'bob', full_name: 'Bob' },
            total_score: 10,
        });
    });

    it('returns empty results array when no submissions exist', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('constiquiz-submissions').select({ data: [], error: null });

        const { fetchAllQuizResults } = await import('../admin-queries');
        const result = await fetchAllQuizResults(client);

        expect(result).toEqual({ results: [] });
    });

    it('returns zero score for user with no answers', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('constiquiz-submissions').select({
            data: [
                {
                    submission_id: 's1',
                    submitted_at: '2025-01-01',
                    user_id: 'u1',
                    profiles: { username: 'alice', full_name: 'Alice' },
                },
            ],
            error: null,
        });
        whenFrom('constiquiz-answers').select({ data: [], error: null });

        const { fetchAllQuizResults } = await import('../admin-queries');
        const result = await fetchAllQuizResults(client);

        expect(result.results[0]?.total_score).toBe(0);
    });

    it('handles null points in answers gracefully', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('constiquiz-submissions').select({
            data: [
                {
                    submission_id: 's1',
                    submitted_at: '2025-01-01',
                    user_id: 'u1',
                    profiles: { username: 'alice', full_name: 'Alice' },
                },
            ],
            error: null,
        });
        whenFrom('constiquiz-answers').select({
            data: [
                { user_id: 'u1', points: null },
                { user_id: 'u1', points: 5 },
            ],
            error: null,
        });

        const { fetchAllQuizResults } = await import('../admin-queries');
        const result = await fetchAllQuizResults(client);

        expect(result.results[0]?.total_score).toBe(5);
    });

    it('throws when submissions query fails', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('constiquiz-submissions').select({ data: null, error: { message: 'db error' } });

        const { fetchAllQuizResults } = await import('../admin-queries');
        await expect(fetchAllQuizResults(client)).rejects.toThrow('db error');
    });

    it('throws when answers query fails', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('constiquiz-submissions').select({
            data: [
                {
                    submission_id: 's1',
                    submitted_at: '2025-01-01',
                    user_id: 'u1',
                    profiles: { username: 'alice', full_name: 'Alice' },
                },
            ],
            error: null,
        });
        whenFrom('constiquiz-answers').select({ data: null, error: { message: 'answers error' } });

        const { fetchAllQuizResults } = await import('../admin-queries');
        await expect(fetchAllQuizResults(client)).rejects.toThrow('answers error');
    });
});

describe('fetchQuizResultDetail', () => {
    it('returns profile, submitted_at, answers, and aggregates for a valid userId', async () => {
        const { client, whenFrom } = createMockSupabaseClient();

        whenFrom('constiquiz-answers').select({
            data: [
                {
                    answer_id: 'a1',
                    question_id: 1,
                    answer_text: 'some text',
                    option_id: null,
                    points: 5,
                    is_checked: false,
                    question: {
                        title: 'Q1',
                        point_value: 5,
                        type: 'short_text',
                        section: { section_id: 10, title: 'Section A' },
                        options: [],
                    },
                },
            ],
            error: null,
        });
        whenFrom('profiles').select({
            data: { id: 'u1', username: 'alice', full_name: 'Alice A' },
            error: null,
        });
        whenFrom('constiquiz-submissions').select({
            data: { submitted_at: '2025-01-01T12:00:00Z' },
            error: null,
        });
        whenFrom('constiquiz-questions').select({
            data: [{ point_value: 5 }, { point_value: 10 }],
            error: null,
        });

        const { fetchQuizResultDetail } = await import('../admin-queries');
        const result = await fetchQuizResultDetail(client, 'u1');

        expect(result.profile).toEqual({ id: 'u1', username: 'alice', full_name: 'Alice A' });
        expect(result.submitted_at).toBe('2025-01-01T12:00:00Z');
        expect(result.answers).toHaveLength(1);
        expect(result.answers[0]?.question.section.title).toBe('Section A');
        expect(result.max_score).toBe(15);
        expect(result.current_score).toBe(5);
        expect(result.status).toBe('Completed');
    });

    it('derives In Progress status when answers exist but no submission', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('constiquiz-answers').select({
            data: [
                {
                    answer_id: 'a1',
                    question_id: 1,
                    answer_text: null,
                    option_id: 2,
                    points: 0,
                    is_checked: false,
                    question: {
                        title: 'Q1',
                        point_value: 3,
                        type: 'radio',
                        section: { section_id: 10, title: 'Section A' },
                        options: [
                            { option_id: 1, title: 'A', is_correct: false },
                            { option_id: 2, title: 'B', is_correct: true },
                        ],
                    },
                },
            ],
            error: null,
        });
        whenFrom('profiles').select({ data: { id: 'u1', username: 'alice', full_name: 'Alice A' }, error: null });
        whenFrom('constiquiz-submissions').select({ data: null, error: null });
        whenFrom('constiquiz-questions').select({ data: [{ point_value: 3 }], error: null });

        const { fetchQuizResultDetail } = await import('../admin-queries');
        const result = await fetchQuizResultDetail(client, 'u1');

        expect(result.submitted_at).toBeNull();
        expect(result.status).toBe('In Progress');
        expect(result.current_score).toBe(0);
    });

    it('derives Not Started status when no answers and no submission', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('constiquiz-answers').select({ data: [], error: null });
        whenFrom('profiles').select({ data: { id: 'u1', username: 'alice', full_name: 'Alice A' }, error: null });
        whenFrom('constiquiz-submissions').select({ data: null, error: null });
        whenFrom('constiquiz-questions').select({ data: [{ point_value: 10 }], error: null });

        const { fetchQuizResultDetail } = await import('../admin-queries');
        const result = await fetchQuizResultDetail(client, 'u1');

        expect(result.status).toBe('Not Started');
        expect(result.max_score).toBe(10);
        expect(result.current_score).toBe(0);
    });

    it('throws when answers query fails', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('constiquiz-answers').select({ data: null, error: { message: 'answers failed' } });
        whenFrom('profiles').select({ data: null, error: null });
        whenFrom('constiquiz-submissions').select({ data: null, error: null });
        whenFrom('constiquiz-questions').select({ data: [], error: null });

        const { fetchQuizResultDetail } = await import('../admin-queries');
        await expect(fetchQuizResultDetail(client, 'u1')).rejects.toThrow('answers failed');
    });
});

describe('fetchSigsheetProgress', () => {
    it('returns total members and grouped progress', async () => {
        const { client, whenFrom } = createMockSupabaseClient();

        whenFrom('members').select({ data: null, error: null, count: 25 });
        whenFrom('sigsheet').select({
            data: [
                {
                    sig_id: 'sig1',
                    signed_at: '2025-01-01',
                    question: 'q',
                    answer: 'a',
                    member_id: 'm1',
                    member_name: 'Member One',
                    applicant: { id: 'u1', username: 'alice', full_name: 'Alice' },
                },
                {
                    sig_id: 'sig2',
                    signed_at: '2025-01-02',
                    question: 'q2',
                    answer: 'a2',
                    member_id: 'm2',
                    member_name: 'Member Two',
                    applicant: { id: 'u1', username: 'alice', full_name: 'Alice' },
                },
                {
                    sig_id: 'sig3',
                    signed_at: '2025-01-03',
                    question: 'q3',
                    answer: 'a3',
                    member_id: 'm3',
                    member_name: 'Member Three',
                    applicant: { id: 'u2', username: 'bob', full_name: 'Bob' },
                },
            ],
            error: null,
        });

        const { fetchSigsheetProgress } = await import('../admin-queries');
        const result = await fetchSigsheetProgress(client);

        expect(result.total_members).toBe(25);
        expect(result.progress).toHaveLength(2);

        const aliceProgress = result.progress.find(p => p.profile.id === 'u1');
        expect(aliceProgress?.count).toBe(2);
        expect(aliceProgress?.signatures).toHaveLength(2);

        const bobProgress = result.progress.find(p => p.profile.id === 'u2');
        expect(bobProgress?.count).toBe(1);
    });

    it('returns empty progress when no sigsheet entries exist', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('members').select({ data: null, error: null, count: 10 });
        whenFrom('sigsheet').select({ data: [], error: null });

        const { fetchSigsheetProgress } = await import('../admin-queries');
        const result = await fetchSigsheetProgress(client);

        expect(result.total_members).toBe(10);
        expect(result.progress).toEqual([]);
    });

    it('throws when sigsheet query fails', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('members').select({ data: null, error: null, count: 10 });
        whenFrom('sigsheet').select({ data: null, error: { message: 'sigsheet error' } });

        const { fetchSigsheetProgress } = await import('../admin-queries');
        await expect(fetchSigsheetProgress(client)).rejects.toThrow('sigsheet error');
    });
});

describe('fetchSigsheetDetail', () => {
    it('returns profile, signatures, count, and total_members for a userId', async () => {
        const { client, whenFrom } = createMockSupabaseClient();

        whenFrom('members').select({ data: null, error: null, count: 25 });
        whenFrom('profiles').select({
            data: { id: 'u1', username: 'alice', full_name: 'Alice' },
            error: null,
        });
        whenFrom('sigsheet').select({
            data: [
                { sig_id: 'sig1', signed_at: '2025-01-01', member_id: 'm1', member_name: 'Member One' },
                { sig_id: 'sig2', signed_at: '2025-01-02', member_id: 'm2', member_name: 'Member Two' },
            ],
            error: null,
        });

        const { fetchSigsheetDetail } = await import('../admin-queries');
        const result = await fetchSigsheetDetail(client, 'u1');

        expect(result.profile).toEqual({ id: 'u1', username: 'alice', full_name: 'Alice' });
        expect(result.signatures).toHaveLength(2);
        expect(result.count).toBe(2);
        expect(result.total_members).toBe(25);
    });

    it('returns empty signatures when applicant has none', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('members').select({ data: null, error: null, count: 10 });
        whenFrom('profiles').select({
            data: { id: 'u1', username: 'alice', full_name: 'Alice' },
            error: null,
        });
        whenFrom('sigsheet').select({ data: [], error: null });

        const { fetchSigsheetDetail } = await import('../admin-queries');
        const result = await fetchSigsheetDetail(client, 'u1');

        expect(result.signatures).toEqual([]);
        expect(result.count).toBe(0);
    });

    it('throws when sigsheet query fails', async () => {
        const { client, whenFrom } = createMockSupabaseClient();
        whenFrom('members').select({ data: null, error: null, count: 10 });
        whenFrom('profiles').select({
            data: { id: 'u1', username: 'alice', full_name: 'Alice' },
            error: null,
        });
        whenFrom('sigsheet').select({ data: null, error: { message: 'query failed' } });

        const { fetchSigsheetDetail } = await import('../admin-queries');
        await expect(fetchSigsheetDetail(client, 'u1')).rejects.toThrow('query failed');
    });
});

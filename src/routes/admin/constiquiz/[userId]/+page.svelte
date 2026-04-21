<script lang="ts">
    import type { QuizAnswerDetail } from '$lib/admin/types';
    import StatusBadge from '$lib/admin/StatusBadge.svelte';
    import { slide } from 'svelte/transition';

    const { data } = $props();

    const openSections = $state<Record<number, boolean>>({});

    let currentScore = $state(data.current_score);

    type Section = {
        section_id: number;
        title: string;
        questions: { question_id: number; answers: QuizAnswerDetail[] }[];
    };

    const sections = $derived.by<Section[]>(() => {
        const bySection = new Map<number, Section>();
        for (const a of data.answers) {
            const s = a.question.section;
            if (!bySection.has(s.section_id)) {
                bySection.set(s.section_id, { section_id: s.section_id, title: s.title, questions: [] });
            }
            const section = bySection.get(s.section_id)!;
            let q = section.questions.find(q => q.question_id === a.question_id);
            if (!q) {
                q = { question_id: a.question_id, answers: [] };
                section.questions.push(q);
            }
            q.answers.push(a);
        }
        return [...bySection.values()]
            .sort((a, b) => a.section_id - b.section_id)
            .map(s => ({ ...s, questions: s.questions.sort((x, y) => x.question_id - y.question_id) }));
    });

    function globalQuestionNumber(sectionIdx: number, questionIdx: number): number {
        let n = 0;
        for (let i = 0; i < sectionIdx; i++) {
            n += sections[i]?.questions.length ?? 0;
        }
        return n + questionIdx + 1;
    }

    function isTextType(type: QuizAnswerDetail['question']['type']): boolean {
        return type === 'short_text' || type === 'long_text';
    }

    type SaveState = 'idle' | 'saving' | 'saved' | 'error';
    const saveStates = $state<Record<string, { state: SaveState; message: string | null }>>({});
    const draftScores = $state<Record<string, number>>({});

    function draftFor(answer: QuizAnswerDetail): number {
        return draftScores[answer.answer_id] ?? answer.points;
    }

    async function saveGrade(answer: QuizAnswerDetail) {
        const points = draftFor(answer);
        const max = answer.question.point_value;

        if (!Number.isInteger(points) || points < 0 || points > max) {
            saveStates[answer.answer_id] = {
                state: 'error',
                message: `Score must be an integer between 0 and ${max}`,
            };
            return;
        }

        saveStates[answer.answer_id] = { state: 'saving', message: null };

        try {
            const res = await fetch(`/api/admin/quiz-results/${data.profile!.id}/grade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer_id: answer.answer_id, points }),
            });
            if (!res.ok) {
                const body = (await res.json().catch(() => ({}))) as { error?: string };
                saveStates[answer.answer_id] = {
                    state: 'error',
                    message: body.error ?? `Save failed (${res.status})`,
                };
                return;
            }
            const body = (await res.json()) as { new_total: number };
            // eslint-disable-next-line require-atomic-updates
            answer.points = points;
            // eslint-disable-next-line require-atomic-updates
            answer.is_checked = true;
            currentScore = body.new_total;
            saveStates[answer.answer_id] = { state: 'saved', message: 'Saved' };
            setTimeout(() => {
                if (saveStates[answer.answer_id]?.state === 'saved') {
                    saveStates[answer.answer_id] = { state: 'idle', message: null };
                }
            }, 2000);
        } catch {
            saveStates[answer.answer_id] = { state: 'error', message: 'Network error' };
        }
    }
</script>

<svelte:head>
    <style>
        html {
            scroll-behavior: smooth;
        }
    </style>
</svelte:head>

<div class="w-full px-8 py-12">
    <h1 class="text-csi-white text-4xl font-bold">Constitution Quiz Responses</h1>

    <div class="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        <div class="min-w-0">
            <a href="/admin/constiquiz" class="text-csi-blue underline hover:opacity-80">Back to list</a>

            <div class="mt-4">
                <h2 class="text-csi-white text-2xl font-bold">Applicant: {data.profile?.full_name ?? '—'}</h2>
                <div class="mt-2 flex items-center gap-2">
                    <span class="text-csi-white text-sm">Status:</span>
                    <StatusBadge status={data.status} />
                </div>
                <p class="text-csi-white mt-1 text-sm">Current Score: {currentScore} / {data.max_score}</p>
            </div>

            {#if sections.length === 0}
                <p class="text-csi-neutral-300 mt-8">No responses yet.</p>
            {/if}

            {#each sections as section, sIdx (section.section_id)}
                <section id="section-{section.section_id}" class="mt-10 scroll-mt-32">
                    <h3 class="text-csi-white mb-4 text-xl font-bold">Section {sIdx + 1}: {section.title}</h3>
                    <div class="flex flex-col gap-6">
                        {#each section.questions as q, qIdx (q.question_id)}
                            {@const primary = q.answers[0]!}
                            {@const questionNumber = globalQuestionNumber(sIdx, qIdx)}
                            <article
                                id="section-{section.section_id}-q{q.question_id}"
                                class="flex scroll-mt-32 flex-col gap-4"
                            >
                                <div class="bg-csi-neutral-900 rounded-2xl p-6">
                                    <p class="text-csi-white">
                                        <span class="font-bold">{questionNumber}.</span>
                                        {primary.question.title}
                                    </p>
                                </div>

                                {#if isTextType(primary.question.type)}
                                    <div class="bg-csi-neutral-950 text-csi-white min-h-24 rounded-2xl p-4 text-sm">
                                        {#if primary.answer_text}
                                            <p class="whitespace-pre-wrap">{primary.answer_text}</p>
                                        {:else}
                                            <p class="text-csi-neutral-400 italic">No answer provided</p>
                                        {/if}
                                    </div>

                                    <div class="flex items-center gap-3">
                                        <span class="text-csi-white text-sm font-bold">Score</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max={primary.question.point_value}
                                            step="1"
                                            value={draftFor(primary)}
                                            oninput={e =>
                                                (draftScores[primary.answer_id] = Number(
                                                    (e.target as HTMLInputElement).value,
                                                ))}
                                            class="bg-csi-neutral-900 text-csi-white w-24 rounded-full px-4 py-2 text-sm"
                                        />
                                        <span class="text-csi-neutral-300 text-sm"
                                            >/ {primary.question.point_value}</span
                                        >
                                        <button
                                            type="button"
                                            onclick={() => saveGrade(primary)}
                                            disabled={saveStates[primary.answer_id]?.state === 'saving'}
                                            class="bg-csi-blue rounded-full px-6 py-2 text-sm font-bold text-[#161619] hover:opacity-80 disabled:opacity-50"
                                        >
                                            {saveStates[primary.answer_id]?.state === 'saving' ? 'Saving…' : 'Save'}
                                        </button>
                                        {#if saveStates[primary.answer_id]?.state === 'saved'}
                                            <span class="text-sm text-green-400"
                                                >{saveStates[primary.answer_id]?.message}</span
                                            >
                                        {:else if saveStates[primary.answer_id]?.state === 'error'}
                                            <span class="text-sm text-red-400"
                                                >{saveStates[primary.answer_id]?.message}</span
                                            >
                                        {/if}
                                    </div>
                                {:else}
                                    {@const pickedIds = new Set(
                                        q.answers.map(a => a.option_id).filter(id => id !== null),
                                    )}
                                    {@const awarded = q.answers.reduce((s, a) => s + (a.points ?? 0), 0)}
                                    <div class="bg-csi-neutral-950 flex flex-col gap-2 rounded-2xl p-4">
                                        {#each primary.question.options as opt (opt.option_id)}
                                            {@const picked = pickedIds.has(opt.option_id)}
                                            <div
                                                class="flex items-center justify-between rounded-lg px-3 py-2 {picked
                                                    ? 'bg-csi-neutral-900'
                                                    : ''}"
                                            >
                                                <div class="flex items-center gap-3">
                                                    <span
                                                        class="inline-flex h-4 w-4 items-center justify-center rounded-full border {picked
                                                            ? 'border-csi-blue bg-csi-blue'
                                                            : 'border-csi-neutral-500'}"
                                                    >
                                                        {#if picked}
                                                            <span class="h-2 w-2 rounded-full bg-[#161619]"></span>
                                                        {/if}
                                                    </span>
                                                    <span class="text-csi-white text-sm">{opt.title ?? ''}</span>
                                                </div>
                                                {#if opt.is_correct}
                                                    <span
                                                        class="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400"
                                                        >Correct</span
                                                    >
                                                {/if}
                                            </div>
                                        {/each}
                                        <p class="text-csi-white mt-2 text-sm">
                                            Awarded: <span class="font-bold"
                                                >{awarded} / {primary.question.point_value}</span
                                            >
                                        </p>
                                    </div>
                                {/if}
                            </article>
                        {/each}
                    </div>
                </section>
            {/each}
        </div>

        <aside class="bg-csi-neutral-900 h-fit rounded-2xl p-6 lg:sticky lg:top-8">
            <h3 class="text-csi-white mb-4 text-lg font-bold">Quiz Navigation</h3>
            {#each sections as section, sIdx (section.section_id)}
                {@const isOpen = openSections[section.section_id] ?? sIdx === 0}
                <div class="mb-2">
                    <button
                        type="button"
                        onclick={() => (openSections[section.section_id] = !isOpen)}
                        class="text-csi-blue flex w-full cursor-pointer items-start gap-1 text-left text-sm font-bold hover:opacity-80"
                    >
                        <span
                            class="inline-block w-4 shrink-0 transition-transform duration-200 ease-out"
                            style:transform={isOpen ? 'rotate(90deg)' : 'rotate(0deg)'}
                        >
                            ›
                        </span>
                        <span class="flex-1">Section {sIdx + 1}: {section.title}</span>
                    </button>
                    {#if isOpen}
                        <ul class="mt-2 ml-5 flex flex-col gap-1" transition:slide={{ duration: 200 }}>
                            {#each section.questions as q, qIdx (q.question_id)}
                                <li>
                                    <a
                                        href="#section-{section.section_id}-q{q.question_id}"
                                        class="text-csi-blue text-sm underline hover:opacity-80"
                                    >
                                        Question {globalQuestionNumber(sIdx, qIdx)}
                                    </a>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            {/each}
        </aside>
    </div>
</div>

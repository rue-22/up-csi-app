<script lang="ts">
    import PieChart from '$lib/admin/PieChart.svelte';

    const { data } = $props();

    function timeAgo(dateStr: string): string {
        const date = new Date(dateStr);
        if (isNaN(date.getTime()) || date.getFullYear() < 2000) return '';
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 0) return '';
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    const sigsheetSegments = $derived([
        { label: 'Not started', value: data.sigsheet.notStarted, color: '#5A5A5A' },
        { label: 'In Progress', value: data.sigsheet.inProgress, color: '#7DDFE8' },
        { label: 'Met quota', value: data.sigsheet.metQuota, color: '#00C6D7' },
    ]);

    const quizSegments = $derived([
        { label: 'Not started', value: data.quiz.notStarted, color: '#5A5A5A' },
        { label: 'In Progress', value: data.quiz.inProgress, color: '#7DDFE8' },
        { label: 'Completed', value: data.quiz.completed, color: '#00C6D7' },
    ]);
</script>

<div class="w-full px-8 py-12">
    <h1 class="text-csi-white text-4xl font-bold">Progress Summary</h1>

    <div class="mt-8 flex flex-col gap-6 lg:flex-row">
        <div class="bg-csi-neutral-900 flex-1 rounded-2xl p-6">
            <h2 class="text-csi-blue text-2xl font-bold">Signature Sheet</h2>
            <p class="text-csi-white mt-1 text-sm">Progress</p>
            <div class="mt-6 mb-4 flex justify-center">
                <PieChart segments={sigsheetSegments} />
            </div>
        </div>

        <div class="bg-csi-neutral-900 flex-1 rounded-2xl p-6">
            <h2 class="text-csi-blue text-2xl font-bold">Constitution Quiz</h2>
            <p class="text-csi-white mt-1 text-sm">Progress</p>
            <div class="mt-6 mb-4 flex justify-center">
                <PieChart segments={quizSegments} />
            </div>
        </div>
    </div>

    <div class="bg-csi-neutral-900 mt-6 rounded-2xl p-6">
        <h2 class="text-csi-white mb-4 text-xl font-bold">Recent Activity</h2>

        {#if data.activities.length === 0}
            <p class="text-csi-neutral-400">No recent activity</p>
        {:else}
            <div class="flex flex-col">
                {#each data.activities as activity, i (activity.timestamp + activity.name + i)}
                    <div
                        class="flex items-center justify-between gap-3 py-3 {i > 0
                            ? 'border-csi-neutral-800 border-t'
                            : ''}"
                    >
                        <div class="flex items-center gap-3">
                            <span
                                class="block h-2 w-2 shrink-0 rounded-full {activity.type === 'quiz'
                                    ? 'bg-csi-blue'
                                    : 'bg-csi-yellow'}"
                            ></span>
                            <span class="text-csi-white text-sm">
                                {activity.name}
                                {activity.detail}
                            </span>
                        </div>
                        <span class="text-csi-neutral-400 shrink-0 text-xs">
                            {timeAgo(activity.timestamp)}
                        </span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

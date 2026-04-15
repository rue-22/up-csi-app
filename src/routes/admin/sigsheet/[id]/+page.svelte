<script lang="ts">
    import StatusBadge from '$lib/admin/StatusBadge.svelte';
    const { data } = $props();

    const COMMITTEES: { name: string; color: string }[] = [
        { name: 'Executive', color: 'bg-[#00C6D7]' },
        { name: 'Membership & Internals', color: 'bg-pink-400' },
        { name: 'Service', color: 'bg-yellow-400' },
        { name: 'Innovation', color: 'bg-orange-400' },
        { name: 'Engineering', color: 'bg-red-400' },
        { name: 'External Relations', color: 'bg-blue-500' },
        { name: 'Branding & Creatives', color: 'bg-green-500' },
        { name: 'Co-Applicants', color: 'bg-white' },
    ];

    function pct(signed: number, total: number): number {
        if (total === 0) return 0;
        return Math.min((signed / total) * 100, 100);
    }
</script>

<div class="w-full px-8 py-12">
    <h1 class="text-csi-white text-4xl font-bold">Signature Sheet Progress</h1>

    <a href="/admin/sigsheet" class="text-csi-blue mt-4 inline-block text-sm hover:underline"> ← Back to list </a>

    <div class="mt-6">
        <h2 class="text-csi-white text-2xl font-bold">
            Applicant: {data.profile?.full_name ?? '—'}
        </h2>
        <div class="mt-1 flex items-center gap-2">
            <span class="text-csi-white text-sm">Status:</span>
            <StatusBadge status={data.status} />
        </div>
        <p class="text-csi-white mt-1 text-sm">Current Signatures: {data.total_signatures ?? 0}</p>
    </div>

    <div class="bg-csi-neutral-900 mt-6 rounded-2xl p-6">
        <div class="flex flex-col gap-6">
            {#each COMMITTEES as { name, color }}
                {@const signed = data.by_committee[name] ?? 0}
                {@const total = data.committee_totals[name] ?? 0}
                <div>
                    <div class="mb-1 flex items-center justify-between">
                        <span class="text-csi-white text-sm">{name}</span>
                        <span class="text-csi-white text-sm">{signed}/{total}</span>
                    </div>
                    <div class="bg-csi-neutral-800 h-3 w-full overflow-hidden rounded-full">
                        <div
                            class="h-full rounded-full transition-all {color}"
                            style="width: {pct(signed, total)}%"
                        ></div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

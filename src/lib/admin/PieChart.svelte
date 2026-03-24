<script lang="ts">
    type PieSegment = { label: string; value: number; color: string };
    const { segments, size = 200 }: { segments: PieSegment[]; size?: number } = $props();

    const total = $derived(segments.reduce((sum, s) => sum + s.value, 0));

    const segmentsWithPercent = $derived(
        segments.map(s => ({
            ...s,
            percent: total > 0 ? Math.round((s.value / total) * 100) : 0,
        })),
    );

    const gradient = $derived.by(() => {
        if (total === 0) {
            return 'conic-gradient(#3D3D3D 0deg 360deg)';
        }

        const activeSegments = segments.filter(s => s.value > 0);
        const parts: string[] = [];
        let currentDeg = 0;

        for (const segment of activeSegments) {
            const degrees = (segment.value / total) * 360;
            const endDeg = currentDeg + degrees;
            parts.push(`${segment.color} ${currentDeg}deg ${endDeg}deg`);
            currentDeg = endDeg;
        }

        return `conic-gradient(${parts.join(', ')})`;
    });
</script>

<div class="flex flex-col items-center gap-4">
    <div class="rounded-full" style="width: {size}px; height: {size}px; background: {gradient};"></div>

    <div class="flex flex-col gap-2">
        {#each segmentsWithPercent as segment (segment.label)}
            <div class="flex items-center gap-2">
                <span
                    class="block shrink-0"
                    style="width: 14px; height: 14px; border-radius: 2px; background-color: {segment.color};"
                ></span>
                <span class="text-csi-white text-sm">
                    {segment.label}: {segment.percent}% ({segment.value}/{total})
                </span>
            </div>
        {/each}
    </div>
</div>

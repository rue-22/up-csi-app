<script lang="ts">
    /* eslint-disable prefer-const */
    let {
        sortKey = $bindable(''),
        sortDirection = $bindable<'asc' | 'desc'>('asc'),
        columns,
    }: {
        sortKey?: string;
        sortDirection?: 'asc' | 'desc';
        columns: { key: string; header: string }[];
    } = $props();
    /* eslint-enable prefer-const */

    let open = $state(false);
    let wrapper: HTMLDivElement | null = null;

    const buttonLabel = $derived(
        sortKey
            ? `Sort By: ${columns.find(c => c.key === sortKey)?.header ?? ''} ${sortDirection === 'asc' ? '\u2191' : '\u2193'}`
            : 'Sort By',
    );

    function select(key: string) {
        return () => {
            if (sortKey === key) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = key;
                sortDirection = 'asc';
            }
            open = false;
        };
    }

    function handlePointerDown(event: PointerEvent) {
        if (wrapper && !wrapper.contains(event.target as Node)) {
            open = false;
        }
    }
</script>

<svelte:window onpointerdown={handlePointerDown} />

<div bind:this={wrapper} class="relative">
    <button
        type="button"
        class="text-csi-white hover:border-csi-blue rounded-lg border border-[#5A5A5A] bg-transparent px-4 py-2.5 text-sm transition-colors"
        onclick={() => (open = !open)}
    >
        {buttonLabel}
    </button>
    {#if open}
        <div class="absolute top-full right-0 z-10 mt-1 min-w-[160px] rounded-lg bg-[#2A2A2D] py-1 shadow-lg">
            {#each columns as col (col.key)}
                <button
                    type="button"
                    class="hover:bg-csi-neutral-900 w-full px-4 py-2 text-left text-sm transition-colors {sortKey ===
                    col.key
                        ? 'text-csi-blue font-medium'
                        : 'text-csi-white'}"
                    onclick={select(col.key)}
                >
                    {col.header}
                    {#if sortKey === col.key}
                        {sortDirection === 'asc' ? '\u2191' : '\u2193'}
                    {/if}
                </button>
            {/each}
        </div>
    {/if}
</div>

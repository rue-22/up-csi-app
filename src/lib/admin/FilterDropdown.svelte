<script lang="ts">
    /* eslint-disable prefer-const */
    let {
        value = $bindable('all'),
        options = ['all', 'Not Started', 'In Progress', 'Completed'],
    }: {
        value?: string;
        options?: string[];
    } = $props();
    /* eslint-enable prefer-const */

    let open = $state(false);
    let wrapper: HTMLDivElement | null = null;

    function handlePointerDown(event: PointerEvent) {
        if (wrapper && !wrapper.contains(event.target as Node)) {
            open = false;
        }
    }

    function select(option: string) {
        return () => {
            value = option;
            open = false;
        };
    }

    function label(option: string): string {
        return option === 'all' ? 'All' : option;
    }
</script>

<svelte:window onpointerdown={handlePointerDown} />

<div bind:this={wrapper} class="relative">
    <button
        type="button"
        onclick={() => (open = !open)}
        class="text-csi-white hover:border-csi-blue flex items-center gap-2 rounded-lg border border-[#5A5A5A] bg-transparent px-4 py-2.5 text-sm transition-colors"
    >
        Filter
        {#if value !== 'all'}
            <span class="bg-csi-blue h-1.5 w-1.5 rounded-full"></span>
        {/if}
    </button>

    {#if open}
        <div class="absolute top-full right-0 z-10 mt-1 min-w-[160px] rounded-lg bg-[#2A2A2D] py-1 shadow-lg">
            {#each options as option (option)}
                <button
                    type="button"
                    onclick={select(option)}
                    class="hover:bg-csi-neutral-900 w-full px-4 py-2 text-left text-sm transition-colors {value ===
                    option
                        ? 'text-csi-blue font-medium'
                        : 'text-csi-white'}"
                >
                    {label(option)}
                </button>
            {/each}
        </div>
    {/if}
</div>

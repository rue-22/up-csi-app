<script lang="ts">
    import { ChevronLeft, ChevronRight } from '@lucide/svelte';

    /* eslint-disable prefer-const */
    let {
        currentPage = $bindable(1),
        totalPages,
    }: {
        currentPage?: number;
        totalPages: number;
    } = $props();
    /* eslint-enable prefer-const */
</script>

{#if totalPages > 1}
    <div class="mt-4 flex items-center justify-center gap-4 border-t border-[#2A2A2D] pt-4">
        <button
            class="text-csi-white hover:bg-csi-neutral-900 rounded-lg bg-[#2A2A2D] p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            disabled={currentPage === 1}
            onclick={() => {
                currentPage = Math.max(1, currentPage - 1);
            }}
        >
            <ChevronLeft class="h-4 w-4" />
        </button>

        <span class="text-csi-neutral-400 text-sm">
            Page {currentPage} of {totalPages}
        </span>

        <button
            class="text-csi-white hover:bg-csi-neutral-900 rounded-lg bg-[#2A2A2D] p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            disabled={currentPage >= totalPages}
            onclick={() => {
                currentPage = Math.min(totalPages, currentPage + 1);
            }}
        >
            <ChevronRight class="h-4 w-4" />
        </button>
    </div>
{/if}

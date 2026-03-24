<script lang="ts">
    const { status }: { status: 'Not Started' | 'In Progress' | 'Completed' } = $props();

    const statusClasses: Record<typeof status, string> = {
        'Not Started': 'bg-[#2A2A2D] border border-[#5A5A5A] text-csi-neutral-400',
        'In Progress': 'bg-[#7DDFE8] text-[#161619]',
        Completed: 'bg-[#00C6D7] text-[#161619]',
    };
</script>

<span
    class="inline-block rounded-full px-3 py-1 text-center text-xs font-medium whitespace-nowrap {statusClasses[
        status
    ]}"
>
    {status}
</span>

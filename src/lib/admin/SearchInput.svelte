<script lang="ts">
    import Search from '@lucide/svelte/icons/search';

    /* eslint-disable prefer-const */
    let {
        value = $bindable(''),
        placeholder = 'Search applicant',
    }: {
        value?: string;
        placeholder?: string;
    } = $props();
    /* eslint-enable prefer-const */
</script>

<div class="relative flex items-center">
    <Search class="text-csi-neutral-400 pointer-events-none absolute left-3 h-4 w-4" />
    <input
        type="text"
        bind:value
        {placeholder}
        class="text-csi-white placeholder-csi-neutral-400 focus:ring-csi-blue w-full rounded-lg bg-[#2A2A2D] py-2.5 pr-4 pl-10 text-sm outline-none focus:ring-1"
    />
</div>

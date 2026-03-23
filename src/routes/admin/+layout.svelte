<script lang="ts">
    import { ChevronRight } from '@lucide/svelte';
    import { page } from '$app/state';

    const { children } = $props();

    const breadcrumbs = $derived.by(() => {
        const path = page.url.pathname;
        const segments = path.split('/').filter(Boolean);
        const crumbs: Array<{ label: string; href: string }> = [];

        let href = '';
        for (const segment of segments) {
            href += `/${segment}`;
            const label = segment.charAt(0).toUpperCase() + segment.slice(1);
            crumbs.push({ label, href });
        }
        return crumbs;
    });
</script>

<div class="w-full">
    <nav class="border-csi-neutral-900 flex items-center gap-1 border-b px-8 py-3">
        {#each breadcrumbs as crumb, i (crumb.href)}
            {#if i > 0}
                <ChevronRight class="text-csi-neutral-400 h-4 w-4" />
            {/if}
            {#if i === breadcrumbs.length - 1}
                <span class="text-csi-white text-sm font-medium">{crumb.label}</span>
            {:else}
                <a href={crumb.href} class="text-csi-neutral-400 hover:text-csi-white text-sm transition-colors">
                    {crumb.label}
                </a>
            {/if}
        {/each}
    </nav>

    {@render children()}
</div>

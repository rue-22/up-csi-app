<script lang="ts">
    import { ShieldX } from '@lucide/svelte';
    import { page } from '$app/state';
</script>

<div class="flex w-full items-center justify-center px-8 py-24">
    <div class="bg-csi-neutral-900 w-full max-w-md rounded-2xl p-8 text-center">
        <ShieldX class="mx-auto mb-4 h-16 w-16 text-red-400" />
        <h1 class="text-csi-white mb-2 text-3xl font-bold">Access Denied</h1>
        <p class="text-csi-neutral-400 mb-6">
            {page.error?.message ?? 'You do not have permission to view this page.'}
        </p>
        <a
            href="/"
            class="bg-csi-blue inline-block rounded-3xl px-6 py-2 font-bold text-[#161619] transition-opacity hover:opacity-90"
        >
            Back to Dashboard
        </a>
    </div>
</div>

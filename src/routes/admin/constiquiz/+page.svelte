<script lang="ts">
    import AdminListView from '$lib/admin/AdminListView.svelte';
    import StatusBadge from '$lib/admin/StatusBadge.svelte';
    import { goto } from '$app/navigation';

    const { data } = $props();

    const columns = [
        { key: 'full_name', header: 'Applicant Name', searchable: true },
        { key: 'username', header: 'Username', searchable: true },
        { key: 'status', header: 'Status' },
        { key: 'current_score', header: 'Current Score' },
        { key: 'responses', header: 'Responses' },
    ];

    function goToDetail(row: Record<string, unknown>) {
        goto(`/admin/constiquiz/${row.user_id as string}`);
    }
</script>

<AdminListView
    title="Constitution Quiz Respondents"
    data={data.respondents as unknown as Record<string, unknown>[]}
    {columns}
    filterKey="status"
    onRowClick={goToDetail}
>
    {#snippet cell({ row, column })}
        {#if column.key === 'status'}
            <StatusBadge status={row.status as 'Not Started' | 'In Progress' | 'Completed'} />
        {:else if column.key === 'current_score'}
            <span class="text-csi-white font-medium">
                {row.current_score} / {data.max_score}
            </span>
        {:else if column.key === 'responses'}
            <a
                href={`/admin/constiquiz/${row.user_id}`}
                class="text-csi-blue underline hover:opacity-80"
                onclick={e => e.stopPropagation()}
            >
                View response
            </a>
        {:else}
            {String(row[column.key] ?? '')}
        {/if}
    {/snippet}
</AdminListView>

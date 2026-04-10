<script lang="ts">
    import AdminListView from '$lib/admin/AdminListView.svelte';
    import StatusBadge from '$lib/admin/StatusBadge.svelte';
    import { goto } from '$app/navigation';

    const { data } = $props();

    const COMMITTEES = [
        'Executive',
        'Membership & Internals',
        'Service',
        'Innovation',
        'Engineering',
        'External Relations',
        'Branding & Creatives',
        'Co-Applicants',
    ];

    const columns = [
        { key: 'full_name', header: 'Applicant Name', searchable: true, sortable: true },
        { key: 'status', header: 'Status', sortable: true },
        { key: 'total_signatures', header: 'Total', sortable: true },
        ...COMMITTEES.map(c => ({ key: `by_committee.${c}`, header: c })),
    ];

    function goToDetail(row: Record<string, unknown>) {
        goto(`/admin/sigsheet/${row.user_id as string}`);
    }
</script>

<AdminListView
    title="Signature Sheet Progress"
    data={data.respondents as unknown as Record<string, unknown>[]}
    {columns}
    rowKey="user_id"
    filterKey="status"
    searchPlaceholder="Search by name"
    onRowClick={goToDetail}
>
    {#snippet cell({ row, column })}
        {#if column.key === 'status'}
            <StatusBadge status={row.status as 'Not Started' | 'In Progress' | 'Completed'} />
        {:else if column.key.startsWith('by_committee.')}
            {(row.by_committee as Record<string, number>)?.[column.key.replace('by_committee.', '')] ?? 0}
        {:else}
            {String(row[column.key] ?? '')}
        {/if}
    {/snippet}
</AdminListView>

<script lang="ts">
    import Pagination from './Pagination.svelte';
    import type { Snippet } from 'svelte';

    interface Column {
        key: string;
        header: string;
        searchable?: boolean;
    }

    interface CellContext {
        row: Record<string, unknown>;
        column: Column;
        value: unknown;
    }

    /* eslint-disable prefer-const */
    let {
        data,
        columns,
        searchTerm = '',
        filterKey = '',
        filterValue = 'all',
        sortKey = '',
        sortDirection = 'asc',
        pageSize = 20,
        onRowClick,
        cell,
    }: {
        data: Record<string, unknown>[];
        columns: Column[];
        searchTerm?: string;
        filterKey?: string;
        filterValue?: string;
        sortKey?: string;
        sortDirection?: 'asc' | 'desc';
        pageSize?: number;
        onRowClick?: (row: Record<string, unknown>) => void;
        cell?: Snippet<[CellContext]>;
    } = $props();
    /* eslint-enable prefer-const */

    let currentPage = $state(1);

    const filteredBySearch = $derived.by(() => {
        if (!searchTerm) return data;
        const term = searchTerm.toLowerCase();
        return data.filter(row =>
            columns.some(
                col =>
                    col.searchable &&
                    String(row[col.key] ?? '')
                        .toLowerCase()
                        .includes(term),
            ),
        );
    });

    const filteredByStatus = $derived.by(() => {
        if (filterValue === 'all' || !filterKey) return filteredBySearch;
        return filteredBySearch.filter(row => String(row[filterKey]) === filterValue);
    });

    const sortedData = $derived.by(() => {
        const arr = [...filteredByStatus];
        if (!sortKey) return arr;
        return arr.sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const aStr = String(aVal ?? '');
            const bStr = String(bVal ?? '');
            return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
    });

    const totalPages = $derived(Math.max(1, Math.ceil(sortedData.length / pageSize)));

    const paginatedData = $derived(sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize));

    $effect(() => {
        // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions
        searchTerm;
        // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions
        filterValue;
        currentPage = 1;
    });
</script>

<div class="bg-csi-neutral-900 overflow-hidden rounded-2xl">
    <!-- Table -->
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead>
                <tr class="border-b border-[#2A2A2D]">
                    {#each columns as col (col.key)}
                        <th
                            class="text-csi-neutral-400 px-6 py-4 text-left text-xs font-medium tracking-wider uppercase"
                        >
                            {col.header}
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each paginatedData as row, i (i)}
                    <tr
                        class="border-b border-[#2A2A2D] transition-colors hover:bg-[#2A2A2D]
                            {onRowClick ? 'cursor-pointer' : ''}"
                        onclick={() => onRowClick?.(row)}
                    >
                        {#each columns as column (column.key)}
                            <td class="text-csi-white px-6 py-4 text-sm">
                                {#if cell}
                                    {@render cell({ row, column, value: row[column.key] })}
                                {:else}
                                    {String(row[column.key] ?? '')}
                                {/if}
                            </td>
                        {/each}
                    </tr>
                {/each}

                {#if paginatedData.length === 0}
                    <tr>
                        <td colspan={columns.length} class="text-csi-neutral-400 px-6 py-8 text-center text-sm">
                            No results found
                        </td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </div>

    <!-- Pagination -->
    <Pagination bind:currentPage {totalPages} />
</div>

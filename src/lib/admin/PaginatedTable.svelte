<script lang="ts">
    import Pagination from './Pagination.svelte';
    import type { Snippet } from 'svelte';
    import { fade } from 'svelte/transition';
    import { flip } from 'svelte/animate';

    interface Column {
        key: string;
        header: string;
        searchable?: boolean;
        sortable?: boolean;
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
        rowKey,
        searchTerm = '',
        filterKey = '',
        filterValue = 'all',
        pageSize = 20,
        onRowClick,
        cell,
    }: {
        data: Record<string, unknown>[];
        columns: Column[];
        rowKey: string;
        searchTerm?: string;
        filterKey?: string;
        filterValue?: string;
        pageSize?: number;
        onRowClick?: (row: Record<string, unknown>) => void;
        cell?: Snippet<[CellContext]>;
    } = $props();
    /* eslint-enable prefer-const */

    let currentPage = $state(1);
    let sortKey = $state('');
    let sortDirection = $state<'asc' | 'desc'>('asc');

    function handleSort(key: string) {
        if (sortKey !== key) {
            sortKey = key;
            sortDirection = 'asc';
        } else if (sortDirection === 'asc') {
            sortDirection = 'desc';
        } else {
            sortKey = '';
            sortDirection = 'asc';
        }
    }

    function ariaSortFor(key: string): 'ascending' | 'descending' | 'none' {
        if (sortKey !== key) return 'none';
        return sortDirection === 'asc' ? 'ascending' : 'descending';
    }

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
                        <th aria-sort={ariaSortFor(col.key)}>
                            {#if col.sortable}
                                <button
                                    type="button"
                                    onclick={() => handleSort(col.key)}
                                    class="text-csi-neutral-400 hover:text-csi-white flex w-full items-center gap-1.5 px-6 py-4 text-left text-xs font-medium tracking-wider uppercase transition-colors duration-150"
                                >
                                    {col.header}
                                    {#if sortKey === col.key}
                                        <span class="text-csi-blue">
                                            {sortDirection === 'asc' ? '\u2191' : '\u2193'}
                                        </span>
                                    {/if}
                                </button>
                            {:else}
                                <div
                                    class="text-csi-neutral-400 px-6 py-4 text-left text-xs font-medium tracking-wider uppercase"
                                >
                                    {col.header}
                                </div>
                            {/if}
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each paginatedData as row (row[rowKey] as string | number)}
                    <tr
                        animate:flip={{ duration: 220 }}
                        in:fade={{ duration: 180 }}
                        out:fade={{ duration: 120 }}
                        class="border-b border-[#2A2A2D] transition-colors duration-150 last:border-b-0 hover:bg-[#2A2A2D]
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
                        <td colspan={columns.length} class="text-csi-neutral-400 px-6 py-12 text-center text-sm">
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

<script lang="ts">
    import FilterDropdown from './FilterDropdown.svelte';
    import PaginatedTable from './PaginatedTable.svelte';
    import SearchInput from './SearchInput.svelte';
    import type { Snippet } from 'svelte';
    import { fly } from 'svelte/transition';

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
        title,
        data,
        columns,
        rowKey,
        filterKey = '',
        filterOptions = ['all', 'Not Started', 'In Progress', 'Completed'],
        searchPlaceholder = 'Search applicant',
        onRowClick,
        cell,
    }: {
        title: string;
        data: Record<string, unknown>[];
        columns: Column[];
        rowKey: string;
        filterKey?: string;
        filterOptions?: string[];
        searchPlaceholder?: string;
        onRowClick?: (row: Record<string, unknown>) => void;
        cell?: Snippet<[CellContext]>;
    } = $props();
    /* eslint-enable prefer-const */

    let searchTerm = $state('');
    let filterValue = $state('all');
</script>

<div class="flex w-full flex-col gap-6 px-8 py-12" in:fly={{ y: 12, duration: 280 }}>
    <h1 class="text-csi-white text-4xl font-bold">{title}</h1>

    <div class="flex items-center gap-4">
        <div class="flex-1">
            <SearchInput bind:value={searchTerm} placeholder={searchPlaceholder} />
        </div>
        <FilterDropdown bind:value={filterValue} options={filterOptions} />
    </div>

    <PaginatedTable {data} {columns} {rowKey} {searchTerm} {filterKey} {filterValue} {onRowClick} {cell} />
</div>

<script lang="ts">
    import FilterDropdown from './FilterDropdown.svelte';
    import PaginatedTable from './PaginatedTable.svelte';
    import SearchInput from './SearchInput.svelte';
    import type { Snippet } from 'svelte';
    import SortDropdown from './SortDropdown.svelte';

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
        title,
        data,
        columns,
        filterKey = '',
        filterOptions = ['all', 'Not Started', 'In Progress', 'Completed'],
        searchPlaceholder = 'Search applicant',
        onRowClick,
        cell,
    }: {
        title: string;
        data: Record<string, unknown>[];
        columns: Column[];
        filterKey?: string;
        filterOptions?: string[];
        searchPlaceholder?: string;
        onRowClick?: (row: Record<string, unknown>) => void;
        cell?: Snippet<[CellContext]>;
    } = $props();
    /* eslint-enable prefer-const */

    let searchTerm = $state('');
    let filterValue = $state('all');
    let sortKey = $state('');
    let sortDirection = $state<'asc' | 'desc'>('asc');
</script>

<div class="flex flex-col gap-6">
    <h1 class="text-csi-white text-3xl font-bold">{title}</h1>

    <div class="flex items-center gap-4">
        <div class="flex-1">
            <SearchInput bind:value={searchTerm} placeholder={searchPlaceholder} />
        </div>
        <FilterDropdown bind:value={filterValue} options={filterOptions} />
        <SortDropdown bind:sortKey bind:sortDirection {columns} />
    </div>

    <PaginatedTable
        {data}
        {columns}
        {searchTerm}
        {filterKey}
        {filterValue}
        {sortKey}
        {sortDirection}
        {onRowClick}
        {cell}
    />
</div>

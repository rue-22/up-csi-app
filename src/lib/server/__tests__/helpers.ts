import type { SupabaseClient } from '@supabase/supabase-js';
import { vi } from 'vitest';

interface MockQueryResult {
    data: unknown;
    error: null | { message: string };
    count?: number | null;
}

/**
 * Creates a mock Supabase client with a per-table response queue.
 *
 * Usage:
 *   const { client, mockFrom, whenFrom } = createMockSupabaseClient();
 *   whenFrom('profiles').select({ data: [...], error: null });
 *   const result = await client.from('profiles').select('*').eq('role', 'applicant');
 */
export function createMockSupabaseClient() {
    const tableResponses = new Map<string, MockQueryResult[]>();

    function whenFrom(table: string) {
        return {
            select(result: MockQueryResult) {
                const queue = tableResponses.get(table) ?? [];
                queue.push(result);
                tableResponses.set(table, queue);
                return this;
            },
        };
    }

    const mockFrom = vi.fn((table: string) => {
        const responses = tableResponses.get(table) ?? [];
        const response = responses.shift() ?? { data: null, error: null };

        const builder: Record<string, unknown> = {};

        builder.select = vi.fn().mockReturnValue(builder);
        builder.eq = vi.fn().mockReturnValue(builder);
        builder.in = vi.fn().mockReturnValue(builder);
        builder.single = vi.fn().mockReturnValue(builder);
        builder.maybeSingle = vi.fn().mockReturnValue(builder);
        builder.order = vi.fn().mockReturnValue(builder);
        builder.limit = vi.fn().mockReturnValue(builder);
        builder.range = vi.fn().mockReturnValue(builder);

        // Make the builder thenable so `await` resolves to the response
        builder.then = (resolve: (val: MockQueryResult) => void) => {
            resolve(response);
        };

        return builder;
    });

    const client = { from: mockFrom } as unknown as SupabaseClient;

    return { client, mockFrom, whenFrom };
}

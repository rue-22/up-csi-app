import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/auth';

export const load: LayoutServerLoad = event => {
    const { user } = requireRole(event, 'admin');
    return {
        adminUser: {
            id: user.id,
            email: user.email,
        },
    };
};

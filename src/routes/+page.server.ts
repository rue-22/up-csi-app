import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = ({ locals }) => {
    if (locals.userRole === 'admin') {
        redirect(303, '/admin');
    }

    return {};
};

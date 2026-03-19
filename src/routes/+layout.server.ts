import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, userRole }, cookies }) => {
    const { session } = await safeGetSession();
    return {
        session,
        cookies: cookies.getAll(),
        userRole: userRole ?? null,
    };
};

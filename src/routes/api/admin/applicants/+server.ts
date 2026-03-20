import { json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/auth';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { type RequestEvent } from '@sveltejs/kit';

/**
 * List all applicant profiles 
 */
export async function GET(event: RequestEvent) {
  requireRole(event, 'admin');

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, full_name, avatar_url, role')
    .eq('role', 'applicant');
  
    if (error) {
      return json(
        {error: error.message},
        {status: 500}
      );
    }

    return json({ applicants: data });
}
import { gdrive_root_folder } from '$lib/shared';
import { google } from 'googleapis';
import { logger } from '$lib/logger';
import { requirePrivateEnv } from '$lib/server/env';

/** @type {import('./$types').RequestHandler} */
export async function POST({ locals }) {
    logger.debug('Received POST request at /api/get_gdrive_folder');

    try {
        const { user } = await locals.safeGetSession();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const uuid = user.id;
        const username = user.email?.split('@')[0] ?? '';
        const { supabase } = locals;
        // Ensure uuid is not empty
        if (uuid === '' || uuid === null) {
            logger.error('Validation Error: $uuid is empty');
            return new Response(JSON.stringify({ error: 'UUID is empty.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (username === '' || username === null) {
            logger.error('Validation Error: $username is empty');
            return new Response(JSON.stringify({ error: 'Username is empty.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        logger.debug('Authenticating into Google Drive');
        // Authenticate with Google Drive API
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: requirePrivateEnv('GOOGLE_SERVICE_EMAIL'),
                private_key: requirePrivateEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive'],
        });
        const drive = google.drive({ version: 'v3', auth });
        logger.debug('Authenticated into Google Drive');

        // Check if applicant already has a gdrive_folder
        try {
            logger.debug('Searching for folder in Supabase');
            const { data, error } = await supabase
                .from('pic-folders')
                .select('gdrive_folder')
                .eq('applicant_uuid', uuid)
                .single();

            // Error PGRST116: row not found; So throw unexpected error
            if (error && error.code !== 'PGRST116') {
                logger.error('Error reading from Supabase: ', error);
                throw new Error(error.message);
            }

            // If applicant has folder, return it
            if (data) {
                logger.debug('Applicant does have folder:', data.gdrive_folder);
                return new Response(
                    JSON.stringify({
                        message: 'Applicant does have folder',
                        folder_id: data.gdrive_folder,
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                );
            }
        } catch (supabaseError) {
            logger.error('Error reading from Supabase:', supabaseError);
            return new Response(JSON.stringify({ error: 'Error reading from Supabase' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // No folder exists, so create a new one in Google Drive
        const fileMetadata = {
            name: `${username}`,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [gdrive_root_folder],
        };

        let folder_id = null;
        try {
            logger.debug('Creating new folder in Google Drive');
            const gdrive_folder = await drive.files.create({
                requestBody: fileMetadata,
                fields: 'id',
            });
            folder_id = gdrive_folder.data.id;
            logger.debug('New folder created:', folder_id);
        } catch (driveError) {
            logger.error('Error creating new folder in Google Drive:', {
                message: driveError instanceof Error ? driveError.message : 'Unknown error',
                errors:
                    driveError instanceof Error && 'errors' in driveError
                        ? driveError.errors
                        : 'No additional error details',
                stack: driveError instanceof Error ? driveError.stack : 'No stack trace available',
            });
            return new Response(JSON.stringify({ error: 'Error creating folder in Google Drive' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!folder_id) {
            logger.error('Google Drive did not return a folder id');
            return new Response(JSON.stringify({ error: 'Google Drive did not return a folder id' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        try {
            logger.debug('Inserting new folder into Supabase');
            const { data, error } = await supabase
                .from('pic-folders')
                .insert({
                    applicant_uuid: uuid,
                    gdrive_folder: folder_id,
                })
                .select(); // makes Supabase return inserted rows

            if (error) {
                logger.error('Error inserting folder into Supabase:', error);
                throw new Error(error.message);
            }

            logger.debug('Folder successfully inserted into Supabase');
            return new Response(
                JSON.stringify({
                    message: 'Folder successfully inserted into Supabase',
                    folder_id: data[0].gdrive_folder,
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        } catch (supabaseError) {
            logger.error('Error inserting to Supabase:', supabaseError);
            return new Response(JSON.stringify({ error: 'Error inserting into Supabase' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (err) {
        logger.error('Unexpected Error: ', err);
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

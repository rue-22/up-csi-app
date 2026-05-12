import { Readable } from 'stream';
import { google } from 'googleapis';
import { logger } from '$lib/logger';
import { requirePrivateEnv } from '$lib/server/env';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    logger.debug('Received POST request at /api/upload');

    try {
        const { user } = await locals.safeGetSession();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const uuid = user.id;
        const formData = await request.formData();
        const { supabase } = locals;
        const username = formData.get('username');
        const gdrive_folder_id = formData.get('gdrive_folder_id');
        const member_id = formData.get('member_id');
        const member_name = formData.get('member_name');
        const question = formData.get('question');
        const answer = formData.get('answer');
        const imageFile = formData.get('image');

        logger.debug('Google Drive Folder ID:', gdrive_folder_id);

        if (
            typeof username !== 'string' ||
            typeof gdrive_folder_id !== 'string' ||
            typeof member_id !== 'string' ||
            typeof member_name !== 'string' ||
            typeof question !== 'string' ||
            typeof answer !== 'string' ||
            !imageFile ||
            !(imageFile instanceof File)
        ) {
            logger.error('Validation error: Missing or invalid required fields');
            return new Response(JSON.stringify({ error: 'Missing or invalid required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Convert imageFile to a readable stream using Node.js's Readable
        const buffer = await imageFile.arrayBuffer();
        const readableStream = Readable.from(Buffer.from(buffer));

        // Authenticate with Google Drive API
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: requirePrivateEnv('GOOGLE_SERVICE_EMAIL'),
                private_key: requirePrivateEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // Upload image to Google Drive
        const fileMetadata = {
            name: `${username}-${member_name.replace(/\s+/g, '')}`,
            parents: [gdrive_folder_id],
        };

        const media = {
            mimeType: imageFile.type,
            body: readableStream,
        };

        let fileId = null,
            fileUrl = null; // Initialize variables

        try {
            logger.debug('Uploading file to Google Drive with metadata:', fileMetadata);
            const driveResponse = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id',
            });
            fileId = driveResponse.data.id;
            fileUrl = `https://drive.google.com/uc?id=${fileId}`;
            logger.debug('File uploaded successfully. File ID:', fileId);
        } catch (driveError) {
            logger.error('Google Drive upload failed:', driveError instanceof Error ? driveError.message : driveError);

            return new Response(
                JSON.stringify({ error: 'Error uploading to Google Drive. Please check logs for details.' }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // Save data to Supabase
        logger.debug('Saving data to Supabase for applicant:', uuid);
        try {
            const { data, error } = await supabase
                .from('sigsheet') // table name in supabase
                .insert({
                    question,
                    answer,
                    image_url: fileUrl, // Use the correct file URL
                    applicant_id: uuid,
                    member_id,
                    member_name,
                });

            if (error) {
                if (error.message.includes('unique_applicantid_signatoryname_pair')) {
                    throw new Error("You have already have this co-applicant's signature. Try someone else");
                }
                logger.error('Error inserting into Supabase:', error);
                throw new Error(error.message);
            }

            logger.debug('Data successfully saved to Supabase');
            return new Response(JSON.stringify({ message: 'Data saved successfully', data }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (supabaseError) {
            logger.error('Error saving to Supabase:', supabaseError);
            return new Response(JSON.stringify({ error: `${supabaseError}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (err) {
        logger.error('Unexpected error:', err);
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

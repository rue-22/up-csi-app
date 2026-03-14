import { PUBLIC_GOOGLE_PRIVATE_KEY, PUBLIC_GOOGLE_SERVICE_EMAIL } from '$env/static/public';
import { Readable } from 'stream';
import { google } from 'googleapis';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    console.log('Received POST request at /api/upload');

    // Add debugging logs to verify environment variables
    console.log('Google API Credentials:', {
        client_email: PUBLIC_GOOGLE_SERVICE_EMAIL,
        private_key: PUBLIC_GOOGLE_PRIVATE_KEY ? 'Provided' : 'Not Provided',
    });

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

        // Add debugging logs to verify folder permissions
        console.log('Google Drive Folder ID:', gdrive_folder_id);

        if (!question || !answer || !imageFile || !(imageFile instanceof File)) {
            console.error('Validation error: Missing or invalid required fields');
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
                client_email: PUBLIC_GOOGLE_SERVICE_EMAIL,
                private_key: PUBLIC_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // Upload image to Google Drive
        const fileMetadata = {
            name: `${String(username)}-${String(member_name).replace(/\s+/g, '')}`,
            parents: [String(gdrive_folder_id)],
        };

        const media = {
            mimeType: imageFile.type,
            body: readableStream,
        };

        let fileId = null,
            fileUrl = null; // Initialize variables

        try {
            console.log('Uploading file to Google Drive with metadata:', fileMetadata);
            console.log('File mimeType:', media.mimeType);

            console.log('driveResponse start');
            const driveResponse = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id',
            });
            console.log('driveResponse success');
            fileId = driveResponse.data.id;
            fileUrl = `https://drive.google.com/uc?id=${fileId}`;
            console.log('File uploaded successfully. File ID:', fileId);
        } catch (driveError) {
            console.error('Error uploading to Google Drive:', {
                message: driveError instanceof Error ? driveError.message : 'Unknown error',
                errors:
                    driveError instanceof Error && 'errors' in driveError
                        ? driveError.errors
                        : 'No additional error details',
                stack: driveError instanceof Error ? driveError.stack : 'No stack trace available',
            });

            // Additional debugging for credentials and folder permissions
            console.error('Google Drive API credentials:', {
                client_email: PUBLIC_GOOGLE_SERVICE_EMAIL,
                private_key: PUBLIC_GOOGLE_PRIVATE_KEY ? 'Provided' : 'Not Provided',
            });
            console.error('Folder ID:', fileMetadata.parents);

            // Log the media object details
            console.error('Media object details:', {
                mimeType: media.mimeType,
                bodyType: typeof media.body,
            });

            return new Response(
                JSON.stringify({ error: 'Error uploading to Google Drive. Please check logs for details.' }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // Save data to Supabase
        console.log('Starting to save data to Supabase with the following details:', {
            question,
            answer,
            image_url: fileUrl, // Use the correct file URL
            applicant_id: uuid,
            member_id,
            member_name,
        });

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
                console.error('Error inserting into Supabase:', error);
                throw new Error(error.message);
            }

            console.log('Data successfully saved to Supabase:', {
                question,
                answer,
                image_url: fileUrl,
                applicant_id: uuid,
                member_id,
                member_name,
            });

            return new Response(JSON.stringify({ message: 'Data saved successfully', data }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (supabaseError) {
            console.error('Error saving to Supabase:', supabaseError);
            return new Response(JSON.stringify({ error: `${supabaseError}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

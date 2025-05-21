import type { RequestHandler } from '@sveltejs/kit';


export const POST: RequestHandler = async ({ request }) => {

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
        return new Response(JSON.stringify({ message: 'No file uploaded' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        console.log('Starting convertion...');
        //const result = await convertDocument(file);

        // const response = await fetch('http://127.0.0.1:8000/api/convert', {//modify this to the server in VM

        const response = await fetch('https://scideep.imd.ufrn.br/dth/api/convert', {//modify this to the server in VM
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Conversion failed: ${response.status}`);
        }

        console.log('Convertion completed.');

        const data = await response.json();
        //return data.html; //convertedHtml = data.html;

        const result = data.html; //convertedHtml = data.html;
        return new Response(
            JSON.stringify({
                result
                // src: `https://aulazero.xyz/${fileName}`
                // ... and any additional fields you want to store, such as width, height, color, extension, etc
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (err) {
        console.error('Upload failed:', err);
        return new Response(
            JSON.stringify({ message: 'Failed to convert docx', error: (err as Error).message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};

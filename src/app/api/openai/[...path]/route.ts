import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Use nodejs runtime for better streaming support if needed, though edge works too.

const OPENAI_API_HOST = 'https://api.openai.com/v1';

async function handler(
    req: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = params.path.join('/');
    const url = `${OPENAI_API_HOST}/${path}`;

    const body = req.method !== 'GET' ? await req.text() : undefined;

    try {
        const upstreamResponse = await fetch(url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                // Pass organization if needed: 'OpenAI-Organization': process.env.OPENAI_ORG_ID,
            },
            body: body,
            // Important: Forward duplex stream for things like file uploads if using newer Node versions,
            // but strictly for text/json proxying, standard body is fine.
            // For the openai package, it often sends JSON.
        });

        // Check if the response is a stream
        if (upstreamResponse.headers.get('transfer-encoding') === 'chunked' || upstreamResponse.headers.get('content-type')?.includes('text/event-stream')) {
            return new Response(upstreamResponse.body, {
                status: upstreamResponse.status,
                headers: {
                    'Content-Type': upstreamResponse.headers.get('Content-Type') || 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // For non-streaming responses
        const data = await upstreamResponse.json();
        return NextResponse.json(data, { status: upstreamResponse.status });

    } catch (error: any) {
        console.error('OpenAI Proxy Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };

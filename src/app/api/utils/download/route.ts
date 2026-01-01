import {NextRequest, NextResponse} from 'next/server';
import {withApi} from '@/lib/utils/withApi';
import {signGet} from '@/lib/services/r2';

async function handler(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');
  const contentType = searchParams.get('contentType');
  const filename = searchParams.get('filename');

  if (!key) {
    return NextResponse.json({message: 'Missing key'}, {status: 400});
  }

  try {
    const {url} = await signGet({
      key,
      downloadName: filename || undefined,
    });

    // Redirect to the signed URL
    return NextResponse.redirect(url);
  } catch (error: any) {
    return NextResponse.json({message: error.message}, {status: 500});
  }
}

export const GET = withApi(handler, {protected: false});

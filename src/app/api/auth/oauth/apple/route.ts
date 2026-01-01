import {NextRequest} from 'next/server';
import {dbService} from '@/lib/services/db';
import {withApi} from '@/lib/utils/withApi';
import jwt from 'jsonwebtoken';
import {UserRole} from '@/lib/types/models/user';

interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  c_hash: string;
  email: string;
  email_verified: string;
  is_private_email: string;
  auth_time: number;
  nonce_supported: boolean;
}

async function handler(request: NextRequest) {
  const {identityToken, user: appleUser} = await request.json();

  if (!identityToken) {
    const error = new Error('Missing identityToken');
    (error as any).code = 400;
    throw error;
  }

  // Verify Apple token (in production, verify with Apple's API)
  // For now, we decode without verification - in production use apple-signin-auth
  const decoded = jwt.decode(identityToken) as AppleTokenPayload | null;

  if (!decoded || !decoded.sub) {
    const error = new Error('Invalid token');
    (error as any).code = 401;
    throw error;
  }

  let user = await dbService.user.findOne({appleId: decoded.sub});

  if (!user) {
    const email = decoded.email || appleUser?.email || `apple_${decoded.sub}@privaterelay.appleid.com`;
    const firstName = appleUser?.name?.firstName || '';
    const lastName = appleUser?.name?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || email;

    user = await dbService.user.create({
      appleId: decoded.sub,
      email,
      fullName,
      role: UserRole.User,
    });
  }

  // Generate system access token
  const accessToken = jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      photo: user.photo,
    },
    process.env.NEXTAUTH_SECRET || 'secret',
    {expiresIn: '7d'}
  );

  return {
    accessToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      photo: user.photo,
    },
  };
}

export const POST = withApi(handler);

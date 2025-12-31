import { NextRequest } from 'next/server'
import { dbService } from '@/lib/services/db'
import { withApi } from '@/lib/utils/withApi'
import jwt from 'jsonwebtoken'
import { UserRole } from '@/lib/types/models/user'

interface GoogleTokenPayload {
  iss: string
  azp: string
  aud: string
  sub: string
  email: string
  email_verified: boolean
  at_hash: string
  name: string
  picture: string
  given_name: string
  family_name: string
  locale: string
  iat: number
  exp: number
}

/**
 * POST /api/auth/oauth/google
 *
 * Receives Google OAuth token from mobile client and exchanges it for system access token.
 *
 * Environment variables required:
 * - NEXTAUTH_SECRET: JWT signing secret
 * - GOOGLE_OAUTH_CLIENT_ID: Google OAuth client ID (optional, for verification)
 *
 * Request body:
 * {
 *   "idToken": "google_id_token_from_client"
 * }
 *
 * Response:
 * {
 *   "data": {
 *     "accessToken": "system_jwt_token",
 *     "user": { id, email, fullName, role, photo }
 *   },
 *   "code": 200,
 *   "message": "OK"
 * }
 */
async function handler(request: NextRequest) {
  const { idToken } = await request.json()

  if (!idToken) {
    const error = new Error('Missing idToken')
    ;(error as any).code = 400
    throw error
  }

  // Verify Google token (in production, verify with Google's API)
  // For now, we decode without verification - in production use google-auth-library
  // You can use GOOGLE_OAUTH_CLIENT_ID env var for verification
  const decoded = jwt.decode(idToken) as GoogleTokenPayload | null

  if (!decoded || !decoded.sub || !decoded.email) {
    const error = new Error('Invalid token')
    ;(error as any).code = 401
    throw error
  }

  // Find or create user
  let user = await dbService.user.findOne({ googleId: decoded.sub })

  if (!user) {
    // Create new user
    user = await dbService.user.create({
      googleId: decoded.sub,
      email: decoded.email,
      fullName: decoded.name || '',
      photo: decoded.picture || '',
      role: UserRole.User,
    })
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
    { expiresIn: '7d' },
  )

  return {
    accessToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      photo: user.photo,
    },
  }
}

export const POST = withApi(handler)

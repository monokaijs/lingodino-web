import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { UserRole } from '@/lib/types/models/user'

async function getHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await dbService.user.findById(id)
  if (!user) {
    const error = new Error('User not found')
    ;(error as any).code = 404
    throw error
  }

  // Remove sensitive fields
  const userObj = user.toObject()
  delete userObj.googleId
  delete userObj.appleId

  return userObj
}

async function putHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  const user = await dbService.user.findById(id)
  if (!user) {
    const error = new Error('User not found')
    ;(error as any).code = 404
    throw error
  }

  // Only allow updating specific fields
  const allowedFields = ['fullName', 'email', 'role', 'photo']
  const updateData: any = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'role' && !Object.values(UserRole).includes(body[field])) {
        const error = new Error('Invalid role value')
        ;(error as any).code = 400
        throw error
      }
      updateData[field] = body[field]
    }
  }

  const updatedUser = await dbService.user.update({ _id: id }, { $set: updateData }, { new: true })

  if (!updatedUser) {
    const error = new Error('Failed to update user')
    ;(error as any).code = 500
    throw error
  }

  // Remove sensitive fields
  const userObj = updatedUser.toObject()
  delete userObj.googleId
  delete userObj.appleId

  return userObj
}

async function deleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await dbService.user.findById(id)
  if (!user) {
    const error = new Error('User not found')
    ;(error as any).code = 404
    throw error
  }

  await dbService.user.deleteOne(id)

  return { message: 'User deleted successfully' }
}

export const GET = withApi(getHandler, { protected: true, roles: [UserRole.Admin] })
export const PUT = withApi(putHandler, { protected: true, roles: [UserRole.Admin] })
export const DELETE = withApi(deleteHandler, { protected: true, roles: [UserRole.Admin] })

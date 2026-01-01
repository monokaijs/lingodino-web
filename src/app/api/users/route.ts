import {NextRequest} from 'next/server';
import {withApi} from '@/lib/utils/withApi';
import {dbService} from '@/lib/services/db';
import {UserRole} from '@/lib/types/models/user';

async function getHandler(request: NextRequest) {
  const {searchParams} = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';

  const filter: any = {};
  if (search) {
    filter.$or = [{fullName: {$regex: search, $options: 'i'}}, {email: {$regex: search, $options: 'i'}}];
  }
  if (role && Object.values(UserRole).includes(role as UserRole)) {
    filter.role = role;
  }

  const result = await dbService.user.paginate(filter, {
    page,
    limit,
    sort: {createdAt: -1},
    select: '-googleId -appleId', // Exclude sensitive fields
  });

  return {
    data: result.docs,
    pagination: result,
  };
}

export const GET = withApi(getHandler, {protected: true, roles: [UserRole.Admin]});

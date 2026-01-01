import {NextRequest, NextResponse} from 'next/server';
import {decode, JWT} from 'next-auth/jwt';
import {dbService} from '@/lib/services/db';
import {UserRole} from '@/lib/types/models/user';
import {authDecode} from '@/lib/utils/authDecode';

interface WithApiOptions {
  preventDb?: boolean;
  roles?: UserRole[];
  protected?: boolean;
}

function unauthorized() {
  return NextResponse.json({data: null, pagination: undefined, code: 401, message: 'Please login.'}, {status: 401});
}

function forbidden() {
  return NextResponse.json(
    {data: null, pagination: undefined, code: 403, message: "You don't have permission to access this resource."},
    {status: 403}
  );
}

function buildSuccessResponse(result: any) {
  const rawData = result?.data ?? result ?? null;
  const rawPagination = result?.pagination;

  const pagination = rawPagination ? {...rawPagination, docs: undefined} : undefined;

  let message = 'OK';
  let data = rawData;
  if (data && typeof data === 'object' && 'message' in data) {
    message = (data as any).message ?? message;
    const {message: _omit, ...rest} = data as any;
    data = rest;
  }

  return NextResponse.json(
    {
      data,
      pagination,
      code: 200,
      message,
    },
    {status: 200}
  );
}

function buildErrorResponse(error: any) {
  const statusCode = error?.code ?? error?.statusCode ?? 500;
  const message = error?.message || 'Internal Server Error';

  return NextResponse.json(
    {
      data: null,
      pagination: undefined,
      code: statusCode,
      message,
    },
    {status: statusCode}
  );
}

export function withApi<T>(
  handler: (request: NextRequest, context: any, decoded?: JWT) => Promise<T> | T,
  {roles = [], preventDb = false, protected: isProtected = false}: WithApiOptions = {}
) {
  return async function wrappedHandler(request: NextRequest, context: any): Promise<Response> {
    try {
      if (!preventDb) await dbService.connect();
      const authHeader = request.headers.get('Authorization');
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : undefined;

      const decoded = await authDecode(bearerToken);

      if (isProtected) {
        if (!decoded) return unauthorized();

        if (roles.length > 0) {
          const userRole = decoded.role as UserRole | undefined;
          if (!userRole || !roles.includes(userRole)) {
            return forbidden();
          }
        }
      }

      const result = await handler(request, context, decoded!);

      if (result instanceof NextResponse) return result;

      // Otherwise, wrap consistently
      return buildSuccessResponse(result);
    } catch (error: any) {
      return buildErrorResponse(error);
    }
  };
}

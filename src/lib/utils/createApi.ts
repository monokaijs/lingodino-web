import { NextRequest, NextResponse } from "next/server";
import type { JWT } from "next-auth/jwt";
import { getToken, decode } from "next-auth/jwt";
import { z } from "zod";
import { useMutation, UseMutationOptions, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { ApiRoutes } from "@/lib/types/routes";
import { dbService } from "@/lib/services/db";
import { UserRole } from "@/lib/types/models/user";

export type ApiEnvelope<T = any, P = any> = { data: T | null; pagination?: P; code: number; message: string };

// Handler can return either:
// 1. Just the data: R
// 2. With metadata: { data: R, message?: string, code?: number, pagination?: any }
export type ApiHandlerResponse<R> = R | {
  data?: R;
  message?: string;
  code?: number;
  pagination?: any;
};

type ApiSchemas = { params?: z.ZodTypeAny; query?: z.ZodTypeAny; body?: z.ZodTypeAny };

type CreateOpts<S extends ApiSchemas | undefined = undefined> = {
  preventDb?: boolean;
  roles?: UserRole[];
  protected?: boolean;
  schemas?: S;
};

type ApiRouteValue = (typeof ApiRoutes)[keyof typeof ApiRoutes];

type _ExtractParamTokens<S extends string> =
  S extends `${string}:${infer Rest}`
    ? Rest extends `${infer Token}/${infer Tail}`
      ? Token | _ExtractParamTokens<Tail>
      : Rest
    : never;
type _StripOptional<T extends string> = T extends `${infer N}?` ? N : T;
type _OptionalToken<S extends string> =
  S extends `${string}:${infer Rest}`
    ? Rest extends `${infer Token}/${infer Tail}`
      ? Token | _OptionalToken<Tail>
      : Rest
    : never;

export type ParamNamesFromPath<S extends string> =
  _ExtractParamTokens<S> extends never ? never : _StripOptional<_ExtractParamTokens<S>>;
type OptionalParamNamesFromPath<S extends string> =
  _OptionalToken<S> extends never ? never : (_OptionalToken<S> extends `${infer N}?` ? N : never);
export type PathParams<S extends string> =
  [ParamNamesFromPath<S>] extends [never]
    ? undefined
    : ({} & { [K in Exclude<ParamNamesFromPath<S>, OptionalParamNamesFromPath<S>>]: string } & { [K in OptionalParamNamesFromPath<S>]?: string });

function compilePath(pattern: string) {
  const names: string[] = [];
  const regexSource = pattern.replace(/:([^/]+)/g, (_, token) => {
    names.push(token);
    return "([^/]+)";
  });
  return { names, regex: new RegExp(`^${regexSource}$`) };
}

function matchPath(regex: RegExp, names: string[], pathname: string) {
  const m = pathname.match(regex);
  if (!m) return undefined;
  const values = m.slice(1);
  const out: Record<string, string> = {};
  names.forEach((rawName, i) => {
    const name = rawName.endsWith("?") ? rawName.slice(0, -1) : rawName;
    out[name] = decodeURIComponent(values[i]);
  });
  return out;
}

function buildPathFromPattern(pattern: string, params?: Record<string, string>) {
  return pattern.replace(/:([^/]+)/g, (_, token) => {
    const name = token.endsWith("?") ? token.slice(0, -1) : token;
    const val = params?.[name];
    if (val == null) {
      if (token.endsWith("?")) throw new Error(`Optional param '${name}' missing — pass it or adjust route.`);
      throw new Error(`Missing param ${name}`);
    }
    return encodeURIComponent(val);
  });
}

function makeQueryKey(path: string, params?: Record<string, any>, query?: Record<string, any>) {
  const sortedQuery = query ? Object.keys(query).sort().reduce<Record<string, any>>((acc, k) => {
    acc[k] = query[k];
    return acc;
  }, {}) : undefined;
  return [path, params ?? null, sortedQuery ?? null] as const;
}

async function formDataToObject(fd: FormData) {
  const out: Record<string, any> = {};
  for (const [k, v] of fd.entries()) {
    if (Object.prototype.hasOwnProperty.call(out, k)) {
      if (Array.isArray(out[k])) out[k].push(v);
      else out[k] = [out[k], v];
    } else out[k] = v;
  }
  return out;
}

function isFormDataValue(v: unknown): v is FormData {
  return !!v && typeof (v as any).append === "function" && typeof (v as any).get === "function";
}

export type ApiRouteContext<P = any, Q = any, B = any> = {
  params: P;
  query: Q;
  data: B;
} & Record<string, any>;

function internalWrapHandler<P = any, Q = any, B = any>(
  rawHandler: (req: NextRequest, ctx: ApiRouteContext<P, Q, B>, decoded?: JWT) => Promise<any> | any,
  opts: CreateOpts,
) {
  return async function wrappedHandler(request: NextRequest, context: any) {
    try {
      if (!opts.preventDb) await dbService.connect();
      const authHeader = request.headers.get("Authorization");
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : undefined;
      let decoded: JWT | null = null;
      if (bearerToken) {
        try {
          decoded = await decode({
            token: bearerToken,
            secret: process.env.NEXTAUTH_SECRET || "the-most-secure-secret-in-the-world",
          });
        } catch {
          decoded = null;
        }
      }
      if (!decoded) {
        try {
          decoded = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET }) as JWT | null;
        } catch {
          decoded = null;
        }
      }
      if (opts.protected) {
        if (!decoded) return NextResponse.json({ data: null, pagination: undefined, code: 401, message: "Please login." }, { status: 401 });
        if (opts.roles && opts.roles.length > 0) {
          const userRole = (decoded as any)?.role as UserRole | undefined;
          if (!userRole || !opts.roles.includes(userRole)) {
            return NextResponse.json({ data: null, pagination: undefined, code: 403, message: "You don't have permission to access this resource." }, { status: 403 });
          }
        }
      }
      const typedContext = context as ApiRouteContext<P, Q, B>;
      const result = await rawHandler(request, typedContext, decoded ?? undefined);
      if (result instanceof NextResponse) return result;

      // Check if result is an object with message, code, or pagination fields
      // If so, extract them and use the rest as data
      let data: any;
      let message = "OK";
      let code = 200;
      let pagination: any = undefined;

      if (result && typeof result === "object" && !Array.isArray(result)) {
        // Check if it has ApiResponse-like fields
        if ("message" in result || "code" in result || "pagination" in result) {
          message = (result as any).message ?? message;
          code = (result as any).code ?? code;
          pagination = (result as any).pagination;

          // Extract data: if there's a 'data' field, use it; otherwise use the rest
          if ("data" in result) {
            data = (result as any).data;
          } else {
            // Remove message, code, pagination from result and use the rest as data
            const { message: _m, code: _c, pagination: _p, ...rest } = result as any;
            data = Object.keys(rest).length > 0 ? rest : result;
          }
        } else {
          // No special fields, treat the whole result as data
          data = result;
        }
      } else {
        // Primitive value or array, use as-is
        data = result;
      }

      return NextResponse.json({
        data,
        pagination,
        code,
        message
      }, { status: code });
    } catch (error: any) {
      const statusCode = error?.code ?? error?.statusCode ?? 500;
      const message = error?.message || "Internal Server Error";
      return NextResponse.json({ data: null, pagination: undefined, code: statusCode, message }, { status: statusCode });
    }
  };
}

export function createApi<
  Route extends ApiRouteValue,
  Schemas extends ApiSchemas | undefined = undefined,
  R = any,
>(
  route: Route,
  handler: (
    req: NextRequest,
    ctx: ApiRouteContext<
      Schemas extends { params: z.ZodTypeAny } ? z.infer<Schemas["params"]> : PathParams<Route>,
      Schemas extends { query: z.ZodTypeAny } ? z.infer<Schemas["query"]> : undefined,
      Schemas extends { body: z.ZodTypeAny } ? z.infer<Schemas["body"]> : undefined
    >,
    decoded?: JWT,
  ) => Promise<ApiHandlerResponse<R>> | ApiHandlerResponse<R>,
  createOpts?: CreateOpts<Schemas>,
) {
  const apiOpts = createOpts ?? {} as CreateOpts<Schemas>;
  const pathPattern = route as string;
  const { names, regex } = compilePath(pathPattern);

  type PType = Schemas extends { params: z.ZodTypeAny } ? z.infer<Schemas["params"]> : PathParams<Route>;
  type QType = Schemas extends { query: z.ZodTypeAny } ? z.infer<Schemas["query"]> : undefined;
  type BType = Schemas extends { body: z.ZodTypeAny } ? z.infer<Schemas["body"]> : undefined;

  const rawHandler = async (req: NextRequest, context: ApiRouteContext<PType, QType, BType>, decoded?: JWT) => {
    let paramsObj: Record<string, string> | undefined;
    if (context?.params && Object.keys(context.params as any).length > 0) {
      paramsObj = Object.fromEntries(Object.entries(context.params as any).map(([k, v]) => [k, Array.isArray(v) ? v.join("/") : String(v)]));
    } else {
      const pathname = req.nextUrl?.pathname ?? new URL(req.url).pathname;
      paramsObj = matchPath(regex, names, pathname);
    }
    if (names.length > 0 && !paramsObj) throw { code: 400, message: "Missing path parameters" };

    const url = req.nextUrl ?? new URL(req.url);
    const rawQuery: Record<string, any> = {};
    url.searchParams.forEach((v, k) => {
      if (rawQuery[k] !== undefined) {
        if (Array.isArray(rawQuery[k])) rawQuery[k].push(v);
        else rawQuery[k] = [rawQuery[k], v];
      } else rawQuery[k] = v;
    });

    let rawBody: any = undefined;
    const contentType = req.headers.get("content-type") ?? "";
    const isFormDataHeader = contentType.startsWith("multipart/form-data") || contentType.startsWith("application/x-www-form-urlencoded");
    try {
      if (isFormDataHeader) {
        const fd = await req.formData().catch(() => undefined);
        if (fd) rawBody = await formDataToObject(fd);
      } else if (["POST", "PUT", "PATCH", "DELETE"].includes((req.method || "GET").toUpperCase())) {
        rawBody = await req.json().catch(() => undefined);
      }
    } catch {
      rawBody = undefined;
    }

    const schemas = apiOpts.schemas;

    let parsedParams: PType;
    if (schemas?.params) {
      const parsed = schemas.params.safeParse(paramsObj ?? {});
      if (!parsed.success) throw { code: 400, message: "Invalid params", details: parsed.error.format() };
      parsedParams = parsed.data as PType;
    } else parsedParams = (paramsObj ?? {}) as unknown as PType;

    let parsedQuery: QType;
    if (schemas?.query) {
      const parsed = schemas.query.safeParse(rawQuery);
      if (!parsed.success) throw { code: 400, message: "Invalid query", details: parsed.error.format() };
      parsedQuery = parsed.data as QType;
    } else parsedQuery = rawQuery as unknown as QType;

    let parsedBody: BType;
    if (schemas?.body) {
      const parsed = schemas.body.safeParse(rawBody);
      if (!parsed.success) throw { code: 400, message: "Invalid body", details: parsed.error.format() };
      parsedBody = parsed.data as BType;
    } else parsedBody = rawBody as unknown as BType;

    context.params = parsedParams;
    context.query = parsedQuery;
    context.data = parsedBody;

    const r = await handler(req, context, decoded);
    return r as R;
  };

  const handlerWrapped = internalWrapHandler<PType, QType, BType>(rawHandler as any, apiOpts as any);

  type CallOpts = {
    method?: string;
    params?: PType;
    query?: QType;
    body?: BType | FormData;
    headers?: Record<string, string>;
    base?: string;
  };

  async function call(opts: CallOpts = {} as CallOpts): Promise<ApiEnvelope<R>> {
    if (names.length > 0) {
      const required = names.filter(n => !n.endsWith("?")).map(n => n);
      const missing = required.filter(n => !(opts.params && (opts.params as any)[n] !== undefined));
      if (missing.length > 0) throw new Error(`Missing path params: ${missing.join(", ")}`);
    }

    const schemas = apiOpts.schemas;
    if (schemas?.params && opts.params) {
      const parsed = schemas.params.safeParse(opts.params);
      if (!parsed.success) throw parsed.error;
      opts.params = parsed.data as any;
    }
    if (schemas?.query && opts.query) {
      const parsed = schemas.query.safeParse(opts.query);
      if (!parsed.success) throw parsed.error;
      opts.query = parsed.data as any;
    }

    const isForm = isFormDataValue(opts.body);
    if (schemas?.body && opts.body && !isForm) {
      const parsed = schemas.body.safeParse(opts.body);
      if (!parsed.success) throw parsed.error;
      opts.body = parsed.data as any;
    }

    const method = (opts.method ?? "GET").toUpperCase();
    const base = opts.base ?? (typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_BASE ?? "");
    const path = buildPathFromPattern(pathPattern, opts.params as any);
    const url = new URL(`${base}${path}`, base || location.origin);

    if (opts.query) {
      Object.entries(opts.query as Record<string, any>).forEach(([k, v]) => {
        if (v == null) return;
        if (Array.isArray(v)) v.forEach(x => url.searchParams.append(k, String(x)));
        else url.searchParams.append(k, String(v));
      });
    }

    const headers: Record<string, string> = { ...(opts.headers ?? {}) };

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token && !headers["Authorization"]) headers["Authorization"] = `Bearer ${token}`;
    }

    let bodyToSend: BodyInit | undefined;
    if (isFormDataValue(opts.body)) bodyToSend = opts.body as FormData;
    else if (opts.body !== undefined) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      bodyToSend = JSON.stringify(opts.body);
    }

    const res = await fetch(url.toString(), { method, headers, body: bodyToSend, credentials: "include" });
    const json = await res.json().catch(() => ({ data: null, message: "Invalid JSON", code: res.status }));
    if (!res.ok) throw json;
    return json as ApiEnvelope<R>;
  }

  function createHooks() {
    const apiLike = { path: pathPattern, call: call as any };

    type CallOptsLocal = {
      method?: string;
      params?: Record<string, any>;
      query?: Record<string, any>;
      body?: any | FormData;
      headers?: Record<string, string>;
      base?: string;
    };

    // Additional options for mutation (excluding body/data)
    type MutationOptions = {
      method?: string;
      params?: PType;
      query?: QType;
      headers?: Record<string, string>;
      base?: string;
    };

    function useApiQuery<TQueryKeyParams extends { params?: Record<string, any>; query?: Record<string, any> } = {}>(
      keyParams?: TQueryKeyParams,
      options?: UseQueryOptions<ApiEnvelope<R>, unknown, ApiEnvelope<R>, readonly unknown[]>
    ) {
      const params = (keyParams as any)?.params;
      const query = (keyParams as any)?.query;
      const key = makeQueryKey(apiLike.path, params, query);
      return useQuery<ApiEnvelope<R>, unknown, ApiEnvelope<R>, readonly unknown[]>({
        queryKey: key,
        queryFn: async () => apiLike.call({ method: "GET", params, query }),
        ...options,
      });
    }

    // Mutation only takes data (inferred from body schema)
    function useApiMutation(
      options?: UseMutationOptions<ApiEnvelope<R>, unknown, BType, unknown>
    ) {
      const mutationFn = async (data: BType) => {
        return await call({
          method: "POST",
          body: data
        });
      };

      return useMutation<ApiEnvelope<R>, unknown, BType, unknown>({
        mutationFn,
        ...options,
      });
    }

    function queryKey(params?: Record<string, any>, query?: Record<string, any>) {
      return makeQueryKey(pathPattern, params, query);
    }

    function invalidate(queryClient?: ReturnType<typeof useQueryClient>, params?: Record<string, any>, query?: Record<string, any>) {
      const qc = queryClient ?? useQueryClient();
      return qc.invalidateQueries(makeQueryKey(pathPattern, params, query) as any);
    }

    async function prefetch(client: ReturnType<typeof useQueryClient>, params?: Record<string, any>, query?: Record<string, any>) {
      const key = makeQueryKey(pathPattern, params, query) as any;
      return client.prefetchQuery({
        queryKey: key,
        queryFn: async () => call({ method: "GET", params: params as any, query: query as any }),
      } as any);
    }

    return { useQuery: useApiQuery, useMutation: useApiMutation, queryKey, invalidate, prefetch };
  }

  return {
    path: pathPattern,
    handler: handlerWrapped,
    call,
    ...createHooks(),
  } as const;
}

export function createTypedApi<R>() {
  return <
    Route extends ApiRouteValue,
    Schemas extends ApiSchemas | undefined = undefined,
  >(
    route: Route,
    handler: (
      req: NextRequest,
      ctx: ApiRouteContext<
        Schemas extends { params: z.ZodTypeAny } ? z.infer<Schemas["params"]> : PathParams<Route>,
        Schemas extends { query: z.ZodTypeAny } ? z.infer<Schemas["query"]> : undefined,
        Schemas extends { body: z.ZodTypeAny } ? z.infer<Schemas["body"]> : undefined
      >,
      decoded?: JWT,
    ) => Promise<ApiHandlerResponse<R>> | ApiHandlerResponse<R>,
    createOpts?: CreateOpts<Schemas>,
  ) => createApi<Route, Schemas, R>(route, handler, createOpts);
}

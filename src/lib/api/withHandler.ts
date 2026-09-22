import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { badRequest, HttpError, unauthorized } from '@/lib/api/httpError';
import { logger } from '@/lib/logger';
import type { NextRequest } from 'next/server';
import type { ZodType } from 'zod';

/**
 * 모든 요청이 통과하는 단 하나의 문.
 *
 *  1. 세션 확인 — 없으면 401
 *  2. **테넌트 키를 세션에서만 주입** — householdId 를 요청에서 받지 않는다
 *  3. zod 파싱 — 실패 시 400 + fieldErrors (react-hook-form 에 그대로 꽂힌다)
 *  4. 에러 → HTTP 매핑
 *
 * 2번이 이 앱의 최대 보안 지점이다. 핸들러 재량에 맡기지 않고 컨텍스트로 강제한다.
 */
export interface RequestContext {
  userId: string;
  email: string;
  householdId: string;
  memberId: string;
}

/** 아직 가구가 없는 사용자(온보딩 중)도 통과해야 하는 요청용. */
export interface PreOnboardingContext {
  userId: string;
  email: string;
  householdId: string | null;
  memberId: string | null;
}

interface Schemas<TBody, TQuery, TParams> {
  body?: ZodType<TBody>;
  query?: ZodType<TQuery>;
  params?: ZodType<TParams>;
}

interface Parsed<TBody, TQuery, TParams> {
  body: TBody;
  query: TQuery;
  params: TParams;
  request: NextRequest;
}

type RouteArgs = { params?: Promise<Record<string, string | string[]>> };

async function parse<TBody, TQuery, TParams>(
  request: NextRequest,
  args: RouteArgs,
  schemas: Schemas<TBody, TQuery, TParams>,
): Promise<Parsed<TBody, TQuery, TParams>> {
  const fieldErrors: Record<string, string> = {};

  const runSchema = <T>(schema: ZodType<T> | undefined, value: unknown, prefix: string): T => {
    if (!schema) return undefined as T;

    const result = schema.safeParse(value);
    if (result.success) return result.data;

    collectFieldErrors(result.error, fieldErrors, prefix);

    return undefined as T;
  };

  const rawParams = args.params ? await args.params : {};
  const params = runSchema(schemas.params, rawParams, '');
  const query = runSchema(schemas.query, Object.fromEntries(request.nextUrl.searchParams), '');

  let body = undefined as TBody;
  if (schemas.body) {
    let raw: unknown = undefined;
    try {
      raw = await request.json();
    } catch {
      throw badRequest('요청 본문을 읽을 수 없습니다.');
    }
    body = runSchema(schemas.body, raw, '');
  }

  if (Object.keys(fieldErrors).length > 0) throw badRequest('입력값을 확인해 주세요.', fieldErrors);

  return { body, query, params, request };
}

function collectFieldErrors(error: ZodError, target: Record<string, string>, prefix: string) {
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? `${prefix}${issue.path.join('.')}` : prefix || '_';
    // 같은 필드에 여러 문제가 있으면 첫 번째만 보여준다 — 폼은 한 번에 하나씩 고친다.
    target[key] ??= issue.message;
  }
}

function toResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { code: error.code, message: error.message, fieldErrors: error.fieldErrors },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    collectFieldErrors(error, fieldErrors, '');

    return Response.json({ code: 'VALIDATION', message: '입력값을 확인해 주세요.', fieldErrors }, { status: 400 });
  }

  // 예상 못 한 오류는 서버에만 남기고 바깥에는 내용을 흘리지 않는다.
  logger.error('처리하지 못한 오류', error);

  return Response.json({ code: 'INTERNAL', message: '오류가 발생했습니다.' }, { status: 500 });
}

export function withHandler<TBody = undefined, TQuery = undefined, TParams = undefined>(
  schemas: Schemas<TBody, TQuery, TParams>,
  handler: (ctx: RequestContext, parsed: Parsed<TBody, TQuery, TParams>) => Promise<unknown>,
) {
  return async (request: NextRequest, args: RouteArgs = {}): Promise<Response> => {
    try {
      const session = await auth();
      const user = session?.user;
      if (!user?.id || !user.email) throw unauthorized();
      if (!user.householdId || !user.memberId) {
        throw new HttpError('FORBIDDEN', '가구 설정을 먼저 마쳐 주세요.');
      }

      const parsed = await parse(request, args, schemas);
      const result = await handler(
        { userId: user.id, email: user.email, householdId: user.householdId, memberId: user.memberId },
        parsed,
      );

      if (result instanceof Response) return result;
      if (result === undefined) return new Response(null, { status: 204 });

      return Response.json(result);
    } catch (error) {
      return toResponse(error);
    }
  };
}

/** 온보딩처럼 가구가 아직 없는 상태에서도 불려야 하는 요청. */
export function withPreOnboardingHandler<TBody = undefined, TQuery = undefined, TParams = undefined>(
  schemas: Schemas<TBody, TQuery, TParams>,
  handler: (ctx: PreOnboardingContext, parsed: Parsed<TBody, TQuery, TParams>) => Promise<unknown>,
) {
  return async (request: NextRequest, args: RouteArgs = {}): Promise<Response> => {
    try {
      const session = await auth();
      const user = session?.user;
      if (!user?.id || !user.email) throw unauthorized();

      const parsed = await parse(request, args, schemas);
      const result = await handler(
        { userId: user.id, email: user.email, householdId: user.householdId, memberId: user.memberId },
        parsed,
      );

      if (result instanceof Response) return result;
      if (result === undefined) return new Response(null, { status: 204 });

      return Response.json(result);
    } catch (error) {
      return toResponse(error);
    }
  };
}

/** 로그인 전에 열려 있어야 하는 요청(회원가입). 세션을 보지 않는다. */
export function withPublicHandler<TBody = undefined, TQuery = undefined, TParams = undefined>(
  schemas: Schemas<TBody, TQuery, TParams>,
  handler: (parsed: Parsed<TBody, TQuery, TParams>) => Promise<unknown>,
) {
  return async (request: NextRequest, args: RouteArgs = {}): Promise<Response> => {
    try {
      const parsed = await parse(request, args, schemas);
      const result = await handler(parsed);

      if (result instanceof Response) return result;
      if (result === undefined) return new Response(null, { status: 204 });

      return Response.json(result);
    } catch (error) {
      return toResponse(error);
    }
  };
}

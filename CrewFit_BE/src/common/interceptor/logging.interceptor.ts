import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

const SECRET_KEYS = ['accessToken', 'refreshToken', 'idToken', 'access_token', 'refresh_token', 'token'];
const MAX = 1000;

function mask(v: unknown): string {
  if (v === undefined) return '';
  const s = JSON.stringify(v, (k, val) => (SECRET_KEYS.includes(k) ? '***' : val));
  return s && s.length > MAX ? s.slice(0, MAX) + '…' : (s ?? '');
}

/** 요청/응답 로깅: url, method, timestamp, (GET) query, (POST/PUT/PATCH/DELETE) body, status, response body */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const start = Date.now();
    const payload = req.method === 'GET' ? mask(req.query) : mask(req.body);
    this.logger.log(`--> ${req.method} ${req.originalUrl} ${new Date(start).toISOString()} ${payload}`);
    return next.handle().pipe(
      tap((body) => {
        this.logger.log(
          `<-- ${req.method} ${req.originalUrl} ${new Date().toISOString()} ${res.statusCode} ${Date.now() - start}ms ${mask(body)}`,
        );
      }),
    );
  }
}

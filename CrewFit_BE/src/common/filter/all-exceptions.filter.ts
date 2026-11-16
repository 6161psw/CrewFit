import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw exception;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : ((body as { message?: unknown }).message ?? body);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') [status, message] = [HttpStatus.CONFLICT, 'Already exists'];
      else if (exception.code === 'P2025') [status, message] = [HttpStatus.NOT_FOUND, 'Not found'];
    }

    const line = `${req.method} ${req.originalUrl} ${status}`;
    if (status >= 500) this.logger.error(line, exception instanceof Error ? exception.stack : String(exception));
    else this.logger.warn(`${line} ${JSON.stringify(message)}`);

    if (res.headersSent) return;
    res.status(status).json({ statusCode: status, message, path: req.originalUrl, timestamp: new Date().toISOString() });
  }
}

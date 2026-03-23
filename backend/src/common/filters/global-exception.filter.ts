import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = req.headers['x-request-id'] as string;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: { field: string; reason: string }[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        code = response;
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const obj = response as Record<string, any>;
        code = obj.code || obj.message || code;
        message = obj.message || message;
        details = obj.details;
      }
    }

    if (status >= 500) {
      this.logger.error({ err: exception, requestId, url: req.url }, 'Unhandled exception');
    }

    res.status(status).json({ status, code, message, requestId, ...(details ? { details } : {}) });
  }
}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        // Handle NestJS validation errors
        const resp = exceptionResponse as Record<string, unknown>;
        if (resp.message) {
          detail = Array.isArray(resp.message)
            ? resp.message.join(', ')
            : String(resp.message);
        } else if (resp.detail) {
          detail = String(resp.detail);
        }
      }
    } else if (exception instanceof Error) {
      // RPC exceptions from microservices come back as plain Error objects
      // with a message property. Check if it looks like a structured error.
      const msg = exception.message;
      try {
        const parsed = JSON.parse(msg);
        if (parsed.statusCode) {
          status = parsed.statusCode;
        }
        if (parsed.message) {
          detail = parsed.message;
        } else if (parsed.detail) {
          detail = parsed.detail;
        }
      } catch {
        detail = msg || 'Internal server error';
        // Check for common patterns to set appropriate status codes
        if (msg.includes('not found') || msg.includes('Not found')) {
          status = HttpStatus.NOT_FOUND;
        } else if (
          msg.includes('unauthorized') ||
          msg.includes('Unauthorized')
        ) {
          status = HttpStatus.UNAUTHORIZED;
        } else if (
          msg.includes('forbidden') ||
          msg.includes('Forbidden')
        ) {
          status = HttpStatus.FORBIDDEN;
        } else if (
          msg.includes('already exists') ||
          msg.includes('duplicate')
        ) {
          status = HttpStatus.CONFLICT;
        }
      }

      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(`Unhandled exception: ${msg}`, exception.stack);
      }
    }

    response.status(status).json({ detail });
  }
}

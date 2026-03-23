import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Wraps all successful responses in a uniform envelope: { data, meta? }
 * Excludes raw responses (streams, buffers) and responses already wrapped.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((responseBody) => {
        // Skip wrapping if response is null/undefined (e.g., 204 No Content)
        if (responseBody === undefined || responseBody === null) return responseBody;

        // Skip if already wrapped
        if (responseBody?.data !== undefined && responseBody?.meta !== undefined) {
          return responseBody;
        }

        return { data: responseBody };
      }),
    );
  }
}

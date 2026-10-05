import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuditLogService } from 'src/audit-logs/audit-logs.service';

interface AuditLogPayload {
  method: string;
  url: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress: string;
  userAgent: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithUser>();
    const response = httpContext.getResponse<Response>();
    const startTime = Date.now();

    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || 'unknown';

    const activeUser: JwtPayload | undefined = request.user;

    return next.handle().pipe(
      tap(() => {
        void this.saveLog(request, response, startTime, activeUser, {
          method,
          originalUrl,
          ip: ip || request.socket.remoteAddress || '127.0.0.1',
          userAgent,
        });
      }),
    );
  }

  private async saveLog(
    _request: RequestWithUser,
    response: Response,
    startTime: number,
    activeUser: JwtPayload | undefined,
    meta: {
      method: string;
      originalUrl: string;
      ip: string;
      userAgent: string;
    },
  ): Promise<void> {
    const responseTimeMs = Date.now() - startTime;
    const statusCode = response.statusCode;

    const logPayload: AuditLogPayload = {
      method: meta.method,
      url: meta.originalUrl,
      statusCode,
      responseTimeMs,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      userId: activeUser?.sub,
      userEmail: activeUser?.email,
      userRole: activeUser?.role,
    };

    try {
      await this.auditLogService.createLog(logPayload);
    } catch (error) {
      console.log('Fail to save Audit Log to MongoDB:', error);
    }
  }
}

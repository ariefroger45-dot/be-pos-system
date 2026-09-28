import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AuditLogDocument } from './schemas/audit-log.schema';
import { AuditLog } from './schemas/audit-log.schema';
import { Model } from 'mongoose';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async createLog(logData: Partial<AuditLog>): Promise<AuditLog> {
    const newLog = new this.auditLogModel(logData);
    return newLog.save();
  }
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true })
  method!: string;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  statusCode!: number;

  @Prop({ required: true })
  responseTimeMs!: number;

  @Prop({ required: true })
  ipAddress!: string;

  @Prop()
  userAgent!: string;

  @Prop()
  userId!: string;

  @Prop()
  userEmail!: string;

  @Prop()
  userRole!: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

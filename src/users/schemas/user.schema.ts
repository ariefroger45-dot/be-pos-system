import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: false, default: 'CASHIER', enum: ['ADMIN', 'CASHIER'] })
  role!: string;

  @Prop({ type: 'ObjectId', ref: 'Outlet' })
  outletId?: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ select: false })
  refreshTokenHash?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

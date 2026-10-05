import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OutletDocument = HydratedDocument<Outlet>;

@Schema({ timestamps: true })
export class Outlet {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true, unique: true })
  code!: string;

  @Prop()
  address?: string;

  @Prop()
  phone?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const OutletSchema = SchemaFactory.createForClass(Outlet);

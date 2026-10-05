import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  title!: string;

  @Prop({ unique: true, sparse: true })
  sku?: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  cost?: number;

  @Prop({ type: Number, default: 0 })
  stock: number | undefined;

  @Prop()
  unit?: string;

  @Prop({ type: 'ObjectId', ref: 'Category' })
  category: Types.ObjectId | undefined;

  @Prop({ default: true })
  isActive!: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

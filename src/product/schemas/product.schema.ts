import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ type: Number, default: 0 })
  stock: number | undefined;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  category: Types.ObjectId | undefined;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductStockDocument = HydratedDocument<ProductStock>;

@Schema({ timestamps: true, collection: 'product_stocks' })
export class ProductStock {
  @Prop({ type: 'ObjectId', ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'Outlet', required: true })
  outletId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  quantity!: number;
}

export const ProductStockSchema = SchemaFactory.createForClass(ProductStock);
ProductStockSchema.index({ productId: 1, outletId: 1 }, { unique: true });

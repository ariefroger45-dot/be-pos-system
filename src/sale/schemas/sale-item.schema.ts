import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SaleItemDocument = HydratedDocument<SaleItem>;

@Schema({ timestamps: true })
export class SaleItem {
  @Prop({ type: 'ObjectId', ref: 'Sale', required: true })
  saleId!: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'Outlet', required: true })
  outletId!: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true })
  titleSnapshot!: string;

  @Prop({ type: Number, required: true, min: 0 })
  priceSnapshot!: number;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  lineTotal!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SaleItemSchema = SchemaFactory.createForClass(SaleItem);
SaleItemSchema.index({ saleId: 1 });
SaleItemSchema.index({ productId: 1 });
SaleItemSchema.index({ outletId: 1, createdAt: -1 });

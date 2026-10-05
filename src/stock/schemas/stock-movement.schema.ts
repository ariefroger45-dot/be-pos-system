import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StockMovementDocument = HydratedDocument<StockMovement>;

export type StockMovementType =
  'STOCK_IN' | 'STOCK_OUT' | 'SALE' | 'ADJUSTMENT';

@Schema({ timestamps: true, collection: 'stock_movements' })
export class StockMovement {
  @Prop({ type: 'ObjectId', ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'Outlet', required: true })
  outletId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['STOCK_IN', 'STOCK_OUT', 'SALE', 'ADJUSTMENT'],
  })
  type!: StockMovementType;

  @Prop({ type: Number, required: true })
  quantity!: number;

  @Prop({ type: Number })
  balanceAfter?: number;

  @Prop()
  reason?: string;

  @Prop({ type: 'ObjectId', ref: 'Sale' })
  saleId?: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'User' })
  userId?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
StockMovementSchema.index({ productId: 1, outletId: 1, createdAt: -1 });

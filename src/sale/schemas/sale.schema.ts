import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SaleDocument = HydratedDocument<Sale>;

export type PaymentMethod = 'CASH' | 'QRIS' | 'CARD' | 'TRANSFER';
export type SaleStatus = 'COMPLETED' | 'VOID' | 'REFUNDED';

@Schema({ timestamps: true })
export class Sale {
  @Prop({ required: true, unique: true })
  invoiceNumber!: string;

  @Prop({ type: 'ObjectId', ref: 'Outlet', required: true })
  outletId!: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  cashierId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  subtotal!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  discount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  total!: number;

  @Prop({ required: true, enum: ['CASH', 'QRIS', 'CARD', 'TRANSFER'] })
  paymentMethod!: PaymentMethod;

  @Prop({ type: Number, required: true, min: 0 })
  amountPaid!: number;

  @Prop({ type: Number, default: 0 })
  change!: number;

  @Prop({
    default: 'COMPLETED',
    enum: ['COMPLETED', 'VOID', 'REFUNDED'],
  })
  status!: SaleStatus;

  @Prop()
  customerEmail?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
SaleSchema.index({ outletId: 1, createdAt: -1 });

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { MailService } from 'src/mail/mail.service';
import { Product, ProductDocument } from 'src/product/schemas/product.schema';
import { StockService } from 'src/stock/stock.service';
import { CreateSaleDto, SaleQueryDto } from './dto/sale.dto';
import {
  PaymentMethod,
  Sale,
  SaleDocument,
  SaleStatus,
} from './schemas/sale.schema';
import { SaleItem, SaleItemDocument } from './schemas/sale-item.schema';

interface PricedLine {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

@Injectable()
export class SaleService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(SaleItem.name) private saleItemModel: Model<SaleItemDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly stockService: StockService,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateSaleDto, cashier: JwtPayload) {
    const outletId = dto.outletId ?? cashier.outletId;
    if (!outletId) throw new BadRequestException('outletId is required');

    const ids = dto.items.map((i) => i.productId);
    const products = await this.productModel
      .find({ _id: { $in: ids }, isActive: { $ne: false } })
      .exec();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const lines: PricedLine[] = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }
      return {
        productId: item.productId,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
      };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const discount = dto.discount ?? 0;
    const total = subtotal - discount;
    if (total < 0) throw new BadRequestException('Discount exceeds subtotal');

    let change = 0;
    if (dto.paymentMethod === 'CASH') {
      if (dto.amountPaid < total) {
        throw new BadRequestException('Amount paid is less than total');
      }
      change = dto.amountPaid - total;
    }

    // ponytail: manual compensation instead of a Mongo session; standalone
    // mongod has no multi-document transactions. Upgrade to a session on a
    // replica set if throughput or concurrency demands atomicity.
    const applied: PricedLine[] = [];
    for (const line of lines) {
      const balance = await this.stockService.decrease(
        line.productId,
        outletId,
        line.quantity,
      );
      if (balance === null) {
        for (const done of applied) {
          await this.stockService.increase(
            done.productId,
            outletId,
            done.quantity,
          );
        }
        throw new ConflictException(
          `Insufficient stock for product ${line.title}`,
        );
      }
      applied.push(line);
    }

    const sale = await this.saleModel.create({
      invoiceNumber: this.buildInvoiceNumber(),
      outletId,
      cashierId: cashier.sub,
      subtotal,
      discount,
      total,
      paymentMethod: dto.paymentMethod as PaymentMethod,
      amountPaid: dto.amountPaid,
      change,
      customerEmail: dto.customerEmail,
    });

    const items = await this.saleItemModel.insertMany(
      lines.map((line) => ({
        saleId: sale._id,
        outletId,
        productId: line.productId,
        titleSnapshot: line.title,
        priceSnapshot: line.price,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
    );

    await Promise.all(
      lines.map((line) =>
        this.stockService.createMovement({
          productId: line.productId,
          outletId,
          type: 'SALE',
          quantity: line.quantity,
          saleId: sale._id,
          userId: cashier.sub,
          reason: sale.invoiceNumber,
        }),
      ),
    );

    return { sale, items };
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Sale Not Found');
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) throw new NotFoundException('Sale Not Found');
    const items = await this.saleItemModel.find({ saleId: id }).exec();
    return { sale, items };
  }

  async receipt(id: string) {
    const { sale, items } = await this.findOne(id);
    return {
      invoiceNumber: sale.invoiceNumber,
      createdAt: sale.createdAt,
      paymentMethod: sale.paymentMethod,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      amountPaid: sale.amountPaid,
      change: sale.change,
      items: items.map((item) => ({
        title: item.titleSnapshot,
        price: item.priceSnapshot,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
    };
  }

  async receiptPdf(id: string): Promise<Buffer> {
    const data = await this.receipt(id);
    const doc = new PDFDocument({ size: 'A5', margin: 36 });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(16).text('POS System Receipt', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9);
    doc.text(`Invoice: ${data.invoiceNumber}`);
    doc.text(`Date: ${data.createdAt?.toISOString() ?? '-'}`);
    doc.text(`Payment: ${data.paymentMethod}`);
    doc.moveDown(0.5);

    for (const item of data.items) {
      const line = `${item.title}  x${item.quantity}  ${item.lineTotal}`;
      doc.text(line);
    }

    doc.moveDown(0.5);
    doc.text(`Subtotal: ${data.subtotal}`);
    doc.text(`Discount: ${data.discount}`);
    doc.text(`Total: ${data.total}`);
    doc.text(`Paid: ${data.amountPaid}`);
    doc.text(`Change: ${data.change}`);
    doc.end();

    return finished;
  }

  async emailReceipt(id: string, email?: string) {
    const data = await this.receipt(id);
    const { sale } = await this.findOne(id);
    const to = email ?? sale.customerEmail;
    if (!to) throw new BadRequestException('No recipient email provided');

    const rows = data.items
      .map(
        (item) =>
          `<tr><td>${item.title}</td><td>${item.quantity}</td><td>${item.lineTotal}</td></tr>`,
      )
      .join('');

    const html = `
      <h2>POS System Receipt</h2>
      <p>Invoice: ${data.invoiceNumber}</p>
      <table border="1" cellpadding="4" cellspacing="0">
        <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Subtotal: ${data.subtotal}</p>
      <p>Discount: ${data.discount}</p>
      <p><strong>Total: ${data.total}</strong></p>
    `;

    const sent = await this.mailService.sendReceipt(
      to,
      `Receipt ${data.invoiceNumber}`,
      html,
    );

    return { sent, to };
  }

  voidSale(id: string, userId?: string) {
    return this.changeStatus(id, 'VOID', userId);
  }

  refund(id: string, userId?: string) {
    return this.changeStatus(id, 'REFUNDED', userId);
  }

  private async changeStatus(id: string, status: SaleStatus, userId?: string) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Sale Not Found');
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) throw new NotFoundException('Sale Not Found');
    if (sale.status !== 'COMPLETED') {
      throw new ConflictException(`Sale already ${sale.status}`);
    }

    const items = await this.saleItemModel.find({ saleId: id }).exec();
    for (const item of items) {
      await this.stockService.increase(
        item.productId,
        item.outletId,
        item.quantity,
      );
      await this.stockService.createMovement({
        productId: item.productId,
        outletId: item.outletId,
        type: 'ADJUSTMENT',
        quantity: item.quantity,
        reason: `${status} ${sale.invoiceNumber}`,
        saleId: sale._id,
        userId,
      });
    }

    sale.status = status;
    await sale.save();
    return sale;
  }

  async findAll(query: SaleQueryDto) {
    const filter: QueryFilter<SaleDocument> = { status: 'COMPLETED' };
    if (query.outletId) filter.outletId = query.outletId;
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = query.from;
      if (query.to) filter.createdAt.$lte = query.to;
    }

    const [data, total] = await Promise.all([
      this.saleModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.saleModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  private buildInvoiceNumber(): string {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}${String(now.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `INV-${ymd}-${rand}`;
  }
}

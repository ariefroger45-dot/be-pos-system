import { Model } from 'mongoose';
import { MailService } from 'src/mail/mail.service';
import { ProductDocument } from 'src/product/schemas/product.schema';
import { StockService } from 'src/stock/stock.service';
import { SaleService } from './sale.service';
import { SaleDocument } from './schemas/sale.schema';
import { SaleItemDocument } from './schemas/sale-item.schema';

function buildService(status = 'COMPLETED') {
  const saleDoc = {
    _id: '000000000000000000000001',
    status,
    invoiceNumber: 'INV-1',
    save: jest.fn().mockResolvedValue(undefined),
  };
  const saleModel = {
    findById: () => ({ exec: () => Promise.resolve(saleDoc) }),
  } as unknown as Model<SaleDocument>;
  const saleItemModel = {
    find: () => ({
      exec: () =>
        Promise.resolve([{ productId: 'p1', outletId: 'o1', quantity: 2 }]),
    }),
  } as unknown as Model<SaleItemDocument>;
  const productModel = {} as unknown as Model<ProductDocument>;
  const increase = jest.fn().mockResolvedValue(5);
  const createMovement = jest.fn().mockResolvedValue({});
  const stockService = {
    increase,
    createMovement,
  } as unknown as StockService;
  const mailService = {} as unknown as MailService;

  const service = new SaleService(
    saleModel,
    saleItemModel,
    productModel,
    stockService,
    mailService,
  );
  return { service, saleDoc, increase };
}

describe('SaleService.voidSale', () => {
  it('restores stock and marks the sale VOID', async () => {
    const { service, saleDoc, increase } = buildService();
    await service.voidSale('000000000000000000000001', 'user-1');

    expect(increase).toHaveBeenCalledWith('p1', 'o1', 2);
    expect(saleDoc.status).toBe('VOID');
  });

  it('rejects a sale that is not COMPLETED', async () => {
    const { service } = buildService('VOID');
    await expect(
      service.voidSale('000000000000000000000001'),
    ).rejects.toThrow();
  });
});

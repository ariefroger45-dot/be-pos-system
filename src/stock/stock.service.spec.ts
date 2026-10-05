import { Model } from 'mongoose';
import { ProductStockDocument } from './schemas/product-stock.schema';
import { StockMovementDocument } from './schemas/stock-movement.schema';
import { StockService } from './stock.service';

function buildService(result: { quantity: number } | null) {
  const stockModel = {
    findOneAndUpdate: () => ({ exec: () => Promise.resolve(result) }),
  } as unknown as Model<ProductStockDocument>;
  const movementModel = {} as unknown as Model<StockMovementDocument>;
  return new StockService(stockModel, movementModel);
}

describe('StockService.decrease', () => {
  it('returns the new quantity when stock is sufficient', async () => {
    await expect(
      buildService({ quantity: 7 }).decrease('p', 'o', 3),
    ).resolves.toBe(7);
  });

  it('returns null when stock is insufficient', async () => {
    await expect(
      buildService(null).decrease('p', 'o', 999),
    ).resolves.toBeNull();
  });
});

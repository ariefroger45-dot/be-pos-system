import { Inject, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async findAllCustom(): Promise<Product[]> {
    const cacheKey = 'all_product_active';

    const cacheData = await this.cacheManager.get<Product[]>(cacheKey);
    if (cacheData) return cacheData;

    const products = await this.productModel.find().exec();
    await this.cacheManager.set(cacheKey, products, 30 * 1000);

    return products;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    // const created = new this.productModel(dto);
    // return created.save();

    const newProduct = new this.productModel(dto);
    const saved = await newProduct.save();

    await this.cacheManager.del('all_product_active');

    return saved;
  }

  findAll(skip: number, limit: number): Promise<Product[]> {
    return this.productModel.find().skip(skip).limit(limit);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product Not Found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const updated = await this.productModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new NotFoundException('Product Not Found');

    await this.cacheManager.del('all_product_active');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.productModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Product Not Found');

    await this.cacheManager.del('all_product_active');
  }

  async findAllWithCategory() {
    return this.productModel.find().populate('category', 'name').exec();
  }

  async search(keyword: string): Promise<Product[]> {
    const filter = {
      title: { $regex: keyword, $options: 'i' },
    };

    return this.productModel.find(filter);
  }
}

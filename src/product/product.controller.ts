import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { get } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Products Management')
@Controller('product')
@UseInterceptors(CacheInterceptor)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('categories-list')
  @CacheKey('custom_categories_key')
  @CacheTTL(300 * 1000)
  async getCategories() {
    return this.productService.findAllWithCategory;
  }

  @Post()
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({
    summary: 'Create Product',
    description: 'Add New Product into POS System',
  })
  @ApiResponse({ status: 201, description: 'Operation Successfull' })
  @ApiResponse({ status: 400, description: 'Validation Failed' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get Product',
    description: 'Get Product into POS System',
  })
  @ApiResponse({ status: 201, description: 'Operation Successfull' })
  @ApiResponse({ status: 400, description: 'Data not found' })
  findAll(@Query() pagination: PaginationDto) {
    return this.productService.findAll(pagination.skip, pagination.limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Single Product',
  })
  @ApiParam({ name: 'id', description: 'Unique product id', example: '1' })
  @ApiResponse({ status: 201, description: 'Operation Successfull' })
  @ApiResponse({ status: 400, description: 'Data not found' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @Roles('MANAGER', 'ADMIN')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @Roles('MANAGER', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}

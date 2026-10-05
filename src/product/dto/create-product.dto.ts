import {
  IsString,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Title or name of the product',
    example: 'iPhone 15 Pro Max',
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @ApiPropertyOptional({ description: 'Stock keeping unit', example: 'IP15PM' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ description: 'Price of the product', example: 20000 })
  @IsNumber({}, { message: 'Price must be number' })
  @IsPositive({ message: 'Price must be positive' })
  price!: number;

  @ApiPropertyOptional({ description: 'Cost of goods', example: 15000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ description: 'Unit of measure', example: 'pcs' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Category id' })
  @IsOptional()
  @IsMongoId()
  category?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: "Stock can't be negative" })
  stock?: number;

  @ApiProperty({
    description: 'Product Description (optional)',
    example: 'iPhone 15 Pro Max iBox',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

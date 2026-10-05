import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CreateStockMovementDto, StockQueryDto } from './dto/stock.dto';
import { StockService } from './stock.service';

type RequestWithUser = Request & { user?: JwtPayload };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiTags('Stock Management')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('in')
  stockIn(@Body() dto: CreateStockMovementDto, @Req() req: RequestWithUser) {
    return this.stockService.adjust('STOCK_IN', dto, req.user?.sub);
  }

  @Post('out')
  stockOut(@Body() dto: CreateStockMovementDto, @Req() req: RequestWithUser) {
    return this.stockService.adjust('STOCK_OUT', dto, req.user?.sub);
  }

  @Get('history')
  history(@Query() query: StockQueryDto) {
    return this.stockService.history(query);
  }

  @Get('level')
  level(@Query('outletId') outletId?: string) {
    return this.stockService.level(outletId);
  }
}

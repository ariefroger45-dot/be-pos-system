import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CreateSaleDto, EmailReceiptDto, SaleQueryDto } from './dto/sale.dto';
import { SaleService } from './sale.service';

type RequestWithUser = Request & { user?: JwtPayload };

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Sales Transaction')
@Controller('sale')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Post()
  create(@Body() dto: CreateSaleDto, @Req() req: RequestWithUser) {
    if (!req.user) throw new Error('Unauthenticated');
    return this.saleService.create(dto, req.user);
  }

  @Get()
  @Roles('ADMIN')
  findAll(@Query() query: SaleQueryDto) {
    return this.saleService.findAll(query);
  }

  @Post(':id/void')
  @Roles('ADMIN')
  voidSale(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.saleService.voidSale(id, req.user?.sub);
  }

  @Post(':id/refund')
  @Roles('ADMIN')
  refund(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.saleService.refund(id, req.user?.sub);
  }

  @Post(':id/receipt/email')
  emailReceipt(@Param('id') id: string, @Body() dto: EmailReceiptDto) {
    return this.saleService.emailReceipt(id, dto.email);
  }

  @Get(':id/receipt.pdf')
  async receiptPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.saleService.receiptPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${id}.pdf"`,
    });
    res.send(buffer);
  }

  @Get(':id/receipt')
  receipt(@Param('id') id: string) {
    return this.saleService.receipt(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.saleService.findOne(id);
  }
}

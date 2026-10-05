import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ReportQueryDto } from './dto/report.dto';
import { ReportService } from './report.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiTags('Reports')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('daily')
  daily(@Query() query: ReportQueryDto) {
    return this.reportService.daily(query);
  }

  @Get('monthly')
  monthly(@Query() query: ReportQueryDto) {
    return this.reportService.monthly(query);
  }

  @Get('best-sellers')
  bestSellers(@Query() query: ReportQueryDto) {
    return this.reportService.bestSellers(query);
  }

  @Get('revenue')
  revenue(@Query() query: ReportQueryDto) {
    return this.reportService.revenue(query);
  }
}

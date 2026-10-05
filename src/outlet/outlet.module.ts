import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { OutletController } from './outlet.controller';
import { OutletService } from './outlet.service';
import { Outlet, OutletSchema } from './schemas/outlet.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Outlet.name, schema: OutletSchema }]),
    JwtModule.register({}),
  ],
  controllers: [OutletController],
  providers: [OutletService],
  exports: [OutletService],
})
export class OutletModule {}

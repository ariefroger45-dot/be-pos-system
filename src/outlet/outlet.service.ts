import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { Outlet, OutletDocument } from './schemas/outlet.schema';

@Injectable()
export class OutletService {
  constructor(
    @InjectModel(Outlet.name) private outletModel: Model<OutletDocument>,
  ) {}

  async create(dto: CreateOutletDto): Promise<OutletDocument> {
    const existing = await this.outletModel.findOne({
      $or: [{ name: dto.name }, { code: dto.code }],
    });
    if (existing) throw new ConflictException('Outlet name or code exists');
    return this.outletModel.create(dto);
  }

  findAll(): Promise<OutletDocument[]> {
    return this.outletModel.find().exec();
  }

  async findOne(id: string): Promise<OutletDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Outlet Not Found');
    const outlet = await this.outletModel.findById(id).exec();
    if (!outlet) throw new NotFoundException('Outlet Not Found');
    return outlet;
  }

  async update(id: string, dto: UpdateOutletDto): Promise<OutletDocument> {
    await this.findOne(id);
    const updated = await this.outletModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new NotFoundException('Outlet Not Found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.outletModel.findByIdAndDelete(id).exec();
  }
}

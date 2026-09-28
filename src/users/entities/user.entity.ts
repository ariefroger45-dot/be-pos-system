import { Exclude, Transform } from 'class-transformer';
import { Types } from 'mongoose';

export class UserEntity {
  @Transform(({ value }: { value: Types.ObjectId | string }) =>
    value.toString(),
  )
  _id!: Types.ObjectId | string;

  name!: string;
  email!: string;
  role!: string;

  @Exclude()
  passwordHash!: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
    if (partial._id)
      this._id = (partial._id as unknown as Types.ObjectId).toString();
  }
}

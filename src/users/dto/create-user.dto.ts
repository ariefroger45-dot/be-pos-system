import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 character long' })
  passwordHash!: string;

  @IsOptional()
  @IsString()
  role?: string;
}

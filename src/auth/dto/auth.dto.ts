import {
  IsEmail,
  IsEmpty,
  IsNotEmpty,
  IsString,
  MIN_LENGTH,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEmpty()
  @MinLength(8, { message: 'Password must be at least 8 character long.' })
  password!: string;
}

export class loginDto {
  @IsEmail({}, { message: 'Format email not valid' })
  email!: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 character long.' })
  password!: string;
}

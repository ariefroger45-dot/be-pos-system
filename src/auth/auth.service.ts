import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { loginDto, RegisterDto } from './dto/auth.dto';
import { UserEntity } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  jwtService: any;
  constructor(private readonly userService: UsersService) {}

  async register(dto: RegisterDto) {
    const isExistingUser = await this.userService.findByEmail(dto.email);
    if (isExistingUser) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser = await this.userService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    return new UserEntity(newUser.toObject());
  }

  async login(dto: loginDto) {
    const user = await this.userService.findByEmail(dto.email, true);
    if (!user) throw new UnauthorizedException('Invalid Credentials');

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid Credentials');

    const payload = { sub: user._id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_TOKEN,
      expiresIn: '1h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken, user: new UserEntity(user.toObject()) };
  }
}

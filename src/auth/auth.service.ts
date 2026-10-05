import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { loginDto, RegisterDto } from './dto/auth.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserDocument } from 'src/users/schemas/user.schema';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

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

    if (user.isActive === false)
      throw new UnauthorizedException('Account is deactivated');

    const payload = this.buildPayload(user);
    const tokens = await this.signTokens(payload);
    await this.storeRefreshToken(String(user._id), tokens.refreshToken);

    return { ...tokens, user: new UserEntity(user.toObject()) };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userService.findByIdWithRefreshToken(payload.sub);
    if (!user || user.isActive === false || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.signTokens(this.buildPayload(user));
    await this.storeRefreshToken(String(user._id), tokens.refreshToken);

    return tokens;
  }

  async logout(userId?: string): Promise<{ success: boolean }> {
    if (userId) await this.userService.setRefreshTokenHash(userId, null);
    return { success: true };
  }

  private async signTokens(
    payload: JwtPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userService.setRefreshTokenHash(userId, hash);
  }

  private buildPayload(user: UserDocument): JwtPayload {
    return {
      sub: String(user._id),
      email: user.email,
      role: user.role as JwtPayload['role'],
      outletId: user.outletId ? String(user.outletId) : undefined,
    };
  }
}

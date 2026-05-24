import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const DEV_OTP = '123456';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    await this.prisma.otpChallenge.create({
      data: {
        phone: dto.phone,
        codeHash: await bcrypt.hash(DEV_OTP, 10),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    return {
      message: 'OTP sent',
      devOtp: DEV_OTP,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        phone: dto.phone,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!challenge || !(await bcrypt.compare(dto.otp, challenge.codeHash))) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: {},
      create: { phone: dto.phone },
    });

    if (user.isBanned) {
      throw new ForbiddenException('Account suspended');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    return this.issueTokens(user.id, user.phone);
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; phone: string }>(
        dto.refreshToken,
        {
          secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        },
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isBanned: true },
      });

      if (user?.isBanned) {
        throw new ForbiddenException('Account suspended');
      }

      return this.issueTokens(payload.sub, payload.phone);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(userId: string, phone: string) {
    const payload = { sub: userId, phone };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.secret'),
        expiresIn: this.config.getOrThrow<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.getOrThrow<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}

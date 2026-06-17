import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentOwner } from '../common/decorators/current-owner.decorator';
import { OwnerContext } from '../common/types';
import { OwnerAuthService } from './owner-auth.service';
import { PhoneStartDto, PhoneVerifyDto, RegisterOwnerDto } from './dto';

/** Owner (mobile app) auth + phone OTP. Routes are under /api/auth. */
@Controller('auth')
export class AuthController {
  constructor(private readonly ownerAuth: OwnerAuthService) {}

  /** Called right after a Supabase sign-up to provision tenant + owner. */
  @Post('register')
  register(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: RegisterOwnerDto,
  ) {
    const token = bearer(authorization);
    return this.ownerAuth.register(token, dto);
  }

  @UseGuards(OwnerAuthGuard)
  @Get('me')
  me(@CurrentOwner() owner: OwnerContext) {
    return this.ownerAuth.me(owner);
  }

  @UseGuards(OwnerAuthGuard)
  @Post('phone/start')
  startPhone(@Body() dto: PhoneStartDto) {
    return this.ownerAuth.startPhoneVerification(dto.phone);
  }

  @UseGuards(OwnerAuthGuard)
  @Post('phone/verify')
  verifyPhone(
    @CurrentOwner() owner: OwnerContext,
    @Body() dto: PhoneVerifyDto,
  ) {
    return this.ownerAuth.verifyPhone(owner, dto.phone, dto.code);
  }
}

function bearer(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Missing bearer token');
  }
  return header.slice('Bearer '.length).trim();
}

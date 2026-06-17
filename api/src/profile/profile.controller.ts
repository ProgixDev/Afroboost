import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto';

@UseGuards(OwnerAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@CurrentTenant() tenantId: string) {
    return this.profile.get(tenantId);
  }

  @Patch()
  update(@CurrentTenant() tenantId: string, @Body() dto: UpdateProfileDto) {
    return this.profile.update(tenantId, dto);
  }
}

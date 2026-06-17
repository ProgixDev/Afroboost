import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { CrmService } from './crm.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

@UseGuards(OwnerAuthGuard)
@Controller('customers')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  list(@CurrentTenant() tenantId: string, @Query('search') search?: string) {
    return this.crm.list(tenantId, search);
  }

  @Get(':id')
  get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.crm.get(tenantId, id);
  }

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.crm.create(tenantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.crm.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.crm.remove(tenantId, id);
  }
}

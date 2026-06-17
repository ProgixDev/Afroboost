import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

const FIELDS =
  'id, name, phone, email, address, source, tags, last_contact_channel, last_contact_at, notes, history, created_at';

@Injectable()
export class CrmService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(tenantId: string, search?: string) {
    let q = this.supabase.admin
      .from('customers')
      .select(FIELDS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (search) q = q.ilike('name', `%${search}%`);
    const { data } = await q;
    return data ?? [];
  }

  async get(tenantId: string, id: string) {
    const { data } = await this.supabase.admin
      .from('customers')
      .select(FIELDS)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (!data) throw new NotFoundException('Customer not found');
    return data;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    const { data } = await this.supabase.admin
      .from('customers')
      .insert({
        tenant_id: tenantId,
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        source: dto.source ?? 'phone',
        tags: dto.tags ?? [],
        notes: dto.notes ?? null,
      })
      .select(FIELDS)
      .single();
    return data;
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    await this.get(tenantId, id);
    const patch: Record<string, unknown> = {};
    for (const key of ['name', 'phone', 'email', 'address', 'source', 'tags', 'notes'] as const) {
      if (dto[key] !== undefined) patch[key] = dto[key];
    }
    const { data } = await this.supabase.admin
      .from('customers')
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select(FIELDS)
      .single();
    return data;
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await this.supabase.admin
      .from('customers')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    return { deleted: true };
  }
}

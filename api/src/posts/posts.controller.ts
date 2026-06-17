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
import { PostsService } from './posts.service';
import { CreatePostDto, ListPostsQuery, UpdatePostDto } from './dto';

@UseGuards(OwnerAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListPostsQuery) {
    return this.posts.list(tenantId, query.status);
  }

  @Get(':id')
  get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.posts.get(tenantId, id);
  }

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreatePostDto) {
    return this.posts.create(tenantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.posts.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.posts.remove(tenantId, id);
  }
}

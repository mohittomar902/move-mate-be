import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { BanUserDto } from './dto/ban-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats(@CurrentUser() user: { sub: string }) {
    return this.adminService.getStats(user.sub);
  }

  @Get('users')
  listUsers(
    @CurrentUser() user: { sub: string },
    @Query('search') search?: string,
    @Query('role') role?: 'driver' | 'passenger',
    @Query('status') status?: 'banned' | 'active',
  ) {
    return this.adminService.listUsers(user.sub, { search, role, status });
  }

  @Get('users/:id')
  getUser(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.adminService.getUser(user.sub, id);
  }

  @Patch('users/:id/ban')
  banUser(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: BanUserDto,
  ) {
    return this.adminService.banUser(user.sub, id, dto.reason);
  }

  @Patch('users/:id/unban')
  unbanUser(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.adminService.unbanUser(user.sub, id);
  }

  @Patch('users/:id/revoke-admin')
  revokeAdmin(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.adminService.revokeAdmin(user.sub, id);
  }

  @Get('trips')
  listTrips(
    @CurrentUser() user: { sub: string },
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.listTrips(user.sub, { status, from, to });
  }

  @Patch('trips/:id/cancel')
  cancelTrip(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.adminService.cancelTrip(user.sub, id);
  }

  @Get('logs')
  listLogs(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listLogs(user.sub, { page, limit });
  }
}

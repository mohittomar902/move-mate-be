import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.sub, dto);
  }

  @Get('my-bookings')
  findMyBookings(@CurrentUser() user: { sub: string }) {
    return this.bookingsService.findByPassenger(user.sub);
  }

  @Get(':id')
  findById(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.bookingsService.findById(user.sub, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(user.sub, id, dto);
  }
}

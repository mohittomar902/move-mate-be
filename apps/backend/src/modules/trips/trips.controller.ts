import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { SearchTripsDto } from './dto/search-trips.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateTripDto) {
    return this.tripsService.create(user.sub, dto);
  }

  @Get('search')
  search(@Query() query: SearchTripsDto) {
    return this.tripsService.search(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-trips')
  findMyTrips(@CurrentUser() user: { sub: string }) {
    return this.tripsService.findByDriver(user.sub);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.tripsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/bookings')
  findTripBookings(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.tripsService.findTripBookings(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/start')
  startWithOtp(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body('otp') otp: string,
  ) {
    return this.tripsService.startWithOtp(user.sub, id, otp);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(user.sub, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.tripsService.remove(user.sub, id);
  }
}

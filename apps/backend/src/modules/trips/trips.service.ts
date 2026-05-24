import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, PaymentStatus, Prisma, TripStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DriverVerificationService } from '../driver-verification/driver-verification.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { SearchTripsDto } from './dto/search-trips.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: DriverVerificationService,
  ) {}

  async create(driverId: string, dto: CreateTripDto) {
    await this.verification.assertVerified(driverId);

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.userId !== driverId) {
      throw new ForbiddenException('Vehicle does not belong to driver');
    }

    return this.prisma.trip.create({
      data: {
        ...dto,
        driverId,
        departureTime: new Date(dto.departureTime),
      },
      include: this.tripIncludes,
    });
  }

  search(query: SearchTripsDto) {
    const where: Prisma.TripWhereInput = {
      status: TripStatus.OPEN,
      availableSeats: {
        gte: query.seats ?? 1,
      },
      departureTime: {
        gte: query.departureAfter ? new Date(query.departureAfter) : new Date(),
        ...(query.departureBefore ? { lte: new Date(query.departureBefore) } : {}),
      },
    };

    return this.prisma.trip.findMany({
      where,
      include: this.tripIncludes,
      orderBy: { departureTime: 'asc' },
      take: query.limit ?? 20,
    });
  }

  async findById(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: this.tripIncludes,
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  findByDriver(driverId: string) {
    return this.prisma.trip.findMany({
      where: { driverId },
      include: this.tripIncludes,
      orderBy: { departureTime: 'desc' },
    });
  }

  async findTripBookings(driverId: string, tripId: string) {
    await this.assertDriver(driverId, tripId);
    return this.prisma.booking.findMany({
      where: { tripId },
      include: {
        passenger: {
          select: { id: true, fullName: true, phone: true, rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(driverId: string, id: string, dto: UpdateTripDto) {
    await this.assertDriver(driverId, id);

    return this.prisma.trip.update({
      where: { id },
      data: {
        ...dto,
        departureTime: dto.departureTime ? new Date(dto.departureTime) : undefined,
      },
      include: this.tripIncludes,
    });
  }

  async startWithOtp(driverId: string, tripId: string, otp: string) {
    await this.assertDriver(driverId, tripId);

    const booking = await this.prisma.booking.findFirst({
      where: {
        tripId,
        boardingOtp: otp,
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    if (!booking) throw new BadRequestException('Invalid OTP');

    const trip = await this.prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.STARTED },
      include: this.tripIncludes,
    });

    return { verified: true, tripId, trip };
  }

  async remove(driverId: string, id: string) {
    await this.assertDriver(driverId, id);
    await this.prisma.trip.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertDriver(driverId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.driverId !== driverId) {
      throw new ForbiddenException('Trip does not belong to driver');
    }
  }

  private readonly tripIncludes = {
    driver: {
      select: {
        id: true,
        fullName: true,
        rating: true,
        verificationStatus: true,
      },
    },
    vehicle: true,
  } satisfies Prisma.TripInclude;
}

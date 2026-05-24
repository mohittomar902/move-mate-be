import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, PaymentStatus, Prisma, TripStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(passengerId: string, dto: CreateBookingDto) {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: dto.tripId },
      });

      if (!trip) {
        throw new NotFoundException('Trip not found');
      }

      if (trip.driverId === passengerId) {
        throw new BadRequestException('Driver cannot book their own trip');
      }

      if (trip.status !== TripStatus.OPEN) {
        throw new BadRequestException('Trip is not open for booking');
      }

      if (trip.availableSeats < dto.seatsBooked) {
        throw new BadRequestException('Not enough seats available');
      }

      const booking = await tx.booking.create({
        data: {
          tripId: dto.tripId,
          passengerId,
          seatsBooked: dto.seatsBooked,
          totalAmount: new Prisma.Decimal(Number(trip.pricePerSeat) * dto.seatsBooked),
          paymentStatus: PaymentStatus.PENDING,
          bookingStatus: BookingStatus.PENDING,
        },
        include: this.bookingIncludes,
      });

      await tx.trip.update({
        where: { id: dto.tripId },
        data: {
          availableSeats: {
            decrement: dto.seatsBooked,
          },
        },
      });

      return booking;
    });
  }

  findByPassenger(passengerId: string) {
    return this.prisma.booking.findMany({
      where: { passengerId },
      include: this.bookingIncludes,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(userId: string, id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: this.bookingIncludes,
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.passengerId !== userId && booking.trip.driverId !== userId) {
      throw new ForbiddenException('Booking is not visible to user');
    }

    return booking;
  }

  async updateStatus(userId: string, id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.trip.driverId !== userId && booking.passengerId !== userId) {
      throw new ForbiddenException('Booking does not belong to user');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { bookingStatus: dto.bookingStatus },
      include: this.bookingIncludes,
    });
  }

  private readonly bookingIncludes = {
    passenger: {
      select: {
        id: true,
        fullName: true,
        phone: true,
        rating: true,
      },
    },
    trip: {
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            rating: true,
          },
        },
        vehicle: true,
      },
    },
  } satisfies Prisma.BookingInclude;
}

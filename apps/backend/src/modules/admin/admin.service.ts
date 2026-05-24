import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AdminAction,
  BookingStatus,
  PaymentStatus,
  Prisma,
  TripStatus,
  VerificationStatus,
} from '@prisma/client';
import { DriverVerificationService } from '../driver-verification/driver-verification.service';
import { PrismaService } from '../../prisma/prisma.service';

type UserFilters = {
  search?: string;
  role?: 'driver' | 'passenger';
  status?: 'banned' | 'active';
};

type TripFilters = {
  status?: string;
  from?: string;
  to?: string;
};

type Pagination = {
  page?: string;
  limit?: string;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driverVerification: DriverVerificationService,
  ) {}

  async listUsers(adminId: string, filters: UserFilters) {
    await this.driverVerification.assertAdmin(adminId);

    const and: Prisma.UserWhereInput[] = [];

    if (filters.search) {
      and.push({
        OR: [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters.status === 'banned') {
      and.push({ isBanned: true });
    }

    if (filters.status === 'active') {
      and.push({ isBanned: false });
    }

    if (filters.role === 'driver') {
      and.push({
        OR: [
          { vehicles: { some: {} } },
          { drivenTrips: { some: {} } },
          { documents: { some: {} } },
          { verificationStatus: { not: VerificationStatus.PENDING } },
        ],
      });
    }

    if (filters.role === 'passenger') {
      and.push({ bookings: { some: {} } });
    }

    const where: Prisma.UserWhereInput = and.length ? { AND: and } : {};

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          phone: true,
          verificationStatus: true,
          isAdmin: true,
          isBanned: true,
          banReason: true,
          createdAt: true,
          _count: {
            select: {
              drivenTrips: true,
              bookings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => ({
        ...user,
        _count: {
          trips: user._count.drivenTrips,
          bookings: user._count.bookings,
        },
      })),
      total,
    };
  }

  async getUser(adminId: string, id: string) {
    await this.driverVerification.assertAdmin(adminId);

    const [user, logs] = await this.prisma.$transaction([
      this.prisma.user.findUnique({
        where: { id },
        include: {
          vehicles: true,
          drivenTrips: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          bookings: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { trip: true },
          },
          documents: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.adminLog.findMany({
        where: { targetId: id, targetType: 'user' },
        include: {
          admin: {
            select: { id: true, fullName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { ...user, logs };
  }

  async banUser(adminId: string, userId: string, reason: string) {
    await this.driverVerification.assertAdmin(adminId);

    const cleanReason = reason.trim();
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          bannedAt: new Date(),
          banReason: cleanReason,
        },
        select: {
          id: true,
          isBanned: true,
          bannedAt: true,
          banReason: true,
        },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: AdminAction.BAN_USER,
          targetId: userId,
          targetType: 'user',
          note: cleanReason,
        },
      }),
    ]);

    return updated;
  }

  async unbanUser(adminId: string, userId: string) {
    await this.driverVerification.assertAdmin(adminId);

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          bannedAt: null,
          banReason: null,
        },
        select: {
          id: true,
          isBanned: true,
          bannedAt: true,
          banReason: true,
        },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: AdminAction.UNBAN_USER,
          targetId: userId,
          targetType: 'user',
        },
      }),
    ]);

    return updated;
  }

  revokeAdmin(adminId: string, userId: string) {
    return this.driverVerification.revokeAdmin(adminId, userId);
  }

  async listTrips(adminId: string, filters: TripFilters) {
    await this.driverVerification.assertAdmin(adminId);

    const where: Prisma.TripWhereInput = {};
    if (filters.status) {
      if (!Object.values(TripStatus).includes(filters.status as TripStatus)) {
        throw new BadRequestException('Invalid trip status');
      }
      where.status = filters.status as TripStatus;
    }

    if (filters.from || filters.to) {
      where.departureTime = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }

    return this.prisma.trip.findMany({
      where,
      include: {
        driver: {
          select: { id: true, fullName: true, phone: true, verificationStatus: true },
        },
        vehicle: true,
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { departureTime: 'desc' },
    });
  }

  async cancelTrip(adminId: string, tripId: string) {
    await this.driverVerification.assertAdmin(adminId);

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true },
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const [updatedTrip] = await this.prisma.$transaction([
      this.prisma.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.CANCELLED },
      }),
      this.prisma.booking.updateMany({
        where: {
          tripId,
          bookingStatus: BookingStatus.CONFIRMED,
        },
        data: { bookingStatus: BookingStatus.CANCELLED },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: AdminAction.CANCEL_TRIP,
          targetId: tripId,
          targetType: 'trip',
        },
      }),
    ]);

    return updatedTrip;
  }

  async getStats(adminId: string) {
    await this.driverVerification.assertAdmin(adminId);

    const [
      totalUsers,
      totalDrivers,
      verifiedDrivers,
      pendingReviews,
      totalTrips,
      activeTrips,
      totalBookings,
      revenue,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          OR: [
            { vehicles: { some: {} } },
            { drivenTrips: { some: {} } },
            { documents: { some: {} } },
            { verificationStatus: { not: VerificationStatus.PENDING } },
          ],
        },
      }),
      this.prisma.user.count({
        where: { verificationStatus: VerificationStatus.VERIFIED },
      }),
      this.prisma.user.count({
        where: { verificationStatus: VerificationStatus.UNDER_REVIEW },
      }),
      this.prisma.trip.count(),
      this.prisma.trip.count({
        where: { status: { in: [TripStatus.OPEN, TripStatus.STARTED] } },
      }),
      this.prisma.booking.count(),
      this.prisma.booking.aggregate({
        where: { paymentStatus: PaymentStatus.PAID },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalUsers,
      totalDrivers,
      verifiedDrivers,
      pendingReviews,
      totalTrips,
      activeTrips,
      totalBookings,
      totalRevenue: Number(revenue._sum.totalAmount ?? 0),
    };
  }

  async listLogs(adminId: string, pagination: Pagination) {
    await this.driverVerification.assertAdmin(adminId);

    const page = Math.max(Number(pagination.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(pagination.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminLog.findMany({
        skip,
        take: limit,
        include: {
          admin: {
            select: { id: true, fullName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminLog.count(),
    ]);

    return { data, total, page, limit };
  }
}

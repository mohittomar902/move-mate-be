import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import appConfig from './config/app.config';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DriverVerificationModule } from './modules/driver-verification/driver-verification.module';
import { ParcelsModule } from './modules/parcels/parcels.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { TripsModule } from './modules/trips/trips.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['apps/backend/.env', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    TripsModule,
    BookingsModule,
    PaymentsModule,
    NotificationsModule,
    TrackingModule,
    RatingsModule,
    ParcelsModule,
    DriverVerificationModule,
  ],
})
export class AppModule {}

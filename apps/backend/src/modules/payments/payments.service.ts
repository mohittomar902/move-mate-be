import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreatePaymentOrderDto) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: dto.bookingId },
    });

    return {
      bookingId: booking.id,
      amount: booking.totalAmount,
      currency: 'INR',
      provider: 'razorpay',
      providerOrderId: `dev_order_${booking.id}`,
    };
  }

  async verify(dto: VerifyPaymentDto) {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    return this.prisma.booking.update({
      where: { id: dto.bookingId },
      data: { paymentStatus: PaymentStatus.PAID, boardingOtp: otp },
    });
  }

  handleWebhook(signature: string | undefined, payload: unknown) {
    return {
      received: true,
      signaturePresent: Boolean(signature),
      payload,
    };
  }
}

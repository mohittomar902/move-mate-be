import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  createOrder(@Body() dto: CreatePaymentOrderDto) {
    return this.paymentsService.createOrder(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  verify(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verify(dto);
  }

  @Post('webhook')
  webhook(@Headers('x-razorpay-signature') signature: string, @Body() payload: unknown) {
    return this.paymentsService.handleWebhook(signature, payload);
  }
}

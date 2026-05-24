import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  create(fromUserId: string, dto: CreateRatingDto) {
    return this.prisma.rating.create({
      data: {
        ...dto,
        fromUserId,
      },
    });
  }
}

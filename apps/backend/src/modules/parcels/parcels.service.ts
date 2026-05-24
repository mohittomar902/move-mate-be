import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateParcelDto } from './dto/create-parcel.dto';

@Injectable()
export class ParcelsService {
  constructor(private readonly prisma: PrismaService) {}

  create(senderId: string, dto: CreateParcelDto) {
    return this.prisma.parcel.create({
      data: {
        ...dto,
        senderId,
      },
    });
  }
}

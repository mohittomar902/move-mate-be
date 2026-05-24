import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, id: string, dto: UpdateVehicleDto) {
    await this.assertOwner(userId, id);

    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.vehicle.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertOwner(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.userId !== userId) {
      throw new ForbiddenException('Vehicle does not belong to user');
    }
  }
}

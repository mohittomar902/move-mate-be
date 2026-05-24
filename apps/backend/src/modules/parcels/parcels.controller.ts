import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { ParcelsService } from './parcels.service';

@UseGuards(JwtAuthGuard)
@Controller('parcels')
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateParcelDto) {
    return this.parcelsService.create(user.sub, dto);
  }
}

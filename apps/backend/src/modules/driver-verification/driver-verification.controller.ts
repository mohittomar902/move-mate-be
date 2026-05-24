import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentType } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DriverVerificationService } from './driver-verification.service';

const uploadStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new BadRequestException('Only image files are allowed'), false);
    return;
  }
  cb(null, true);
};

@UseGuards(JwtAuthGuard)
@Controller('driver-verification')
export class DriverVerificationController {
  constructor(private readonly svc: DriverVerificationService) {}

  @Get('my-status')
  getMyStatus(@CurrentUser() user: { sub: string }) {
    return this.svc.getMyStatus(user.sub);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: DocumentType,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!Object.values(DocumentType).includes(type)) {
      throw new BadRequestException('Invalid document type');
    }
    const fileUrl = `/uploads/${file.filename}`;
    return this.svc.saveDocument(user.sub, type, fileUrl);
  }

  @Post('aadhaar')
  saveAadhaar(
    @CurrentUser() user: { sub: string },
    @Body('aadhaarNumber') aadhaarNumber: string,
  ) {
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      throw new BadRequestException('Aadhaar number must be 12 digits');
    }
    return this.svc.saveAadhaar(user.sub, aadhaarNumber);
  }

  @Post('submit')
  submit(@CurrentUser() user: { sub: string }) {
    return this.svc.submitForReview(user.sub);
  }

  // ─── Admin endpoints ────────────────────────────────────

  @Get('admin/requests')
  adminGetAll(
    @CurrentUser() user: { sub: string },
    @Query('filter') filter?: string,
  ) {
    return this.svc.getAllRequests(filter);
  }

  @Patch('admin/approve/:userId')
  adminApprove(
    @CurrentUser() user: { sub: string },
    @Param('userId') userId: string,
  ) {
    return this.svc.adminApprove(user.sub, userId);
  }

  @Patch('admin/reject/:userId')
  adminReject(
    @CurrentUser() user: { sub: string },
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    if (!reason?.trim()) throw new BadRequestException('Rejection reason is required');
    return this.svc.adminReject(user.sub, userId, reason);
  }

  // Dev only: grant admin rights to self (or any userId)
  @Patch('admin/make-admin/:userId')
  makeAdmin(@Param('userId') userId: string) {
    return this.svc.makeAdmin(userId);
  }
}

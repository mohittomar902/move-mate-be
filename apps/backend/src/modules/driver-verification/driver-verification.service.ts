import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentType, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriverVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async saveDocument(userId: string, type: DocumentType, fileUrl: string) {
    await this.prisma.driverDocument.deleteMany({ where: { userId, type } });
    return this.prisma.driverDocument.create({
      data: { userId, type, fileUrl },
    });
  }

  async getMyStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        verificationStatus: true,
        aadhaarNumber: true,
        rejectionReason: true,
        isAdmin: true,
        documents: {
          select: { id: true, type: true, fileUrl: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async submitForReview(userId: string) {
    const [docs, user] = await Promise.all([
      this.prisma.driverDocument.findMany({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { aadhaarNumber: true } }),
    ]);

    const types = docs.map((d) => d.type);

    // Photo documents required
    const requiredDocs: DocumentType[] = [
      DocumentType.SELFIE,
      DocumentType.RC_CARD,
      DocumentType.DRIVING_LICENSE,
    ];
    const missingDocs = requiredDocs.filter((t) => !types.includes(t));
    if (missingDocs.length) {
      throw new BadRequestException(`Missing required documents: ${missingDocs.join(', ')}`);
    }

    const carPhotos = docs.filter((d) => d.type === DocumentType.CAR_PHOTO);
    if (carPhotos.length < 2) {
      throw new BadRequestException('Please upload at least 2 car photos');
    }

    // Aadhaar is stored as a text field, not a document file
    if (!user?.aadhaarNumber) {
      throw new BadRequestException('Aadhaar number is required');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: VerificationStatus.UNDER_REVIEW, rejectionReason: null },
      select: { id: true, verificationStatus: true },
    });
  }

  async saveAadhaar(userId: string, aadhaarNumber: string) {
    const existing = await this.prisma.user.findFirst({
      where: { aadhaarNumber, NOT: { id: userId } },
    });
    if (existing) throw new BadRequestException('Aadhaar already linked to another account');
    return this.prisma.user.update({
      where: { id: userId },
      data: { aadhaarNumber },
      select: { id: true, aadhaarNumber: true },
    });
  }

  // ─── Admin ──────────────────────────────────────────────

  async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) throw new ForbiddenException('Admin access required');
  }

  async getAllRequests(filter?: string) {
    const statusMap: Record<string, VerificationStatus> = {
      pending: VerificationStatus.PENDING,
      under_review: VerificationStatus.UNDER_REVIEW,
      verified: VerificationStatus.VERIFIED,
      rejected: VerificationStatus.REJECTED,
    };

    const where =
      filter && statusMap[filter.toLowerCase()]
        ? { verificationStatus: statusMap[filter.toLowerCase()] }
        : {};

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        phone: true,
        verificationStatus: true,
        rejectionReason: true,
        aadhaarNumber: true,
        createdAt: true,
        documents: {
          select: { id: true, type: true, fileUrl: true, status: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminApprove(adminId: string, userId: string) {
    await this.assertAdmin(adminId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: VerificationStatus.VERIFIED, rejectionReason: null },
      select: { id: true, verificationStatus: true },
    });
  }

  async adminReject(adminId: string, userId: string, reason: string) {
    await this.assertAdmin(adminId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: VerificationStatus.REJECTED, rejectionReason: reason },
      select: { id: true, verificationStatus: true, rejectionReason: true },
    });
  }

  // Dev-only: make a user admin by userId (no auth check)
  async makeAdmin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin: true },
      select: { id: true, isAdmin: true },
    });
  }

  async assertVerified(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verificationStatus: true },
    });
    if (user?.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Complete driver verification before creating trips');
    }
  }
}

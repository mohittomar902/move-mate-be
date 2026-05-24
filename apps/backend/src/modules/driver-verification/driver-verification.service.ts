import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminAction, DocumentType, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriverVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async saveDocument(userId: string, type: DocumentType, fileUrl: string) {
    if (type !== DocumentType.CAR_PHOTO) {
      await this.prisma.driverDocument.deleteMany({ where: { userId, type } });
    }
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
    if (carPhotos.length < 1) {
      throw new BadRequestException('Please upload at least 1 car photo');
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
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { verificationStatus: VerificationStatus.VERIFIED, rejectionReason: null },
        select: { id: true, verificationStatus: true },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: AdminAction.APPROVE_DRIVER,
          targetId: userId,
          targetType: 'user',
        },
      }),
    ]);
    return updated;
  }

  async revokeAdmin(adminId: string, userId: string) {
    await this.assertAdmin(adminId);
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { isAdmin: false },
        select: { id: true, isAdmin: true },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: AdminAction.REVOKE_ADMIN,
          targetId: userId,
          targetType: 'user',
        },
      }),
    ]);
    return updated;
  }

  async adminReject(adminId: string, userId: string, reason: string) {
    await this.assertAdmin(adminId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { verificationStatus: VerificationStatus.REJECTED, rejectionReason: reason },
        select: { id: true, verificationStatus: true, rejectionReason: true },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: AdminAction.REJECT_DRIVER,
          targetId: userId,
          targetType: 'user',
          note: reason,
        },
      }),
    ]);
    return updated;
  }

  // Dev-only: make a user admin by userId (no auth check)
  async makeAdmin(userId: string, adminId?: string) {
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { isAdmin: true },
        select: { id: true, isAdmin: true },
      }),
      ...(adminId
        ? [
            this.prisma.adminLog.create({
              data: {
                adminId,
                action: AdminAction.MAKE_ADMIN,
                targetId: userId,
                targetType: 'user',
              },
            }),
          ]
        : []),
    ]);
    return updated;
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

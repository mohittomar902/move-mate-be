import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  sendPush(userId: string, title: string, body: string) {
    return {
      queued: true,
      provider: 'firebase-cloud-messaging',
      userId,
      title,
      body,
    };
  }
}

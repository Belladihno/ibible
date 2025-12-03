// modules/memories/notifications.adapter.ts
import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { BibleService } from '../bible/bible.service';
import { Memory } from './schemas/memory.schema';

@Injectable()
export class NotificationsAdapter {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly bible: BibleService,
  ) {}

  async sendFollowUpReminder(memory: Memory) {
    let verseText = '';
    if (memory.verseRefs && memory.verseRefs.length > 0) {
      const verse = await this.bible.getVerse(memory.verseRefs[0]);
      verseText =
        Array.isArray(verse?.verses) && verse.verses[0]
          ? verse.verses[0].text
          : '';
    }

    const days = memory.followUp?.reminderDeltaDays ?? 30;
    const message = `It's been ${days} days since your memory: "${memory.title}".${verseText ? `\nVerse: ${verseText}` : ''}`;

    await this.notifications.sendToUser(memory.userId, message, {
      type: 'memory-followup',
      memoryId: memory.id || (memory as any)._id?.toString(),
    });
  }

  async sendAnniversaryAlert(memory: Memory) {
    let verseText = '';
    if (memory.verseRefs && memory.verseRefs.length > 0) {
      const verse = await this.bible.getVerse(memory.verseRefs[0]);
      verseText =
        Array.isArray(verse?.verses) && verse.verses[0]
          ? verse.verses[0].text
          : '';
    }

    const message = `Today is the anniversary of your memory: "${memory.title}". Reflect and give thanks!${verseText ? `\nVerse: ${verseText}` : ''}`;

    await this.notifications.sendToUser(memory.userId, message, {
      type: 'memory-anniversary',
      memoryId: memory.id || (memory as any)._id?.toString(),
    });
  }
}

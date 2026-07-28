import { db } from '../db/index.js';
import { notifications, user, students } from '../db/schema.js';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';
import { waService } from './waService.js';
import { formatTimeWIB, formatDateWIB, getSchoolDate } from '../lib/timezone.js';

interface StudentInfo {
  id: number;
  name: string;
  nis: string;
  parentId: string | null;
}

class NotificationService {
  private formatTime(date: Date | string | null | undefined): string {
    if (!date) return '--:--:--';
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatTimeWIB(d);
  }

  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return '--';
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDateWIB(d);
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PRESENT: 'Hadir',
      LATE: 'Terlambat',
      SICK: 'Sakit',
      EXCUSED: 'Izin',
      ABSENT: 'Alfa',
    };
    return labels[status] || status;
  }

  async sendCheckInNotification(
    student: StudentInfo,
    attendanceDate: string,
    checkinTime: Date,
    status: string,
  ) {
    if (!student.parentId) {
      console.log(`[WA] Skip check-in: ${student.name} has no parent linked`);
      return;
    }

    const parent = await db
      .select({ phone: user.phone })
      .from(user)
      .where(eq(user.id, student.parentId))
      .limit(1);

    if (!parent.length || !parent[0].phone) {
      console.log(`[WA] Skip check-in: ${student.name}'s parent has no phone number`);
      return;
    }

    const phone = parent[0].phone;
    const timeStr = this.formatTime(checkinTime);
    const dateStr = this.formatDate(checkinTime);
    const statusLabel = this.getStatusLabel(status);

    const message = status === 'LATE'
      ? `Assalamu'alaikum Wr. Wb.\n\nAnanda *${student.name}* telah tiba di sekolah pada *${timeStr}* (Terlambat).\nTerima kasih.`
      : `Assalamu'alaikum Wr. Wb.\n\nAnanda *${student.name}* telah tiba di sekolah pada *${timeStr}*.\nTerima kasih.`;

    console.log(`[WA] Sending check-in to ${phone} for ${student.name}...`);
    const result = await waService.sendMessageSafe(phone, message);

    console.log(`[WA] Check-in ${student.name}: ${result.success ? 'SENT' : 'FAILED'} ${result.error || ''}`);

    await db.insert(notifications).values({
      studentId: student.id,
      type: 'CHECKIN',
      recipient: phone,
      message,
      status: result.success ? 'SENT' : 'FAILED',
      error: result.error,
      sentAt: result.success ? getSchoolDate() : null,
    });
  }

  async sendCheckOutNotification(
    student: StudentInfo,
    checkoutTime: Date,
  ) {
    if (!student.parentId) {
      console.log(`[WA] Skip check-out: ${student.name} has no parent linked`);
      return;
    }

    const parent = await db
      .select({ phone: user.phone })
      .from(user)
      .where(eq(user.id, student.parentId))
      .limit(1);

    if (!parent.length || !parent[0].phone) {
      console.log(`[WA] Skip check-out: ${student.name}'s parent has no phone number`);
      return;
    }

    const phone = parent[0].phone;
    const timeStr = this.formatTime(checkoutTime);

    const message = `Assalamu'alaikum Wr. Wb.\n\nAnanda *${student.name}* telah pulang pada pukul *${timeStr}*.\nTerima kasih.`;

    console.log(`[WA] Sending check-out to ${phone} for ${student.name}...`);
    const result = await waService.sendMessageSafe(phone, message);

    console.log(`[WA] Check-out ${student.name}: ${result.success ? 'SENT' : 'FAILED'} ${result.error || ''}`);

    await db.insert(notifications).values({
      studentId: student.id,
      type: 'CHECKOUT',
      recipient: phone,
      message,
      status: result.success ? 'SENT' : 'FAILED',
      error: result.error,
      sentAt: result.success ? getSchoolDate() : null,
    });
  }

  async getNotifications(filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (filters.dateFrom) conditions.push(gte(notifications.createdAt, new Date(filters.dateFrom)));
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setDate(end.getDate() + 1);
      conditions.push(lte(notifications.createdAt, end));
    }
    if (filters.status) conditions.push(eq(notifications.status, filters.status as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.select({
      id: notifications.id,
      studentId: notifications.studentId,
      studentName: students.name,
      studentNis: students.nis,
      type: notifications.type,
      recipient: notifications.recipient,
      status: notifications.status,
      error: notifications.error,
      sentAt: notifications.sentAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(students, eq(notifications.studentId, students.id))
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

    const [{ total }] = await db.select({ total: count() })
      .from(notifications)
      .where(where);

    return { data, total, page, limit };
  }

  async getNotificationStats(filters: { dateFrom?: string; dateTo?: string }) {
    const conditions: any[] = [];
    if (filters.dateFrom) conditions.push(gte(notifications.createdAt, new Date(filters.dateFrom)));
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setDate(end.getDate() + 1);
      conditions.push(lte(notifications.createdAt, end));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [stats] = await db.select({
      total: count(),
      sent: count(sql`CASE WHEN ${notifications.status} = 'SENT' THEN 1 END`),
      failed: count(sql`CASE WHEN ${notifications.status} = 'FAILED' THEN 1 END`),
    })
    .from(notifications)
    .where(where);

    return {
      total: Number(stats.total),
      sent: Number(stats.sent),
      failed: Number(stats.failed),
      rate: stats.total > 0 ? Math.round((Number(stats.sent) / Number(stats.total)) * 100) : 0,
    };
  }
}

export const notificationService = new NotificationService();

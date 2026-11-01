import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { OrganizerItem } from "@/lib/organizer";

const REMINDER_ACTION_TYPE = "myspace-reminder";
const REMINDER_CHANNEL = "myspace-reminders";

export function getReminderNotificationId(reminderId: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < reminderId.length; index += 1) {
    hash = Math.imul(hash ^ reminderId.charCodeAt(index), 0x01000193);
  }
  return (hash & 0x7fffffff) || 1;
}

export function getScheduledReminders(
  items: OrganizerItem[],
  now = Date.now(),
) {
  return items.filter(
    (item): item is OrganizerItem & { type: "reminder"; dueAt: string } =>
      item.type === "reminder" &&
      !item.done &&
      item.dueAt !== undefined &&
      Number.isFinite(Date.parse(item.dueAt)) &&
      Date.parse(item.dueAt) > now,
  );
}

export async function syncReminderNotifications(items: OrganizerItem[]) {
  if (!Capacitor.isNativePlatform()) return;

  const pending = await LocalNotifications.getPending();
  const managed = pending.notifications.filter(
    (notification) => notification.extra?.kind === REMINDER_ACTION_TYPE,
  );
  const reminders = getScheduledReminders(items);

  if (reminders.length === 0) {
    if (managed.length > 0) {
      await LocalNotifications.cancel({
        notifications: managed.map(({ id }) => ({ id })),
      });
    }
    return;
  }

  const permission = await LocalNotifications.checkPermissions();
  const displayPermission =
    permission.display === "granted"
      ? permission
      : await LocalNotifications.requestPermissions();
  if (displayPermission.display !== "granted") {
    throw new Error(
      "Allow notifications for myspace in Android settings to receive reminder alerts.",
    );
  }

  if (Capacitor.getPlatform() === "android") {
    const exactAlarmPermission =
      await LocalNotifications.checkExactNotificationSetting();
    const exactAlarm =
      exactAlarmPermission.exact_alarm === "granted"
        ? exactAlarmPermission
        : await LocalNotifications.changeExactNotificationSetting();
    if (exactAlarm.exact_alarm !== "granted") {
      throw new Error(
        "Allow myspace to set alarms and reminders in Android settings for exact-time alerts.",
      );
    }

    await LocalNotifications.createChannel({
      id: REMINDER_CHANNEL,
      name: "Reminders",
      description: "Scheduled myspace reminders",
      importance: 5,
    });
  }

  const notificationIds = new Map<number, string>();
  const notifications = reminders.map((reminder) => {
    const id = getReminderNotificationId(reminder.id);
    const existingReminderId = notificationIds.get(id);
    if (existingReminderId && existingReminderId !== reminder.id) {
      throw new Error("Could not schedule reminders because their IDs conflict.");
    }
    notificationIds.set(id, reminder.id);

    return {
      id,
      title: reminder.title,
      body: "It's time for your reminder.",
      schedule: { at: new Date(reminder.dueAt) },
      channelId: REMINDER_CHANNEL,
      actionTypeId: REMINDER_ACTION_TYPE,
      extra: { kind: REMINDER_ACTION_TYPE, reminderId: reminder.id },
      isExactNotification: true,
      isExactMandatory: true,
    };
  });

  if (managed.length > 0) {
    await LocalNotifications.cancel({
      notifications: managed.map(({ id }) => ({ id })),
    });
  }

  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: REMINDER_ACTION_TYPE,
        actions: [
          { id: "done", title: "Done" },
          { id: "reschedule", title: "Reschedule" },
        ],
      },
    ],
  });
  await LocalNotifications.schedule({ notifications });
}

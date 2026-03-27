import { useEffect, useRef } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useAppData } from "./AppDataProvider";
import { useMobileReminders } from "./MobileRemindersProvider";

const TRACKED_NOTIFICATION_IDS_KEY = "barks-mobile-reminder-notification-ids";

function getTrackedNotificationIds(): number[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(TRACKED_NOTIFICATION_IDS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

function setTrackedNotificationIds(ids: number[]) {
  try {
    window.localStorage.setItem(TRACKED_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore localStorage failures.
  }
}

function clearTrackedNotificationIds() {
  try {
    window.localStorage.removeItem(TRACKED_NOTIFICATION_IDS_KEY);
  } catch {
    // Ignore localStorage failures.
  }
}

function hashStringToPositiveInt(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return Math.max(1, hash % 2147483647);
}

export default function MobileReminderSync() {
  const { appointments, owners, pets } = useAppData();
  const { settings, isSupported, permissionState } = useMobileReminders();
  const lastFingerprintRef = useRef<string>("");

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const fingerprint = JSON.stringify({
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        ownerId: appointment.ownerId,
        petId: appointment.petId,
        start: appointment.start,
        end: appointment.end,
        status: appointment.status,
        isArchived: appointment.isArchived,
      })),
      enabled: settings.enabled,
      leadMinutes: settings.leadMinutes,
      permissionState,
    });

    if (fingerprint === lastFingerprintRef.current) {
      return;
    }

    lastFingerprintRef.current = fingerprint;

    let cancelled = false;

    const syncNotifications = async () => {
      const trackedIds = getTrackedNotificationIds();
      if (trackedIds.length > 0) {
        await LocalNotifications.cancel({
          notifications: trackedIds.map((id) => ({ id })),
        }).catch(() => undefined);
      }

      if (!settings.enabled || permissionState !== "granted") {
        clearTrackedNotificationIds();
        return;
      }

      const now = Date.now();
      const notifications = appointments
        .filter((appointment) => !appointment.isArchived)
        .filter((appointment) => ["scheduled", "confirmed"].includes(appointment.status))
        .map((appointment) => {
          const appointmentStart = new Date(appointment.start);
          const notifyAt = new Date(appointmentStart.getTime() - settings.leadMinutes * 60 * 1000);

          if (notifyAt.getTime() <= now) {
            return null;
          }

          const pet = pets.find((item) => item.id === appointment.petId);
          const owner = owners.find((item) => item.id === appointment.ownerId);
          const ownerName = owner ? `${owner.firstName} ${owner.lastName}`.trim() : "Client";
          const reminderLabel =
            settings.leadMinutes >= 1440
              ? "tomorrow"
              : settings.leadMinutes >= 60
                ? `${Math.round(settings.leadMinutes / 60)} hour${settings.leadMinutes === 60 ? "" : "s"}`
                : `${settings.leadMinutes} minutes`;

          return {
            id: hashStringToPositiveInt(`${appointment.id}:${settings.leadMinutes}`),
            title: `${pet?.name ?? "Pet"} appointment reminder`,
            body: `${pet?.name ?? "A pet"} is booked with ${ownerName} in ${reminderLabel}.`,
            schedule: {
              at: notifyAt,
              allowWhileIdle: true,
            },
            extra: {
              appointmentId: appointment.id,
            },
          };
        })
        .filter((notification): notification is NonNullable<typeof notification> => notification !== null);

      if (cancelled) {
        return;
      }

      if (notifications.length === 0) {
        clearTrackedNotificationIds();
        return;
      }

      await LocalNotifications.schedule({
        notifications,
      });
      setTrackedNotificationIds(notifications.map((notification) => notification.id));
    };

    void syncNotifications();

    return () => {
      cancelled = true;
    };
  }, [appointments, isSupported, owners, permissionState, pets, settings.enabled, settings.leadMinutes]);

  return null;
}

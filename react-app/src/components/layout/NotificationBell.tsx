import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Dropdown } from "react-bootstrap";
import { Bell } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { listAllUserNotifications, listUserNotifications, markUserNotificationRead } from "../../lib/crmApi";
import type { UserNotification } from "../../types/models";

const notificationTypeLabels: Record<UserNotification["type"], string> = {
  request_created: "New Request",
  request_updated: "Request Update",
  appointment_scheduled: "Appointment",
  account_locked: "Account Lock",
  account_setup: "Account Setup",
  password_reset: "Password Reset",
};

function getNotificationTypeClass(type: UserNotification["type"]) {
  switch (type) {
    case "request_created":
      return "notification-type-pill-request";
    case "request_updated":
      return "notification-type-pill-update";
    case "appointment_scheduled":
      return "notification-type-pill-appointment";
    case "account_locked":
      return "notification-type-pill-alert";
    case "account_setup":
    case "password_reset":
    default:
      return "notification-type-pill-account";
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = showAll ? await listAllUserNotifications() : await listUserNotifications();
        if (!cancelled) {
          setNotifications(data);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [showAll]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const handleOpen = async (notification: UserNotification) => {
    if (!notification.isRead) {
      try {
        await markUserNotificationRead(notification.id);
      } catch {
        // Ignore local badge failure and still navigate.
      }
    }

    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    navigate(notification.href || "/home");
  };

  const handleClear = async () => {
    const unread = notifications.filter((notification) => !notification.isRead);
    if (unread.length > 0) {
      await Promise.all(
        unread.map(async (notification) => {
          try {
            await markUserNotificationRead(notification.id);
          } catch {
            // Ignore individual failures.
          }
        }),
      );
    }
    setNotifications([]);
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="outline-light" className="notification-bell-btn">
        <span aria-hidden="true" className="notification-bell-icon">
          <Bell />
        </span>
        {unreadCount > 0 && (
          <Badge pill bg="danger" className="notification-bell-badge">
            {unreadCount}
          </Badge>
        )}
        <span className="visually-hidden">Notifications</span>
      </Dropdown.Toggle>
      <Dropdown.Menu className="notification-dropdown-menu">
        <div className="notification-dropdown-header d-flex align-items-center justify-content-between gap-2">
          <span>Notifications</span>
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="link"
              size="sm"
              className="notification-history-btn"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Unread Only" : "View All"}
            </Button>
            <Button
              variant="link"
              size="sm"
              className="notification-clear-btn"
              onClick={() => {
                void handleClear();
              }}
              disabled={notifications.length === 0 || showAll}
            >
              Clear
            </Button>
          </div>
        </div>
        {isLoading ? (
          <div className="notification-dropdown-empty">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="notification-dropdown-empty">
            {showAll ? "No notifications yet." : "No unread notifications."}
          </div>
        ) : (
          notifications.map((notification) => (
            <Dropdown.Item
              key={notification.id}
              className={`notification-dropdown-item${notification.isRead ? "" : " is-unread"}`}
              onClick={() => {
                void handleOpen(notification);
              }}
            >
              <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                <span className={`notification-type-pill ${getNotificationTypeClass(notification.type)}`}>
                  {notificationTypeLabels[notification.type]}
                </span>
                <span className="notification-dropdown-time">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="fw-semibold">{notification.title}</div>
              <div className="small text-muted">{notification.body}</div>
            </Dropdown.Item>
          ))
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

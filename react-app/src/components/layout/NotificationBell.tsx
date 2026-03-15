import { useEffect, useMemo, useState } from "react";
import { Badge, Dropdown } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { listUserNotifications, markUserNotificationRead } from "../../lib/crmApi";
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

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listUserNotifications();
        if (!cancelled) {
          setNotifications(data);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
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
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const handleOpen = async (notification: UserNotification) => {
    if (!notification.isRead) {
      try {
        const updated = await markUserNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch {
        // Ignore local badge failure and still navigate.
      }
    }

    navigate(notification.href || "/home");
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="outline-light" className="notification-bell-btn">
        <span aria-hidden="true" className="notification-bell-icon">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M6.5 17.5h11l-1.3-1.7a2.5 2.5 0 0 1-.5-1.5V10a3.7 3.7 0 0 0-7.4 0v4.3a2.5 2.5 0 0 1-.5 1.5L6.5 17.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path d="M10 18.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        {unreadCount > 0 && (
          <Badge pill bg="danger" className="notification-bell-badge">
            {unreadCount}
          </Badge>
        )}
        <span className="visually-hidden">Notifications</span>
      </Dropdown.Toggle>
      <Dropdown.Menu className="notification-dropdown-menu">
        <div className="notification-dropdown-header">Notifications</div>
        {notifications.length === 0 ? (
          <div className="notification-dropdown-empty">No notifications yet.</div>
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

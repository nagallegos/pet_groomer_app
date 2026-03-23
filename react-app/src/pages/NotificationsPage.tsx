import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Dropdown, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import PageLoader from "../components/common/PageLoader";
import useInitialLoading from "../hooks/useInitialLoading";
import { listAllUserNotifications, markUserNotificationRead } from "../lib/crmApi";
import type { UserNotification } from "../types/models";

const notificationTypeLabels: Record<UserNotification["type"], string> = {
  request_created: "New Request",
  request_updated: "Request Update",
  appointment_scheduled: "Appointment",
  account_locked: "Account Lock",
  account_setup: "Account Setup",
  password_reset: "Password Reset",
};

const notificationTypeOptions = [
  { value: "all", label: "All types" },
  { value: "request_created", label: "New Request" },
  { value: "request_updated", label: "Request Update" },
  { value: "appointment_scheduled", label: "Appointment" },
  { value: "account_locked", label: "Account Lock" },
  { value: "account_setup", label: "Account Setup" },
  { value: "password_reset", label: "Password Reset" },
] as const;

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

type FilterType = (typeof notificationTypeOptions)[number]["value"];
type ReadFilter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const isLoading = useInitialLoading();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadNotifications = async () => {
    setIsRefreshing(true);
    try {
      const data = await listAllUserNotifications();
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      if (typeFilter !== "all" && notification.type !== typeFilter) {
        return false;
      }
      if (readFilter === "read" && !notification.isRead) {
        return false;
      }
      if (readFilter === "unread" && notification.isRead) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const content = `${notification.title} ${notification.body}`.toLowerCase();
      return content.includes(normalizedSearch);
    });
  }, [notifications, readFilter, search, typeFilter]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  if (isLoading) {
    return <PageLoader label="Loading notifications..." />;
  }

  const handleOpen = async (notification: UserNotification) => {
    if (!notification.isRead) {
      try {
        const updated = await markUserNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch {
        // ignore
      }
    }

    if (notification.href) {
      navigate(notification.href);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((notification) => !notification.isRead);
    if (unread.length === 0) {
      return;
    }
    await Promise.all(
      unread.map(async (notification) => {
        try {
          await markUserNotificationRead(notification.id);
        } catch {
          // ignore individual failures
        }
      }),
    );
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  };

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Activity</p>
          <h2 className="mb-1">Notifications</h2>
          <p className="text-muted mb-0">
            Review updates across requests, appointments, and account activity.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-secondary" onClick={() => void loadNotifications()} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="outline-secondary" onClick={() => void markAllRead()} disabled={unreadCount === 0}>
            Mark All Read
          </Button>
        </div>
      </div>

      <Card className="shadow-sm mb-3">
        <Card.Body className="search-panel-card d-flex flex-column flex-md-row gap-3 align-items-md-center">
          <Form.Control
            placeholder="Search notifications..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Form.Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as FilterType)}>
            {notificationTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary">Status: {readFilter}</Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setReadFilter("all")}>All</Dropdown.Item>
              <Dropdown.Item onClick={() => setReadFilter("unread")}>Unread</Dropdown.Item>
              <Dropdown.Item onClick={() => setReadFilter("read")}>Read</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Card.Body>
      </Card>

      {filteredNotifications.length === 0 ? (
        <Card className="shadow-sm">
          <Card.Body className="text-muted small">No notifications found.</Card.Body>
        </Card>
      ) : (
        <div className="d-grid gap-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`notification-card${notification.isRead ? "" : " is-unread"}`}
              onClick={() => void handleOpen(notification)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void handleOpen(notification);
                }
              }}
            >
              <Card.Body className="d-grid gap-2">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <span className={`notification-type-pill ${getNotificationTypeClass(notification.type)}`}>
                    {notificationTypeLabels[notification.type]}
                  </span>
                  <div className="d-flex align-items-center gap-2">
                    {!notification.isRead && (
                      <Badge bg="danger">Unread</Badge>
                    )}
                    <span className="text-muted small">{new Date(notification.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="fw-semibold">{notification.title}</div>
                <div className="text-muted small">{notification.body}</div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

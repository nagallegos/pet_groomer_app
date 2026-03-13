import { useEffect, useMemo, useState } from "react";
import { Button, Card, Collapse, Form, ListGroup } from "react-bootstrap";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import PageLoader from "../components/common/PageLoader";
import { useAppToast } from "../components/common/AppToastProvider";
import { useAuth } from "../components/common/useAuth";
import UserFormModal from "../components/users/UserFormModal";
import {
  deleteManagedUser,
  listManagedUsers,
  saveManagedUser,
  type ManagedUser,
  type ManagedUserUpsertInput,
} from "../lib/crmApi";

type SortField = "name" | "email" | "role";

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  groomer: "Pet Groomer",
  client: "Client User",
};

export default function UsersPage() {
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showControls, setShowControls] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listManagedUsers()
      .then((data) => {
        if (!cancelled) {
          setUsers(data);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load users.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedSearchTerm = activeSearchTerm.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return [...users]
      .filter((managedUser) => {
        if (roleFilter !== "all" && managedUser.role !== roleFilter) {
          return false;
        }
        if (statusFilter === "active" && !managedUser.isActive) {
          return false;
        }
        if (statusFilter === "inactive" && managedUser.isActive) {
          return false;
        }
        if (!normalizedSearchTerm) {
          return true;
        }
        return [
          managedUser.firstName,
          managedUser.lastName,
          managedUser.email,
          managedUser.phone,
          roleLabels[managedUser.role],
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchTerm);
      })
      .sort((a, b) => {
        const aValue =
          sortField === "email"
            ? a.email
            : sortField === "role"
              ? roleLabels[a.role]
              : `${a.firstName} ${a.lastName}`;
        const bValue =
          sortField === "email"
            ? b.email
            : sortField === "role"
              ? roleLabels[b.role]
              : `${b.firstName} ${b.lastName}`;
        const direction = sortDirection === "asc" ? 1 : -1;
        return aValue.localeCompare(bValue, undefined, { sensitivity: "base" }) * direction;
      });
  }, [normalizedSearchTerm, roleFilter, sortDirection, sortField, statusFilter, users]);

  if (!user || user.role !== "admin") {
    return <PageLoader label="Checking administrator access..." />;
  }

  const handleSave = async (input: ManagedUserUpsertInput, existingUser?: ManagedUser) => {
    const savedUser = await saveManagedUser(input, existingUser);
    setUsers((current) =>
      existingUser
        ? current.map((item) => (item.id === savedUser.id ? savedUser : item))
        : [savedUser, ...current],
    );
    showToast({
      title: existingUser ? "User Updated" : "User Added",
      body: existingUser
        ? "The user account was updated."
        : "The new user account is ready.",
      variant: "success",
    });
  };

  const handleDelete = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      const deletedUser = await deleteManagedUser(selectedUser.id);
      setUsers((current) => current.filter((item) => item.id !== deletedUser.id));
      setShowDeleteModal(false);
      setSelectedUser(null);
      showToast({
        title: "User Deleted",
        body: "The user account was removed.",
        variant: "warning",
      });
    } catch (deleteError) {
      setShowDeleteModal(false);
      showToast({
        title: "Delete Failed",
        body:
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete the user.",
        variant: "danger",
      });
    }
  };

  if (isLoading) {
    return <PageLoader label="Loading users..." />;
  }

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Administration</p>
          <h2 className="mb-1">Users</h2>
          <p className="text-muted mb-0">
            Manage administrator, groomer, and future client user accounts.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setSelectedUser(null);
            setShowUserModal(true);
          }}
        >
          + Add User
        </Button>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Body className="search-panel-card">
          <div className="search-panel-header">
            <Form
              className="search-panel-main"
              onSubmit={(event) => {
                event.preventDefault();
                setActiveSearchTerm(searchInput);
              }}
            >
              <Form.Group>
                <Form.Label>Search Users</Form.Label>
                <div className="search-panel-input-row">
                  <Form.Control
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by name, email, phone, or role"
                  />
                  <Button type="submit" variant="primary" aria-label="Search users">
                    <span aria-hidden="true" className="search-panel-icon">
                      ⌕
                    </span>
                  </Button>
                </div>
              </Form.Group>
            </Form>
          </div>

          <Collapse in={showControls}>
            <div className="search-panel-controls">
              <div className="search-panel-control-grid">
                <Form.Group>
                  <Form.Label>User Type</Form.Label>
                  <Form.Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                    <option value="all">All Roles</option>
                    <option value="admin">Administrator</option>
                    <option value="groomer">Pet Groomer</option>
                    <option value="client">Client User</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Sort By</Form.Label>
                  <Form.Select value={sortField} onChange={(event) => setSortField(event.target.value as SortField)}>
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="role">Role</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Direction</Form.Label>
                  <Form.Select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as "asc" | "desc")}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
          </Collapse>

          <div className="search-panel-footer">
            <div className="text-muted small">
              {filteredUsers.length} user{filteredUsers.length === 1 ? "" : "s"} shown.
            </div>
            <Button
              type="button"
              variant="outline-secondary"
              className={`search-panel-toggle${showControls ? " is-open" : ""}`}
              aria-expanded={showControls}
              onClick={() => setShowControls((current) => !current)}
            >
              <span aria-hidden="true">⌄</span>
              <span className="visually-hidden">Toggle filters and sorting</span>
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body className="d-grid gap-3">
          {error && <div className="alert alert-danger mb-0">{error}</div>}

          <ListGroup variant="flush" className="user-directory-list">
            {filteredUsers.map((managedUser) => (
              <ListGroup.Item key={managedUser.id} className="user-directory-item">
                <div className="user-directory-main">
                  <div className="user-directory-copy">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <div className="fw-semibold">
                        {managedUser.firstName} {managedUser.lastName}
                      </div>
                      <span className="user-role-badge">{roleLabels[managedUser.role]}</span>
                      {!managedUser.isActive && (
                        <span className="user-status-badge user-status-badge-inactive">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-muted small mt-1">{managedUser.email}</div>
                    <div className="text-muted small">
                      {managedUser.phone || "No phone"} | Email{" "}
                      {managedUser.notifyByEmail ? "on" : "off"} | Text{" "}
                      {managedUser.notifyByText ? "on" : "off"}
                    </div>
                  </div>
                  <div className="user-directory-actions">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => {
                        setSelectedUser(managedUser);
                        setShowUserModal(true);
                      }}
                    >
                      Edit
                    </Button>
                    {managedUser.id !== user.id && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => {
                          setSelectedUser(managedUser);
                          setShowDeleteModal(true);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>

          {filteredUsers.length === 0 && (
            <div className="text-muted small">No users match the current filters.</div>
          )}
        </Card.Body>
      </Card>

      <UserFormModal
        show={showUserModal}
        onHide={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        initialUser={selectedUser}
        onSave={handleSave}
        currentUserId={user.id}
      />

      <ConfirmDeleteModal
        show={showDeleteModal}
        title="Delete User"
        body={
          selectedUser
            ? `Delete ${selectedUser.firstName} ${selectedUser.lastName}'s account?`
            : "Delete this user?"
        }
        note="This removes the login account immediately."
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          void handleDelete();
        }}
        confirmLabel="Delete User"
      />
    </>
  );
}

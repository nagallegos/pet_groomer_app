import { useState } from 'react'
import { Table, Button, Modal, Form, Badge } from 'react-bootstrap'

export interface Client {
  id: number
  name: string
  phone: string
  email: string
  petName: string
  petBreed: string
}

const initialClients: Client[] = [
  {
    id: 1,
    name: 'Alice Johnson',
    phone: '555-0101',
    email: 'alice@example.com',
    petName: 'Buddy',
    petBreed: 'Golden Retriever',
  },
  {
    id: 2,
    name: 'Bob Smith',
    phone: '555-0102',
    email: 'bob@example.com',
    petName: 'Mittens',
    petBreed: 'Domestic Shorthair',
  },
]

const emptyClient: Omit<Client, 'id'> = {
  name: '',
  phone: '',
  email: '',
  petName: '',
  petBreed: '',
}

function ClientList() {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [form, setForm] = useState<Omit<Client, 'id'>>(emptyClient)

  const openAdd = () => {
    setEditingClient(null)
    setForm(emptyClient)
    setShowModal(true)
  }

  const openEdit = (client: Client) => {
    setEditingClient(client)
    setForm({ name: client.name, phone: client.phone, email: client.email, petName: client.petName, petBreed: client.petBreed })
    setShowModal(true)
  }

  const handleDelete = (id: number) => {
    setClients(clients.filter((c) => c.id !== id))
  }

  const handleSave = () => {
    if (editingClient) {
      setClients(clients.map((c) => (c.id === editingClient.id ? { ...editingClient, ...form } : c)))
    } else {
      const newId = clients.length > 0 ? Math.max(...clients.map((c) => c.id)) + 1 : 1
      setClients([...clients, { id: newId, ...form }])
    }
    setShowModal(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>
          Clients <Badge bg="secondary">{clients.length}</Badge>
        </h2>
        <Button variant="primary" onClick={openAdd}>
          + Add Client
        </Button>
      </div>

      <Table striped bordered hover responsive>
        <thead className="table-primary">
          <tr>
            <th>Owner Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Pet Name</th>
            <th>Pet Breed</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-muted">
                No clients yet. Add your first client!
              </td>
            </tr>
          ) : (
            clients.map((client) => (
              <tr key={client.id}>
                <td>{client.name}</td>
                <td>{client.phone}</td>
                <td>{client.email}</td>
                <td>{client.petName}</td>
                <td>{client.petBreed}</td>
                <td>
                  <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openEdit(client)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => handleDelete(client.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingClient ? 'Edit Client' : 'Add Client'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {(['name', 'phone', 'email', 'petName', 'petBreed'] as const).map((field) => (
              <Form.Group className="mb-3" key={field}>
                <Form.Label>
                  {field === 'petName' ? 'Pet Name' : field === 'petBreed' ? 'Pet Breed' : field.charAt(0).toUpperCase() + field.slice(1)}
                </Form.Label>
                <Form.Control
                  name={field}
                  value={form[field]}
                  onChange={handleChange}
                  placeholder={`Enter ${field}`}
                />
              </Form.Group>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!form.name || !form.petName}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default ClientList

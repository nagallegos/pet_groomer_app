import { useState } from 'react'
import { Table, Button, Modal, Form, Badge } from 'react-bootstrap'

export interface Appointment {
  id: number
  clientName: string
  petName: string
  service: string
  date: string
  time: string
  notes: string
}

const SERVICES = ['Bath & Brush', 'Full Groom', 'Nail Trim', 'Teeth Cleaning', 'Ear Cleaning', 'De-shedding']

const initialAppointments: Appointment[] = [
  {
    id: 1,
    clientName: 'Alice Johnson',
    petName: 'Buddy',
    service: 'Full Groom',
    date: '2026-03-20',
    time: '10:00',
    notes: 'Trim around ears',
  },
  {
    id: 2,
    clientName: 'Bob Smith',
    petName: 'Mittens',
    service: 'Bath & Brush',
    date: '2026-03-21',
    time: '14:00',
    notes: '',
  },
]

const emptyAppointment: Omit<Appointment, 'id'> = {
  clientName: '',
  petName: '',
  service: SERVICES[0],
  date: '',
  time: '',
  notes: '',
}

function AppointmentList() {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [showModal, setShowModal] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null)
  const [form, setForm] = useState<Omit<Appointment, 'id'>>(emptyAppointment)

  const openAdd = () => {
    setEditingAppt(null)
    setForm(emptyAppointment)
    setShowModal(true)
  }

  const openEdit = (appt: Appointment) => {
    setEditingAppt(appt)
    setForm({
      clientName: appt.clientName,
      petName: appt.petName,
      service: appt.service,
      date: appt.date,
      time: appt.time,
      notes: appt.notes,
    })
    setShowModal(true)
  }

  const handleDelete = (id: number) => {
    setAppointments(appointments.filter((a) => a.id !== id))
  }

  const handleSave = () => {
    if (editingAppt) {
      setAppointments(appointments.map((a) => (a.id === editingAppt.id ? { ...editingAppt, ...form } : a)))
    } else {
      const newId = appointments.length > 0 ? Math.max(...appointments.map((a) => a.id)) + 1 : 1
      setAppointments([...appointments, { id: newId, ...form }])
    }
    setShowModal(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const sortedAppointments = [...appointments].sort((a, b) => {
    const aDateTime = `${a.date}T${a.time}`
    const bDateTime = `${b.date}T${b.time}`
    return aDateTime.localeCompare(bDateTime)
  })

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>
          Appointments <Badge bg="secondary">{appointments.length}</Badge>
        </h2>
        <Button variant="primary" onClick={openAdd}>
          + Add Appointment
        </Button>
      </div>

      <Table striped bordered hover responsive>
        <thead className="table-primary">
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Client</th>
            <th>Pet</th>
            <th>Service</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedAppointments.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-muted">
                No appointments yet. Schedule your first appointment!
              </td>
            </tr>
          ) : (
            sortedAppointments.map((appt) => (
              <tr key={appt.id}>
                <td>{appt.date}</td>
                <td>{appt.time}</td>
                <td>{appt.clientName}</td>
                <td>{appt.petName}</td>
                <td>{appt.service}</td>
                <td>{appt.notes || <span className="text-muted">—</span>}</td>
                <td>
                  <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openEdit(appt)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => handleDelete(appt.id)}>
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
          <Modal.Title>{editingAppt ? 'Edit Appointment' : 'Add Appointment'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Client Name</Form.Label>
              <Form.Control name="clientName" value={form.clientName} onChange={handleChange} placeholder="Enter client name" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Pet Name</Form.Label>
              <Form.Control name="petName" value={form.petName} onChange={handleChange} placeholder="Enter pet name" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Service</Form.Label>
              <Form.Select name="service" value={form.service} onChange={handleChange}>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control type="date" name="date" value={form.date} onChange={handleChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Time</Form.Label>
              <Form.Control type="time" name="time" value={form.time} onChange={handleChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!form.clientName || !form.petName || !form.date || !form.time}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default AppointmentList

import { useState } from 'react'
import { Container, Navbar, Nav, Tab, Row, Col } from 'react-bootstrap'
import ClientList from './components/ClientList'
import AppointmentList from './components/AppointmentList'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('clients')

  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand href="#">🐾 Pet Groomer App</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="ms-auto">
              <Nav.Link
                active={activeTab === 'clients'}
                onClick={() => setActiveTab('clients')}
              >
                Clients
              </Nav.Link>
              <Nav.Link
                active={activeTab === 'appointments'}
                onClick={() => setActiveTab('appointments')}
              >
                Appointments
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        <Tab.Container activeKey={activeTab}>
          <Tab.Content>
            <Tab.Pane eventKey="clients">
              <Row>
                <Col>
                  <ClientList />
                </Col>
              </Row>
            </Tab.Pane>
            <Tab.Pane eventKey="appointments">
              <Row>
                <Col>
                  <AppointmentList />
                </Col>
              </Row>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Container>
    </>
  )
}

export default App

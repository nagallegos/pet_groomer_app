import { useMemo, useState } from "react";
import { addWeeks, endOfDay, format, startOfDay, startOfWeek, startOfYear, subWeeks } from "date-fns";
import { Card, Col, Form, Row } from "react-bootstrap";
import AnalyticsLineChart from "../components/analytics/AnalyticsLineChart";
import PageLoader from "../components/common/PageLoader";
import { mockAppointments } from "../data/mockData";
import useInitialLoading from "../hooks/useInitialLoading";
import type { Appointment } from "../types/models";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function buildWeeklySeries(
  appointments: Appointment[],
  rangeStart: Date,
  rangeEnd: Date,
  getValue: (appointment: Appointment) => number,
) {
  const safeStart = startOfWeek(rangeStart, { weekStartsOn: 1 });
  const safeEnd = endOfDay(rangeEnd);
  const buckets: Array<{ label: string; value: number }> = [];

  let cursor = safeStart;

  while (cursor <= safeEnd) {
    const bucketEnd = endOfDay(addWeeks(cursor, 1));
    const value = appointments.reduce((total, appointment) => {
      const appointmentStart = new Date(appointment.start);

      if (appointmentStart < cursor || appointmentStart >= bucketEnd) {
        return total;
      }

      return total + getValue(appointment);
    }, 0);

    buckets.push({
      label: format(cursor, "MMM d"),
      value,
    });

    cursor = addWeeks(cursor, 1);
  }

  return buckets;
}

function isRecognizedRevenueAppointment(appointment: Appointment, now: Date) {
  const appointmentStart = new Date(appointment.start);

  return (
    !appointment.isArchived &&
    appointmentStart <= now &&
    appointment.status !== "cancelled" &&
    appointment.status !== "no-show"
  );
}

function isHistoricalAppointment(appointment: Appointment, now: Date) {
  return !appointment.isArchived && new Date(appointment.start) <= now;
}

function isRangeValid(start: string, end: string) {
  return Boolean(start) && Boolean(end) && new Date(start) <= new Date(end);
}

export default function AnalysisPage() {
  const isLoading = useInitialLoading();
  const now = new Date();
  const today = startOfDay(now);
  const currentYear = today.getFullYear();
  const yearStart = startOfYear(today);
  const [selectedRevenueYear, setSelectedRevenueYear] = useState(currentYear);
  const [selectedAppointmentsYear, setSelectedAppointmentsYear] =
    useState(currentYear);

  const [revenueRangeStart, setRevenueRangeStart] = useState(
    toDateInputValue(subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 11)),
  );
  const [revenueRangeEnd, setRevenueRangeEnd] = useState(toDateInputValue(today));
  const [appointmentsRangeStart, setAppointmentsRangeStart] = useState(
    toDateInputValue(subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 11)),
  );
  const [appointmentsRangeEnd, setAppointmentsRangeEnd] = useState(
    toDateInputValue(addWeeks(today, 6)),
  );

  const activeAppointments = useMemo(
    () => mockAppointments.filter((appointment) => !appointment.isArchived),
    [],
  );

  const revenueYtd = useMemo(
    () =>
      activeAppointments
        .filter((appointment) => {
          const appointmentStart = new Date(appointment.start);
          return (
            isRecognizedRevenueAppointment(appointment, now) &&
            appointmentStart >= yearStart
          );
        })
        .reduce((total, appointment) => total + appointment.cost, 0),
    [activeAppointments, now, yearStart],
  );

  const revenueForYear = useMemo(
    () =>
      activeAppointments
        .filter((appointment) => {
          const appointmentStart = new Date(appointment.start);
          return (
            isRecognizedRevenueAppointment(appointment, now) &&
            appointmentStart.getFullYear() === selectedRevenueYear
          );
        })
        .reduce((total, appointment) => total + appointment.cost, 0),
    [activeAppointments, now, selectedRevenueYear],
  );

  const revenueYearOptions = useMemo(() => {
    const years: number[] = [];

    for (let year = currentYear; year >= 2000; year -= 1) {
      years.push(year);
    }

    return years;
  }, [currentYear]);

  const appointmentsYtd = useMemo(
    () =>
      activeAppointments.filter((appointment) => {
        const appointmentStart = new Date(appointment.start);
        return isHistoricalAppointment(appointment, now) && appointmentStart >= yearStart;
      }).length,
    [activeAppointments, now, yearStart],
  );

  const appointmentsForYear = useMemo(
    () =>
      activeAppointments.filter((appointment) => {
        const appointmentStart = new Date(appointment.start);
        return (
          isHistoricalAppointment(appointment, now) &&
          appointmentStart.getFullYear() === selectedAppointmentsYear
        );
      }).length,
    [activeAppointments, now, selectedAppointmentsYear],
  );

  const revenueSeries = useMemo(() => {
    if (!isRangeValid(revenueRangeStart, revenueRangeEnd)) {
      return [];
    }

    return buildWeeklySeries(
      activeAppointments.filter((appointment) =>
        isRecognizedRevenueAppointment(appointment, now),
      ),
      startOfDay(new Date(revenueRangeStart)),
      endOfDay(new Date(revenueRangeEnd)),
      (appointment) => appointment.cost,
    );
  }, [activeAppointments, now, revenueRangeEnd, revenueRangeStart]);

  const appointmentSeries = useMemo(() => {
    if (!isRangeValid(appointmentsRangeStart, appointmentsRangeEnd)) {
      return [];
    }

    return buildWeeklySeries(
      activeAppointments,
      startOfDay(new Date(appointmentsRangeStart)),
      endOfDay(new Date(appointmentsRangeEnd)),
      () => 1,
    );
  }, [activeAppointments, appointmentsRangeEnd, appointmentsRangeStart]);

  if (isLoading) {
    return <PageLoader label="Loading analysis..." />;
  }

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Analysis</p>
          <h2 className="mb-1">Revenue and Appointment Trends</h2>
          <p className="text-muted mb-0">
            Track year-to-date performance and weekly booking patterns with adjustable date ranges.
          </p>
        </div>
      </div>

      <div className="analysis-summary mb-4">
        <Row className="g-3 mb-3">
          <Col xs={12} md={6}>
            <Card className="shadow-sm dashboard-stat-card dashboard-stat-gold analysis-stat-card">
              <Card.Body>
                <p className="dashboard-stat-label mb-2">Revenue YTD</p>
                <div className="dashboard-stat-value">
                  {currencyFormatter.format(revenueYtd)}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="shadow-sm dashboard-stat-card dashboard-stat-foam analysis-stat-card">
              <Card.Body>
                <p className="dashboard-stat-label mb-2">Appointments YTD</p>
                <div className="dashboard-stat-value">{appointmentsYtd}</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-3">
          <Col xs={12}>
            <Card className="shadow-sm dashboard-stat-card dashboard-stat-mint analysis-stat-card analysis-stat-card-year">
              <Card.Body>
                <div className="analysis-stat-header mb-2">
                  <div className="dashboard-stat-label mb-0">
                    Revenue for{" "}
                    <Form.Select
                      size="sm"
                      className="analytics-year-select analytics-year-select-inline"
                      value={selectedRevenueYear}
                      onChange={(event) =>
                        setSelectedRevenueYear(Number(event.target.value))
                      }
                    >
                      {revenueYearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </div>
                <div className="dashboard-stat-value">
                  {currencyFormatter.format(revenueForYear)}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12}>
            <Card className="shadow-sm dashboard-stat-card dashboard-stat-blush analysis-stat-card analysis-stat-card-year">
              <Card.Body>
                <div className="analysis-stat-header mb-2">
                  <div className="dashboard-stat-label mb-0">
                    Appointments for{" "}
                    <Form.Select
                      size="sm"
                      className="analytics-year-select analytics-year-select-inline"
                      value={selectedAppointmentsYear}
                      onChange={(event) =>
                        setSelectedAppointmentsYear(Number(event.target.value))
                      }
                    >
                      {revenueYearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </div>
                <div className="dashboard-stat-value">{appointmentsForYear}</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      <Row className="g-4">
        <Col xs={12}>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <Card.Title className="mb-1">Revenue Week to Week</Card.Title>
                  <p className="text-muted small mb-0">
                    Revenue includes non-archived past appointments and excludes cancelled and no-show records.
                  </p>
                </div>

                <div className="analytics-range-group">
                  <Form.Group>
                    <Form.Label>Start</Form.Label>
                    <Form.Control
                      type="date"
                      value={revenueRangeStart}
                      onChange={(event) => setRevenueRangeStart(event.target.value)}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>End</Form.Label>
                    <Form.Control
                      type="date"
                      value={revenueRangeEnd}
                      onChange={(event) => setRevenueRangeEnd(event.target.value)}
                    />
                  </Form.Group>
                </div>
              </div>

              {revenueSeries.length === 0 ? (
                <p className="text-muted mb-0">
                  Select a valid date range to view revenue trends.
                </p>
              ) : (
                <AnalyticsLineChart
                  ariaLabel="Weekly revenue chart"
                  color="#c89b68"
                  points={revenueSeries}
                  formatValue={(value) => currencyFormatter.format(value)}
                  detailsLabel="View Revenue Data Points"
                />
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12}>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <Card.Title className="mb-1">Appointments Week to Week</Card.Title>
                  <p className="text-muted small mb-0">
                    Appointment totals include upcoming scheduled bookings when they fall inside the selected range.
                  </p>
                </div>

                <div className="analytics-range-group">
                  <Form.Group>
                    <Form.Label>Start</Form.Label>
                    <Form.Control
                      type="date"
                      value={appointmentsRangeStart}
                      onChange={(event) => setAppointmentsRangeStart(event.target.value)}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>End</Form.Label>
                    <Form.Control
                      type="date"
                      value={appointmentsRangeEnd}
                      onChange={(event) => setAppointmentsRangeEnd(event.target.value)}
                    />
                  </Form.Group>
                </div>
              </div>

              {appointmentSeries.length === 0 ? (
                <p className="text-muted mb-0">
                  Select a valid date range to view appointment trends.
                </p>
              ) : (
                <AnalyticsLineChart
                  ariaLabel="Weekly appointment chart"
                  color="#2f6b5c"
                  points={appointmentSeries}
                  detailsLabel="View Appointment Data Points"
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

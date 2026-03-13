import { Button, ButtonGroup, Dropdown } from "react-bootstrap";
import { Views, type ToolbarProps, type View } from "react-big-calendar";

type CalendarViewName = View | "three_day";

const VIEW_LABELS: Partial<Record<CalendarViewName, string>> = {
  [Views.MONTH]: "Month",
  [Views.WEEK]: "Week",
  [Views.WORK_WEEK]: "Work Week",
  [Views.DAY]: "Day",
  [Views.AGENDA]: "Agenda",
  three_day: "3 Days",
};

export default function CustomCalendarToolbar<
  TEvent extends object,
  TResource extends object,
>({
  label,
  onNavigate,
  onView,
  view,
  views,
}: ToolbarProps<TEvent, TResource>) {
  const viewMap = views as Record<string, boolean | object | undefined>;
  const availableViews: CalendarViewName[] = Array.isArray(views)
    ? views
    : (Object.keys(views) as CalendarViewName[]).filter((key) =>
        Boolean(viewMap[key]),
      );

  return (
    <div className="calendar-toolbar d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-2 mb-3">
      <ButtonGroup>
        <Button
          variant="outline-secondary"
          className="calendar-toolbar-nav-btn"
          onClick={() => onNavigate("PREV")}
        >
          <span aria-hidden="true" className="calendar-toolbar-nav-icon">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="m14.5 6.5-5 5 5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="visually-hidden">Previous</span>
        </Button>
        <Button
          variant="outline-secondary"
          className="calendar-toolbar-today-btn"
          onClick={() => onNavigate("TODAY")}
        >
          Today
        </Button>
        <Button
          variant="outline-secondary"
          className="calendar-toolbar-nav-btn"
          onClick={() => onNavigate("NEXT")}
        >
          <span aria-hidden="true" className="calendar-toolbar-nav-icon">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="m9.5 6.5 5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="visually-hidden">Next</span>
        </Button>
      </ButtonGroup>

      <div className="calendar-toolbar-label text-center fw-semibold">
        {label}
      </div>

      <Dropdown>
        <Dropdown.Toggle variant="outline-primary" id="calendar-view-dropdown">
          {VIEW_LABELS[view as CalendarViewName] ?? view}
        </Dropdown.Toggle>

        <Dropdown.Menu align="end">
          {availableViews.map((viewName) => (
            <Dropdown.Item
              key={viewName}
              active={viewName === view}
              onClick={() => onView(viewName as View)}
            >
              {VIEW_LABELS[viewName] ?? viewName}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}

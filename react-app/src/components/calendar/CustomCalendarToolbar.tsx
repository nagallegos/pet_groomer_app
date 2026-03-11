import { Button, ButtonGroup, Dropdown } from "react-bootstrap";
import { Views, type ToolbarProps, type View } from "react-big-calendar";

type CalendarViewName = View | "three_day";

const VIEW_LABELS: Partial<Record<CalendarViewName, string>> = {
  [Views.MONTH]: "Month",
  [Views.WEEK]: "Week",
  [Views.WORK_WEEK]: "Work Week",
  [Views.DAY]: "Day",
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
        <Button variant="outline-secondary" onClick={() => onNavigate("PREV")}>
          Prev
        </Button>
        <Button variant="outline-secondary" onClick={() => onNavigate("TODAY")}>
          Today
        </Button>
        <Button variant="outline-secondary" onClick={() => onNavigate("NEXT")}>
          Next
        </Button>
      </ButtonGroup>

      <div className="calendar-toolbar-label text-center fw-semibold">
        {label}
      </div>

      <Dropdown>
        <Dropdown.Toggle variant="outline-primary" id="calendar-view-dropdown">
          View: {VIEW_LABELS[view as CalendarViewName] ?? view}
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

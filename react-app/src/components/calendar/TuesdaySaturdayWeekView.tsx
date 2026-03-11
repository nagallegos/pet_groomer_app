import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  Navigate,
  type DateLocalizer,
  type NavigateAction,
  type TitleOptions,
} from "react-big-calendar";
import TimeGrid from "react-big-calendar/lib/TimeGrid";

interface CustomWeekViewProps {
  date: Date;
  localizer: DateLocalizer;
  max?: Date;
  min?: Date;
  scrollToTime?: Date;
  [key: string]: unknown;
}

type RangeOptions = {
  localizer: DateLocalizer;
};

const TUESDAY_INDEX = 2;
const SATURDAY_INDEX = 6;
const WORK_WEEK_LENGTH = SATURDAY_INDEX - TUESDAY_INDEX + 1;

function getTuesdayStart(date: Date, localizer: DateLocalizer): Date {
  const startOfDay = localizer.startOf(date, "day");
  const dayIndex = startOfDay.getDay();
  const daysSinceTuesday =
    dayIndex >= TUESDAY_INDEX
      ? dayIndex - TUESDAY_INDEX
      : dayIndex + (7 - TUESDAY_INDEX);

  return localizer.add(startOfDay, -daysSinceTuesday, "day");
}

type CustomWeekViewComponent = React.FC<CustomWeekViewProps> & {
  range: (date: Date, options: RangeOptions) => Date[];
  navigate: (date: Date, action: NavigateAction, options: RangeOptions) => Date;
  title: (date: Date, options: TitleOptions & RangeOptions) => string;
};

const CustomWeekView: CustomWeekViewComponent = function CustomWeekView({
  date,
  localizer,
  max = localizer.endOf(new Date(), "day"),
  min = localizer.startOf(new Date(), "day"),
  scrollToTime = localizer.startOf(new Date(), "day"),
  ...props
}: CustomWeekViewProps) {
  const currRange = useMemo(
    () => CustomWeekView.range(date, { localizer }),
    [date, localizer],
  );

  return (
    <TimeGrid
      date={date}
      eventOffset={15}
      localizer={localizer}
      max={max}
      min={min}
      range={currRange}
      scrollToTime={scrollToTime}
      {...props}
    />
  );
};

CustomWeekView.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  localizer: PropTypes.object,
  max: PropTypes.instanceOf(Date),
  min: PropTypes.instanceOf(Date),
  scrollToTime: PropTypes.instanceOf(Date),
};

CustomWeekView.range = (date: Date, { localizer }: RangeOptions) => {
  const start = getTuesdayStart(date, localizer);
  const end = localizer.add(start, WORK_WEEK_LENGTH - 1, "day");

  let current = start;
  const range: Date[] = [];

  while (localizer.lte(current, end, "day")) {
    range.push(current);
    current = localizer.add(current, 1, "day");
  }

  return range;
};

CustomWeekView.navigate = (
  date: Date,
  action: NavigateAction,
  { localizer }: RangeOptions,
) => {
  switch (action) {
    case Navigate.PREVIOUS:
      return localizer.add(date, -7, "day");

    case Navigate.NEXT:
      return localizer.add(date, 7, "day");

    default:
      return date;
  }
};

CustomWeekView.title = (
  date: Date,
  { localizer }: TitleOptions & RangeOptions,
) => {
  const [start, ...rest] = CustomWeekView.range(date, { localizer });
  return localizer.format(
    { start, end: rest.at(-1) ?? start },
    "dayRangeHeaderFormat",
  );
};

export default CustomWeekView;

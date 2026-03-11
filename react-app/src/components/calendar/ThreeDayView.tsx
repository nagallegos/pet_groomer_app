import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  Navigate,
  type DateLocalizer,
  type NavigateAction,
  type TitleOptions,
} from "react-big-calendar";
import TimeGrid from "react-big-calendar/lib/TimeGrid";

interface ThreeDayViewProps {
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

type ThreeDayViewComponent = React.FC<ThreeDayViewProps> & {
  range: (date: Date, options: RangeOptions) => Date[];
  navigate: (
    date: Date,
    action: NavigateAction,
    options: RangeOptions,
  ) => Date;
  title: (date: Date, options: TitleOptions & RangeOptions) => string;
};

function getThreeDayStart(date: Date, localizer: DateLocalizer): Date {
  return localizer.startOf(date, "day");
}

const ThreeDayView: ThreeDayViewComponent = function ThreeDayView({
  date,
  localizer,
  max = localizer.endOf(new Date(), "day"),
  min = localizer.startOf(new Date(), "day"),
  scrollToTime = localizer.startOf(new Date(), "day"),
  ...props
}: ThreeDayViewProps) {
  const currRange = useMemo(
    () => ThreeDayView.range(date, { localizer }),
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

ThreeDayView.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  localizer: PropTypes.object,
  max: PropTypes.instanceOf(Date),
  min: PropTypes.instanceOf(Date),
  scrollToTime: PropTypes.instanceOf(Date),
};

ThreeDayView.range = (date: Date, { localizer }: RangeOptions) => {
  const start = getThreeDayStart(date, localizer);
  return [0, 1, 2].map((offset) => localizer.add(start, offset, "day"));
};

ThreeDayView.navigate = (
  date: Date,
  action: NavigateAction,
  { localizer }: RangeOptions,
) => {
  switch (action) {
    case Navigate.PREVIOUS:
      return localizer.add(date, -3, "day");
    case Navigate.NEXT:
      return localizer.add(date, 3, "day");
    default:
      return date;
  }
};

ThreeDayView.title = (
  date: Date,
  { localizer }: TitleOptions & RangeOptions,
) => {
  const range = ThreeDayView.range(date, { localizer });
  return localizer.format(
    { start: range[0], end: range.at(-1) ?? range[0] },
    "dayRangeHeaderFormat",
  );
};

export default ThreeDayView;

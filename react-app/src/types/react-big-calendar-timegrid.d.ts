declare module "react-big-calendar/lib/TimeGrid" {
  import type { ComponentType } from "react";
  import type { DateLocalizer } from "react-big-calendar";

  export interface TimeGridProps {
    date: Date;
    eventOffset?: number;
    localizer: DateLocalizer;
    max?: Date;
    min?: Date;
    range: Date[];
    scrollToTime?: Date;
    [key: string]: unknown;
  }

  const TimeGrid: ComponentType<TimeGridProps>;

  export default TimeGrid;
}

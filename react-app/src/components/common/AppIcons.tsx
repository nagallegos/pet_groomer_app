import { ChevronDown, Search } from "react-bootstrap-icons";

type IconProps = {
  className?: string;
};

export function SearchIcon({ className }: IconProps) {
  return <Search aria-hidden="true" className={className} />;
}

export function ChevronDownIcon({ className }: IconProps) {
  return <ChevronDown aria-hidden="true" className={className} />;
}

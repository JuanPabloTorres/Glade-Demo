import { Badge } from "flowbite-react";
import { APP_VERSION } from "../../config/version";

export function ReleaseBadge() {
  return <Badge color="gray">v{APP_VERSION}</Badge>;
}

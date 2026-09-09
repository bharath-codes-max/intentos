import {
  DashboardIcon,
  CubeIcon,
  FileTextIcon,
  MixIcon,
  CheckCircledIcon,
  ActivityLogIcon,
  CodeIcon,
} from "@radix-ui/react-icons";

export const NAV = [
  { href: "/", label: "Overview", icon: DashboardIcon },
  { href: "/agents", label: "Agents", icon: CubeIcon },
  { href: "/policies", label: "Intent Contracts", icon: FileTextIcon },
  { href: "/decisions", label: "Decisions", icon: MixIcon },
  { href: "/approvals", label: "Approvals", icon: CheckCircledIcon },
  { href: "/activity", label: "Agent Activity", icon: ActivityLogIcon },
];

export const UTILITY = [{ href: "/test", label: "Test console", icon: CodeIcon }];

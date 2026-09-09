import {
  DashboardIcon,
  CubeIcon,
  FileTextIcon,
  MixIcon,
  CheckCircledIcon,
  ActivityLogIcon,
  CodeIcon,
} from "@radix-ui/react-icons";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof DashboardIcon;
  /** CSS custom property to color the icon — used sparingly, most items stay neutral. */
  colorVar?: string;
};

/** Always-visible, no section header — the two most-used destinations. */
export const TOP_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: DashboardIcon },
  { href: "/agents", label: "Agents", icon: CubeIcon },
];

/** Collapsible "Governance" section. */
export const GOVERNANCE_NAV: NavItem[] = [
  { href: "/policies", label: "Intent Contracts", icon: FileTextIcon },
  { href: "/decisions", label: "Decisions", icon: MixIcon },
  { href: "/approvals", label: "Approvals", icon: CheckCircledIcon, colorVar: "--status-review" },
];

/** Collapsible "Monitoring" section. */
export const MONITORING_NAV: NavItem[] = [
  { href: "/activity", label: "Agent Activity", icon: ActivityLogIcon },
  { href: "/test", label: "Test console", icon: CodeIcon, colorVar: "--primary" },
];

export const ALL_NAV: NavItem[] = [...TOP_NAV, ...GOVERNANCE_NAV, ...MONITORING_NAV];

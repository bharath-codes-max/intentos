import {
  DashboardIcon,
  CubeIcon,
  FileTextIcon,
  MixIcon,
  CheckCircledIcon,
  ActivityLogIcon,
  CodeIcon,
  Link2Icon,
  PersonIcon,
  Share2Icon,
} from "@radix-ui/react-icons";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof DashboardIcon;
  /** Final CSS color value (hex or var(--token)) — every nav icon carries one now. */
  color: string;
};

/** Always-visible, no section header — the two most-used destinations. */
export const TOP_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: DashboardIcon, color: "#7FC6EC" },
  { href: "/integrations", label: "Integrations", icon: Link2Icon, color: "#EE9A5C" },
  { href: "/agents", label: "Agents", icon: CubeIcon, color: "#B39CE8" },
  { href: "/employees", label: "Employees", icon: PersonIcon, color: "#F2A5C4" },
];

/** Collapsible "Governance" section. */
export const GOVERNANCE_NAV: NavItem[] = [
  { href: "/canvas", label: "Command Center", icon: Share2Icon, color: "#8C8FFF" },
  { href: "/policies", label: "Intent Contracts", icon: FileTextIcon, color: "#22D3EE" },
  { href: "/decisions", label: "Decisions", icon: MixIcon, color: "var(--primary)" },
  { href: "/approvals", label: "Approvals", icon: CheckCircledIcon, color: "var(--status-review)" },
];

/** Collapsible "Monitoring" section. */
export const MONITORING_NAV: NavItem[] = [
  { href: "/activity", label: "Agent Activity", icon: ActivityLogIcon, color: "#A9D66B" },
  { href: "/test", label: "Test console", icon: CodeIcon, color: "#EE9A5C" },
];

export const ALL_NAV: NavItem[] = [...TOP_NAV, ...GOVERNANCE_NAV, ...MONITORING_NAV];

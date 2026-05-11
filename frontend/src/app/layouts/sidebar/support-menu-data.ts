import { MenuItem } from "./menu.model";

export const SUPPORT_MENU: MenuItem[] = [
  {
    id: 1,
    label: "Support",
    isTitle: true,
    hideCheckBox: true,
  },
  {
    id: 2,
    badgeId: "supportTicketsOpen",
    label: "Support Tickets",
    link: "/support-tickets",
    description: "Submit and track support tickets",
    icon: "las la-ticket-alt",
    hideCheckBox: true,
    accessRequired: false,
  },
  {
    id: 3,
    badgeId: "supportMyTicketsOpen",
    label: "My Tickets",
    link: "/support-tickets/my-tickets",
    description: "View your submitted tickets",
    icon: "las la-user-circle",
    hideCheckBox: true,
    accessRequired: false,
  },
  {
    id: 4,
    label: "Create Ticket",
    link: "/support-tickets/new",
    description: "Open a new support ticket",
    icon: "las la-plus-circle",
    hideCheckBox: true,
    accessRequired: false,
  },
];

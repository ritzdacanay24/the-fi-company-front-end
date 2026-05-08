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
    label: "My Tickets",
    link: "/support-tickets/my-tickets",
    description: "View your submitted tickets",
    icon: "las la-user-circle",
    hideCheckBox: true,
    accessRequired: false,
  },
];

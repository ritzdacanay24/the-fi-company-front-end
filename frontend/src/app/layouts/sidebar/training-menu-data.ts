import { MenuItem } from "./menu.model";

export const TRAINING_MENU: MenuItem[] = [
    {
        id: 1,
        label: "Training Management",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 2,
        badgeId: "trainingLiveSessionsOpen",
        label: "Live Sessions",
        link: "/training/live",
        description: "Join Training & Badge Sign-Off",
        icon: "las la-broadcast-tower",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/training/*"
    },
    {
        id: 3,
        label: "Manage Sessions",
        link: "/training/setup",
        description: "Create & Edit Training Sessions",
        icon: "las la-cog",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/training/*"
    },
    {
        id: 4,
        label: "All Sessions",
        link: "/training/manage",
        description: "View & Manage All Training Sessions",
        icon: "las la-list",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/training/*"
    }
];

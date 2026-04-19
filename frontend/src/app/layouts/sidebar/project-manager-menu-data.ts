import { MenuItem } from "./menu.model";

export const PROJECT_MANAGER_MENU: MenuItem[] = [
    {
        id: 1,
        label: "Project Manager",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 2,
        label: "Dashboard",
        link: "/project-manager/dashboard",
        description: "Portfolio health and gate progress overview",
        icon: "las la-briefcase",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/project-manager/dashboard*"
    },
    {
        id: 3,
        label: "New Project",
        link: "/project-manager/new-project",
        description: "Create and manage project intake forms",
        icon: "las la-plus-circle",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/project-manager/new-project*"
    },
    {
        id: 4,
        label: "Tasks",
        link: "/project-manager/tasks",
        description: "Track tasks, ownership, and project workflow",
        icon: "las la-tasks",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/project-manager/tasks*"
    }
];

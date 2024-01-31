import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
  {
    id: 1,
    label: 'MENUITEMS.MENU.TEXT',
    isTitle: true
  },
  {
    id: 2,
    label: 'MENUITEMS.DASHBOARD.TEXT',
    icon: 'las la-tachometer-alt',
    subItems: [
      {
        id: 3,
        label: 'MENUITEMS.DASHBOARD.LIST.ANALYTICS',
        link: '/',
        parentId: 2
      },
      {
        id: 4,
        label: 'MENUITEMS.DASHBOARD.LIST.CRM',
        link: '/',
        parentId: 2
      },
      {
        id: 5,
        label: 'MENUITEMS.DASHBOARD.LIST.ECOMMERCE',
        link: '/',
        parentId: 2
      },
    ]
  },
  {
    id: 3,
    label: 'MENUITEMS.FIELDSERVICE.TEXT',
    icon: 'las la-tachometer-alt',
    subItems: [
      {
        id: 6,
        label: 'MENUITEMS.FIELDSERVICE.LIST.OVERVIEW',
        link: '/field-service/overview/summary',
        parentId: 3
      },
    ]
  },
  {
    id: 4,
    label: 'MENUITEMS.REPORTS.TEXT',
    icon: 'las la-tachometer-alt',
    subItems: [
      {
        id: 6,
        label: 'MENUITEMS.REPORTS.LIST.JOBSBYLOCATION',
        link: '/field-service/reports/jobs-by-location',
        parentId: 4
      },
      {
        id: 6,
        label: 'MENUITEMS.REPORTS.LIST.PLATFORMAVG',
        link: '/field-service/reports/platform-avg',
        parentId: 4
      },
      {
        id: 6,
        label: 'MENUITEMS.REPORTS.LIST.EXPENSEREPORT',
        link: '/field-service/reports/expense-report',
        parentId: 4
      },
      {
        id: 6,
        label: 'MENUITEMS.REPORTS.LIST.SERVICEREPORT',
        link: '/field-service/reports/service-report',
        parentId: 4
      },
      {
        id: 6,
        label: 'MENUITEMS.REPORTS.LIST.CUSTOMEREPORT',
        link: '/field-service/reports/customer-report',
        parentId: 4
      },
      {
        id: 6,
        label: 'MENUITEMS.REPORTS.LIST.INVOICEREPORT',
        link: '/field-service/reports/invoice-report',
        parentId: 4
      },
      {
        id: 6,
        label: 'MENUITEMS.REPORTS.LIST.JOBBYUSERREPORT',
        link: '/field-service/reports/job-by-user-report',
        parentId: 4
      },
      {
        id: 6,
        label: 'MENUITEMS.REPORTS.LIST.CONTRACTORVSTECH',
        link: '/field-service/reports/contractor-vs-tech-report',
        parentId: 4
      },
      {
        id: 6,
        label: 'MENUITEMS.REPORTS.LIST.TICKETEVENTREPORT',
        link: '/field-service/reports/ticket-event-report',
        parentId: 4
      },
    ]
  },
  {
    id: 5,
    label: 'MENUITEMS.MAINTENANCE.TEXT',
    icon: 'las la-tachometer-alt',
    subItems: [
      {
        label: 'MENUITEMS.MAINTENANCE.LIST.JOBSTATUS',
        isCollapsed: true,
        parentId: 5,
        subItems: [
          {
            id: 9,
            label: 'MENUITEMS.MAINTENANCE.LIST.JOBSTATUSLIST',
            link: '/field-service/maintenance/job-status/list',
          },
          {
            id: 9,
            label: 'MENUITEMS.MAINTENANCE.LIST.JOBSTATUSCREATE',
            link: '/field-service/maintenance/job-status/create',
          },
          {
            id: 9,
            label: 'MENUITEMS.MAINTENANCE.LIST.JOBSTATUSEDIT',
            link: '/field-service/maintenance/job-status/edit',
          },
        ]
      },
      {
        id: 6,
        label: 'MENUITEMS.MAINTENANCE.LIST.SERVICETYPE',
        isCollapsed: true,
        parentId: 5,
        subItems: [
          {
            id: 9,
            label: 'MENUITEMS.MAINTENANCE.LIST.SERVICELIST',
            link: '/field-service/maintenance/service-type/list',
          },
          {
            id: 9,
            label: 'MENUITEMS.MAINTENANCE.LIST.SERVICECREATE',
            link: '/field-service/maintenance/service-type/create',
          },
          {
            id: 9,
            label: 'MENUITEMS.MAINTENANCE.LIST.SERVICEEDIT',
            link: '/field-service/maintenance/service-type/edit',
          },
        ]
      },
      {
        id: 6,
        label: 'MENUITEMS.MAINTENANCE.LIST.PROPERTY_TEXT',
        isCollapsed: true,
        parentId: 5,
        subItems: [
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.PROPERTY_LIST',
            link: '/field-service/maintenance/property/list',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.PROPERTY_CREATE',
            link: '/field-service/maintenance/property/create',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.PROPERTY_EDIT',
            link: '/field-service/maintenance/property/edit',
          },
        ]
      },
      {
        id: 6,
        label: 'MENUITEMS.MAINTENANCE.LIST.RECEIPT_CATEGORY_TEXT',
        isCollapsed: true,
        parentId: 5,
        subItems: [
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.RECEIPT_CATEGORY_LIST',
            link: '/field-service/maintenance/receipt-category/list',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.RECEIPT_CATEGORY_CREATE',
            link: '/field-service/maintenance/receipt-category/create',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.RECEIPT_CATEGORY_EDIT',
            link: '/field-service/maintenance/receipt-category/edit',
          },
        ]
      },
      {
        id: 6,
        label: 'MENUITEMS.MAINTENANCE.LIST.TICKET_EVENT',
        isCollapsed: true,
        parentId: 5,
        subItems: [
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.TICKET_EVENT_LIST',
            link: '/field-service/maintenance/ticket-event/list',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.TICKET_EVENT_CREATE',
            link: '/field-service/maintenance/ticket-event/create',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.TICKET_EVENT_EDIT',
            link: '/field-service/maintenance/ticket-event/edit',
          },
        ]
      },
      {
        id: 6,
        label: 'MENUITEMS.MAINTENANCE.LIST.CUSTOMER',
        isCollapsed: true,
        parentId: 5,
        subItems: [
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.CUSTOMER_LIST',
            link: '/field-service/maintenance/customer/list',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.CUSTOMER_CREATE',
            link: '/field-service/maintenance/customer/create',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.CUSTOMER_EDIT',
            link: '/field-service/maintenance/customer/edit',
          },
        ]
      },
      {
        id: 6,
        label: 'MENUITEMS.MAINTENANCE.LIST.PLATFORM',
        isCollapsed: true,
        parentId: 5,
        subItems: [
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.PLATFORM_LIST',
            link: '/field-service/maintenance/platform/list',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.PLATFORM_CREATE',
            link: '/field-service/maintenance/platform/create',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.PLATFORM_EDIT',
            link: '/field-service/maintenance/platform/edit',
          },
        ]
      },
      {
        id: 6,
        label: 'MENUITEMS.MAINTENANCE.LIST.NON_BILLABLE_CODES',
        isCollapsed: true,
        parentId: 5,
        subItems: [
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.NON_BILLABLE_CODES_LIST',
            link: '/field-service/maintenance/non-billable-code/list',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.NON_BILLABLE_CODES_CREATE',
            link: '/field-service/maintenance/non-billable-code/create',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.NON_BILLABLE_CODES_EDIT',
            link: '/field-service/maintenance/non-billable-code/edit',
          },
        ]
      },
      {
        id: 6,
        label: 'MENUITEMS.MAINTENANCE.LIST.USERS',
        isCollapsed: true,
        parentId: 5,
        subItems: [
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.USER_LIST',
            link: '/field-service/maintenance/user/list',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.USER_EDIT',
            link: '/field-service/maintenance/user/edit',
          },
        ]
      },
      {
        id: 6,
        label: 'MENUITEMS.MAINTENANCE.LIST.VENDORS',
        isCollapsed: true,
        parentId: 5,
        subItems: [
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.VENDOR_LIST',
            link: '/field-service/maintenance/vendor/list',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.VENDOR_CREATE',
            link: '/field-service/maintenance/vendor/create',
          },
          {
            label: 'MENUITEMS.MAINTENANCE.LIST.VENDOR_EDIT',
            link: '/field-service/maintenance/vendor/edit',
          },
        ]
      },
    ]
  },

  {
    id: 5,
    label: 'MENUITEMS.JOB.TEXT',
    icon: 'las la-tachometer-alt',
    subItems: [
      {
        id: 9,
        label: 'MENUITEMS.JOB.LIST.JOBS',
        link: '/field-service/jobs/list',
      },
      {
        id: 9,
        label: 'MENUITEMS.JOB.LIST.CREATE',
        link: '/field-service/jobs/create',
      },
      {
        id: 9,
        label: 'MENUITEMS.JOB.LIST.EDIT',
        link: '/field-service/jobs/edit',
      },
      {
        label: 'MENUITEMS.JOB.LIST.OVERVIEW',
        link: '/field-service/jobs/overview',
      },
    ]
  },

  {
    id: 5,
    label: 'MENUITEMS.REQUEST.TEXT',
    icon: 'las la-tachometer-alt',
    subItems: [
      {
        id: 9,
        label: 'MENUITEMS.REQUEST.LIST.LIST',
        link: '/field-service/request/list',
      },
      {
        id: 9,
        label: 'MENUITEMS.REQUEST.LIST.CREATE',
        link: '/field-service/request/create',
      },
      {
        id: 9,
        label: 'MENUITEMS.REQUEST.LIST.EDIT',
        link: '/field-service/request/edit',
      },
    ]
  },

  {
    id: 5,
    label: 'MENUITEMS.TICKET.TEXT',
    icon: 'las la-tachometer-alt',
    subItems: [
      {
        id: 9,
        label: 'MENUITEMS.TICKET.LIST.LIST',
        link: '/field-service/ticket/list',
      },
      {
        id: 9,
        label: 'MENUITEMS.TICKET.LIST.EDIT',
        link: '/field-service/ticket/overview',
      },
    ]
  }

];

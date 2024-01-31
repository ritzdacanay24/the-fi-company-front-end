import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
  {
    label: 'Main menu',
    icon: 'home',
    link: '/'
  },
  {
    label: 'Main',
    isTitle: true
  },
  {
    label: 'Dashboard',
    icon: 'activity',
    link: '/operations/overview'
  },
  {
    label: 'Graphics',
    icon: 'activity',
    subItems: [
      {
        label: 'Graphics List',
        link: `/operations/graphics/list`,
      },
      {
        label: 'Graphics Production',
        link: `/operations/graphics/production`,
      },
      {
        label: 'Graphics View/Edit',
        link: `/operations/graphics/edit`,
      },
      {
        label: 'Graphics Demand',
        link: `/operations/graphics/demand`,
      },
      {
        label: 'BOM',
        subItems: [
          {
            label: 'BOM List',
            link: `/operations/graphics/bom/list`,
          },
          {
            label: 'BOM View/Edit',
            link: `/operations/graphics/bom/edit`,
          },
          {
            label: 'BOM Create',
            link: `/operations/graphics/bom/create`,
          },
        ]
      },
    ]
  },

  {
    label: 'Reports',
    icon: 'bar-chart',
    subItems: [
      {
        label: 'Daily Report',
        link: `/operations/reports/daily-report`,
      },
      {
        label: 'Revenue',
        link: `/operations/reports/revenue`,
      },
      {
        label: 'Revenue By Customer',
        link: `/operations/reports/revenue-by-customer`,
      },
      {
        label: 'WIP Report',
        link: `/operations/reports/wip-report`,
      },
      {
        label: 'Transit Location Value',
        link: `/operations/reports/transit-location-value-report`,
      },
      {
        label: 'FG Location Value',
        link: `/operations/reports/fg-value-report`,
      },
      {
        label: 'JX Location Value',
        link: `/operations/reports/jx-value-report`,
      },
      {
        label: 'Las Vegas Raw Material',
        link: `/operations/reports/las-vegas-raw-material-report`,
      },
      {
        label: 'Safety Stock',
        link: `/operations/reports/safety-stock-report`,
      },
      {
        label: 'Shipped Orders',
        link: `/operations/reports/shipped-orders-report`,
      },
      {
        label: 'Negative Location Report',
        link: `/operations/reports/negative-location-report`,
      },
      {
        label: 'Empty Location Report',
        link: `/operations/reports/empty-location-report`,
      },
      {
        label: 'Inventory Report',
        link: `/operations/reports/inventory-report`,
      },
      {
        label: 'One SKU Location Report',
        link: `/operations/reports/one-sku-location-report`,
      },
      {
        label: 'Item Consolidation Report',
        link: `/operations/reports/item-consolidation-report`,
      },
    ]
  },
  {
    label: 'Master Scheduling',
    icon: 'activity',
    subItems: [
      {
        label: 'Shipping',
        link: `/operations/master-scheduling/shipping`,
      },
      {
        label: 'Master Production',
        link: `/operations/master-scheduling/master-production`,
      },
    ]
  },
  {
    label: 'Physical Inventory',
    icon: 'activity',
    subItems: [
      {
        label: 'Tags',
        link: `/operations/physical-inventory/tags`,
      },
    ]
  },
  {
    label: 'Forms',
    isTitle: true
  },
  {
    label: 'Shipping Request',
    icon: 'activity',
    subItems: [
      {
        label: 'Shipping Request Create',
        link: `/operations/forms/shipping-request/create`,
      },
      {
        label: 'Shipping Request View/Edit',
        link: `/operations/forms/shipping-request/edit`,
      },
      {
        label: 'Shipping Request List',
        link: `/operations/forms/shipping-request/list`,
      },
    ]
  },
  {
    label: 'Vehicle',
    icon: 'activity',
    subItems: [
      {
        label: 'Vehicle Create',
        link: `/operations/forms/vehicle/create`,
      },
      {
        label: 'Vehicle View/Edit',
        link: `/operations/forms/vehicle/edit`,
      },
      {
        label: 'Vehicle List',
        link: `/operations/forms/vehicle/list`,
      },
    ]
  },
  {
    label: 'Placard',
    icon: 'activity',
    subItems: [
      {
        label: 'Placard Create',
        link: `/operations/forms/placard/create`,
      },
      {
        label: 'Placard View/Edit',
        link: `/operations/forms/placard/edit`,
      },
      {
        label: 'Placard List',
        link: `/operations/forms/placard/list`,
      },
    ]
  },
  {
    label: 'IGT Transfer',
    icon: 'activity',
    subItems: [
      {
        label: 'IGT Transfer Create',
        link: `/operations/forms/igt-transfer/create`,
      },
      {
        label: 'IGT Transfer View/Edit',
        link: `/operations/forms/igt-transfer/edit`,
      },
      {
        label: 'IGT Transfer List',
        link: `/operations/forms/igt-transfer/list`,
      },
    ]
  },
  {
    label: 'Shortages',
    icon: 'activity',
    subItems: [
      {
        label: 'Shortage Create',
        link: `/operations/shortages/create`,
      },
      {
        label: 'Shortage View/Edit',
        link: `/operations/shortages/edit`,
      },
      {
        label: 'Shortage List',
        link: `/operations/shortages/list`,
      },
    ]
  },
  {
    label: 'Material Request',
    icon: 'activity',
    subItems: [
      {
        label: 'Material Request Create',
        link: `/operations/material-request/create`,
      },
      {
        label: 'Material Request View/Edit',
        link: `/operations/material-request/edit`,
      },
      {
        label: 'Material Request List',
        link: `/operations/material-request/list`,
      },
      {
        label: 'Material Request Validate',
        link: `/operations/material-request/validate-list`,
      },
      {
        label: 'Material Request Picking',
        link: `/operations/material-request/picking`,
      },
    ]
  },
  {
    label: 'Logistics',
    isTitle: true
  },
  {
    label: 'Daily Report',
    icon: 'activity',
    link: `/operations/logistics/daily-report`,
  },
  {
    label: 'Maintenance',
    isTitle: true
  },
  {
    label: 'Users',
    icon: 'settings',
    subItems: [
      {
        label: 'List Users',
        link: `./maintenance/user/list`,
      },
      {
        label: 'View/Edit User',
        link: `./maintenance/user/edit`,
      },
    ]
  },
];


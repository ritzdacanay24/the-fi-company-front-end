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
    link: '/quality/overview/summary'
  },
  {
    label: 'RMA',
    icon: 'book',
    subItems: [
      {
        label: 'List RMA',
        link: `/quality/rma/list`,
      },
      {
        label: 'Create RMA',
        link: `/quality/rma/create`,
      },
      {
        label: 'View/Edit RMA',
        link: `/quality/rma/edit`,
      },
    ]
  },
  {
    label: 'SG Asset',
    icon: 'book',
    subItems: [
      {
        label: 'List SG Assets',
        link: `/quality/sg-asset/list`,
      },
      {
        label: 'Create SG Asset',
        link: `/quality/sg-asset/create`,
      },
      {
        label: 'View/Edit SG Asset',
        link: `/quality/sg-asset/edit`,
      },
    ]
  },
  {
    label: 'AGS Serial',
    icon: 'book',
    subItems: [
      {
        label: 'List AGS Serial',
        link: `/quality/ags-serial/list`,
      },
      {
        label: 'Create AGS Serial',
        link: `/quality/ags-serial/create`,
      },
      {
        label: 'View/Edit AGS Serial',
        link: `/quality/ags-serial/edit`,
      },
    ]
  },
  {
    label: 'MRB',
    icon: 'book',
    subItems: [
      {
        label: 'List MRB',
        link: `/quality/mrb/list`,
      },
      {
        label: 'Create MRB',
        link: `/quality/mrb/create`,
      },
      {
        label: 'View/Edit MRB',
        link: `/quality/mrb/edit`,
      },
    ]
  },
  {
    label: 'NCR',
    icon: 'book',
    subItems: [
      {
        label: 'List NCR',
        link: `/quality/ncr/list`,
      },
      {
        label: 'Create NCR',
        link: `/quality/ncr/create`,
      },
      {
        label: 'View/Edit NCR',
        link: `/quality/ncr/overview`,
      },
    ]
  },
  {
    label: 'QIR',
    icon: 'book',
    subItems: [
      {
        label: 'List QIR',
        link: `/quality/qir/list`,
      },
      {
        label: 'Create QIR',
        link: `/quality/qir/create`,
      },
      {
        label: 'View/Edit QIR',
        link: `/quality/qir/edit`,
      },
      {
        label: 'QIR Form Settings',
        subItems: [
          {
            label: 'List',
            link: `/quality/qir/settings/list`,
          },
          {
            label: 'Create',
            link: `/quality/qir/settings/create`,
          },
          {
            label: 'View/Edit',
            link: `/quality/qir/settings/edit`,
          },
        ]
      },
      {
        label: 'QIR Notifications',
        link: `/quality/qir/notifications`,
      },
    ]
  },
];


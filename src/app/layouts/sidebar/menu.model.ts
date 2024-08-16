export interface MenuItem {
  id?: number;
  label?: any;
  icon?: string;
  link?: string;
  subItems?: any;
  isTitle?: boolean;
  badge?: any;
  parentId?: number;
  isLayout?: boolean;
  isCollapsed?: any;
  showStar?: boolean | any;
  showStarColor?: boolean | any;
  description?: string;
  accessRequired?: boolean;
  hideCheckBox?: boolean;
}

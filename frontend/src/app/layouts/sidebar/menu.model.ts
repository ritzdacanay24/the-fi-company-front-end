export interface MenuItem {
  id?: number | string;
  badgeId?: string;
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
  activatedRoutes?: string | string[];
  
  openInNewTab?: boolean;

  // Configuration properties
  visible?: boolean;
  order?: number;
  isTemporarilyShown?: boolean;
  searchHighlight?: boolean;
}

export interface MenuItem {
  id?: number;
  label?: any;
  icon?: string;
  isCollapsed?: any;
  link?: string;
  subItems?: any;
  isTitle?: boolean;
  badge?: any;
  parentId?: number;
  isLayout?: boolean;
  activeRoutes?: string[]; // Add this new property
  
  // Favorites and Navigation Enhancement Properties
  isFavorites?: boolean;        // Marks this as a favorites container
  isRecentlyVisited?: boolean;  // Marks this as recently visited container
  isFavorite?: boolean;         // Marks an individual item as favorited
  favoriteId?: string;          // Unique identifier for favorite items
  canFavorite?: boolean;        // Whether this item can be added to favorites
  hide?: boolean;               // Whether to hide this menu item
}

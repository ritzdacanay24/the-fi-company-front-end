# Shipping Analytics Dashboard - Installation Guide

## Overview
The Shipping Analytics Dashboard provides comprehensive visual insights and productivity metrics for shipping operations. It includes multiple chart types, KPI tracking, and actionable recommendations to optimize shipping performance.

## Features
- **7 Different Chart Types**: Order status distribution, lead time analysis, customer value tracking, aging analysis, priority monitoring, financial overview, and monthly trends
- **Real-time KPI Dashboard**: Total orders, past due tracking, on-time delivery rate, total value, lead time metrics
- **Automated Insights**: Smart alerts and actionable recommendations based on data analysis
- **Responsive Design**: Mobile-friendly dashboard that works on all devices
- **Service Integration**: Built with Angular services for real-time data updates

## Prerequisites
1. **Angular 17+** with standalone components
2. **ng-apexcharts**: `npm install ng-apexcharts apexcharts`
3. **Bootstrap 5**: For responsive styling
4. **Line Awesome Icons**: For dashboard icons

## Installation Steps

### 1. Install Required Dependencies
```bash
npm install ng-apexcharts apexcharts
npm install bootstrap @popperjs/core
npm install line-awesome
```

### 2. Update angular.json
Add Bootstrap and Line Awesome to your styles array:
```json
"styles": [
  "node_modules/bootstrap/dist/css/bootstrap.min.css",
  "node_modules/line-awesome/dist/line-awesome/css/line-awesome.min.css",
  "src/styles.scss"
]
```

### 3. File Structure
The dashboard consists of these main files:
```
src/app/
├── components/
│   ├── shipping-analytics/
│   │   ├── shipping-analytics.component.ts
│   │   ├── shipping-analytics.component.html
│   │   └── shipping-analytics.component.scss
│   └── shipping-dashboard/
│       └── shipping-dashboard.component.ts
└── services/
    └── shipping-data.service.ts
```

## Data Integration

### **Real Data Loading Pattern**
The component now uses the existing `MasterSchedulingService` to load real shipping data:

```typescript
// Component automatically loads data using:
async getData() {
  try {
    const [shippingData] = await Promise.all([
      this.api.getShipping(),
      this.loadPriorities()
    ]);

    this.data = shippingData;
    this.statusCount = this.calculateStatus();
    this.mergePriorityData();
    
    // Process for analytics
    this.shippingData = this.data;
    this.processData();
    this.generateCharts();
    this.calculateInsights();
  } catch (err) {
    console.error('Error loading shipping data:', err);
  }
}
```

### **Service Dependencies**
Required services are automatically injected:
- `MasterSchedulingService` - For real shipping data
- `ShippingDataService` - For analytics processing (optional)

### **Data Flow**
1. Component loads real shipping data on initialization
2. Data is processed into analytics metrics
3. Charts are generated from processed data
4. Refresh trigger reloads data from API
5. Both real data and mock data patterns are supported

### 5. Data Model Compatibility
The component automatically handles the existing shipping data structure:

```typescript
// Your existing ShippingData interface is fully supported:
interface ShippingData {
  SOD_NBR: string;
  SOD_DUE_DATE: string;
  LEADTIME: number;
  SOD_PART: string;
  // ... all existing fields
  STATUS: string;        // 'Past Due', 'Due Today', 'Future Order'
  STATUSCLASS: string;   
  OPENBALANCE: number;   // Used for financial analytics
  AGE: number;           // Used for aging analysis
  shipping_priority?: number; // Used for priority tracking
}
```

### 6. Component Usage
The analytics component integrates seamlessly with existing patterns:

```typescript
// Standalone usage (automatically loads data)
<app-shipping-analytics></app-shipping-analytics>

// With input data (fallback support)
<app-shipping-analytics [shippingData]="yourData"></app-shipping-analytics>

// With refresh trigger
<app-shipping-analytics [refreshTrigger]="triggerValue"></app-shipping-analytics>

// Full dashboard with toggle
<app-shipping-dashboard></app-shipping-dashboard>
```

### 7. Routing Setup (Optional)
Add routes to access the dashboard:

```typescript
// The shipping analytics dashboard has been integrated into the Operations module
// Access URLs:
// - /operations/shipping-analytics - Full dashboard with analytics and grid toggle
// - Direct navigation available through sidebar menu: "Shipping Analytics"

// Integration points added:
// 1. operations-routing.module.ts - Added lazy-loaded route
// 2. menu.component.ts - Added to Las Vegas menu section  
// 3. menu-data.ts - Added to sidebar navigation with chart icon
```

### 8. Navigation Access Points
The dashboard is accessible through multiple navigation methods:

**Sidebar Navigation:**
- Operations section → "Shipping Analytics" 
- Icon: Chart area icon
- Description: "Shipping Performance Analytics & Insights"

**Main Menu:**
- Las Vegas → "Shipping Analytics Dashboard"
- Direct link: `/operations/shipping-analytics`

**URL Access:**
- Direct URL: `https://your-domain.com/operations/shipping-analytics`

## Configuration Options

### Chart Customization
Charts can be customized by modifying the chart options in `shipping-analytics.component.ts`:

```typescript
// Example: Change chart colors
this.orderStatusChart = {
  // ... existing config
  colors: ['#007bff', '#28a745', '#ffc107', '#dc3545'], // Custom colors
  theme: {
    mode: 'light', // or 'dark'
    palette: 'palette1' // palette1 through palette10
  }
};
```

### Productivity Thresholds
Adjust alert thresholds in the insights calculation methods:

```typescript
// Example: Change on-time delivery threshold
if (analytics.onTimeDeliveryRate < 95) { // Change 95 to your target %
  // Alert logic
}
```

### Refresh Intervals
For real-time updates, set up automatic refresh:

```typescript
// In component constructor or ngOnInit
setInterval(() => {
  this.shippingDataService.getShippingOrders().subscribe();
}, 30000); // Refresh every 30 seconds
```

## Testing with Sample Data
The service includes sample data for testing:

```typescript
// Use sample data for development/testing
const sampleOrders = this.shippingDataService.getSampleData();
```

## Customization Examples

### Adding New Chart Types
1. Add chart configuration to component
2. Create data processing method
3. Add chart container to HTML template
4. Style chart container in SCSS

### Custom KPI Metrics
1. Add new metric to `ProductivityMetrics` interface
2. Calculate metric in `processData()` method
3. Add metric card to HTML template
4. Style new metric card in SCSS

### Additional Insights
1. Add new insight type to insights calculation
2. Create alert logic based on your business rules
3. Add custom actions for new insights

## Performance Considerations
- Use OnPush change detection for better performance
- Implement virtual scrolling for large datasets
- Cache chart data to avoid unnecessary recalculations
- Use lazy loading for dashboard components

## Troubleshooting

### Common Issues
1. **Charts not displaying**: Ensure ng-apexcharts is properly installed and imported
2. **Styling issues**: Verify Bootstrap CSS is loaded correctly
3. **API errors**: Check service URLs and data format matching interfaces
4. **Performance issues**: Implement change detection optimization

### Debug Mode
Enable debug logging in the service:

```typescript
// Add to shipping-data.service.ts
private debug = true; // Set to false in production

private log(message: string, data?: any): void {
  if (this.debug) {
    console.log(`[ShippingDataService] ${message}`, data);
  }
}
```

## Production Deployment
1. Set `debug = false` in service
2. Update API URLs to production endpoints
3. Optimize bundle size by removing unused chart types
4. Enable Angular production mode
5. Configure caching for chart data

## Support
For questions or issues:
1. Check the component console for error messages
2. Verify your data matches the required interfaces
3. Test with sample data first
4. Check network tab for API call issues
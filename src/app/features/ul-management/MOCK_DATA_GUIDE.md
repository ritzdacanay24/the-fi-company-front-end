# UL Management Mock Data System

## Overview
The UL Management system includes a comprehensive mock data service that allows you to develop and test the frontend without needing a working backend API. This is perfect for:

- Frontend development and testing
- Demo purposes
- Development when backend is not available
- UI/UX testing with realistic data

## How to Use Mock Data

### 1. Automatic Mock Data (Development Mode)
By default, the system uses mock data in development mode. The mock data toggle appears at the top of the UL Management dashboard when not in production.

### 2. Manual Toggle
You can switch between mock data and real API using the toggle button in the dashboard:
- **Mock Data Mode**: Uses local fake data with simulated API delays
- **Real API Mode**: Attempts to connect to the actual backend endpoints

### 3. Mock Data Features

#### Complete Dataset
- **6 Sample UL Labels** with various statuses (active, expired)
- **5 Sample Usage Records** with realistic data
- **Categories**: Electronics, Wiring, Appliances, Medical
- **Realistic dates** and proper relationships

#### Simulated API Behavior
- **Network delays** (200ms - 2000ms) to simulate real API calls
- **Proper error handling** for validation scenarios
- **Success/failure responses** matching real API format
- **Pagination** and filtering support

#### Full CRUD Operations
- ✅ Create, Read, Update, Delete UL Labels
- ✅ Record and manage usage tracking
- ✅ Search and filtering
- ✅ Bulk upload simulation
- ✅ Dashboard statistics
- ✅ Report generation
- ✅ Export functionality

### 4. Mock Data Contents

#### Sample UL Labels
```
E123456 - Standard Electronics Component Label (Active)
E789012 - High Voltage Component Label (Active)
E345678 - Wire and Cable Assembly Label (Active)
E901234 - Appliance Safety Label (Active)
E567890 - Medical Device Component Label (Active)
E111222 - Expired Component Label (Expired)
```

#### Sample Usage Records
- Various customers: ABC Electronics Corp, XYZ Manufacturing, DEF Industries
- Different users: John Doe, Jane Smith, Bob Johnson, Alice Brown, Mike Wilson
- Realistic serial numbers and usage patterns

### 5. Development Features

#### Toggle Button
- Located at the top of the UL Management dashboard
- Only visible in development mode
- Shows current mode (Mock Data / Real API)
- Instant switching with data reload

#### Console Logging
- Mode switching notifications
- Mock service activity logging
- Error simulation logging

#### Local Storage
- Remembers your preference between sessions
- Stores toggle state in browser localStorage

### 6. Technical Implementation

#### Service Structure
```typescript
ULLabelService (main service)
├── Uses MockToggleService to determine mode
├── Routes calls to ULLabelMockService or HttpClient
└── Maintains same interface for both modes

ULLabelMockService (mock implementation)
├── Complete mock dataset
├── Simulated delays and responses
├── Full CRUD operations
└── Realistic error scenarios

MockToggleService (toggle management)
├── BehaviorSubject for reactive state
├── localStorage persistence
└── Easy mode switching
```

#### Mock Service Features
- **Realistic delays**: 200ms-2000ms simulation
- **Data persistence**: Changes persist during session
- **Validation**: Proper error handling (duplicates, not found, etc.)
- **Statistics**: Calculated dashboard stats and reports
- **Relationships**: Proper foreign key relationships

### 7. Switching to Real API

When you're ready to use the real backend:

1. **Automatic**: Deploy to production (uses environment.production)
2. **Manual**: Use the toggle button to switch to "Real API" mode
3. **Code**: Set `MockToggleService.setMockData(false)`

### 8. Benefits for Development

#### Frontend Independence
- Develop UI without waiting for backend
- Test all scenarios including error cases
- Realistic data for better UI testing

#### Demo Ready
- Always have working demo data
- Consistent demo scenarios
- No backend dependencies for demos

#### Testing
- Predictable data for automated tests
- Error scenario testing
- Performance testing with delays

### 9. Extending Mock Data

To add more mock data or scenarios:

1. **Edit ULLabelMockService**:
   ```typescript
   // Add more mock labels
   private mockLabels: ULLabel[] = [
     // ... existing labels
     {
       id: 7,
       ul_number: 'E999888',
       description: 'New Test Label',
       // ... other properties
     }
   ];
   ```

2. **Add usage records**:
   ```typescript
   // Add more mock usage records
   private mockUsages: ULLabelUsage[] = [
     // ... existing usages
     {
       id: 6,
       ul_label_id: 7,
       ul_number: 'E999888',
       // ... other properties
     }
   ];
   ```

### 10. Troubleshooting

#### Toggle Not Visible
- Check if `environment.production` is false
- Ensure you're on the UL Management dashboard

#### Mock Data Not Loading
- Check browser console for errors
- Verify MockToggleService state
- Clear localStorage: `localStorage.removeItem('ul-management-mock-mode')`

#### API Calls Still Going to Backend
- Verify toggle is set to "Mock Data" mode
- Check ULLabelService.useMockData getter
- Restart development server

---

## Quick Start

1. **Navigate** to `/dashboard/ul-management`
2. **Look** for the blue toggle banner at the top
3. **Click** "Switch to Mock Data" if not already enabled
4. **Explore** all features with realistic fake data
5. **Switch** to "Real API" when backend is ready

The mock system provides a complete development environment for the UL Management system without any external dependencies!

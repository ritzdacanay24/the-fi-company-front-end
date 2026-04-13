# Material Request Kanban Board

## Overview

This new Kanban board provides a unified workflow view for all material requests across the entire process lifecycle. Instead of having separate components for different stages, users can now see everything in one place with drag-and-drop functionality.

## Features

### Visual Workflow
- **New Requests**: Just submitted, awaiting validation
- **Under Validation**: Being reviewed by supervisors/managers  
- **Pending Reviews**: Awaiting department/specialist reviews
- **Approved**: Validated and ready for picking
- **In Picking**: Currently being picked from inventory
- **Complete**: Fully processed and delivered

### Key Benefits
- **Unified Dashboard**: See all requests in one view
- **Drag & Drop**: Move requests between statuses
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Filtering**: Search by requester, department, priority
- **Performance Metrics**: Track processing times and bottlenecks
- **Mobile Responsive**: Works on tablets and phones

### Interactive Features
- **Click to Edit**: Click any request card to open detail view
- **Quick Actions**: Approve/reject directly from cards
- **Status Indicators**: Priority badges, overdue warnings
- **Review Summaries**: See pending/approved/rejected reviews at a glance
- **Age Tracking**: Visual indicators for request age

## Implementation Details

### Components Created
1. `material-request-kanban.component.ts` - Main Kanban logic
2. `material-request-kanban.component.html` - Kanban board template
3. `material-request-kanban.component.scss` - Styles and animations

### New Service Methods Added
- `MaterialRequestService.getAllWithStatus()` - Get all requests with status
- `MaterialRequestService.updateStatus()` - Update request status
- `MaterialRequestService.getBulkRequestReviews()` - Get review data for multiple requests

### Drag & Drop Rules
- **Forward Movement**: Generally allowed (new → validation → reviews → approved → picking → complete)
- **Limited Backward Movement**: 
  - Picking → Approved (if picking failed)
  - Reviews → Validation (if review rejected)
- **Prevented Moves**: Cannot move backwards through most stages

### Data Structure
Each request card shows:
- Request number and requester name
- Department and item count
- Age and priority indicators
- Review status summary
- Action buttons for quick operations

## Routing Integration

The Kanban board is now the default view for material requests:
- **URL**: `/operations/material-request/kanban`
- **Default Route**: Material Request module now opens to Kanban view
- **Navigation**: Easy access to all other material request functions

## Usage Workflow

1. **Dashboard Overview**: See all requests across workflow stages
2. **Filter & Search**: Find specific requests or view by department
3. **Quick Actions**: Approve/reject directly from cards
4. **Detailed Editing**: Click cards to open full validation view
5. **Status Management**: Drag requests between columns as status changes
6. **Performance Monitoring**: Track bottlenecks and processing times

## Future Enhancements

- **Bulk Operations**: Select multiple cards for bulk actions
- **Custom Columns**: User-configurable workflow stages
- **Advanced Filtering**: Date ranges, value ranges, requester groups
- **Analytics Dashboard**: Charts and metrics overlay
- **Notifications**: Real-time updates for status changes
- **Export Functions**: PDF/Excel export of current view

This Kanban implementation provides a much more intuitive and efficient workflow for managing material requests compared to the previous separate component approach.

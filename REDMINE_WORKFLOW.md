# Redmine Ticket Workflow Management

## Overview
This feature allows users to manage Redmine ticket status transitions directly from the ticket detail page with a visual workflow pipeline.

## Workflow Status Pipeline

The workflow follows a linear progression through five stages:

```
1. New → 2. In Progress → 3. Ready to Test → 4. Testing → 5. Closed
```

### Status Definitions

| Status | ID | Description | Color |
|--------|----|----|-------|
| **New** | 1 | Newly created ticket, not yet started | Blue |
| **In Progress** | 2 | Being actively worked on | Yellow |
| **Ready to Test** | 3 | Development complete, awaiting testing | Purple |
| **Testing** | 4 | Under quality assurance/testing | Orange |
| **Closed** | 5 | Complete/resolved | Gray |

## Allowed Transitions

### From New (1)
- Can move to: **In Progress** (2)

### From In Progress (2)
- Can move to: **Ready to Test** (3)
- Can revert to: **New** (1)

### From Ready to Test (3)
- Can move to: **Testing** (4)
- Can revert to: **In Progress** (2)

### From Testing (4)
- Can move to: **Closed** (5)
- Can revert to: **In Progress** (2)

### From Closed (5)
- Can reopen to: **In Progress** (2)

## User Interface

### Ticket Detail Page (`/redmine/[id]`)

The ticket detail page displays:

1. **Workflow Pipeline Visualization**: Shows all 5 stages with the current status highlighted
2. **Action Buttons**: Displays available next steps based on current status
3. **Status Badge**: Shows current status with color coding
4. **Notifications**: Success/error messages for status updates

### Status Transitions

The "Workflow Actions" section shows:
- Visual pipeline with numbered steps (1-5)
- Current position highlighted in the pipeline
- Buttons for each valid next transition
- Loading indicator during status updates

## Implementation Details

### Backend API

**Endpoint**: `PUT /api/redmine/issues/[id]`

**Request Body**:
```json
{
  "statusId": 2,
  "notes": "Optional update notes"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ticket #123 status updated to In Progress",
  "ticketId": "123",
  "newStatus": 2,
  "newStatusName": "In Progress"
}
```

**Error Response** (Invalid Transition):
```json
{
  "error": "Invalid status transition",
  "message": "Cannot transition from In Progress to New",
  "currentStatus": 2,
  "allowedTransitions": [3]
}
```

### Frontend Component

**File**: `/app/(dashboard)/redmine/[id]/page.tsx`

Key features:
- Fetches allowed transitions on page load
- Real-time status updates with optimistic UI
- Loading states during update operations
- Error handling with user notifications
- Local state refresh after successful updates

### Authentication

The API uses Redmine credentials stored in:
- **Cookie**: `redmine_creds` (base64 encoded username:password)
- **Header**: `x-redmine-credentials` (fallback)

## Usage Example

1. Navigate to a ticket detail page: `/redmine/123`
2. Scroll to "Workflow Actions" section
3. Click on the desired next status button (e.g., "Move to In Progress")
4. Status updates immediately with success notification
5. Available actions update based on new status

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Authentication failed" | Invalid Redmine credentials | Re-login with correct credentials |
| "Invalid status transition" | Tried invalid status change | Use only available action buttons |
| "Ticket not found" | Ticket ID doesn't exist in Redmine | Verify ticket ID |
| "Failed to update status" | Network/Redmine server issue | Try again or check Redmine status |

## Future Enhancements

Potential improvements:
- Add notes/comments field for status transitions
- Approval workflows for certain transitions
- Bulk status updates for multiple tickets
- Status transition history timeline
- Automated transitions based on time/rules
- Custom workflows per project

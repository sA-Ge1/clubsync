# ClubSync Project Plan

## Overview
ClubSync is a club management system built with Next.js, TypeScript, and Supabase. It allows clubs to manage members, inventory, and handle requests from students and departments.

## Current Status
- ✅ Authentication (Signup/Login) - Implemented
- ✅ User Info Hook - Implemented
- ✅ Header Component - Basic structure exists
- ✅ Footer Component - Exists
- ✅ Contact & Support Pages - Exist
- ❌ Landing Page - Needs to be created
- ❌ User Icon Button with Dropdown - Needs to be added
- ❌ Club Page - Needs to be created
- ❌ Inventory Page - Needs to be created
- ❌ Department Page - Needs to be created

## Database Schema Summary
- **auth**: User authentication with roles (student, faculty, club)
- **clubs**: Club information with faculty advisor
- **students**: Student information with department
- **faculty**: Faculty information with department
- **departments**: Department information with HOD
- **memberships**: Club membership relationships
- **inventory**: Club inventory items (public/private)
- **transactions**: Inventory borrowing requests
- **department_requests**: Requests routed through departments
- **funds**: Club funds (to be implemented later)

## Implementation Plan

### Phase 1: UI/UX Enhancements
1. **Landing Page** (`src/app/page.tsx`)
   - Modern, attractive design
   - Hero section with ClubSync branding
   - Features overview
   - Call-to-action buttons
   - Responsive design

2. **User Icon Button** (Update `src/components/Header.tsx`)
   - Add avatar/user icon button
   - Dropdown menu showing:
     - User name
     - User email
     - User role
     - Logout option
   - Position in header (desktop and mobile)

### Phase 2: Club Management Page
**Route**: `/club` or `/club/[clubId]`

**Features**:
1. **Authentication Check**
   - Verify user is authenticated
   - Check if user's email matches club email (for first-time setup)
   - Redirect if not authorized

2. **Member Management**
   - View all club members
   - Add members (bulk import via CSV or manual entry)
   - Remove members (bulk selection)
   - Search/filter members
   - Display member roles
   - Toast notifications for success/error

3. **Inventory Management**
   - View all club inventory
   - Add new inventory items
   - Edit inventory items
   - Delete inventory items
   - Toggle public/private visibility
   - Update quantities

4. **Request Management**
   - View pending requests
   - Approve/reject requests
   - Filter by status (pending, approved, rejected)
   - Show request details (student, item, quantity, dates)

### Phase 3: Inventory Page
**Route**: `/inventory`

**Features**:
1. **Inventory Display**
   - Show all items where `is_public = true`
   - Show items from clubs the student is a member of
   - Search and filter functionality
   - Display: name, description, quantity, club, image

2. **Request Functionality**
   - If student is member of club: Direct request button
   - If student is not member: Request through department button
   - Request form: quantity, due date, message
   - Toast notifications for request status

### Phase 4: Department Page
**Route**: `/department` or `/department/[deptId]`

**Features**:
1. **Authorization Check**
   - Verify user is faculty
   - Check if faculty belongs to the department
   - Redirect if not authorized

2. **Request Management**
   - View all department requests
   - Filter by status
   - Approve/reject requests
   - View request details
   - Toast notifications

### Phase 5: Error Handling & Polish
1. **Toast Notifications**
   - Success messages
   - Error messages
   - Loading states
   - Use Sonner (already installed)

2. **Loading States**
   - Skeleton loaders
   - Spinner components

3. **Error Boundaries**
   - Handle API errors gracefully
   - Display user-friendly error messages

## Technical Implementation Details

### Components to Create
1. `src/components/ui/avatar.tsx` - Already exists
2. `src/components/ui/dropdown-menu.tsx` - May need to create
3. `src/components/ui/dialog.tsx` - For modals
4. `src/components/ui/table.tsx` - For data tables
5. `src/components/ui/badge.tsx` - For status badges
6. `src/components/ui/textarea.tsx` - For forms

### API Routes (if needed)
- `/api/club/members` - Member management
- `/api/club/inventory` - Inventory management
- `/api/club/requests` - Request management
- `/api/inventory/request` - Create inventory request
- `/api/department/requests` - Department request management

### Database Queries
- Check club email authentication
- Fetch club members with pagination
- Bulk insert/delete members
- Fetch inventory with filters
- Create/update transactions
- Fetch department requests
- Update request status

## File Structure
```
src/
├── app/
│   ├── page.tsx (Landing Page)
│   ├── club/
│   │   └── page.tsx (Club Management)
│   ├── inventory/
│   │   └── page.tsx (Inventory Browse)
│   ├── department/
│   │   └── page.tsx (Department Requests)
│   └── ...
├── components/
│   ├── Header.tsx (Update with user dropdown)
│   ├── ui/
│   │   ├── dropdown-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ...
└── lib/
    └── supabaseClient.ts (Already exists)
```

## Priority Order
1. Landing Page (High - First impression)
2. User Icon Button (High - Navigation)
3. Club Page (High - Core functionality)
4. Inventory Page (High - Core functionality)
5. Department Page (Medium - Secondary feature)
6. Error Handling & Polish (Ongoing)

## Notes
- Funds feature is deferred for later
- Use existing UI components from shadcn/ui
- Ensure responsive design for mobile
- Follow existing code patterns and styling
- Use TypeScript for type safety
- Leverage Supabase RLS policies for security


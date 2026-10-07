# Car Service System — User Roles, Documents, and Activities

This document defines **user roles**, their **required documents**, and **core activities** to support mobile application development.

## Roles Overview

The system has four roles:
- `super_admin`
- `garage_admin`
- `service_technician`
- `car_owner`

---

## 1) Super Admin

**Scope:** System-wide (all garages, all users).

**Required documents:**
- None (internal system role).

**Key activities:**
- Create and manage garages.
- Create and manage garage admin accounts.
- Approve/reject garage admins.
- View all users, services, vehicles, and reports.
- Manage service catalog (global).
- View system notifications.

**Permissions summary (high level):**
- Full access to system data.
- Can manage global configurations and definitions.

---

## 2) Garage Admin

**Scope:** Only their garage(s). No access to other garages or global system settings.

**Required documents (during registration and when adding a new garage):**
- Business License
- Registration Certificate
- Tax Clearance
- Insurance

**Key activities:**

### Account & Profile
- Login / logout
- Update profile (name, email, phone, gender, DOB)
- Change password

### Garage Overview Dashboard
- Total service requests (today / week / month)
- Jobs in progress vs completed
- Recent service activity
- Top service technicians
- Recent vehicles served

### Mechanic (Service Technician) Management
- Create service technician account
- View technicians in their garage
- Update technician details
- Reset technician password
- Enable / disable technician accounts

### Service Monitoring (Main Feature)
- View all service requests in their garage
- Filter by:
  - date range
  - status (pending / in_progress / completed / cancelled)
  - technician
  - vehicle plate
  - service type (optional)
- View service details:
  - owner, vehicle, technician
  - service description / diagnosis
  - parts used (optional)
  - cost / totals
  - timestamps and status history
- Update service status in special cases (optional override)

### Reports
- Daily / weekly / monthly performance
- Export (CSV / PDF optional)

### Notifications
- New service request created
- Job completed
- Job delayed (optional)
- Technician account changes

---

## 3) Service Technician

**Scope:** Assigned garage only.

**Required documents:**
- None by default.
  - (Optional if needed later: national ID, certificate, or license)

**Key activities:**
- Register / search car owners
- Register vehicles
- Create service requests
- Add diagnosis, services performed, parts used
- Update job status (pending → in_progress → completed)
- Add notes and costs
- Mark job completed
- View their own work history

---

## 4) Car Owner

**Scope:** Own vehicles only.

**Required documents:**
- None by default.
  - (Optional if needed later: national ID)

**Key activities:**
- Own a profile with vehicle info
- View service history (optional)
- View job status (optional)

---

## Document Payload Structure (for mobile)

When registering a `garage_admin` (or adding a new garage), send documents like this:

```json
{
  "documents": [
    {
      "type": "business_license",
      "url": "https://files.example.com/license.pdf"
    },
    {
      "type": "registration_certificate",
      "url": "https://files.example.com/registration.pdf"
    },
    {
      "type": "tax_clearance",
      "url": "https://files.example.com/tax.pdf"
    },
    {
      "type": "insurance",
      "url": "https://files.example.com/insurance.pdf"
    }
  ]
}
```

**Supported doc types:**
- `business_license`
- `registration_certificate`
- `tax_clearance`
- `insurance`

---

## Notes for Mobile App

- Garage admins must **verify email** and be **approved** before login.
- Garage admin data is **garage-scoped**.
- Technicians can only access services in their garage.
- Car owners can only see their own vehicles and services.

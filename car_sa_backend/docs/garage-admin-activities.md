# Garage Admin Activities

## Purpose
The **Garage Admin** manages operations at the garage level. Their main job is to **monitor everything happening in their garage** and **manage service technicians**.

Scope: **Only their garage(s)**. No access to other garages and no global system settings.

---

## 1) Account & Profile
- Log in / log out
- View and update profile (name, phone, email)
- Change password

## 2) Garage Overview Dashboard
Garage Admin can view:
- Total service requests (today / week / month)
- Jobs in progress vs completed
- Recent service activity logs
- Top active service technicians (based on jobs completed)
- Vehicles served recently

## 3) Service Technician Management
### Create Service Technician Account
- Add details: name, email, phone, gender (optional), DOB (optional)
- Assign role: `service_technician`
- Set initial password (or send email to set password)

### View Service Technicians
- List technicians in the garage
- View technician profile + activity summary

### Update Service Technician
- Edit details (name, phone, email)
- Reset password (admin action)

### Enable/Disable Service Technician
- Activate or deactivate a technician account
- Disabled technicians cannot login or create/update jobs

## 4) Service Monitoring (Main Feature)
### View All Service Requests (in garage)
- List all service requests created by technicians
- Filter by:
  - date range
  - status (new / in-progress / completed)
  - technician
  - vehicle plate number
  - service type/category (if applicable)

### View Service Request Details
Garage Admin can open a service request and see:
- Car owner details
- Vehicle details
- Assigned technician
- Service description / diagnosis
- Services performed
- Parts used (if tracked)
- Cost / totals (if tracked)
- Status history (timeline)
- Created/updated timestamps

### Status Tracking
- Garage Admin can **view** status changes
- (Optional rule) Garage Admin can **override** status in special cases

## 5) Service Technician Performance Tracking
Garage Admin can view performance per technician:
- Number of jobs completed
- Average completion time (optional)
- Jobs still pending
- Customer feedback rating (optional)
- Work history list (click to open each job)

## 6) Garage Reports
- Daily report: jobs created/completed + totals
- Weekly report: trend of jobs + top services
- Monthly report: performance summary
- Export report (PDF/Excel) (optional)

## 7) Notifications
Garage Admin receives notifications for:
- New service request created
- Job completed
- Job delayed (in-progress too long) (optional rule)
- Service technician account changes

## 8) Access Rules (Important)
- Garage Admin can only see:
  - users (service technicians, car owners) linked to their garage operations
  - service requests and logs belonging to their garage
- Cannot:
  - access other garages
  - change global role definitions
  - manage super_admin accounts

---

## Suggested Pages (UI)
1. Dashboard
2. Service Technicians (List + Add + Details)
3. Service Requests (List + Filters + Details)
4. Reports
5. Notifications
6. Settings / Profile

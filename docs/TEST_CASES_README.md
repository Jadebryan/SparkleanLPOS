# Laundry POS Test Cases

Test cases are separated by user role (Admin | Staff) in a single CSV file and use a hierarchical numbering system.

## File

| File | Description |
|------|-------------|
| `TEST_CASES_Laundry_POS.csv` | All test cases with Role column (Admin: 65; Staff: 46) |

## Numbering System

- **Main test case**: `1`, `2`, `3`, ...
- **Sub-cases** (error handling, variations): `1.1`, `1.2`, `1.3`, ...
- **Next main test case**: `2`, then `2.1`, `2.2`, ...
- Process repeats for each feature area

### Example
```
1     - Admin Login - Valid credentials
1.1   - Admin Login - Invalid password (Error Handling)
1.2   - Admin Login - Invalid email (Error Handling)
1.3   - Admin Login - Missing credentials (Error Handling)
2     - Admin Logout
3     - Admin Password Change
3.1   - Admin Password Change - Wrong current password (Error Handling)
4     - Admin - Email verification request
...
```

## Admin vs Staff Coverage

### Admin (Web App)
- Full CRUD: Orders, Customers, Employees, Services, Discounts, Vouchers, Branches
- Reports & Analytics, Export (CSV, Excel, PDF)
- RBAC, Audit Logs, Backup & Recovery
- Dashboard with customizable sections
- Expense approval/rejection
- System settings, Points/Voucher configuration

### Staff (Mobile App)
- Orders: Create, View, Update (own orders only), Draft, Print
- Customers: View, Add, Edit, Search
- Expenses: Create, View own, Appeal rejected
- Limited settings (Profile, Appearance, Help)
- Offline support, Notifications
- No access to: Employees, RBAC, Backup, Full reports

## Test Types
- **Normal**: Happy path / expected behavior
- **Error Handling**: Invalid input, permission denied, edge cases

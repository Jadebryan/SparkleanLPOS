# System Limitations

## 1.4. Scope and Limitations

The proposed Laundry Point of Sale (POS) and Management System is designed to address common challenges in managing laundry shop operations, including processing customer transactions, tracking laundry orders, and monitoring inventory. The system focuses on streamlining and digitalizing the workflow, providing an intuitive interface for staff and administrators, real-time updates on order statuses, automated record-keeping, multi-branch support, and administrative tools for efficient management. These features aim to enhance operational efficiency, reduce errors, and improve service quality within the laundry business.

The system also supports email notifications for order updates, payment confirmations, and inventory alerts, ensuring timely communication with both staff and customers. Additionally, the staff mobile application includes offline queue functionality that allows staff to continue working during temporary network interruptions, with automatic synchronization when connectivity is restored.

However, the system has certain limitations:

### Network and Infrastructure Dependencies
- **Internet Connectivity Requirement**: The system requires a stable internet connection to function properly. While the staff mobile application includes offline request queuing for basic operations, full functionality (including real-time updates, data synchronization, and access to the admin web application) requires active internet connectivity. The system cannot operate completely offline, which may restrict usability during extended power outages or network interruptions.

- **Server Dependency**: The system requires a continuously running backend server (Node.js/Express) to process requests and manage data. Server downtime will result in complete system unavailability for all users.

- **Database Dependency**: The system relies on MongoDB (either cloud-hosted via MongoDB Atlas or self-hosted) for data storage. Database unavailability or connection issues will prevent all data operations, including order creation, customer management, and report generation.

### Platform and Browser Limitations
- **Admin Application Platform**: The admin web application is browser-based and requires a modern web browser (Chrome, Firefox, Edge, or Safari with recent versions) to function properly. Older browsers or browsers without JavaScript support cannot access the system.

- **Staff Application Platform**: The staff mobile application is built using React Native/Expo and is only available for iOS and Android mobile devices. It is not available for desktop computers or web browsers, limiting staff access to mobile devices only.

- **iOS Build Requirements**: Building and distributing the iOS version of the staff application requires a Mac computer and an Apple Developer Program account ($99/year), which may increase deployment costs and complexity.

### External Service Dependencies
- **Email Service**: Email notifications require configuration of either Gmail SMTP (with App Password) or a third-party transactional email service (SendGrid, Mailgun, etc.). Email functionality will be unavailable if these services are not properly configured or experience outages.

- **SMS Service (Optional)**: SMS notifications require a Twilio account and purchased phone number, with per-message costs. SMS functionality is optional but requires additional setup and ongoing costs.

- **Image Storage (Optional)**: Image uploads for expenses and receipts can use Cloudinary or similar cloud storage services, which may incur additional costs for storage and bandwidth.

### Technical Limitations
- **Browser Compatibility**: The admin web application requires modern browser features and may not function correctly on very old browsers (Internet Explorer, older versions of Safari, etc.). The system is optimized for browsers released within the last 3-5 years.

- **Hardware Requirements**: The backend server requires minimum specifications (2GB RAM, 2 CPU cores) for basic operation, with higher specifications recommended for production use. Performance may degrade under heavy load on minimal hardware configurations.

- **Scalability Constraints**: While the system supports multi-branch operations, performance and scalability are limited by server resources, database capacity, and network bandwidth. Very large-scale deployments (hundreds of concurrent users or millions of records) may require additional infrastructure optimization.

- **Offline Functionality**: While the staff mobile application includes offline request queuing, it does not provide full offline functionality. Staff can queue certain operations (like order creation) while offline, but cannot view existing data, generate reports, or perform administrative functions without internet connectivity.

### Business Context Limitations
- **Industry-Specific Design**: The system is specifically tailored for laundry operations and includes features, workflows, and terminology specific to the laundry business. Adapting the system for other business contexts (retail, restaurants, etc.) would require significant customization and may not be cost-effective.

- **Payment Processing**: The system tracks payments and payment methods but does not include integrated payment gateway functionality for processing credit cards or digital payments. Payment processing must be handled externally.

- **Inventory Management**: While the system tracks services and can monitor order quantities, it does not include comprehensive inventory management features such as stock levels, automatic reordering, or supplier management.

### Operational Limitations
- **Data Export**: While the system supports exporting reports in various formats (PDF, Excel, CSV), bulk data export capabilities may be limited for very large datasets, and some complex reports may require significant processing time.

- **Backup and Recovery**: While the system includes automated backup functionality, backup restoration requires manual intervention and technical knowledge. The system does not include automated disaster recovery or failover capabilities.

- **User Management**: User account creation and role management are primarily handled through the admin interface. The system does not include self-service user registration or password reset functionality for customers.

- **Multi-Language Support**: The system is currently designed for English language use. Multi-language support would require additional development and localization efforts.

### Cost and Deployment Limitations
- **Initial Setup Complexity**: Deploying the system requires technical knowledge for server setup, database configuration, SSL certificate installation, and environment variable configuration. Non-technical users may require assistance for initial deployment.

- **Ongoing Maintenance**: The system requires regular maintenance, including server updates, security patches, database backups, and monitoring. Organizations without technical staff may need to budget for ongoing technical support.

- **Third-Party Service Costs**: While the core system can be self-hosted, optional features (SMS notifications, cloud image storage, email services beyond free tiers) may incur ongoing costs.

Overall, the system provides a centralized, multi-branch solution that enhances workflow, supports accurate record-keeping, and improves management efficiency in laundry shops. However, organizations should consider these limitations when planning deployment, especially regarding infrastructure requirements, technical expertise needed, and potential service dependencies.


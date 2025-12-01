System Limitations (Paper Format)

1.4. Scope and Limitations

The proposed Laundry Point of Sale (POS) and Management System is designed to address common challenges in managing laundry shop operations, including processing customer transactions, tracking laundry orders, and monitoring inventory. The system focuses on streamlining and digitalizing the workflow, providing an intuitive interface for staff and administrators, real-time updates on order statuses, automated record-keeping, multi-branch support, and administrative tools for efficient management. These features aim to enhance operational efficiency, reduce errors, and improve service quality within the laundry business.

The system also supports email notifications for order updates, payment confirmations, and inventory alerts, ensuring timely communication with both staff and customers. Additionally, the staff mobile application includes offline request queuing functionality that allows staff to continue working during temporary network interruptions, with automatic synchronization when connectivity is restored.

However, the system has certain limitations:

Network and Infrastructure Dependencies: The system requires a stable internet connection and continuously running server infrastructure to function properly. While the staff mobile application includes offline request queuing for basic operations, full functionality requires active internet connectivity. The system cannot operate completely offline, which may restrict usability during extended power outages or network interruptions. Additionally, the system depends on MongoDB database availability, and any database connection issues will prevent all data operations.

Platform and Browser Limitations: The admin web application is browser-based and requires modern web browsers (Chrome, Firefox, Edge, or Safari with recent versions) to function properly. The staff mobile application is only available for iOS and Android mobile devices and is not accessible via desktop computers or web browsers. Building the iOS version requires a Mac computer and an Apple Developer Program account, which may increase deployment costs.

External Service Dependencies: Email notifications require configuration of Gmail SMTP or third-party transactional email services. Optional features such as SMS notifications require a Twilio account with ongoing costs, and image storage may require cloud storage services with associated fees. These external dependencies may experience outages or require additional setup and maintenance.

Technical Constraints: The system requires minimum server specifications (2GB RAM, 2 CPU cores) for basic operation, with higher specifications recommended for production. Performance and scalability are limited by server resources, database capacity, and network bandwidth. Very large-scale deployments may require additional infrastructure optimization. Browser compatibility is limited to modern browsers released within the last 3-5 years.

Business Context Limitations: The system is specifically tailored for laundry operations and includes features, workflows, and terminology specific to the laundry business. Adapting the system for other business contexts would require significant customization. Additionally, the system tracks payments but does not include integrated payment gateway functionality for processing credit cards or digital payments, and it does not include comprehensive inventory management features such as stock levels or automatic reordering.

Operational Constraints: While the system supports data export in various formats, bulk data export capabilities may be limited for very large datasets. Backup restoration requires manual intervention and technical knowledge, and the system does not include automated disaster recovery capabilities. User account management is primarily handled through the admin interface, and the system is currently designed for English language use only.

Deployment and Maintenance Requirements: Deploying the system requires technical knowledge for server setup, database configuration, SSL certificate installation, and environment variable configuration. The system requires regular maintenance including server updates, security patches, database backups, and monitoring, which may necessitate ongoing technical support.

Overall, the system provides a centralized, multi-branch solution that enhances workflow, supports accurate record-keeping, and improves management efficiency in laundry shops. However, organizations should consider these limitations when planning deployment, especially regarding infrastructure requirements, technical expertise needed, and potential service dependencies.


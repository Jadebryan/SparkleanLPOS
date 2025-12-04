COMPLETE STEP-BY-STEP CONFIGURATION GUIDE
Network Configuration for Router-on-a-Stick Inter-VLAN Routing

================================================================================
TABLE OF CONTENTS
================================================================================

Port Assignments and Physical Connections
Step 1: Configure Router0 (Router-on-a-Stick)
Step 2: Configure Router1 (WAN Router)
Step 3: Configure Switch0 (Main Switch)
Step 4: Configure Switch1 (Secondary Switch)
Step 5: Configure Wireless Router
Step 6: Verification Commands
Step 7: Testing Procedures

================================================================================
PORT ASSIGNMENTS AND PHYSICAL CONNECTIONS
================================================================================

ROUTER0 (ISR4331) PORT ASSIGNMENTS:

GigabitEthernet0/0/0 - Trunk to Switch0 (Router-on-a-Stick)
  Subinterface 0.10 - VLAN 10 (Classroom)
  Subinterface 0.20 - VLAN 20 (Office)
  Subinterface 0.30 - VLAN 30
  Subinterface 0.40 - VLAN 40
  Subinterface 0.99 - VLAN 99 (Management/Native)

Serial0/1/0 - WAN Link to Router1 (Serial DCE)
  IP: 192.168.50.1/24

ROUTER1 (ISR4331) PORT ASSIGNMENTS:

Serial0/1/0 - WAN Link from Router0 (Serial DTE)
  IP: 192.168.50.2/24

GigabitEthernet0/0/0 - Link to Wireless Router
  IP: 192.168.50.3/24

SWITCH0 (2960-24TT) PORT ASSIGNMENTS:

FastEthernet0/1 - IT_PC (VLAN 99 - Management)
FastEthernet0/2 - PC1 (VLAN 10 - Classroom)
FastEthernet0/3 - PC2 (VLAN 20 - Office)
FastEthernet0/4-20 - Unused Ports (Disabled, assigned to VLAN 999)
FastEthernet0/21 - Trunk to Switch1 (EtherChannel Member 1 - Port-channel 1)
FastEthernet0/22 - Trunk to Switch1 (EtherChannel Member 2 - Port-channel 1)
FastEthernet0/23 - Trunk to Switch1 (EtherChannel Member 3 - Port-channel 1)
FastEthernet0/24 - Trunk to Router0 (Router-on-a-Stick)

Port-channel 1 - EtherChannel to Switch1 (Fa0/21, Fa0/22, Fa0/23)

SWITCH1 (2960-24TT) PORT ASSIGNMENTS:

FastEthernet0/1 - PC3 (VLAN 30)
FastEthernet0/2 - PC4 (VLAN 40)
FastEthernet0/3-20 - Unused Ports (Disabled, assigned to VLAN 999)
FastEthernet0/21 - Trunk to Switch0 (EtherChannel Member 1 - Port-channel 1)
FastEthernet0/22 - Trunk to Switch0 (EtherChannel Member 2 - Port-channel 1)
FastEthernet0/23 - Trunk to Switch0 (EtherChannel Member 3 - Port-channel 1)
FastEthernet0/24 - Trunk to Router0 (Router-on-a-Stick)

Port-channel 1 - EtherChannel to Switch0 (Fa0/21, Fa0/22, Fa0/23)

WIRELESS ROUTER (HomeRouter-PT-AC) PORT ASSIGNMENTS:

GigabitEthernet0/1 - WAN Interface to Router1
  IP: 192.168.50.4/24

GigabitEthernet0/2 - LAN Interface
  IP: 192.168.200.1/24

Dot11Radio0 - Wireless Interface
  SSID: GuestAccess
  Channel: 6
  Security: WPA2

END DEVICE CONNECTIONS:

IT_PC - Connected to Switch0 Fa0/1 (VLAN 99)
  IP: 192.168.1.68/29
  Gateway: 192.168.1.65

PC1 - Connected to Switch0 Fa0/2 (VLAN 10)
  IP: 192.168.1.34/28 (or DHCP)
  Gateway: 192.168.1.33

PC2 - Connected to Switch0 Fa0/3 (VLAN 20)
  IP: 192.168.1.50/29 (or DHCP)
  Gateway: 192.168.1.49

PC3 - Connected to Switch1 Fa0/1 (VLAN 30)
  IP: 192.168.1.2/27 (or DHCP)
  Gateway: 192.168.1.1

PC4 - Connected to Switch1 Fa0/2 (VLAN 40)
  IP: 192.168.1.58/29 (or DHCP)
  Gateway: 192.168.1.57

Laptop - Wireless connection to Wireless Router
  IP: 192.168.200.10/24 (or DHCP)
  Gateway: 192.168.200.1

Iphone - Wireless connection to Wireless Router
  IP: 192.168.200.11/24 (or DHCP)
  Gateway: 192.168.200.1

CONNECTION SUMMARY:

Router0 G0/0/0 <---> Switch0 Fa0/24 (Trunk)
Router0 Serial0/1/0 <---> Router1 Serial0/1/0 (WAN Link - Serial Cable, 192.168.50.0/24)
Router1 G0/0/1 <---> Wireless Router G0/1 (WAN - 192.168.50.0/24)
Switch0 Fa0/21 <---> Switch1 Fa0/21 (EtherChannel Member 1 - Port-channel 1)
Switch0 Fa0/22 <---> Switch1 Fa0/22 (EtherChannel Member 2 - Port-channel 1)
Switch0 Fa0/23 <---> Switch1 Fa0/23 (EtherChannel Member 3 - Port-channel 1)
Switch0 Fa0/24 <---> Router0 G0/0/0 (Trunk)
Switch1 Fa0/24 <---> Router0 G0/0/0 (Trunk)

================================================================================
CABLE TYPES FOR EACH CONNECTION
================================================================================

NOTE: Modern Cisco devices (ISR4331 routers and 2960 switches) support auto-MDIX,
which automatically detects and corrects for straight-through or crossover cables.
However, for clarity and compatibility, use the recommended cable types below.

SWITCH TO END DEVICE CONNECTIONS (Straight-Through Cable):

Switch0 Fa0/1 <---> IT_PC (Straight-Through)
Switch0 Fa0/2 <---> PC1 (Straight-Through)
Switch0 Fa0/3 <---> PC2 (Straight-Through)
Switch1 Fa0/1 <---> PC3 (Straight-Through)
Switch1 Fa0/2 <---> PC4 (Straight-Through)

Reason: Switch ports are MDI-X (Medium Dependent Interface Crossover) and PC NICs
are MDI (Medium Dependent Interface), so straight-through cable is used.

SWITCH TO SWITCH CONNECTION (Crossover Cable or Auto-MDIX):

Switch0 Fa0/21 <---> Switch1 Fa0/21 (Crossover or Straight-Through with auto-MDIX)
Switch0 Fa0/22 <---> Switch1 Fa0/22 (Crossover or Straight-Through with auto-MDIX)
Switch0 Fa0/23 <---> Switch1 Fa0/23 (Crossover or Straight-Through with auto-MDIX)

Reason: Both devices are switches (MDI-X to MDI-X). Traditional rule requires
crossover cable, but modern switches with auto-MDIX can use straight-through.
These three ports are bundled together in an EtherChannel (Port-channel 1) to
provide link aggregation, increased bandwidth, load balancing, and redundancy.

ROUTER TO SWITCH CONNECTIONS (Straight-Through Cable or Auto-MDIX):

Router0 G0/0/0 <---> Switch0 Fa0/24 (Straight-Through or Crossover with auto-MDIX)
Router0 G0/0/0 <---> Switch1 Fa0/24 (Straight-Through or Crossover with auto-MDIX)

Reason: Router ports are typically MDI and switch ports are MDI-X. Modern devices
with auto-MDIX can use either cable type.

ROUTER TO ROUTER CONNECTION (Serial Cable):

Router0 Serial0/1/0 <---> Router1 Serial0/1/0 (Serial Cable - DCE/DTE)
  Network: 192.168.50.0/24
  Router0 Serial0/1/0: 192.168.50.1 (DCE - provides clocking)
  Router1 Serial0/1/0: 192.168.50.2 (DTE)

Reason: This is a WAN link connection that uses a serial cable. Serial cables have
DCE (Data Circuit-terminating Equipment) and DTE (Data Terminal Equipment) ends.
One router acts as DCE (provides clocking) and the other as DTE. The red zigzag
line in the diagram indicates a serial WAN connection, not an Ethernet connection.

ROUTER TO WIRELESS ROUTER CONNECTION (Straight-Through Cable or Auto-MDIX):

Router1 G0/0/1 <---> Wireless Router G0/1 (Straight-Through or Crossover with auto-MDIX)
  Network: 192.168.50.0/24
  Router1: 192.168.50.3
  Wireless Router: 192.168.50.4

Reason: Both are router interfaces. Modern devices with auto-MDIX can use either.

WIRELESS CONNECTIONS:

Laptop <---> Wireless Router (Wireless - No Cable)
Iphone <---> Wireless Router (Wireless - No Cable)

Reason: Wireless devices connect via radio frequency, no physical cable needed.

CABLE TYPE SUMMARY TABLE:

Connection Type                    Cable Type                    Notes
--------------------------------------------------------------------------------
Switch to PC/End Device           Straight-Through              Standard connection
Switch to Switch                  Crossover                     Or straight-through if auto-MDIX
Router to Switch                  Straight-Through               Or crossover if auto-MDIX
Router to Router (WAN)            Serial Cable (DCE/DTE)        Serial connection for WAN links
Switch to Router                  Straight-Through               Or crossover if auto-MDIX
Wireless Device to Router         Wireless (No Cable)           Radio frequency connection

AUTO-MDIX NOTE:

Most modern Cisco devices (ISR4331, 2960-24TT) support auto-MDIX feature which
automatically detects the cable type and adjusts accordingly. This means you can
use either straight-through or crossover cables for most connections, and the
device will automatically configure itself correctly.

However, for best practice and compatibility:
- Use straight-through cables for switch to end device connections
- Use crossover cables for switch to switch connections (if auto-MDIX is disabled)
- Use straight-through cables for router to switch connections
- Use serial cables for router to router WAN connections (DCE/DTE)

If you are unsure, try a straight-through cable first (most common), and if it
doesn't work, try a crossover cable.

================================================================================
CABLE COLOR CODING IN NETWORK DIAGRAMS
================================================================================

In network topology diagrams, cables are often color-coded to indicate different
types of connections. Here's what each color typically represents:

RED CABLE (Trunk Links):
- Router0 G0/0/0 <---> Switch0 Fa0/24 (Trunk - Red)
- Router0 G0/0/0 <---> Switch1 Fa0/24 (Trunk - Red)
- Switch0 Fa0/23 <---> Switch1 Fa0/23 (EtherChannel/Trunk - Red)

Red cables indicate TRUNK LINKS that carry multiple VLANs using 802.1Q tagging.
These are the most critical connections as they transport traffic for all VLANs.

BLACK CABLE (Standard Access Links):
- Switch0 Fa0/1 <---> IT_PC (Access - Black)
- Switch0 Fa0/2 <---> PC1 (Access - Black)
- Switch0 Fa0/3 <---> PC2 (Access - Black)
- Switch1 Fa0/1 <---> PC3 (Access - Black)
- Switch1 Fa0/2 <---> PC4 (Access - Black)
- Router0 G0/0/1 <---> Router1 G0/0/0 (WAN Link - Black)
- Router1 G0/0/1 <---> Wireless Router G0/0 (WAN Link - Black)

Black cables typically represent standard access links or point-to-point connections
that carry traffic for a single VLAN or network segment.

COLOR CODING SUMMARY:

Color          Connection Type                    Examples
--------------------------------------------------------------------------------
RED            Trunk Links (Multiple VLANs)      Router to Switch trunks
                                                      Switch to Switch trunks
                                                      EtherChannel links
BLACK          Access Links (Single VLAN)        Switch to PC connections
                                                      Router to Router WAN links
                                                      Standard point-to-point links
BLUE           Sometimes used for WAN links     Router to Router connections
GREEN          Sometimes used for management     Management VLAN connections
YELLOW         Sometimes used for console        Console cable connections

IMPORTANT NOTES:

1. Red cables in diagrams = Trunk links carrying multiple VLANs
2. These are configured with "switchport mode trunk" on switches
3. Router subinterfaces use "encapsulation dot1Q" to tag VLANs
4. Trunk links are essential for inter-VLAN routing
5. Physical cable type (straight-through or crossover) depends on device types,
   not the color in the diagram

In your topology, the RED cables are:
- Router0 G0/0/0 to Switch0 Fa0/24 (Trunk - Red, Ethernet)
- Router0 G0/0/0 to Switch1 Fa0/24 (Trunk - Red, Ethernet)
- Router0 Serial0/1/0 to Router1 Serial0/1/0 (WANLINK - Red, Serial Cable, Network: 192.168.50.0/24)
- Switch0 Fa0/21 to Switch1 Fa0/21 (EtherChannel Member 1 - Green in diagram, Ethernet)
- Switch0 Fa0/22 to Switch1 Fa0/22 (EtherChannel Member 2 - Green in diagram, Ethernet)
- Switch0 Fa0/23 to Switch1 Fa0/23 (EtherChannel Member 3 - Green in diagram, Ethernet)
These three green connections form the EtherChannel (Port-channel 1) trunk link

NOTE: The red zigzag line between Router0 and Router1 indicates a SERIAL WAN connection,
not an Ethernet connection. This requires a serial cable (DCE/DTE), not an Ethernet cable.

The red Ethernet trunk connections carry traffic for VLANs 10, 20, 30, 40, and 99.

================================================================================
STEP 1: CONFIGURE ROUTER0 (ROUTER-ON-A-STICK)
================================================================================

NOTE: You must be in privileged EXEC mode (Router0#). Enter configuration mode first:

configure terminal
hostname Router0
enable secret class
service password-encryption
banner motd ^C
WARNING: Authorized Access Only!
Unauthorized access is prohibited!
^C

line con 0
 password cisco
 login
 exec-timeout 5 0
 logging synchronous

line vty 0 4
 password cisco
 login
 exec-timeout 5 0
 transport input ssh
 login local

username admin privilege 15 secret admin123
ip domain-name cisco.com
crypto key generate rsa general-keys modulus 2048

interface GigabitEthernet0/0/0
 no shutdown
 description Trunk to Switch0

interface GigabitEthernet0/0/0.10
 description VLAN 10 - Classroom Network
 encapsulation dot1Q 10
 ip address 192.168.1.33 255.255.255.240
 ipv6 address 2001:db8:acad:10::1/64
 ipv6 enable

interface GigabitEthernet0/0/0.20
 description VLAN 20 - Office Network
 encapsulation dot1Q 20
 ip address 192.168.1.49 255.255.255.248
 ipv6 address 2001:db8:acad:20::1/64
 ipv6 enable

interface GigabitEthernet0/0/0.30
 description VLAN 30
 encapsulation dot1Q 30
 ip address 192.168.1.1 255.255.255.224
 ipv6 address 2001:db8:acad:30::1/64
 ipv6 enable

interface GigabitEthernet0/0/0.40
 description VLAN 40
 encapsulation dot1Q 40
 ip address 192.168.1.57 255.255.255.248
 ipv6 address 2001:db8:acad:40::1/64
 ipv6 enable

interface GigabitEthernet0/0/0.99
 description VLAN 99 - Management VLAN
 encapsulation dot1Q 99 native
 ip address 192.168.1.65 255.255.255.248

interface Serial0/1/0
 description WAN Link to Router1
 ip address 192.168.50.1 255.255.255.0
 clock rate 128000
 no shutdown

ip dhcp excluded-address 192.168.1.33 192.168.1.33
ip dhcp excluded-address 192.168.1.49 192.168.1.49
ip dhcp excluded-address 192.168.1.1 192.168.1.1
ip dhcp excluded-address 192.168.1.57 192.168.1.57

ip dhcp pool VLAN10_POOL
 network 192.168.1.32 255.255.255.240
 default-router 192.168.1.33
 dns-server 8.8.8.8
 domain-name yahooyahoo.com

ip dhcp pool VLAN20_POOL
 network 192.168.1.48 255.255.255.248
 default-router 192.168.1.49
 dns-server 8.8.8.8
 domain-name yahooyahoo.com

ip dhcp pool VLAN30_POOL
 network 192.168.1.0 255.255.255.224
 default-router 192.168.1.1
 dns-server 8.8.8.8
 domain-name yahooyahoo.com

ip dhcp pool VLAN40_POOL
 network 192.168.1.56 255.255.255.248
 default-router 192.168.1.57
 dns-server 8.8.8.8
 domain-name yahooyahoo.com

ipv6 unicast-routing

ipv6 dhcp pool VLAN10_IPv6_POOL
 address prefix 2001:db8:acad:10::/64
 dns-server 2001:4860:4860::8888

ipv6 dhcp pool VLAN20_IPv6_POOL
 address prefix 2001:db8:acad:20::/64
 dns-server 2001:4860:4860::8888

ipv6 dhcp pool VLAN30_IPv6_POOL
 address prefix 2001:db8:acad:30::/64
 dns-server 2001:4860:4860::8888
 exit

ipv6 dhcp pool VLAN40_IPv6_POOL
 address prefix 2001:db8:acad:40::/64
 dns-server 2001:4860:4860::8888

interface GigabitEthernet0/0/0.10
 ipv6 dhcp server VLAN10_IPv6_POOL

interface GigabitEthernet0/0/0.20
 ipv6 dhcp server VLAN20_IPv6_POOL

interface GigabitEthernet0/0/0.30
 ipv6 dhcp server VLAN30_IPv6_POOL

interface GigabitEthernet0/0/0.40
 ipv6 dhcp server VLAN40_IPv6_POOL

ip route 192.168.200.0 255.255.255.0 192.168.50.2

copy running-config startup-config

================================================================================
STEP 2: CONFIGURE ROUTER1 (WAN ROUTER)
================================================================================

NOTE: You must be in privileged EXEC mode (Router1#). Enter configuration mode first:

configure terminal
hostname Router1
enable secret class
service password-encryption
banner motd ^C
WARNING: Authorized Access Only!
Unauthorized access is prohibited!
^C

line con 0
 password cisco
 login
 exec-timeout 5 0
 logging synchronous

line vty 0 4
 password cisco
 login
 exec-timeout 5 0
 transport input ssh
 login local

username admin privilege 15 secret admin123
ip domain-name cisco.com
crypto key generate rsa general-keys modulus 2048

interface Serial0/1/0
 description WAN Link from Router0
 ip address 192.168.50.2 255.255.255.0
 no shutdown

interface GigabitEthernet0/0/0
 description Link to Wireless Router
 ip address 192.168.50.3 255.255.255.0
 no shutdown

ip route 192.168.1.0 255.255.255.0 192.168.50.1
ip route 192.168.200.0 255.255.255.0 192.168.50.4

copy running-config startup-config

================================================================================
STEP 3: CONFIGURE SWITCH0 (MAIN SWITCH)
================================================================================

NOTE: You must be in privileged EXEC mode (Switch0#). Enter configuration mode first:

configure terminal
hostname Switch0
enable secret class
service password-encryption
banner motd ^C
WARNING: Authorized Access Only!
Unauthorized access is prohibited!
^C

line con 0
 password cisco
 login
 exec-timeout 5 0
 logging synchronous

line vty 0 4
 password cisco
 login
 exec-timeout 5 0
 transport input ssh
 login local

username admin privilege 15 secret admin123
ip domain-name cisco.com
crypto key generate rsa general-keys modulus 2048

vlan 10
 name Classroom
vlan 20
 name Office
vlan 30
 name VLAN30
vlan 40
 name VLAN40
vlan 99
 name Management
vlan 999
 name Unused_Ports

interface vlan 99
 ip address 192.168.1.66 255.255.255.252
 no shutdown
 ip default-gateway 192.168.1.65

interface FastEthernet0/1
 description IT_PC - Management
 switchport mode access
 switchport access vlan 99
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
 exit

interface FastEthernet0/2
 description PC1 - VLAN 10
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown

interface FastEthernet0/3
 description PC2 - VLAN 20
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown

interface FastEthernet0/24
 description Trunk to Router0
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
 no shutdown
 exit

interface FastEthernet0/21
 description Trunk to Switch1 - EtherChannel Member 1
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
 channel-group 1 mode desirable
 no shutdown
 exit

interface FastEthernet0/22
 description Trunk to Switch1 - EtherChannel Member 2
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
 channel-group 1 mode desirable
 no shutdown
 exit

interface FastEthernet0/23
 description Trunk to Switch1 - EtherChannel Member 3
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
 channel-group 1 mode desirable
 no shutdown
 exit

interface Port-channel 1
 description EtherChannel to Switch1 (Fa0/21, Fa0/22, Fa0/23)
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
 no shutdown
 exit

NOTE: EtherChannel uses three physical ports (Fa0/21, Fa0/22, Fa0/23) bundled together
to create a single logical link. This provides:
- Increased bandwidth (3x the speed of a single port)
- Load balancing across all three links
- Redundancy (if one or two links fail, traffic continues on remaining links)
- The three physical ports appear as one logical Port-channel 1 interface

spanning-tree mode rapid-pvst
spanning-tree vlan 1 priority 4096
spanning-tree vlan 10 priority 4096
spanning-tree vlan 20 priority 4096
spanning-tree vlan 30 priority 4096
spanning-tree vlan 40 priority 4096
spanning-tree vlan 99 priority 4096

ip dhcp snooping
ip dhcp snooping vlan 10,20,30,40,99

interface FastEthernet0/24
 ip dhcp snooping trust

interface Port-channel 1
 ip dhcp snooping trust
 exit

LAN Security - Dynamic ARP Inspection:
ip arp inspection vlan 10,20,30,40,99

interface FastEthernet0/24
 ip arp inspection trust
 exit

interface Port-channel 1
 ip arp inspection trust

interface range FastEthernet0/1-3
 switchport port-security
 switchport port-security maximum 2
 switchport port-security violation restrict
 switchport port-security mac-address sticky

interface range FastEthernet0/4-20
 switchport mode access
 switchport access vlan 999
 shutdown

copy running-config startup-config

================================================================================
STEP 4: CONFIGURE SWITCH1 (SECONDARY SWITCH)
================================================================================

NOTE: You must be in privileged EXEC mode (Switch1#). Enter configuration mode first:

configure terminal
hostname Switch1
enable secret class
service password-encryption
banner motd ^C
WARNING: Authorized Access Only!
Unauthorized access is prohibited!
^C

line con 0
 password cisco
 login
 exec-timeout 5 0
 logging synchronous

line vty 0 4
 password cisco
 login
 exec-timeout 5 0
 transport input ssh
 login local

username admin privilege 15 secret admin123
ip domain-name cisco.com
crypto key generate rsa general-keys modulus 2048

vlan 10
 name Classroom
vlan 20
 name Office
vlan 30
 name VLAN30
vlan 40
 name VLAN40
vlan 99
 name Management
vlan 999
 name Unused_Ports

interface vlan 99
 ip address 192.168.1.67 255.255.255.248
 no shutdown
 ip default-gateway 192.168.1.65

interface FastEthernet0/1
 description PC3 - VLAN 30
 switchport mode access
 switchport access vlan 30
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
 exit

interface FastEthernet0/2
 description PC4 - VLAN 40
 switchport mode access
 switchport access vlan 40
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown

interface FastEthernet0/24
 description Trunk to Router0
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
 no shutdown
 exit

interface FastEthernet0/21
 description Trunk to Switch0 - EtherChannel Member 1
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
 channel-group 1 mode desirable
 no shutdown
 exit

interface FastEthernet0/22
 description Trunk to Switch0 - EtherChannel Member 2
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
 channel-group 1 mode desirable
 no shutdown
 exit

interface FastEthernet0/23
 description Trunk to Switch0 - EtherChannel Member 3
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
 channel-group 1 mode desirable
 no shutdown
 exit

interface Port-channel 1
 description EtherChannel to Switch0 (Fa0/21, Fa0/22, Fa0/23)
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
 no shutdown
 exit

NOTE: EtherChannel uses three physical ports (Fa0/21, Fa0/22, Fa0/23) bundled together
to create a single logical link. This provides:
- Increased bandwidth (3x the speed of a single port)
- Load balancing across all three links
- Redundancy (if one or two links fail, traffic continues on remaining links)
- The three physical ports appear as one logical Port-channel 1 interface

spanning-tree mode rapid-pvst
spanning-tree vlan 1 priority 8192
spanning-tree vlan 10 priority 8192
spanning-tree vlan 20 priority 8192
spanning-tree vlan 30 priority 8192
spanning-tree vlan 40 priority 8192
spanning-tree vlan 99 priority 8192

ip dhcp snooping
ip dhcp snooping vlan 10,20,30,40,99

interface FastEthernet0/24
 ip dhcp snooping trust

interface Port-channel 1
 ip dhcp snooping trust
 exit

LAN Security - Dynamic ARP Inspection:
ip arp inspection vlan 10,20,30,40,99

interface FastEthernet0/24
 ip arp inspection trust
 exit

interface Port-channel 1
 ip arp inspection trust
 exit

interface range FastEthernet0/1-2
 switchport port-security
 switchport port-security maximum 2
 switchport port-security violation restrict
 switchport port-security mac-address sticky
 exit

interface range FastEthernet0/3-20
 switchport mode access
 switchport access vlan 999
 shutdown

copy running-config startup-config

================================================================================
STEP 5: CONFIGURE WIRELESS ROUTER (GUI CONFIGURATION)
================================================================================

NOTE: The HomeRouter-PT-AC uses a web-based GUI interface, not CLI commands.
Access the router's web interface through a browser to configure it.

ACCESSING THE WIRELESS ROUTER GUI:

1. Connect a PC to the wireless router's LAN port (GigabitEthernet0/2)
2. Open a web browser (Chrome, Firefox, Edge, etc.)
3. Navigate to the default IP address:
   - Usually http://192.168.1.1 or http://192.168.0.1
   - Check the device label or documentation for the default IP
4. Log in with default credentials:
   - Username: admin (or check device documentation)
   - Password: admin (or check device documentation)

CONFIGURATION STEPS IN GUI:

1. CHANGE ADMIN PASSWORD:
   - Navigate to: Administration > System Settings > Change Password
   - Change the admin password to: NewAdminPassword123
   - Click Save or Apply

2. CONFIGURE WAN INTERFACE (GigabitEthernet0/1):
   - Navigate to: Network > WAN Settings or Internet Settings
   - Connection Type: Static IP
   - WAN IP Address: 192.168.50.4
   - Subnet Mask: 255.255.255.0
   - Default Gateway: 192.168.50.3
   - Click Save or Apply

3. CONFIGURE LAN INTERFACE (GigabitEthernet0/2):
   - Navigate to: Network > LAN Settings or Local Network
   - LAN IP Address: 192.168.200.1
   - Subnet Mask: 255.255.255.0
   - Click Save or Apply
   - Note: You may need to reconnect to the new IP address after saving

4. CONFIGURE WIRELESS SETTINGS:
   - Navigate to: Wireless > Basic Settings or Wi-Fi Settings
   - Enable Wireless: Yes/Enabled
   - SSID (Network Name): GuestAccess
   - Wireless Channel: 6
   - Enable Guest Network: Yes (if available)
   - Click Save or Apply

5. CONFIGURE WIRELESS SECURITY:
   - Navigate to: Wireless > Security Settings or Wi-Fi Security
   - Security Mode: WPA2-PSK or WPA2-Personal
   - Passphrase/Password: WirelessPassword123
   - Click Save or Apply

6. CONFIGURE MAC ADDRESS FILTERING:
   - Navigate to: Wireless > MAC Filtering or Access Control
   - Enable MAC Address Filtering: Yes/Enabled
   - Filter Mode: Allow only listed devices (Whitelist)
   - Add allowed MAC addresses:
     * 00:00:00:00:00:01 (for Laptop)
     * 00:00:00:00:00:02 (for Iphone)
   - Click Save or Apply

7. CONFIGURE DHCP SERVER:
   - Navigate to: Network > DHCP Settings or LAN DHCP
   - Enable DHCP Server: Yes/Enabled
   - DHCP IP Range Start: 192.168.200.2
   - DHCP IP Range End: 192.168.200.254
   - Default Gateway: 192.168.200.1
   - Primary DNS Server: 8.8.8.8
   - Click Save or Apply

8. CONFIGURE STATIC ROUTES:
   - Navigate to: Network > Routing or Static Routes
   - Add Static Route 1:
     * Destination Network: 192.168.1.0
     * Subnet Mask: 255.255.255.0
     * Gateway: 192.168.50.3
   - Add Static Route 2:
     * Destination Network: 192.168.50.0
     * Subnet Mask: 255.255.255.0
     * Gateway: 192.168.50.3
   - Click Save or Apply for each route

9. SAVE AND REBOOT:
   - Click Save All or Apply All Settings
   - Reboot the router if prompted
   - Wait for the router to restart

VERIFICATION:

After configuration, verify the following settings:
- WAN IP: 192.168.50.4
- LAN IP: 192.168.200.1
- Wireless SSID: GuestAccess
- Wireless Channel: 6
- Security: WPA2-PSK
- DHCP enabled for 192.168.200.0/24 network
- Static routes configured

NOTE: Menu names may vary slightly depending on the router firmware version.
Look for similar menu options if the exact names don't match.

================================================================================
STEP 6: VERIFICATION COMMANDS
================================================================================

ROUTER0 VERIFICATION:

Check interface status:
show ip interface brief
show ipv6 interface brief

Check routing table:
show ip route
show ipv6 route

Check DHCP bindings:
show ip dhcp binding
show ipv6 dhcp binding

Check subinterfaces:
show interfaces trunk
show ip interface
show interfaces GigabitEthernet0/0/0.10

ROUTER1 VERIFICATION:

Check interface status:
show ip interface brief

Check routing table:
show ip route

SWITCH0 VERIFICATION:

Check VLANs:
show vlan
show vlan brief

Check trunk ports:
show interfaces trunk
show interfaces trunk detail

Check STP status:
show spanning-tree
show spanning-tree summary
show spanning-tree root

Check EtherChannel:
show etherchannel summary
show interfaces port-channel

Check security features:
show ip dhcp snooping
show ip arp inspection
show port-security
show port-security address

SWITCH1 VERIFICATION:

Same commands as Switch0

WIRELESS ROUTER VERIFICATION:

Check wireless status:
show wireless
show wireless ssid
show wireless security

Check DHCP bindings:
show ip dhcp binding

Check routing:
show ip route

================================================================================
STEP 7: TESTING PROCEDURES
================================================================================

TEST 1: Inter-VLAN Routing

From PC1 (VLAN 10), ping PC2 (VLAN 20):
ping 192.168.1.50

From PC3 (VLAN 30), ping PC4 (VLAN 40):
ping 192.168.1.58

From any PC, ping IT_PC (VLAN 99):
ping 192.168.1.68

TEST 2: DHCPv4 Assignment

On each PC, configure to obtain IP via DHCP:
Windows: ipconfig /release then ipconfig /renew
Linux: dhclient -r then dhclient

Verify IP assignment matches addressing table
Verify DNS server is 8.8.8.8
Verify domain name is yahooyahoo.com

TEST 3: DHCPv6 Assignment

Enable IPv6 on PCs
Verify IPv6 address assignment from correct pool
Test IPv6 connectivity:
ping6 2001:db8:acad:10::1

TEST 4: Wireless Connectivity

Connect Laptop to wireless network (SSID: GuestAccess)
Connect Iphone to wireless network
Test connectivity to VLAN networks:
ping 192.168.1.33

TEST 5: Static Routing

From any VLAN PC, ping wireless network:
ping 192.168.200.1

From wireless device, ping VLAN network:
ping 192.168.1.33

From any VLAN PC, ping Router1:
ping 192.168.50.2

TEST 6: STP Root Bridge

Verify Switch0 is root bridge:
show spanning-tree root

Verify EtherChannel is active:
show etherchannel summary

TEST 7: Security Features

Verify DHCP Snooping is active:
show ip dhcp snooping

Verify Port Security is working:
show port-security address

Test BPDU Guard by disconnecting and reconnecting a device

================================================================================
HOW TO RESET ROUTERS AND SWITCHES TO FACTORY DEFAULTS
================================================================================

RESETTING A CISCO ROUTER (ISR4331):

Method 1: Using ROMmon Mode (Complete Reset)

1. Power cycle the router
2. During boot, press Ctrl+Break or Ctrl+C to enter ROMmon mode
3. You should see: rommon 1 >
4. Type the following commands:
   rommon 1 > confreg 0x2142
   rommon 2 > reset
5. Router will boot without loading startup-config
6. Skip initial configuration dialog
7. Enter privileged EXEC mode:
   Router> enable
8. Restore configuration register:
   Router# configure terminal
   Router(config)# config-register 0x2102
   Router(config)# exit
9. Erase startup-config:
   Router# erase startup-config
10. Reload the router:
   Router# reload
11. Router will boot with factory defaults

Method 2: Erase Configuration Files

Router# erase startup-config
Router# delete vlan.dat
Router# reload

RESETTING A CISCO SWITCH (2960-24TT):

Method 1: Erase Configuration Files

Switch# erase startup-config
Switch# delete vlan.dat
Switch# reload

Method 2: Complete Reset via ROMmon (if needed)

1. Power cycle the switch
2. During boot, press and hold the Mode button (physical button on switch)
3. Continue holding until the SYST LED turns amber, then release
4. Switch will boot with factory defaults

Method 3: Using CLI Commands

Switch# write erase
Switch# delete flash:vlan.dat
Switch# reload

After reload, the switch will prompt for initial configuration.
Press Enter to skip and start with factory defaults.

VERIFICATION AFTER RESET:

Router/Switch> show version
Router/Switch> show startup-config
Router/Switch> show vlan

All should show default/empty configurations.

IMPORTANT NOTES:

- Resetting will erase ALL configurations
- You will need to reconfigure everything from scratch
- Make sure you have backups if you need to restore later
- After reset, devices will have default hostnames (Router, Switch)
- Default passwords are usually empty or "cisco"
- You may need to set up basic connectivity before accessing via network

================================================================================
TROUBLESHOOTING COMMON ISSUES
================================================================================

ISSUE: Native VLAN Mismatch Error

Error Message:
%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on FastEthernet0/21 (99), with Switch FastEthernet0/21 (1).

Solution:
This error occurs when two switches have different native VLANs configured on their trunk ports.
Both switches must have the same native VLAN on all EtherChannel member ports and Port-channel.

On Switch1, verify and configure:

configure terminal

interface FastEthernet0/21
 switchport trunk native vlan 99
 exit

interface FastEthernet0/22
 switchport trunk native vlan 99
 exit

interface FastEthernet0/23
 switchport trunk native vlan 99
 exit

interface Port-channel 1
 switchport trunk native vlan 99
 exit

copy running-config startup-config

Verify the configuration:
show interfaces trunk
show interfaces FastEthernet0/21 switchport
show interfaces Port-channel 1 switchport

Both switches should show native VLAN 99 on all trunk ports.

ISSUE: Cannot Enter Interface Configuration Mode

Error: % Invalid input detected at '^' marker.

Solution:
You must be in global configuration mode first. Enter:
configure terminal
(or conf t)

Then enter interface configuration mode:
interface FastEthernet0/1

ISSUE: Serial Interface Not Available

Error: % Invalid input detected at '^' marker on Serial0/0/0

Solution:
Check available serial interfaces:
show ip interface brief

Use the correct interface number (e.g., Serial0/1/0 instead of Serial0/0/0)

ISSUE: EtherChannel Not Forming

Solution:
Verify both switches have:
- Same native VLAN (99)
- Same allowed VLANs (10,20,30,40,99)
- Same PagP mode (desirable)
- Ports in trunk mode

Check status:
show etherchannel summary
show interfaces port-channel

================================================================================
IP ADDRESSING SUMMARY
================================================================================

VLAN 10: 192.168.1.32/28 (Gateway: 192.168.1.33)
VLAN 20: 192.168.1.48/29 (Gateway: 192.168.1.49)
VLAN 30: 192.168.1.0/27 (Gateway: 192.168.1.1)
VLAN 40: 192.168.1.56/29 (Gateway: 192.168.1.57)
VLAN 99: 192.168.1.64/29 (Gateway: 192.168.1.65)
  Router0 G0/0/0.99: 192.168.1.65/29
  Switch0 SVI: 192.168.1.66/29
  Switch1 SVI: 192.168.1.67/29
  IT_PC: 192.168.1.68/29
WAN Link: 192.168.50.0/24
  Router0 G0/0/1: 192.168.50.1/24
  Router1 G0/0/0: 192.168.50.2/24
  Router1 G0/0/1: 192.168.50.3/24
  Wireless Router G0/0: 192.168.50.4/24
Wireless Network: 192.168.200.0/24

IPv6 Networks:
VLAN 10: 2001:db8:acad:10::/64
VLAN 20: 2001:db8:acad:20::/64
VLAN 30: 2001:db8:acad:30::/64
VLAN 40: 2001:db8:acad:40::/64

================================================================================
END OF CONFIGURATION GUIDE
================================================================================


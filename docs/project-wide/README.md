# Networking Project - Complete Configuration Package

This project contains all configuration files and documentation for a comprehensive network setup with router-on-a-stick inter-VLAN routing, VLSM addressing, DHCP servers, STP, EtherChannel, and wireless connectivity.

## 📁 Files Included

### Configuration Files
- **Router0_Configuration.txt** - Router-on-a-stick configuration with DHCPv4/v6
- **Router1_Configuration.txt** - WAN router configuration
- **Switch0_Configuration.txt** - Main switch with VLANs 10, 20, 99
- **Switch1_Configuration.txt** - Secondary switch with VLANs 30, 40
- **Wireless_Router_Configuration.txt** - Wireless access point configuration

### Documentation
- **VLSM_IP_Addressing_Table.md** - Complete IP addressing scheme
- **COMPREHENSIVE_CONFIGURATION_GUIDE.md** - Step-by-step setup guide
- **QUICK_REFERENCE.md** - Quick command reference

## 🚀 Quick Start

1. **Review the IP Addressing Table** (`VLSM_IP_Addressing_Table.md`)
2. **Follow the Configuration Guide** (`COMPREHENSIVE_CONFIGURATION_GUIDE.md`)
3. **Apply configurations in this order:**
   - Router0
   - Router1
   - Switch0
   - Switch1
   - Wireless Router

## 📋 Configuration Checklist

### Basic Device Configuration
- [x] Hostname
- [x] Console password
- [x] Privileged exec password
- [x] Banner MoTD
- [x] Password encryption
- [x] Exec timeout
- [x] SSH configuration
- [x] Password minimum length

### VLAN and InterVLAN Routing
- [x] Create VLANs (10, 20, 30, 40, 99)
- [x] Configure access ports
- [x] Configure trunking ports
- [x] Allow only active VLAN traffic
- [x] Router-on-a-stick configuration

### DHCP Servers
- [x] DHCPv4 server configuration
- [x] Exclude gateway/HSRP addresses
- [x] DNS: 8.8.8.8
- [x] Domain: yahooyahoo.com
- [x] Stateful DHCPv6 server

### STP and EtherChannel
- [x] Rapid PVST+ mode
- [x] Switch priority configuration (root bridge)
- [x] Link aggregation (EtherChannel)

### LAN Security
- [x] ARP Spoofing protection (DAI)
- [x] DHCP Snooping
- [x] Unused ports to VLAN and disabled
- [x] Sticky MAC address
- [x] BPDU Guard

### Wireless Configuration
- [x] SSID configuration
- [x] Wireless channel 6
- [x] Guest access enabled
- [x] Wireless security mode (WPA2)
- [x] MAC address filtering
- [x] Admin password changed
- [x] LAN IP changed

### Static Routing
- [x] Route to 192.168.200.0/24 from all VLANs

## 🔍 Key Features

- **VLSM Subnetting**: Efficient IP address allocation
- **Router-on-a-Stick**: Single router interface for inter-VLAN routing
- **Dual Stack**: IPv4 and IPv6 support
- **DHCP**: Both v4 and v6 stateful DHCP
- **STP**: Rapid PVST+ with root bridge election
- **EtherChannel**: Link aggregation between switches
- **Security**: Multiple layers of LAN security
- **Wireless**: Secure wireless access with MAC filtering

## 📊 Network Topology

```
Router0 (Router-on-a-Stick)
├── Switch0
│   ├── IT_PC (VLAN 99)
│   ├── PC1 (VLAN 10)
│   └── PC2 (VLAN 20)
└── Switch1
    ├── PC3 (VLAN 30)
    └── PC4 (VLAN 40)
└── Router1 (WAN)
    └── Wireless Router
        ├── Laptop
        └── Iphone
```

## 🛠️ Testing

After configuration, test:
1. Inter-VLAN connectivity
2. DHCP assignment (v4 and v6)
3. Wireless connectivity
4. Routing to wireless network
5. STP root bridge election
6. EtherChannel status
7. Security features

## 📝 Notes

- All passwords should be changed in production
- Verify configurations before saving
- Test each feature individually
- Keep backups of configurations
- Document any custom changes

## 📚 Additional Resources

- See `COMPREHENSIVE_CONFIGURATION_GUIDE.md` for detailed steps
- See `QUICK_REFERENCE.md` for command reference
- See `VLSM_IP_Addressing_Table.md` for IP addressing details


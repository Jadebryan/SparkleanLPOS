# Comprehensive Network Configuration Guide

## Table of Contents
1. [Overview](#overview)
2. [Network Topology](#network-topology)
3. [IP Addressing Scheme](#ip-addressing-scheme)
4. [Configuration Steps](#configuration-steps)
5. [Verification Commands](#verification-commands)
6. [Troubleshooting](#troubleshooting)

## Overview

This project implements a complete network infrastructure with:
- **Router-on-a-Stick** inter-VLAN routing
- **VLSM** IP addressing
- **DHCPv4 and DHCPv6** servers
- **Rapid PVST+** spanning tree protocol
- **EtherChannel** link aggregation
- **Wireless LAN** with security
- **LAN Security** features (DHCP Snooping, DAI, Port Security)

## Network Topology

```
Router0 (ISR4331) - Router-on-a-Stick
    ├── Switch0 (2960-24TT)
    │   ├── IT_PC (VLAN 99)
    │   ├── PC1 (VLAN 10)
    │   └── PC2 (VLAN 20)
    └── Switch1 (2960-24TT)
        ├── PC3 (VLAN 30)
        └── PC4 (VLAN 40)
    └── Router1 (ISR4331) - WAN
        └── Wireless Router
            ├── Laptop (Wireless)
            └── Iphone (Wireless)
```

## IP Addressing Scheme

See `VLSM_IP_Addressing_Table.md` for complete addressing details.

### IPv4 Summary
- **VLAN 10**: 192.168.1.32/28 (Gateway: 192.168.1.33)
- **VLAN 20**: 192.168.1.48/29 (Gateway: 192.168.1.49)
- **VLAN 30**: 192.168.1.0/27 (Gateway: 192.168.1.1)
- **VLAN 40**: 192.168.1.56/29 (Gateway: 192.168.1.57)
- **VLAN 99**: 192.168.1.64/30 (Gateway: 192.168.1.65)
- **WAN Link**: 192.168.1.68/30
- **Router1-Wireless**: 192.168.50.0/24
- **Wireless Network**: 192.168.200.0/24

### IPv6 Summary
- **VLAN 10**: 2001:db8:acad:10::/64
- **VLAN 20**: 2001:db8:acad:20::/64
- **VLAN 30**: 2001:db8:acad:30::/64
- **VLAN 40**: 2001:db8:acad:40::/64

## Configuration Steps

### Step 1: Configure Router0 (Router-on-a-Stick)

1. **Basic Configuration**
   ```cisco
   hostname Router0
   enable secret class
   service password-encryption
   ```

2. **Configure Subinterfaces**
   - G0/0/0.10 for VLAN 10
   - G0/0/0.20 for VLAN 20
   - G0/0/0.30 for VLAN 30
   - G0/0/0.40 for VLAN 40
   - G0/0/0.99 for VLAN 99 (native)

3. **Configure DHCPv4 Servers**
   - Exclude gateway addresses
   - Use 8.8.8.8 for DNS
   - Domain: yahooyahoo.com

4. **Configure DHCPv6 Servers (Stateful)**
   - Configure pools for each VLAN
   - Enable on subinterfaces

5. **Configure Static Routes**
   - Route to 192.168.200.0/24 via Router1

### Step 2: Configure Router1

1. **Basic Configuration** (same as Router0)
2. **Configure WAN Interface** (G0/0/0)
3. **Configure Interface to Wireless Router** (G0/0/1)
4. **Configure Static Routes** back to VLAN networks

### Step 3: Configure Switch0

1. **Create VLANs** (10, 20, 30, 40, 99)
2. **Configure Management SVI** (VLAN 99)
3. **Configure Access Ports**
   - Fa0/1: IT_PC (VLAN 99)
   - Fa0/2: PC1 (VLAN 10)
   - Fa0/3: PC2 (VLAN 20)
4. **Configure Trunk to Router0** (Fa0/24)
5. **Configure EtherChannel to Switch1** (Fa0/23)
6. **Configure STP** (Rapid PVST+, make root bridge)
7. **Configure Security Features**
   - DHCP Snooping
   - Dynamic ARP Inspection
   - Port Security (Sticky MAC)
   - BPDU Guard
8. **Disable Unused Ports** (assign to VLAN 999)

### Step 4: Configure Switch1

1. **Create VLANs** (same as Switch0)
2. **Configure Management SVI** (VLAN 99)
3. **Configure Access Ports**
   - Fa0/1: PC3 (VLAN 30)
   - Fa0/2: PC4 (VLAN 40)
4. **Configure Trunk to Router0** (Fa0/24)
5. **Configure EtherChannel to Switch0** (Fa0/23)
6. **Configure STP** (Rapid PVST+, secondary priority)
7. **Configure Security Features** (same as Switch0)
8. **Disable Unused Ports**

### Step 5: Configure Wireless Router

1. **Configure WAN Interface** (192.168.50.2)
2. **Configure LAN Interface** (192.168.200.1)
3. **Configure Wireless**
   - SSID: GuestAccess
   - Channel: 6
   - Security: WPA2
4. **Configure MAC Address Filtering**
5. **Change Admin Password**
6. **Configure DHCP Pool** for wireless clients
7. **Configure Static Routes**

## Verification Commands

### Router Verification

```cisco
! Verify interfaces
show ip interface brief
show ipv6 interface brief

! Verify routing
show ip route
show ipv6 route

! Verify DHCP
show ip dhcp binding
show ipv6 dhcp binding

! Verify subinterfaces
show interfaces trunk
show ip interface
```

### Switch Verification

```cisco
! Verify VLANs
show vlan
show vlan brief

! Verify trunk ports
show interfaces trunk
show interfaces switchport

! Verify STP
show spanning-tree
show spanning-tree summary
show spanning-tree root

! Verify EtherChannel
show etherchannel summary
show interfaces port-channel

! Verify Security
show ip dhcp snooping
show ip arp inspection
show port-security
show port-security address
```

### Wireless Router Verification

```cisco
! Verify wireless
show wireless
show wireless ssid
show wireless security

! Verify DHCP
show ip dhcp binding

! Verify routing
show ip route
```

## Testing Procedures

### 1. Test Inter-VLAN Routing
- From PC1 (VLAN 10), ping PC2 (VLAN 20)
- From PC3 (VLAN 30), ping PC4 (VLAN 40)
- From any PC, ping IT_PC (VLAN 99)

### 2. Test DHCPv4
- Configure PCs to obtain IP via DHCP
- Verify IP assignment matches addressing table
- Verify DNS and domain name

### 3. Test DHCPv6
- Enable IPv6 on PCs
- Verify IPv6 address assignment
- Test IPv6 connectivity

### 4. Test Wireless Connectivity
- Connect Laptop to wireless network
- Connect Iphone to wireless network
- Test connectivity to VLAN networks

### 5. Test Static Routing
- From any VLAN, ping 192.168.200.0/24 network
- Verify routing table entries

### 6. Test STP
- Verify Switch0 is root bridge
- Verify EtherChannel is active
- Test link failure recovery

### 7. Test Security Features
- Verify DHCP Snooping is active
- Verify Port Security is working
- Test BPDU Guard (disconnect/reconnect)

## Troubleshooting

### Issue: Cannot ping between VLANs
**Solution:**
- Verify router subinterfaces are up
- Check trunk configuration on switches
- Verify routing table on router
- Check access VLAN assignments

### Issue: DHCP not working
**Solution:**
- Verify DHCP pools are configured
- Check excluded addresses
- Verify DHCP Snooping trusted ports
- Check interface status

### Issue: STP not converging
**Solution:**
- Verify Rapid PVST+ is enabled
- Check bridge priorities
- Verify root bridge election
- Check for loops

### Issue: EtherChannel not working
**Solution:**
- Verify PagP mode (desirable/auto)
- Check trunk configuration matches
- Verify both ports are in channel-group
- Check for port-channel interface

### Issue: Wireless devices cannot connect
**Solution:**
- Verify SSID configuration
- Check wireless security settings
- Verify MAC address filtering
- Check DHCP pool configuration

## Configuration Files

All configuration files are provided:
- `Router0_Configuration.txt`
- `Router1_Configuration.txt`
- `Switch0_Configuration.txt`
- `Switch1_Configuration.txt`
- `Wireless_Router_Configuration.txt`
- `VLSM_IP_Addressing_Table.md`

## Notes

1. **Passwords**: Change all default passwords in production
2. **SSH**: Ensure SSH is configured before disabling Telnet
3. **Backup**: Save configurations regularly
4. **Documentation**: Update addressing table if changes are made
5. **Testing**: Test each feature individually before full deployment

## Security Best Practices Implemented

✅ Password encryption
✅ SSH access only
✅ Exec timeout
✅ Banner messages
✅ DHCP Snooping
✅ Dynamic ARP Inspection
✅ Port Security with Sticky MAC
✅ BPDU Guard
✅ Unused port shutdown
✅ WPA2 wireless security
✅ MAC address filtering


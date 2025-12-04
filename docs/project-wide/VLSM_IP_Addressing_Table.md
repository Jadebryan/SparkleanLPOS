# VLSM IP Addressing Table

## Base Network: 192.168.1.0/24

### Host Requirements Analysis

| VLAN/Network | Required Hosts | Host Bits Needed | Subnet Mask | Network Address | Usable Range | Gateway | Broadcast |
|-------------|----------------|------------------|-------------|----------------|--------------|---------|----------|
| VLAN 30 | 16 hosts | 5 bits (32-2=30) | /27 | 192.168.1.0 | 192.168.1.1 - 192.168.1.30 | 192.168.1.1 | 192.168.1.31 |
| VLAN 10 | 10 hosts | 4 bits (16-2=14) | /28 | 192.168.1.32 | 192.168.1.33 - 192.168.1.46 | 192.168.1.33 | 192.168.1.47 |
| VLAN 20 | 6 hosts | 3 bits (8-2=6) | /29 | 192.168.1.48 | 192.168.1.49 - 192.168.1.54 | 192.168.1.49 | 192.168.1.55 |
| VLAN 40 | 4 hosts | 3 bits (8-2=6) | /29 | 192.168.1.56 | 192.168.1.57 - 192.168.1.62 | 192.168.1.57 | 192.168.1.63 |
| VLAN 99 | 2 hosts | 3 bits (8-2=6) | /29 | 192.168.1.64 | 192.168.1.65 - 192.168.1.70 | 192.168.1.65 | 192.168.1.71 |
| WANLINK | 2 hosts | 2 bits (4-2=2) | /30 | 192.168.1.72 | 192.168.1.73 - 192.168.1.74 | 192.168.1.73 | 192.168.1.75 |

### Remaining Address Space
- 192.168.1.76 - 192.168.1.255 (Available for future use)

## IPv6 Addressing (Already Provided)

| VLAN | IPv6 Network | IPv6 Gateway |
|------|--------------|--------------|
| VLAN 10 | 2001:db8:acad:10::/64 | 2001:db8:acad:10::1 |
| VLAN 20 | 2001:db8:acad:20::/64 | 2001:db8:acad:20::1 |
| VLAN 30 | 2001:db8:acad:30::/64 | 2001:db8:acad:30::1 |
| VLAN 40 | 2001:db8:acad:40::/64 | 2001:db8:acad:40::1 |

## Device IP Assignment

### Router0 (ISR4331)
- G0/0/0.10 (VLAN 10): 192.168.1.33/28
- G0/0/0.20 (VLAN 20): 192.168.1.49/29
- G0/0/0.30 (VLAN 30): 192.168.1.1/27
- G0/0/0.40 (VLAN 40): 192.168.1.57/29
- G0/0/0.99 (VLAN 99): 192.168.1.65/29
- Serial0/1/0 (WAN to Router1): 192.168.50.1/24

### Router1 (ISR4331)
- Serial0/1/0 (WAN from Router0): 192.168.50.2/24
- G0/0/1 (to Wireless Router): 192.168.50.3/24

### Wireless Router (HomeRouter-PT-AC)
- LAN IP: 192.168.200.1/24
- WAN IP: 192.168.50.4/24

### End Devices
- IT_PC (VLAN 99): 192.168.1.68/29 (Gateway: 192.168.1.65)
- Switch0 SVI (VLAN 99): 192.168.1.66/29
- Switch1 SVI (VLAN 99): 192.168.1.67/29
- PC1 (VLAN 10): 192.168.1.34/28 (Gateway: 192.168.1.33)
- PC2 (VLAN 20): 192.168.1.50/29 (Gateway: 192.168.1.49)
- PC3 (VLAN 30): 192.168.1.2/27 (Gateway: 192.168.1.1)
- PC4 (VLAN 40): 192.168.1.58/29 (Gateway: 192.168.1.57)
- Laptop (Wireless): 192.168.200.10/24 (Gateway: 192.168.200.1)
- Iphone (Wireless): 192.168.200.11/24 (Gateway: 192.168.200.1)


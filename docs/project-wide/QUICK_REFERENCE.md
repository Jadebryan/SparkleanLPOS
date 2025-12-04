# Quick Command Reference

## Router Commands

### Basic Configuration
```cisco
hostname Router0
enable secret class
service password-encryption
banner motd ^C Message ^C
```

### Interface Configuration
```cisco
interface GigabitEthernet0/0/0.10
 encapsulation dot1Q 10
 ip address 192.168.1.33 255.255.255.240
 ipv6 address 2001:db8:acad:10::1/64
 ipv6 enable
```

### DHCPv4 Configuration
```cisco
ip dhcp excluded-address 192.168.1.33 192.168.1.33
ip dhcp pool VLAN10_POOL
 network 192.168.1.32 255.255.255.240
 default-router 192.168.1.33
 dns-server 8.8.8.8
 domain-name yahooyahoo.com
```

### DHCPv6 Configuration
```cisco
ipv6 dhcp pool VLAN10_IPv6_POOL
 address prefix 2001:db8:acad:10::/64
 dns-server 2001:4860:4860::8888

interface GigabitEthernet0/0/0.10
 ipv6 dhcp server VLAN10_IPv6_POOL
```

### Static Routing
```cisco
ip route 192.168.200.0 255.255.255.0 192.168.1.70
```

### Verification
```cisco
show ip interface brief
show ipv6 interface brief
show ip route
show ip dhcp binding
show ipv6 dhcp binding
show interfaces trunk
```

## Switch Commands

### VLAN Configuration
```cisco
vlan 10
 name Classroom
```

### Access Port Configuration
```cisco
interface FastEthernet0/2
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 spanning-tree bpduguard enable
```

### Trunk Port Configuration
```cisco
interface FastEthernet0/24
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
```

### EtherChannel Configuration
```cisco
interface FastEthernet0/23
 switchport mode trunk
 channel-group 1 mode desirable

interface Port-channel 1
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,40,99
```

### STP Configuration
```cisco
spanning-tree mode rapid-pvst
spanning-tree vlan 10 priority 4096
```

### DHCP Snooping
```cisco
ip dhcp snooping
ip dhcp snooping vlan 10,20,30,40,99
interface FastEthernet0/24
 ip dhcp snooping trust
```

### Dynamic ARP Inspection
```cisco
ip arp inspection vlan 10,20,30,40,99
interface FastEthernet0/24
 ip arp inspection trust
```

### Port Security
```cisco
interface FastEthernet0/2
 switchport port-security
 switchport port-security maximum 2
 switchport port-security violation restrict
 switchport port-security mac-address sticky
```

### Disable Unused Ports
```cisco
interface range FastEthernet0/4-22
 switchport mode access
 switchport access vlan 999
 shutdown
```

### Verification
```cisco
show vlan
show vlan brief
show interfaces trunk
show spanning-tree
show spanning-tree summary
show spanning-tree root
show etherchannel summary
show ip dhcp snooping
show ip arp inspection
show port-security
show port-security address
```

## Wireless Router Commands

### Wireless Configuration
```cisco
wireless ssid GuestAccess
 authentication open
 guest-mode

interface Dot11Radio0
 ssid GuestAccess
 channel 6
```

### Wireless Security
```cisco
wireless security wpa-psk ascii 0 WirelessPassword123
```

### MAC Address Filtering
```cisco
wireless access-list 1 permit 0000.0000.0001
wireless access-list 1 deny any
```

### Verification
```cisco
show wireless
show wireless ssid
show wireless security
```

## Common Troubleshooting Commands

### Check Interface Status
```cisco
show ip interface brief
show interfaces status
```

### Check VLAN Assignment
```cisco
show vlan
show interfaces switchport
```

### Check Trunk Status
```cisco
show interfaces trunk
show interfaces trunk detail
```

### Check STP Status
```cisco
show spanning-tree
show spanning-tree root
show spanning-tree detail
```

### Check DHCP
```cisco
show ip dhcp binding
show ip dhcp pool
debug ip dhcp server events
```

### Check Routing
```cisco
show ip route
show ip route 192.168.200.0
traceroute 192.168.200.1
```

### Check Security
```cisco
show ip dhcp snooping
show ip arp inspection
show port-security
show port-security address
```

## Testing Commands

### From PC (Windows)
```cmd
ipconfig /all
ipconfig /release
ipconfig /renew
ping 192.168.1.33
ping 2001:db8:acad:10::1
tracert 192.168.200.1
```

### From PC (Linux/Mac)
```bash
ifconfig
dhclient -r
dhclient
ping 192.168.1.33
ping6 2001:db8:acad:10::1
traceroute 192.168.200.1
```

## Configuration Backup

```cisco
show running-config
copy running-config startup-config
copy running-config tftp://server/filename
```

## Useful Show Commands Summary

| Command | Purpose |
|---------|---------|
| `show ip interface brief` | Quick interface status |
| `show vlan brief` | VLAN summary |
| `show interfaces trunk` | Trunk port details |
| `show spanning-tree` | STP status |
| `show ip route` | Routing table |
| `show ip dhcp binding` | DHCP leases |
| `show etherchannel summary` | EtherChannel status |
| `show port-security` | Port security status |


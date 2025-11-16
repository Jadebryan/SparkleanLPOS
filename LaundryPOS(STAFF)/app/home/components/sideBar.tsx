import React from "react";
import { View, TouchableOpacity, Image, Alert } from "react-native";
import GlobalStyles from "../../styles/GlobalStyle";
import { useRouter, usePathname } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "@/constants/api";

// Define literal route types
type RouteLiteral =
  | "/home/orderList"
  | "/home/addOrder"
  | "/home/customer"
  | "/home/request";

const SideBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const routes: { icon: any; route: RouteLiteral }[] = [
    { icon: require("../../../assets/staffIcon/orders.png"), route: "/home/orderList" },
    { icon: require("../../../assets/staffIcon/addOrder.png"), route: "/home/addOrder" },
    { icon: require("../../../assets/staffIcon/customer.png"), route: "/home/customer" },
    { icon: require("../../../assets/staffIcon/request.png"), route: "/home/request" },
  ];

  const handleNavigation = (route: RouteLiteral) => {
    router.push(route);
  };

  // Async logout and navigate to login
  const logoutAndRedirect = async () => {
    try {
      // Call logout API to log the audit event
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (token) {
        try {
          await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (apiError) {
          // Log error but continue with logout even if API fails
          console.error('Logout API error (continuing with local logout):', apiError);
        }
      }
      
      // Remove all user session data
      await AsyncStorage.multiRemove(["token", "userToken", "user"]);
      
      // Navigate to login immediately after clearing storage
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still try to navigate even if storage clear fails
      router.replace("/login");
    }
  };

  // Show logout confirmation
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logoutAndRedirect },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={GlobalStyles.sideBars}>
      <View style={GlobalStyles.navAlignCenter}>
        <View style={GlobalStyles.NavLayout}>
          {/* Logo */}
          <View style={{ marginBottom: 40, marginTop: 15 }}>
            <Image
              source={require("../../../assets/logo/basketLogo.png")}
              style={GlobalStyles.logoSize}
            />
          </View>

          {/* Navigation icons */}
          <View style={GlobalStyles.navButtonsContainer}>
            {routes.map((item, index) => {
              const isActive = pathname === item.route;

              return (
                <TouchableOpacity
                  key={index}
                  style={GlobalStyles.navButton}
                  onPress={() => handleNavigation(item.route)}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isActive ? "#1E90FF" : "transparent",
                    }}
                  >
                    <Image
                      source={item.icon}
                      style={[
                        GlobalStyles.iconSize,
                        { tintColor: isActive ? "white" : "black" },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout icon */}
        <TouchableOpacity style={{ marginBottom: 5 }} onPress={handleLogout}>
          <Image
            source={require("../../../assets/staffIcon/logoutColored.png")}
            style={GlobalStyles.iconSize}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SideBar;

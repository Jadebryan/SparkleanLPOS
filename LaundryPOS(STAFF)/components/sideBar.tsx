import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import GlobalStyles from "../../../styles/GlobalStyle";
import { useRouter, usePathname } from "expo-router";

// Literal route types
type RouteLiteral =
  | "/home/orderList"
  | "/home/addOrder"
  | "/home/customer"
  | "/home/request";

const SideBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname(); // Current route path

  const routes: { icon: any; route: RouteLiteral }[] = [
    { icon: require("../../../assets/staffIcon/orders.png"), route: "/home/orderList" },
    { icon: require("../../../assets/staffIcon/addOrder.png"), route: "/home/addOrder" },
    { icon: require("../../../assets/staffIcon/customer.png"), route: "/home/customer" },
    { icon: require("../../../assets/staffIcon/request.png"), route: "/home/request" },
  ];

  const handleNavigation = (route: RouteLiteral) => {
    router.push(route);
  };

  return (
    <View style={GlobalStyles.sideBars}>
      <View style={GlobalStyles.navAlignCenter}>
        <View style={GlobalStyles.NavLayout}>
          {/* Logo */}
          <View style={{ marginBottom: 40, marginTop:15 }}> 
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
                      width: 42, // slightly smaller than before
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
        <TouchableOpacity style={{ marginBottom: 5 }}> 
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

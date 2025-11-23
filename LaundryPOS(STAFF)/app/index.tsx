import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        // Check for user data (preferred) or token as fallback
        const user = await AsyncStorage.getItem("user");
        const token = await AsyncStorage.getItem("token") || await AsyncStorage.getItem("userToken");
        setIsLoggedIn(!!user || !!token); // true if user data or token exists
      } catch (error) {
        console.error("Error reading token:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkLogin();
  }, []);

  if (isLoading) {
    return null; // or a loading spinner
  }

  // Redirect based on login state
  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  } else {
    return <Redirect href="/home/orderList" />;
  }
}

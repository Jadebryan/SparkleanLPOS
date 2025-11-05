import React from 'react';
import { View } from 'react-native';
import GlobalStyles from '../styles/GlobalStyle';
import ModernSidebar from './components/ModernSidebar';
import Header from './components/Header';
import AddOrderForm from './addOrderComponents/addOrderForm';

export default function AddOrder() {
  return (
    <View style={GlobalStyles.mainLayout}>
      {/* Modern Sidebar */}
      <ModernSidebar />

      {/* MAIN CONTENT */}
      <View style={GlobalStyles.mainContent}>
        {/* Modern Header */}
        <Header title="Create Order" />

        {/* Add New Order Form */}
          <AddOrderForm />
      </View>
    </View>
  );
}

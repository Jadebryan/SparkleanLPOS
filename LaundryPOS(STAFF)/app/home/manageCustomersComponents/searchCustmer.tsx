import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import manageCustomerStyles from "./manageCustomerStyles";

type SearchCustomerProps = {
  onSearch: (searchTerm: string) => void;
};

const SearchCustomer: React.FC<SearchCustomerProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Debounced search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      onSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  return (
    <View style={manageCustomerStyles.SearchBar}>
      <TextInput
        placeholder="Search Customer Name"
        placeholderTextColor="#8b8b8b"
        style={manageCustomerStyles.searchInput}
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      {/* Optional manual search button */}
      <TouchableOpacity
        style={manageCustomerStyles.searchButton}
        onPress={() => onSearch(searchTerm.trim())}
      >
        <Text style={manageCustomerStyles.searchButtonText}>Search</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SearchCustomer;

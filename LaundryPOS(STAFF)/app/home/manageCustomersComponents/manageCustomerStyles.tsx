import { StyleSheet } from "react-native";

const manageCustomerStyles = StyleSheet.create({
  // Table Styles
  Table: {
    marginTop: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",

    // ✨ Glossy shadow effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,

    // Adds slight brightness for glossy feel
    backgroundColor: "rgba(255, 255, 255, 0.98)",
  },
  TableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb", // light glossy gray header
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,

    // subtle header shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  HeaderText: {
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    fontSize: 14,
  },
  TableData: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  cell: {
    textAlign: "center",
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },

  // Action Buttons
  actionButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14,

    // soft blue glow
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  editButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14,

    // soft green glow
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14,

    // soft red glow
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },

  // Search Bar Styles
  SearchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 10,
    gap: 10,
    width: "100%",
    maxWidth: 550,
    flexShrink: 1,
  },

  searchInput: {
    flex: 1,
    backgroundColor: "#f8f9fb",
    borderRadius: 50,
    height: 40,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontFamily: "Roboto",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  searchButton: {
    backgroundColor: "#ee5f1d",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    borderRadius: 50,
    height: 40,
    shadowColor: "#ee5f1d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontFamily: "Roboto",
    textShadowColor: "rgba(255, 255, 255, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Action Button Container
  actionButtonContainer: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default manageCustomerStyles;

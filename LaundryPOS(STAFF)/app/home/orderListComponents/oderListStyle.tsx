import { StyleSheet } from "react-native";

const orderListStyle = StyleSheet.create({
  // Modal and Container
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  modalBox: {
    width: "90%",
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 18,
    elevation: 5,
    paddingTop: 15,
  },

  // Header
  viewTransactionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#2e63c5",
  },
  closeButton: {
    alignItems: "flex-end",
    alignSelf: "flex-end",
    width: 25,
    height: 25,
  },
  closeIcon: {
    width: 25,
    height: 25,
    tintColor: "red",
  },

  // Layout Rows
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    
  },

  // Info Box
  infoBoxContainer: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 12,
    justifyContent: "center",

  },
  infoBoxLabel: {
    fontWeight: "bold",
    color: "#555",
  },
  infoBoxValue: {
    color: "#333",
    marginTop: 3,
  },

  // Picker / Dropdown Box
  pickerBoxContainer: {
    flex: 1,
    marginRight: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
  },
  pickerBoxLabel: {
    fontWeight: "bold",
    color: "#555",
    marginBottom: 4,
  },
  pickerBoxValue: {
    color: "#333",
    marginTop: 5,
  },

  // Dropdown Styles
  dropdown: {
    height: "100%",
    borderWidth: 0,
    borderRadius: 6,
    paddingHorizontal: 0,
  },
  dropdownPlaceholder: {
    color: "#aaa",
  },
  dropdownText: {
    color: "#333",
  },
  dropdownContainer: {
    borderRadius: 8,
    elevation: 5,
  },

  // Footer Buttons
  editButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "red",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 5,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "green",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 5,
  },
  updateButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  // Footer Info Section
  auditInfoContainer: {
    marginTop: 15,
  },
});

export default orderListStyle;

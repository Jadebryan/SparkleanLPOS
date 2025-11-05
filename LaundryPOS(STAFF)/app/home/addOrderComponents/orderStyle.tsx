import { StyleSheet } from "react-native";


const orderStyle = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "black",
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },

  customerNameLabel: {
    margin: 5,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 25,
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    marginRight: 8,
    color: "#5c5757ff",
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  CustomerNameinput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    marginRight: 60,
    color: "#5c5757ff",
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  textInput: {
    height: 42,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingLeft: 10,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  notesInput: {
    height: 110,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 5,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  button: {
    backgroundColor: "#ee5f1dff",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  createButton: {
    backgroundColor: "#ee5f1dff",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    width: 130,
    alignSelf: "flex-end",
  },

  createButtonText: {
    color: "white",
    textAlign: "center",
  },

  containerInputs: {
    padding: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  inputContainer: {
    flex: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 5,
  },

  label: {
    marginBottom: 5,
  },

  picker: {
    height: 42,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },

  orderSummaryContainer: {
    backgroundColor: "#f3f4f8ff",
    padding: 10,
    paddingTop: 0,
    borderRadius: 10,
    marginBottom: 15,
  },

  orderSummaryTitle: {
    color: "#2e63c5ff",
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 15,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  totalDueRow: {
    borderTopWidth: 1,
    borderTopColor: "gray",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  totalDueText: {
    fontWeight: "bold",
    fontSize: 16,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "#b3afafff",
    paddingTop: 4,
  },

  // 🔹 Dropdown Styles
  dropdown: {
    height: 42,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  dropdownList: {
    position: "absolute",
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  dropdownSelectedText: {
    color: "#3b3b3bff",
    fontWeight: "600",
    fontSize: 14,
  },

  dropdownPlaceholderText: {
    color: "#999",
    fontWeight: "400",
    fontSize: 14,
  },

  dropdownContainer: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  dropdownItemText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },

  dropdownItemSelected: {
    backgroundColor: "#2e63c5",
  },

  dropdownItemSelectedText: {
    color: "#fff",
    fontWeight: "600",
  },

  // 🔹 Unified Search Bar styles
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    marginTop: 10,
  },

  searchNameInput: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    height: 42,
    paddingHorizontal: 10,
    fontFamily: "Roboto",
    color: "#333",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  searchInput: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    height: 42,
    paddingHorizontal: 10,
    fontFamily: "Roboto",
    color: "#333",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  searchButton: {
    backgroundColor: "#ee5f1dff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 6,
    height: 36,
    flexShrink: 0,
  },

  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontFamily: "Roboto",
  },

  // ✅ NEW SECTION: "Services & Items" and "Dates" Layout
  detailsDatesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 20,
  },

  orderDetailsBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  datesBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  boxTitle: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
    color: "#2e63c5ff",
  },

  inputBox: {
    marginBottom: 10,
  },

  notesBox: {
    height: 140,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#fff",
    textAlignVertical: "top",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },










});

export default orderStyle;

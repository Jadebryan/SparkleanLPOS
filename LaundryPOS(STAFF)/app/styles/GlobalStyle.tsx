import { StyleSheet, Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

// ✅ Helpers
const wp = (percentage: number) => (width * percentage) / 100;
const hp = (percentage: number) => (height * percentage) / 100;

// ✅ Sidebar width: 10% for desktop, 12-15% for tablet, 18-20% for mobile
const sidebarWidth =
  width >= 1200 ? wp(5.5) : width >= 768 ? wp(8) : wp(12);

// ✅ Icon size: max 35px
const iconSize =
  width >= 1200 ? 30 : width >= 768 ? 25 : 22;

// ✅ Font size: responsive
const textFontSize =
  width >= 1200 ? 14 : width >= 768 ? 11 : 9;

// ✅ Button gap
const dynamicGap =
  width >= 1200 ? 18 : width >= 768 ? 16 : 12;

// ✅ Sidebar height for small screens
const sidebarPadding = hp(1);

export default StyleSheet.create({
  // Main layout (sidebar + content)
  mainLayout: {
    flex: 1,
    flexDirection: "row",
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6", // Modern gray background like admin
  },

  // Sidebar
  sideBars: {
    width: sidebarWidth,
    backgroundColor: "#FFFFFF",
    margin: wp(.5),
    borderRadius: 12,
    paddingVertical: sidebarPadding,
    alignItems: "center",
    justifyContent: "space-between",

    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },

  // Main content
  mainContent: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginVertical: hp(.7),
    marginRight: wp(.7),
    padding: wp(1),
    overflow: 'hidden',
  },

  // Sidebar internal
  navAlignCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },

  NavLayout: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 0, // no side padding
  },

  navButtonsContainer: {
    gap: dynamicGap,
    alignItems: "center",
  },

  navButton: {
    alignItems: "center",
    justifyContent: "center",
  },

  iconSize: {
    width: iconSize,
    height: iconSize,
    resizeMode: "contain",
  },

  logoSize: {
    width: iconSize * 1.6,
    height: iconSize * 1.6,
    resizeMode: "contain",
  },

  textDesign: {
    color: "black",
    fontSize: textFontSize,
    fontWeight: "bold",
    fontFamily: "Poppins_600SemiBold",
    marginTop: hp(3),
    textAlign: "center",
  },

  // header
 upperHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems:"center",
  padding: 10,
  backgroundColor: "rgba(255, 255, 255, 0.9)", // glossy white
  borderRadius: 12,
  marginBottom: 5,

  // Border to emphasize corners
  borderWidth: 1,
  borderColor: "rgba(243, 240, 240, 1)", // soft gray-white border for visibility

  // Soft shadow for depth
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 5, // Android shadow

  // Optional: subtle inner highlight to make it glossy
  overflow: "hidden",
},


  AccountButtonDesign:{
    flexDirection:"row",
    gap:6,
    alignItems:"center",
  },
  accountText:{
    fontFamily:'Poppins_500Medium',
    fontSize:12,
    fontWeight:"bold",
  },
  accountImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },




  // 🔹 Main container for all cards
  lowerHeader: {
    flexDirection: "row",
    flexWrap: "wrap", 
    justifyContent: "center",
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,

    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,

    gap: 12,
    width: "100%",
    alignSelf: "center",
  },

  // 🔹 Base Card (Enhanced with design system)
  cardSection: {
    backgroundColor: "#fff",
    borderRadius: 16, // Increased from 12 for modern look
    padding: 16, // Increased from 10 for better spacing
    borderWidth: 1,
    borderColor: "#E5E7EB", // Using design system color
    justifyContent: "space-between",

    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",

    minWidth: 200,
    maxWidth: "100%",

    // Enhanced Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // 🔹 Flex ratio helpers (2 : 2 : 1 layout)
  cardFlex2: {
    flex: 2, // expands more
    flexShrink: 1,
  },
  cardFlex1: {
  flex: 1,
  flexShrink: 2, // ✅ shrinks faster than others
  maxWidth: 220, // ✅ makes it smaller even before wrapping
  minWidth: 160, // ✅ optional, prevents too tiny size
},

  // 🔹 Make Generate Report shrink first
  cardShrinkFirst: {
    flexShrink: 3, // ✅ shrinks faster than others
  },

  // 🔹 Header text inside each card
  cardHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },

  // 🔹 Inline layout for statuses (Paid / Unpaid / etc.)
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 8,
  },

  statusItem: {
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: "#F9FAFB",
    flex: 1,
    minWidth: 50,
  },

  statusValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E88E5",
  },

  statusLabel: {
    fontSize: 11,
    color: "#666",
  },

  // 🔹 Report section
  generateReportText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    textAlign: "center",
  },

  exportButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    padding:5,
    flexWrap: "wrap", // ✅ wraps buttons if space is tight
  },

  uploadButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: "center",
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  uploadButtonText: {
    color: "#6A1B9A",
    fontWeight: "600",
    fontSize: 13,
  },

  
});

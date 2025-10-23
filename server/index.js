const express = require("express");
const cors = require("cors");
const ConnectDb = require("./configs/db");
const orderRoutes = require("./routes/OderRoutes");
const authRoutes = require("./routes/AuthRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);

// Connect DB and start server
ConnectDb().then(() => {
  const PORT = 5000;
  app.listen(PORT, () => console.log(`\n\nServer running on http://localhost:${PORT}\n\n`));
});

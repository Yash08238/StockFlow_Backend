const express = require("express");
const productRoutes = require("../routes/productRoutes");
const userRoutes = require("../routes/userRoutes");
const salesRoutes = require("../routes/salesRoutes");
const upload = require("../routes/uploadRoutes");
const reportRoutes = require("../routes/reportRoutes");
const notification = require("../routes/notificationRoutes");
const restockRoutes = require("../routes/restockRoutes");
const categoryRoutes = require("../routes/categoryRoutes");
const User = require("../routes/forgetPassRoutes");
const User2 = require("../routes/resetPassRoutes");

const app = express();
app.use(express.json());
app.use("/products", productRoutes);
app.use("/user", userRoutes);
app.use("/sales", salesRoutes);
app.use("/upload", upload);
app.use("/pass", User);
app.use("/pass", User2);
app.use("/notifications", notification);
app.use("/report", reportRoutes);
app.use("/restock", restockRoutes);
app.use("/categories", categoryRoutes);

module.exports = app;

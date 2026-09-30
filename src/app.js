const express = require("express");

const inventoryRoutes = require("./routes/inventory.routes");

const app = express();

app.use(express.json());

app.use("/api/inventory", inventoryRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Inventory API is running"
    });
});

module.exports = app;
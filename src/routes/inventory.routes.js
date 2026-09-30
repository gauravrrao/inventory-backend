const express = require("express");

const controller =
    require("../controllers/inventory.controller");

const router = express.Router();

router.post(
    "/products",
    controller.createProduct
);

router.get(
    "/products/:id",
    controller.getInventory
);

module.exports = router;
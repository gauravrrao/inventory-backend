const inventoryService = require("../services/inventory.service");

async function createProduct(req, res) {

    try {

        const {
            name,
            sku,
            price,
            quantity
        } = req.body;

        const product = await inventoryService.createProduct(
            name,
            sku,
            price,
            quantity
        );

        res.status(201).json(product);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to create product"
        });

    }
}


async function getInventory(req, res) {

    try {

        const { id } = req.params;

        const inventory =
            await inventoryService.getInventory(id);

        if (!inventory) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(inventory);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to get inventory"
        });

    }
}


module.exports = {
    createProduct,
    getInventory
};
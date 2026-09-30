const pool = require("../config/db");

async function createProduct(name, sku, price, quantity) {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const productResult = await client.query(
            `
            INSERT INTO products (name, sku, price)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [name, sku, price]
        );

        const product = productResult.rows[0];

        await client.query(
            `
            INSERT INTO inventory (product_id, quantity)
            VALUES ($1, $2)
            `,
            [product.id, quantity]
        );

        await client.query("COMMIT");

        return product;

    } catch (error) {

        await client.query("ROLLBACK");

        throw error;

    } finally {

        client.release();

    }
}
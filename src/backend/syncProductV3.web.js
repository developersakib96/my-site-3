import { getDataFromApiAndFormat } from "./utils/formatProductData.web";
import { products as storeProducts } from "wix-stores.v2";
import { Permissions, webMethod } from "wix-web-module";
import wixstoreBackend from "wix-stores-backend";
import wixData from "wix-data";
import { elevate } from "wix-auth";

// Elevate product functions to maintain security context.
const updateProduct = elevate(storeProducts.updateProduct);
const deleteProductOptions = elevate(storeProducts.deleteProductOptions);
const resetVariant = elevate(storeProducts.resetAllProductVariantData);
const updateVariantSku = elevate(storeProducts.updateProductVariants);

/**
 * Synchronizes products between the Wix database and an external data source.
 */
export const syncProductV3 = webMethod(Permissions.Anyone, async (token) => {
    try {
        // Fetch all products from the Wix database.
        const { items: products } = await wixData.query("Stores/Products").find({ suppressAuth: true });

        if (!products.length) {
            console.log("No products found.");
            return;
        }

        const { resellerPriceDetails } = await getDataFromApiAndFormat();

        const locationOptions = [{
                "id": "62bab64d073a2a4c35b4dec6",
                "city": "Cinnaminson",
                "state": "New Jersey",
                "types_available": 0
            },
            {
                "id": "62bab64d073a2a4c35b4dec7",
                "city": "Philadelphia",
                "state": "Pennsylvania",
                "types_available": 1
            },
            {
                "id": "62bab64d073a2a4c35b4dec8",
                "city": "Los Angeles",
                "state": "California",
                "types_available": 1
            },
            {
                "id": "62bab64d073a2a4c35b4deca",
                "city": "Asheville",
                "state": "North Carolina",
                "types_available": 0
            },
            {
                "id": "62bab64d073a2a4c35b4decb",
                "city": "Washington",
                "state": "DC",
                "types_available": 1
            },
            {
                "id": "62bab64d073a2a4c35b4decc",
                "city": "Portland",
                "state": "Maine",
                "types_available": 0
            },
            {
                "id": "62bab64d073a2a4c35b4decd",
                "city": "Miami",
                "state": "Florida",
                "types_available": 0
            }
        ]

        console.log("Location Options:", locationOptions);
        console.log("Reseller Price Details:", resellerPriceDetails);
        console.log("saved products", products)
        // Process products to associate them with location and pricing data.
        const productUpdates = products.flatMap((product) => {
            const pricingChoices = resellerPriceDetails.map((priceDetail) => ({
                value: `${JSON.parse(priceDetail.value).amount}`, // Parse price correctly.
                description: priceDetail.label,
            }));

            return locationOptions
                .filter((location) => location.state == product.name) // Filter valid locations
                .map((location) => ({
                    productId: product._id,
                    inventoryItemId: product.inventoryItemId,
                    productName: product.name,
                    pricingChoices: pricingChoices,
                    isStock: location.types_available,
                    locationId:location.id
                }));
        });

        // Split products based on whether they have location choices.
        const productsWithChoices = productUpdates.filter((p) => (p.isStock != 0));
        const productsWithoutChoices = productUpdates.filter((p) => p.isStock == 0);

        console.log("Products with Choices:", productsWithChoices);
        console.log("Products without Choices:", productsWithoutChoices);

        // Update products concurrently.
        await Promise.allSettled([
            ...productsWithChoices.map(performProductUpdate),
            ...productsWithoutChoices.map(performActionOnEmptyProduct),
        ]);
        console.log("Product synchronization completed.");
    } catch (error) {
        console.error("Error syncing products:", error);
    }
});

/**
 * Parses a pricing string to extract the value in cents.
 */
function parsePrice(inputString) {
    const pattern = /(\w+)\s-\s\$(\d+\.\d{2})/;
    const match = inputString.match(pattern);

    if (match) {
        const amountInDollars = parseFloat(match[2]);
        return Math.round(amountInDollars * 100); // Convert to cents.
    } else {
        throw new Error("Invalid input format");
    }
}

/**
 * Updates a product with location and pricing choices.
 */
async function performProductUpdate(product) {
    try {
        console.log(`Updating Product with Choices: ${product.productId}`);

        if (product.manageVariants) {
            await updateProduct(product.productId, { manageVariants: false });
            await deleteProductOptions(product.productId);
        }

        await resetVariant(product.productId);

        const updateResult = await updateProduct(product.productId, {
            manageVariants: true,
            sku:product.locationId,
            productOptions: [
                { name: "Subscriptions", choices: product.pricingChoices },
            ],
        });

            console.log("product.locationId>>>>>>>>>>>>",product.locationId)
        const variants = updateResult.product?.variants.map((variant) => {
            // const locationMatch = product.locationChoices.find(
            //     (loc) => loc.value === variant.choices.Locations
            // );
            const pricingMatch = product.pricingChoices.find(
                (price) => price.value == parsePrice(variant.choices["Subscriptions"])
            );

            return {
                choices: variant.choices,
                price: Number((pricingMatch?.value / 100).toFixed(2)),
                sku: `${product.locationId}`,
                inStock: true,
                quantity: 10,
            };
        });

        await updateVariantSku(product.productId, variants);

        console.log(`Product ${product.productId} updated successfully.`);
    } catch (error) {
        console.error(`Failed to update Product ID: ${product.productId}`, error);
    }
}

/**
 * Disables stock tracking for products without choices.
 */
async function performActionOnEmptyProduct(product) {
    try {
        console.log(`Handling Product without Choices: ${product.productId}`);

        if (!product?.productId) {
            console.log("Invalid product data. Skipping.");
            return;
        }

        const result = await wixstoreBackend.getProductVariants(product.productId);

        if (!result?.length) {
            console.log(`No variants found for Product ID: ${product.productId}. Skipping.`);
            return;
        }

        const variants = result.map((data) => ({
            quantity: 0,
            variantId: data._id,
            inStock: false,
        }));

        await wixstoreBackend.updateInventoryVariantFieldsByProductId(product.productId, {
            trackQuantity: false,
            variants,
        });

        console.log(`Product ${product.productId} updated with empty choices.`);
    } catch (error) {
        console.error(`Failed to handle Product ID: ${product.productId}`, error);
    }
}
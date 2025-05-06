import { getDataFromApiAndFormat } from "./utils/formatProductData.web";
import { products as storeProducts, inventory } from "wix-stores.v2";
import { Permissions, webMethod } from "wix-web-module";
import wixstoreBackend from "wix-stores-backend";
import wixData from 'wix-data';
import { elevate } from "wix-auth";

// Elevate product functions to maintain security context.
const updateProduct = elevate(storeProducts.updateProduct);
const deleteProductOptions = elevate(storeProducts.deleteProductOptions);
const resetVariant = elevate(storeProducts.resetAllProductVariantData);
const updateVariantSku = elevate(storeProducts.updateProductVariants);

/**
 * Sync products between the Wix database and external data source.
 */
export const syncProductV1 = webMethod(Permissions.Anyone, async (token) => {
    try {
        // Fetch all products from the Wix database
        const { items: products } = await wixData.query("Stores/Products").find({ suppressAuth: true });

        if (!products.length) {
            console.log("No products found.");
            return;
        }

        // Fetch categorized features and pricing data from the API
        const { locationOptions, resellerPriceDetails } = await getDataFromApiAndFormat();
        console.log("Location Options:", locationOptions);
        console.log("Reseller Price Details:", resellerPriceDetails);

        // Map products with matching API data and generate choices
        const productUpdates = products.map((product) =>
            mapProductWithChoicesAndPricing(product, locationOptions, resellerPriceDetails)
        );

        // Split products into those with and without choices for separate handling
        const productsWithChoices = productUpdates.filter((p) => p.locationChoices && p.locationChoices.length > 0);
        const productsWithoutChoices = productUpdates.filter((p) => !p.locationChoices || p.locationChoices.length === 0);

        console.log("Products with Choices:", productsWithChoices);
        console.log("Products without Choices:", productsWithoutChoices);

        // Perform updates for both product groups concurrently
        await Promise.all([
            ...productsWithChoices.map(performProductUpdate),
            ...productsWithoutChoices.map(performActionOnEmptyProduct),
        ]);
    } catch (error) {
        console.error("Error syncing products:", error);
    }
});

/**
 * Maps product data with corresponding API features and pricing to generate choices.
 * @param {Object} product - Product from Wix database.
 * @param {Array} locationOptions - Location options from the API response.
 * @param {Array} resellerPriceDetails - Reseller pricing details from the API response.
 * @returns {Object} Mapped product object with generated choices.
 */
function mapProductWithChoicesAndPricing(product, locationOptions, resellerPriceDetails) {
    // Generate location choices based on the API response.
    const locationChoices = locationOptions.map((location) => ({
        value: location.value,
        description: location.label,
    }));

    // Generate pricing choices based on the reseller price details.
    const pricingChoices = resellerPriceDetails.map((priceDetail) => ({
        value: `${JSON.parse(priceDetail.value).amount}`, // Ensure value is properly formatted
        description: priceDetail.label,
    }));

    return {
        productId: product._id,
        inventoryItemId: product.inventoryItemId,
        productName: product.name,
        locationChoices,
        pricingChoices,
    };
}

function parsePrice(inputString) {
    // Regular expression to extract the period and amount
    const pattern = /(\w+)\s-\s\$(\d+\.\d{2})/;
    const match = inputString.match(pattern);

    if (match) {
        const period = match[1];
        const amountInDollars = parseFloat(match[2]);
        const amountInCents = Math.round(amountInDollars * 100);
        return amountInCents // { period, amountInCents };
    } else {
        throw new Error("Invalid input format");
    }
}

/**
 * Performs the necessary product updates when choices are available.
 * @param {Object} product - Product with available choices.
 */
async function performProductUpdate(product) {
    try {
        console.log(`Updating Product with Choices: ${product.productId}`);

        // Disable variant management, delete existing options, and re-enable with new ones.
        if (product.manageVariants) {
            await updateProduct(product.productId, { manageVariants: false });
            await deleteProductOptions(product.productId);
        }

        // Reset product variants before updating with new data.
        await wixstoreBackend.resetVariantData(product.productId);

        // Update product with new choices for locations and pricing.
        const updateResult = await updateProduct(product.productId, {
            manageVariants: true,
            productOptions: [{
                    name: "Locations",
                    choices: product.locationChoices,
                },
                {
                    name: "Pricing-Plans",
                    choices: product.pricingChoices,
                },
            ],
        });

        // Assign appropriate SKUs for each variant based on location and pricing choices.
        const variants = updateResult.product?.variants.map((variant) => {
            // console.log("pricingChoices>>", product.pricingChoices);
            // console.log(`variant.choices["Pricing-Plans"]`, parsePrice(variant.choices["Pricing-Plans"]))
            const locationMatch = product.locationChoices.find(
                (loc) => loc.value === variant.choices.Locations
            );
            const pricingMatch = product.pricingChoices.find(
                (price) => price.value == parsePrice(variant.choices["Pricing-Plans"])
            );

            console.log("varin data>>>",
                pricingMatch)
            return {
                choices: variant.choices,
                price: Number((Number(pricingMatch.value) / 100).toFixed(2)),
                sku: `${locationMatch?.value || "Unknown"}-${pricingMatch?.value || "Unknown"}`, // Combine location and pricing for SKU.
                inStock: true, // Mark the variant as in stock
                quantity: 10, // Default quantity for new variants
            };
        });

        // Update the product variants with new SKUs and stock.
        await updateVariantSku(product.productId, variants);

        console.log(`Product ${product.productId} updated successfully.`);
        // return updateResult;
    } catch (error) {
        console.error(`Failed to update Product ID: ${product.productId}`, error);
    }
}

/**
 * Handles products without any available choices by disabling stock tracking.
 * @param {Object} product - Product without choices.
 */
async function performActionOnEmptyProduct(product) {
    try {
        console.log(`Handling Product without Choices: ${product.productId}`);

        if (!product || !product.productId) {
            console.log("No valid product data provided. Skipping.");
            return;
        }

        // Fetch existing product variants from inventory.
        const result = await wixstoreBackend.getProductVariants(product.productId);

        if (!result || result.length === 0) {
            console.log(`No variants found for Product ID: ${product.productId}. Skipping.`);
            return;
        }

        // Prepare variants with zero quantity to disable them.
        const variants = result.map((data) => ({
            quantity: 0,
            variantId: data._id,
            inStock: false,
        }));

        // Update product inventory settings to stop tracking and disable variants.
        await wixstoreBackend.updateInventoryVariantFieldsByProductId(product.productId, {
            trackQuantity: false,
            variants,
        });

        console.log(`Product ${product.productId} updated with empty choices.`);
    } catch (error) {
        console.error(`Failed to handle Product ID: ${product.productId}`, error);
    }
}
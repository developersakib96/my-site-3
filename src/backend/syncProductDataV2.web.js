import { getDataFromApiAndFormat } from "./utils/formatProductDatav2.web";
import { products as storeProducts, inventory } from "wix-stores.v2";
import { fetchProtectedData } from "./utils/apiService.web";
import { Permissions, webMethod } from "wix-web-module";
import wixstoreBackend from "wix-stores-backend";
import wixData from 'wix-data';
import { elevate } from "wix-auth";

// Elevate product functions to avoid multiple calls and maintain security context.
const updateProduct = elevate(storeProducts.updateProduct);
const deleteProductOptions = elevate(storeProducts.deleteProductOptions);
const resetVariant = elevate(storeProducts.resetAllProductVariantData);
const updateVariantSku = elevate(storeProducts.updateProductVariants);

/**
 * Sync products between the Wix database and external data source.
 */
export const syncProductV1 = webMethod(Permissions.Anyone, async (token) => {
    try {

      const  {result, status} = await fetchProtectedData(`active_locations`, token)
        // Fetch all products from the Wix database
        const { items: products } = await wixData.query("Stores/Products").find({ suppressAuth: true });

        if (!products.length) {
            console.log("No products found.");
            return;
        }

        // Categorize features using data from an external API
        const categorizedFeatures = await getDataFromApiAndFormat();
        console.log("Categorized Features:", categorizedFeatures);

        // Map products with matching API data and generate choices
        const productUpdates = products.map((product) => mapProductWithChoices(product, categorizedFeatures));

        // Split products into those with and without choices for separate handling
        const productsWithChoices = productUpdates.filter((p) => p.choices && p.choices.length > 0);
        const productsWithoutChoices = productUpdates.filter((p) => !p.choices || p.choices.length === 0);

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
 * Maps product data with corresponding API features to generate choices.
 * @param {Object} product - Product from Wix database.
 * @param {Array} categorizedFeatures - API response with categorized features.
 * @returns {Object} Mapped product object with generated choices.
 */
function mapProductWithChoices(product, categorizedFeatures) {
    const matchingProduct = categorizedFeatures.find(
        (apiData) => apiData.carrier === product.name
    );

    // Generate choices based on locations from the matching API product.
    const choices = matchingProduct?.locations.map((location) => ({
        value: location.name,
        description: location.name,
    })) || null;

    return {
        productId: product._id,
        inventoryItemId: product.inventoryItemId,
        productName: product.name,
        choices,
        locations: matchingProduct?.locations,
    };
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

        // Update product with new choices as product options.
        const updateResult = await updateProduct(product.productId, {
            manageVariants: true,
            productOptions: [{
                name: "Locations",
                choices: product.choices,
            }],
        });

        // Assign appropriate SKUs based on matching location names.
        const variants = updateResult.product?.variants.map(data => {
            const location = product?.locations.find(loc => loc.name.trim() === data.choices.Locations.trim());
            return {
                choices: data.choices,
                sku: location?.id || "", // Use the location's ID as SKU.
            };
        });

        // Update the product variants with new SKUs.
        await updateVariantSku(product.productId, variants);

        console.log(`Product ${product.productId} updated successfully.`);
        return updateResult;
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

        // Fetch existing product variants from inventory.
        const getProductVariants = elevate(inventory.getInventoryVariants);
        const result = await wixstoreBackend.getProductVariants(product.productId);

        // Prepare variants with zero quantity to disable them.
        const variants = result.map(data => ({
            quantity: 0,
            variantId: data._id,
            inStock: false,
        }));

        // Update product inventory settings to stop tracking and disable variants.
        await wixstoreBackend.updateInventoryVariantFieldsByProductId(
            product.productId, {
                trackQuantity: false,
                variants,
            }
        );

        console.log(`Product ${product.productId} updated with empty choices.`);
    } catch (error) {
        console.error(`Failed to handle Product ID: ${product.productId}`, error);
    }
}

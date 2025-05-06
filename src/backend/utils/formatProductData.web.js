import { fetchProtectedData } from "./apiService.web";
import { Permissions, webMethod } from "wix-web-module";

/**
 * Fetches data from the API, verifies the response status,
 * and formats the result to align with the new API response structure.
 *
 * @returns {Object} Categorized features with location and pricing details.
 */
export const getDataFromApiAndFormat = webMethod(
    Permissions.Admin,
    async () => {
        try {
            // Fetch data from the API with protected access.
            const { result, status } = await fetchProtectedData(`mpr2/active_locations?siteDomain=https://www.usamobileproxystore.com`);

            // If the API call fails, return an empty result.
            if (status !== 200) {
                console.error(`Failed to fetch data. Status: ${status}`);
                return { locationOptions: [], resellerPriceDetails: [], lowestPrice: null };
            }

            // Process and structure the data for categorization.
            const formattedData = categorizeFeaturesWithLocationsAndPricing(result);
            return formattedData;
        } catch (error) {
            console.error("Error fetching or processing API data:", error);
            return { locationOptions: [], resellerPriceDetails: [], lowestPrice: null }; // Return empty structure on error.
        }
    }
);

/**
 * Categorizes features with their associated locations and pricing details.
 *
 * @param {Object} apiResponse - The API response containing location and pricing details.
 * @returns {Object} Categorized object with location options and pricing plans.
 */
function categorizeFeaturesWithLocationsAndPricing(apiResponse) {
    const { locationOptions = [], reseller_price_details = [], lowestPrice = null } = apiResponse;

    // Map the location options to the desired structure.
    const mappedLocationOptions = locationOptions
    // Map the reseller price details to the desired structure.
    const mappedResellerPriceDetails = reseller_price_details.map(detail => {
        let parsedValue;
        try {
            parsedValue = JSON.parse(detail.value); // Parse the JSON in value.
        } catch (error) {
            console.error("Error parsing reseller price detail value:", error);
            parsedValue = {};
        }

        return {
            value: detail.value,
            label: detail.label,
            billingCycle: parsedValue.billing_cycle || "",
            amount: parsedValue.amount || 0,
        };
    });

    // Return the structured data.
    return {
        locationOptions: mappedLocationOptions,
        resellerPriceDetails: mappedResellerPriceDetails,
        lowestPrice,
    };
}
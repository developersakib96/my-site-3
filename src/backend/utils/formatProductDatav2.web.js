import { fetchProtectedData } from "./apiService.web";
import { Permissions, webMethod } from "wix-web-module";


/**
 * Fetches data from the API, verifies the response status, 
 * and formats the result using categorizeFeaturesByCarrierWithLocations.
 * 
 * @returns {Object} Categorized features by carrier with locations or null on failure.
 */
export const getDataFromApiAndFormat = webMethod(
    Permissions.Admin, async () => {
        try {
            // Fetch data from the API with protected access.
            const { result, status } = await fetchProtectedData(`active_locations`);

            // If the API call fails, return a null result.
            if (status !== 200) {
                console.error(`Failed to fetch data. Status: ${status}`);
                return { result: [] };
            }

            // Process and categorize the data.
            const formattedData = categorizeFeaturesByCarrierWithLocations(result?.data, result?.included);
            return formattedData;
        } catch (error) {
            console.error("Error fetching or processing API data:", error);
            return { result: [] }; // Return null in case of any unexpected errors.
        }
    }
);



/**
 * Categorizes features by carrier with their associated locations.
 * 
 * @param {Array} data - Array of location objects from the API.
 * @param {Array} included - Array of feature objects included in the API response.
 * @returns {Array} Array of categorized carriers with their available locations.
 */
export function categorizeFeaturesByCarrierWithLocations(data, included) {
    // Extract only "Proxy Type" features that are marked as available
    const proxyTypeFeatures = included.filter(item =>
        item.type === "features" && item.attributes.feature_type === "Proxy Type"
    );

    const categorizedByCarrier = {}; // Object to store carriers and their associated locations.

    // Iterate over each location in the data.
    data.forEach(location => {
        const locationName = `${location.attributes.city}, ${location.attributes.state}`; // Format location name.
        const locationId = location.id; // Get location ID.
        const featureIds = location.relationships.features.data.map(f => f.id); // Extract feature IDs related to this location.

        // Iterate over each feature ID related to the current location.
        featureIds.forEach(featureId => {
            // Find the matching feature in the list of proxy type features.
            const feature = proxyTypeFeatures.find(f => f.id === featureId);

            if (feature) {
                const carrier = feature.attributes.carrier || 'Unknown Carrier'; // Default to 'Unknown Carrier' if not provided.

                // Ensure the carrier exists in the categorized object.
                if (!categorizedByCarrier[carrier]) {
                    categorizedByCarrier[carrier] = {
                        carrier,
                        locations: []
                    };
                }

                // Add the location only if the feature is available.
                if (feature.attributes.available) {
                    // Avoid adding duplicate locations for the same carrier.
                    const locationExists = categorizedByCarrier[carrier].locations.some(loc => loc.id === locationId);
                    if (!locationExists) {
                        categorizedByCarrier[carrier].locations.push({
                            id: locationId,
                            name: locationName
                        });
                    }
                }
            }
        });
    });

    // Convert the categorized object into an array of carrier objects.
    return Object.values(categorizedByCarrier);
}

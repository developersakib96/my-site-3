import { Permissions, webMethod } from "wix-web-module";
import { fetch } from "wix-fetch";
import { getSecret } from "wix-secrets-backend";
/**
 * Generic function to handle API requests (GET, POST, PUT, DELETE)
 */
export const apiService = webMethod(
    Permissions.Anyone, // Adjust this permission level as needed
    async (url, method, body, headers) => {
        // Handle default values for 'method', 'body', and 'headers'
        const finalMethod = method || 'GET'; // Default to 'GET' if no method is provided
        const finalBody = body || null; // Default to null if no body is provided
        const finalHeaders = {
            'Content-Type': 'application/json', // Default Content-Type
            ...(headers || {}), // Merge with provided headers or default to empty object
        };

        // Set up the options object
        const options = {
            method: finalMethod,
            headers: finalHeaders,
        };

        // Add body if it's a POST, PUT, or DELETE request
        if (finalBody && (finalMethod === 'POST' || finalMethod === 'PUT' || finalMethod === 'DELETE')) {
            options.body = JSON.stringify(finalBody);
        }

        const API_URL =  await getSecret('api_url');

        try {
            const response = await fetch(`${API_URL}/${url}`, options);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Parse and return the JSON response
            return await response.json();
        } catch (error) {
            console.error('Error during API call:', error);
            throw error; // Rethrow to handle it further up the chain if needed
        }
    }
);

export const fetchProtectedData = webMethod(
    Permissions.Anyone,
    async (apiUrl, token, httpMethod, body) => {
        try {
            const options = {
                method: httpMethod || 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            };
            if (token) {
                options.headers['Authorization'] = `${token}`; // Pass the token 
            }
            if (body) {
                options.body = JSON.stringify(body);
            }

            const API_URL = await getSecret('api_url');

            // const response = await fetch(`${API_URL}/api/${apiUrl}`, options);

            const response = await fetch(`https://0b27-2401-4900-1c2a-56fc-6ea2-2ab8-e503-3567.ngrok-free.app/api/${apiUrl}`, options);


            if (response.status === 204) {
                // Handle 204 No Content
                return { result: null, status: 204 };
            }

            if (!response.ok) {
                const data = await response.json();
                return { result: data, status: 400 };
            }

            const result = await response.json();
            // console.log('result>>', result)
            return { result, status: response.status };
        } catch (error) {
            console.log('Error fetching protected data:', error);
            return { result: error, status: 500 };
        }
    }
);

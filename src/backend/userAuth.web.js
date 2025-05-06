/************
.web.js file
************

Backend '.web.js' files contain functions that run on the server side and can be called from page code.

Learn more at https://dev.wix.com/docs/develop-websites/articles/coding-with-velo/backend-code/web-modules/calling-backend-code-from-the-frontend

****/

/**** Call the sample multiply function below by pasting the following into your page code:

import { multiply } from 'backend/new-module.web';

$w.onReady(async function () {
   console.log(await multiply(4,5));
});

****/
/************
.web.js file
************

Backend '.web.js' files contain functions that run on the server side and can be called from page code.

Learn more at https://dev.wix.com/docs/develop-websites/articles/coding-with-velo/backend-code/web-modules/calling-backend-code-from-the-frontend

****/

/**** Call the sample multiply function below by pasting the following into your page code:

import { multiply } from 'backend/new-module.web';

$w.onReady(async function () {
   console.log(await multiply(4,5));
});

****/

import { Permissions, webMethod } from "wix-web-module";
import { authentication } from 'wix-members-backend';

export const userLogin = webMethod(
    Permissions.Anyone, (email, password) => {
        return authentication.login(email, password)
            .then((result) => {
                console.log('Login successful for user:', result);
                return result;
            })
            .catch((error) => {
                console.log("Login failed:", error);
                return { error };
            });
    }
);

export const userRegister = webMethod(
    Permissions.Anyone, (email, password) => {

        // First, attempt to register the user
        return authentication.register(email, password)
            .then((result) => {
                console.log("User registered successfully", result);
                return result
            })
            .catch((registerError) => {
                console.log("Registration failed:", registerError);
                return registerError;
            });
    }
);
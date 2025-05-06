import wixWindow from 'wix-window';
import { userLogin } from 'backend/userAuth.web';
import {authentication} from "wix-members"
$w.onReady(function () {

    // Initially hide the text77 element when the user visits the page
    $w('#text77').hide();

    // Clear any value that might be present in the text77 element
    $w('#text77').text = "";
});
    // Ensure button13 has an event listener for the click
    $w("#button13").onClick(registerButton_click);

    async function registerButton_click(event) {
        console.log("clicked")
        try {
            let email = $w('#input1').value;
            let password = $w('#input2').value;

            const result = await userLogin(email, password);
            console.log(result);

            if (!result?.error) {
                 console.log("Login successful, closing lightbox...");
                authentication.applySessionToken(result)
                wixWindow.lightbox.close()
            }
            // If there is an error in the result, show the error message in red and make it visible 
            else if (result?.error?.details?.applicationError?.code == '-19976') {
                // Set the text with HTML to change the color to red
                $w('#text77').html = `<span style="color: red ;">Invalid credintials .</span>`;
                $w('#text77').show(); // Make the text element visible
                setTimeout(() => {
                    $w('#text77').hide();
                }, 3000);
            } else if (result?.error?.details?.applicationError?.code == '-19958') {
                // Set the text with HTML to change the color to red
                $w('#text77').html = `<span style="color: red;">Please verify your email to login.</span>`;
                $w('#text77').show(); // Make the text element visible
                setTimeout(() => {
                    $w('#text77').hide();
                }, 3000);
            } else {
                // If login is successful, hide the text77 element
                $w('#text77').hide();
            }

        } catch (error) {
            console.log(error)
        }

    }

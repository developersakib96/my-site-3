// Velo API Reference: https://www.wix.com/velo/reference/api-overview/introduction

$w.onReady(function () {

	// Write your Javascript code here using the Velo framework API

});

$w("#button13").onClick(registerButton_click)

import { userRegister } from 'backend/userAuth.web.js'
import { triggeredEmails } from "wix-crm-frontend";

export async function registerButton_click(event) {
    let email = $w('#input1').value
    let password = $w('#input2').value
    const result  = await userRegister(email, password);
	console.log('register',result)
	triggeredEmails
  .emailContact("UNgZgjw", result?.member.contactId, {variables:{verification_link:"https://example.com"}})
  .then(() => {
    console.log("Email was sent to contact");
  })
  .catch((error) => {
    console.error(error);
  });
}
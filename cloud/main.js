
var twilioClient = require('twilio')('AC89bea12cb6782b72bc47f37999953b2f', '89f842387581a640d48a7e4fea362888');

var TwilioAccount = Parse.Object.extend("TwilioAccount",
    {},
    {}
);
/* end Model TwilioAccount */

Parse.Cloud.define("hello", function(request, response)
{
    response.success("Hello this is TwilioTreeBot !");
});

Parse.Cloud.define("startTree", function(request, response)
{
    var name  = "undefined" != typeof request.params.firstName ?
            request.params.firstName : "";
    var phone = "undefined" != typeof request.params.phoneNumber ?
            request.params.phoneNumber : "";
    var url   = "undefined" != typeof request.params.url ?
            request.params.url : "";

    if (!name.length || !phone.length)
        response.error("Fields firstName and phoneNumber are mandatory !");

    var account = new TwilioAccount();
    account.set("firstName", name);
    account.set("phoneNumber", phone);

    if (url.length)
        account.set("url", url);

    account.save(null, {
        success: function(act) {
            response.success("Account created !");
        },
        error: function(act, error) {
            response.error("Create Account Error: " + error);
        }
    });
});

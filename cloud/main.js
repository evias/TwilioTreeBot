
var twilioClient = require('twilio')('AC89bea12cb6782b72bc47f37999953b2f', '89f842387581a640d48a7e4fea362888');

var TwilioAccount = Parse.Object.extend("TwilioAccount",
    {
        /**
         * This method is used to sync the row with
         * a Twilio subaccount !
         * @see https://www.twilio.com/docs/api/rest/subaccounts
         **/
        sync: function(callback)
        {
            var self = this;
            var name = this.firstName + "(" + this.phoneNumber + ")";

            twilioClient.accounts.list({friendlyName: name}, function(err, data) {
                if (!data.accounts.length) {
                    // need to create account.
                    twilioClient.accounts.create(
                        {friendlyName: name},
                        function(err, twilioAccount) {
                            callback(twilioAccount);
                        });
                }
                else
                    // account already exists.
                    callback(data.accounts[0]);
            });
        }
    },
    {}
);
/* end Model TwilioAccount */

var OutboundMessage = Parse.Object.extend("OutboundMessage",
    {},
    {
        getFirstText: function(parseTwilioAccount)
        {
            var text = "Thank you for coming to us today "
                    + parseTwilioAccount.firstName + ". Your dental practice.";

            var message = new OutboundMessage();
            message.set("treeIndex", "first");
            message.set("msgText", text);
            return message;
        }
    }
);
/* end Model OutboundMessage */

// Make sure our Models are loaded in queries.
Parse.Object.registerSubclass("TwilioAccount", TwilioAccount);
Parse.Object.registerSubclass("OutboundMessage", OutboundMessage);

Parse.Cloud.define("hello", function(request, response)
{
    response.success("Hello this is TwilioTreeBot !");
});

Parse.Cloud.define("syncAccount", function(request, response)
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

    // save Parse App TwilioAccount
    // then sync with Twilio's subaccount (or create)
    // then save Twilio's SID in Parse App TwilioAccount entity
    account.save(null, {
        success: function(act) {

            act.sync(function(act_at_twilio)
                {
                    // update parse TwilioAccount entity to contain
                    // a Twilio SID which is used for sending messages.
                    account.set("twilioSID", act_at_twilio.sid);
                    account.save();

                    // Done with the syncAccount call !
                    response.success("Account OK (Twilio SID: " + act_at_twilio.sid + ") !");
                });
        },
        error: function(act, error) {
            response.error("Account Error: " + error);
        }
    });
});

Parse.Cloud.define("startTree", function(request, response)
{
    var accountId = "undefined" != typeof request.params.accountId ?
                request.params.accountId : "";

    var query = new Parse.Query(TwilioAccount);
    query.equalTo("objectId", accountId);

    // when the entity is loaded we are up to sending
    // the first SMS of the decision tree.
    query.first({
        success: function() {
            console.log("Sending first SMS in Tree for: ", parseTwilioAccount);

            twilioClient.accounts(accountId).sms.messages.create({
                to: parseTwilioAccount.phoneNumber,
                from: '+32496774016',
                body: OutboundMessage.getFirstText(parseTwilioAccount).msgText
            },
            function(err, text) {
                console.log('Sending SMS done for: ', parseTwilioAccount);
                console.log('Current status of this text message is: '+ text.status);
            });
        },
        error: function(error) {
            response.error("Error in Account fetch: " + error);
        }
    });
});

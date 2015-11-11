
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
            var name = this.get("firstName") + "(" + this.get("phoneNumber") + ")";

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

var TwilioNumber = Parse.Object.extend("TwilioNumber",
    {
        sync: function(callback)
        {
            var self       = this;
            var accountId  = this.get("accountId");
            var accountSid = this.get("accountSid");

            // Try to fetch the phoneNumber from TwilioNumber
            // Or purchase a new number with TwilioAccount
            var query = new Parse.Query(TwilioNumber);
            query.equalTo("accountId", accountId);

            query.first({
                success: function(parseTwilioNumber)
                {
                    var number = parseTwilioNumber ? parseTwilioNumber.get("phoneNumber") : false;
                    if (!number)
                        callback(self, true);
                    else
                        // number exists in TwilioNumber, no need to purchase
                        // a new one on Twilio
                        callback(parseTwilioNumber);
                },
                error: function(err)
                {
                    callback(self, true);
                }
            });

        }
    },
    {
        Factory: function(parseTwilioAccount)
        {
            var number = new TwilioNumber();
            number.set("accountId", parseTwilioAccount.id);
            number.set("accountSid", parseTwilioAccount.get("twilioSID"));
            return number;
        }
    }
);
/* end Model TwilioNumber */

var OutboundMessage = Parse.Object.extend("OutboundMessage",
    {},
    {
        Factory: function(parseTwilioAccount, type)
        {
            var text = "";
            switch (type) {
                default:
                case "first":
                    text = "Thank you for coming to us today "
                         + parseTwilioAccount.get("firstName") + ". Your dental practice.";
                    break;
            }

            var message = new OutboundMessage();
            message.set("treeIndex", "first");
            message.set("msgText", text);
            message.set("accountSid", parseTwilioAccount.get("twilioSID"));
            message.set("accountId", parseTwilioAccount.id);
            message.set("to", parseTwilioAccount.get("phoneNumber"));
            return message;
        }
    }
);
/* end Model OutboundMessage */

// Make sure our Models are loaded in queries.
Parse.Object.registerSubclass("TwilioAccount", TwilioAccount);
Parse.Object.registerSubclass("TwilioNumber", TwilioNumber);
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
                    act.set("twilioSID", act_at_twilio.sid);
                    act.save();

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
        success: function(parseTwilioAccount) {
            console.log("found Account: #" + parseTwilioAccount.id);

            var number   = TwilioNumber.Factory(parseTwilioAccount);
            var outbound = OutboundMessage.Factory(parseTwilioAccount, "first");

            // sync number with twilio sub account outgoingCallerIds
            // then send SMS (and update outbound message entity)
            number.sync(function(parseTwilioNumber, needPurchase)
                {
                    if (!needPurchase) {
                        // directly send SMS.
                        twilioClient.accounts(parseTwilioAccount.get("twilioSID"))
                                    .sms.messages.create(
                        {
                            to: parseTwilioAccount.get("phoneNumber"),
                            from: parseTwilioNumber.get("phoneNumber"),
                            body: outbound.get("msgText")
                        },
                        function(err, text) {
                            // save OutboundMessage entity
                            outbound.set("from", parseTwilioNumber.get("phoneNumber"));
                            outbound.save();

                            // Done with /startTree call !
                            var logging = text.to + " - " + text.form + " - " + text.body + " - " + err.message;
                            response.success("API call OK. SMS Status: " + logging);
                        });
                    }
                    else {
                        // purchase new number at Twilio
                        // then send SMS
                        twilioClient.availablePhoneNumbers("BE")
                                    .local.list({ excludeAllAddressRequired: "true" },
                        function(err, numbers) {
                            if (err) {
                                response.success("API Call Error: availablePhoneNumbers: " + err.message + " !");
                                return false;
                            }

                            for (number in numbers) {
                                twilioClient.incomingPhoneNumbers.create({
                                    phoneNumber: number.phone_number
                                },
                                function(err, purchasedNumber) {
                                    if (err) {
                                        // next number
                                        //response.error("Could not Purchase Number: " + err.message + " (" + err.code + ")");
                                        return false;
                                    }

                                    parseTwilioNumber.set("numberSid", purchasedNumber.sid);
                                    parseTwilioNumber.set("phoneNumber", purchasedNumber.PhoneNumber);
                                    parseTwilioNumber.save();

                                    twilioClient.accounts(parseTwilioAccount.get("twilioSID"))
                                                .sms.messages.create(
                                    {
                                        to: parseTwilioAccount.get("phoneNumber"),
                                        from: parseTwilioNumber.get("phoneNumber"),
                                        body: outbound.get("msgText")
                                    },
                                    function(err, text) {

                                        // save OutboundMessage entity
                                        outbound.set("from", parseTwilioNumber.get("phoneNumber"));
                                        outbound.save();

                                        // Done with /startTree call !
                                        var logging = text.to + " - " + text.form + " - " + text.body + " - " + err.message;
                                        response.success("API call OK. SMS Status: " + logging);
                                    });
                                });
                            }

                            response.success("API Call Error: Could not buy a Number !");
                        });
                    }

                    //parseTwilioNumber.set("numberSid", num_at_twilio.sid);
                    //parseTwilioNumber.set("phoneNumber", num_at_twilio.PhoneNumber);
                    //parseTwilioNumber.save();
                });
        },
        error: function(error) {
            response.error("Error in Account fetch: " + error);
        }
    });
});


var process = require('process/browser.js');
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

            // load number
            var query = new Parse.Query(TwilioNumber);
            query.equalTo("accountId", accountId);
            query.equalTo("accountSid", accountSid);
            query.first({
                success:function(parseTwilioNumber) {
                    if (! parseTwilioNumber) {
                        // create the twilioNumber object
                        process.stdout.write("Create Twilio Number for " + accountId);
                        twilioClient.outgoingCallerIds.create(
                            {},
                            function(err, twilioNumber) {
                                callback(self, twilioNumber);
                            });
                    }
                    else {
                        // fetch the twilioNumber object
                        var num_sid = parseTwilioNumber.get("numberSid");
                        process.stdout.write("Fetch Twilio Number for " + accountId
                                                + " with " + num_sid);

                        twilioClient.outgoingCallerIds(num_sid)
                                    .get(function(err, twilioNumber)
                        {
                            callback(self, twilioNumber);
                        });
                    }
                },
                error: function(error) {
                    process.stdout.write("Error in fetchNumber: " + error);
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
        getFirstText: function(parseTwilioAccount)
        {
            var text = "Thank you for coming to us today "
                    + parseTwilioAccount.get("firstName") + ". Your dental practice.";

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
            process.stdout.write("found Account: #" + parseTwilioAccount.id);

            var number   = TwilioNumber.Factory(parseTwilioAccount);
            var outbound = OutboundMessage.getFirstText(parseTwilioAccount);

            // sync number with twilio sub account outgoingCallerIds
            // then send SMS (and update outbound message entity)
            number.sync(function(num_at_parse, num_at_twilio)
                {
                    num_at_parse.set("numberSid", num_at_twilio.sid);
                    num_at_parse.set("phoneNumber", num_at_twilio.PhoneNumber);
                    num_at_parse.save();

                    process.stdout.write("Saved TwilioNumber, new SID: " + num_at_twilio.sid);
                    process.stdout.write("New Twilio outgoingCallerId number: " + num_at_twilio.PhoneNumber);

                    twilioClient.accounts(accountId).sms.messages.create({
                        to: parseTwilioAccount.get("phoneNumber"),
                        from: num_at_parse.get("phoneNumber"),
                        body: outbound.get("msgText")
                    },
                    function(err, text) {

                        process.stdout.write("SMS API sent to: " + text.to);
                        process.stdout.write("SMS API sent from: " + text.from);
                        process.stdout.write("SMS API message sent: " + text.body);
                        process.stdout.write("SMS API call done: " + err);

                        // save OutboundMessage entity
                        outbound.set("to", parseTwilioAccount.get("phoneNumber"));
                        outbound.set("from", num_at_twilio.PhoneNumber);
                        outbound.set("name", parseTwilioAccount.get("firstName"));
                        outbound.set("accountId", parseTwilioAccount.id);
                        outbound.save();

                        // Done with /startTree call !
                        response.success("API call OK. SMS Status: " + text.status);
                    });
                });
        },
        error: function(error) {
            response.error("Error in Account fetch: " + error);
        }
    });
});

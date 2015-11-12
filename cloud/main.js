
/**
 * LICENSE
 *
 Copyright 2015 Grégory Saive (greg@evias.be)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * @package TwilioTreeBot
 * @subpackage Parse CloudCode
 * @author Grégory Saive <greg@evias.be>
 * @license http://www.apache.org/licenses/LICENSE-2.0
**/

// PROD
var twilioClient = require('twilio')('AC89bea12cb6782b72bc47f37999953b2f', '89f842387581a640d48a7e4fea362888');
// TEST
//var twilioClient = require('twilio')('AC21e6f51dd30c088d712931ac16cd3d15', '231c294c084b418681d01542722c89a0');
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
                if (!data || !data.accounts || !data.accounts.length) {
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
    {
        send: function(callback)
        {
            var self = this;

            twilioClient.accounts(self.get("accountSid"))
                        .sms.messages.create(
            {
                to: self.get("to"),
                from: self.get("from"),
                body: self.get("msgText")
            },
            function(err, text) {
                callback(err, text, self);
            });
        }
    },
    {
        Factory: function(parseTwilioAccount, treeIndex)
        {
            var text = "";
            switch (treeIndex) {
                default:
                case "first":
                    text = "Thank you for coming to us today "
                         + parseTwilioAccount.get("firstName") + ". Your dental practice.";
                    break;

                case "second":
                    text = "We would love to get your feedback, "
                         + "it only takes 20 seconds. Do you think"
                         + "we did a good job? Yes or No";
                    break;

                case "yes-first":
                    text = "So happy to hear that :) You can text"
                         + "this number to send the office feedback"
                         + "anytime. We read them everyday";
                    break;

                case "yes-second":
                    text = "Reviews really help out the office, "
                         + "if you want to leave one here is the link: "
                         + parseTwilioAccount.get("url");
                    break;

                case "no-first":
                    text = "We are sorry to hear that.";
                    break;

                case "no-second":
                    text = "What happened / how could we improve? "
                         + "Any feedback is greatly appreciated in "
                         + "making the office better";
                    break;

                case "feedback-first":
                    text = "Thanks for the feedback, we really appreciate"
                         + " you helping us improve the office.";
                    break;

                case "feedback-second":
                    text = "You can text this number anytime with feedback.";
                    break;

                case "unsupported":
                    text = "**can you please answer with yes or no.**";
                    break;
            }

            var message = new OutboundMessage();
            message.set("treeIndex", treeIndex);
            message.set("msgText", text);
            message.set("accountSid", parseTwilioAccount.get("twilioSID"));
            message.set("accountId", parseTwilioAccount.id);
            message.set("to", parseTwilioAccount.get("phoneNumber"));
            return message;
        }
    }
);
/* end Model OutboundMessage */

var IncomingMessage = Parse.Object.extend("IncomingMessage",
    {},
    {}
);
/* end Model IncomingMessage */

var FeedbackDiscussion = Parse.Object.extend("FeedbackDiscussion",
    {},
    {}
);
/* end Model FeedbackDiscussion */

var FeedbackService = Parse.Object.extend("FeedbackService",
    {},
    {
        delegateService: function(incomingMessage, feedbackDiscussion, callback)
        {
            var customerNumber = incomingMessage.get("from");
            var twilioNumber   = incomingMessage.get("to");
            var msgText        = incomingMessage.get("body");
            var feedbackState  = feedbackDiscussion.get("state");
            var accountId      = feedbackDiscussion.get("accountId");

            var account = new Parse.Query(TwilioAccount);
            account.get(accountId, {
                success: function(twilioAccount)
                {
                    switch (feedbackState) {
                        // state 2 is after sending Welcome SMSs (/startTree)
                        default:
                        case 2:
                            return FeedbackService.answerToYesNo(twilioAccount,
                                    incomingMessage, feedbackDiscussion, callback);

                        // No interpretation needed anymore, simply Thank
                        // the customer
                        case 3:
                        case 4:
                            return FeedbackService.answerThanks(twilioAccount,
                                    incomingMessage, feedbackDiscussion, callback);

                        // Discussion initiated by the customer, thank
                        // him for the feedback.
                        case 0:
                            return FeedbackService.answerFeedback(twilioAccount,
                                    incomingMessage, feedbackDiscussion, callback);

                    }
                },
                error: function(err)
                {

                }
            });
        },
        answerToYesNo: function(twilioAccount, incomingMessage, feedbackDiscussion, callback)
        {
            var accountId = feedbackDiscussion.get("accountId");
            var msgText   = incomingMessage.get("body");
            var outboundType1 = "unsupported";
            var outboundType2 = "unsupported";
            if (msgText.match(/[Yy][Ee][Ss]/)) {
                // Yes received !
                outboundType1 = "yes-first";
                outboundType2 = "yes-second";
            }
            else if (msgText.match(/[Nn][Oo]/)) {
                // No received !
                outboundType1 = "no-first";
                outboundType2 = "no-second";
            }

            var outbound1 = OutboundMessage.Factory(twilioAccount, outboundType1);
            outbound1.set("from", feedbackDiscussion.get("twilioNumber"));
            outbound1.save();

            if (outboundType1 != "unsupported") {
                var outbound2 = OutboundMessage.Factory(twilioAccount, outboundType2);
                outbound2.set("from", feedbackDiscussion.get("twilioNumber"));
                outbound2.save();

                // NEXT STATE
                feedbackDiscussion.set("state", 3);
                feedbackDiscussion.save();

                outbound1.send(function() {});
                return outbound2.send(callback);
            }
            else
                // no need for state change when anything
                // else than yes/no is received.
                // waiting until next receive to potentially
                // interpret a correct Yes/No.
                return outbound1.send(callback);
        },
        answerThanks: function(twilioAccount, incomingMessage, feedbackDiscussion, callback)
        {
            var accountId = feedbackDiscussion.get("accountId");
            var msgText   = incomingMessage.get("body");
            var outboundType1 = "feedback-first";
            var outboundType2 = "feedback-second";

            var outbound1 = OutboundMessage.Factory(twilioAccount, outboundType1);
            outbound1.set("from", feedbackDiscussion.get("twilioNumber"));
            outbound1.save();

            var outbound2 = OutboundMessage.Factory(twilioAccount, outboundType2);
            outbound2.set("from", feedbackDiscussion.get("twilioNumber"));
            outbound2.save();

            // NEXT STATE - Discusion DONE
            feedbackDiscussion.set("state", 4);
            feedbackDiscussion.save();

            outbound1.send(function() {
                outbound2.send(callback);
            });
        },
        answerFeedback: function(twilioAccount, incomingMessage, feedbackDiscussion, callback)
        {
            var accountId = feedbackDiscussion.get("accountId");
            var msgText   = incomingMessage.get("body");
            var outboundType1 = "feedback-first";
            var outboundType2 = "feedback-second";

            var outbound1 = OutboundMessage.Factory(twilioAccount, outboundType1);
            outbound1.set("from", feedbackDiscussion.get("twilioNumber"));
            outbound1.save();

            var outbound2 = OutboundMessage.Factory(twilioAccount, outboundType2);
            outbound2.set("from", feedbackDiscussion.get("twilioNumber"));
            outbound2.save();

            // NO UPDATE OF STATE BECAUSE THE
            // CUSTOMER INITIATED THE DISCUSSION
            //feedbackDiscussion.set("state", 4);
            //feedbackDiscussion.save();

            outbound1.send(function() {
                outbound2.send(callback);
            });
        }
    }
);
/* end Model FeedbackService */

// Make sure our Models are loaded in queries.
Parse.Object.registerSubclass("TwilioAccount", TwilioAccount);
Parse.Object.registerSubclass("TwilioNumber", TwilioNumber);
Parse.Object.registerSubclass("OutboundMessage", OutboundMessage);
Parse.Object.registerSubclass("IncomingMessage", IncomingMessage);
Parse.Object.registerSubclass("FeedbackDiscussion", FeedbackDiscussion);
Parse.Object.registerSubclass("FeedbackService", FeedbackService);

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

            account.sync(function(act_at_twilio)
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

    var sendTwilioWelcomeSMS = function(outboundMessage, twilioNumber, twilioAccount, callback)
        {
            // We are now starting the Feedback discussion
            // between twilioAccount and twilioNumber.
            var discussion = new FeedbackDiscussion();
            discussion.set("numberId", twilioNumber.id);
            discussion.set("accountId", twilioAccount.id);
            discussion.set("twilioNumber", twilioNumber.get("phoneNumber"));
            discussion.set("customerNumber", twilioAccount.get("phoneNumber"));
            discussion.set("state", 1);
            discussion.save();

            // Send first SMS (outboundMessage parameter)
            twilioClient.accounts(twilioAccount.get("twilioSID"))
                        .sms.messages.create(
            {
                to: twilioAccount.get("phoneNumber"),
                from: twilioNumber.get("phoneNumber"),
                body: outboundMessage.get("msgText")
            },
            function(err, text) {
                // Send second SMS
                var secondMessage = OutboundMessage.Factory(twilioAccount, "second");
                twilioClient.accounts(twilioAccount.get("twilioSID"))
                        .sms.messages.create(
                {
                    to: twilioAccount.get("phoneNumber"),
                    from: twilioNumber.get("phoneNumber"),
                    body: secondMessage.get("msgText")
                },
                function(err, text) {
                    secondMessage.set("from", twilioNumber.get("phoneNumber"));
                    secondMessage.save();

                    discussion.set("state", 2);
                    discussion.save();

                    callback(outboundMessage, secondMessage, twilioNumber, twilioAccount, err, text);
                });
            });
        }

    // when the entity is loaded we are up to sending
    // the first SMS of the decision tree. (and start a discussion)
    var query = new Parse.Query(TwilioAccount);
    query.get(accountId, {
        success: function(parseTwilioAccount) {
            console.log("found Account: #" + parseTwilioAccount.id);

            var number   = TwilioNumber.Factory(parseTwilioAccount);
            var outbound = OutboundMessage.Factory(parseTwilioAccount, "first");

            // sync number with twilio sub account outgoingCallerIds
            // then send SMS (and update outbound message entity)
            number.sync(function(parseTwilioNumber, needPurchase)
            {
                if (!needPurchase) {
                    sendTwilioWelcomeSMS(outbound, parseTwilioNumber, parseTwilioAccount,
                        function(outboundMessage, secondMessage, twilioNumber, twilioAccount, err, text) {
                            // save OutboundMessage entity
                            outboundMessage.set("from", twilioNumber.get("phoneNumber"));
                            outboundMessage.save();

                            // Done with /startTree call !
                            var logging = text.to + " - " + text.form + " - " + text.body + " - " + err.message;
                            response.success("API call OK. SMS Status: " + logging);
                        });
                }
                else {

    /**
     * TO TEST THE /startTree ENDPOINT, UNCOMMENT THIS BLOCK
     /

                    parseTwilioNumber.set("numberSid", "AC21e6f51dd30c088d712931ac16cd3d15");
                    parseTwilioNumber.set("phoneNumber", "15005550006");
                    parseTwilioNumber.save();

                    sendTwilioWelcomeSMS(outbound, parseTwilioNumber, parseTwilioAccount,
                        function(outboundMessage, secondMessage, twilioNumber, twilioAccount, err, text) {
                            // save OutboundMessage entity
                            outboundMessage.set("from", twilioNumber.get("phoneNumber"));
                            outboundMessage.save();

                            // Done with /startTree call !
                            var logging = text.to + " - " + text.form + " - " + text.body + " - " + err.message;
                            response.success("API call OK. SMS Status: " + logging);
                        });
    /**
     * AND COMMENT OUT THE FOLLOWING BLOCK
     **/


    /**
     * THIS IS THE PRODUCTION VERSION OF THE CODE
     * IT WILL PURCHASE A NEW NUMBER AT TWILIO IF NEEDED.
     * COMMENT IT OUT IF YOU WANT TO TEST
     **/
                    // purchase new number at Twilio
                    // then send SMS
                    twilioClient.availablePhoneNumbers("US")
                                .local.list({ excludeAllAddressRequired: "true" },
                    function(err, numbers) {
                        if (err) {
                            response.success("API Call Error: availablePhoneNumbers: " + err.message + " !");
                            return false;
                        }

                        for (number in numbers) {
                            twilioClient.incomingPhoneNumbers.create({
                                phoneNumber: number.phone_number,
                                smsUrl: "https://twiliotreebot.herokuapp.com?tree=" + number.phone_number,
                                smsMethod: "POST"
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

                                sendTwilioWelcomeSMS(outbound, parseTwilioNumber, parseTwilioAccount,
                                    function(outboundMessage, secondMessage, twilioNumber, twilioAccount, err, text) {
                                        // save OutboundMessage entity
                                        outboundMessage.set("from", twilioNumber.get("phoneNumber"));
                                        outboundMessage.save();

                                        // Done with /startTree call !
                                        var logging = text.to + " - " + text.form + " - " + text.body + " - " + err.message;
                                        response.success("API call OK. SMS Status: " + logging);
                                    });
                            });
                        }

                        response.success("API Call Error: Could not buy a Number !");
                    });
    /**
     * END OF PRODUCTION BLOCK.
     **/

                }
            });
        },
        error: function(error) {
            response.error("Error in Account fetch: " + error);
        }
    });
});

Parse.Cloud.define("handleTree", function(request, response)
{
    var customerNumber = "undefined" != typeof request.params.From ?
            request.params.From : "";
    var twilioNumber   = "undefined" != typeof request.params.To ?
            request.params.To : "";
    var smsBody        = "undefined" != typeof request.params.Body ?
            request.params.Body : "";
    var smsTree        = "undefined" != typeof request.params.tree ?
            request.params.tree : "";

    // save incoming message
    var incoming = new IncomingMessage();
    incoming.set("from", customerNumber);
    incoming.set("to", twilioNumber);
    incoming.set("body", smsBody);
    incoming.set("tree", smsTree);
    incoming.save();

    var discussion     = new Parse.Query(FeedbackDiscussion);
    discussion.equalTo("customerNumber", customerNumber);
    discussion.equalTo("twilioNumber", twilioNumber);
    discussion.descending("createdAt");
    discussion.first({
        success: function(feedbackDiscussion)
        {
            if (! feedbackDiscussion) {
                // Customer could not be identified
                // need to create new TwilioAccount
                var account = new TwilioAccount();
                account.set("firstName", "No Name");
                account.set("phoneNumber", customerNumber);
                account.save({
                success:function(twilioAccount)
                {
                    // can now save the discussion
                    var discussion = new FeedbackDiscussion();
                    discussion.set("accountId", twilioAccount.id);
                    discussion.set("twilioNumber", twilioNumber);
                    discussion.set("customerNumber", customerNumber);
                    discussion.set("state", 0);
                    discussion.save({
                    success: function(feedbackDiscussion)
                    {
                        incoming.set("discussionId", feedbackDiscussion.id);
                        incoming.save();

                        FeedbackService.delegateService(incoming, feedbackDiscussion,
                        function(err, text, outboundMessage)
                        {
                            if (text && outboundMessage)
                                response.success("API call OK.");
                            else
                                response.error("API call Error: " + err.message);
                        });
                    }}); /* end save discussion */
                }}); /* end save account */
            }
            else {
                incoming.set("discussionId", feedbackDiscussion.id);
                incoming.save();

                FeedbackService.delegateService(incoming, feedbackDiscussion,
                    function(err, text, outboundMessage)
                    {
                        if (text && outboundMessage)
                            response.success("API call OK.");
                        else
                            response.error("API call Error: " + err.message);
                    });
            }
        },
        error: function(err) {
            response.error("API call Error: " + err.message);
        }
    });
});

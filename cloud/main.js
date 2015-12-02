
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
 * @subpackage Parse CloudCode Functions
 * @author Grégory Saive <greg@evias.be>
 * @license http://www.apache.org/licenses/LICENSE-2.0
 * @link https://twiliotreebot.parseapp.com
**/
require('cloud/app.js');
var bitly = require("cloud/bitly.js");

/*******************************************************************************
 * Models classes definition for TwilioTreeBot
 * @link https://twiliotreebot.parseapp.com
 *******************************************************************************/

/**
 * Model class TwilioAccount
 * This class describes a Feedback Customer in the Parse App.
 * It simply extends the Parse.Object object with no method
 * descriptions as of now.
 **/
var TwilioAccount = Parse.Object.extend("TwilioAccount",
  {},
  {}
);
/* end Model TwilioAccount */

/**
 * Model class TwilioNumber
 * This class describes a Twilio PhoneNumber in the Parse App.
 * This class provides with a object method sync() which
 * can be called to retrieve a TwilioNumber entry by its
 * userId. (Only one TwilioNumber entry will correspond!)
 **/
var TwilioNumber = Parse.Object.extend("TwilioNumber",
  {
    sync: function(callback)
    {
      var self       = this;
      var userId     = this.get("userId");

      // Try to fetch the phoneNumber from TwilioNumber
      var query = new Parse.Query(TwilioNumber);
      query.equalTo("userId", userId);
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
  {}
);
/* end Model TwilioNumber */

/**
 * Model class OutboundMessage
 * This class describes a OutboundMessage entry in the Parse App.
 * This class provides with a object method send() which can
 * be called to use the set accountSid, to, from and msgText
 * data and send the OutboundMessage using the Twilio API SMS
 * endpoint.
 * Also, this class provides a static Factory() which can be
 * used to retrieve a populated OutboundMessage entry with
 * treeIndex, msgText, accountId and to fields already set.
 **/
var OutboundMessage = Parse.Object.extend("OutboundMessage",
  {
    /**
     * The OutboundMessage.send() instance method provides
     * with a way of calling Twilio'S SMS sending API
     * for sending OUT SMS messages to the twilioAccount
     * configured on the OutboundMessage, filled for example
     * using the provided OutboundMessage.Factory() method.
     *
     * @param   callable  callback  Callable to call after Send
     * @return  void
     **/
    send: function(callback)
    {
        var self = this;

        Parse.Config.get().then(
          function(config)
          {
            var twilioClient = require("twilio")(
              config.get("twilioAppSID"),
              config.get("twilioAppToken"));

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
          },
          function(error) { console.log("Could not load Parse.Config"); console.log(error); });
    }
  },
  {
    /**
     * OutboundMessage.Factory() class function.
     * This functions takes a TwilioAccount entry and a
     * treeIndex which is one of :
     * ['first', 'second', 'yes-first', 'yes-second', 'no-first',
     *  'no-second', 'feedback-first', 'feedback-second', 'unsupported']
     *
     * @param   TwilioAccount   parseTwilioAccount
     * @param   string          treeIndex
     * @return OutboundMessage [UNSAVED]
     **/
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
               + "it only takes 20 seconds. Do you think "
               + "we did a good job? Yes or No";
          break;

        case "yes-first":
          text = "So happy to hear that :) You can text "
               + "this number to send the office feedback "
               + "anytime. We read them everyday";
          break;

        case "yes-second":
          text = "Reviews really help out the office, "
               + "if you want to leave one here is the link: "
               + parseTwilioAccount.get("url"); // already shortened!
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
          text = "Thanks for the feedback, we really appreciate "
               + "you helping us improve the office.";
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
      message.set("accountId", parseTwilioAccount.id);
      message.set("to", parseTwilioAccount.get("phoneNumber"));
      return message;
    },
    FactoryReply: function(customerNumber, text)
    {
      var message = new OutboundMessage();
      message.set("treeIndex", "customReply");
      message.set("msgText", text);
      message.set("to", customerNumber);
      return message;
    }
  }
);
/* end Model OutboundMessage */

/**
 * Model class IncomingMessage
 * This class describes a IncomingMessage entry in the Parse App.
 * It simply extends the Parse.Object object with no method
 * descriptions as of now.
 **/
var IncomingMessage = Parse.Object.extend("IncomingMessage",
  {},
  {}
);
/* end Model IncomingMessage */

/**
 * Model class FeedbackDiscussion
 * This class describes a FeedbackDiscussion entry in the Parse App.
 * It simply extends the Parse.Object object with no method
 * descriptions as of now.
 **/
var FeedbackDiscussion = Parse.Object.extend("FeedbackDiscussion",
  {},
  {}
);
/* end Model FeedbackDiscussion */

/**
 * Model class ScheduledFeedback
 * This class describes a ScheduledFeedback entry in the Parse App.
 * It simply extends the Parse.Object object with no method
 * descriptions as of now.
 **/
var ScheduledFeedback = Parse.Object.extend("ScheduledFeedback",
  {},
  {}
);
/* end Model ScheduledFeedback */

/**
 * Model class FeedbackService
 * This class describes a FeedbackService Object in the Parse App.
 * Static methods implemented include:
 * delegateService, answerToYesNo, answerThanks, answerFeedback.
 * The method delegateService should be called to process the feedback
 * described by an IncomingMessage entry and a FeedbackDiscussion entry.
 * The delegateService function will check the discussion state and
 * interpret the IncomingMessage entry to know how to handle.
 **/
var FeedbackService = Parse.Object.extend("FeedbackService",
  {},
  {
    scheduleFeedback: function(twilioAccount, twilioNumber, callback)
    {
      var schedule = new ScheduledFeedback();
      schedule.set("twilioAccount", twilioAccount);
      schedule.set("twilioNumber", twilioNumber);
      schedule.set("isProcessed", false);
      schedule.save(null, {
        success: function(schedule)
        {
          callback(schedule);
        }
      });
    },
    sendRequests: function(scheduledRequests, callback)
    {
      if (! scheduledRequests || ! scheduledRequests.length)
        // DONE job
        return callback();

      request = scheduledRequests.shift();
      var remainingScheduled = scheduledRequests;

      var scheduledFeedback = request;
      var dateScheduled     = new Date(scheduledFeedback.get("createdAt"));
      var twilioAccount     = scheduledFeedback.get("twilioAccount");
      var twilioNumber      = scheduledFeedback.get("twilioNumber");

      // check dateScheduled, if its older than 15 minutes
      // then we can send the Feedback Request.
      var shouldSendTime = dateScheduled.getTime() + (15*60000);
      var nowTime = (new Date()).getTime();
      if (nowTime < shouldSendTime)
        // the current feedback request is not old enough, should
        // not be sent now, go ahead with remainingScheduled.
        return FeedbackService.sendRequests(remainingScheduled, callback);

      FeedbackService.requestFeedback(twilioAccount, twilioNumber, scheduledFeedback, remainingScheduled,
        function(remainingScheduled) { FeedbackService.sendRequests(remainingScheduled, callback); });
    },
    requestFeedback: function(twilioAccount, twilioNumber, scheduledFeedback, remainingScheduled, callback)
    {
      // when the feedback is sent, save the
      // ScheduledFeedback entry to be processed.
      scheduledFeedback.set("isProcessed", true);
      scheduledFeedback.set("dateSent", new Date());
      scheduledFeedback.save(null, {
      success: function(scheduledFeedback)
      {
        var outbound1 = OutboundMessage.Factory(twilioAccount, "first");
        outbound1.set("from", twilioNumber.get("phoneNumber"));
        outbound1.set("accountSid", 'AC89bea12cb6782b72bc47f37999953b2f');
        outbound1.save({
        success: function(outbound1) {
          var outbound2 = OutboundMessage.Factory(twilioAccount, "second");
          outbound2.set("from", twilioNumber.get("phoneNumber"));
          outbound2.set("accountSid", 'AC89bea12cb6782b72bc47f37999953b2f');
          outbound2.save({
          success: function(outbound2) {
            outbound1.send(function(err_txt1, txt1) {
              outbound2.send(function(err_txt2, txt2) {
                var discussion = new FeedbackDiscussion();
                discussion.set("numberId", twilioNumber.id);
                discussion.set("accountId", twilioAccount.id);
                discussion.set("twilioNumber", twilioNumber.get("phoneNumber"));
                discussion.set("customerNumber", twilioAccount.get("phoneNumber"));
                discussion.set("state", 2);
                discussion.save({
                success: function(discussion) {
                  console.log("Saved FeedbackDiscussion: " + discussion.id);
                  callback(remainingScheduled);
                },
                error:function(err, discussion) { console.log("Could not save discussion: " + err.message); }});
              });
            });
          },
          error:function(err, outbound2) { console.log("Could not save outbound2: " + err.message); }});
        },
        error:function(err, outbound1) { console.log("Could not save outbound1: " + err.message); }});
      },
      error:function(err, scheduledFeedback) { console.log("Could not update ScheduledFeedback: " + err.message); }});
    },
    delegateService: function(incomingMessage, feedbackDiscussion, callback)
    {
      var customerNumber = incomingMessage.get("from");
      var twilioNumber   = incomingMessage.get("to");
      var msgText        = incomingMessage.get("body");
      var feedbackState  = feedbackDiscussion.get("state");
      var accountId      = feedbackDiscussion.get("accountId");
      var numberId       = feedbackDiscussion.get("numberId");

      var account = new Parse.Query(TwilioAccount);
      account.get(accountId, {
      success: function(twilioAccount)
      {
        var twilioNumber = new Parse.Query(TwilioNumber);
        twilioNumber.get(numberId, {
        success: function(twilioNumber)
        {
          switch (feedbackState) {
          // state 2 is after sending Welcome SMSs (/startTree)
          default:
          case 2:
            return FeedbackService.answerToYesNo(twilioAccount, twilioNumber,
                    incomingMessage, feedbackDiscussion, callback);

          // No interpretation needed anymore, simply Thank
          // the customer
          case 3:
          case 4:
            return FeedbackService.answerThanks(twilioAccount, twilioNumber,
                    incomingMessage, feedbackDiscussion, callback);

          // Discussion initiated by the customer, thank
          // him for the feedback.
          case 0:
            return FeedbackService.answerFeedback(twilioAccount, twilioNumber,
                    incomingMessage, feedbackDiscussion, callback);
          }
        },
        error: function(error) {
        }});
      },
      error: function(err)
      {
      }});
    },
    answerToYesNo: function(twilioAccount, twilioNumber, incomingMessage, feedbackDiscussion, callback)
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
      outbound1.set("accountSid", 'AC89bea12cb6782b72bc47f37999953b2f');
      outbound1.save({
      success:function (outbound1) {
        if (outboundType1 != "unsupported") {
          var outbound2 = OutboundMessage.Factory(twilioAccount, outboundType2);
          outbound2.set("from", feedbackDiscussion.get("twilioNumber"));
          outbound2.set("accountSid", 'AC89bea12cb6782b72bc47f37999953b2f');
          outbound2.save({
          success:function(outbound2) {
            // NEXT STATE
            feedbackDiscussion.set("state", 3);
            feedbackDiscussion.save();

            outbound1.send(function() {
              outbound2.send(callback);
            });
          }});
        }
        else
          // no need for state change when anything
          // else than yes/no is received.
          // waiting until next receive to potentially
          // interpret a correct Yes/No.
          return outbound1.send(callback);
      }});
    },
    answerThanks: function(twilioAccount, twilioNumber, incomingMessage, feedbackDiscussion, callback)
    {
      var accountId = feedbackDiscussion.get("accountId");
      var msgText   = incomingMessage.get("body");
      var outboundType1 = "feedback-first";
      var outboundType2 = "feedback-second";

      var outbound1 = OutboundMessage.Factory(twilioAccount, outboundType1);
      outbound1.set("from", feedbackDiscussion.get("twilioNumber"));
      outbound1.set("accountSid", 'AC89bea12cb6782b72bc47f37999953b2f');
      outbound1.save({
      success: function(outbound1) {
        var outbound2 = OutboundMessage.Factory(twilioAccount, outboundType2);
        outbound2.set("from", feedbackDiscussion.get("twilioNumber"));
        outbound2.set("accountSid", 'AC89bea12cb6782b72bc47f37999953b2f');
        outbound2.save({
        success: function(outbound2) {
          // NEXT STATE - Discusion DONE
          feedbackDiscussion.set("state", 4);
          feedbackDiscussion.save();

          outbound1.send(function() {
            outbound2.send(callback);
          });
        }});
      }});
    },
    answerFeedback: function(twilioAccount, twilioNumber, incomingMessage, feedbackDiscussion, callback)
    {
      var accountId = feedbackDiscussion.get("accountId");
      var msgText   = incomingMessage.get("body");
      var outboundType1 = "feedback-first";
      var outboundType2 = "feedback-second";

      var outbound1 = OutboundMessage.Factory(twilioAccount, outboundType1);
      outbound1.set("from", feedbackDiscussion.get("twilioNumber"));
      outbound1.set("accountSid", 'AC89bea12cb6782b72bc47f37999953b2f');
      outbound1.save({
      success: function(outbound1) {
        var outbound2 = OutboundMessage.Factory(twilioAccount, outboundType2);
        outbound2.set("from", feedbackDiscussion.get("twilioNumber"));
        outbound2.set("accountSid", 'AC89bea12cb6782b72bc47f37999953b2f');
        outbound2.save({
        success: function(outbound2) {
          // NO FEEDBACK STATE CHANGE
          // CUSTOMER INITIATED DISCUSSION
          //feedbackDiscussion.set("state", 4);
          //feedbackDiscussion.save();

          outbound1.send(function() {
            outbound2.send(callback);
          });
        }});
      }});
    },
    sendReplyTo: function(incomingMessage, feedbackDiscussion, replyMessage, callback)
    {
      var accountId  = feedbackDiscussion.get("accountId");
      var custNumber = feedbackDiscussion.get("customerNumber");
      var feedNumber = feedbackDiscussion.get("twilioNumber");
      var outboundMessage = OutboundMessage.FactoryReply(custNumber, replyMessage);
      outboundMessage.set("from", feedNumber);
      outboundMessage.set("accountId", accountId);
      outboundMessage.set("accountSid", 'AC262f226d31773bd3420fbae7241df466');
      outboundMessage.save(null, {
      success: function(outboundMessage) {
        incomingMessage.set("replyMessage", outboundMessage);
        incomingMessage.save(null, {
        success:function(incomingMessage) {
          outboundMessage.send(callback);
        },
        error: function(err, incomingMessage) { console.log("Could not save incomingMessage.replyMessage: " + err.message); }});
      },
      error:function(err, outboundMessage) { console.log("Could not save reply outboundMessage: " + err.message); }});
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
Parse.Object.registerSubclass("ScheduledFeedback", ScheduledFeedback);
Parse.Object.registerSubclass("FeedbackService", FeedbackService);

/*******************************************************************************
 * Parse CloudCode Functions definition for TwilioTreeBot
 * @link https://twiliotreebot.parseapp.com
 *******************************************************************************/

/**
 * The ping Parse CloudCode Functions simply response with
 * a "pong" message and a timestamp.
 * This Function can be used to check the API availability.
 **/
Parse.Cloud.define("ping", function(request, response)
{
  response.success({ping: "pong", timestamp: new Date()});
});

/**
 * The createNumber Parse CloudCode Function checks for an available
 * twilio account with the user's officeName. If none was created
 * before we create one here.
 * After the Twilio Subaccount creation we can create a new number
 * at twilio. This is the number that will be used for all feedback
 * of the currentUser !
 **/
Parse.Cloud.define("createNumber", function(request, response)
{
  var userId= "undefined" != typeof request.params.userId ?
          request.params.userId : "";
  var userArea= "undefined" != typeof request.params.userArea ?
          request.params.userArea : "";
  var country = "undefined" != typeof request.params.country ?
          request.params.country : "US";

  /**
   * The createNumber function will attempt to create
   * a Twilio phone number using the userArea parameter.
   * A call to the CloudCode Function validateAreaCode
   * MUST be initiated before you call this createNumber
   * function.
   *
   * @param   twilioClient.accounts Object  accountAtTwilio
   * @param   string                        userArea
   * @param   callable                      callback
   * @throws  string on error.
   **/
  var createNumber = function(accountAtTwilio, userArea, country, callback)
  {
    // @see https://www.parse.com/docs/js/guide#config
    // @see https://www.twilio.com/docs/api/rest/available-phone-numbers#local-get

    // current() can be called because get() was called
    // before this function is executed.
    var config    = Parse.Config.current();
    var apiClient = new require('twilio')(config.get("twilioAccountSID"), config.get("twilioAccountToken"));
    apiClient.availablePhoneNumbers(country)
                .local.list({
      AreaCode: userArea,
      SmsEnabled: true,
      ExcludeAllAddressRequired: true
    },
    function(err, searchResults) {
      if (err)
        // general Twilio API error.
        throw("Message : " + err.message);

      if (! searchResults.availablePhoneNumbers
          ||searchResults.availablePhoneNumbers.length < 1)
        // should never come here because /validateAreaCode
        // is called before !
        throw("Message : No numbers found with that area code");

      var testingPurchaseNumber = searchResults.availablePhoneNumbers[0];

      apiClient.incomingPhoneNumbers.create({
        PhoneNumber: testingPurchaseNumber.phoneNumber,
        SmsUrl: "https://twiliotreebot.parseapp.com/handleFeedback?tree=" + testingPurchaseNumber.phoneNumber,
        SmsMethod: "POST"
      },
      function(err, purchasedNumber) {

        if (err)
          // phone number purchase error at Twilio API endpoint.
          throw("Message : " + err.message);

        newPhoneNumber = purchasedNumber.phoneNumber;

        var parseTwilioNumber = new TwilioNumber();
        parseTwilioNumber.set("userId", userId);
        parseTwilioNumber.set("numberSid", purchasedNumber.sid);
        parseTwilioNumber.set("accountSid", 'AC89bea12cb6782b72bc47f37999953b2f');
        parseTwilioNumber.set("phoneNumber", newPhoneNumber);
        parseTwilioNumber.save(null, {
          success: function(parseTwilioNumber)
          {
            // number created at Twilio and TwilioNumber
            // entry saved in our Parse App.
            callback(parseTwilioNumber);
          }
        });
      }); /* end twilioClient.incomingPhoneNumbers callback */
    }); /* end apiClient.availablePhoneNumbers callback */
  };

  // Create the user account at twilio
  // then create a Number and link to user.
  var query = new Parse.Query(Parse.User);
  query.get(userId, {
    success: function(currentUser)
    {
      Parse.Config.get().then(
        function(config)
        {
          var twilioClient = require("twilio")(
            config.get("twilioAppSID"),
            config.get("twilioAppToken"));

          twilioClient.accounts.list({
            friendlyName: currentUser.get("officeName")
          },
          function(err, data) {
            var officeName = currentUser.get("officeName");
            if (data && data.account && data.accounts.length) {
              // account with this friendlyName already exists !
              response.error("Office Name '" + officeName + "' already exists.");
            }
            else {
              // now create SUBaccount.
              twilioClient.accounts.create(
                {friendlyName: officeName},
                function(err, twilioAccount) {
                  // Subaccount successfully created, will now
                  // create a Phone Number at Twilio and save
                  // it as a TwilioNumber instance in our Parse app.
                  try {
                    createNumber(twilioAccount, userArea, country,
                      function(twilioNumber)
                      {
                        response.success({"twilioNumber": twilioNumber});
                      });
                  }
                  catch (e) { response.error("Could not create number: " + e) };
                });
            }
          }); /* end twilio call accounts.list */
        },
        function(error) {});
    },
    error: function(error) {
      response.error("User account ID '" + userId + "' not found.");
    }
  });
});

/**
 * The validateAreaCode CloudCode Function will response with
 * an error in case no phone numbers are available for the given
 * area code.
 * This Function MUST be called before initiating a call to the
 * createNumber Function.
 **/
Parse.Cloud.define("validateAreaCode", function(request, response)
{
  var code = "undefined" != typeof request.params.userArea ?
          request.params.userArea : "";
  var country = "undefined" != typeof request.params.country ?
          request.params.country : "US";

  // Check for available phone numbers in
  // the given Area code.
  // @see https://www.twilio.com/docs/api/rest/available-phone-numbers#local-get
  Parse.Config.get().then(
    function(config) {
      var apiClient = new require('twilio')(config.get("twilioAccountSID"), config.get("twilioAccountToken"));
      apiClient.availablePhoneNumbers(country)
                  .local.list({
        AreaCode: code,
        SmsEnabled: true,
        ExcludeAllAddressRequired: true
      },
      function(err, searchResults) {

        if (err)
          // general Twilio API error
          response.error(err.message);

        else if (! searchResults.availablePhoneNumbers
            || searchResults.availablePhoneNumbers.length < 1)
          // no phone numbers available for area code.
          response.error("No numbers found with that area code");

        else if (searchResults.availablePhoneNumbers.length >= 1)
          // OK
          response.success({"result": true, "errorMessage": false});
      }); /* end apiClient.availablePhoneNumbers callback */
    },
    function(error) {});
});

/**
 * The syncAccount CloudCode Function will create a TwilioAccount
 * entry on the Parse App OR reatrieve its data.
 * This method can be used to retrieve a TwilioAccount by its
 * phoneNumber and userId fields.
 **/
Parse.Cloud.define("syncAccount", function(request, response)
{
  var name  = "undefined" != typeof request.params.firstName ?
          request.params.firstName : "";
  var phone = "undefined" != typeof request.params.phoneNumber ?
          request.params.phoneNumber : "";
  var url   = "undefined" != typeof request.params.url ?
          request.params.url : "";
  var userId= "undefined" != typeof request.params.userId ?
          request.params.userId : "";
  var userArea= "undefined" != typeof request.params.userArea ?
          request.params.userArea : "";

  if (!name.length || !phone.length)
    response.error("Fields firstName and phoneNumber are mandatory !");

  phone = phone[0] == '+' ? phone : ("+" + phone);
  url   = !url.match(/^http(s)?:/) ? "http://" + url : url;

  // if account already exists, query for it
  // and send the account in the response
  var query = new Parse.Query(TwilioAccount);
  query.equalTo("firstName", name);
  query.equalTo("phoneNumber", phone);
  query.equalTo("userId", userId);
  query.first({
  success: function(twilioAccount)
  {
    if (twilioAccount)
      // customer account exists
      response.success({"twilioAccount": twilioAccount});
    else {
      // customer account must be created
      // first we need to shorten the URL

      bitly.initializeWithOAuthToken("0df98d6f217bae3675e1c3b817e64e9eb69efb4d");
      bitly.shortenUrl({longUrl: url}, {
        success: function(shortUrl) {
          var account = new TwilioAccount();
          account.set("firstName", name);
          account.set("phoneNumber", phone);
          account.set("userId", userId);
          account.set("url", shortUrl);

          // save Parse App TwilioAccount
          account.save(null, {
          success: function(act) {
            response.success({"twilioAccount": act});
          },
          error: function(act, error) {
            response.error(error.message);
          }});
        },
        error: function(error) {
          console.log("Could not shorten URL: " + error);
        }
      });
    }
  }});
});

/**
 * The startTree CloudCode Function will initiate a FeedbackDiscussion
 * between a TwilioNumber and TwilioAccount. One TwilioNumber is always
 * assigned to only one Parse.User but can have multiple
 * FeedbackDiscussion entries with multiple TwilioAccount entries.
 **/
Parse.Cloud.define("startTree", function(request, response)
{
  var accountId = "undefined" != typeof request.params.accountId ?
              request.params.accountId : "";
  var userAreaCode = "undefined" != typeof request.params.userAreaCode ?
              request.params.userAreaCode : "";
  var userId = "undefined" != typeof request.params.userId ?
              request.params.userId : "";

  // when the entity is loaded we are up to sending
  // the first SMS of the decision tree. (and start a discussion)
  var query = new Parse.Query(TwilioAccount);
  query.get(accountId, {
    success: function(parseTwilioAccount) {
      var number   = new TwilioNumber();
      number.set("userId", userId);

      // sync number with twilio sub account outgoingCallerIds
      // then send SMS (and update outbound message entity)
      number.sync(function(parseTwilioNumber, needPurchase)
      {
        // we can directly send the SMS, a TwilioNumber entry
        // was already present in the database.
        try {
          FeedbackService.scheduleFeedback(parseTwilioAccount, parseTwilioNumber,
            function(scheduledFeedback) {
            // feedback request SCHEDULED !
              response.success({
                "twilioNumber": parseTwilioNumber,
                "twilioAccount": parseTwilioAccount,
                "scheduledFeedback": scheduledFeedback,
                "errorMessage": false
              });
            });
        }
        catch (e) {
          // Error occured when trying to send SMS
          response.success({
            "errorMessage": "(Send Feedback) " + e
          });
        }
      }); /* end number.sync() callback */
    },
    error: function(error) {
      response.success({
        "errorMessage": "(Session) " + error.message
      });
    }
  }); /* end query.get(accountId) block */
});

/**
 * The handleTree CloudCode Function describes the SMS receiver.
 * This function MUST be called by the SMS receiver app in order
 * to handle the Feedback message received.
 **/
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

  customerNumber = customerNumber[0] == '+' ? customerNumber : ("+" + customerNumber);
  twilioNumber   = twilioNumber[0] == '+' ? twilioNumber : ("+" + twilioNumber);

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
        // feedbackDiscussion could not be identified.

        // TwilioNumber contains data about User (userId)
        // and numberId (for the discussion)
        var theNumber = new Parse.Query(TwilioNumber);
        theNumber.equalTo("phoneNumber", twilioNumber);
        theNumber.first({
        success: function(theNumber)
        {
          var userId   = theNumber.get("userId");
          var numberId = theNumber.id;

          // load the User to be able to set a URL
          // on the TwilioAccount which we will be saving.
          var theUser = new Parse.Query(Parse.User);
          theUser.get(userId, {
          success: function(theUser)
          {
            // Customer could not be identified
            // need to create new TwilioAccount
            var account = new TwilioAccount();
            account.set("firstName", "No Name");
            account.set("phoneNumber", customerNumber);
            account.set("userId", userId);
            account.set("url", theUser.get("defaultURL"));
            account.save({
            success:function(twilioAccount)
            {
              // can now save the FeedbackDiscussion
              var discussion = new FeedbackDiscussion();
              discussion.set("accountId", twilioAccount.id);
              discussion.set("numberId", numberId);
              discussion.set("twilioNumber", twilioNumber);
              discussion.set("customerNumber", customerNumber);
              discussion.set("state", 0);
              discussion.save({
              success: function(feedbackDiscussion)
              {
                incoming.set("discussionId", feedbackDiscussion.id);
                incoming.set("customerName", "No Name");
                incoming.save();

                // send OutboundMessage according to interpreted
                // IncomingMessage entry.
                FeedbackService.delegateService(incoming, feedbackDiscussion,
                function(err, text, outboundMessage)
                {
                  if (text && outboundMessage)
                      response.success({
                        "result": true,
                        "errorMessage": false
                      });
                  else
                      response.success({
                        "result": false,
                        "errorMessage": err.message
                      });
                });
              }}); /* end save discussion */
            }}); /* end save account */
          }}); /* end theUser.get() */
        }}); /* end theNumber.first() */
      }
      else {
        // feedbackDiscussion identified.
        // load account by ID then set discussionId
        // and customerName on IncomingMessage entry.
        var twilioAccount = new Parse.Query(TwilioAccount);
        twilioAccount.get(feedbackDiscussion.get("accountId"), {
        success: function(twilioAccount)
        {
          incoming.set("discussionId", feedbackDiscussion.id);
          incoming.set("customerName", twilioAccount.get("firstName"));
          incoming.save();

          FeedbackService.delegateService(incoming, feedbackDiscussion,
          function(err, text, outboundMessage)
          {
            if (text && outboundMessage)
              response.success({
                "result": true,
                "errorMessage": false
              });
            else
              response.success({
                "result": false,
                "errorMessage": err.message
              });
          });
        }});
      }
    },
    error: function(err) {
      response.success({
        "result": false,
        "errorMessage": err.message
      });
    }
  });
});

/**
 * The listFeedback CloudCode Function describes the Feedback getter.
 * This function can be called to retrieve a list of IncomingMessage
 * for the given userId.
 * The list is ordered by DESCENDING date of creation.
 **/
Parse.Cloud.define("listFeedback", function(request, response)
{
    var userId = "undefined" != typeof request.params.userId ?
                request.params.userId : "";

    // validate userId by loading Parse.User
    // then load IncomingMessage entries
    var currentUser = new Parse.Query(Parse.User);
    currentUser.get(userId, {
    success: function(currentUser)
    {
      if (! currentUser)
        response.error("Invalid userId provided.");
      else {
        var myMessages = new Parse.Query(IncomingMessage)
        myMessages.equalTo("to", currentUser.get("twilioPhoneNumber"));
        myMessages.descending("createdAt");
        myMessages.find({
          success: function(myMessages)
          {
            if (! myMessages)
              myMessages = [];

            response.success({
              "myMessages": myMessages
            });
          }
        });
      }
    },
    error: function(error)
    {
        response.error("User could not be loaded: " + error.message);
    }});
});

/**
 * cancelSubscription CloudCode Function
 * This function is used to CANCEL a user subscription on Stripe.
 * Since this means that the user will not pay anymore, access to
 * the App should be blocked upon call of this function.
 * the TwilioNumber entry linked to the given userId is deleted.
 * the IncomingPhoneNumber entry AT TWILIO is also deleted to prevent
 * your master account to pay for the number.
 **/
Parse.Cloud.define("cancelSubscription", function(request, response)
{
    var userId = "undefined" != typeof request.params.userId ?
                request.params.userId : "";
    var userToken = "undefined" != typeof request.params.userToken ?
                request.params.userToken : "";

    // we need to "become" the user because we will
    // update some data of it after all cancelling
    // tasks are done.
    Parse.User.become(userToken).then(
    function(currentUser)
    {
      // currentUser now contains the BROWSER's logged in user.
      // Parse.User.current() will now return the browsers user as well.
      twilioNumber = new Parse.Query(TwilioNumber);
      twilioNumber.equalTo("userId", currentUser.id);
      twilioNumber.descending("createdAt");
      twilioNumber.first({
      success: function(twilioNumber) {
        // load config for initiating Stripe and Twilio
        // REST API requests.
        Parse.Config.get().then(
        function(parseConfig)
        {
          whichKey     = parseConfig.get("whichStripeKey"); // "stripeTest" or "stripeLive"
          stripeApiKey = parseConfig.get(whichKey + "SecretKey");
          apiUrl    = "https://" + stripeApiKey + ":@api.stripe.com/v1";
          cancelUrl = apiUrl + "/customers/" + currentUser.get("stripeCustomerId")
                    + "/subscriptions/" + currentUser.get("stripeSubscriptionId");

          deleteNumberUrl = "https://" + parseConfig.get("twilioAppSID") + ":"
                          + parseConfig.get("twilioAppToken") + "@api.twilio.com/2010-04-01"
                          + "/Accounts/" + parseConfig.get("twilioAccountSID")
                          + "/IncomingPhoneNumbers/" + twilioNumber.get("numberSid");

          // first delete subscription at Stripe
          // then delete number at Twilio
          // @see https://stripe.com/docs/api#cancel_subscription
          // @see https://www.twilio.com/docs/api/rest/incoming-phone-numbers
          Parse.Cloud.httpRequest({
            method: "DELETE",
            url: cancelUrl,
            body: {}
          }).then(
          function(httpRequest)
          {
            // update user data, will be considered UNSUBSCRIBED
            currentUser.set("isActive", false);
            currentUser.unset("stripeSubscriptionId");
            currentUser.unset("twilioPhoneNumber");
            currentUser.unset("activeUntil");
            currentUser.save(null, {
            success:function(currentUser) {
              // now delete number at Twilio
              Parse.Cloud.httpRequest({
                method: "DELETE",
                url: deleteNumberUrl,
                body: {}
              }).then(
              function(httpRequest)
              {
                /* remove TwilioNumber entry from Parse db*/
                twilioNumber.destroy({
                  success:function(twilioNumber)
                  {
                    // done cancelling subscription, return the
                    // updated user object to the App.
                    response.success({
                      "result": true,
                      "currentUser": currentUser});
                  }
                });
              },
              function(httpRequest)
              {
                var object = JSON.parse(httpRequest.text);
                console.log("Error deleting number: " + object.error.message);
                response.error(object.error.message);
              });
            }});
          },
          function(httpRequest)
          {
            var object = JSON.parse(httpRequest.text);
            console.log("Error cancelling subscription: " + object.error.message);
            response.error(object.error.message);
          });
        });
      }});
    },
    function(error) {
      // not logged in
      console.log("Error becoming User: " + error.message);
      response.error(error.message);
    });
});


/**
 * listCancelledAccounts CloudCode Function
 * This function can be called to retrieve a list of Parse.User
 * entries for which the subscription are not active anymore.
 **/
Parse.Cloud.define("listCancelledAccounts", function(request, response)
{
    // validate userId by loading Parse.User
    // then load IncomingMessage entries
    var cancelledUsers = new Parse.Query(Parse.User);
    cancelledUsers.equalTo("isActive", false);
    cancelledUsers.equalTo("doneTwilioDelete", false);
    cancelledUsers.find({
    success: function(cancelledUsers)
    {
      response.success({"cancelledUsers": cancelledUsers});
    }});
});

/**
 * The replyTo CloudCode Function describes the Feedback SENDER.
 * This function can be called to REPLY to an entry of IncomingMessage.
 **/
Parse.Cloud.define("replyTo", function(request, response)
{
  var userId     = "undefined" != typeof request.params.userId ?
                  request.params.userId : "";
  var incomingId = "undefined" != typeof request.params.incomingId ?
                  request.params.incomingId : "";
  var discussionId = "undefined" != typeof request.params.discussionId  ?
                  request.params.discussionId  : "";
  var replyMessage = "undefined" != typeof request.params.message ?
                  request.params.message : "";

  // validate userId by loading Parse.User
  // then load IncomingMessage entries
  var currentUser = new Parse.Query(Parse.User);
  currentUser.get(userId, {
  success: function(currentUser)
  {
    if (! currentUser)
      response.error("Invalid userId provided.");
    else {
      var theDiscussion = new Parse.Query(FeedbackDiscussion);
      theDiscussion.get(discussionId, {
      success: function(theDiscussion)
      {
        if (! theDiscussion)
          response.error("Wrong discussionId provided.");
        else {
          var theIncoming = new Parse.Query(IncomingMessage);
          theIncoming.get(incomingId, {
          success: function(theIncoming)
          {
            // now send the reply
            FeedbackService.sendReplyTo(theIncoming, theDiscussion, replyMessage, function()
              {
                response.success({"result": true});
              });
          }});
        }
      }});
    }
  },
  error: function(error)
  {
      response.error("User could not be loaded: " + error.message);
  }});
});

/**
 * requestFeedback Background Job
 * This job should check for ScheduledFeedback entries which have
 * not yet been treated AND were created 15 minutes ago (minimum).
 **/
Parse.Cloud.job("requestFeedback", function(request, status)
{
  var scheduledRequests = new Parse.Query(ScheduledFeedback);
  scheduledRequests.equalTo("isProcessed", false);
  scheduledRequests.include("twilioAccount");
  scheduledRequests.include("twilioNumber");
  scheduledRequests.find({
    success: function(scheduledRequests)
    {
      if (! scheduledRequests || ! scheduledRequests.length)
        status.success("Nothing to do");
      else {
        var msg = "Found " + scheduledRequests.length + " unprocessed Feedback Requests!";

        FeedbackService.sendRequests(scheduledRequests, function()
          {
            status.success(msg);
          });
      }
    }
  });
});

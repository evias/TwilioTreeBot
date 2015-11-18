
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

// PROD
var twilioClient = require('twilio')("SK97f43df947e6c514eaa80dc86652e5bf", "xF3zO4BLZFeHNed63dqVi7hSaTL7WpD3");

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
    requestFeedback: function(twilioAccount, twilioNumber, callback)
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
          outbound1.send(function() {
            outbound2.send(function() {
              var discussion = new FeedbackDiscussion();
              discussion.set("numberId", twilioNumber.id);
              discussion.set("accountId", twilioAccount.id);
              discussion.set("twilioNumber", twilioNumber.get("phoneNumber"));
              discussion.set("customerNumber", twilioAccount.get("phoneNumber"));
              discussion.set("state", 2);
              discussion.save({
              success: function(discussion) {
                callback(discussion, outbound1, outbound2);
              }});
            });
          });
        }});
      }});
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
    // @see https://www.twilio.com/docs/api/rest/available-phone-numbers#local-get
    var apiClient   = new require('twilio')("AC89bea12cb6782b72bc47f37999953b2f", "89f842387581a640d48a7e4fea362888");
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
          // now create account.
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
  var apiClient   = new require('twilio')("AC89bea12cb6782b72bc47f37999953b2f", "89f842387581a640d48a7e4fea362888");
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

  var createAccount = function(userId, name, phone, url, callback)
  {
    var account = new TwilioAccount();
    account.set("firstName", name);
    account.set("phoneNumber", phone);
    account.set("userId", userId);
    account.set("url", url);

    // save Parse App TwilioAccount
    // then sync with Twilio's subaccount (or create)
    // then save Twilio's SID in Parse App TwilioAccount entity
    account.save(null, {
      success: function(act) {
        callback(act);
      },
      error: function(act, error) {
        throw("Could not save account. Error: " + error);
      }
    });
  }

  // if account already exists, query for it
  // and send the account in the response
  var query = new Parse.Query(TwilioAccount);
  query.equalTo("phoneNumber", phone);
  query.equalTo("userId", userId);
  query.first({
    success: function(twilioAccount)
    {
      if (twilioAccount)
        response.success({"twilioAccount": twilioAccount});
      else {
        try {
          createAccount(userId, name, phone, url,
            function(twilioAccount)
            {
              response.success({"twilioAccount": twilioAccount});
            });
        }
        catch (e) { response.error(e) };
      }
    },
    error: function(error)
    {
      console.log("Error: " + error);
      try {
        createAccount(userId, name, phone, url,
          function(twilioAccount)
          {
            response.success({"twilioAccount": twilioAccount});
          });
      }
      catch (e) { response.error(e) };
    }
  });
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
          FeedbackService.requestFeedback(parseTwilioAccount, parseTwilioNumber,
            function(feedbackDiscussion, outboundFirst, outboundSecond) {
            // SMS sent callback, feedback request SENT !
              response.success({
                "outboundMessages": [],
                "twilioNumber": parseTwilioNumber,
                "twilioAccount": parseTwilioAccount,
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

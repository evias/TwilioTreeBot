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
 * @subpackage Parse Hosting
 * @author Grégory Saive <greg@evias.be>
 * @license http://www.apache.org/licenses/LICENSE-2.0
 * @link https://twiliotreebot.parseapp.com
**/

express = require('express');
app = express();

app.set('views', 'cloud/views');
app.set('view engine', 'ejs');
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.cookieSession({
  name: "TwilioTreeBot",
  keys: [
    "ecd4f35e7eac39353dc36aadbb991e661825e995",
    "172fa97f8f3cffbbac9d790f8419172b0d3f8bd0",
    "7650561555d998d248f4f4a6633062ed1e13beea",
    "ed72d3cbbc69d59476629bd23e1ffcb669d461b8",
    "d5103d95852958ca1132fe8dbf453790f2c2f828"
  ],
  secret: "7fb8f76b280b5f2b26d7d77738c00590c7e2e839"}));

/*******************************************************************************
 * PRE-HTTP requests handlers for TwilioTreeBot
 * These functions act as Plugins to the HTTP handlers.
 * @link https://twiliotreebot.parseapp.com
 *******************************************************************************/

/**
 * Session management PRE-HTTP request handler.
 * This function will try to retrieve a valid session token
 * and call Parse.User.become() with it in order for Parse.User
 * method current() returns the correct request initiating user
 * object.
 **/
app.use(function(req, res, next)
{
    Parse.User
      .become(req.session.sessionToken ? req.session.sessionToken : "invalidSessionToken")
      .then(
        function(currentUser) {
          // currentUser now contains the BROWSER's logged in user.
          // Parse.User.current() for `req` will return the browsers user as well.

          // make sure user's Stripe subscription is still
          // active, if not needs re-subscribe


          next();
        },
        function(error) {
          // not logged in => will result in redirection to /signin
          next();
        });
});

/*******************************************************************************
 * HTTP GET requests handlers for TwilioTreeBot
 * @link https://twiliotreebot.parseapp.com
 *******************************************************************************/

/**
 * GET /
 * describes the homepage GET request.
 * this handler will render the authentication
 * template if no session is available or render
 * the homepage template for logged users.
 **/
app.get('/', function(request, response)
{
  var currentUser = Parse.User.current();
  if (! currentUser)
    response.redirect("/signin");
  else if (! currentUser.get("isActive"))
    response.redirect("/subscription");
  else {
    response.render('homepage', {
      "currentUser": currentUser,
      "errorMessage": false,
      "successMessage": false
    });
  }
});

/**
 * GET /sendRequest
 * always REDIRECTS to homepage.
 **/
app.get('/sendRequest', function(request, response)
{
  response.redirect("/");
});

/**
 * GET /signin
 * describes the signin GET request.
 * this handler will render the login view.
 **/
app.get('/signin', function(request, response)
{
  var currentUser = Parse.User.current();
  if (currentUser)
    response.redirect("/");
  else {
    response.render('login', {
      "currentUser": false,
      "errorMessage": false});
  }
});

/**
 * GET /signup
 * describes the signup GET request.
 * this handler will render the signup view.
 **/
app.get('/signup', function(request, response)
{
  var currentUser = Parse.User.current();
  if (currentUser)
    response.redirect("/");
  else {
    var formValues = {
      "username": "",
      "email": "",
      "office": "",
      "area": "",
      "country": ""
    };
    response.render('signup', {
      "currentUser": false,
      "formValues": formValues,
      "errorMessage": false});
  }
});

/**
 * GET /signout
 * describes the signout GET request.
 * this handler will redirect to the /signin
 **/
app.get('/signout', function(request, response)
{
  Parse.User.logOut();
  request.session = null;

  response.redirect("/signin");
});

/**
 * GET /terms-and-conditions
 * describes the terms & conditions GET request.
 * this handler will render the terms view.
 **/
app.get('/terms-and-conditions', function(request, response)
{
  var currentUser = Parse.User.current();
  if (! currentUser)
    currentUser = false;

  response.render('terms', {"currentUser": currentUser});
});

/**
 * GET /my-account
 * describes the my-account GET request.
 * this handler loads the currentUser's settings
 * and displays them in the settings views.
 **/
app.get('/my-account', function(request, response)
{
  var currentUser = Parse.User.current();
  if (! currentUser) {
    response.redirect("/signin");
  }
  else {

    var settings = {
      "officeName": currentUser.get("officeName"),
      "areaCode": currentUser.get("areaCode"),
      "phoneNumber": currentUser.get("twilioPhoneNumber"),
      "emailAddress": currentUser.get("username")};

    var errorMessage = request.query.errorMessage ? request.query.errorMessage : false;
    response.render('my-account', {
      "currentUser": currentUser,
      "settings": settings
    });
  }
});

/**
 * GET /my-feedback
 * describes the my-feedback GET request.
 * this handler loads the currentUser's feedback
 * received. (IncomingMessage dictionary)
 **/
app.get('/my-feedback', function(request, response)
{
  var currentUser = Parse.User.current();
  if (! currentUser) {
    response.redirect("/signin");
  }
  else {

    // load IncomingMessage entries linked to
    // currentUser.twilioPhoneNumber
    Parse.Cloud.run("listFeedback", {
      userId: currentUser.id
    }, {
      success: function (cloudResponse)
      {
        response.render('my-feedback', {
          "currentUser": currentUser,
          "myMessages": cloudResponse.myMessages
        });
      },
      error: function (cloudResponse)
      {
        response.send("Error: " + cloudResponse.message);
      }
    });
  }
});

/**
 * GET /subscription
 * describes the subscription GET request.
 * this handler offers the possible to select
 * a Plan for the App. Checkout is done using
 * Stripe.
 **/
app.get('/subscription', function(request, response)
{
  var currentUser = Parse.User.current();
  if (! currentUser) {
    response.redirect("/signin");
  }
  else {
    response.render("subscription", {
      "currentUser": currentUser,
      "errorMessage": false
    });
  }
});


/*******************************************************************************
 * HTTP POST requests handlers for TwilioTreeBot
 * @link https://twiliotreebot.parseapp.com
 *******************************************************************************/

/**
 * POST /signin
 * describes the signin POST request.
 * this handler is where we authenticate
 * a Parse.User session using the provided
 * signin form data.
 **/
app.post('/signin', function(request, response)
{
  var username = request.body.username;
  var password = request.body.password;

  currentUser  = Parse.User.logIn(username, password, {
    success: function(currentUser) {
      // user authentication credentials are OK, we can
      // now safely save the session token for this user
      // and finally redirect to the homepage.

      request.session.loggedState  = true;
      request.session.sessionToken = currentUser.getSessionToken();

      response.redirect("/");
    },
    error: function(currentUser, error) {
      request.session = null;

      response.render('login', {
        "currentUser": false,
        "errorMessage": error.message});
    }
  });
});

/**
 * POST /validateAreaCode
 * this POST handler checks for available
 * phone numbers for the given area code.
 * Parse CloudCode Function "validateAreaCode"
 * responses with an error if no available
 * numbers are found.
 **/
app.post("/validateAreaCode", function(request, response)
{
  var code = request.body.code;
  var country = request.body.country;

  Parse.Cloud.run("validateAreaCode", {
    userArea: code,
    country: country
  }, {
    success: function (cloudResponse)
    {
      response.send("OK");
    },
    error: function (cloudResponse)
    {
      response.send("Error: " + cloudResponse.message);
    }
  });
});

/**
 * POST /signup
 * describes the signup POST request.
 * this handler is where we register new
 * Parse.User entries and call the createNumber
 * Parse CloudCode Function.
 **/
app.post('/signup', function(request, response)
{
  var username = request.body.username;
  var email    = request.body.username;
  var password = request.body.password;
  var office   = request.body.office;
  var country  = request.body.country;
  var area     = request.body.area;

  var formValues = {
    "username": username,
    "email": email,
    "office": office,
    "area": area,
    "country": country
  };

  errors = [];
  if (!email || !email.length || !username || !username.length)
    errors.push("The Email adress may not be empty.");

  if (!password || !password.length)
    errors.push("The Password may not be empty.");

  if (!office || !office.length)
    errors.push("The Office name may not be empty.");

  if (!area || !area.length)
    errors.push("The Area code may not be empty.");

  if (!country || !country.length)
    errors.push("The Country may not be empty.");

  // check officeName unicity
  // field username is automatically unique due to
  // Parse.user.signUp function call.
  var query = new Parse.Query(Parse.User);
  query.equalTo("officeName", office);
  query.find({
    success: function(parseUsers)
    {
      if (parseUsers.length)
        // Error: Office name already taken
        errors.push("This office name is already taken.");

      if (errors.length)
        // refresh with error messages displayed
        response.render("signup", {
          "currentUser": false,
          "formValues": formValues,
          "errorMessage": errors.join(" ", errors)});
      else {
        // sign-up user !
        var currentUser = new Parse.User();
        currentUser.set("username", username);
        currentUser.set("email", email);
        currentUser.set("password", password);
        currentUser.set("officeName", office);
        currentUser.set("countryISO", country);
        currentUser.set("areaCode", area);

        currentUser.signUp(null, {
          success: function(currentUser) {
            // user registration was successfully done
            // we can now safely save the session token
            // and redirect the user to the homepage

            request.session.loggedState  = true;
            request.session.sessionToken = currentUser.getSessionToken();

            Parse.Cloud.run("createNumber", {
              userId: currentUser.id,
              userArea: currentUser.get("areaCode"),
              country: currentUser.get("countryISO")
            }, {
              success: function (cloudResponse)
              {
                var feedbackNumber = cloudResponse.twilioNumber.get("phoneNumber");
                currentUser.set("twilioPhoneNumber", feedbackNumber);
                currentUser.save(null, {
                  success: function(currentUser) {
                    response.redirect("/");
                  }
                });
              },
              error: function (error)
              {
                response.render('signup', {
                  "currentUser": false,
                  "formValues": formValues,
                  "errorMessage": error.message});
              }
            });
          },
          error: function(currentUser, error) {
            request.session = null;

            response.render('signup', {
              "currentUser": false,
              "formValues": formValues,
              "errorMessage": error.message});
          }
        });
      }
    }
  });
});

/**
 * POST /sendRequest
 * this handler describes the sendRequest POST request
 * which initiates Parse CloudCode function calls to
 * syncAccount and startTree. After this handler has
 * executed, a FeedbackDiscussion will have been created
 * and OutboundMessage entries sent to the TwilioAccount.
 **/
app.post('/sendRequest', function(request, response)
{
  var currentUser = Parse.User.current();
  if (! currentUser)
    // no session available => back to login
    response.redirect("/signin");
  else {
    // valid /sendRequest POST request, session is available.
    var firstName   = request.body.firstName;
    var phoneNumber = request.body.phoneNumber;
    var url         = request.body.url;
    var errors      = [];

    // simple input presence validation
    if (! firstName || ! firstName.length)
      errors.push("The customer name may not be empty.");

    if (! phoneNumber || ! phoneNumber.length) {
      errors.push("The customer phone number may not be empty.");
    }
    else if (phoneNumber[0] != '+' || phoneNumber[1] != '1')
      errors.push("The phone number must be in Format: +1###-###-####.");

    if (! url || ! url.length)
      errors.push("The URL may not be empty.");

    if (errors.length)
      // refresh with error messages displayed
      response.render("homepage", {
        "currentUser": currentUser,
        "errorMessage": errors.join(" ", errors),
        "successMessage": false
      });
    else {
      // VALID form input, we can now initiate the
      // Feedback Discussion, etc.

      // make sure next time currentUser.url is set.
      currentUser.set("defaultURL", url);
      currentUser.save();

      Parse.Cloud.run("syncAccount", {
        userId: currentUser.id,
        firstName: firstName,
        phoneNumber: phoneNumber,
        url: url,
        userArea: currentUser.get("areaCode")
      }, {
        success: function(cloudResponse)
        {
          // get TwilioAccount entry from response
          // then initiate /startTree API request.
          var twilioAccount = cloudResponse.twilioAccount;
          Parse.Cloud.run("startTree", {
            userId: currentUser.id,
            accountId: twilioAccount.id,
            userAreaCode: currentUser.get("areaCode")
          },
          {
            success: function(cloudResponse) {
              if (cloudResponse.errorMessage)
                response.render("homepage", {
                  "currentUser": currentUser,
                  "errorMessage": cloudResponse.errorMessage,
                  "successMessage": false
                });
              else {
                response.render("homepage", {
                  "currentUser": currentUser,
                  "errorMessage": false,
                  "successMessage": "Congratulations ! You have sent a Feedback "
                                  + "Request to your customer '" + twilioAccount.get("firstName") + "'."
                });
              }
            },
            error: function(error) {
              response.render("homepage", {
                "currentUser": currentUser,
                "errorMessage": error.message,
                "successMessage": false
              });
            }
          }); /* end Parse.Cloud.run("startTree") */
        },
        error: function(error)
        {
          // error happened on /syncAccount, we could not sync
          // the input data with a new TwilioAccount entry.
          // should never happen.
          response.render("homepage", {
            "currentUser": currentUser,
            "errorMessage": error.message,
            "successMessage": false
          });
        }
      }); /* end Parse.Cloud.run("syncAccount") */
    } /* end if (errors.length) block */
  } /* end if (!currentUser) block */
});

/**
 * POST /subscription
 * describes the subscription POST request.
 * this handler checks for input and a valid Stripe
 * token, then initiates a Strip Plan subscription.
 **/
app.post('/subscription', function(request, response)
{
  var currentUser = Parse.User.current();
  if (! currentUser) {
    response.redirect("/signin");
  }
  else {
    // valid /subscription POST request, session is available.
    var stripeToken = request.body.stripeToken;
    var stripeEmail = request.body.stripeEmail;
    var stripePlan  = request.body.stripePlan;
    var errors      = [];

    // input validation
    if (! stripeToken || ! stripeToken.length
        || ! stripeEmail || ! stripeEmail.length
        || ! stripePlan || ! stripePlan.length)
      errors.push("An error occured at Checkout. Please try again.");

    if (errors.length)
      // refresh with error messages displayed
      response.render("subscription", {
        "currentUser": currentUser,
        "errorMessage": errors.join(" ", errors)
      });
    else {
      // VALID form input, we can now initiate the
      // Stripe API call for plans subscriptions

      // get API key from config
      Parse.Config.get().then(
        function(config)
        {
          stripeApiKey = config.get("stripeTestSecretKey");
          apiUrl = "https://" + stripeApiKey + ":@api.stripe.com/v1";

          // first we need to create a Stripe CUSTOMER
          // then we can create a Stripe SUBSCRIPTION
          Parse.Cloud.httpRequest({
            method: "POST",
            url: apiUrl + "/customers",
            body: {
              source: stripeToken,
              email: stripeEmail,
              description: "Stripe Customer for " + stripeEmail + " (" + stripePlan + ")"
            }
          }).then(
            function(httpRequest)
            {
              var json   = httpRequest.text;
              var object = JSON.parse(json);
              var stripeCustomerId = object.id;

              // now we can initiate the SUBSCRIPTION creation
              Parse.Cloud.httpRequest({
                method: "POST",
                url: apiUrl + "/customers/" + stripeCustomerId + "/subscriptions",
                body: {
                  plan: stripePlan
                }
              }).then(
              function(httpRequest)
              {
                var create = new Date();
                var expire = new Date(new Date(create).setMonth(create.getMonth()+1));

                // save stripe data and redirect to homepage
                currentUser.set("stripeCustomerId", object.id);
                currentUser.set("stripeEmail", stripeEmail);
                currentUser.set("stripePlan", stripePlan);
                currentUser.set("isActive", true);
                currentUser.set("activeUntil", expire);
                currentUser.save(null, {
                  success:function(currentUser)
                  {
                    response.redirect("/");
                  }
                });
              },
              function(httpRequest)
              {
                var object = JSON.parse(httpRequest.text);
                response.render("subscription", {
                  "currentUser": currentUser,
                  "errorMessage": "Could not create Subscription at Stripe (Message: " + object.error.message + ")"
                });
              });
            },
            function(httpRequest)
            {
              var object = JSON.parse(httpRequest.text);
              response.render("subscription", {
                "currentUser": currentUser,
                "errorMessage": "Could not create Customer at Stripe (Message: " + object.error.message + ")"
              });
            });
        });
    }
  }
});

/**
 * POST /handleFeedback
 * This URL is called by Twilio when an Incoming Message
 * enters for one of the created subaccounts.
 * It initiates a handleTree CloudCode Function call
 * which will handle the incoming Feedback message and
 * send out OutboundMessage entries according to the
 * discussion state and incoming message.
 **/
app.post('/handleFeedback', function(request, response)
{
  var tree = request.query.tree;
  var from = request.body.From;
  var to   = request.body.To;
  var body = request.body.Body;

  if (! tree || ! from || ! to || ! body) {
    console.log("Missing mandatory Property for /handleFeedback.");
    response.error({"result": false, "errorMessage": "Missing mandatory Property for /handleFeedback."});
  }

  Parse.Cloud.run("handleTree", {
    From: from,
    To: to,
    Body: body,
    tree: tree
  }, {
    success: function(cloudResponse)
    {
      if (cloudResponse && !cloudResponse.result)
        response.send({
          "result": false,
          "errorMessage": "/handleTree Error: " + cloudResponse.errorMessage});
      else if (cloudResponse && cloudResponse.result)
        response.send({
          "result": true,
          "errorMessage": false});
      else
        response.send({
          "result": false,
          "errorMessage": "Unknown /handleFeedback Error Happened."});
    },
    error: function(error)
    {
      response.send({
        "result": false,
        "errorMessage": "/handleTree Error: " + error.message});
    }
  });
});

// Attach the Express app to Cloud Code.
app.listen();

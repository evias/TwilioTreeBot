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

app.use(function(req, res, next)
{
    Parse.User
      .become(req.session.sessionToken ? req.session.sessionToken : "invalidSessionToken")
      .then(
        function(currentUser) {
          // currentUser now contains the BROWSER's logged in user.
          // Parse.User.current() for `req` will return the browsers user as well.
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
  if (! currentUser) {
    response.redirect("/signin");
  }
  else {
    response.render('homepage', {
      "currentUser": currentUser,
      "errorMessage": false,
      "successMessage": false
    });
  }
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
    response.render('signup', {
      "currentUser": false,
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

// Attach the Express app to Cloud Code.
app.listen();

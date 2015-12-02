# [1.8.5](https://github.com/evias/TwilioTreeBot/compare/1.8.4...1.8.5)
* Bugfix: make sure stripeLive is used for customer creation
* Implement CloudCode function replyTo and add Reply button to Incoming
  Messages list.
* Bugfix subscription Stripe API key ; add error handling to sendReply.

# [1.8.4](https://github.com/evias/TwilioTreeBot/compare/1.8.3...1.8.4)

* Handle drop off: number at twilio should only be purchased upon successfull
  Stripe registration.

# [1.8.3](https://github.com/evias/TwilioTreeBot/compare/1.8.2...1.8.3)

* Improve logs for requestFeedback Job
* Implement FeedbackService.sendRequests to avoid synchronous loop
* Bugfix bitly call, make sure request scheme is included

# [1.8.0](https://github.com/evias/TwilioTreeBot/compare/1.7...1.8)

* Implement bit.ly API call for shortening office URL
* Remove Subscribe Now button: deprecated
* Implement Job requestFeedback ; implement Function listCancelledAccounts
* /subscription POST handler now also calls createNumber CloudCode function if
  user has cancelled subscription before.
* Implement CloudCode cancelSubscription function, also delete number using
  Twilio API.
* /subscription now auto-submits form after Stripe checkout

# [1.7.0](https://github.com/evias/TwilioTreeBot/compare/1.6...1.7)

* Bugfix subscription stripePlans being empty.
* Add Parse.Config 'whichStripeKey' to be 'stripeTest' or 'stripeLive'
* Refactor /my-account ; typo change on /subscription
* Implement Stripe /plans API call for /subscription & /my-account pages

# [1.6.0](https://github.com/evias/TwilioTreeBot/compare/1.5...1.6)

* Implement /cancel-subscription to cancel subscription at Stripe.
* Add feedback list to homepage ; redirect to homepage with error instead of
  rendering in /sendRequest
* Add plan subscription details to /my-account
* Add automatic redirection to /subscription for unsubscribed users ; add some
  visual feedback to /subscription
* Implement /subscription using Stripe REST API and Parse.Cloud.httpRequest
* Add .parse.local with empty values

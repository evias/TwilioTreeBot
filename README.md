## evias/TwilioTreeBot
TwilioTreeBot is a Parse CloudCode App providing with CloudCode Functions
and a nodeJS (+ express) web application. This package can be used for any
App at Parse.com in combination with a Twilio Account.

Deployment is very easy as the App can be deployed on the free Parse.com
tiers. You'll find more informations about this here: https://www.parse.com/docs/cloudcode

This Feedback management module creates Twilio Subaccounts and Twilio Numbers
for every SignUp. Each of these signed up users can then easily send Feedback
Requests to their Customers by SMS and see the Follow-Up of their Feedback
Requests.

When one of your Feedback Twilio phone numbers receives a SMS from one of the
customers, the TwilioTreeBot App will answer to it by following this decision
tree scheme :

    1) Feedback Request SMS to your Customer
      Example: "Do you think we did a good job? Yes or No"
    2) Answer from Customer to your Signed Up user's Twilio number
      2a) YES: Thanks SMS to your Customer
          Example: "So happy to hear that :)"
      2b) NO: Question SMS to your Customer
          Example: "We are sorry to hear that."
      2c) anything else: Error SMS to your Customer
          Example: "can you please answer with yes or no."
    3) Any other follow-up messages are treated like Feedback from Customers
      and will respond to the number with a Thanks SMS.
      Example: "Thanks for the feedback"

The point of this App is to provide an easy to install and easy to use
Feedback Management Application in the cloud. The only requirements for this
App to function are a Parse App on which the CloudCode is deployed and a
Twilio account for which creating Subaccounts and SmsEnabled numbers is
possible.

### Installation
Please make sure to have the Parse Command-Line Tools installed and configured
as described here: https://www.parse.com/docs/cloudcode/guide#command-line

For this installation example I will assume that you have already created
a Parse App with the name "myFeedbackApp".

First thing to do to be able to install the TwilioTreeBot App is to clone
the git repository with the source code.

    $ git clone https://github.com/evias/TwilioTreeBot.git
    $ cd TwilioTreeBot

Now that you have the source code, you will see a public/ directory and a
cloud/ directory. These two directories are important for the CloudCode API
provided by Parse.com. See following link for more details about CloudCode
Apps on Parse: https://www.parse.com/docs/cloudcode/guide

The last step of the installation is to deploy the application to the Parse
App "myFeedbackApp" you created earlier. The command-line tools from Parse
make this process very easy:

    $ parse new -a myFeedbackApp
    $ parse deploy myFeedbackApp

Your Feedback Management app is now online !

### Dependencies
    * jQuery 1.11
    * Parse CloudCode
    * uses Twilio API version 2010-04-01

### Hints / Advices
Using git, when you will modify your .parse.local file of the clone in order
to configure your parse command line tools to use your own Parse App, git will
see the .parse.local file as modified. To avoid having to communicate my Parse
App details, I use following command to mark the .parse.local file unchanged:

    $ git update-index [--assume-unchanged|--no-assume-unchanged]

### Git Branching
2 git branches will usually be updated in this repository, being the branch
*master* for releases (see git tags) and the branch *develop* for development
of features. Hotfixes might branch from *master* but will usually be tackled
from a *develop* branch or sub-branch.

### Support / Contact
You can contact me anytime at my e-mail address and I will be glad to answer
any type of questions related to this project.

Contributions are welcome if you see anything missing or have detected a
bug, want to develop a new API class, or whatever, I will be glad to respond
to pull requests!

Cheers,
Greg

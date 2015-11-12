<?php
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
 * @subpackage Frontend
 * @author Grégory Saive <greg@evias.be>
 * @license http://www.apache.org/licenses/LICENSE-2.0
**/

/**
 * example of PHP implementation for the auto response
 * /handleTree ParseCloud function call.
 **/
use Parse\ParseClient;
use Parse\ParseObject;
use Parse\ParseQuery;

if ($_GET['tree']) :
    $client = ParseClient::initialize(
        'ThfEtMA3gRRKGjcf63fNTb297LWMUuhPyZtAeOhu',
        'tr7KcgAiaNSDMNgiEAXaw4ETjMkz04nyRIpY2fHj',
        'CdHxDluxMjPbICiNpKFe5JpucTZwlEPWXQxYITA7'
    );

    $_REQUEST['tree'] = $_GET['tree'];
    ParseCloud::run("handleTree", json_encode($_REQUEST));
    exit;
endif;
?>

<!DOCTYPE html>
<html>
  <head>
    <title>TwilioTreeBot</title>
    <meta name="description" content="TwilioTreeBot App">
    <meta name="viewport" content="width=device-width">

    <script src="//code.jquery.com/jquery-1.11.3.min.js"></script>
    <script type="text/javascript" src="//www.parsecdn.com/js/parse-1.6.7.min.js"></script>

    <style>
    body { font-family: Helvetica, Arial, sans-serif; }
    div#main { width: 800px; height: 400px; margin: 40px auto; padding: 20px; border: 2px solid #5298fc; }
    h1 { font-size: 30px; margin: 0; }
    p { margin: 40px 0; }
    em { font-family: monospace; }
    a { color: #5298fc; text-decoration: none; }
    #input-wrapper {
      padding-bottom:15px;
    }
    #account-submit {
      background: #73D175;
      color: white;
      box-shadow:none;
      border-color: #599E5A;
    }
    #api-response { display: none; }
    #ajax-loading { display: none; }
    #api-response.success { color: #0f0; }
    #api-response.error { color: #f00; }
    </style>
  </head>
  <body>
    <div id="main">
        <h1>Welcome to TwilioTreeBot. - <?php echo date("Y-m-d"); ?></h1>
        <p>To get started, you can fill the below form. Upon submission, the SMS
        decision Tree will be started.</p>

        <div id="api-response"></div>
        <div id="ajax-loading"><img src="/images/ajax-loading.gif" alt="Working.." /></div>

        <div id="input-wrapper">
            <input type="text" id="firstName" placeholder="Enter a first name">
            <input type="text" id="phoneNumber" placeholder="Phone number (###-###-####)">
            <input type="text" id="url" placeholder="Enter a URL">
            <input type="button" id="account-submit" value="Start">
        </div>
    </div>

    <script>
    /**
     * example of Javascript implementation of the /startTree
     * and /syncAccount ParseCloud function calls.
     **/

    Parse.initialize('ThfEtMA3gRRKGjcf63fNTb297LWMUuhPyZtAeOhu',
                     'tr7KcgAiaNSDMNgiEAXaw4ETjMkz04nyRIpY2fHj');

    var TwilioAccount = Parse.Object.extend("TwilioAccount");
    Parse.Object.registerSubclass("TwilioAccount", TwilioAccount);

    function startTree(account)
    {
        if (! account.id) {
            console.log("Error /startTree, empty ID in TwilioAccount: ", account);
            return false;
        }

        console.log("Running /startTree with TwilioAccount: ", account);

        Parse.Cloud.run("startTree", {
            accountId: account.id
        },
        {
            success: function(message) {
                console.log("Success /startTree: ", message);

                var cls = "success";
                if (! message.match(/^API call OK.*/))
                    cls = "error";

                $("#api-response").addClass(cls);
                $("#api-response").text(message);
                $("#api-response").fadeIn();

                $("#account-submit").css("background", "#73D175");
                $("#account-submit").val("Start");
            },
            error: function(message) {
                alert('Error /startTree: ', message);

                $("#account-submit").css("background", "#73D175");
                $("#account-submit").val("Start");
            }
        });
    }

    $('#account-submit').on('click', function()
    {
        var button = $(this);

        var name  = $("#firstName").val();
        var phone = $("#phoneNumber").val();
        var url   = $("#url").val();

        if (! name.length || ! phone.length) {
            if (!name.length)
                $("#firstName").css("border", "1px solid #ff0000");

            if (!phone.length)
                $("#phoneNumber").css("border", "1px solid #ff0000");

            return false;
        }

        // set ajax loader
        $("#account-submit").css("background", "#73D175 url(/images/ajax-loading.gif) no-repeat center center");
        $("#account-submit").val("");

        // syncAccount call to create / retrieve Parse App TwilioAccount
        // and synchronize it with a Twilio Subaccount.
        Parse.Cloud.run("syncAccount",
        {
            firstName: name,
            phoneNumber: phone,
            url: url
        },
        {
            success: function(message) {
                console.log("Success /syncAccount: ", message);

                // fetch Parse App TwilioAccount
                var query = new Parse.Query(TwilioAccount);
                query.equalTo("firstName", name);
                query.equalTo("phoneNumber", phone);

                // when the entity is loaded we are up to running
                // the startTree API function.
                query.first({
                    success: function(parseTwilioAccount) {
                        console.log("Starting Decision Tree with: ", parseTwilioAccount);

                        // start Decision Tree !
                        startTree(parseTwilioAccount);
                    },
                    error: function(error) {
                        alert('Error in Account fetch: ', error);

                        $("#account-submit").css("background", "#73D175");
                        $("#account-submit").val("Start");
                    }
                });

            },
            error: function(message) {
                alert('Error /syncAccount: ', message);

                $("#account-submit").css("background", "#73D175");
                $("#account-submit").val("Start");
            }
        });
    });
    </script>

  </body>
</html>

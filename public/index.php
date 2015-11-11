<?php
/**
 * XXX: /tree
 * XXX: /fallback
 **/
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
    </style>
  </head>
  <body>
    <div id="main">
        <h1>Welcome to TwilioTreeBot. - <?php echo date("Y-m-d"); ?></h1>
        <p>To get started, you can fill the below form. Upon submission, the SMS
        decision Tree will be started.</p>

        <div id="input-wrapper">
            <input type="text" id="firstName" placeholder="Enter a first name">
            <input type="text" id="phoneNumber" placeholder="Phone number (###-###-####)">
            <input type="text" id="url" placeholder="Enter a URL">
            <input type="button" id="account-submit" value="Start">
        </div>
    </div>

    <script>
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
            },
            error: function(message) {
                alert('Error /startTree: ', message);
            }
        });
    }

    $('#account-submit').on('click', function()
    {
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
                    }
                });

            },
            error: function(message) {
                alert('Error /syncAccount: ', message);
            }
        });
    });
    </script>

  </body>
</html>

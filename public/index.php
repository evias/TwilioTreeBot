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

    $('#account-submit').on('click', function()
    {
        Parse.Cloud.run('startTree',
        {
            firstName: $("#firstName").val(),
            phoneNumber: $("#phoneNumber").val(),
            url: $("#url").val()
        },
        {
            success: function(message) {
                alert('Success: ' + message);
            },
            error: function(message) {
                alert('Error: ' + message);
            }
        });
    });
    </script>

  </body>
</html>

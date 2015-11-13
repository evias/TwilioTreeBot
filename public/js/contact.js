$(function() {
	'use strict';

  Parse.initialize("QLKKbohzRDHPwXoj6TjLU6WUPn2qspfKaysaoi4w", "OmIh2FxFHviO6LOOoT37XBXLBOtO1nE10GErXGpb");


  var TestObject = Parse.Object.extend("TestObject");
  var testObject = new TestObject();
  testObject.save({foo: "bar"}).then(function(object) {
  alert("yay! it worked");
});



    // Signup form
    $('#signup').validate({
        rules: {
            name: {
                required: true,
                minlength: 2
            },
            email: {
                required: true,
                email: true
            }
        },
        messages: {
            name: {
                required: "Please enter your name",
                minlength: "Your name must consist of at least 2 characters"
            },
            email: {
                required: "Please enter your email address"
            }
        },
        submitHandler: function(form) {

          //New Code//
          var name = $("#officename").val();
          var pass = $("#password").val();
          var email = $("#username").val();
          var areacode = $("#areacode").val();

          var user = new Parse.User();
          user.set("areacode", areacode);
          user.set("username", name);
          user.set("password", pass);
          user.set("username", email);
          // user.set("areacode", areacode);

          user.signUp(null, {
            success: function(user)
            {
              window.location.replace("home.html-01-01");
              checkLogin();
              $('#signup :input').attr('disabled', 'disabled');
              $('#signup').fadeTo( "slow", 0.15, function() {
                    $(this).find(':input').attr('disabled', 'disabled');
                    $(this).find('label').css('cursor','default');
              }
            },
            error: function(user, error)
            {
              console.log("signup erro:"+error.message)
              $('#signup').fadeTo( "slow", 0.15, function() {
                $('#error').fadeIn();
              }
            }
          });
        }

        //Original Code//
        // submitHandler: function(form) {
        //     $(form).ajaxSubmit({
        //         type:"POST",
        //         data: $(form).serialize(),
        //         url:"inc/signup.php",
        //         success: function() {
        //             $('#signup :input').attr('disabled', 'disabled');
        //             $('#signup').fadeTo( "slow", 0.15, function() {
        //                 $(this).find(':input').attr('disabled', 'disabled');
        //                 $(this).find('label').css('cursor','default');
        //                 $('#success').fadeIn();
        //             });
        //         },
        //         error: function() {
        //             $('#signup').fadeTo( "slow", 0.15, function() {
        //                 $('#error').fadeIn();
        //             });
        //         }
        //     });
        // }
    });

	// Trial signup form
    $('#trial').validate({
        rules: {
            name: {
                required: true,
                minlength: 2
            },
            email: {
                required: true,
                email: true
            },
        },
        messages: {
            name: {
                required: "Please enter your name",
                minlength: "Your name must consist of at least 2 characters"
            },
            email: {
                required: "Please enter your email address"
            }
        },
        submitHandler: function(form) {
            $(form).ajaxSubmit({
                type:"POST",
                data: $(form).serialize(),
                url:"inc/trial.php",
                success: function() {
                    $('#trial :input').attr('disabled', 'disabled');
                    $('#trial').fadeTo( "slow", 0.15, function() {
                        $(this).find(':input').attr('disabled', 'disabled');
                        $(this).find('label').css('cursor','default');
                        $('#success').fadeIn();
                    });
                },
                error: function() {
                    $('#trial').fadeTo( "slow", 0.15, function() {
                        $('#error').fadeIn();
                    });
                }
            });
        }
    });

	// Subscription form
   	$('#subscribe').validate({
        rules: {
            subscribe_email: {
                required: true,
                email: true
            }
        },
        messages: {
            subscribe_email: {
                required: "Please enter your email address"
            }
        },
        submitHandler: function(form) {
            $(form).ajaxSubmit({
                type:"POST",
                data: $(form).serialize(),
                url:"inc/subscribe.php",
                success: function() {
                    $('#subscribe :input').attr('disabled', 'disabled');
                    $('#subscribe').fadeTo( "slow", 0.15, function() {
                        $(this).find(':input').attr('disabled', 'disabled');
                        $(this).find('label').css('cursor','default');
                        $('#success').fadeIn();
                    });
                },
                error: function() {
                    $('#subscribe').fadeTo( "slow", 0.15, function() {
                        $('#error').fadeIn();
                    });
                }
            });
        }
    });

});
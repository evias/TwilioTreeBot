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

/**
 * GET /
 * describes the homepage GET request.
 * this handler will render the authentication
 * template if no session is available or render
 * the homepage template for logged users.
 **/
app.get('/', function(req, res)
{
  if (req.params.sessionToken) {
    res.render('homepage', {});
  }
  // XXX add referer
  res.render('authentication', {});
});

// Attach the Express app to Cloud Code.
app.listen();

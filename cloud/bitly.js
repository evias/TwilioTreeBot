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
 * @package ptFollowUp
 * @subpackage Parse Hosting
 * @author Grégory Saive <greg@evias.be>
 * @license http://www.apache.org/licenses/LICENSE-2.0
 * @link https://ptfollowup.parseapp.com
 * @link http://pastebin.com/C1V6ZPgN
**/

var _bitlyApiUrl = "https://api-ssl.bitly.com/v3/shorten?";
var _bitlyOAuthToken;

//deprecated authentication with Login/ApiKey
var _bitlyApiUrlDeprecated = "http://api.bitly.com/v3/shorten?";
var _bitlyLogin;
var _bitlyApiKey;

//initialize with OAuth token
exports.initializeWithOAuthToken = function(oAuthToken)
{
    _bitlyOAuthToken = oAuthToken;
};

//initialize with login and apiKey
exports.initializeWithLoginAndApiKey = function(bitlyLogin, bitlyApiKey)
{
        _bitlyLogin = bitlyLogin;
        _bitlyApiKey = bitlyApiKey;
};

//takes 'longUrl' and returns a shortUrl if successful
exports.shortenUrl = function(params, options)
{
    if(_bitlyOAuthToken) //recommended method of authenticating (with OAuth token)
    {
        Parse.Cloud.httpRequest(
        {
            url: _bitlyApiUrl + "access_token=" + _bitlyOAuthToken
                              + "&longUrl=" +  encodeURIComponent(params.longUrl),
            success: function(httpResponse)
            {
                var jsonResponse = eval("(" + httpResponse.text + ')');
                var url = jsonResponse.data.url;
                if(url){
                    options.success(url);
                }else{
                    options.error(httpResponse.text);
                }
            },
            error: function(httpResponse)
            {
                options.error(httpResponse.text);
            }
        });
    }
    else if(_bitlyLogin && _bitlyApiKey) //deprecated method of authenticating
    {
        Parse.Cloud.httpRequest(
        {
            url: _bitlyApiUrlDeprecated + "login=" + _bitlyLogin
                                                    + "&apiKey=" + _bitlyApiKey
                                                    + "&longUrl=" + encodeURIComponent(params.longUrl)
                                                    + "&format=" + "json",
            success: function(httpResponse)
            {
                var jsonResponse = eval("(" + httpResponse.text + ')');
                var url = jsonResponse.data.url;
                if(url){
                    options.success(url);
                }else{
                    options.error(httpResponse.text);
                }
            },
            error: function(httpResponse)
            {
                options.error(httpResponse.text);
            }
        });
    }
    else //case where neither initialization methods were called
    {
        var error = "Error: You must call bitly.initializeWithOAuthToken(token) or bitly.initializeWithLoginAndApiKey(login, apiKey) before calling bitly.shortenUrl";
        console.log(error);
        options.error(error);
    }
    return this;
};

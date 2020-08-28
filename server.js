// server.js
// where your node app starts

// init project
var express = require('express');
require('custom-env').env()
var app = express();
const fetch = require("node-fetch");
const Musixmatch = require('musixmatch-node')
const mxm = new Musixmatch(process.env.MUSIXMATCH_KEY)
const ToneAnalyzerV3 = require('ibm-watson/tone-analyzer/v3');
const { IamAuthenticator } = require('ibm-watson/auth');
const toneAnalyzer = new ToneAnalyzerV3({
  authenticator: new IamAuthenticator({ apikey: process.env.IBM_KEY }),
  version: '2016-05-19',
  url: process.env.IBM_URL
});


// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


//-------------------------------------------------------------//


// init Spotify API wrapper
var SpotifyWebApi = require('spotify-web-api-node');

// Replace with your redirect URI, required scopes, and show_dialog preference
var redirectUri = `${process.env.CALLBACK_URL}`;
var scopes = ['user-top-read'];
var showDialog = true;

// The API object we'll use to interact with the API
var spotifyApi = new SpotifyWebApi({
  clientId : process.env.CLIENT_ID,
  clientSecret : process.env.CLIENT_SECRET,
  redirectUri : redirectUri
});

app.get("/authorize", function (request, response) {
  var authorizeURL = spotifyApi.createAuthorizeURL(scopes, null, showDialog);
  //console.log(authorizeURL)
  response.send(authorizeURL);
});

// Exchange Authorization Code for an Access Token
app.get("/callback", function (request, response) {
  var authorizationCode = request.query.code;
  
  spotifyApi.authorizationCodeGrant(authorizationCode)
  .then(function(data) {
    //console.log(data)
    response.redirect(`/#access_token=${data.body['access_token']}&refresh_token=${data.body['refresh_token']}`)
  }, function(err) {
    console.log('Something went wrong when retrieving the access token!', err.message);
  });
});

app.get("/logout", function (request, response) {
  response.redirect('/'); 
  
});

var songList;

app.get('/myendpoint', function (request, response) {
  var loggedInSpotifyApi = new SpotifyWebApi();
  //console.log(request.headers['authorization'].split(' ')[1]);
  loggedInSpotifyApi.setAccessToken(request.headers['authorization'].split(' ')[1]);
  // Search for a track!
  loggedInSpotifyApi.getMyTopTracks()
    .then(function(data) {
      //console.log(data.body);
      songList = data.body.items;
      response.send(data.body);
    }, function(err) {
      console.error(err);
    });
  
});

app.get("/analyze-song", async function (request, response) {
  var songTitle = request.query.title;
  var songArtist = request.query.artist;
  const mxmResponse = await mxm.getLyricsMatcher({
    q_track: songTitle,
    q_artist: songArtist,
  })
  try{
    var lyrics = mxmResponse.message.body.lyrics.lyrics_body
  }catch(error){
    response.send('Error')
    return
  }
  lyrics = formatLyrics(lyrics)
  
  var mainTone;
  if (!lyrics) {
    response.send('No lyrics for this song')
    return
  }
  toneAnalyzer.tone(
  {
    toneInput: lyrics,
    contentType: 'text/plain',
    tones: ["emotion"]
  })
  .then(function (data){
    response.send(data.result.document_tone.tone_categories[0].tones)
  })
  .catch(err => {
    console.log(err);
  });
});


function formatLyrics (lyrics){
  lyrics = lyrics.replace(/\n/g, ". ");
  lyrics = lyrics.slice(0, -70);
  return lyrics
}



//-------------------------------------------------------------//
const port = process.env.PORT || 3000


// listen for requests :)
var listener = app.listen(port, function () {
  console.log(`Your app is listening on port ${port}`);
});

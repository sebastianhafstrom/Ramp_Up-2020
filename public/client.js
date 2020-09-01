// client-side js
// run by the browser each time your view template is loaded

// by default, you've got jQuery,
// add other scripts at the bottom of index.html

var tracklist;
var analyzedList = []
var emotionList = []
var numOfSongs = 20

$(function () {
  for (var i = 0; i < 20; i++) {
    analyzedList[i] = false
  }

  document.getElementById("logout").style.display = "none";
  $('#login').click(function () {
    // Call the authorize endpoint, which will return an authorize URL, then redirect to that URL
    $.get('/authorize', function (data) {
      //console.log(data)
      window.location = data;
    });
  });

  const hash = window.location.hash
    .substring(1)
    .split('&')
    .reduce(function (initial, item) {
      if (item) {
        var parts = item.split('=');
        initial[parts[0]] = decodeURIComponent(parts[1]);
      }
      return initial;
    }, {});
  window.location.hash = '';

  if (hash.access_token) {
    document.getElementById("login").style.display = "none";
    document.getElementById("logout").style.display = "inline";

    $.get({ url: '/myendpoint', headers: { "Authorization": `Bearer ${hash.access_token}` } }, function (data) {
      // "Data" is the array of track objects we get from the API. See server.js for the function that returns it.
      //console.log(data)
      tracklist = data.items
      //console.log(tracklist)
      var title = $('<h1>Your top tracks on Spotify:</h1>');
      title.prependTo('#data-container');

      // For each of the tracks, create an element
      i = 0;
      data.items.forEach(function (track) {
        var trackDiv = $('<li class="track media" id="' + i + '"></li>');
        var coverArtDiv = $('<img class="mr-3" src="' + track.album.images[1].url + '" alt="Generic placeholder image"/>')
        var mediaBodyDiv = $('<div class="media-body track"></div')
        var songTitleDiv = $('<h3 class="mt-0">' + track.name + '</h3>')
        var artistDiv = $('<h5 class="mt-0">' + track.artists[0].name + '</h5>')
        var analyzeButtonDiv = $('<a class="btn btn-primary" data-toggle="collapse" href="#collapseExample' + i + '" role="button" aria-expanded="false" aria-controls="collapseExample' + i + '" onClick="analyze(' + i + ')">Analyze</a>')
        var collapseDiv = $('<div class="collapse" id="collapseExample' + i + '">')
        var emotionDiv = $('<div class="card card-body" id="emotionDiv' + i + '" style="background: none; border: none;">Analyzing emotions...</div>')


        //trackDiv.text(track.name + ", by " + track.artists[0].name);
        //var analyzeDiv = $('<div><button type="button" class="btn btn-primary" onClick="analyze(' + i +')">Analyze</button></div>')
        //var imageDiv = $('<img src={0} alt = "album-art" width="32" height="32">'.format(track.album.images[0].url))
        //var image2 = $('<img src="' + track.album.images[0].url + '" alt="Lamp" width="300" height="300">')

        //console.log(track.album.images[0].url)
        //$(trackDiv).prepend(image2)
        //analyzeDiv.appendTo(trackDiv)
        //imageDiv.appendTo(trackDiv)

        $(collapseDiv).append(emotionDiv);

        $(mediaBodyDiv).append(songTitleDiv)
        $(mediaBodyDiv).append(artistDiv)
        $(mediaBodyDiv).append(analyzeButtonDiv)
        $(mediaBodyDiv).append(collapseDiv)



        $(trackDiv).append(coverArtDiv);
        $(trackDiv).append(mediaBodyDiv);
        trackDiv.appendTo('#data-container-tracks');
        i++
      });
      var heading = $("<h3>Analyzing your top track's emotions...</h3>");
      $('#summedEmotions').html(heading);

      getAllEmotions();

    });
  }

});

function analyze(id) {
  if (analyzedList[id] == true) {
    return
  }
  //console.log("Track: " + tracklist[id].name)
  //console.log("Artist: " + tracklist[id].artists[0].name)
  var emotionArray = [];
  $.get('/analyze-song', { title: tracklist[id].name, artist: tracklist[id].artists[0].name })
    .done(function (data) {
      //console.log(data)
      if (data == 'Error') {
        numOfSongs--
        var div = $('<div class="emotionDiv" ></div>')
        var heading = $('<p>Error with getting emotions...\n The song either has no lyrics, or the lyrics could not be processed.</p>')
        $(div).append(heading)
        $('#emotionDiv' + id).html(div)
        return
      }
      emotionArray = data
      emotionArray.sort((a, b) => (a.score > b.score) ? -1 : ((b.score > a.score) ? 1 : 0));
      //console.log("EmoitionArray: " + emotionArray)
      emotionList.push(emotionArray);
      //console.log("Length of emotionList: " + emotionList.length)


      div = $('<div class="emotionDiv" ></div>')
      heading = $('<h5>Emotions:</h5>')
      $(div).append(heading)
      var list = $('<ol></ol>')

      emotionArray.forEach(function (emotion) {
        //console.log(emotion.tone_name + ": " + emotion.score)
        var emotionDiv = $('<li class="emotion"></li>');
        emotionDiv.text(emotion.tone_name + ": " + (emotion.score * 100).toFixed(2) + '%')

        $(list).append(emotionDiv)
      });
      $(div).append(list)
      $('#emotionDiv' + id).html(div)
      analyzedList[id] = true
      //console.log('AnalyzedList: ' + analyzedList)

    });

}

// Calls the backend for each song to get the emotions of all songs. This function is called after the top songs are listed on the website
function getAllEmotions() {
  for (var i = 0; i < 20; i++) {
    analyze(i);
  }

  var interval = setInterval(function () {
    //console.log("Length of emotionList: " + emotionList.length)
    if (emotionList.length == numOfSongs) {
      //console.log('Here')
      clearInterval(interval);
      sumEmotions()
    }
  }, 1000);
}

function sumEmotions() {
  var joy = 0, anger = 0, sadness = 0, disgust = 0, fear = 0;

  //emotionList.forEach(function(emotion){
  //  console.log('Emotion: ' + typeof emotion[0].score)
  //})




  emotionList.forEach(function (songEmotion) {
    songEmotion.forEach(function (emotion) {
      switch (emotion.tone_id) {
        case 'joy':
          joy += emotion.score
          break;
        case 'fear':
          fear += emotion.score
          break;
        case 'anger':
          anger += emotion.score
          break;
        case 'sadness':
          sadness += emotion.score
          break;
        case 'disgust':
          disgust += emotion.score
          break;
      }
    })
  })
  //console.log('Joy: ' + joy)
  joy = joy / numOfSongs
  anger = anger / numOfSongs
  fear = fear / numOfSongs
  disgust = disgust / numOfSongs
  sadness = sadness / numOfSongs
  var emotions = []
  emotions.push({ emotion: 'Joy', score: joy })
  emotions.push({ emotion: 'Anger', score: anger })
  emotions.push({ emotion: 'Fear', score: fear })
  emotions.push({ emotion: 'Disgust', score: disgust })
  emotions.push({ emotion: 'Sadness', score: sadness })
  emotions.sort((a, b) => (a.score > b.score) ? -1 : ((b.score > a.score) ? 1 : 0));

  var title = $("<h1>Your top track's emotions:</h1>");
  var div = $('<div class="emotionDiv" ></div>')
  var list = $('<ol></ol>')

  emotions.forEach(function (emotion) {
    //console.log(emotion.tone_name + ": " + emotion.score)
    var emotionDiv = $('<li class="emotion track"></li>');
    emotionDiv.text(emotion.emotion + ": " + (emotion.score * 100).toFixed(2) + '%')

    $(list).append(emotionDiv)
  });
  $(div).append(list)
  $(div).prepend(title)
  $('#summedEmotions').html(div)
}

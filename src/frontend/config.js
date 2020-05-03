let token, userId, channelId, login;

const twitch = window.Twitch.ext;

// const BACKEND_URL = 'https://localhost:8080'
const BACKEND_URL = 'https://slaytherelics.xyz:8080'

const MSG_TYPE_SET_RELICS = 1
const MSG_TYPE_ADD_STREAMER = 2
const MSG_TYPE_STREAMER_EXISTS = 3

const RESPONSE_SUCCESS = "Success"
const RESPONSE_TRUE = "true"
const RESPONSE_FALSE = "false"

const TEXT_STREAMER_EXISTS = "Streamer with this login already exists in this extension. Saving a new secret will overwrite the existing secret."
const TEXT_STREAMER_NOT_EXISTS = "This login is not yet registered with this extension. Click Generate and copy the secret into the slaytherelics_config.txt file then click 'Save Secret'"
const TEXT_STREAMER_ADD_SUCCESS = "Streamer secret succesfully saved!"
const TEXT_STREAMER_ADD_FAILURE = "Something went wrong, send this message to the developer (adam@slaytherelics.xyz)."

const COLOR_STREAMER_EXISTS = 'green'
const COLOR_STREAMER_NOT_EXISTS = 'black'
const COLOR_STREAMER_ADD_SUCCESS = 'green'
const COLOR_STREAMER_ADD_FAILURE = 'red'


twitch.onContext((context) => {
  twitch.rig.log(context);
});


twitch.onAuthorized((auth) => {
  token = auth.token;
  userId = auth.userId;
  channelId = auth.channelId
  // document.getElementById('userId').innerText = auth.channelId
  setStatus('onAuthorized', 'black')
  getChannelName(auth.clientId, auth.channelId)
});


function generateRandomSecret() {
  var secret = randomStr(20)
  document.getElementById("text_streamer_secret").setAttribute("value", secret)
  document.getElementById("config_file").innerHTML = "login:" + login + "<br>secret:" + secret
}


function randomStr(len) { 
  var arr = '0123456789abcdefghijklmnopqrstuvwxyz'
  var ans = ''; 
  for (var i = len; i > 0; i--) { 
      ans +=  
        arr[Math.floor(Math.random() * arr.length)]; 
  } 
  return ans; 
} 


function getChannelName(clientId, channelId) {
  var xhttp = new XMLHttpRequest();

  xhttp.onreadystatechange = function() {
    // document.getElementById('userId').innerText = this.readyState + ' ' + this.status + ' ' + this.responseText

    if (this.readyState == 4 && this.status == 200) {

      var json = JSON.parse(this.responseText)

      login = json['data'][0]['login']
      // document.getElementById('userId').innerText = login

      setStatus('channel name acquired', 'black')

      var xhttp_ebs = new XMLHttpRequest()
      xhttp_ebs.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          if (this.responseText == RESPONSE_TRUE) {
            setStatus(TEXT_STREAMER_EXISTS, COLOR_STREAMER_EXISTS)
          } else {
            setStatus(TEXT_STREAMER_NOT_EXISTS, COLOR_STREAMER_NOT_EXISTS)
          }
        } else {
          setStatus('backend ' + getResponseString(this), 'black')
        }
      }
      xhttp_ebs.open('post', BACKEND_URL)
      xhttp_ebs.setRequestHeader("Content-Type", "application/json")

      var msg = {
        'msg_type': MSG_TYPE_STREAMER_EXISTS,
        'streamer': {
          'login': login
        }
      }
      xhttp_ebs.send(JSON.stringify(msg))

      // document.getElementById('userId').innerText = 'succesful'
    }
  };

  xhttp.open("get", "https://api.twitch.tv/helix/users?id=" + channelId)
  xhttp.setRequestHeader("Client-ID", clientId)
  xhttp.send()

  // xhttp.response
}


function setStatus(text, color) {
  document.getElementById('backend_status').innerHTML = '<span style="color: ' + color + '">' + text + '</span>'
}


function getResponseString(xhttp) {
  return 'status: ' + xhttp.status + ' type: ' + xhttp.responseType + ' text: ' + xhttp.responseText
}


function saveSecret() {
  setStatus('saving secret', 'black')

  var xhttp = new XMLHttpRequest();

  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 201) {
        setStatus(TEXT_STREAMER_ADD_SUCCESS, COLOR_STREAMER_ADD_SUCCESS)
      } else {
        setStatus(TEXT_STREAMER_ADD_FAILURE + ' ' + getResponseString(this), COLOR_STREAMER_ADD_FAILURE)
      }
    } else {
      setStatus(getResponseString(this), 'black')
    }
  }

  xhttp.open('post', BACKEND_URL)
  xhttp.setRequestHeader("Content-Type", "application/json")

  var secret = document.getElementById('text_streamer_secret').getAttribute('value')
  var msg = {
    'msg_type': MSG_TYPE_ADD_STREAMER,
    'streamer': {
      'login': login,
      'secret': secret,
      'channel_id': channelId
    }
  }
  xhttp.send(JSON.stringify(msg))
}

$(function() {
  document.getElementById("btn_generate").onclick = generateRandomSecret
  document.getElementById("btn_save").onclick = saveSecret
})

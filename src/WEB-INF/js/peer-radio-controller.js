/**
 * P2P Radio 
 */

"use strict";

var context = new AudioContext();
window.addEventListener('load', selectAudio, false);

// create WebRTC connection between the local computer and a remote peer
var pc = new RTCPeerConnection(PC_CONFIG);
var input = document.getElementById('audio-input')
var audio = document.getElementById('my-audio')


// Selection from local audio files for a playlist
input.on('change', function selectAudio(event) {
	audio = event.target.files[0];
	
	if (audio.type.match('audio.*')) {
		var reader = new FileReader();
 
		reader.onload = (function(readEvent) {
			context.decodeAudioData(readEvent.target.result, function(buffer) {
          
				// create an audio source and connect it to the file buffer
				var source = context.createBufferSource();
				source.buffer = buffer;
				source.start(0);
	 
				// connect the audio stream to final destination of all audio in the context (hardware)
				source.connect(context.destination);
	 
				// create a destination for the remote browser
				var remote = context.createMediaStreamDestination();
	 
				// connect the remote destination to the source
				source.connect(remote);
	 
				// add the media stream as a local source of audio to the peer connection
				pc.addStream(remote.stream);
	 
				// create a SDP (Session Description Protocol) offer 
				// to start a new WebRTC connection to a remote peer
				pc.(setLocalAndSendMessage);
			});
		});
	 
		// start reading contents
		reader.readAsArrayBuffer(audio);
	} else {
		alert('Your audio type is not supported!')
	}
});
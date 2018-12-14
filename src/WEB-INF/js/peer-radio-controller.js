/**
 * P2P Radio 
 */

"use strict";

(function () {
	// imports
	const Controller = de_sb_radio.Controller;


	/**
	 * Creates a new welcome controller that is derived from an abstract controller.
	 */
	const PeerRadioController = function () {
		Controller.call(this);
	}
	PeerRadioController.prototype = Object.create(Controller.prototype);
	PeerRadioController.prototype.constructor = PeerRadioController;


	/**
	 * Displays the associated view.
	 */
	Object.defineProperty(PeerRadioController.prototype, "display", {
		enumerable: false,
		configurable: false,
		writable: true,
		value: function () {
			Controller.sessionOwner = null;

			const mainElement = document.querySelector("main");
			mainElement.appendChild(document.querySelector("#peer-radio-template").content.cloneNode(true).firstElementChild);
			mainElement.querySelector("input").addEventListener("click", event => this.addPlaylist());
			mainElement.querySelector("audio").addEventListener("click", event => this.streamPlaylist());
		}
	});
	
	
	Object.defineProperty(PeerRadioController.prototype, "addPlaylist", {
		value: function () {
	
			let context = new AudioContext();
			
			// create WebRTC connection between the local computer and a remote peer
			let pc = new RTCPeerConnection(PC_CONFIG);
			let input = document.getElementById('audio-input')
			let audio = document.getElementById('my-audio')
			
			
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
							pc.createOffer(setLocalAndSendMessage);
						}, false);
					}, false);
				 
					// start reading contents
					reader.readAsArrayBuffer(audio);
//					audio.play();
				} else {
					alert('Your audio type is not supported!')
				}
			}, false);
		}
	});

	Object.defineProperty(PeerRadioController.prototype, "streamPlaylist", {
		value: function () {
			var player = new Audio();
			attachMediaStream(player, event.stream);
			player.play();

		}
			
	});

	
	window.addEventListener("load", event => {
		const anchor = document.querySelector("header li:nth-of-type(3) > a");
		const controller = new PeerRadioController();
		anchor.addEventListener("click", event => controller.display());
	});
} ());

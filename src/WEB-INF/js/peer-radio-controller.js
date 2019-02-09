/**
 * P2P Radio 
 */

"use strict";

(function () {
	const Controller = de_sb_radio.Controller;
	let RtcPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.msRTCPeerConnection;

	const PeerRadioController = function () {
		Controller.call(this);

		// todo: store filepath objects as new instance variable of li element objects
		Object.defineProperty(this, "filesToPlay", {
			configurable: false,
			writable: true,
			value: -1
		});
		Object.defineProperty(this, "currentTrack", {
			configurable: false,
			writable: true,
			value: 0
		});

		Object.defineProperty(this, "peerConnection", {
			configurable: false,
			writable: false,
			value: new RtcPeerConnection()
		});

		Object.defineProperty(this, "offer", {
			configurable: false,
			writable: true,
			value: null
		});

		Object.defineProperty(this, "answer", {
			configurable: false,
			writable: true,
			value: null
		});
		
		// copy from unidirektionale offer.js
		Object.defineProperty(this, "address", { enumerable : true,  writable: true, value: null });
		Object.defineProperty(this, "connection", { enumerable : true,  writable: true, value: null });
		Object.defineProperty(this, "channel", { enumerable : true,  writable: true, value: null });

		Object.defineProperty(this, "audio2", { enumerable : true,  writable: true, value: null});
		

	}
	PeerRadioController.prototype = Object.create(Controller.prototype);
	PeerRadioController.prototype.constructor = PeerRadioController;

	// refresh with global IP address of local machine
	Object.defineProperty(PeerRadioController.prototype, "refreshAddress", {
		value: async function () {
			console.log("refreshAddress");
			let response = await fetch("https://api.ipify.org/", { method: "GET", headers: { "Accept": "text/plain" }});
			if (!response.ok) throw new Error("HTTP " + response.status + " " + response.statusText);			
			this.address = await response.text();
		}
	});

	let localStream;
	var destination = null;
	var songStream = null;
	var songLocal = null;

// WEB-RTC server/sender ****************************************************  
// for some ides see: https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/pc1/js/main.js
	// make offer
	Object.defineProperty(PeerRadioController.prototype, "makeOffer", {
		value: async function makeOffer() {
			if (this.connection) this.connection.close();
			
			console.log(localStream);
			await this.playSong();
			console.log(localStream);

			this.connection = new RTCPeerConnection();
			this.connection.addEventListener("icecandidate", event => this.handleIceCandidate(event.candidate));
			this.channel = this.connection.createDataChannel("offer");

			localStream.stream.getTracks().forEach(track => this.connection.addTrack(track, localStream.stream));
			//this.connection.addTrack(destination.stream);
			console.log('Added local stream to connection');

	
			// let offer = await this.connection.createOffer();
			const offerOptions = {
				offerToReceiveAudio: 0,
				offerToReceiveVideo: 0,
				voiceActivityDetection: false
			  };
			let offer = await this.connection.createOffer(offerOptions);
			await this.connection.setLocalDescription(offer);
	
			document.querySelector("#log").value += "[channel opened]\n";	
		}
	});
	
	// handle ice candidate
	Object.defineProperty(PeerRadioController.prototype, "handleIceCandidate", {
		value: async function handleIceCandidate(iceCandidate) {
			if (iceCandidate) return;
			console.log(iceCandidate);
			// display local description SDP with all candidates, and global IP4 addresses
			let sdp = this.connection.localDescription.sdp;
			
			// for local network and testing disabled, because is not working
			//if (this.address) sdp = sdp.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, this.address);

			this.offer = sdp;
			document.querySelector("#offer").value = this.offer;
			document.querySelector("#log").value += "[offer generated]\n";
						
			this.registerTransmission();
			
		}
	});


		
	// accept answer
	Object.defineProperty(PeerRadioController.prototype, "acceptAnswer", {
		value: async function acceptAnswer(sdp) {
			if (sdp.length === 0) return;
	
			let answer = new RTCSessionDescription({ type: "answer", sdp: sdp });
			await this.connection.setRemoteDescription(answer);
			document.querySelector("#log").value += "[answer accepted]\n";
		}
	});


	// send message to remote
	Object.defineProperty(PeerRadioController.prototype, "sendMessage", {
		value: function sendMessage(data) {
				// document.querySelector("#log").value += data + "\n";
				// this.channel.send(data);

			if(this.channel){
				document.querySelector("#log").value += data + "\n";
				this.channel.send(data);
			} else {
				document.querySelector("#log").value += "[DataChannel not open]\n";
			}
			
		}
	});

	// close send channel
	Object.defineProperty(PeerRadioController.prototype, "closeChannel", {
		value: function () {
			if (!this.channel) {
				this.channel.close();
				this.channel = null;
			}
			document.querySelector("#log").value += "[channel closed]\n";

			// delete offer from DB
			this.unregisterTransmission();
		}
	});
// END WEB-RTC server/sender ****************************************************

// WEB-RTC listener *************************************************************
	// recreate offer from sdp, then create answer
	Object.defineProperty(PeerRadioController.prototype, "acceptOffer", {
		value: async function acceptOffer(station) {
			console.log(station);
			if(station){

			}
			console.log(station);
			let sdp = station.lastTransmission.offer;
			if (sdp.length === 0) return;

			const answerOptions = {
				offerToReceiveAudio: 1,
				offerToReceiveVideo: 0,
				voiceActivityDetection: false
			  };

			if (this.connection) this.connection.close();
			this.connection = new RTCPeerConnection();
			this.connection.addEventListener("icecandidate", event => this.handleIceCandidate_listener(event.candidate));
			this.connection.addEventListener("datachannel", event => this.handleReceiveChannelOpened_listener(event.channel));
			//this.connection.addEventListener('track', this.handleTrack_listener);
			this.connection.ontrack = this.handleTrack_listener;

			let offer = new RTCSessionDescription({ type: "offer", sdp: sdp });
			await this.connection.setRemoteDescription(offer);
			let answer = await this.connection.createAnswer(answerOptions);
			await this.connection.setLocalDescription(answer);

			station.lastTransmission.answer = answer.sdp;
			this.registerAnswer(station);

			document.querySelector("#log2").value = "[offer accepted]\n";
			document.querySelector("#answer").value += answer.sdp;
		}
	});

	Object.defineProperty(PeerRadioController.prototype, "handleTrack_listener", {
		value: function handleTrack_listener(e){
			console.log("got remote stream");
			// console.log(this.audio2, e);

			let audioArea = document.getElementById("audioArea");
			console.log(audioArea);

			const audio = document.createElement('audio');
			audio.controls = true;
			audio.autoplay = true;
			audioArea.appendChild(audio);

			try {
				console.log("set srcObject");
				audio.srcObject = e.streams[0];
			  } catch (error) {
				console.log("set src via URL");
				audio.src = URL.createObjectURL(e.streams[0]);
			  }
		}
	})

	// handle ice candidate
	Object.defineProperty(PeerRadioController.prototype, "handleIceCandidate_listener", {
		value: async function handleIceCandidate_listener(iceCandidate) {
			if (iceCandidate) return;
	
			// display local description SDP with all candidates, and global IP4 addresses
			let sdp = this.connection.localDescription.sdp;

			// for local network and testing disabled, because is not working
			//if (this.address) sdp = sdp.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, this.address);
			document.querySelector("#offer").value = sdp;
			document.querySelector("#log").value += "[offer generated]\n";			
		}
	});	

	// handle receive channel opened
	Object.defineProperty(PeerRadioController.prototype, "handleReceiveChannelOpened_listener", {
		value: function handleReceiveChannelOpened_listener(channel) {
			channel.addEventListener("close", event => this.handleReceiveChannelClosed_listener());
			channel.addEventListener("message", event => this.handleMessageReceived_listener(event.data));
			document.querySelector("#log2").value += "[channel opened]\n";

			// once conneted delete delete answer from DB
			this.unregisterAnswer();
		}
	});


	// handle receive channel closed
	Object.defineProperty(PeerRadioController.prototype, "handleReceiveChannelClosed_listener", {
		value: function () {
			document.querySelector("#log2").value += "[channel closed]\n";

			// channel got closed so delete answer from DB
			this.unregisterAnswer();
		}
	});


	// receive message from remote
	Object.defineProperty(PeerRadioController.prototype, "handleMessageReceived_listener", {
		value: function (data) {
			document.querySelector("#log2").value += data + "\n";
		}
	});

// END WEB-RTC listener *************************************************************


	// get the peplple which are sending -> get stations
	Object.defineProperty(PeerRadioController.prototype, "fetchPeople", {
        value: async function (searchString) {
			let path = "/services/people";
			if (searchString) path = path + searchString;
			console.log(searchString);
            // if (genres.length > 0 || artists.length > 0) {
            //     path += "?";
               
            //     for (const genre of genres) {
            //        path += "genre=" + genre + "&"
            //     }

            //     for (const artist of artists) {
            //         path += "artist=" + artist + "&"
            //     }
            //     // path = path.substring(0, path.length - 1);
            //     path += "resultLimit=50"
            // }
            let response = await fetch(path, { method: "GET", headers: {"Accept": "application/json"}, credentials: "include"});
            if (!response.ok) throw new Error(response.status + " " + response.statusText);
			return response.json();
        }
    });
	
	
	/**
	 * Displays the associated view.
	 */
	Object.defineProperty(PeerRadioController.prototype, "display", {
		enumerable: false,
		configurable: false,
		writable: true,
		value: async function () {
			let self = this;
            try {
				const mainElement = document.querySelector("main");
				mainElement.appendChild(document.querySelector("#peer-radio-template").content.cloneNode(true).firstElementChild);
				let playerMode = document.getElementById("player-mode");
				playerMode.addEventListener("click", () => this.displayPlayerSection());
				let listenerMode = document.getElementById("listener-mode");
				listenerMode.addEventListener("click", () => this.displayListenerSection());
            } catch (error) {
                this.displayError(error);
            }
		}
	});
	
	// see here: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file
	function updateFileList() {
		  var curFiles = files.files;
		  
		  if(curFiles.length === 0) {
		    consol.log('No files currently selected for upload');
		  } else {		    
		    const listEl = document.getElementById("filelist");
	        for (let item of curFiles) {
	        	//console.log(item.name);
	            let newListElement = document.querySelector("#peer-radio-filelist-el").content.cloneNode(true).firstElementChild;
	            newListElement.querySelector("output.name").value = item.name;
	            listEl.appendChild(newListElement);
	        }
		  }
	}

	Object.defineProperty(PeerRadioController.prototype, "playSong", {
		value: async function playSong() {
			console.log("getting local stream...");

			let files = this.filesToPlay;
			if (this.currentTrack >= files.length) {
				this.currentTrack = 0;
			}
			if (!Controller.audioContext) Controller.audioContext = new AudioContext();
			if (!destination) destination = Controller.audioContext.createMediaStreamDestination();
			console.log(this.filesToPlay);
			
			console.log("currentTrack: " + this.currentTrack);
			console.log(files[this.currentTrack]);

			let audioBuffer = await readFile(files[this.currentTrack]);
			let decodedBufferStream = await Controller.audioContext.decodeAudioData(audioBuffer);
			// let decodedBufferLocal = await Controller.audioContext.decodeAudioData(audioBuffer);

			songStream = Controller.audioContext.createBufferSource();
			songStream.buffer = decodedBufferStream;

			songLocal = Controller.audioContext.createBufferSource();
			songLocal.buffer = decodedBufferStream;

			songStream.connect(destination);
			songLocal.connect(Controller.audioContext.destination);
			
			songStream.start();
			songLocal.start();

			this.currentTrack++;
			localStream = destination;
			
				// +++++++++++++++++++++++
			// if (!Controller.audioContext) Controller.audioContext = new AudioContext();
			// console.log(this.filesToPlay);
			
			// console.log("currentTrack: " + this.currentTrack);
			// console.log(files[this.currentTrack]);

			// let audioBuffer = await readFile(files[this.currentTrack]);
			// let decodedBuffer = await Controller.audioContext.decodeAudioData(audioBuffer);
			// let song = Controller.audioContext.createBufferSource();
			// song.buffer = decodedBuffer;
			// song.connect(Controller.audioContext.destination);
			// console.log(song);
			
			// song.start();
			// this.currentTrack++;
			songLocal.addEventListener("ended", () => {
				this.playSong();
				console.log("Play next song...")
			})

		}
	});

	// offer = rtc session description with type = "offer"
	// call before sending next track
	// und einmal ganz am anfang
	Object.defineProperty(PeerRadioController.prototype, "registerTransmission", {
		value: async function registerTransmission(checkForListeners = true) {
			console.log("registerTransmission")
			let person = Controller.sessionOwner;
			console.log("Person: ", person);
			let path = "/services/people/";// + person;
			
			console.log("SDP: ", this.connection.localDescription.sdp);
			person.lastTransmission = {
				address: this.address,
				timestamp: Date.now(),
				offer: this.offer,
				answer: "",
			}
			// wenn nicht klappt, body: JSON.stringify(person)
			console.log("POST Transmission:\n", person);
			let response = await fetch(path, { method: "POST", 
				headers: {"Content-Type": "application/json"},
				credentials: "include", body: JSON.stringify(person),
				});
			
			if (!response.ok) throw new Error(response.status + " " + response.statusText);
			console.log(response.json());
			console.log("registerTransmission DONE.");

			if (checkForListeners) {
				checkForAnswer(this);
			}
		}
	});

	Object.defineProperty(PeerRadioController.prototype, "unregisterTransmission", {
		value: async function unregisterTransmission() {
			console.log("unregisterTransmission")
			let person = Controller.sessionOwner;
			let path = "/services/people/";// + person;
			
			person.lastTransmission = {
				address: null,
				timestamp: null,
				offer: null,
				answer: null,
			}
			// wenn nicht klappt, body: JSON.stringify(person)
			console.log("POST Transmission offer deleted");
			let response = await fetch(path, { method: "POST", 
				headers: {"Content-Type": "application/json"},
				credentials: "include", body: JSON.stringify(person),
				});
			
			if (!response.ok) throw new Error(response.status + " " + response.statusText);
			console.log(response.json());
			console.log("unregisterTransmission DONE.");
		}
	});

	Object.defineProperty(PeerRadioController.prototype, "registerAnswer", {
		value: async function registerAnswer(station) {
			console.log("registerAnswer")
			let person = Controller.sessionOwner;
			console.log("Station to listen to: ", station);
			let path = "/services/people/";
			
			person.lastTransmission = {
				address: station.identity, //we use this to show to which staion we want to listen
				timestamp: Date.now(),
				offer: null,
				answer: station.lastTransmission.answer,
			}
			console.log("updated Station with answer", person);
			console.log("POST Answer");
			let response = await fetch(path, { method: "POST", 
				headers: {"Content-Type": "application/json"},
				credentials: "include", body: JSON.stringify(person),
				});
			
			if (!response.ok) throw new Error(response.status + " " + response.statusText);
			console.log(response.json());
			console.log("registerAnswer DONE.");
		}

	});

	Object.defineProperty(PeerRadioController.prototype, "unregisterAnswer", {
		value: async function unregisterAnswer(station) {
			console.log("unregisterAnswer")
			let person = Controller.sessionOwner;
			let path = "/services/people/";
			
			person.lastTransmission = {
				address: null,
				timestamp: null,
				offer: null,
				answer: null,
			}
			
			console.log("POST delete answer");
			let response = await fetch(path, { method: "POST", 
				headers: {"Content-Type": "application/json"},
				credentials: "include", body: JSON.stringify(person),
				});
			
			if (!response.ok) throw new Error(response.status + " " + response.statusText);
			console.log(response.json());
			console.log("unregisterAnswer DONE.");
		}

	});

	// function to regulary check for an answer in the DB
	async function checkForAnswer(ctrl) {
		console.log("check for answer");
		// get the stations from DB
		let person = Controller.sessionOwner;
		const timesStamp = Date.now() - 5500; // not older than 5.5 sec because we are updating every 5 sec
		const searchString = "?lastTransmissionTimestamp="+ timesStamp + "&listenerOnly=1&lastTransmissionAddress=" + person.identity;
		console.log(searchString);
		let peopleList = await ctrl.fetchPeople(searchString);
		console.log(peopleList);

		if (peopleList.length > 0){
			ctrl.acceptAnswer(peopleList[0].lastTransmission.answer)
			console.log("anser accepted from: " + peopleList[0]);
		}else{
			ctrl.registerTransmission(false);
		}


		setTimeout( function() {checkForAnswer(ctrl)}, 5000);

	}
	
	Object.defineProperty(PeerRadioController.prototype, "displayPlayerSection", {
		value: async function displayPlayerSection() {
			this.displayError();
			
            try {
            	let modeSelection = document.querySelector(".mode-selection");
            	let playerSection = document.querySelector(".player-section");
            	modeSelection.classList.remove("active");
				playerSection.classList.add("active");
				
				let files = document.getElementById("files");
				files.addEventListener('change', updateFileList);

				let streamButton = document.getElementById("stream");
				streamButton.addEventListener("click", () => {
					console.log(this.address);
					this.filesToPlay = files.files;
					this.makeOffer();
				})
            } catch (error) {
                this.displayError(error);
            }
        }
	});
	
	
	Object.defineProperty(PeerRadioController.prototype, "displayListenerSection", {
		value: async function displayListenerSection() {
			this.displayError();
			
            try {
            	let modeSelection = document.querySelector(".mode-selection");
            	let listenerSection = document.querySelector(".listener-section");
            	modeSelection.classList.remove("active");
				listenerSection.classList.add("active");
				
				setupStationList(this);	
				
				// this.audio2 =  document.getElementById("audio2");
				// console.log(this.audio2.srcObject);

            } catch (error) {
                this.displayError(error);
            }
        }
	});
	
	Object.defineProperty(PeerRadioController.prototype, "openTab", {
		value: function () {
            try {
            	let tab = document.getElementByTagName('a[data-toggle="tab"]');
				tab.addEventListener("click", (event) => {
					let target = this.attr("href");
	            	let targetTab = document.getElementById(target);
	            	let toggleTabs = document.getElementByClassName("toggle-tab");
	            	let i;
	            	for (i=0; i<toggleTabs.length; i++) {
	            		toggleTabs[i].classList = toggleTabs[i].classList.remove("active");
	            	}
	            	targetTab.classList.add("active");
				}, false);
            } catch (error) {
                this.displayError(error);
            }
        }
	});

	// aufruf: let audioBuffer = await readFile(file);
	function readFile(file) {
		return new Promise((resolve, reject) => {
			var fr = new FileReader();  
			fr.onload = () => resolve(fr.result);    
			fr.onerror = () => reject(fr.error);
			fr.readAsArrayBuffer(file);
		});
	  }

	
	// Object.defineProperty(PeerRadioController.prototype, "setupStationList", {
	// 	value: 
	// need to use ctrl parameter otherwise it does not work
	async function setupStationList(ctrl) {
			console.log("update station list");

			// get the stations from DB
			const timeStamp = Date.now() - 10 * 60000; // 10 Minutes: 10 Minutes * milli sec_per_minutes
			let searchString = "?lastTransmissionTimestamp="+ timeStamp + "&stationsOnly=1";
			console.log(searchString);
			let peopleList = await ctrl.fetchPeople(searchString);
			console.log(peopleList);

			if (peopleList) {
				const listEl = document.getElementById("stationlist");
				while (listEl.lastChild) {
					listEl.removeChild(listEl.lastChild);
				}
				
				for (let item of peopleList) {
					if (item.lastTransmission){
						if(item.lastTransmission.offer){
								let liEl = document.querySelector("#peer-radio-stationlist-el").content.cloneNode(true).firstElementChild;

								let btn = liEl.querySelector("button");
								console.log("Set Station: ", item);
								btn.addEventListener("click", event => ctrl.acceptOffer(item)
								);

								let img = liEl.querySelector("img");
								img.src = "../../services/documents/" + item.avatarReference;
								liEl.querySelector("output.name").value = item.forename;
								var date = new Date(item.lastTransmission.timestamp); // https://makitweb.com/convert-unix-timestamp-to-date-time-with-javascript/
								liEl.querySelector("output.lasttransmission").value = date.toLocaleDateString() + " " + date.toLocaleTimeString(); 
								
								listEl.appendChild(liEl);
						}
					}
				}
			}

			// if(ctrl.connection.connectionState == "connected"){
			// 	return; // stop updating station list while streaming ...
			// }
			setTimeout( function() {setupStationList(ctrl)}, 10000);
		}
	// });
	
	window.addEventListener("load", event => {
		const anchor = document.querySelector("header li:nth-of-type(3) > a");
		const controller = new PeerRadioController();
		controller.refreshAddress();
		anchor.addEventListener("click", event => controller.display());
	});
} ());

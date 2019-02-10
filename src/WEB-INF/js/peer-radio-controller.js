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

			let offer = await this.connection.createOffer();
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
			let offer = this.connection.localDescription.sdp;
			
			// for local network and testing disabled, because is not working
			//if (this.address) sdp = sdp.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, this.address);

			document.querySelector("#offer").value = offer;
			document.querySelector("#log").value += "[offer generated]\n";
						
			this.registerNegotiation(true, offer);
			
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

// END WEB-RTC server/sender ****************************************************

// WEB-RTC listener *************************************************************
	// recreate offer from sdp, then create answer
	Object.defineProperty(PeerRadioController.prototype, "acceptOffer", {
		value: async function acceptOffer(sender) {
			console.log(sender);
			if (!sender.negotiation) sender.negotiation = {};
			let sdp = sender.negotiation.offer;
			if (sdp.length === 0) return;

			if (this.connection) this.connection.close();
			this.connection = new RTCPeerConnection();
			this.connection.addEventListener("icecandidate", event => this.handleIceCandidate_listener(event.candidate));
			this.connection.addEventListener("datachannel", event => this.handleReceiveChannelOpened_listener(event.channel));
			//this.connection.addEventListener('track', this.handleTrack_listener);
			this.connection.ontrack = this.handleTrack_listener;

			await this.connection.setRemoteDescription({ type: "offer", sdp: sdp });
			let answer = await this.connection.createAnswer();
			await this.connection.setLocalDescription(answer);

			sender.negotiation.answer = answer.sdp;
			this.registerAnswer(sender, answer.sdp);

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
			if (searchString) path = path + "?" + searchString;
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
	Object.defineProperty(PeerRadioController.prototype, "registerNegotiation", {
		value: async function registerNegotiation(checkForListeners, offer) {
			console.log("registerNegotiation")
			let person = Controller.sessionOwner;
			console.log("Person: ", person);
			let path = "/services/people/";// + person;
			
			console.log("SDP: ", this.connection.localDescription.sdp);
			person.negotiation = {
				timestamp: Date.now(),
				offer: offer
			}
			// wenn nicht klappt, body: JSON.stringify(person)
			console.log("POST Transmission:\n", person);
			let response = await fetch(path, { method: "POST", 
				headers: {"Content-Type": "application/json"},
				credentials: "include", body: JSON.stringify(person),
				});
			
			if (!response.ok) throw new Error(response.status + " " + response.statusText);
			console.log(response.json());
			console.log("registerNegotiation DONE.");

			if (checkForListeners) {
				checkForAnswer(this, offer);
			}
		}
	});

	Object.defineProperty(PeerRadioController.prototype, "unregisterNegotiation", {
		value: async function unregisterNegotiation() {
			console.log("unregisterNegotiation")
			let person = Controller.sessionOwner;
			let path = "/services/people";// + person;
			
			delete person.negotiation;

			// wenn nicht klappt, body: JSON.stringify(person)
			console.log("POST Transmission offer deleted");
			let response = await fetch(path, { method: "POST", 
				headers: {"Content-Type": "application/json"},
				credentials: "include", body: JSON.stringify(person),
				});
			
			if (!response.ok) throw new Error(response.status + " " + response.statusText);
			console.log(response.json());
			console.log("unregisterNegotiation DONE.");
		}
	});

	Object.defineProperty(PeerRadioController.prototype, "registerAnswer", {
		value: async function registerAnswer(sender, answer) {
			console.log("registerAnswer")
			let receiver = Controller.sessionOwner;
			console.log("Station to listen to: ", sender);
			let path = "/services/people";
			
			receiver.negotiation = {
				timestamp: Date.now(),
				offer: sender.negotiation.offer,
				answer: answer,
			}
			console.log("updated receiver with answer", receiver);
			console.log("POST Answer");
			let response = await fetch(path, { method: "POST", 
				headers: {"Content-Type": "application/json"},
				credentials: "include", body: JSON.stringify(receiver),
				});
			
			if (!response.ok) throw new Error(response.status + " " + response.statusText);
			console.log(response.json());
			console.log("registerAnswer DONE.");
		}

	});

	Object.defineProperty(PeerRadioController.prototype, "unregisterAnswer", {
		value: async function unregisterAnswer(sender) {
			console.log("unregisterAnswer")
			let person = Controller.sessionOwner;
			let path = "/services/people/";
			
			delete person.negotiation;
			
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
	async function checkForAnswer(controller, offer) {
		console.log("check for answer");
		// get the stations from DB
		let person = Controller.sessionOwner;
		let builder = new URLSearchParams();
		builder.set("lowerNegotiationTimestamp", Date.now() - 5500);
		builder.set("negotiationOffer", offer);
		builder.set("negotiationAnswering", true);
		const searchString = builder.toString();
		console.log(searchString);
		let peopleList = await controller.fetchPeople(searchString);
		console.log(peopleList);

		if (peopleList.length > 0){
			controller.acceptAnswer(peopleList[0].negotiation.answer)
			console.log("answer accepted from: " + peopleList[0]);
		}else{
			controller.registerNegotiation(false, offer);
		}

		//TODO abort after negotiation has finished
		setTimeout( function() {checkForAnswer(controller, offer)}, 5000);
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
	// need to use controller parameter otherwise it does not work
	async function setupStationList(controller) {
			console.log("update station list");

			// get the stations from DB
			let builder = new URLSearchParams();
			builder.set("lowerNegotiationTimestamp", Date.now() - 10 * 60000);
			builder.set("negotiationOffering", true);
			let searchString = builder.toString();
			console.log(searchString);
			let peopleList = await controller.fetchPeople(searchString);
			console.log(peopleList);

			if (peopleList) {
				const listEl = document.getElementById("stationlist");
				while (listEl.lastChild) {
					listEl.removeChild(listEl.lastChild);
				}
				
				for (let item of peopleList) {
					if (item.negotiation){
						if(item.negotiation.offer){
								let liEl = document.querySelector("#peer-radio-stationlist-el").content.cloneNode(true).firstElementChild;

								let btn = liEl.querySelector("button");
								console.log("Set Station: ", item);
								btn.addEventListener("click", event => controller.acceptOffer(item)
								);

								let img = liEl.querySelector("img");
								img.src = "../../services/documents/" + item.avatarReference;
								liEl.querySelector("output.name").value = item.forename;
								var date = new Date(item.negotiation.timestamp); // https://makitweb.com/convert-unix-timestamp-to-date-time-with-javascript/
								liEl.querySelector("output.negotiation").value = date.toLocaleDateString() + " " + date.toLocaleTimeString(); 
								
								listEl.appendChild(liEl);
						}
					}
				}
			}

			// if(controller.connection.connectionState == "connected"){
			// 	return; // stop updating station list while streaming ...
			// }
			setTimeout( function() {setupStationList(controller)}, 10000);
		}
	// });
	// mit await aufrufen
		function negotiateLocalDescription(connection, offerMode) {
			return new Promise(async (resolve, reject) => {
				connection.onicecandidate = event => {
					if (!event.candidate) {
						delete connection.icecandidate;
						resolve(connection.localDescription);
					}
				};

				if (offerMode) {
					let offer = await connection.createOffer();
					await connection.setLocalDescription(offer);
				} else {
					let answer = await connection.createAnswer();
					await connection.setLocalDescription(answer);
				}
			});
		} 

	window.addEventListener("load", event => {
		const anchor = document.querySelector("header li:nth-of-type(3) > a");
		const controller = new PeerRadioController();
		controller.refreshAddress();
		anchor.addEventListener("click", event => controller.display());
	});
} ());

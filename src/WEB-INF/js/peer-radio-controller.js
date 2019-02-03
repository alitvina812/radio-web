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
		
		// copy from unidirektionale offer.js
		Object.defineProperty(this, "address", { enumerable : true,  writable: true, value: null });
		Object.defineProperty(this, "connection", { enumerable : true,  writable: true, value: null });
		Object.defineProperty(this, "channel", { enumerable : true,  writable: true, value: null });
		

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
	
	
	// make offer
	Object.defineProperty(PeerRadioController.prototype, "makeOffer", {
		value: async function () {
			if (this.connection) this.connection.close();
			this.connection = new RTCPeerConnection();
			this.connection.addEventListener("icecandidate", event => this.handleIceCandidate(event.candidate));
			this.channel = this.connection.createDataChannel("offer");
	
			let offer = await this.connection.createOffer();
			await this.connection.setLocalDescription(offer);
	
			document.querySelector("#log").value += "[channel opened]\n";	
		}
	});
	
	// handle ice candidate
	Object.defineProperty(PeerRadioController.prototype, "handleIceCandidate", {
		value: async function (iceCandidate) {
			if (iceCandidate) return;
	
			// display local description SDP with all candidates, and global IP4 addresses
			let sdp = this.connection.localDescription.sdp;
			if (this.address) sdp = sdp.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, this.address);
			document.querySelector("#offer").value = sdp;
			document.querySelector("#log").value += "[offer generated]\n";
			
			
			this.registerTransmission();
			
		}
	});	
	
	
	// accept answer
	Object.defineProperty(PeerRadioController.prototype, "acceptAnswer", {
		value: async function (sdp) {
			if (sdp.length === 0) return;
	
			let answer = new RTCSessionDescription({ type: "answer", sdp: sdp });
			await this.connection.setRemoteDescription(answer);
			document.querySelector("#log").value += "[answer accepted]\n";
		}
	});


	// send message to remote
	Object.defineProperty(PeerRadioController.prototype, "sendMessage", {
		value: function (data) {
			document.querySelector("#log").value += data + "\n";
			this.channel.send(data);
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
		value: async function() {
			let files = this.filesToPlay;
			if (this.currentTrack >= files.length) {
				this.currentTrack = 0;
			}

			if (!Controller.audioContext) Controller.audioContext = new AudioContext();
			console.log(this.filesToPlay);
			
			console.log("currentTrack: " + this.currentTrack);
			console.log(files[this.currentTrack]);

			
			let audioBuffer = await readFile(files[this.currentTrack]);
			let decodedBuffer = await Controller.audioContext.decodeAudioData(audioBuffer);
			let song = Controller.audioContext.createBufferSource();
			song.buffer = decodedBuffer;
			song.connect(Controller.audioContext.destination);
			console.log(song);
			
			song.start();
			this.currentTrack++;
			song.addEventListener("ended", () => {
				this.playSong();
			})

		}
	});

	// offer = rtc session description with type = "offer"
	// call before sending next track
	// und einmal ganz am anfang
	Object.defineProperty(PeerRadioController.prototype, "registerTransmission", {
		value: async function () {
			console.log("registerTransmission")
			let person = Controller.sessionOwner;
			console.log("Person: ", person);
			let path = "/services/people/";// + person;
			console.log("Path: ", path);
			console.log("SDP: ", this.connection.localDescription.sdp);
			person.lastTransmission = {
				address: this.address,
				timestamp: Date.now(),
				offer: this.connection.localDescription.sdp // this.offer.sdp
			}
			// wenn nicht klappt, body: JSON.stringify(person)
			console.log("POST Transmission");
			let response = await fetch(path, { method: "POST", // "Accept": "text_plain", 
				headers: {"Content-Type": "application/json"},
				credentials: "include", body: JSON.stringify(person),
				});
			
			if (!response.ok) throw new Error(response.status + " " + response.statusText);
			console.log(response.json());
			console.log("registerTransmission DONE.");
		}

	});
	
	Object.defineProperty(PeerRadioController.prototype, "displayPlayerSection", {
		value: function () {
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
					this.makeOffer();
					//this.registerTransmission();
					this.filesToPlay = files.files;
					this.playSong();
				})
            } catch (error) {
                this.displayError(error);
            }
        }
	});
	
	
	Object.defineProperty(PeerRadioController.prototype, "displayListenerSection", {
		value: function () {
			this.displayError();
			
            try {
            	let modeSelection = document.querySelector(".mode-selection");
            	let listenerSection = document.querySelector(".listener-section");
            	modeSelection.classList.remove("active");
            	listenerSection.classList.add("active");
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
	
	window.addEventListener("load", event => {
		const anchor = document.querySelector("header li:nth-of-type(3) > a");
		const controller = new PeerRadioController();
		controller.refreshAddress();
		anchor.addEventListener("click", event => controller.display());
	});
} ());


//(function () {
//    let RtcPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.msRTCPeerConnection;
//    let RtcSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription || window.msRTCSessionDescription;
//
//
//    let PeerRadioController = function () {
//        Controller.call(this);
//        this.peerConnection = new RtcPeerConnection();
//    }
//
//
//    PeerRadioController.prototype.displaySenderMode = async function () {
//        let offerDescription = await this.peerConnection.createOffer();
//        let sdp = offerDescription.sdp;
//        // update session user with lastTransmisstionOffer = sdp
//    };
//
//    PeerRadioController.prototype.displayListenerMode = async function (sender) {
//        let sdp = await fetch(person.lastTransmisstionOffer from selected sender (a person))
//        let offerDescription = await this.peerConnection.createOffer();
//        offerDescription.sdp = sdp;
//        await this.peerConnection.createAnswer(offerDescription),
//    };
//} ());
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
		value: function () {
			let person = Controller.sessionOwner;
			let path = "/services/people/" + person;
			person.lastTransmission = {
				address: null,
				timestamp: Date.now(),
				offer: this.offer.sdp
			}
			// wenn nicht klappt, body: JSON.stringify(person)
			let response = await fetch(path, { method: "POST", headers: {"Accept": "text_plain", "Content-Type": "application/json"}, credentials: "include", body: person});

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
				
				let files = document.getElementById("files");//.files;
				files.addEventListener('change', updateFileList);
				
				let streamButton = document.getElementById("stream");
				streamButton.addEventListener("click", () => {
					this.filesToPlay = files.files;
					this.playSong();
				})
				//let audio = new Audio(files[0]);
				//audio.play();
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
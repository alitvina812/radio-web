"use strict";

(function() {
    const Controller = de_sb_radio.Controller;

    const ServerRadioController = function() {
        Controller.call(this);
    }
    ServerRadioController.prototype = Object.create(Controller.prototype);
    ServerRadioController.prototype.constructor = ServerRadioController;

    Object.defineProperty(ServerRadioController.prototype, "display", {
        enumerable: false,
        configurable: false,
        writable: true, 
        value: function () {            
            console.log(Controller.sessionOwner)
            const mainElement = document.querySelector("main");
            mainElement.appendChild(document.querySelector("#server-radio-template").content.cloneNode(true).firstElementChild);
            this.startPlaylist();
        }
    });

    Object.defineProperty(ServerRadioController.prototype, "startPlaylist", {
        value: function () {
            let audioElement = document.getElementById("audio-element");
            let startButton = document.getElementById("start-playlist");
            
            const audioContext = new AudioContext();
            const track = audioContext.createMediaElementSource(audioElement);
            // track.connect(audioContext.destination);

            startButton.addEventListener("click", () => {

                if (audioContext.state === 'false') {
                    audioContext.resume();
                }

                if (startButton.dataset.playing === 'false') {
                    audioElement.play();
                    startButton.dataset.playing = 'true';
                } else if (startButton.dataset.playing === 'true') {
                    audioElement.pause();
                    startButton.dataset.playing = 'false';
                }
            }, false);

            const addressString = "../../services/documents/";
            const trackIds = [5, 8, 9, 10, 11, 12];

            audioElement.addEventListener("ended", function () {
                // startButton.dataset.playing = 'false';
                    let randomTrack = trackIds[Math.floor(Math.random() * trackIds.length)];
                    console.log(randomTrack);
                    audioElement.src = addressString + randomTrack;
                    audioElement.play();

            },  false);

            // volume
            const gainNode = audioContext.createGain();
            track.connect(gainNode).connect(audioContext.destination);
            const volumeControl = document.getElementById("volume");
            volumeControl.addEventListener("input", function () {
                gainNode.gain.value = this.value;
            }, false);

        }
    });

    Object.defineProperty(ServerRadioController.prototype, "getGenres", {
        value: async function () {
            // let sessionOwner = Controller.sessionOwner;
            try {
                genres = JSON.parse(await this.xhr("/services/tracks/genres", "GET", {"Accept": "application/json"}, "", "text"));
            } catch (error) {
                this.displayError(error);
            }
        }
    });
    
    Object.defineProperty(ServerRadioController.prototype, "getLyric", {
    	// Url get from Song Lyrics Database REST API (Moodle) 
    	// --> not quite sure if we need "/:artist/:track"
    	const url = 'https://orion.apiseeds.com/api/music/lyric/'; // :artist/:track';

    	// Get lyric by entering api key, artist, song and creating callback based on those information
        value: function (apikey, callback) {
        	try {
	        	artists = JSON.parse(await this.xhr("/services/tracks/artists", "GET", {"Accept": "application/json"}, "", "text"));
	        	track = JSON.parse(await this.xhr("/services/tracks", "GET", {"Accept": "application/json"}, "", "text"));
	        	
				// Throw error message if api key is not valid
			    if(!apikey) {
			        callback({success:false, error: 'Your api key is nowhere to be found, please pass a valid one.'},false);
			        return false;
			    }
			    
			    // Send GET request to Apiseed API and output the lyric
			    https.get(url + artist + "/" + track + "?apikey=" + apikey, lyric => {
			        lyric.setEncoding("utf8");
			        let body = ""; 
			        
			        lyric.on("data", data => {
			            body += data;
			        });
			        
			        // Exchange data with server, convert text into a JavaScript object and create callback
			        lyric.on("end", () => {
			            body = JSON.parse(body);
			            callback(body, lyric.headers);
			        });
			        
			        lyric.on("error", (e) => {
			            callback(false);
			        });
			    });	
        	} catch (error) {
                this.displayError(error);
            }
        }
    });

    window.addEventListener("load", event => {
        const anchor = document.querySelector("header li:nth-of-type(2) > a");
        const controller = new ServerRadioController();
        anchor.addEventListener("click", event => controller.display());
    });
} ());
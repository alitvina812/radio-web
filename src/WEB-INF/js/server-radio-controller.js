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
            let self = this;            
            console.log(Controller.sessionOwner)
            const mainElement = document.querySelector("main");
            mainElement.appendChild(document.querySelector("#server-radio-template").content.cloneNode(true).firstElementChild);
            // this.startPlaylist();
            // let genres = this.getGenres();
            // let artists = this.getArtists();
            let genres = ["blues", "country", "pop"];
            let artists = ["A B", "C D", "RRRR", "WSAQ"];
            handleGenresAndArtists(genres, artists);
            let checkboxes = document.getElementsByClassName("checkbox");
            for (let checkbox of checkboxes) {
                checkbox.addEventListener("click", function (e) {
                    self.updateLists(e);
                });
            }
            
            this.startPlaylist(); 
            // this.getTracks(["country"], []);     
            let g = this.getGenres()
            // this.getTracks(g, [])     
            this.getTracks()
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
    
    // Object.defineProperty(ServerRadioController.prototype, "getLyric", {
        
    //     // Get lyric by entering api key, artist, song and creating callback based on those information
    //     value: function (apikey, callback) {
    //         // Url get from Song Lyrics Database REST API (Moodle) 
    //         // --> not quite sure if we need "/:artist/:track"
    //         const url = 'https://orion.apiseeds.com/api/music/lyric/'; // :artist/:track';
    //     	try {
	//         	artists = JSON.parse(await this.xhr("/services/tracks/artists", "GET", {"Accept": "application/json"}, "", "text"));
	//         	track = JSON.parse(await this.xhr("/services/tracks", "GET", {"Accept": "application/json"}, "", "text"));
	        	
	// 			// Throw error message if api key is not valid
	// 		    if(!apikey) {
	// 		        callback({success:false, error: 'Your api key is nowhere to be found, please pass a valid one.'},false);
	// 		        return false;
	// 		    }
			    
	// 		    // Send GET request to Apiseed API and output the lyric
	// 		    https.get(url + artist + "/" + track + "?apikey=" + apikey, lyric => {
	// 		        lyric.setEncoding("utf8");
	// 		        let body = ""; 
			        
	// 		        lyric.on("data", data => {
	// 		            body += data;
	// 		        });
			        
	// 		        // Exchange data with server, convert text into a JavaScript object and create callback
	// 		        lyric.on("end", () => {
	// 		            body = JSON.parse(body);
	// 		            callback(body, lyric.headers);
	// 		        });
			        
	// 		        lyric.on("error", (e) => {
	// 		            callback(false);
	// 		        });
	// 		    });	
    //     	} catch (error) {
    //             this.displayError(error);
    //         }
    //     }
    // });

    Object.defineProperty(ServerRadioController.prototype, "getGenres", {
        value: async function () {
            try {
                let genres = JSON.parse(await this.xhr("/services/tracks/genres", "GET", {"Accept": "application/json"}, "", "text"));
                return genres
            } catch (error) {
                this.displayError(error);
            }
        }
    });

    Object.defineProperty(ServerRadioController.prototype, "getArtists", {
        value: async function () {
            try {
                let artists = JSON.parse(await this.xhr("/services/tracks/artists", "GET", {"Accept": "application/json"}, "", "text"));
                return artists
            } catch (error) {
                this.displayError(error);
            }
        }
    });
    Object.defineProperty(ServerRadioController.prototype, "getPeople", {
        value: async function () {
            try {
                let people = JSON.parse(await this.xhr("/services/people", "GET", {"Accept": "application/json"}, "", "text"));
                return people
            } catch (error) {
                this.displayError(error);
            }
        }
    });

    Object.defineProperty(ServerRadioController.prototype, "getTracks", {
        value: async function (genres, artists) {
            try {
                let pathStr = "/services/tracks"
                if (genres) {
                    for (const genre of genres) {
                        pathStr += "genre=" + genre
                    }
                }
                if (artists) {
                    for (const artist of artists) {
                        pathStr += "artist=" + artist + "&"
                    }
                }
                let tracks = JSON.parse(await this.xhr(pathStr, "GET", {"Accept": "application/json"}, "", "text"));
                return tracks
            } catch (error) {
                this.displayError(error);
            }
        }
    });

    Object.defineProperty(ServerRadioController.prototype, "updateLists", {
        value: function (event) {
            let target = event.target;
            // todo return lists
            let genres = [];
            let artists = [];
            if (target.checked) {
                let listType = target.parentElement.parentElement.id;
                if (listType == "genres-list") {
                    genres.push(target.id);
                } else if (listType == "artists-list") {
                    artists.push(target.id);
                }
            } else {
                // todo remove from array
            }
        } 
    });

    const handleGenresAndArtists = function (genres, artists) {
        let genresList = document.getElementById("genres-list");
        let artistsList = document.getElementById("artists-list");
        setupList(genresList, genres);
        setupList(artistsList, artists);


    }

    const setupList =  function (listEl, list) {
        for (let item of list) {
            const newItem = '<li><input type="checkbox" class = "checkbox" id="' + item + '"><label for="' + item + '">' + item + '</li>';
            listEl.innerHTML += newItem;
        }
    }


    window.addEventListener("load", event => {
        const anchor = document.querySelector("header li:nth-of-type(2) > a");
        const controller = new ServerRadioController();
        anchor.addEventListener("click", event => controller.display());
    });
} ());
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
        value: async function () {
            let self = this;            
            console.log(Controller.sessionOwner)
            const mainElement = document.querySelector("main");
            mainElement.appendChild(document.querySelector("#server-radio-template").content.cloneNode(true).firstElementChild);
            try {
                let responsePromiseG = fetch("/services/tracks/genres", { method: "GET", headers: {"Accept": "application/json"}, credentials: "include"});
                let responsePromiseA = fetch("/services/tracks/artists", { method: "GET", headers: {"Accept": "application/json"}, credentials: "include"});
                let responseG = await responsePromiseG;
                let responseA = await responsePromiseA;
                if (!responseG.ok) throw new Error(responseG.status + " " + responseG.statusText);
                if (!responseA.ok) throw new Error(responseA.status + " " + responseA.statusText);
                const genres = await responseG.json();
                const artists = await responseA.json();
                setupList(document.getElementById("genres-list"), genres);
                setupList(document.getElementById("artists-list"), artists);

                let updateButton = document.getElementById("update-playlist");
                updateButton.addEventListener("click", () => this.displayPlaylist());
            } catch (error) {
                this.displayError(error);
            }
        }
    });

    Object.defineProperty(ServerRadioController.prototype, "displayPlaylist", {
        value: async function () {
            try {
                let genres = this.genres = [];
                let artists = this.artists = [];
    
                // let checkboxes = document.getElementsByClassName("checkbox");
                let mainEl = document.querySelector("main");
                let checkboxes = mainEl.querySelectorAll("input.checkbox");
                console.log(checkboxes);
                
                for (let i = 0; i < checkboxes.length; i++) {
                    let listType = checkboxes[i].parentElement.parentElement.id;
                    if (checkboxes[i].checked) {
                        if (listType == "genres-list") {
                            genres.push(checkboxes[i].id);
                        } else if (listType == "artists-list") {
                            artists.push(checkboxes[i].id);
                        }
                    } 
                }
                let tracks = await this.fetchTracks(this.genres, this.artists);
                console.log(tracks);
                this.startPlaylist(tracks);
                
            } catch (error) {
                this.displayError(error);
            }
        } 
    });

    Object.defineProperty(ServerRadioController.prototype, "startPlaylist", {
        value: async function (tracks) {
            console.log("startPlaylist ...");
            console.log("tracks to play:")
            console.log(tracks);
            let audioElement = document.getElementById("audio-element");
            
            // for random
            var min = 0;
            var max = tracks.length - 1;
            min = Math.ceil(min);
            max = Math.floor(max);
            //console.log(min, max);
            // get a random index 
            var index = Math.floor(Math.random() * (max - min + 1)) + min;
            audioElement.src = "../../services/documents/" + tracks[index].recordingReference;
            console.log(audioElement);

            let startButton = document.getElementById("start-playlist");
            
            const audioContext = new AudioContext();
            const track = audioContext.createMediaElementSource(audioElement);

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
            // const trackIds = [5, 8, 9, 10, 11, 12];

            audioElement.addEventListener("ended", function () {
                // startButton.dataset.playing = 'false';
                    //audioElement.src = "../../services/documents/5";
                    // get anew random track from array
                    index = Math.floor(Math.random() * (max - min + 1)) + min;
                    audioElement.src = "../../services/documents/" + tracks[index].recordingReference;
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

    Object.defineProperty(ServerRadioController.prototype, "fetchLyrics", {
    	// Get lyric by entering api key, artist, song and creating callback based on those information
        value: async function (artist, track) {
        	const apikey = 'wdVPwolb7L7m6v81k5iLjaSmPqoH07r17KgPy3TzFa8aO5BhV0GY61j25QwL4djx';
        	const resource = 'https://orion.apiseeds.com/api/music/lyric/' + artist + "/" + track + "?apikey=" + apikey;
        	  
        	let response = await fetch(resource, {method: "GET", headers: {"Accept": "application/json"}});
            if (!response.ok) throw new Error(response.status + " " + response.statusText);
            return response.json();
            //const lyrics = await response.json();
            //return lyrics;
        }
    });

    const playHelper = function (audioContext, bufferNow, bufferLater) {
        let playNow = createSource(bufferNow);
        let source = playNow.source;
        let gainNode = playNow.gainNode;
        let duration = bufferNow.duration;
        let currTime = context.currentTime;

        gainNode.gain.linearRampToValueAtTime(0, currTime);
        gainNode.gain.linearRampToValueAtTime(1, currTime + audioContext.FADE_TIME);

        source.start();

        gainNode.gain.linearRampToValueAtTime(1, currTime + duration - audioContext.FADE_TIME);
        gainNode.gain.linearRampToValueAtTime(0, currTime + duration);

        let recurse = arguments.callee;
        audioContext.timer = setTimeout(function () {
            recurse(bufferLater, bufferNow);
        }, (duration - audioContext.FADE_TIME) * 1000);
    }

    const getNextTrack = function (tracks) {
        let randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
        console.log(randomTrack);
        nextTrack = addressString + randomTrack;
        return nextTrack;
    } 

    Object.defineProperty(ServerRadioController.prototype, "fetchTracks", {
        value: async function (genres, artists) {
            let path = "/services/tracks";
            if (genres.length > 0 || artists.length > 0) {
                path += "?";
               
                for (const genre of genres) {
                   path += "genre=" + genre + "&"
                }

                for (const artist of artists) {
                    path += "artist=" + artist + "&"
                }
                path = path.substring(0, path.length - 1);
            }
            let response = await fetch(path, { method: "GET", headers: {"Accept": "application/json"}, credentials: "include"});
            if (!response.ok) throw new Error(response.status + " " + response.statusText);
            return response.json();
        }
    });
    
    //fetchLyrics or fetchTrack sollte mit await aufgerufen werden. (weil sie Promise zurückgeben)



    Object.defineProperty(ServerRadioController.prototype, "genres", {
        writable: true,
        value: []
    });
    Object.defineProperty(ServerRadioController.prototype, "artists", {
        writable: true,
        value: []
    });

    const setupList =  function (listEl, list) {
        console.log(list);
        
        for (let item of list) {
            let liEl = document.querySelector("#server-radio-list-el").content.cloneNode(true).firstElementChild;
            liEl.querySelector("label").innerHTML = item;
            liEl.querySelector("input").id = item;
            listEl.appendChild(liEl);
            
        }
    }
    window.addEventListener("load", event => {
        const anchor = document.querySelector("header li:nth-of-type(2) > a");
        const controller = new ServerRadioController();
        anchor.addEventListener("click", event => controller.display());
    });
} ());
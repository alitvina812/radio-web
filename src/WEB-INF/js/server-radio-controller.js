"use strict";


(function() {
    const Controller = de_sb_radio.Controller;

    const ServerRadioController = function() {
        Controller.call(this);

        Object.defineProperty(this, "leftAudioSource", {
            enumerable: false,
            configurable: false,
            writable: true,
            value: null
        });

        Object.defineProperty(this, "rightAudioSource", {
            enumerable: false,
            configurable: false,
            writable: true,
            value: null
        });

        Object.defineProperty(this, "crossfadeDuration", {
            enumerable: false,
            configurable: false,
            writable: true,
            value: 10
        });

        Object.defineProperty(this, "compRatioValue", {
            enumerable: false,
            configurable: false,
            writable: true,
            value: 1.0
        });

    }
    ServerRadioController.prototype = Object.create(Controller.prototype);
    ServerRadioController.prototype.constructor = ServerRadioController;

    // Properties
    Object.defineProperty(ServerRadioController.prototype, "genres", {
        writable: true,
        value: []
    });
    Object.defineProperty(ServerRadioController.prototype, "artists", {
        writable: true,
        value: []
    });
    Object.defineProperty(ServerRadioController.prototype, "currentPlaylist", {
        writable: true,
        value: []
    });
    Object.defineProperty(ServerRadioController.prototype, "currentTrack", {
        writable: true,
        value: 0
    });
    Object.defineProperty(ServerRadioController.prototype, "nextTrack", {
        writable: true,
        value: 0
    });

    // Methods
    Object.defineProperty(ServerRadioController.prototype, "display", {
        enumerable: false,
        configurable: false,
        writable: true,
        value: async function () {
            const mainElement = document.querySelector("main");
            mainElement.appendChild(document.querySelector("#server-radio-template").content.cloneNode(true).firstElementChild);
            
            try {
                // get genres and artists, build checkbox lists
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
                let crossfadeInput = document.getElementById("crossfade_id");
                crossfadeInput.addEventListener("input", ()=> {
                    this.crossfadeDuration = crossfadeInput.value;
                    let valueSpan = document.getElementById("crossfade-duration");
                    valueSpan.innerText = crossfadeInput.value;
                })

                let compRatioInput = document.getElementById("compRatio_id");
                compRatioInput.addEventListener("input", ()=> {
                    this.compRatioValue = compRatioInput.value;
                    let valueSpan = document.getElementById("Compression-ratio");
                    valueSpan.innerText = compRatioValue.value;
                })

                // click button to display current playlist
                let updateButton = document.getElementById("update-playlist");
                updateButton.addEventListener("click", () => {
                    if (this.leftAudioSource != null) {
                        this.leftAudioSource.stop();
                    }
                    this.displayPlaylist();
                });
            } catch (error) {
                this.displayError(error);
            }
        }
    });

    Object.defineProperty(ServerRadioController.prototype, "displayPlaylist", {
        value: async function () {
            try {
                // fill genres and artists for playlist
                let genres = this.genres = [];
                let artists = this.artists = [];
                let mainEl = document.querySelector("main");
                let checkboxes = mainEl.querySelectorAll("input.checkbox");
                
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

                // get tracks, start playlist
                let tracks = await this.fetchTracks(this.genres, this.artists);
                this.currentPlaylist = shuffle(tracks);
                
                let section = document.getElementById("playlist-section");
                section.classList.remove("hide");
                this.startPlaylist();
                
            } catch (error) {
                this.displayError(error);
            }
        } 
    });

    Object.defineProperty(ServerRadioController.prototype, "startPlaylist", {
        value: async function () {
            let playList = this.currentPlaylist;
            let self = this;
            let fadeTime = this.crossfadeDuration;
            console.log("fadeTime: " + fadeTime);
            
                  
            setupPlayList(playList);
            
            if (!Controller.audioContext) Controller.audioContext = new AudioContext();
           
            if (this.currentTrack >= playList.length - 1) {
                this.currentTrack = 0;
            }
            // if (this.nextTrack >= playList.length) {
            //     this.nextTrack = 0;
            // } 
            let leftBuffer = await getDecodedBuffer(playList[this.currentTrack].recordingReference);
            // let rightBuffer = await getDecodedBuffer(playList[this.nextTrack].recordingReference);

            // get Lyrics
            this.displayLyrics(this.currentPlaylist[this.currentTrack].artist, this.currentPlaylist[this.currentTrack].name);
            
            this.leftAudioSource = Controller.audioContext.createBufferSource();
            this.leftAudioSource.loop = false;
            this.leftAudioSource.buffer = leftBuffer;
            let duration = leftBuffer.duration;
            let currentTime = Controller.audioContext.currentTime;
            // this.leftAudioSource.connect(Controller.audioContext.destination);
            // this.rightAudioSource = Controller.audioContext.createBufferSource();
            // this.rightAudioSource.loop = false;
            // this.rightAudioSource.buffer = rightBuffer;
            
            // volume 
            const gainNode = Controller.audioContext.createGain();
            this.leftAudioSource.connect(gainNode).connect(Controller.audioContext.destination);
            const volumeControl = document.getElementById("volume");
            volumeControl.addEventListener("input", function () {
                console.log("input value: " + this.value);
                console.log("gain node value: " + gainNode.gain.value);
                
                gainNode.gain.value = this.value;
            }, false); 

            gainNode.gain.linearRampToValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(1, currentTime + fadeTime);

            this.leftAudioSource.start();

            gainNode.gain.linearRampToValueAtTime(1, currentTime + duration - fadeTime);
            gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);

            setTimeout(function() {
                console.log('next song started');
                
                self.currentTrack++
                self.startPlaylist();
            }, (duration - fadeTime) * 1000);
        }
    });

    Object.defineProperty(ServerRadioController.prototype, "displayLyrics", {
    	// Get lyric by entering api key, artist, song and creating callback based on those information
        value: async function (artist, track) {
            const apikey = 'wdVPwolb7L7m6v81k5iLjaSmPqoH07r17KgPy3TzFa8aO5BhV0GY61j25QwL4djx';
            const resource = 'https://orion.apiseeds.com/api/music/lyric/' + artist + "/" + track + "?apikey=" + apikey;
                   
            let response = await fetch(resource, {method: "GET", headers: {"Accept": "application/json"}});
            if (!response.ok) throw new Error(response.status + " " + response.statusText);
            const lyrics = await response.json();

            document.querySelector("#current-track").innerHTML = lyrics.result.artist.name + ": " + lyrics.result.track.name;
            let lyricsArray = lyrics.result.track.text.split("\n");
            let lyricsElement = document.querySelector("#current-lyrics");
            while (lyricsElement.childElementCount > 0) lyricsElement.removeChild(lyricsElement.lastChild);
            for (const line of lyricsArray) {
                let div = document.createElement("div");
                div.appendChild(document.createTextNode(line));
                lyricsElement.appendChild(div);
            }
        }
    });

    const getDecodedBuffer = async function (recordingReference) {
        const path = "../../services/documents/" + recordingReference;        
        let response = await fetch(path, { method: "GET", headers: {"Accept": "audio/*"}, credentials: "include"});
        if (!response.ok) throw new Error(response.status + " " + response.statusText);
        let audioBuffer = await response.arrayBuffer();
        let decodedBuffer = await Controller.audioContext.decodeAudioData(audioBuffer);
        return decodedBuffer;
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
                // path = path.substring(0, path.length - 1);
                path += "resultLimit=50"
            }
            let response = await fetch(path, { method: "GET", headers: {"Accept": "application/json"}, credentials: "include"});
            if (!response.ok) throw new Error(response.status + " " + response.statusText);
            return response.json();
        }
    });
    
    //displayLyrics or fetchTrack sollte mit await aufgerufen werden. (weil sie Promise zurückgeben)



    // Helper
    const setupList =  function (listEl, list) {
        for (let item of list) {
            let newListElement = document.querySelector("#server-radio-list-el").content.cloneNode(true).firstElementChild;
            newListElement.querySelector("label").innerHTML = item;
            newListElement.querySelector("input").id = item;
            listEl.appendChild(newListElement);
        }
    }

    const setupPlayList =  function (trackList) {
        const listEl = document.getElementById("playlist");
        while (listEl.lastChild) {
			listEl.removeChild(listEl.lastChild);
		}
        
        for (let item of trackList) {
            let liEl = document.querySelector("#server-radio-playlist-el").content.cloneNode(true).firstElementChild;
            let img = liEl.querySelector("img");
            img.src = "../../services/documents/" + item.albumCoverReference;
            liEl.querySelector("output.name").value = item.name;
            liEl.querySelector("output.song").value = item.artist; 
            
            listEl.appendChild(liEl);
        }
    }

    function shuffle(myArr) {       
        let l = myArr.length, temp, index;  
        while (l > 0) {  
           index = Math.floor(Math.random() * l);
           l--;  
           temp = myArr[l];          
           myArr[l] = myArr[index];          
           myArr[index] = temp;       
        } 
        return myArr;    
    }  

    window.addEventListener("load", event => {
        const anchor = document.querySelector("header li:nth-of-type(2) > a");
        const controller = new ServerRadioController();
        anchor.addEventListener("click", event => controller.display());
    });
} ());
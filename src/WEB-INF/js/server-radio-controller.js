"use strict";


(function() {
    const Controller = de_sb_radio.Controller;

    let playList;
    let playListIndex = 0;

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


    function shuffel(myArr) {       
        var l = myArr.length, temp, index;  
        while (l > 0) {  
           index = Math.floor(Math.random() * l);  
           console.log(index, l);
           l--;  
           temp = myArr[l];          
           myArr[l] = myArr[index];          
           myArr[index] = temp;       
        } 
        return myArr;    
    }  

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
                var tracks = await this.fetchTracks(this.genres, this.artists);
                console.log(tracks);
                
                let section = document.getElementById("playlist-section");
                section.classList.remove("hide");
                this.startPlaylist(shuffel(tracks));
                
            } catch (error) {
                this.displayError(error);
            }
        } 
    });

    Object.defineProperty(ServerRadioController.prototype, "playNextTrack", {
        value: function(audioElement) {
            if (playListIndex < playList.length)
            {
                audioElement.src = "../../services/documents/" + playList[playListIndex].recordingReference;
                audioElement.play();
                //update lyrics
                this.fetchLyrics(playList[playListIndex].artist, playList[playListIndex].name);
                playListIndex++;
            } else {
                console.log("Playlist finished!");
            }
        }
    } );

    Object.defineProperty(ServerRadioController.prototype, "startPlaylist", {
        value: async function (tracks) {
            playList = tracks;
            console.log("tracks to play:")
            console.log(playList);

            setupPlayList(document.getElementById("playlist"), playList);
            
            // get Lyrics
            this.fetchLyrics(playList[playListIndex].artist, playList[playListIndex].name);
            playListIndex++;


            if (!Controller.audioContext) Controller.audioContext = new AudioContext();

            const path = "../../services/documents/" + playList[playListIndex].recordingReference;
            let response = await fetch(path, { method: "GET", headers: {"Accept": "audio/*"}, credentials: "include"});
            if (!response.ok) throw new Error(response.status + " " + response.statusText);
            let audioBuffer = await response.arrayBuffer();
            let decodedBuffer = await Controller.audioContext.decodeAudioData(audioBuffer);

            this.leftAudioSource = Controller.audioContext.createBufferSource();
            this.leftAudioSource.loop = false;
            this.leftAudioSource.buffer = decodedBuffer;
            this.leftAudioSource.connect(Controller.audioContext.destination);
            this.leftAudioSource.start();

            // volume 
            const gainNode = Controller.audioContext.createGain();
            this.leftAudioSource.connect(gainNode).connect(Controller.audioContext.destination);
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
                   
            let response = fetch(resource, {method: "GET", headers: {"Accept": "application/json"}}).then(
                function(u){ return u.json();}
              ).then(
                function(json){
                  console.log(json);
                  document.getElementById("current-track").innerHTML = json.result.artist.name + ": " + json.result.track.name;
                  let lyricsArray = json.result.track.text.split("\n");
                  document.getElementById("current-lyrics").innerHTML = "";
                  for (const line of lyricsArray) {
                      document.getElementById("current-lyrics").innerHTML += line + "<br>";
                  }
                  
                }
              )          
        }
    });

    // muss methode sein leftAudioSource, rightAudioSource
    const playHelper = function (audioContext, bufferNow, bufferLater) {
        let playNow = createSource(leftAudioSource);
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

    const setupPlayList =  function (listEl, list) {
        console.log(list);
        
        for (let item of list) {
            let liEl = document.querySelector("#server-radio-playlist-el").content.cloneNode(true).firstElementChild;
            let img = liEl.querySelector("img");
            img.src = "../../services/documents/" + item.albumCoverReference; 
            // img.title = 
            liEl.querySelector("output.name").value = item.name;
            liEl.querySelector("output.song").value = item.artist; 
            
            listEl.appendChild(liEl);
            
        }
    }

    window.addEventListener("load", event => {
        const anchor = document.querySelector("header li:nth-of-type(2) > a");
        const controller = new ServerRadioController();
        anchor.addEventListener("click", event => controller.display());
    });
} ());
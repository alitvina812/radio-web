/**
 * P2P Radio 
 */

"use strict";

(function () {
	const Controller = de_sb_radio.Controller;
	
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
		value: async function () {
			let self = this;            
            console.log(Controller.sessionOwner)
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
	
	Object.defineProperty(PeerRadioController.prototype, "displayPlayerSection", {
		value: function () {
			this.displayError();
			
            try {
            	let modeSelection = document.querySelector(".mode-selection");
            	let playerSection = document.querySelector(".player-section");
            	modeSelection.classList.remove("active");
            	playerSection.classList.add("active");
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
	
	window.addEventListener("load", event => {
		const anchor = document.querySelector("header li:nth-of-type(3) > a");
		const controller = new PeerRadioController();
		anchor.addEventListener("click", event => controller.display());
	});
} ());

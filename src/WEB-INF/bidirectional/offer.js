// for orginal see https://gist.github.com/bellbind/14dda289c7e35b2cec36273fd0f7c545
"use strict";

// create controller
let controller = new function () {
	Object.defineProperty(this, "address", { enumerable : true,  writable: true, value: null });
	Object.defineProperty(this, "connection", { enumerable : true,  writable: true, value: null });
	Object.defineProperty(this, "channel", { enumerable : true,  writable: true, value: null });
};


// refresh with global IP address of local machine
controller.refreshAddress = async function () {
	let response = await fetch("https://api.ipify.org/", { method: "GET", headers: { "Accept": "text/plain" }});
	if (!response.ok) throw new Error("HTTP " + response.status + " " + response.statusText);
	this.address = await response.text();
}


// make offer
controller.makeOffer = async function () {
	if (this.connection) this.connection.close();
	this.connection = new RTCPeerConnection();
	this.connection.addEventListener("icecandidate", event => this.handleIceCandidate(event.candidate));
	this.connection.addEventListener("datachannel", event => this.handleReceiveChannelOpened(event.channel));
	this.channel = this.connection.createDataChannel("offer");

	let offer = await this.connection.createOffer();
	await this.connection.setLocalDescription(offer);

	document.querySelector("#log").value = "";
	document.querySelector("#make").disabled = true;	
}


// select offer SDP and copy it to clipboard
controller.copyOfferToClipboard = function () {
	document.querySelector("#offer").select();
	document.execCommand("copy");
}


// accept answer
controller.acceptAnswer = async function (sdp) {
	if (sdp.length === 0) return;

	let answer = new RTCSessionDescription({ type: "answer", sdp: sdp });
	await this.connection.setRemoteDescription(answer);

	document.querySelector("#log").value += "[answer accepted]\n";
	document.querySelector("#accept").disabled = true;
}


//  send message to remote
controller.sendMessage = function (data) {
	document.querySelector("#log").value += "[offer] " + data + "\n";
	this.channel.send(data);
}


// receive message from remote
controller.handleMessageReceived = function (data) {
	document.querySelector("#log").value += "[answer] " + data + "\n";
}


// handle ice candidate
controller.handleIceCandidate = async function (iceCandidate) {
	if (iceCandidate) return;

	// display local description SDP with all candidates, and global IP4 addresses
	let sdp = this.connection.localDescription.sdp;
	if (this.address) sdp = sdp.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, this.address);
	document.querySelector("#offer").value = sdp;
	document.querySelector("#copy").disabled = false;
	document.querySelector("#accept").disabled = false;
}


// handle receive channel opened
controller.handleReceiveChannelOpened = function (channel) {
	channel.addEventListener("close", event => this.handleReceiveChannelClosed());
	channel.addEventListener("message", event => this.handleMessageReceived(event.data));

	document.querySelector("#log").value += "[channels opened]\n";
	document.querySelector("#send").disabled = false;
}


// handle receive channel closed
controller.handleReceiveChannelClosed = function () {
	if (this.channel) {
		this.channel.close();
		this.channel = null;
	}

	document.querySelector("#log").value += "[channels closed]\n";
	document.querySelector("#offer").value = "";
	document.querySelector("#answer").value = "";
	document.querySelector("#copy").disabled = true;
	document.querySelector("#accept").disabled = true;
	document.querySelector("#send").disabled = true;
	document.querySelector("#make").disabled = false;
}


//register DOM events after page loaded
window.addEventListener("load", event => {
	controller.refreshAddress();
	document.querySelector("#make").addEventListener("click", event => controller.makeOffer());
	document.querySelector("#copy").addEventListener("click", event => controller.copyOfferToClipboard());
	document.querySelector("#accept").addEventListener("click", event => controller.acceptAnswer(document.querySelector("#answer").value));
	document.querySelector("#send").addEventListener("click", event => controller.sendMessage(document.querySelector("#message").value));
	document.querySelector("#close").addEventListener("click", event => { if (controller.channel) controller.channel.close(); });
});
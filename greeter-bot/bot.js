"use strict";
const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const snoowrap = require("snoowrap");
const fs = require("fs");

const r = new snoowrap({
	userAgent: "myself",
	clientId: config.clientId,
	clientSecret: config.clientSecret,
	refreshToken: config.refreshToken
});

client.on("ready", () => {
	console.log("I am ready!");
});

client.on("voiceStateUpdate", (oldMember, newMember) => {
	if (oldMember.id !== config.ownerID) return;

	let newChannel = newMember.voiceChannel;
	let oldChannel = oldMember.voiceChannel;

	if (oldChannel === undefined && newChannel !== undefined) {
		// User joined
		let voiceChannel = newMember.voiceChannel;

		voiceChannel.join().then(connection => {
			const dispatch = connection.playFile('./onxyia_sound.ogg');
			dispatch.on("end", end => {
				voiceChannel.leave();
			})
		}).catch(err => console.log(err));
	}
	else if (newChannel === undefined) {
		// user left channel
	}
})

client.on("message", (message) => {
	const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
	const command = args.shift().toLowerCase();

	if (!message.content.startsWith(config.prefix) || message.author.bot) return;

	if (command === "ping") {
		message.channel.send("pong!");
	}
	else if (command === "foo") {
		message.channel.send("bar!");
	}
	else if (command === "prefix") {
		if (message.author.id !== config.ownerID) return;

		let newPrefix = args[0];

		config.prefix = newPrefix;

		fs.writeFile("./config.json", JSON.stringify(config), (err) => console.error);
		message.channel.send("Changed prefix to: " + config.prefix);
	}
	else if (command === "users") {
		// how to interactively set guildID? what if bot is in multiple guilds?
		message.channel.send("Users online: " + client.guilds.get(config.guildID).members.size);
	}
	else if (command === "kick") {
		let member = message.mentions.members.first();
		member.kick();
	}
	else if (command === "eyebleach") {
		r.getRandomSubmission('aww').then(post => {
			message.channel.send(post.url)
		})
	}
	else if (command === "meao") {
		if (message.member.voiceChannel === undefined) {
			message.channel.send("Not in a voice channel!");
			return;
		}
		let voiceChannel = message.member.voiceChannel;
		voiceChannel.join().then(connection => {
			const dispatchMeao = connection.playFile('./VO_CS2_117_Play_01.ogg');
			dispatchMeao.on("end", end => {
				voiceChannel.leave();
			})
		}).catch(err => console.log(err));
	}
});

client.login(config.token);
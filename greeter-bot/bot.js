"use strict";
const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const snoowrap = require("snoowrap");
const Movie = require("./movie.js");

const readline = require("readline");
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
			const dispatch = connection.playFile('./deathwing-sound.ogg');
			dispatch.on("end", end => {
				voiceChannel.leave();
			})
		}).catch(err => console.log(err));
	}
	else if (newChannel === undefined) {
		// user left channel
	}
})

var commands = {
	"ping": {
		usage: "[returns \"pong!\"]",
		process: function(client, msg, args) {
			msg.channel.send("pong!");
		}
	},
	"foo": {
		usage: "[returns \"bar!\"]",
		process: function(client, msg, args) {
			msg.channel.send("bar!");
		}
	},
	"prefix": {
		usage: "<new prefix>",
		process: function(client, msg, args) {
		if (msg.author.id !== config.ownerID) return;

		let newPrefix = args[0];

		config.prefix = newPrefix;

		fs.writeFile("./config.json", JSON.stringify(config), (err) => console.error);
		msg.channel.send("Changed prefix to: " + config.prefix);
		}
	},
	"users": {
		usage: "[returns number of online members]",
		process: function(client, msg, args) {
			if (!client.guilds.get(config.guildID).available) {
				console.log("Guild not available!");
				return;
			}

			// how to interactively set guildID? what if bot is in multiple guilds?
			var guildMems = client.guilds.get(config.guildID).members;

			// filter online members
			var onlineMembers = guildMems.filter(function(member) {
				return member.presence.status === 'online';
			});

			msg.channel.send("Users online: " + onlineMembers.size);
		}
	},
	"kick": {
		usage: "<@user>",
		process: function(client, msg, args) {
			let member = msg.mentions.members.first();
			if (msg.member.id !== config.ownerID) {
				msg.channel.send("Silly, only the owner can kick members.");
				return;
			}
			member.kick();
		}
	},
	"eyebleach": {
		usage: "[returns a random Reddit post from \/r\/eyebleach]",
		process: function(client, msg, args) {
			r.getRandomSubmission('aww').then(post => {
				msg.channel.send(post.url)
			})
		}
	},
	"meao": {
		usage: "[plays \"My eyes are open\" in current voice channel]",
		process: function(client, msg, args) {
			if (msg.member.voiceChannel === undefined) {
				msg.channel.send("Not in a voice channel!");
				return;
			}
			let voiceChannel = msg.member.voiceChannel;
			voiceChannel.join().then(connection => {
				const dispatchMeao = connection.playFile('./VO_CS2_117_Play_01.ogg');
				dispatchMeao.on("end", end => {
					voiceChannel.leave();
				})
			}).catch(err => console.log(err));
		}
	},
	"roll": {
		usage: "[returns a number between 1 and 100]",
		process: function(client, msg, args) {
			let randomNum = Math.floor(Math.random() * (100 - 1 + 1)) + 1;
			msg.channel.send(msg.author + " rolled a: " + randomNum);
		}
	},
	"pickmovie": {
		usage: "<genre>",
		process: function(client, msg, args) {
			msg.channel.send("Picking a " + args[0] + " genre movie...");
			var movies = [];
			let rl = readline.createInterface({
					input: fs.createReadStream('./scifi_movies')
				});

			rl.on('line', function (line) {
 				let movieName = line.slice(0, line.length-1-2);
 				let movieGenre = args[0];
 				let movieWatched = line[line.length-1];

 				let movie = new Movie(movieName, movieGenre, movieWatched);

 				console.log("Pushing " + movie);
 				});
		}
	}
}

function executeMessageCommand(msg) {
	const args = msg.content.slice(config.prefix.length).trim().split(/\s+/);
	const commandText = args.shift().toLowerCase();
	const command = commands[commandText];

	if (!msg.content.startsWith(config.prefix) || msg.author.bot) return;

	if (commandText === "help") {
		var arrayCommands = Object.keys(commands).sort();
		var reply = "";
		for (var i in arrayCommands) {
			reply += config.prefix + arrayCommands[i] + " " + commands[arrayCommands[i]].usage + "\n";
		}
		msg.channel.send(reply);
	}
	else if (command) {
		command.process(client, msg, args);
	}
	
}

client.on("message", (msg) => executeMessageCommand(msg));

client.login(config.token);
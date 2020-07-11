"use strict";
const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const snoowrap = require("snoowrap");	// reddit api
const r = new snoowrap({				// app for reddit api
	userAgent: "myself",
	clientId: config.clientId,
	clientSecret: config.clientSecret,
	refreshToken: config.refreshToken
});
const Movie = require("./movie.js");
const YTDL = require("ytdl-core");
const fs = require("fs");
var mysql = require("mysql");
const { Client, MessageEmbed } = require('discord.js');

var servers = {};	// Discord servers where bot is present
var sqlCon;			// MySQL connection

// function connectDatabase() {
// 	sqlCon = mysql.createConnection({
// 		host: config.sqlHost,
// 		user: config.sqlUsername,
// 		password: config.sqlPassword,
// 		database: config.sqlDatabaseName
// 	});

// 	sqlCon.connect(function(err) {
// 		if (err) throw err;
// 		console.log("Connected to database!");
// 	});

// 	sqlCon.on("error", function(err) {
// 		console.log("database error", err);
// 		if (err.code === "PROTOCOL_CONNECTION_LOST") {
// 			connectDatabase();
// 		} else {
// 			throw err;
// 		}
// 	});
// }


// plays YouTube audio in voice channel
function play(connection, msg) {
	console.log("in play()");
	var server = servers[msg.guild.id];

	server.dispatcher = connection.playStream(YTDL(server.queue[0], {filter: "audioonly"}));
	server.queue.shift();

	// after ending, check if queue has another link
	server.dispatcher.on("end", function() {
		console.log("in dispatcher.end()");

		if (server.queue[0]) {
			play(connection, msg);
		} else {
			connection.disconnect();
		}
	});
}

client.on("ready", () => {
	console.log("I am ready!");
	// connectDatabase();
});

client.on("voiceStateUpdate", (oldMember, newMember) => {
	if (oldMember.id !== config.ownerID) return;

	let newChannel = newMember.voiceChannel;
	let oldChannel = oldMember.voiceChannel;

	if (oldChannel === undefined && newChannel !== undefined) {
		// User joined
		let voiceChannel = newMember.voiceChannel;

		voiceChannel.join().then(connection => {
			const dispatch = connection.playFile("./alexstrasza-sound.ogg");
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
			let guildMems = client.guilds.get(config.guildID).members;

			// filter online members
			let onlineMembers = guildMems.filter(function(member) {
				return member.presence.status === "online";
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
	"aww": {
		usage: "[returns a random Reddit post from \/r\/aww]",
		process: function(client, msg, args) {
			r.getRandomSubmission("aww").then(post => {
				msg.channel.send(post.url)
			})
		}
	},
	"meao": {
		usage: "[plays \"My eyes are open\" in current voice channel]",
		process: function(client, msg, args) {
			if (!msg.member.voiceChannel) {
				msg.channel.send("Not in a voice channel!");
				return;
			}
			let voiceChannel = msg.member.voiceChannel;
			voiceChannel.join().then(connection => {
				const dispatchMeao = connection.playFile("./my_eyes_are_open.ogg");
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
		usage: "<genre> [returns a random movie from genre]",
		process: function(client, msg, args) {
			if (!args[0]) {
				msg.channel.send("Please specify a genre (action, thriller, scifi)."
								+ " Ex: !pickmovie scifi");
			} else {
				let genre = args[0].toLowerCase();
				msg.channel.send("Picking " + genre + " movie...");

				
				let sql = "SELECT * FROM movies " 
						+ "WHERE Genre = \"" + genre + "\"" ;
				sqlCon.query(sql, function(err, results, fields) {
					if (err) {
						return console.log(err);
					}
					else if (results.length <= 0) {
						msg.channel.send("No " + genre + " movies found.");
						return;
					}
					let randomSelection = Math.floor(Math.random() * (results.length-1));

					msg.channel.send("Get the popcorn! We're watching: " 
										+ results[randomSelection].MovieName);
				});
			}
		}
	},
	"play": {
		usage: "plays YouTube link audio in channel",
		process: function(client, msg, args) {
			msg.delete();

			if (!args[0]) {
				msg.channel.send("No link provided.");
				return;
			}

			if (!msg.member.voiceChannel) {
				msg.channel.send("Not in a voice channel!");
				return;
			}

			if (!servers[msg.guild.id]) {
				servers[msg.guild.id] = {
					queue: []
				};
			}

			var server = servers[msg.guild.id];
			server.queue.push(args[0]);
			console.log("Added to queue, server.queue.length is: " + server.queue.length);

			if (!msg.guild.voiceConnection){
				msg.member.voiceChannel.join().then(function(connection) {
					play(connection, msg);
				});
			}
		}
	},
	"skip": {
		usage: "skips current audio",
		process: function(client, msg, args) {
			var server = servers[msg.guild.id];
			console.log("There are " + server.queue.length + " songs in queue");

			if (!server) return;

			if (server.dispatcher) {
				server.dispatcher.end();
			}
		}
	},
	"stop": {
		usage: "stop current audio",
		process: function(client, msg, args) {
			let server = servers[msg.guild.id];

			if (msg.guild.voiceConnection)
				msg.guild.voiceConnection.disconnect();
		}
	},
	"embed": {
		usage: "send a embeded message",
		process: function(client, msg, args) {
			const embed = new MessageEmbed()
			.setTitle('this is a slicky embed')
			.addField('name', 3)
			.setAuthor('hi');

			msg.channel.send(embed);
		}
	},
	"add": {
		usage: "`!add perro dog` adds the word `perro` and translation `dog` to file.",
		process: function(client, msg, args) {
			if(args.length <= 0){
				msg.channel.send("No word/translation pair provided.");
				return;
			}

			var fs = require('fs');
			if (fs.existsSync('.\\wordsToLearn.json')) {
				fs.readFile('.\\wordsToLearn.json', function(error, content) {
					if(error) throw error;
	
					var data = JSON.parse(content);
					console.log(data.collection.length);
				});
			}
			else {
				var obj = {
					table: []
				};
				obj.table.push({word: args[0], translation: args[1]});
				var json = JSON.stringify(obj);

				fs.writeFile('.\\wordsToLearn.json', json, 'utf8', function(err, result) {
					if(err) throw err;
				});
			}
			
			
			// obj.table.push({name: args[0], translation: args[1]});

			// var json = JSON.stringify(obj);
			// fs.writeFile('wordsToLearn.json', json, 'utf8', callback);
		}
	}
}

//command to add word to add to json list
//command to show words in pages

function executeMessageCommand(msg) {
	const args = msg.content.slice(config.prefix.length).trim().split(/\s+/);
	const commandText = args.shift().toLowerCase();
	const cmd = commands[commandText];

	if (!msg.content.startsWith(config.prefix) || msg.author.bot) return;

	if (commandText === "help") {
		var arrayCommands = Object.keys(commands).sort();	// sort commands for output
		var reply = "";
		for (let i in arrayCommands) {
			reply += config.prefix + arrayCommands[i] + " " + commands[arrayCommands[i]].usage + "\n";
		}
		msg.channel.send(reply);
	}
	else if (cmd) {
		cmd.process(client, msg, args);
	}
	
}

client.on("message", (msg) => executeMessageCommand(msg));

client.login(config.token);
function clear() {
	for (var i = 0; i < 100; i++) {
		console.log("\n")
	}
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateLog() {
	//clear();
	//console.log(users);
	//console.log(rooms);
}


/*
  ________   _______  _____  ______  _____ _____ 
 |  ____\ \ / /  __ \|  __ \|  ____|/ ____/ ____|
 | |__   \ V /| |__) | |__) | |__  | (___| (___  
 |  __|   > < |  ___/|  _  /|  __|  \___ \\___ \ 
 | |____ / . \| |    | | \ \| |____ ____) |___) |
 |______/_/ \_\_|    |_|  \_\______|_____/_____/ 
                                                 
*/


var express = require("express");
var app = express();
var serv = require("http").Server(app);

app.get("/",function(req, res){
	res.sendFile(__dirname + "/client/index.html");
});
app.use("/client", express.static(__dirname + "/client"));
app.use("/public", express.static(__dirname + "/public"));

serv.listen(2000, "0.0.0.0");


/*
  _    _  _____ ______ _____   
 | |  | |/ ____|  ____|  __ \  
 | |  | | (___ | |__  | |__) | 
 | |  | |\___ \|  __| |  _  /  
 | |__| |____) | |____| | \ \  
  \____/|_____/|______|_|  \_\ 
                               
*/


var users = [];
class User {
	constructor(id) {
		this.id = id; //Same as the socketID
		this.username = "";
		this.roomID = "";
		this.player = null;
	}
}

class Player {
	constructor() {
		this.team = null;
		this.flag = false;
		this.zone = null;
		this.alive = false;

		this.x = 0; this.y = 0;
		this.vx = 0; this.vy = 0;
		this.speed = 0.88;
		this.friction = 0.9;

		this.left = null; this.right = null;
		this.up = null; this.down = null;
	}

 	applyFriction() {
		this.vx *= this.friction;
		this.vy *= this.friction;
	}

	updatePosition() {
		this.x += this.vx;
		this.y += this.vy;

		this.applyFriction();
	}

	checkCanvasCollisions(game) {
		if (this.x < 0)
			this.vx = this.speed * game.wallBounce; 
		if (this.x > game.optimalWidth-game.playerWidth)
			this.vx = -this.speed * game.wallBounce;
		if (this.y < 0)
			this.vy = this.speed * game.wallBounce;
		if (this.y > game.optimalHeight-game.playerHeight)
			this.vy = -this.speed * game.wallBounce;
	}

	checkZone(game) {
		if (this.x > game.optimalWidth - game.zoneWidth - game.playerWidth/2) {
			this.zone = "RedZone";
		} else if (this.x > game.optimalWidth / 2) {
			this.zone = "RedSide";
		} else if (this.x > game.zoneWidth - game.playerWidth/2) {
			this.zone = "BlueSide";
		} else if (this.x >= 0 || this.x < 0) {
			this.zone = "BlueZone";
		} else {
			console.log("ERROR");
		}
	}

	checkFlag(game, room) {
		if (this.flag == false) {
			if (this.zone.includes("Zone")) {
				if (this.team == "Red") {
					if (this.zone.includes("Blue")) {
						if (game.blueFlag == true) {
							game.blueFlag = false;
							this.flag = true;
						}
					}
				} else if (this.team == "Blue") {
					if (this.zone.includes("Red")) {
						if (game.redFlag == true) {
							game.redFlag = false;
							this.flag = true;
						}
					}
				}
			}
		} else if (this.flag == true) {
			if (this.zone.includes("Zone")) {
				if (this.team == "Red") {
					if (this.zone.includes("Red")) {
						game.incrementScore("Red");
						game.resetGame();
						room.resetPlayers();
					}
				} else if (this.team == "Blue") {
					if (this.zone.includes("Blue")) {
						game.incrementScore("Blue");
						game.resetGame();
						room.resetPlayers();
					}
				}
			}
		}
	}

	checkPlayerCollisions(game, room) {
		for (var i = 0; i < room.users.length; i++) {
			var p2 = room.users[i].player;
			if (!this.zone.includes("Zone") || !p2.zone.includes("Zone")) {
				if (this.team != p2.team) {
					if (this.x < p2.x + game.playerWidth  && this.x + game.playerWidth  > p2.x && this.y < p2.y + game.playerHeight && this.y + game.playerHeight > p2.y) {
						if (this.flag == false && p2.flag == true) {
							p2.killPlayer(game);

							var that = p2;
							setTimeout(
								function() {	
									that.respawnPlayer(game);
								}
							), game.respawnTime, that;
						} else if (this.flag == true && p2.flag == false) {
							this.killPlayer(game);
							
							var that = this;
							setTimeout(
								function() {	
									that.respawnPlayer(game);
								}
							), game.respawnTime, that;
						}

						if (this.team + "Side" == this.zone) {
							p2.killPlayer(game);

							var that = p2;
							setTimeout(
								function() {	
									that.respawnPlayer(game);
								}
							), game.respawnTime, that;
						} else if (p2.team + "Side" == p2.zone) {
							this.killPlayer(game);
							
							var that = this;
							console.log(game.respawnTime);
							setTimeout(
								function() {
									console.log(that);	
									that.respawnPlayer(game);
									console.log(that);
								}
							), game.respawnTime, that;
						}
					}
				} 
			}

			// if (p2.id != this.id) {
			// 	if (this.alive && p2.alive) {
			// 		if (this.x < p2.x + game.playerWidth  && this.x + game.playerWidth  > p2.x && this.y < p2.y + game.playerHeight && this.y + game.playerHeight > p2.y) {
			// 			var oneVX = this.vx;
			// 			var oneVY = this.vy;
			// 			var twoVX = p2.vx;
			// 			var twoVY = p2.vx;
			// 			var oneRatio = oneVX / oneVY;
			// 			var twoRatio = twoVX / twoVY;


			// 			this.vx = -oneVX * game.playerBounce;
			// 			this.vy = -oneVY * game.playerBounce;

			// 			if (Math.round(twoVX) + Math.round(twoVY) == 0) {
			// 				p2.vx = oneVX * game.playerBounce;
			// 				p2.vy = oneVY * game.playerBounce;
			// 			} else {
			// 				p2.vx = -twoVX * game.playerBounce;
			// 				p2.vy = -twoVY * game.playerBounce;
			// 			}
						
			// 			this.updatePosition();
			// 			p2.updatePosition();
			// 		}
			// 	}
			// }
		}
	}

	respawnPlayer(game) {
		if (this.team == "Red") {
			this.x = game.redSpawn.x;
			this.y = game.redSpawn.y;
		} else if (this.team == "Blue") {
			this.x = game.blueSpawn.x;
			this.y = game.blueSpawn.y;
		}
		this.alive = true;
	}

	killPlayer(game) {		
		if (this.flag == true) {
			if (this.team == "Red") {
				game.blueFlag = true;
			} else if (this.team == "Blue") {
				game.redFlag = true;
			}
		}
		this.flag = false;
		this.right = false;
		this.left = false;
		this.up = false;
		this.down = false;
		this.vx = 0;
		this.vy = 0;
		this.alive = false;
	}
}


/*
  _____   ____   ____  __  __ 
 |  __ \ / __ \ / __ \|  \/  |
 | |__) | |  | | |  | | \  / |
 |  _  /| |  | | |  | | |\/| |
 | | \ \| |__| | |__| | |  | |
 |_|  \_\\____/ \____/|_|  |_|
                              
*/

var rooms = [];
class Room {
	constructor(id) {
		this.id = id;

		this.users = [];
		this.admin = null; //Admin player

		this.isPlaying = false;

		this.game = null;
	}

	resetPlayers() {
		for (var i = 0; i < this.users.length; i++) {
			this.users[i].player.killPlayer(this.game);
			this.users[i].player.respawnPlayer(this.game);
		}
	}
}

class Game {
	constructor() {
		this.optimalHeight = 800;
		this.optimalWidth = 1650;
		this.zoneWidth = 140;
		this.playerHeight = 40;
		this.playerWidth = 40;
		this.fontSize = 80;
		this.wallBounce = 20;
		this.playerBounce = 10;

		this.resetTime = 2000;
		this.respawnTime = 5000;

		this.redScore = 0;
		this.blueScore = 0;
		this.redFlag = true;
		this.blueFlag = true;

		this.redSpawn = {
			x: (this.optimalWidth/8)*7,
			y: this.optimalHeight/2,
		}
		this.blueSpawn = {
			x: (this.optimalWidth/8)*1,
			y: this.optimalHeight/2,
		}
	}

	incrementScore(team) {
		if (team == "Blue") {
			this.blueScore++;
		} else if (team == "Red") {
			this.redScore++;
		}
	}

	resetGame() {
		this.redFlag = true;
		this.blueFlag = true;
	}
}


/*
   _____  ____   _____ _  ________ _______ 
  / ____|/ __ \ / ____| |/ /  ____|__   __|
 | (___ | |  | | |    | ' /| |__     | |   
  \___ \| |  | | |    |  < |  __|    | |   
  ____) | |__| | |____| . \| |____   | |   
 |_____/ \____/ \_____|_|\_\______|  |_|   
                                           
*/


var io = require("socket.io")(serv,{
	pingTimeout: 2000,
	pingInterval: 1000,
});

io.sockets.on("connection", function(socket) {
	updateLog();

	const user = new User(socket.id);
	users.push(user);
	
	updateLog();

	socket.on("disconnect", function() {
		updateLog();

		if (user.roomID != "") {
			leaveRoom();
		}

		//Find users index in user array and remove from array
		var index = 0;
		for (var i = 0; i < users.length; i++) {
			if (users[i].id == socket.id) {
				index = i;
				break;
			}
		}
		users.splice(index, 1);

		updateLog();
	});


/*
   _____ _____  ______       _______ ______ 
  / ____|  __ \|  ____|   /\|__   __|  ____|
 | |    | |__) | |__     /  \  | |  | |__   
 | |    |  _  /|  __|   / /\ \ | |  |  __|  
 | |____| | \ \| |____ / ____ \| |  | |____ 
  \_____|_|  \_\______/_/    \_\_|  |______|
                                            
*/


	socket.on("createRoom", function(username, roomID) {
		var err = "";

		if (username.length <= 0) {
			err = "One or more inputs empty!";
		}
		if (roomID.length <= 0) {
			err = "One or more inputs empty!";
		}

		//Check if the room doesnt exist
		for (var i = 0; i < rooms.length; i++) {
			if (rooms[i].id == roomID) {
				err = "A room already exists with this name!";
				break;
			}
		}

		//Final
		if (err.length > 0) {
			socket.emit("err", err);
		} else {
			var room = new Room(roomID);
			socket.join(room.id);

			user.username = username;
			user.roomID = room.id;

			room.users.push(user);
			room.admin = user;

			rooms.push(room);

			socket.emit("success", "createRoom");
			socket.emit("setupRoom", user.id, room.admin.id, room.id);
			io.to(room.id).emit("connectedPlayers", room.users, room.admin.id);

			updateLog();
		}
	});

/*
	   _  ____ _____ _   _ 
      | |/ __ \_   _| \ | |
      | | |  | || | |  \| |
  _   | | |  | || | | . ` |
 | |__| | |__| || |_| |\  |
  \____/ \____/_____|_| \_|
                           
*/

	socket.on("joinRoom", function(username, roomID) {
		var err = "";

		if (username.length <= 0) {
			err = "One or more inputs empty!";
		}
		if (roomID.length <= 0) {
			err = "One or more inputs empty!";
		}

		//Check if the room exists
		if (rooms.length > 0) {
			for (var i = 0; i < rooms.length; i++) {
				if (rooms[i].id == roomID) {
					if (rooms[i].isPlaying) {
						err = "Room is already playing!";
					}

					for (var x = 0; x < rooms[i].users.length; x++) {
						if (rooms[i].users[x].username == username) {
							err = "Username already exists in room!";
						}
					}

					break;
				} else {
					err = "A room doesn't exist with this name!";
				}
			}
		} else if (rooms.length <= 0){
			err = "A room doesn't exist with this name!";
		}

		//Final
		if (err.length > 0) {
			socket.emit("err", err);
		} else {
			var room = null;
			for (var i = 0; i < rooms.length; i++) {
				if (rooms[i].id == roomID) {
					room = rooms[i];
					break;
				}
			}

			socket.join(room.id);

			user.username = username;
			user.roomID = room.id;

			room.users.push(user);

			socket.emit("success", "joinRoom");
			socket.emit("setupRoom", user.id, room.admin.id, room.id);
			io.to(room.id).emit("connectedPlayers", room.users, room.admin.id);

			if (room.isPlaying == true) {
				socket.emit("setupGame");
			}

			updateLog();
		}
	});


/*
  _      ______     __      ________ 
 | |    |  ____|   /\ \    / /  ____|
 | |    | |__     /  \ \  / /| |__   
 | |    |  __|   / /\ \ \/ / |  __|  
 | |____| |____ / ____ \  /  | |____ 
 |______|______/_/    \_\/   |______|
                                     
*/

	function leaveRoom() {
		var err = ""

		if (err.length > 0) {
			socket.emit("err", err);
		} else {
			if (rooms.length > 0) {
				//Find the room
				var room = null;
				for (var i = 0; i < rooms.length; i++) {
					if (rooms[i].id == user.roomID) {
						room = rooms[i];
						break;
					}
				}

				socket.leave(room.id);

				//Set the users room to empty
				user.roomID = "";

				//Set the player back to null
				user.player = null;

				//Remove player at index
				var index = null;
				for (var i = 0; i < room.users.length; i++) {
					if (room.users[i].id == user.id) {
						index = i;
					}
				}
				room.users.splice(index, 1);

				//Check if the player leaving resulted in an empty room
				if (room.users.length > 0) {
					//Check if the player who left was admin and assign a new random one
					if (user.id == room.admin.id) {
						var random = getRandomInt(0, room.users.length-1);
						room.admin = room.users[random];

						socket.broadcast.to(room.admin.id).emit("setupRoom", room.admin.id, room.admin.id);
					}
				} else if (room.users.length <= 0){
					for (var i = 0; i < rooms.length; i++) {
						if (rooms[i].id == room.id) {
							index = i;
						}
					}
					rooms.splice(index, 1);
				}

				socket.emit("success", "leaveRoom");
				io.to(room.id).emit("connectedPlayers", room.users, room.admin.id);

				updateLog();
			}
		}
	}
	socket.on("leaveRoom", function() {
		leaveRoom();
	});	


/*
   _____ _______       _____ _______ 
  / ____|__   __|/\   |  __ \__   __|
 | (___    | |  /  \  | |__) | | |   
  \___ \   | | / /\ \ |  _  /  | |   
  ____) |  | |/ ____ \| | \ \  | |   
 |_____/   |_/_/    \_\_|  \_\ |_|   
                                     
*/

	socket.on("startRoom", function() {
		var room = null;
		for (var i = 0; i < rooms.length; i++) {
			if (rooms[i].id == user.roomID) {
				room = rooms[i];
			}
		}

		room.isPlaying = true;
		room.game = new Game();

		var redPlayers = 0;
		var bluePlayers = 0;

		for (var i = 0; i < room.users.length; i++) {
			room.users[i].player = new Player();

			if (redPlayers > bluePlayers) {
				room.users[i].player.team = "Blue";
				bluePlayers++;
			} else if (redPlayers < bluePlayers) {
				room.users[i].player.team = "Red";
				redPlayers++;
			} else if (redPlayers == bluePlayers) {
				var random = getRandomInt(0,1);
				if (random == 1) {
					room.users[i].player.team = "Red";
					redPlayers++;
				} else if (random == 0) {
					room.users[i].player.team = "Blue";
					bluePlayers++;
				}	
			}
		}

		io.to(room.id).emit("setupGame");

		room.resetPlayers();
	});

	socket.on("moveKeys", function(moveKeys) {
		if (user.player != null) {
			if (room != null) {
				if (room.isPlaying == true) {
					user.player.left = moveKeys.left;
					user.player.right = moveKeys.right;
					user.player.up = moveKeys.up;
					user.player.down = moveKeys.down;
				}
			}
		}
	});

/*
  _    _ _____  _____       _______ ______ 
 | |  | |  __ \|  __ \   /\|__   __|  ____|
 | |  | | |__) | |  | | /  \  | |  | |__   
 | |  | |  ___/| |  | |/ /\ \ | |  |  __|  
 | |__| | |    | |__| / ____ \| |  | |____ 
  \____/|_|    |_____/_/    \_\_|  |______|
                                           
 */


    var room = null;

	setInterval(function() {
		if (user.player != null) {
			if (room != null) {
				if (room.isPlaying == true) {
					//INPUT KEYS	

					if (user.player.alive == true) {
						var speed = user.player.speed;

						if (user.player.right) {
							user.player.vx += speed;
						}
						if (user.player.left) {
							user.player.vx -= speed; 
						}
						if (user.player.up) {
							user.player.vy -= speed;
						}
						if (user.player.down) {
							user.player.vy += speed;
						}
					}

					if (user.id == room.admin.id) {
						//PLAYER DATA
						var users = [];

						for (var i = 0; i < room.users.length; i++) {
							if (room.users[i].player.alive == true) {
								room.users[i].player.updatePosition();
								room.users[i].player.checkZone(room.game);
								room.users[i].player.checkFlag(room.game, room);
								room.users[i].player.checkPlayerCollisions(room.game, room);
								room.users[i].player.checkCanvasCollisions(room.game);

								users.push(room.users[i]);
							}
						}

						updateLog();

						//GAME DATA
						var game = room.game;

						io.to(room.id).emit("update", users, game);
					}
				} else if (room.isPlaying == false) {
					room = null;
				}
			} else {
				if (rooms.length >= 1) { 
					for (var i = 0; i < rooms.length; i++) {
						if (rooms[i].id == user.roomID ) {
							room = rooms[i];
						}
					}
				}
			}
		}
	},1000/100);
});
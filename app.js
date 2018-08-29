function clear() {
	for (var i = 0; i < 100; i++) {
		console.log("\n")
	}
}
clear();

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateLog() {
	clear();
	console.log(users);
	console.log(rooms);
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
		this.flag = null;
		this.zone = null;
		this.alive = null;

		this.x = 0; this.y = 0;
		this.vx = 0; this.vy = 0;
		this.speed = 0.08;
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

	checkCanvasCollisions(deltaTime, game) {
		if (this.x < 0)
			this.vx = this.speed * deltaTime * game.wallBounce; 
		if (this.x > game.canvasWidth-game.playerWidth)
			this.vx = -this.speed * deltaTime * game.wallBounce;
		if (this.y < 0)
			this.vy = this.speed * deltaTime * game.wallBounce;
		if (this.y > game.canvasHeight-game.playerHeight)
			this.vy = -this.speed * deltaTime * game.wallBounce;
	}

	checkZone(game) {
		if (this.x > game.canvasWidth - game.zoneWidth - game.playerWidth/2) {
			this.zone = "RedZone";
		} else if (this.x > game.canvasWidth / 2) {
			this.zone = "RedSide";
		} else if (this.x > game.zoneWidth - game.playerWidth/2) {
			this.zone = "BlueSide";
		} else if (this.x >= 0 || this.x < 0) {
			this.zone = "BlueZone";
		} else {
			console.log("ERROR");
		}
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
		this.admin = ""; //Player ID of admin user

		this.isPlaying = false;

		this.game = null;
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
		this.wallBounce = 10;

		this.redScore = 0;
		this.blueScore = 0;
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
					} else {
						err = "";
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

		for (var i = 0; i < room.users.length; i++) {
			room.users[i].player = new Player();
		}

		io.to(room.id).emit("setupGame");
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
    var lastUpdate = Date.now();
	setInterval(function() {
		var now = Date.now();
		var deltaTime = now - lastUpdate;
		if (room != null) {
			//If the current room object's ID is not the same as the users roomID, refind the room
			if (room.id != user.roomID) {
				for (var i = 0; i < rooms.length; i++) {
					if (rooms[i].id == user.roomID) {
						room = rooms[i];
					}
				}
			}

			// MAIN GAME LOOP
			if (room.isPlaying == true) {
				//INPUT KEYS
				if (user.player != null) {
					socket.on("moveKeys", function(moveKeys) {
						user.player.left = moveKeys.left;
						user.player.right = moveKeys.right;
						user.player.up = moveKeys.up;
						user.player.down = moveKeys.down;
					});
				}	

				//MAIN PACKET
				var users = [];

				for (var i = 0; i < room.users.length; i++) {
					var speed = room.users[i].player.speed;

					if (room.users[i].player.right) {
						room.users[i].player.vx += speed * deltaTime;
					}
					if (room.users[i].player.left) {
						room.users[i].player.vx -= speed * deltaTime; 
					}
					if (room.users[i].player.up) {
						room.users[i].player.vy -= speed * deltaTime;
					}
					if (room.users[i].player.down) {
						room.users[i].player.vy += speed * deltaTime;
					}

					room.users[i].player.updatePosition();
					room.users[i].player.checkCanvasCollisions(deltaTime, room.game);

					room.users[i].player.checkZone(room.game);

					users.push(room.users[i]);
				}

				var gameData = room.game;

				io.to(room.id).emit("update", users, gameData);

				//LEAVE AT END
				updateLog();
			}
		} else {
			for (var i = 0; i < rooms.length; i++) {
				if (rooms[i].id == user.roomID) {
					room = rooms[i];
				}
			}
		}
		lastUpdate = now;
	},1000/100);
});
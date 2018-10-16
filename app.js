function clear() {
	for (var i = 0; i < 100; i++) {
		console.log("\n")
	}
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
		this.username = null;
		this.roomID = null;
		this.player = null;
	}
}

class Player {
	constructor() {
		this.team = null;
		this.flag = false;
		this.zone = null;
		this.alive = false;
		this.respawning = false;

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
			this.zone = null;
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
			if (this.respawning == false && p2.respawning == false) {
				if (!this.zone.includes("Zone") || !p2.zone.includes("Zone")) {
					if (this.team != p2.team) {
						if (this.x < p2.x + game.playerWidth  && this.x + game.playerWidth  > p2.x && this.y < p2.y + game.playerHeight && this.y + game.playerHeight > p2.y) {
							if (this.flag == false && p2.flag == true) {
								p2.killPlayer(game);
								var that = p2;
								setTimeout(p2.respawnPlayer, game.respawnTime, game, that);
								p2.respawning = true;
								break;
							} else if (this.flag == true && p2.flag == false) {
								this.killPlayer(game);
								var that = this;
								setTimeout(this.respawnPlayer, game.respawnTime, game, that);
								this.respawning = true;
								break;
							}

							if (this.team + "Side" == this.zone) {
								p2.killPlayer(game);
								var that = p2;
								setTimeout(p2.respawnPlayer, game.respawnTime, game, that);
								p2.respawning = true;
								break;
							} else if (p2.team + "Side" == p2.zone) {
								this.killPlayer(game);
								var that = this;
								setTimeout(this.respawnPlayer, game.respawnTime, game, that);
								this.respawning = true;
								break;
							}
						}
					} 
				}
			}
		}
	}

	//Player is passed to the function if it is being respawned on a setTimeout, otherwise it is this
	//This is because "this" when called from a setTimeout function relates to the setTimeout function and
	//not the object.
	respawnPlayer(game, player=this) {
		if (player.team == "Red") {
			player.x = game.redSpawn.x;
			player.y = getRandomInt(0,game.optimalHeight);
		} else if (player.team == "Blue") {
			player.x = game.blueSpawn.x;
			player.y = getRandomInt(0,game.optimalHeight);
		}
		player.alive = true;
		player.respawning = false;
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
			
			var that = this.users[i].player;
			setTimeout(this.users[i].player.respawnPlayer, this.game.resetTime, this.game, that);
			this.users[i].player.respawning = true;
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
		this.wallBounce = 14;
		this.playerBounce = 10;

		this.resetTime = 2000;
		this.respawnTime = 1200;

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
	const user = new User(socket.id);
	users.push(user);

	var room = null;

	socket.on("disconnect", function() {
		leaveRoom(user, room, socket);
		room = null;

		//Find users index in user array and remove from array
		var index = 0;
		for (var i = 0; i < users.length; i++) {
			if (users[i].id == socket.id) {
				index = i;
				break;
			}
		}
		users.splice(index, 1);	
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
		if (room == null) {
			var err = "";

			if (username.length <= 0) {
				err = "One or more inputs empty!";
			}
			if (username.length > 16) {
				err = "16 character limit!";
			}

			if (roomID.length <= 0) {
				err = "One or more inputs empty!";
			}
			if (roomID.length > 16) {
				err = "16 character limit!";
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
				var newRoom = new Room(roomID);
				socket.join(newRoom.id);

				user.username = username;

				newRoom.users.push(user);
				newRoom.admin = user;

				rooms.push(newRoom);
				room = rooms.find(obj => obj.id == roomID);

				socket.emit("success", "createRoom", username);
				socket.emit("setupRoom", room.admin.id, room.id);
				io.to(room.id).emit("connectedPlayers", room.users, room.admin.id);	
			}
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
		if (room == null) {
			var err = "";

			if (username.length <= 0) {
				err = "One or more inputs empty!";
			}
			if (username.length > 16) {
				err = "16 character limit!";
			}

			if (roomID.length <= 0) {
				err = "One or more inputs empty!";
			}
			if (roomID.length > 16) {
				err = "16 character limit!";
			}

			//Check if the room exists
			if (rooms.length > 0) {
				for (var i = 0; i < rooms.length; i++) {
					if (rooms[i].id == roomID) {
						if (rooms[i].isPlaying) {
							err = "Room is already playing!";
							break;
						}

						for (var x = 0; x < rooms[i].users.length; x++) {
							if (rooms[i].users[x].username == username) {
								err = "Username already exists in room!";
								break;
							}
						}

						err = "";
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
				room = rooms.find(x => x.id === roomID);

				socket.join(room.id);

				user.username = username;

				room.users.push(user);

				socket.emit("success", "joinRoom", username);
				socket.emit("setupRoom", room.admin.id, room.id);
				io.to(room.id).emit("connectedPlayers", room.users, room.admin.id);

				if (room.isPlaying == true) {
					socket.emit("setupGame", room.game);
				}
			}
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
	
	//Put into a function as it is needed to be called from within this script
	function leaveRoom(user, room, socket) {
		if (room != null) {
			socket.leave(room.id);
			user.player = null;

			//Remove user from room
			room.users = room.users.filter(obj => obj.id != user.id);

			//Reassign admin if the admin was the one who left
			if (user.id == room.admin.id) {
				room.admin = room.users[getRandomInt(0, room.users.length-1)];
			}
			
			//If room is empty
			if (room.users.length <= 0) {
				//Destroy room
				rooms = rooms.filter(obj => obj.id != room.id);
			}

			socket.emit("success", "leaveRoom");

			if (room.users.length > 0) {
				io.to(room.id).emit("setupRoom", room.admin.id, room.id);
				io.to(room.id).emit("connectedPlayers", room.users, room.admin.id);
			}
		}
	}
	socket.on("leaveRoom", function() {
		leaveRoom(user, room, socket);
		room = null;
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

		io.to(room.id).emit("setupGame", room.game);

		room.resetPlayers();
	});

/*
  _    _ _____  _____       _______ ______ 
 | |  | |  __ \|  __ \   /\|__   __|  ____|
 | |  | | |__) | |  | | /  \  | |  | |__   
 | |  | |  ___/| |  | |/ /\ \ | |  |  __|  
 | |__| | |    | |__| / ____ \| |  | |____ 
  \____/|_|    |_____/_/    \_\_|  |______|
                                           
 */

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

	setInterval(function() {
		if (user.player != null) {
			if (room != null) {
				if (room.isPlaying == true) {
					//INPUT KEYS	

					if (user.player.alive == true) {
						var speed = user.player.speed;

						if (user.player.zone != null) {
							//10% less speed if you are in the other teams zone
							if (!user.player.zone.includes(user.player.team)) {
								speed = speed * 0.9;
							}
						}

						if (user.player.flag != null) {
							//10% less speed if you are carrying the flag
							if (user.player.flag == true) {
								speed = speed * 0.9;
							}
						}

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
							var player = room.users[i].player;
							if (player.alive == true) {
								player.updatePosition();
								player.checkZone(room.game);
								player.checkFlag(room.game, room);
								player.checkPlayerCollisions(room.game, room);
								player.checkCanvasCollisions(room.game);

								//Temporary object constructed to store necessary player
								//data for transferal
								const {x, y, alive, team, flag} = player;
								var playerData = {x, y, alive, team, flag, id: room.users[i].id}

								users.push(playerData);
							}
						}

						io.to(room.id).emit("update", users, room.game.blueScore, room.game.redScore);
					}
				}
			} 
		}
	},1000/100);
});
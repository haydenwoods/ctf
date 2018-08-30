function toggleScreen(screenName) {
	$("#container").show();
	$(".screen").each(function(i) {
		$(this).hide();
	});
	$("#" + screenName).show();
}

$(document).ready(function() {
	toggleScreen("menu");

	$("#input-username").focus();
	$("#input-username").select();

    const socket = io();

    var canvas = document.getElementById("canvas-game");
    var ctx = canvas.getContext("2d");

    ctx.translate(0.5, 0.5);

    var left = false;
	var right = false;
	var up = false;
	var down = false;

	window.addEventListener("keydown", onKeyDown, false);
	window.addEventListener("keyup", onKeyUp, false);

	function onKeyDown(event) {
		var keyCode = event.keyCode;
		switch (keyCode) {
	    	case 68: //d
	    		right = true;
	      		break;
	    	case 83: //s
	      		down = true;
	      		break;
	    	case 65: //a
	      		left = true;
	      		break;
	    	case 87: //w
	      		up = true;
	      		break;
	  	}

	  	var moveKeys = {
			left: left,
			right: right,
			up: up,
			down: down,
		}
		socket.emit("moveKeys", moveKeys);
	}

	function onKeyUp(event) {
		var keyCode = event.keyCode;
	  	switch (keyCode) {
	    	case 68: //d
	     	 	right = false;
	      		break;
	    	case 83: //s
	      		down = false;
	      		break;
	    	case 65: //a
	      		left = false;
	      		break;
	    	case 87: //w
	      		up = false;
	      		break;
	  	}

	  	var moveKeys = {
			left: left,
			right: right,
			up: up,
			down: down,
		}
		socket.emit("moveKeys", moveKeys);
	}

	$("#button-create").click(function(event) {
		var username = $("#input-username").val();
		var room = $("#input-room").val();
		socket.emit("createRoom", username, room);

		event.preventDefault();
	});	
	$("#button-join").click(function(event) {
		var username = $("#input-username").val();
		var room = $("#input-room").val();
		socket.emit("joinRoom", username, room);

		event.preventDefault();
	});	
	$("#button-leave").click(function(event) {
		socket.emit("leaveRoom");

		event.preventDefault();
	});
	$("#button-start").click(function(event) {
		socket.emit("startRoom");

		event.preventDefault();
	});

    //When there is an error on joining/creating/leaving
    socket.on("err", function(err) {
    	console.log(err);
    	$("#error").text(err);
    });

    //When there is success on joining/creating/leaving
    socket.on("success", function(type) {
    	$("#error").text("");
    	switch(type) {
		    case "createRoom":
		    	toggleScreen("room");
		        break;
		    case "joinRoom":
		        toggleScreen("room");
		        break;
		    case "leaveRoom":
		    	toggleScreen("menu");
		    	$("#menu-container h2").text("Capture The Flag")
		    	break;
		}
    });	

    //Called by the room when someone joins or leaves
    socket.on("connectedPlayers", function(players, adminID) {
    	$("#players").empty();
    	for (var i = 0; i < players.length; i++) {
   			var inner = players[i].username;
    		if (players[i].id == adminID) {
    			inner = "@ " + inner;
    		}
    		$("#players").append("<li>" + inner + "</li>");
    	}
    	$("#players").append('<div class="clearfix"></div>')
    	$("#player-count").text("Players: " + players.length);
    });	

    //Set up the room according to whether they are an admin or not
    socket.on("setupRoom", function(localID, adminID, roomName) {
    	$("#menu-container h2").text(roomName);
       	if (localID == adminID) {
			$("#button-start").show();    	
    	} else {
    		$("#button-start").hide()
    	}
    });

    socket.on("setupGame", function() {
    	toggleScreen("game");
    	$("#container").hide();
    });

    socket.on("update", function(users, gameData) {
    	var ratioWidth = (window.innerWidth-8) / gameData.optimalWidth;
    	var ratioHeight = (window.innerHeight-8) / gameData.optimalHeight;

    	var ratio = Math.min(ratioHeight,ratioWidth);

    	canvas.width = gameData.optimalWidth * ratio;
    	canvas.height = gameData.optimalHeight * ratio;
    	var zoneWidth = gameData.zoneWidth * ratio;
    	var playerHeight = gameData.playerHeight * ratio;
    	var playerWidth = gameData.playerWidth * ratio;

    	//Background
    	ctx.fillStyle = "#000";
    	ctx.fillRect(0,0,canvas.width,canvas.height);

    	//Middle Line
		ctx.strokeStyle="#4cd137";
		ctx.setLineDash([30, 25]);
		ctx.lineWidth=5*ratio;
		ctx.beginPath();
		ctx.moveTo(canvas.width/2,0);
		ctx.lineTo(canvas.width/2,canvas.height);
		ctx.stroke();

		//Blue zone
		ctx.fillStyle="rgba(76,209,55,0.4)";
		ctx.setLineDash([]);
		ctx.lineWidth=5*ratio;
		ctx.beginPath();
		ctx.moveTo(zoneWidth,0);
		ctx.lineTo(zoneWidth,canvas.height);
		ctx.stroke();
		ctx.fillRect(0,0,zoneWidth,canvas.height);

		//Red zone
		ctx.beginPath();
		ctx.moveTo(canvas.width-zoneWidth,0);
		ctx.lineTo(canvas.width-zoneWidth,canvas.height);
		ctx.stroke();
		ctx.fillRect(canvas.width-zoneWidth,0,zoneWidth,canvas.height);

    	for (var i = 0; i < users.length; i++) {
    		ctx.fillStyle = "#ff6666";
    		ctx.fillRect(users[i].player.x * ratio, users[i].player.y * ratio, playerWidth, playerHeight);
    	}

    	var fontSize = gameData.fontSize * ratio;
    	ctx.font = fontSize + "px sans-serif";
		ctx.fillStyle = "#4cd137";
		ctx.textAlign = "right"; 
		ctx.fillText(gameData.blueScore + "  ", canvas.width/2, 80 * ratio);
		ctx.textAlign = "left";
		ctx.fillText("  " + gameData.redScore, canvas.width/2, 80 * ratio);
    });    
});


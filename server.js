var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var gameloop = require('node-gameloop');
var port = 3000;
var rooms = [];
app.use('/scripts',express.static(__dirname + '/scripts'));
app.use('/assets',express.static(__dirname + '/assets'));

app.get('/',function(req, res){
	res.sendFile(__dirname + '/index.html');
});

server.listen(process.env.PORT || port, function(){
	console.log('Listening on '+server.address().port);
});

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  console.log('addr: '+add);
})

io.on('connection', function(socket){
	console.log('A client has connected');
	console.log("The Client's ID is: " + socket.id);
	socket.on('play',function(){
		let d = Math.floor(Math.random() * 4);
		let xi = Math.floor(Math.random() * 10) + 10;
		let yi = Math.floor(Math.random() * 10) + 10;
		player = {
		    dir: d,
		    parts: [{
		    	x: xi,
		    	y: yi,
		    	color: Math.floor(Math.random() * 5),
		    	dir: d,
		    	id: socket.id
		    }],
		    id:socket.id
		}

		for (var ep = 1; ep < 20; ep++)
			if(player.dir == 0){
				player.parts.push({
					x:xi,
					y:yi + ep
				});
			} else if(player.dir == 1){
				player.parts.push({
					x:xi - ep,
					y:yi
				});
			} else if(player.dir == 2){
				player.parts.push({
					x:xi,
					y:yi - ep
				});
			} else if(player.dir == 3){
				player.parts.push({
					x:xi + ep,
					y:yi
				});
			}

		console.log('part length: ' + player.parts.length);

		//console.log(player.parts);
		if(rooms.length > 0 && Object.keys(rooms[rooms.length - 1]).length < 10){
			player.room = rooms.length - 1;
			player.parts[0].room = rooms.length - 1;
			rooms[rooms.length - 1][socket.id] = player;
			socket.join(player.room.toString());
			console.log('Player joined room ' + player.room);
		} else {
			player.room = rooms.length;
			player.parts[0].room = rooms.length;
			rooms[rooms.length] = {};
			rooms[rooms.length - 1][socket.id] = player;
			socket.join(player.room.toString());
			console.log('Player joined room ' + player.room);
		}

		
		socket.emit('currentPlayers',rooms[player.room]);
		console.log(rooms[player.room]);
		socket.to(player.room.toString()).emit('newPlayer',player);
		
	});

	socket.on('leave',function(room){
		socket.leave(room);
	});

	socket.on('disconnect',function(){
		console.log('user disconnected: ', socket.id);
		if(player){
			delete rooms[player.room][socket.id];
			socket.to(player.room.toString()).emit('disconnected',socket.id);
		}
	});

	socket.on('changeDir',function(direction,room){
		console.log(rooms[room]);
		rooms[room][socket.id].dir = direction;
		rooms[room][socket.id].parts[0].dir = direction;
	});
});

const fps = 10;
let frameCount = 0.0;
let d = 0
const id = gameloop.setGameLoop(function(delta) {
    // `delta` is the delta time from the last frame
    //console.log('Hi there! (frame=%s, delta=%s)', frameCount+=1.0, delta);
    //d+=delta;
    for (var i = rooms.length - 1; i >= 0; i--) {
    	let players = {};
    	let heads = {};
    	heads.room = i;
    	Object.keys(rooms[i]).forEach(function(id){
    		//let alive = true;
    		let direction = rooms[i][id].dir;
    		let xi = 0;
    		let yi = 0;
    		if(direction == 0){
    			yi = -1;
    		} else if(direction == 1){
    			xi = 1;
    		} else if(direction == 2){
    			yi = 1;
    		} else if(direction == 3){
    			xi = -1;
    		}

    		let head = rooms[i][id].parts[0];

    		rooms[i][id].parts.splice(1,0,{
    			x:head.x,
    			y:head.y
    		});

    		head.x += xi;
    		head.y += yi;

    		heads[id] = head;

    		rooms[i][id].parts.splice([rooms[i][id].parts.length - 1],1);

    		for (var p = rooms[i][id].parts.length - 1; p >= 0; p--) {
    			//console.log(rooms[i][id].parts.length)
    			let part = rooms[i][id].parts[p];
    			if(part){
		    		if(!players[part.x]){
		    				players[part.x] = {};
		    				players[part.x][part.y] = 1;
		    		} else {
		    			if(players[part.x][part.y]){
		    				players[part.x][part.y] += 1;
		    			} else {
		    				players[part.x][part.y] = 1;
		    			}
		    		}
		    	}
    		}
    	});

    	Object.keys(rooms[i]).forEach(function(id){
    		let xi = rooms[i][id].parts[0].x;
    		let yi = rooms[i][id].parts[0].y;
    		if(players[xi][yi] > 1){
    			io.to(rooms[i][id].parts[0].id).emit('lost');
    			delete rooms[i][id];
    		}
    	});
    	io.in(i.toString()).emit('update',heads);
    }
}, 1000 / fps);
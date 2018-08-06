var socket = io.connect();

socket.on('lost',function(){
	location.reload();
	console.log('lost');
});

function convertCoordinates(a){
	return (a * 32);
}

function scoreCompare(a,b){
	if(a.score > b.score){
		return -1;
	} else {
		return 1;
	}
}

function func(){

let name = document.getElementById('name').value;
if(name == ''){
	name = 'Player';
}

console.log("Start");
console.log(name);

let leaderboard = [];

let numLead = 3;

function drawLead(g){
	for (var i = 0; i < g.leaders.length; i++) {
		g.leaders[i].destroy();
	}
	g.leaders = [];
	if(leaderboard.length > numLead){
		for (var i = 0; i < numLead; i++) {
			let t = g.add.text(-100,-100,(i+1).toString() + ': ' + leaderboard[i].name + '  ' + leaderboard[i].score, { fontSize: '20px', stroke: '#0000ff', fill: '#0000ff', strokeThickness:3 });
			g.leaders.push(t);
		}
	} else {
		for (var i = 0; i < leaderboard.length; i++) {
			let t = g.add.text(-100,-100,(i+1).toString() + ': ' + leaderboard[i].name + '  ' + leaderboard[i].score, { fontSize: '20px', stroke: '#0000ff', fill: '#0000ff', strokeThickness:3 });
			g.leaders.push(t);
		}
	}
}

let elem = document.getElementById("b");
elem.parentNode.removeChild(elem);

let config = {
	type: Phaser.AUTO,
	width: window.innerWidth,
	height: window.innerHeight,
	physics: {
		default: 'arcade',
		arcade: {
			debug: false,
			gravity: { y: 0 }
		}
	},
	scene: {
		preload: preload,
		create: create,
		update: update
	} 
};

var game = new Phaser.Game(config);
var score = 5;
var scoreText;
var moved = true;

function preload(){
	this.load.tilemapTiledJSON('level1', 'assets/level1.json');
	this.load.image('tile','assets/backgroundi.png');
	this.load.image('part','assets/body.png');
	this.load.image('head','assets/head.png');
	this.load.image('food','assets/food.png');
}

function create(){

	let g = this;

	this.otherPlayers = {};

	this.foods = {};

	this.me = [];

	this.room = -1;
	this.direction = -1;

	
	this.map = this.add.tilemap('level1');
	let tile1 = this.map.addTilesetImage('bak','tile');
	this.background = this.map.createStaticLayer('Background',tile1,0,0);

	scoreText = this.add.text(-100,-100,'Score: '+ score, { fontSize: '26px', stroke: '#0000ff', fill: '#0000ff', strokeThickness:3 });
	scoreText.depth = 50;
	console.log('h: '+scoreText.displayHeight);
	

	socket.emit('play',name);
	
	socket.on('currentPlayers',function(players){
		Object.keys(players).forEach(function(id){
			if(id == socket.id){
				addMe(g,players[id]);
			} else {
				addOtherPlayer(g,players[id]);
			}
			let playerInfo = {};
			playerInfo.id = id;
			playerInfo.name = players[id].name;
			playerInfo.score = players[id].parts.length;
			leaderboard.push(playerInfo);
		});
		leaderboard.sort(scoreCompare);
		//console.log(leaderboard);
		g.leaders = [];
		g.leadText = g.add.text(-1000,-1000,'Leaderboard', { fontSize: '26px', stroke: '#0000ff', fill: '#0000ff', strokeThickness:3 });
		g.leadText.setPosition(g.me[0].x + window.innerWidth/2 - 240,g.me[0].y - window.innerHeight/2 + 12);
		scoreText.setPosition(g.me[0].x - window.innerWidth/2 + 12,g.me[0].y - window.innerHeight/2 + 12);
		drawLead(g);
	});

	socket.on('foods',function(food){
		Object.keys(food).forEach(function(x){
			g.foods[x] = {};
			Object.keys(food[x]).forEach(function(y){
				g.foods[x][y] = g.add.sprite(convertCoordinates(x),convertCoordinates(y),'food')
				.setOrigin(0,0)
				.setDisplaySize(32,32);
			});
		});
	});

	socket.on('delFood',function(x,y){
		g.foods[x][y].destroy();
		delete g.foods[x][y];
	});

	socket.on('incFood',function(x,y){
		if(!g.foods[x]){
			g.foods[x] = {};
		}
		g.foods[x][y] = g.add.sprite(convertCoordinates(x),convertCoordinates(y),'food')
			.setOrigin(0,0)
			.setDisplaySize(32,32);
		//console.log(x + ', ' + y);
	});

	socket.on('newPlayer',function(newPlayer){
		console.log('A player joined this room');
		addOtherPlayer(g,newPlayer);
		let playerInfo = {
			id:newPlayer.id,
			name:newPlayer.name,
			score:newPlayer.parts.length
		};
		leaderboard.push(playerInfo);
		leaderboard.sort(scoreCompare);
		drawLead(g);
	});

	socket.on('gain',function(id,part){
		if(id == socket.id){
			let extraP = g.add.sprite(convertCoordinates(part.x),convertCoordinates(part.y),'part').setOrigin(0,0);
			extraP.depth = 6;
			g.me.push(extraP);
			score++;
			console.log(score);
			scoreText.setText('Score: ' + score);
		} else {
			let extraP = g.add.sprite(convertCoordinates(part.x),convertCoordinates(part.y),'part').setOrigin(0,0);
			extraP.depth = 6;
			g.otherPlayers[id].push(extraP);
		}
		leaderboard.forEach(function(player){
			if(player.id == id){
				player.score++;
			}
		});
		leaderboard.sort(scoreCompare);
		drawLead(g);
	});

	socket.on('disconnected',function(id){
		console.log(id + 'disconnected');
		g.otherPlayers[id].forEach(function(part){
			part.destroy();
		});
		delete g.otherPlayers[id];
		for (var i = 0; i < leaderboard.length; i++) {
			leaderboard.splice(i,1);
		}
		drawLead(g);
	});
	
	socket.on('update',function(players){
		//console.log('update');
		//console.log(socket.id);


		Object.keys(players).forEach(function(id){
			g.room = players.room;
			if(id == socket.id){
				moved = true;
				g.me[g.me.length - 1].destroy();
				g.me.splice(g.me.length - 1,1);
				g.me.splice(1,0,g.add.sprite(g.me[0].x,g.me[0].y,'part').setOrigin(0,0));
				g.me[0].x = convertCoordinates(players[id].x);
				g.me[0].y = convertCoordinates(players[id].y);
			} else if(id.length > 5){
				let op = g.otherPlayers[id];
				//console.log(op);
				op[op.length - 1].destroy();
				op.splice(op.length - 1,1);
				op.splice(1,0,g.add.sprite(op[0].x,op[0].y,'part').setOrigin(0,0));
				op[0].x = convertCoordinates(players[id].x);
				op[0].y = convertCoordinates(players[id].y);
			}

			// dir change edge case:

		});

		//ui
		scoreText.x = g.me[0].x - window.innerWidth/2 + 12;
		scoreText.y = g.me[0].y - window.innerHeight/2 + 12;
		g.leadText.x = g.me[0].x + window.innerWidth/2 - 240;
		g.leadText.y = g.me[0].y - window.innerHeight/2 + 12;
		for (var i = 0; i < g.leaders.length; i++) {
			g.leaders[i].x = g.me[0].x + window.innerWidth/2 - 240;
			g.leaders[i].y = g.me[0].y - window.innerHeight/2 + 12 + (i+1)*25;
		}

	});

	this.keys = this.input.keyboard.createCursorKeys();
	this.wasd = {
	  up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
	  down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
	  left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
	  right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
	};
	this.mouse = this.input.activePointer;

}

function update(){
	//console.log('dir'+this.direction);
	
	if(moved){
		// controls:

		if ((this.keys.left.isDown || this.wasd.left.isDown) && (this.direction%2 == 0)) {
			moved = false;
			console.log('l');
			socket.emit('changeDir',3,this.room);
			this.direction = 3;
		} else if ((this.keys.right.isDown || this.wasd.right.isDown) && (this.direction%2 == 0)) {
			moved = false;
			console.log('r');
			socket.emit('changeDir',1,this.room);
			this.direction = 1;
		} else if ((this.keys.up.isDown || this.wasd.up.isDown) && (this.direction%2 == 1)) {
			moved = false;moved = false;
			console.log('u');
			socket.emit('changeDir',0,this.room);
			this.direction = 0;
		} else if ((this.keys.down.isDown || this.wasd.down.isDown) && (this.direction%2 == 1)) {
			moved = false;
			console.log('d');
			socket.emit('changeDir',2,this.room);
			this.direction = 2;
		} else if(this.mouse.justDown){
			moved = false;
			console.log('Mousex: '+this.mouse.x);
			console.log('Mousey: '+this.mouse.y);
			/*
			if(this.mouse.y > this.mouse.x * window.innerHeight/window.innerWidth){
				if(this.mouse.y > window.innerHeight - this.mouse.x * window.innerHeight/window.innerWidth ){
					if(this.direction%2 == 1){
						console.log('d');
						socket.emit('changeDir',2,this.room);
						this.direction = 2;
					}
				} else {
					if(this.direction%2 == 0){
						console.log('l');
						socket.emit('changeDir',3,this.room);
						this.direction = 3;
					}
				}
			} else {
				if(this.mouse.y > window.innerHeight - this.mouse.x * window.innerHeight/window.innerWidth){
					if(this.direction%2 == 0){
						console.log('r');
						socket.emit('changeDir',1,this.room);
						this.direction = 1;
					}
				} else {
					if(this.direction%2 == 1){
						console.log('u');
						socket.emit('changeDir',0,this.room);
						this.direction = 0;
					}
				}
			}
			// four section mouse control
			*/
			
			if(this.mouse.x >= window.innerWidth/2){
				if(this.direction == 3){
					this.direction = 0;
				} else {
					this.direction += 1;
				}
			} else {
				if(this.direction == 0){
					this.direction = 3;
				} else {
					this.direction -= 1;
				}
			}
			socket.emit('changeDir',this.direction,this.room);
			
			// right-left controls
		}
	}
}

// tis = game/this for all intents and purposes


function addMe(tis,player){
	
	tis.direction = player.dir;
	let xi = convertCoordinates(player.parts[0].x);
	let yi = convertCoordinates(player.parts[0].y);
	tis.me.push(tis.add.sprite(xi,yi,'head').setOrigin(0,0));
	tis.me[0].depth = 15;
	tis.cameras.main.startFollow(tis.me[0],);
	player.parts.forEach(function(part){
		let x = convertCoordinates(part.x);
		let y = convertCoordinates(part.y)
		if(x != xi || y != yi){
			tis.me.push(tis.add.sprite(x,y,'part').setOrigin(0,0));
			tis.me[tis.me.length - 1].depth = 6;
		}
	});
}

function addOtherPlayer(tis,player){
	let xi = convertCoordinates(player.parts[0].x);
	let yi = convertCoordinates(player.parts[0].y);
	let otherPlayer = [];
	otherPlayer.push(tis.add.sprite(xi,yi,'head').setOrigin(0,0));
	otherPlayer[0].depth = 14;
	player.parts.forEach(function(part){
		let x = convertCoordinates(part.x);
		let y = convertCoordinates(part.y)
		if(x != xi || y != yi){
			otherPlayer.push(tis.add.sprite(x,y,'part').setOrigin(0,0));
			otherPlayer[otherPlayer.length - 1].depth = 5;
		}
	});
	tis.otherPlayers[player.id] = otherPlayer;
	console.log(tis.otherPlayers[player.id]);
}


}
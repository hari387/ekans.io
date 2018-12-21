# Gridsnek.io: An online multiplayer version of the Snake Game

Play the game at: ekans-io.herokuapp.com

The server may take a few seconds to start.

Uses:
- Node.js
- Phaser.io (HTML5 Game Engine)
- Socket.io (Event based server-client communication framework for Node.js)

The number of squares (parts) a player consists of is their score. When a player joins the game, they will start with a score of 5. The map is 150 x 150, and players spawn randomly. You increase your score by eating apples, and your snake grows in length accordingly. The objective is to get to the top of the leaderboard, which displays the 3 players with the highest score. 

You exit the game when you run into a wall or another player, or yourself. When you die, approximately ½ of your parts to turn into apples, incentivizing players to take risks to cut off those on the leaderboard. There will be up to 10 players in the game at any point.

;(function($, window, document, undefined) {
	var $win = $(window);
	var $doc = $(document);

	$doc.ready(function() {
		var snake = new Game();

		$('[data-difficulty]').on('click', function() {
			snake.settings.difficulty = $(this).data('difficulty');

			$(this).addClass('active').siblings().removeClass('active');
		});
	});
})(jQuery, window, document);

var Game = (function() {
	var Game = function() {
		this.settings = {
			numberOfRows: 35,
			numberOfColumns: 60,
			difficulty: 'hard'
		}

		this.difficulties = {
			'easy': {
				speed: 100,
				score: 8,
				bonusScore: 32
			},
			'normal': {
				speed: 75,
				score: 16,
				bonusScore: 64
			},
			'hard': {
				speed: 50,
				score: 32,
				bonusScore: 128
			}
		};

		this.frameTime = 0;

		this.scoreMultiplier = 0;

		this.bonusScoreMultiplier = 0;

		this.score = 0;

		this.dotHits = 0;

		this.eating = false;

		this.playing = false;

		this.moveTimeout = null;

		this.direction = '';

		//Startup Position
		this.startUpPath = [
			[1, 1],
			[1, 2],	
			[1, 3]	
		];

		this.path = [];

		this.dot = [];

		this.bonus = [];

		this.bonusVisibilityTimeout = null;

		this.init();
	};

	Game.prototype.init = function() {
		this.addEvents();

		this.getElements();

		this.getDimentions();
	};

	Game.prototype.getElements = function() {
		this.canvas = document.getElementById('canvas');

		this.scoreEl = document.getElementById('score');

		this.ctx = this.canvas.getContext('2d');
	};

	Game.prototype.getDimentions = function() {
		this.canvasWidth = this.canvas.width;
		this.canvasHeight = this.canvas.height;

		this.cellWidth = this.canvasWidth / this.settings.numberOfColumns;
		this.cellHeight = this.canvasHeight / this.settings.numberOfRows;
	};

	Game.prototype.addEvents = function() {
		var that = this;

		document.onkeydown = function(event) {
			if ( event.keyCode === 32 && !that.playing ) {//Start the game unless its already started
				that.startGame();
			}

			event.preventDefault();

			if ( that.playing ) {
				var lastDirection = that.directionQueue[0] || that.direction;

				switch ( event.keyCode ) {
					case 37:
						if ( lastDirection !== 'right' ) {
							that.directionQueue.unshift('left');
						}

						break;

					case 38:
						if ( lastDirection !== 'down' ) {
							that.directionQueue.unshift('up');
						}

						break;

					case 39:
						if ( lastDirection !== 'left' ) {
							that.directionQueue.unshift('right');
						}

						break;

					case 40:
						if ( lastDirection !== 'up' ) {
							that.directionQueue.unshift('down');
						}

						break;
				}
			}

		};
	};

	Game.prototype.startGame = function() {
		this.reset();

		this.playing = true;

		this.dot = this.getRandomPosition();

		this.updateCanvas();
	}

	Game.prototype.endGame = function() {
		this.playing = false;
	};

	Game.prototype.reset = function() {
		var difficulty = this.difficulties[this.settings.difficulty];

		this.frameTime = difficulty.speed;

		this.scoreMultiplier = difficulty.score;

		this.bonusScoreMultiplier = difficulty.bonusScore;

		this.directionQueue = [];

		this.path = this.startUpPath.slice(); //Set start path positions without creating reference to this.startUpPath

		this.direction = 'down';

		this.bonus = [];
		
		this.dotHits = 0;

		this.updateScore(0);
	};

	Game.prototype.updateCanvas = function() {
		//Reset Canvas on every move
		this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

		//Draw Snake
		for (var i = 0; i < this.path.length; i++) {
			if ( i + 1 === this.path.length ) {
				this.drawEl(this.path[i], 'green');
			} else {
				this.drawEl(this.path[i], 'white');
			}
		};

		//Draw Snakes food
		this.drawEl(this.dot, 'blue');

		//Draw Bonus food 
		if ( this.bonus.length ) {
			this.drawEl(this.bonus, 'red');
		}

		//Move the snake if the game is still going
		if ( this.playing ) {
			this.updatePath();
		}
	};

	Game.prototype.drawEl = function(position, color) {
		this.ctx.fillStyle = color;

		//Fill Rectangle at position [X, Y] based on two dimentional matrix
		this.ctx.fillRect(position[0] * this.cellWidth, position[1] * this.cellHeight, this.cellWidth, this.cellHeight);
	}

	Game.prototype.updatePath = function() {
		var newHeadPosition = [];
		var currentHeadPosition = this.path[this.path.length - 1];
		var that = this;
		var currentDirection = this.direction;

		if ( this.directionQueue.length ) {
			currentDirection = this.direction = this.directionQueue.pop();
		}

		//Set the new positioin of the snakes Head
		switch ( currentDirection ) {
			case 'down':
				newHeadPosition = [currentHeadPosition[0], currentHeadPosition[1] + 1];
				break;
			case 'up':
				newHeadPosition = [currentHeadPosition[0], currentHeadPosition[1] - 1];
				break;
			case 'right':
				newHeadPosition = [currentHeadPosition[0] + 1, currentHeadPosition[1]];
				break;
			case 'left':
				newHeadPosition = [currentHeadPosition[0] - 1, currentHeadPosition[1]];
				break;
		}

		//End the game if the new position is out of the canvas
		//End the game if the snake is eating its tail
		if ( this.isOutOfCanvas(newHeadPosition) || !this.isPositionFree(newHeadPosition) ) {
			this.endGame();
		}

		//Add the new head position
		this.path.push(newHeadPosition);

		//Check if the snake is eating
		if ( this.compareArrays(newHeadPosition, this.dot) ) {
			this.eating = true;

			this.updateScore(this.score + this.scoreMultiplier);
		} else {
			this.eating = false;
		}

		//Check if the snake is eating bonus food
		if ( this.compareArrays(newHeadPosition, this.bonus) ) {
			this.updateScore(this.score + this.bonusScoreMultiplier);

			this.bonus = [];
		}

		if ( !this.eating ) {
			//Cut the snakes tail if it is not eating
			this.path.shift();
		} else {
			//Set new food if the snake is eating
			this.dot = this.getRandomPosition();

			this.dotHits++;

			//Set Bonus food for every 5 dots eaten
			if ( this.dotHits % 5 === 0 ) {
				this.generateBonus();

				clearTimeout(this.bonusVisibilityTimeout);

				//Remove the bonus after given time
				this.bonusVisibilityTimeout = setTimeout(function() {
					that.bonus = [];
				}, this.frameTime * 50 );
			}
		}

		//Draw the next frame
		if ( this.playing ) {
			this.moveTimeout = setTimeout(function() {
				that.updateCanvas();
			}, this.frameTime);;
		}
	};

	Game.prototype.updateScore = function(newScore) {
		this.score = newScore;

		this.scoreEl.textContent = this.score;
	};

	Game.prototype.isOutOfCanvas = function(position) {
		return position[0] < 0 || position[0] > this.settings.numberOfColumns - 1 || position[1] < 0 || position[1] > this.settings.numberOfRows - 1;
	};

	Game.prototype.generateBonus = function() {
		do {
			this.bonus = this.getRandomPosition();
		} while ( this.compareArrays(this.bonus, this.dot) )
	};

	Game.prototype.getRandomPosition = function() {
		var position;

		do {
			position = [
				this.getRandomNumber(this.settings.numberOfColumns),
				this.getRandomNumber(this.settings.numberOfRows)
			];
		} while ( !this.isPositionFree(position) );

		return position;
	}

	Game.prototype.isPositionFree = function(newPosition, callback) {
		for ( var i = 0; i < this.path.length; i++ ) {
			if ( this.compareArrays(this.path[i], newPosition) ) {
				return false;
			}
		};

		return true;
	}

	Game.prototype.getRandomNumber = function(maxNum) {
		return Math.floor(Math.random() * maxNum);
	};

	Game.prototype.compareArrays = function(arr1, arr2) {
		if ( arr1.length !== arr2.length ) {
			return false;
		}

		for (var i = 0; i < arr1.length; i++) {
			if ( arr1[i] !== arr2[i] ) {
				return false;
			}
		};

		return true;
	}

	return Game;
})();
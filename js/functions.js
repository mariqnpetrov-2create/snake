;(function($, window, document, undefined) {
	var $win = $(window);
	var $doc = $(document);

	$doc.ready(function() {
		var snake = new Game();

		$('[data-difficulty]').on('click', function() {
			snake.settings.difficulty = $(this).data('difficulty');

			$(this).addClass('active').siblings().removeClass('active');
		});

		$doc.on('keydown', function(event) {
			if ( event.keyCode === 32 && !snake.playing ) {
				snake.startGame();
			}
		});
	});
})(jQuery, window, document);

var Game = (function() {
	function Game() {
		this.settings = {
			numberOfRows: 35,
			numberOfColumns: 60,
			difficulty: 'hard',
			autoPlay: false
		};

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

		this.foodCounter = 0;

		this.playing = false;

		this.moveTimeout = null;

		this.movement = {};

		this.snake = {};

		//Startup Position
		this.startUpMatrix = [
			[1, 1],
			[1, 2],	
			[1, 3]	
		];

		this.mainFood = [];

		this.bonusFood = [];

		this.bonusVisibilityTimeout = null;

		this.score = new Score();

		this.board = new Board(this.settings);

		this.init();
	};

	Game.prototype.init = function() {
		if ( this.settings.autoPlay ) {
			this.startGame();
		}
	};

	Game.prototype.startGame = function() {
		this.reset();

		this.playing = true;

		this.mainFood = new Food(this.snake.body, this.settings).create();

		this.setFrame();
	}

	Game.prototype.endGame = function() {
		this.playing = false;
	};

	Game.prototype.reset = function() {
		var difficulty = this.difficulties[this.settings.difficulty];

		this.frameTime = difficulty.speed;

		this.scoreMultiplier = difficulty.score;

		this.bonusScoreMultiplier = difficulty.bonusScore;

		this.movement = new Movement();

		this.snake = new Snake(this.startUpMatrix.slice());

		this.bonusFood = [];
		
		this.foodCounter = 0;

		this.score.update(0);
	};

	Game.prototype.setFrame = function() {
		var that = this;
		var leadingPosition = [];

		this.movement.updateDirection();

		leadingPosition = this.snake.moveHead(this.movement.direction);

		if ( this.checkEndingRules(leadingPosition) ) {
			this.endGame();

			return;
		}

		this.snake.addHead();

		if ( this.snake.isEating(this.bonusFood) ) {
			this.score.increase(this.bonusScoreMultiplier);

			this.bonusFood = [];
		}

		if ( this.snake.isEating(this.mainFood) ) {
			this.mainFood = new Food(this.snake.body, this.settings).create();

			this.score.increase(this.scoreMultiplier);

			this.foodCounter++;

			//Set Bonus food for every 5 food pieces eaten
			if ( this.foodCounter % 5 === 0 ) {
				this.bonusFood = new Food(this.snake.body, this.settings).create();

				clearTimeout(this.bonusVisibilityTimeout);

				//Remove the bonus after given time
				this.bonusVisibilityTimeout = setTimeout(function() {
					that.bonusFood = [];
				}, this.frameTime * 60 );
			}
		} else {
			this.snake.cutTail();
		}

		//Draw the next frame
		if ( this.playing ) {
			this.renderFrame();

			this.moveTimeout = setTimeout(function() {
				that.setFrame();
			}, this.frameTime);
		}
	};

	Game.prototype.checkEndingRules = function(position) {
		//Return true if the new position is out of the board
		//Return true if the new position is occupied
		return this.board.isOutOfView(position) || utils.isArrayInArray(position, this.snake.body);
	};

	Game.prototype.renderFrame = function() {
		var board = this.board;
		var snakeBody = this.snake.body;

		//Reset Canvas on every move
		board.clearBoard();

		//Draw Snake
		for (var i = 0; i < snakeBody.length; i++) {
			if ( i + 1 === snakeBody.length ) {
				//Draw Snake Head
				board.draw(snakeBody[i], 'green');
			} else {
				//Draw Snake Body
				board.draw(snakeBody[i], 'white');
			}
		};

		//Draw Main food
		board.draw(this.mainFood, 'blue');

		//Draw Bonus food 
		if ( this.bonusFood.length ) {
			board.draw(this.bonusFood, 'red');
		}
	};

	return Game;
})();

var Score = (function() {
	function Score() {
		this.val = 0;

		this.element = document.getElementById('score');
	}

	Score.prototype.increase = function(amount) {
		this.update(this.val + amount);
	}

	Score.prototype.update = function(amount) {
		this.val = amount;

		this.element.textContent = amount;
	}

	return Score;
})();

var Movement = (function() {
	function Movement() {
		this.direction = 'down';

		this.directionQueue = [];

		this.bindEvents();
	}

	Movement.prototype.bindEvents = function() {
		var that = this;

		document.onkeydown = function(event) {
			var lastDirection = that.directionQueue[0] || that.direction;

			switch ( event.keyCode ) {
				case 37:
					if ( lastDirection !== 'right' && lastDirection !== 'left' ) {
						that.directionQueue.unshift('left');
					}

					event.preventDefault();

					break;

				case 38:
					if ( lastDirection !== 'down' && lastDirection !== 'up' ) {
						that.directionQueue.unshift('up');
					}

					event.preventDefault();

					break;

				case 39:
					if ( lastDirection !== 'left' && lastDirection !== 'right' ) {
						that.directionQueue.unshift('right');
					}

					event.preventDefault();

					break;

				case 40:
					if ( lastDirection !== 'up' && lastDirection !== 'down' ) {
						that.directionQueue.unshift('down');
					}

					event.preventDefault();

					break;
			}
		};
	}

	Movement.prototype.updateDirection = function() {
		if ( this.directionQueue.length ) {
			this.direction = this.directionQueue.pop();
		}
	}

	return Movement;
})();

var Snake = (function() {
	function Snake(path) {
		this.body = path;

		this.head = [];
	};

	Snake.prototype.addHead = function() {
		this.body.push(this.head);
	};

	Snake.prototype.cutTail = function() {
		this.body.shift();
	};

	Snake.prototype.isEating = function(food) {
		if ( utils.compareArrays(this.head, food) ) {
			return true;
		} else {
			return false;
		}
	};

	Snake.prototype.moveHead = function(direction) {
		this.head = this.body[this.body.length - 1];

		var point = new Point(this.head);

		//Set the new position of the snake Head
		switch ( direction ) {
			case 'down':
				this.head = [point.x, point.y + 1];
				break;
			case 'up':
				this.head = [point.x, point.y - 1];
				break;
			case 'right':
				this.head = [point.x + 1, point.y];
				break;
			case 'left':
				this.head = [point.x - 1, point.y];
				break;
		}

		return this.head;
	};

	return Snake;
})();

var Food = (function() {
	function Food(path, config) {
		this.settings = config;

		this.path = path;
	};

	Food.prototype.create = function() {
		var position;

		do {
			position = [
				utils.getRandomNumber(this.settings.numberOfColumns),
				utils.getRandomNumber(this.settings.numberOfRows)
			];
		} while ( utils.isArrayInArray(position, this.path) );

		return position;
	};

	return Food;
})();

/* Point Manipulations */
var Point = (function() {
	function Point(array) {
		this.x = array[0];
		this.y = array[1];
	}

	return Point;
})();

/* Game Board */

var Board = (function() {
	function Board(config) {
		this.settings = config;

		this.init();
	};

	Board.prototype.init = function() {
		this.getBoard();

		this.setDimentions();
	};

	Board.prototype.getBoard = function() {
		this.canvas = document.getElementById('canvas');

		this.ctx = canvas.getContext('2d');
	};

	Board.prototype.setDimentions = function() {
		this.canvasWidth = this.canvas.width;
		this.canvasHeight = this.canvas.height;

		this.cellWidth = this.canvasWidth / this.settings.numberOfColumns;
		this.cellHeight = this.canvasHeight / this.settings.numberOfRows;
	}

	Board.prototype.clearBoard = function() {
		this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
	};

	Board.prototype.draw = function(position, color) {
		var point = new Point(position);
		this.ctx.fillStyle = color;

		//Fill Rectangle at position [X, Y] based on two dimensional matrix
		this.ctx.fillRect(point.x * this.cellWidth, point.y * this.cellHeight, this.cellWidth, this.cellHeight);
	};

	Board.prototype.isOutOfView = function(position) {
		var point = new Point(position);
		var boardLimits = new Point([this.settings.numberOfColumns - 1, this.settings.numberOfRows - 1]);

		return point.x < 0 || point.x > boardLimits.x || point.y < 0 || point.y > boardLimits.y;
	};

	return Board;
})();

/* Helper Functions */
var utils = (function() {
	function isArrayInArray(arr, parentArr) {
		for ( var i = 0; i < parentArr.length; i++ ) {
			if ( compareArrays(arr, parentArr[i]) ) {
				return true;
			}
		};

		return false;
	};

	function getRandomNumber(maxNum) {
		return Math.floor(Math.random() * maxNum);
	};

	function compareArrays(arr1, arr2) {
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
	
	return {
		isArrayInArray: isArrayInArray,
		getRandomNumber: getRandomNumber,
		compareArrays: compareArrays
	};
})();
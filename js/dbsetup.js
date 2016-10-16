var board,
game = new Chess(),
boardEl = $('#board'),
statusEl = $('#status'),
// fenEl = $('#fen'), FEN string is not being used
pgnEl = $('#pgn');

//used to store whether or not the game is over due to resignation or mututal draw agreement
var chessGameOver;
//global array of FEN strings, PGN, and statuus used when reviewing game
var totalFEN = [];
var totalPGN = [];
var totalStatus = []
//used to store what move the game is on, their will be double moves in total one for black and one for white
var moveCounter = 0;
var user; 
var WhiteSide;
var BlackSide;
//whether or not a prove move is stored
var preMoveYes = false;
//stores premove in string
var srcPreMove;
var targetPreMove;
//user preferences
var togglePremove = getCookie("premove");
var pieceTheme = getCookie("pieceTheme");
var togglePromotion = getCookie("promote");
//used to check if a player is viewing a game
var reviewGame = false;

//used when pausing the promotion so user can click which piece
var skipPromotion = false;

//default piece pawn promotes to when it reaches the end of the board
//q=queen, r=rook, b=bishop, n=knight
var pawnPromotion = "q";

function defaultTheme(){
	if (pieceTheme === ""){
		pieceTheme = "wikipedia"
	}
}
defaultTheme();

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
var onDragStart = function(source, piece, position, orientation) {
	//onclick premove should be undone	
	if (preMoveYes === true){
		removeHighlights('color');
  		preMoveYes = false;	
	}

	if (game.game_over() === true ||
		chessGameOver === true ||
    	(WhiteSide === user && piece.search(/^b/) !== -1) ||
    	(BlackSide === user && piece.search(/^w/) !== -1)) {
    	return false;
    }
};

var onDrop = function(source, target, piece) {

	//game.turn() returns back "w" for white or "b" for black
	var color = game.turn();
	
	//only allow premove if user enabled in preferences, by default premove is enabled
	if(togglePremove !== "false"){
		if( (color === 'w' && BlackSide === user) || (color === 'b' && WhiteSide === user)   ){
			preMoveYes = true;
			srcPreMove = source;
			targetPreMove = target;
			boardEl.find('.square-' + source).addClass('highlight-color'); //adds premove color
			boardEl.find('.square-' + target).addClass('highlight-color');
			return;
		}
	}
	if (togglePromotion === "false" && skipPromotion === false){
		//check if its a pawn promotion
		isPromote = checkPawnPromote(source, target, piece);
		if(isPromote){
			
			//this function will set the pawPromotion global variable
			showPawnPromotionPopup(source, target, color);
			
			//the close box was clicked so it returns back to the initital position
			if(pawnPromotion === "x"){
				//reseting the default pawn promotion to queen
				pawnPromotion = "q";
			}
			return;
		}
	}

	// see if the move is legal
	var move = game.move({
    	from: source,
    	to: target,
    	promotion: pawnPromotion // NOTE: always promote to a queen for example simplicity
  	});
	
  	// illegal move
	if (move === null) return 'snapback';

  
	//used to store players own move, moves array is stored in memberchess.js
	totalFEN.push(game.fen());
	var pgn = game.pgn();
	totalPGN.push(pgn);
	var gameStatus = updateStatus();
	totalStatus.push(gameStatus);
 	moveCounter++;
  
	sendMove(source, target, pawnPromotion);
	setStatusAndPGN(gameStatus, pgn)
	
	if(skipPromotion){
		board.position(game.fen());
		skipPromotion = false;
	}
};

// update the board position after the piece snap 
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
	board.position(game.fen());
};

// returns status of current game
var updateStatus = function() {
	var status = '';
	
	var moveColor = 'White';
	if (game.turn() === 'b') {
	  moveColor = 'Black';
	}

	// checkmate?
	if (game.in_checkmate() === true) {
		status = 'Game over, ' + moveColor + ' is in checkmate.';
		if(WhiteSide === user){ // prevents game over duplication being sent to server
			finishGame(moveColor); //function call located in memberchess.js
		}	
	}
	else if (game.in_draw() === true) { // draw, todo: need to message server when this is triggered
		status = 'Game over, drawn position';
		if(WhiteSide === user){ // prevents game over duplication being sent to server
			drawGame(); //function call located in memberchess.js
		}
	}
  	else {   // game still on
	    status = moveColor + ' to move';
	
	    // check?
	    if (game.in_check() === true) {
	      status += ', ' + moveColor + ' is in check';
	    }
	}
	return status;
};

var setStatusAndPGN = function(status, pgn){
	statusEl.html(status);
	//	fenEl.html(game.fen()); FEN string is not being used
	pgnEl.html(pgn);
}


var cfg = {
	draggable: setDrag,
	position: 'start',
	onDragStart: onDragStart,
	onDrop: onDrop,
	onSnapEnd: onSnapEnd,
	pieceTheme: '../img/chesspieces/'+ pieceTheme +'/{piece}.png'
};

board = ChessBoard('board', cfg);

// defaults the status of the game and pgn
setStatusAndPGN("White to move", "")

$('#flipOrientationBtn').on('click', board.flip);

document.getElementById('goStart').onclick = function(){
	
	board.position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
	moveCounter = 0;
	setStatusAndPGN("White to move", "")
}

function getCookie(cname) { //gets cookies value
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}
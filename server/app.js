/*
 * TODO: ASCII artwork here!
 * TODO: Licenses link?
 * 
 * Handle matchmaking, game logic processing and validation.
 */

// TODO: MOVE THIS!! ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const TILE_TYPES = {
    FREE: 'free',
    SPAWN: 'spawn',
    OWNED: 'owned',
    BLOCKED: 'blocked',
    UNSET: 'unset'
};

function Tile(hex, type, owner, fortification) {
    this.hex = hex;
    this.type = type;
    this.owner = owner;
    this.fortification = fortification || 0;
}

/*
 * TODO: ASCII artwork here!
 * TODO: Credit
 */

"use strict";

/* Memory Logic */

function Point(x, y) {
    return {x: x, y: y};
}

function Hex(q, r, s) {
    return {q: q, r: r, s: s};
}

function hex_add(a, b)
{
    return Hex(a.q + b.q, a.r + b.r, a.s + b.s);
}

function hex_subtract(a, b)
{
    return Hex(a.q - b.q, a.r - b.r, a.s - b.s);
}

function hex_scale(a, k)
{
    return Hex(a.q * k, a.r * k, a.s * k);
}

var hex_directions = [Hex(1, 0, -1), Hex(1, -1, 0), Hex(0, -1, 1), Hex(-1, 0, 1), Hex(-1, 1, 0), Hex(0, 1, -1)];
function hex_direction(direction)
{
    return hex_directions[direction];
}

function hex_neighbor(hex, direction)
{
    return hex_add(hex, hex_direction(direction));
}

var hex_diagonals = [Hex(2, -1, -1), Hex(1, -2, 1), Hex(-1, -1, 2), Hex(-2, 1, 1), Hex(-1, 2, -1), Hex(1, 1, -2)];
function hex_diagonal_neighbor(hex, direction)
{
    return hex_add(hex, hex_diagonals[direction]);
}

function hex_length(hex)
{
    return Math.trunc((Math.abs(hex.q) + Math.abs(hex.r) + Math.abs(hex.s)) / 2);
}

function hex_distance(a, b)
{
    return hex_length(hex_subtract(a, b));
}

function hex_round(h)
{
    var q = Math.trunc(Math.round(h.q));
    var r = Math.trunc(Math.round(h.r));
    var s = Math.trunc(Math.round(h.s));
    var q_diff = Math.abs(q - h.q);
    var r_diff = Math.abs(r - h.r);
    var s_diff = Math.abs(s - h.s);
    if (q_diff > r_diff && q_diff > s_diff)
    {
        q = -r - s;
    }
    else
        if (r_diff > s_diff)
        {
            r = -q - s;
        }
        else
        {
            s = -q - r;
        }
    return Hex(q, r, s);
}

function hex_lerp(a, b, t)
{
    return Hex(a.q * (1 - t) + b.q * t, a.r * (1 - t) + b.r * t, a.s * (1 - t) + b.s * t);
}

function hex_linedraw(a, b)
{
    var N = hex_distance(a, b);
    var a_nudge = Hex(a.q + 0.000001, a.r + 0.000001, a.s - 0.000002);
    var b_nudge = Hex(b.q + 0.000001, b.r + 0.000001, b.s - 0.000002);
    var results = [];
    var step = 1.0 / Math.max(N, 1);
    for (var i = 0; i <= N; i++)
    {
        results.push(hex_round(hex_lerp(a_nudge, b_nudge, step * i)));
    }
    return results;
}

function OffsetCoord(col, row) {
    return {col: col, row: row};
}

var EVEN = 1;
var ODD = -1;
function qoffset_from_cube(offset, h)
{
    var col = h.q;
    var row = h.r + Math.trunc((h.q + offset * (h.q & 1)) / 2);
    return OffsetCoord(col, row);
}

function qoffset_to_cube(offset, h)
{
    var q = h.col;
    var r = h.row - Math.trunc((h.col + offset * (h.col & 1)) / 2);
    var s = -q - r;
    return Hex(q, r, s);
}

function roffset_from_cube(offset, h)
{
    var col = h.q + Math.trunc((h.r + offset * (h.r & 1)) / 2);
    var row = h.r;
    return OffsetCoord(col, row);
}

function roffset_to_cube(offset, h)
{
    var q = h.col - Math.trunc((h.row + offset * (h.row & 1)) / 2);
    var r = h.row;
    var s = -q - r;
    return Hex(q, r, s);
}

function Orientation(f0, f1, f2, f3, b0, b1, b2, b3, start_angle) {
    return {f0: f0, f1: f1, f2: f2, f3: f3, b0: b0, b1: b1, b2: b2, b3: b3, start_angle: start_angle};
}

function Layout(orientation, size, origin) {
    return {orientation: orientation, size: size, origin: origin};
}

var layout_pointy = Orientation(Math.sqrt(3.0), Math.sqrt(3.0) / 2.0, 0.0, 3.0 / 2.0, Math.sqrt(3.0) / 3.0, -1.0 / 3.0, 0.0, 2.0 / 3.0, 0.5);
var layout_flat = Orientation(3.0 / 2.0, 0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0);
function hex_to_pixel(layout, h)
{
    var M = layout.orientation;
    var size = layout.size;
    var origin = layout.origin;
    var x = (M.f0 * h.q + M.f1 * h.r) * size.x;
    var y = (M.f2 * h.q + M.f3 * h.r) * size.y;
    return Point(x + origin.x, y + origin.y);
}

function pixel_to_hex(layout, p)
{
    var M = layout.orientation;
    var size = layout.size;
    var origin = layout.origin;
    var pt = Point((p.x - origin.x) / size.x, (p.y - origin.y) / size.y);
    var q = M.b0 * pt.x + M.b1 * pt.y;
    var r = M.b2 * pt.x + M.b3 * pt.y;
    return Hex(q, r, -q - r);
}

function hex_corner_offset(layout, corner)
{
    var M = layout.orientation;
    var size = layout.size;
    var angle = 2.0 * Math.PI * (M.start_angle - corner) / 6;
    return Point(size.x * Math.cos(angle), size.y * Math.sin(angle));
}

function polygon_corners(layout, h)
{
    var corners = [];
    var center = hex_to_pixel(layout, h);
    for (var i = 0; i < 6; i++)
    {
        var offset = hex_corner_offset(layout, i);
        corners.push(Point(center.x + offset.x, center.y + offset.y));
    }
    return corners;
}

/**
 * Compute an improbable-collision identifier
 * from the cube co-ordinate of a hex.
 */
function computeHexHashCode(hex) {
    const PRIME = 31;
    
    var h = 0;
    h += hex.q;
    h = h * PRIME + hex.r;
    h = h * PRIME + hex.s;
    return h;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/* Setup */

// Load dependencies.
var express = require('express');
var app     = express();
var http    = require('http').Server(app);
var io      = require('socket.io')(http);

// Load modular config.
var CONFIG  = require('./config.json');

// Load maps.
var maps = require('./maps.json');
var characters = require('./characters.json');

// Manage lobbies.
var games = [];

// Serve the correct game page.
app.use(express.static(__dirname + '/../client'));

/* Game Logic */

function sendToAllPlayersOfGame(game, handler, data) {
    for(var player of game['players']) {
        player['socket'].emit(handler, data);
    }
}

function findGameBySocket(socket, games) {
    for(var i = 0; i < games.length; i++) {
        for(var j = 0; j < games[i]['players'].length; j++) {
            if(games[i]['players'][j]['id'] == socket['id']) {
                return games[i];
            }
        }
    }
}

function findPlayerBySocket(socket, game) {
    for(var i = 0; i < game['players'].length; i++) {
        if(game['players'][i]['id'] == socket['id']) {
            return game['players'][i];
        }
    }
}

function findTileByHash(targetHexHash, map) {
    for(var i = 0; i < map['tiles'].length; i++) {
        if(computeHexHashCode(map['tiles'][i]['hex']) == targetHexHash) {
            return map['tiles'][i];
        }
    }
}

function getNumberOfClaimsInTurn(playerId, turn) {
    var claims = 0;
    for(var i = 0; i < turn.length; i++) {
        if(playerId == turn[i]['player']) {
            claims++;
        }
    }
    return claims;
}

function checkLegalClaim(player, tile, turn) {
    // Incorrect tile type.
    if(tile['type'] == TILE_TYPES.BLOCKED) {
        return false;
    }
    
    // Already fully fortified.
    if(tile['owner'] == player['id'] && tile['claims'] == CONFIG.MAX_CLAIMS) {
        console.log('Alread fully fortified.');
        return false;
    }
    
    // Ran out of claims.
    if(getNumberOfClaimsInTurn(player['id'], turn) == CONFIG.MAX_CLAIMS) {
        console.log('Ran out of claims.');
        return false;
    }

    return true;
}

function handleClaim(socket, targetHexHash) {
    // Find the correct place to make claim.
    var game = findGameBySocket(socket, games);
    var turn = game['turn'];
    var player = findPlayerBySocket(socket, game);
    var tile = findTileByHash(targetHexHash, game['map']);
    
    // Handle not found.
    if(!tile) {
        console.log('Asked to claim a non-existent tile.');
        return;
    }
    
    // Check if it is valid.
    if(checkLegalClaim(player, tile, turn)) {
        // Register it, tell the other players.
        game['turn'].push({
            player: player['id'],
            tile: targetHexHash
        });
        sendToAllPlayersOfGame(game, 'claim', {
            player: player['id'],
            claims: getNumberOfClaimsInTurn(player['id'], turn)
        });
    } else {
        // TODO: More emits!
        console.log('Claim was false');
    }
}

function computeTileChanges(turn) {
    tileChanges = []
    for(var i = 0; i < turn.length; i++) {
        var winners = [];
        var highest = 0;
        for(var j = 0; j < turn[i]['players'].length; j++) {
            if(turn[i]['players'][j]['claims'] > highest) {
                winners = [
                    {
                        player: turn[i]['players'][j]['player']
                    }
                ];
                highest = turn[i]['players'][j]['claims'];
            }
            else if(turn[i]['players'][j]['claims'] == highest) {
                console.log('We have a stalemate');
                winners.push({
                    player: turn[i]['players'][j]['player']
                });
            }
        }
        if(winners.length == 1) {
            tileChanges.push({
                tile: turn[i]['tile'],
                winner: winners[0]['player']
            });
        }
    }
    return tileChanges;
}

function cycleGameTurn(game) {
    sendToAllPlayersOfGame(game, 'timer', game['timer']);
    
    if(game['timer'] <= 0) {
        // Process turn.
        
        // TODO: Move this into claim logic.
        // Condense turn.
        var map = game['map']['tiles'];
        var turn = game['turn'];
        claimedTiles = [];        
        for(var i = 0; i < turn.length; i++) {
            var tileFound = false;
            for(var j = 0; j < claimedTiles.length; j++) {
                if(turn[i]['tile'] == claimedTiles[j]['tile']) {
                    // Add to pre-existing one.
                    tileFound = true;
                    playerFound = false;
                    for(var k = 0; k < claimedTiles[j]['players'].length; k++) {
                        if(turn[i]['player'] == claimedTiles[j]['players'][k]['player']) {
                            // Add to pre-existing one.
                            playerFound = true;
                            claimedTiles[j]['players'][k]['claims']++;
                            break;
                        }
                    }
                    if(!playerFound) {
                        claimedTiles[j]['players'].push({
                            player: turn[i]['player'],
                            claims: 1
                        });
                    }
                    break;
                }
            }
            if(!tileFound) {
                claimedTiles.push({
                    tile: turn[i]['tile'],
                    players: [
                        {
                            player: turn[i]['player'],
                            claims: 1
                        }
                    ]
                });
            }
        }
        
        // Compute winners.
        var changedTiles = computeTileChanges(claimedTiles);
        
        // Update map tiles based on winners.
        for(var i = 0; i < changedTiles.length; i++) {
            for(var j = 0; j < map.length; j++) {
                // Match.
                if(changedTiles[i]['tile'] == computeHexHashCode(map[j]['hex'])) {
                    // Update values.
                    var tempPlayer = {};
                    for(var player of game['players']) {
                        if(player['id'] == changedTiles[i]['winner']) {
                            tempPlayer = player;
                        }
                    }
                    var truncatedPlayer = {
                        id: tempPlayer['id'],
                        character: tempPlayer['character']
                    };
                    map[j]['type'] = TILE_TYPES.OWNED;
                    map[j]['owner'] = truncatedPlayer;
                }
            }
        }
        
        // TODO: More features here...
        
        // Finished fighting, clean turn.
        game['turns'].push(game['turn']);
        game['turn'] = [];
        
        // Has game finished? Set state...
        
        if(game['state'] == CONFIG['GAME_STATES']['FINISHED']) {
            // Stop the timer.
            clearInterval(game['interval']);
            
            // Emit final turn?
            
            // Clean information.
            
        }
        
        // Update clients maps.
        sendToAllPlayersOfGame(game, 'map', JSON.stringify(game['map']['tiles']));
        // Update client's players.
        
        
        // Reset timer.
        game['timer'] = CONFIG['TIMER'];
    }
    
    game['timer'] -= 1;
}

function startGame(game) {
    // Apply spawns.
    var playersToAssign = game['players'].slice();
    for(var tile of game['map']['tiles']) {
        if(tile['type'] == TILE_TYPES.SPAWN) {
            tile['type'] = TILE_TYPES.OWNED;
            var tempPlayer = playersToAssign.shift();
            var truncatedPlayer = {
                id: tempPlayer['id'],
                character: tempPlayer['character']
            };
            tile['owner'] = truncatedPlayer;
        }
    }
    
    // Set the game state to be correct.
    game["state"] = CONFIG['GAME_STATES']['PROGRESS'];
    
    // Begin the game loop.
    cycleGameTurn(game);
    game['interval'] = setInterval(
        function() {
            cycleGameTurn(game);
        },
        1000
    );
}

/* Matchmaking */

function getRandomGameId() {
    // TODO: Make unique.
    return Math.random().toString(36).substr(2, 5);
}

function getRandomMap() {
    // TODO: Make context-based decision.
    return getRandomItemFromArray(maps);
}

function createGame(gameId) {
    if(!gameId) {
        gameId = getRandomGameId();
    }
    game = {
        id: gameId,
        interval: null,
        timer: 0,
        players: [],
        created: new Date().getTime(),
        state: CONFIG['GAME_STATES']['SETUP'],
        map: getRandomMap(),
        turn: [],
        turns: []
    };
    games.push(game);
    return game;
}

function addPlayerToGame(game, socket) {
    // Get a character that is not in use.
    var potentialCharacters = characters;
    var takenCharacters = [];
    for(var player of game['players']) {
        takenCharacters.push(player['character']['name']);
    }
    for(var i = 0; i < potentialCharacters.length; i++) {
        for(var j = 0; j < takenCharacters.length; j++) {
            if(potentialCharacters[i]['name'] == takenCharacters[j]) {
                potentialCharacters.splice(i, 1);
            }
        }
    }
    
    // Add the player to the game.
    var player = {
        id: socket['id'],
        socket: socket,
        character: getRandomItemFromArray(potentialCharacters)
    };
    game['players'].push(player);
    socket.emit('player', {
        id: player['id'],
        character: player['character']
    });
}

/* Sockets Registry */

// Handle initial connection.
io.on('connection', function (socket) {
    // Get the game ID requested.
    gameId = socket.handshake.query.gameId;
    
    // Find the right game.
    var found = false;
    var game = {};
    if(gameId) {
        for(var i = 0; i < games.length; i++) {
            // Game already exists.
            if(games[i]['id'] == gameId) {
                found = true;
                if(games[i]['players'].length < games[i]['map']['players']) {
                    game = games[i];
                    addPlayerToGame(games[i], socket);
                } else {
                    socket.emit('full');
                    socket.disconnect();
                    return;
                }
            }
        }
    }
    if(!found) {
        game = createGame(gameId);
        addPlayerToGame(game, socket);
    }
    
    // If there are enough players to fulfill the map requirements...
    if(game['players'].length == game['map']['players']) {
        // Set the game to be in progress.
        console.log('Starting game');
        startGame(game);
    }
    
    // Register listeners.
    socket.on('claim', function(data) {
        handleClaim(socket, data)
    });
});

/* Utility Functions */

function getRandomItemFromArray(a) {
    return a[Math.floor(Math.random()*a.length)];
}

/* Host Page */

var serverPort = process.env.PORT || CONFIG.PORT;
http.listen(serverPort, function() {
    console.log("Server is listening on port " + serverPort);
});
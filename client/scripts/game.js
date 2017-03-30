/*
 * TODO: ASCII artwork here!
 * TODO: Licenses link?
 * 
 * Register and display received actions
 * for a game session.
 */

const TILE_TYPES = {
    FREE: 'free',
    SPAWN: 'spawn',
    OWNED: 'owned',
    BLOCKED: 'blocked',
    UNSET: 'unset'
};

function Tile(hex, type, owner, claims) {
    this.hex = hex || {};
    this.type = type || {};
    this.owner = owner || {};
    this.claims = claims || 0;
}
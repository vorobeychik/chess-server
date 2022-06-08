const jsChessEngine = require('js-chess-engine');


export type Side = "white" | "black";

export interface defaultHistory{
    configuration: GameState,
    from: string,
    to: string,
}

export interface History{
    previousHistoryState: GameState,
    currentHistoryState: GameState,
    from: string,
    to: string,
}

export interface GameState{
    castling: {
        blackLong: boolean,
        blackShort: boolean,
        whiteLong: boolean,
        whiteShort: boolean,
    },
    check: boolean,
    checkMate: boolean,
    enPassant: null,
    fullMove: number,
    halfMove: number,
    isFinished: boolean,
    moves: Moves,
    pieces: Pieces,
    turn: Sides,
}

export interface Moves {
    [key: string]: string[];
}

export interface User{
    gitHubId: number,
}


export interface Player{
    userData: User,
    side: Sides,
}

export interface Room {
    players:  Record<string, Player>,
    timer: any,
    playerTimers:Record<string, number>
    game: any,
}


export interface Pieces {
    [key: string]: FigureNames;
}


export type FigureNames = 'q' | "Q" | 'K' | 'k' | 'n' | 'N' | 'B' | 'b' | 'n' | 'N' | 'r' | 'R';

export type Sides = "white" | "black";


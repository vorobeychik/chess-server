import {Player} from "../types/types";


export class PlayerDTO{
    you: Player;
    oponent: Player;

    constructor(playerId: string, players: Record<string, Player>) {

        const secondPlayerId = Object.keys(players).find((key) => key !== playerId)
        const secondPlayer = players[secondPlayerId];

        this.you = players[playerId];
        this.oponent = secondPlayer;
    }
}

export class TimerDTO{
    you: number;
    oponent: number;

    constructor(playerId: string, timers: Record<string, number>) {
        const secondPlayerId = Object.keys(timers).find((key) => key !== playerId)
        const secondTimer = timers[secondPlayerId];
        this.you = timers[playerId];
        this.oponent = secondTimer;
    }
}
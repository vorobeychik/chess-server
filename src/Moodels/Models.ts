import { GameState, History, Move, PlayerPull, Sides, User} from "../types/types";
import {Socket} from "socket.io";
const userService = require("../user/user.service");
import { chooseRandomSide, copyObject} from "../utils/utils";
const jsChessEngine = require('js-chess-engine');
const { move } = jsChessEngine;
import { v4 as uuidv4 } from 'uuid';

export class Player{
    constructor(public userData : User, public side: Sides,public socketId: string) {
    }

    chooseOppositeSide():Sides{
        return  this.side === "white" ? "black" : "white";
    }
}

export class BotRoom{
    game: any =  new jsChessEngine.Game();
    player:  Player;
    botLevel: number;

    constructor(player: Player, botLevel: number) {
        this.player = player;
        this.botLevel = botLevel;
    }
}

export class Room{
    game: any =  new jsChessEngine.Game();
    players: Record<string, Player> = {};
    timer: ReturnType<typeof setInterval> |  null = null;
    playerTimers:Record<string, number> = {};
    constructor(user: User) {
        this.playerTimers[user.id] = 600;
    }
}

export class ServerState{
    playerRooms: Record<string, Room> = {};
    botRooms: Record<string, BotRoom> = {};
    playerPull: PlayerPull[] = [];
    io: Socket;

    constructor(io:Socket) {
        this.io = io;
    }

    async endBotGame(roomName: string, isWinner: boolean): Promise<void>{
        const room = this.botRooms[roomName];
        await userService.leaveGame(+room.player.userData.id);
        this.io.to(room.player.socketId).emit(isWinner ? 'gameFinishedWin' : 'gameFinishedLose');
        this.deleteBotRoom(roomName)
    }

    async endGame(roomName, userId: string){
        const room = this.playerRooms[roomName];
        for (const playerId of this.getRoomPlayerIds(roomName)) {

            const socketId =  room.players[playerId].socketId;
            const isWinner = playerId !==  userId;

            await userService.changeRating(+playerId, isWinner ? 25 : -25);
            await userService.leaveGame(+playerId);

            this.deleteRoom(roomName);

            this.io.to(socketId).emit(isWinner ? 'gameFinishedWin' : 'gameFinishedLose');
        }
    }

    async createRoom(roomName, user, socketId: string){
        this.playerRooms[roomName] = new Room(user);
        this.playerRooms[roomName].players[user.id]  = new Player(user,chooseRandomSide(),socketId);

        userService.enterGame(user.id, roomName);
    }

    joinRoom(roomName: string, user: User, socketId: string): void{
        const side: Sides =  this.getSecondPlayer(roomName, user.id.toString()).chooseOppositeSide();

        this.playerRooms[roomName].players[user.id]  = new Player(user, side, socketId);
        this.playerRooms[roomName].playerTimers[user.id] = 600;

        Object.keys(this.playerRooms[roomName].players).forEach((playerId) => {
            this.setGameSetting(roomName, playerId)
          
        })


        userService.enterGame(user.id, roomName);
        this.sendGameState(roomName);
    }

    async joinBotRoom( user: User, socket: Socket, botLevel: number): Promise<void>{
        const roomName = uuidv4();
        await socket.join(roomName);
        const player = new Player(user,'white',socket.id);
        this.botRooms[roomName] = new BotRoom(player, botLevel);
        this.setBotGameSetting(roomName, user.id.toString());


        userService.enterGame(user.id, roomName);
        this.sendGameState(roomName, true);
    }

    sendGameState(roomName: string, isBotGame = false){
        this.io.to(roomName).emit('getGameState',this.getRoomGameState(roomName, isBotGame),this.getHistory(roomName, isBotGame));
    }
    
    setBotGameSetting(roomName: string, playerId: string){
        const room = this.botRooms[roomName];
        const clientPlayer = this.createBotPlayersClientObject(roomName);
        
        this.io.to(room.player.socketId).emit('offTimers');
        this.io.to(room.player.socketId).emit('startGame',roomName, clientPlayer)
        
    }


     setGameSetting(roomName: string, playerId: string, offTimers = false): void{
        const room = this.playerRooms[roomName];
        
        const clientPlayers = this.createPlayersClientObject(roomName,playerId);
        const timers = this.createTimersClientObject(roomName, playerId);
        
        this.io.to(room.players[playerId].socketId).emit('startGame',roomName, clientPlayers);
        if(!offTimers){
            this.io.to(room.players[playerId].socketId).emit('setTimers', timers);
        }else{
            this.io.to(room.players[playerId].socketId).emit('offTimers');
        }

    }
    
    createPlayersClientObject(roomName: string, playerId: string) {
        const secondPlayer = this.getSecondPlayer(roomName, playerId);
        return {
            you: this.playerRooms[roomName].players[playerId],
            oponent: secondPlayer
        }
    }

    createBotPlayersClientObject(roomName: string){
        return {
            you: this.botRooms[roomName].player,
            oponent: {
                userData:{
                    avatar_url: '',
                    login: 'BotCleo',
                    rating: 600
                }

            },
        }
    }

    createTimersClientObject(roomName: string, playerId: string) {
        const secondPlayerId = this.getSecondPlayerId(roomName, playerId);
        return {
            [playerId]:  this.playerRooms[roomName].playerTimers[playerId],
            [secondPlayerId]: this.playerRooms[roomName].playerTimers[secondPlayerId],
        }
    }


    getRoomPlayerIds(roomName: string): string[]{
        return Object.keys(this.playerRooms[roomName].players)
    }

    getSecondPlayerId(roomName: string, playerId: string): string{
        return this.getRoomPlayerIds(roomName).find((key) => key !== playerId);
    }

    getSecondPlayer(roomName: string, playerId: string): Player{
        const secondPlayerId = this.getSecondPlayerId(roomName, playerId);
        return this.playerRooms[roomName].players[secondPlayerId];
    }

    getRoomGameState(roomName: string, isBotGame = false): GameState{
        console.log(roomName, this[isBotGame ? "botRooms"  : "playerRooms" ][roomName])
        return this[isBotGame ?  "botRooms" : "playerRooms" ][roomName].game.exportJson();
    }

    getRoomGame(roomName: string, isBotGame = false){
        return this[isBotGame ?  "botRooms" : "playerRooms" ][roomName].game;
    }

    getHistory(roomName: string,isBotGame = false): History[]{
        return this.getRoomGame(roomName, isBotGame).getHistory().map((historyPoint) => {
            const currentHistoryState = move(copyObject(historyPoint.configuration),historyPoint.from , historyPoint.to)
            return {...historyPoint,currentHistoryState, previousHistoryState: historyPoint.configuration }
        })
    }

    setRoomTimer(roomName: string, playerId:string){
        const room = this.playerRooms[roomName];
        const secondPlayer = this.getSecondPlayer(roomName,playerId);
        this.clearRoomTimer(roomName);
        const timer = setInterval(() => this.timerTick(roomName,secondPlayer.userData.id.toString()),1000)
        room.timer = timer;
    }

    async reconnect(roomName, user, socket){
        await socket.join(roomName);
        const playerRoom = this.playerRooms[roomName];
        const botRoom = this.botRooms[roomName];

        if(playerRoom){
            this.setSocket(roomName, user.id.toString(), socket.id);
            this.setGameSetting(roomName, user.id.toString())
            this.sendGameState(roomName);
        }

        if(botRoom){
            this.setSocket(roomName, user.id.toString(), socket.id, true);
            this.setBotGameSetting(roomName, user.id.toString())
            this.sendGameState(roomName, true);
            this.io.to(roomName).emit('setBotGame');
        }

    }

    clearRoomTimer(roomName){
        clearInterval(this.playerRooms[roomName].timer)
    }

    async makeMove(roomName: string, move: Move, userId: string, isBotGame: boolean){
        console.log(isBotGame)
        const game = this.getRoomGame(roomName, isBotGame);
        game.move(move.from, move.to)
        const gameState: GameState = this.getRoomGameState(roomName, isBotGame);
        if(isBotGame){
            this.sendGameState(roomName, isBotGame);
        }

        if(gameState.isFinished){
            if(!isBotGame){
                this.sendGameState(roomName);
                this.clearRoomTimer(roomName);
            }

            if(isBotGame){
                this.endBotGame(roomName, true);
            }


            if(gameState.checkMate){
                await this.endGame(roomName, userId);
            }else{
                this.io.emit('gameFinishedDraw')
                for (const playerId of this.getRoomPlayerIds(roomName)) {
                    await userService.leaveGame(+playerId);
                }
                this.deleteRoom(roomName);
            }

            return
        }

        if(isBotGame){
            const level = this.botRooms[roomName].botLevel;
            game.aiMove(level)
            this.sendGameState(roomName, isBotGame);

            if(gameState.isFinished){
                this.endBotGame(roomName, false);
            }

            return
        }

        this.setRoomTimer(roomName, userId)

        this.sendGameState(roomName);
    }



    async timerTick(roomName: string, playerId: string){
        const room = this.playerRooms[roomName];
        room.playerTimers[playerId] -= 1;
        if(this.playerRooms[roomName].playerTimers[playerId] === 0){
            clearInterval(room.timer);
            await this.endGame(roomName, playerId);
        }
        this.io.to(roomName).emit('timerTick',room.playerTimers)
    }

    setSocket(roomName: string, userId: string, socketId: string, isBotGame = false){
        if(isBotGame){
            this.botRooms[roomName].player.socketId = socketId;
        }else {
            this.playerRooms[roomName].players[userId].socketId = socketId;
        }
    }

    deleteRoom(roomName: string){
        delete this.playerRooms[roomName];
    }

    deleteBotRoom(roomName: string){
        delete  this.botRooms[roomName];
    }

    addUserToPull(user: User, socketId: string){
        this.playerPull.push({userData: user, socketId})
    }

    findOpponent(user:User): PlayerPull{
        return this.playerPull.find((userInPull) => {
            return  Math.abs(user.rating - userInPull.userData.rating) < 200;
        })
    }

    async findGame(user:User, socket:Socket){
        const opponent: PlayerPull = this.findOpponent(user);

        if(opponent){
            const roomName = uuidv4();
            this.playerPull =  this.playerPull.filter((userInPull) => userInPull.userData.id !== opponent.userData.id);
            await socket.join(roomName);
            this.io.to(opponent.socketId).socketsJoin(roomName);

            await this.createRoom(roomName,user, socket.id);
            this.joinRoom(roomName,opponent.userData,opponent.socketId);

        }else{
            this.addUserToPull(user, socket.id)
        }
    }


}
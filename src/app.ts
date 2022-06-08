import {chooseOppositeSide, chooseRandomSide, copyObject} from "./utils/utils";
import {defaultHistory, GameState, History, Room} from "./types/types";
const  mongoose =  require("mongoose");

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const userController = require('./user/user.controller');
const userService = require('./user/user.service');
const jsChessEngine = require('js-chess-engine');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const { move } = jsChessEngine
require('dotenv').config()


const app = express();

const port = process.env.PORT || 4000;

app.use(
    cors({
        origin: ['http://localhost:3000'],
        credentials: true,
    })
)


app.use(cookieParser())
app.use(bodyParser.json())
app.use(session({ secret: '3123' }));
app.use('/user', userController)


const server = http.createServer(app);
const io = new Server(server);

const playerRooms: Record<string, Room> = {};

const botRooms = {};


function getGameHistory(history: defaultHistory[]): History[]{
    return history.map((historyPoint) => {
        const currentHistoryState = move(copyObject(historyPoint.configuration),historyPoint.from , historyPoint.to)
        return {...historyPoint,currentHistoryState, previousHistoryState: historyPoint.configuration }
    })
}


io.on('connection', (socket) => {

    socket.on('createRoom',(roomName: string, user: any) => {
        socket.join(roomName);
        playerRooms[roomName] = {
            players: {},
            game: new jsChessEngine.Game(),
            timer: null,
            playerTimers:{
                [user.id]: 600,
            }
        }
        playerRooms[roomName].players[user.id]  = {
            userData: user,
            side: chooseRandomSide(),
        }
    })

    socket.on('move',async (roomName, move) => {
        const game = playerRooms[roomName].game;

        game.move(move.from, move.to);

        const gameState: GameState = game.exportJson();
        const { turn } = gameState;

        if(gameState.isFinished){
          io.to(roomName).emit('getGameState',gameState,getGameHistory(game.getHistory()))
          clearInterval(playerRooms[roomName].timer)
          const playerIds = Object.keys(playerRooms[roomName].players);

          const status: any = { statusName: 'mate' }
          if(gameState.checkMate){
              status.statusName  =  'mate'
              for (const playerId of playerIds) {
                  if(playerRooms[roomName].players[playerId].side  !==  turn){
                      status.winner = playerId;
                      await userService.changeRating(+playerId, 25)
                  }else{
                      await userService.changeRating(+playerId, -25)
                  }
              }
          }else{
              status.statusName  = 'draw'
          }

          io.emit('gameFinished',status)
            return
        }

        const playerKeys = Object.keys(playerRooms[roomName].players);

        playerKeys.forEach((key) => {
            if(playerRooms[roomName].players[key].side === turn){
                clearInterval(playerRooms[roomName].timer);
                const timer = setInterval(() => {
                    playerRooms[roomName].playerTimers[key] -= 1;
                    io.to(roomName).emit('timerTick',playerRooms[roomName].playerTimers)
                },1000)
                playerRooms[roomName].timer = timer;
            }
        })

        io.to(roomName).emit('getGameState',gameState,getGameHistory(game.getHistory()))
    })


    socket.on('joinRoom',(roomName: string, user: any) => {

        const room = socket.adapter.rooms.get(roomName);
        if(!room){
            return
        }

        if(room.size === 1){
            socket.join(roomName);
            const secondPlayerKey = Object.keys(playerRooms[roomName].players)[0];
            const side =  chooseOppositeSide(playerRooms[roomName].players[secondPlayerKey].side);
            playerRooms[roomName].players[user.id]  = {
                userData: user,
                side,
            }
            playerRooms[roomName].playerTimers[user.id] = 600;
            const game = playerRooms[roomName].game;
            io.to(roomName).emit('startGame',roomName, playerRooms[roomName].players);
            io.to(roomName).emit('setTimers', playerRooms[roomName].playerTimers);

            io.to(roomName).emit('getGameState',game.exportJson(),getGameHistory(game.getHistory()));
        }
    })

    socket.on('gameWithBot',(level: number) => {

        socket.join(socket.id)
        botRooms[socket.id] = {game: new jsChessEngine.Game(), level}

        io.to(socket.id).emit('getGameState',botRooms[socket.id].game.exportJson(),getGameHistory(botRooms[socket.id].game.getHistory()))

        socket.on('move', (move) => {
            const game = botRooms[socket.id].game;

            game.move(move.from, move.to);

            io.to(socket.id).emit('getGameState',game.exportJson(),getGameHistory(game.getHistory()))
            game.aiMove(botRooms[socket.id].level);
            io.to(socket.id).emit('getGameState',game.exportJson(),getGameHistory(game.getHistory()))
        })


        socket.on('disconnect',() => {

            delete  botRooms[socket.id]

        })
    })
})



async function start() {

    await mongoose.connect("mongodb+srv://hate:master53@cluster0.hclof.mongodb.net/?retryWrites=true&w=majority");

    server.listen(port,() => {
        console.log(`Server listening on port ${port}`)
    })
}

start()
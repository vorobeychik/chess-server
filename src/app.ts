import {chooseRandomSide} from "./utils/utils";

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const userController = require('./user/user.controller');
const jsChessEngine = require('js-chess-engine');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config()


const app = express();

const port = process.env.PORT || 4000;

app.use(
    cors({
        origin: '*',
        credentials: true,

    })
)
app.use(cookieParser())
app.use(bodyParser.json())
app.use(session({ secret: 'melody hensley is my spirit animal' }));

const server = http.createServer(app);
const io = new Server(server);

const game = new jsChessEngine.Game()

app.use('/user', userController)

let users = 0;

/*
const gameWithUserNamespace = io.of("/");
const gameWithBotNamespace =  io.of("/bot");
*/
const state = {};

interface Player{
    id: string;
    image: string;

}



io.on('connection', (socket) => {

    socket.on('createRoom',(roomName: string) => {
        socket.join(roomName);
        state[roomName].game = new jsChessEngine.Game();
        state[roomName].side = chooseRandomSide();
    })


    socket.on('joinRoom',(roomName: string) => {
        const room = socket.adapter.rooms.get(roomName);
        if(room){
            //комнаты с таким именем не существует
        }

        if(room.size === 1){
            socket.join(roomName);
        }
    })

/*
    console.log('a user connected');
    users += 1;
    socket.join("game");

    if(users  >= 2){

        socket.on('newGame',(s) => {
            io.to("game").emit('getGameState',game.exportJson())
        })

        socket.on('move',(move) => {
            game.move(move.from, move.to);
            io.to("game").emit('getGameState',game.exportJson())
        })
    }
*/

    socket.on('gameWithBot',() => {
        socket.emit('getGameState',game.exportJson())

        socket.on('move',(move) => {
            game.move(move.from, move.to);
            socket.emit('getGameState',game.exportJson())
            console.log('game',game.exportJson());
            console.log(game.exportJson().turn)
            game.aiMove(0);
            socket.emit('getGameState',game.exportJson())
        })
    })
})



async function start() {

    server.listen(port,() => {
        console.log(`Server listening on port ${port}`)
    })
}

start()
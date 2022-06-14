import { Move, User} from "./types/types";
const  mongoose =  require("mongoose");
import {ServerState} from "./Moodels/Models";
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const userController = require('./user/user.controller');
import cookieParser  from 'cookie-parser';
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config()

console.log(process.env.NODE_ENV)

const app = express();

const port = process.env.PORT || 4000;

app.use(
    cors()
)


app.use(cookieParser())
app.use(bodyParser.json())
app.use(session({ secret: '3123' }));
app.use('/user', userController)
app.use('',(req,res) => res.json(123) )

const server = http.createServer(app);
const io = new Server(server);
const serverState = new ServerState(io);


io.on('connection', (socket) => {

    socket.on('createRoom',async (roomName: string, user: User) => {
        await socket.join(roomName);
        await serverState.createRoom(roomName, user, socket.id);
    })

    socket.on('findGame',async (user: User) => {
        await serverState.findGame(user,socket);
    })

    socket.on('move',async (roomName: string, move: Move, user: User, isBotGame: boolean) => {
       await  serverState.makeMove(roomName,move,user.id.toString(), isBotGame);
    })


    socket.on('surrender', async (roomName: string, user: User, isBotGame: boolean) => {
        if(isBotGame){
            await  serverState.endBotGame(roomName, false);
        }else{
            await serverState.endGame(roomName, user.id.toString());
        }

    })

    socket.on('joinRoom',async (roomName: string, user: User) => {

        const room = socket.adapter.rooms.get(roomName);
        if(!room){
            return
        }

        if(room.size === 1){
            await socket.join(roomName);
            serverState.joinRoom(roomName,user, socket.id);

        }
    })

    socket.on('reconnect',async (roomName: string, user: User) => {
        await serverState.reconnect(roomName, user, socket);
    })

    socket.on('startGameWithBot',(user,level: number) => {
       serverState.joinBotRoom(user,socket,level);
    })
})








async function start() {

    await mongoose.connect(`mongodb+srv://${process.env.DB_LOGIN}:${process.env.DB_PASSWORD}@cluster0.hclof.mongodb.net/?retryWrites=true&w=majority`);

    server.listen(port,() => {
        console.log(`Server listening on port ${port}`)
    })
}

start()
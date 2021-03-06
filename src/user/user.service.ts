const axios = require("axios");
const userModel = require('./user.model');

class UserService{

    async getGitHubAccessToken(code){
        const res = await axios.post(
            `https://github.com/login/oauth/access_token?client_id=${process.env.CLIENT_ID}&code=${code}&client_secret=${process.env.CLIENT_SECRET}`,
        );
        return res.data;
    }

    async getUserGitHubProfileData(accessToken){
        const res = await axios.get(
            `https://api.github.com/user`,
            {
                headers:{
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );
        return res.data;
    }

    decodeAccessToken(accessToken){
        return accessToken.split('=')[1].split('&')[0];
    }

    async getUser(gitHubId){
        return  userModel.findOne({ gitHubId });
    }


    async createUser(gitHubId){
        return userModel.create({ gitHubId, rating: 1200, inGame: '' })
    }

    async changeRating(gitHubId: number, amount: number){
        await userModel.updateOne({gitHubId: gitHubId}, {$inc: {rating: amount}})
    }

    async enterGame(gitHubId: number,gameId: string){
        await userModel.updateOne({gitHubId: gitHubId}, {$set: {inGame: gameId}})
    }

    async leaveGame(gitHubId: number){
        await userModel.updateOne({gitHubId: gitHubId}, {$set: {inGame: ''}})
    }
}


module.exports = new UserService()